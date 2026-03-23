<?php
// db.php - shared PDO database connection for Tech Verse (Team 39)

// === Your Aston MySQL credentials ===
$DB_HOST = 'localhost';
$DB_NAME = 'cs2team39_db';
$DB_USER = 'cs2team39';
$DB_PASS = 'Oxe6b6NBlDJIhAmRvGAzo1J2t';
$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

// PDO options
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Main PDO connection
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);

    // Many scripts use $conn, so expose it too
    $conn = $pdo;
} catch (PDOException $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(500);
    }
    echo json_encode([
        'error'   => 'Database connection failed',
        'details' => $e->getMessage(),
    ]);
    exit;
}
