<?php
// api/gdpr.php
// Handles GDPR rights: data export (portability) and deletion requests
// Security: auth required, CSRF, HTTPS, prepared statements, XSS-safe output

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/security_helpers.php';

header('Content-Type: application/json');
enforceHttps();
sendSecurityHeaders();
session_start_secure();

$method = $_SERVER['REQUEST_METHOD'];

if (in_array($method, ['POST', 'DELETE'], true)) {
    verifyCsrf();
}

$authUser = requireAuth();
$userId   = $authUser['id'];

$raw    = file_get_contents('php://input');
$data   = json_decode($raw, true) ?: [];
$action = sanitiseString($data['action'] ?? $_GET['action'] ?? '');

switch ($action) {
    case 'export':
        handleExport($pdo, $userId);
        break;
    case 'request-deletion':
        handleDeletionRequest($pdo, $userId);
        break;
    default:
        jsonError('Unknown action', 400);
}

// ── Data Export (Right to Portability) ───────────────────────────────────────
function handleExport(PDO $pdo, int $userId): void
{
    // Collect user's personal data from all relevant tables

    // Profile
    $stmt = $pdo->prepare(
        'SELECT name, email, role, created_at FROM users WHERE id = :id'
    );
    $stmt->execute(['id' => $userId]);
    $profile = $stmt->fetch();

    // Addresses
    $stmt = $pdo->prepare(
        'SELECT line1, line2, city, postcode, country, is_default, created_at
         FROM addresses WHERE user_id = :id ORDER BY created_at'
    );
    $stmt->execute(['id' => $userId]);
    $addresses = $stmt->fetchAll();

    // Orders
    $stmt = $pdo->prepare(
        'SELECT o.id, o.status, o.total, o.created_at,
                oi.quantity, oi.unit_price,
                p.name AS product_name
         FROM orders o
         JOIN order_items oi     ON oi.order_id = o.id
         JOIN product_variants pv ON pv.id = oi.product_variant_id
         JOIN products p         ON p.id = pv.product_id
         WHERE o.user_id = :id
         ORDER BY o.created_at DESC'
    );
    $stmt->execute(['id' => $userId]);
    $orders = $stmt->fetchAll();

    // Reviews
    $stmt = $pdo->prepare(
        'SELECT r.rating, r.comment, r.created_at, p.name AS product_name
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         WHERE r.user_id = :id'
    );
    $stmt->execute(['id' => $userId]);
    $reviews = $stmt->fetchAll();

    // Sanitise all string fields before output
    $sanitise = function (array $rows): array {
        return array_map(function (array $row): array {
            return array_map(function ($v) {
                return is_string($v)
                    ? htmlspecialchars($v, ENT_QUOTES, 'UTF-8')
                    : $v;
            }, $row);
        }, $rows);
    };

    $export = [
        'exported_at' => date('c'),
        'profile'     => $sanitise([$profile])[0] ?? [],
        'addresses'   => $sanitise($addresses),
        'orders'      => $sanitise($orders),
        'reviews'     => $sanitise($reviews),
    ];

    jsonSuccess($export);
}

// ── Deletion Request (Right to Erasure) ──────────────────────────────────────
function handleDeletionRequest(PDO $pdo, int $userId): void
{
    // Check no pending request already exists
    $stmt = $pdo->prepare(
        "SELECT id FROM gdpr_deletion_requests
         WHERE user_id = :id AND status = 'pending' LIMIT 1"
    );
    $stmt->execute(['id' => $userId]);
    if ($stmt->fetch()) {
        jsonError('You already have a pending deletion request.', 409);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO gdpr_deletion_requests (user_id, status, requested_at)
         VALUES (:id, 'pending', NOW())"
    );
    $stmt->execute(['id' => $userId]);

    // Log the event
    $stmt = $pdo->prepare(
        "INSERT INTO audit_log (user_id, event_type, ip_hash, detail, created_at)
         VALUES (:uid, 'gdpr_deletion_requested', :ip, NULL, NOW())"
    );
    $stmt->execute([
        'uid' => $userId,
        'ip'  => hash('sha256', getClientIp()), // store hashed IP only
    ]);

    jsonSuccess([
        'message' => 'Your deletion request has been received. '
                   . 'We will process it within 30 days and email you on completion.',
    ]);
}
