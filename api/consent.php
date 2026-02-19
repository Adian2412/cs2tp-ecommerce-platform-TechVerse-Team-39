<?php
// consent.php

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/security_helpers.php';

header('Content-Type: application/json');
enforceHttps();

// Rate limit: max 20 consent logs per IP per hour (prevents spam)
$ip = getClientIp();
if (isRateLimited($pdo, 'consent', $ip, 20, 60)) {
    jsonError('Too many requests', 429);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?: [];

$essential = isset($data['essential']) ? (bool)$data['essential'] : true;
$analytics = isset($data['analytics']) ? (bool)$data['analytics'] : false;

// Get user ID if logged in (optional)
session_start_secure();
$userId    = !empty($_SESSION['auth_user_id']) ? (int)$_SESSION['auth_user_id'] : null;
$ipHash    = hash('sha256', $ip); // never store raw IP
$userAgent = isset($_SERVER['HTTP_USER_AGENT'])
    ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255)
    : null;

try {
    $stmt = $pdo->prepare(
        'INSERT INTO gdpr_consent_log
             (user_id, ip_hash, consent_type, accepted, user_agent, created_at)
         VALUES
             (:uid, :ip, :type, :accepted, :ua, NOW())'
    );

    foreach (['cookies_essential' => $essential, 'cookies_analytics' => $analytics] as $type => $accepted) {
        $stmt->execute([
            'uid'      => $userId,
            'ip'       => $ipHash,
            'type'     => $type,
            'accepted' => $accepted ? 1 : 0,
            'ua'       => $userAgent,
        ]);
    }

    recordRateLimit($pdo, 'consent', $ip);
    jsonSuccess(['logged' => true]);

} catch (Throwable $e) {
    error_log('consent.php error: ' . $e->getMessage());
    jsonError('Server error', 500);
}
