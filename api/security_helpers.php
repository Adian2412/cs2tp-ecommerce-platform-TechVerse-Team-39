<?php
// api/security_helpers.php
// Shared security utilities: CSRF, HTTPS enforcement, sanitisation,
// rate limiting, secure session config, XSS-safe output helpers.

declare(strict_types=1);

// ── HTTPS Enforcement ─────────────────────────────────────────────────────────
function enforceHttps(): void
{
    // Skip when running via CLI (tests) or already on HTTPS
    if (PHP_SAPI === 'cli') return;
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (int)($_SERVER['SERVER_PORT'] ?? 80) === 443
            || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

    if (!$isHttps) {
        $host = htmlspecialchars($_SERVER['HTTP_HOST'] ?? 'localhost', ENT_QUOTES, 'UTF-8');
        $uri  = htmlspecialchars($_SERVER['REQUEST_URI']  ?? '/',       ENT_QUOTES, 'UTF-8');
        header('Location: https://' . $host . $uri, true, 301);
        exit;
    }
}

// ── Secure Session ────────────────────────────────────────────────────────────
function session_start_secure(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (int)($_SERVER['SERVER_PORT'] ?? 80) === 443;

    session_set_cookie_params([
        'lifetime' => 0,            // session cookie (expires on browser close)
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,     // only send over HTTPS
        'httponly' => true,         // not accessible via JS
        'samesite' => 'Strict',     // CSRF mitigation
    ]);

    ini_set('session.use_strict_mode',    '1');
    ini_set('session.use_only_cookies',   '1');
    ini_set('session.cookie_httponly',    '1');
    ini_set('session.gc_maxlifetime',     '7200'); // 2 hours

    session_start();

    // Rotate session ID periodically (every 30 minutes of activity)
    if (!isset($_SESSION['_last_activity'])) {
        $_SESSION['_last_activity'] = time();
    } elseif (time() - $_SESSION['_last_activity'] > 1800) {
        session_regenerate_id(true);
        $_SESSION['_last_activity'] = time();
    }
}

// ── CSRF Token ────────────────────────────────────────────────────────────────
/**
 * Generate (or return existing) CSRF token for the current session.
 * Embed this in HTML forms as a hidden field named _csrf_token.
 */
