<?php
// Simple registration handler for testing
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Debug: Log the request method
error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
error_log('Request URI: ' . $_SERVER['REQUEST_URI']);

// Accept both POST and GET for testing
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed: ' . $_SERVER['REQUEST_METHOD']]);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit();
}

// Basic validation
$username = $input['username'] ?? '';
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';
$role = $input['role'] ?? 'customer';

$errors = [];

if (empty($username) || strlen($username) < 2) {
    $errors[] = 'Username is required and must be at least 2 characters';
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Valid email is required';
}

if (empty($password) || strlen($password) < 8) {
    $errors[] = 'Password is required and must be at least 8 characters';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['error' => implode(', ', $errors)]);
    exit();
}

// Success response
http_response_code(200);
echo json_encode([
    'message' => 'Registration successful',
    'user' => [
        'id' => 1,
        'username' => $username,
        'email' => $email,
        'role' => $role
    ]
]);
?>
