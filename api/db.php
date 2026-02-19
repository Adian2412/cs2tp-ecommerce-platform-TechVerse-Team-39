<?php
// db.php - Secure database connection
// Place this ONE level above public_html (never in a web-accessible folder)

declare(strict_types=1);

// ── Environment config ────────────────────────────────────────────────────────
// In production, set these as real environment variables (e.g. via .env loaded
// by your server, or Apache/Nginx SetEnv directives).  Never hard-code creds.
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'techverse';
$dbUser = getenv('DB_USER') ?: 'techverse_user';   // NOT root
$dbPass = getenv('DB_PASS') ?: '';                  // Set via env var in production
$dbPort = (int)(getenv('DB_PORT') ?: 3306);

$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // throw on error
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // arrays by default
    PDO::ATTR_EMULATE_PREPARES   => false,                    // real prepared statements
    PDO::MYSQL_ATTR_FOUND_ROWS   => true,
    PDO::ATTR_PERSISTENT         => false,
];

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
} catch (PDOException $e) {
    // NEVER expose the real error message to the client
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Service temporarily unavailable']);
    exit;
}
