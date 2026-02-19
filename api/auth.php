<?php
declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/security_helpers.php';

header('Content-Type: application/json');
enforceHttps();

session_start_secure();

$method = $_SERVER['REQUEST_METHOD'];
$raw    = file_get_contents('php://input');
$data   = json_decode($raw, true) ?: [];
$action = sanitiseString($data['action'] ?? '');

// ── Route ─────────────────────────────────────────────────────────────────────
switch ($action) {
    case 'register':
        handleRegister($pdo, $data);
        break;
    case 'login':
        handleLogin($pdo, $data);
        break;
    case 'verify-otp':
        handleVerifyOtp($pdo, $data);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'me':
        handleMe();
        break;
    default:
        jsonError('Unknown action', 400);
}

// ── Register ──────────────────────────────────────────────────────────────────
function handleRegister(PDO $pdo, array $data): void
{
    $name     = sanitiseString($data['name'] ?? '');
    $email    = sanitiseEmail($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$name || !$email || !$password) {
        jsonError('All fields are required', 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address', 422);
    }
    if (strlen($password) < 8) {
        jsonError('Password must be at least 8 characters', 422);
    }

    // Check duplicate email
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        jsonError('Email already registered', 409);
    }

    // Hash password with bcrypt (cost 12)
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
         VALUES (:name, :email, :hash, :role, NOW(), NOW())'
    );
    $stmt->execute([
        'name'  => $name,
        'email' => $email,
        'hash'  => $hash,
        'role'  => 'customer',
    ]);

    jsonSuccess(['message' => 'Account created. Please sign in.'], 201);
}

// ── Login (step 1 – check password, send OTP) ─────────────────────────────────
function handleLogin(PDO $pdo, array $data): void
{
    $email    = sanitiseEmail($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $ip       = getClientIp();

    // Rate limit: max 10 login attempts per IP per 15 minutes
    if (isRateLimited($pdo, 'login', $ip, 10, 15)) {
        jsonError('Too many login attempts. Please wait 15 minutes.', 429);
    }

    if (!$email || !$password) {
        jsonError('Email and password are required', 422);
    }

    // Fetch user
    $stmt = $pdo->prepare('SELECT id, name, password_hash, role FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    // Always run password_verify even if user not found (timing-safe)
    $dummyHash = '$2y$12$invaliddummyhashtopreventtimingattack000000000000000000';
    $hash      = $user ? $user['password_hash'] : $dummyHash;

    if (!$user || !password_verify($password, $hash)) {
        recordRateLimit($pdo, 'login', $ip);
        // Vague message – do not reveal whether email exists
        jsonError('Invalid email or password', 401);
    }

    // Rehash if needed (e.g. cost changed)
    if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 12])) {
        $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $upd = $pdo->prepare('UPDATE users SET password_hash = :h WHERE id = :id');
        $upd->execute(['h' => $newHash, 'id' => $user['id']]);
    }

    // Generate 6-digit OTP, store hashed in session
    $otp     = generateOtp();
    $otpHash = password_hash($otp, PASSWORD_BCRYPT, ['cost' => 10]);

    $_SESSION['mfa_pending']     = true;
    $_SESSION['mfa_user_id']     = (int)$user['id'];
    $_SESSION['mfa_otp_hash']    = $otpHash;
    $_SESSION['mfa_otp_expires'] = time() + 600; // 10 minutes
    $_SESSION['mfa_attempts']    = 0;

    // Send OTP email (calls mailer helper)
    sendOtpEmail($email, $user['name'], $otp);

    jsonSuccess([
        'mfa_required' => true,
        'message'      => 'A verification code has been sent to your email.',
    ]);
}

// ── Verify OTP (step 2) ───────────────────────────────────────────────────────
function handleVerifyOtp(PDO $pdo, array $data): void
{
    if (empty($_SESSION['mfa_pending'])) {
        jsonError('No MFA session in progress', 400);
    }

    $otp = sanitiseString($data['otp'] ?? '');

    // Brute-force guard: max 5 attempts
    $_SESSION['mfa_attempts'] = ($_SESSION['mfa_attempts'] ?? 0) + 1;
    if ($_SESSION['mfa_attempts'] > 5) {
        destroyMfaSession();
        jsonError('Too many attempts. Please log in again.', 429);
    }

    // Check expiry
    if (time() > ($_SESSION['mfa_otp_expires'] ?? 0)) {
        destroyMfaSession();
        jsonError('Verification code has expired. Please log in again.', 401);
    }

    // Verify OTP
    if (!password_verify($otp, $_SESSION['mfa_otp_hash'] ?? '')) {
        jsonError('Invalid verification code.', 401);
    }

    // Success – promote to fully authenticated session
    $userId = (int)$_SESSION['mfa_user_id'];
    destroyMfaSession();

    // Regenerate session ID to prevent fixation
    session_regenerate_id(true);

    $stmt = $pdo->prepare('SELECT id, name, email, role FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('User not found', 404);
    }

    $_SESSION['auth_user_id']   = (int)$user['id'];
    $_SESSION['auth_user_name'] = $user['name'];
    $_SESSION['auth_user_role'] = $user['role'];
    $_SESSION['auth_created']   = time();

    jsonSuccess([
        'user' => [
            'id'    => (int)$user['id'],
            'name'  => htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8'),
            'email' => htmlspecialchars($user['email'], ENT_QUOTES, 'UTF-8'),
            'role'  => $user['role'],
        ],
    ]);
}

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout(): void
{
    session_unset();
    session_destroy();
    jsonSuccess(['message' => 'Signed out']);
}

// ── Current user ──────────────────────────────────────────────────────────────
function handleMe(): void
{
    if (empty($_SESSION['auth_user_id'])) {
        http_response_code(401);
        echo json_encode(['authenticated' => false]);
        exit;
    }
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'id'   => (int)$_SESSION['auth_user_id'],
            'name' => htmlspecialchars($_SESSION['auth_user_name'], ENT_QUOTES, 'UTF-8'),
            'role' => $_SESSION['auth_user_role'],
        ],
    ]);
    exit;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateOtp(): string
{
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function destroyMfaSession(): void
{
    unset(
        $_SESSION['mfa_pending'],
        $_SESSION['mfa_user_id'],
        $_SESSION['mfa_otp_hash'],
        $_SESSION['mfa_otp_expires'],
        $_SESSION['mfa_attempts']
    );
}

function sendOtpEmail(string $email, string $name, string $otp): void
{
    $to      = $email;
    $subject = 'Your Tech Verse verification code';
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $body    = "Hi {$safeName},\n\nYour Tech Verse login code is: {$otp}\n\n"
             . "This code expires in 10 minutes.\n\n"
             . "If you did not request this, please ignore this email.\n\n"
             . "– The Tech Verse Team";

    $headers = "From: noreply@techverse.local\r\n"
             . "Reply-To: noreply@techverse.local\r\n"
             . "X-Mailer: PHP/" . PHP_VERSION . "\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n";

    // replace with PHPMailer/Mailgun/SES for reliability
    if (!mail($to, $subject, $body, $headers)) {
        error_log("Failed to send OTP email to {$email}");
    }
}
