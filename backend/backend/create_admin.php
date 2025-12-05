<?php

require_once 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $user = \App\Models\User::firstOrCreate(
        ['email' => 'admin@techverse.com'],
        [
            'username' => 'Administrator',
            'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
            'role' => 'admin'
        ]
    );
    echo 'Admin user created/updated successfully' . PHP_EOL;
    echo 'Email: admin@techverse.com' . PHP_EOL;
    echo 'Password: admin123' . PHP_EOL;
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}