function csrfToken(): string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start_secure();
    }
    if (empty($_SESSION['_csrf_token'])) {
        $_SESSION['_csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['_csrf_token'];
}

/**
 * Validate the CSRF token sent with a state-changing request.
 * Accepts the token from either a form field or the X-CSRF-Token header.
 */
function verifyCsrf(): void
{
    if (PHP_SAPI === 'cli') return; // skip during tests

    $expected = $_SESSION['_csrf_token'] ?? '';
    $received = $_POST['_csrf_token']
             ?? $_SERVER['HTTP_X_CSRF_TOKEN']
             ?? '';

    if (!$expected || !hash_equals($expected, $received)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid or missing CSRF token']);
        exit;
    }
}

// ── Sanitisation Helpers ──────────────────────────────────────────────────────
/**
 * Strip tags and trim a string. Use for names, subjects, free text.
 */
function sanitiseString(string $value): string
{
    return trim(strip_tags($value));
}

/**
 * Sanitise and validate an email address.
 * Returns the sanitised email or empty string if invalid.
 */
function sanitiseEmail(string $value): string
{
    $clean = filter_var(trim($value), FILTER_SANITIZE_EMAIL);
    return filter_var($clean, FILTER_VALIDATE_EMAIL) ? (string)$clean : '';
}

/**
 * Escape a value for safe HTML output. Use when reflecting data back in HTML.
 */
function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Prepare a value for safe JSON output (already encoded by json_encode,
 * but useful when building HTML attributes from JSON values).
 */
function jsonAttr(mixed $value): string
{
    return h((string)json_encode($value));
}

// ── XSS-safe JSON response helpers ───────────────────────────────────────────
function jsonSuccess(array $payload, int $code = 200): never
{
    http_response_code($code);
    // JSON_HEX_TAG prevents </script> injection when embedded in HTML
    echo json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $code = 400): never
{
    http_response_code($code);
    echo json_encode(
        ['error' => h($message)],
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE
    );
    exit;
}

// ── Security Headers ──────────────────────────────────────────────────────────
/**
 * Send recommended security headers. Call near the top of every PHP response.
 */
function sendSecurityHeaders(): void
{
    // Prevent clickjacking
    header('X-Frame-Options: DENY');
    // Prevent MIME-type sniffing
    header('X-Content-Type-Options: nosniff');
    // Enable XSS filter in older browsers
    header('X-XSS-Protection: 1; mode=block');
    // Enforce HTTPS for 1 year (only send on HTTPS)
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    if ($isHttps) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
    // Referrer policy
    header('Referrer-Policy: strict-origin-when-cross-origin');
    // Content Security Policy – tighten as needed for your CDN/font sources
    header(
        "Content-Security-Policy: " .
        "default-src 'self'; " .
        "script-src 'self' https://kit.fontawesome.com https://ka-f.fontawesome.com; " .
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " .
        "font-src 'self' https://fonts.gstatic.com https://ka-f.fontawesome.com data:; " .
        "img-src 'self' data: https://flagcdn.com; " .
        "connect-src 'self' https://ipapi.co https://ipinfo.io https://api.exchangerate.host; " .
        "frame-ancestors 'none';"
    );
    // Permissions policy – disable unused browser features
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
}

// ── Rate Limiting (DB-backed) ─────────────────────────────────────────────────
/**
 * Check whether an action from $identifier has exceeded $maxAttempts
 * in the last $windowMinutes minutes.
 */
function isRateLimited(
    PDO    $pdo,
    string $action,
    string $identifier,
    int    $maxAttempts,
    int    $windowMinutes
): bool {
    ensureRateLimitTable($pdo);
    $since = date('Y-m-d H:i:s', time() - $windowMinutes * 60);
    $stmt  = $pdo->prepare(
        'SELECT COUNT(*) AS cnt FROM rate_limits
         WHERE action = :action AND identifier = :id AND created_at >= :since'
    );
    $stmt->execute(['action' => $action, 'id' => $identifier, 'since' => $since]);
    return (int)$stmt->fetchColumn() >= $maxAttempts;
}

/** Record one attempt for rate-limiting. */
function recordRateLimit(PDO $pdo, string $action, string $identifier): void
{
    ensureRateLimitTable($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO rate_limits (action, identifier, created_at)
         VALUES (:action, :id, NOW())'
    );
    $stmt->execute(['action' => $action, 'id' => $identifier]);
}

/** Create rate_limits table if it doesn't exist (idempotent). */
function ensureRateLimitTable(PDO $pdo): void
{
    static $created = false;
    if ($created) return;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS rate_limits (
            id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            action     VARCHAR(60)  NOT NULL,
            identifier VARCHAR(120) NOT NULL,
            created_at DATETIME     NOT NULL,
            INDEX (action, identifier, created_at)
        ) ENGINE=InnoDB'
    );
    // Purge entries older than 24 hours to keep table small
    $pdo->exec("DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL 1 DAY");
    $created = true;
}

// ── Client IP (proxy-aware) ───────────────────────────────────────────────────
function getClientIp(): string
{
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            // X-Forwarded-For can be a comma-separated list; take the first
            $ip = trim(explode(',', $_SERVER[$key])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

// ── Require Authentication ────────────────────────────────────────────────────
/**
 * Abort with 401 if no valid authenticated session exists.
 * Optionally restrict to specific roles.
 */
function requireAuth(array $allowedRoles = []): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start_secure();
    }
    if (empty($_SESSION['auth_user_id'])) {
        jsonError('Authentication required', 401);
    }
    if ($allowedRoles && !in_array($_SESSION['auth_user_role'], $allowedRoles, true)) {
        jsonError('Forbidden', 403);
    }
    return [
        'id'   => (int)$_SESSION['auth_user_id'],
        'name' => $_SESSION['auth_user_name'],
        'role' => $_SESSION['auth_user_role'],
    ];
}
