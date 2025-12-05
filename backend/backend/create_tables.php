<?php

require_once 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    // Create users table
    \Illuminate\Support\Facades\DB::statement("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'seller', 'customer') DEFAULT 'customer',
            remember_token VARCHAR(100) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Create categories table
    \Illuminate\Support\Facades\DB::statement("
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(150) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Create brands table
    \Illuminate\Support\Facades\DB::statement("
        CREATE TABLE IF NOT EXISTS brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Create products table
    \Illuminate\Support\Facades\DB::statement("
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            brand_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            sku VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NULL,
            description TEXT NULL,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            stock INTEGER NOT NULL DEFAULT 0,
            image_url VARCHAR(255) NULL,
            tracking_link VARCHAR(255) NULL,
            is_sold BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    // Create product_images table
    \Illuminate\Support\Facades\DB::statement("
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            image_path VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    ");

    // Insert default data
    \Illuminate\Support\Facades\DB::statement("
        INSERT OR IGNORE INTO categories (id, name, slug) VALUES
        (1, 'Electronics', 'electronics'),
        (2, 'Home & Garden', 'home-garden')
    ");

    \Illuminate\Support\Facades\DB::statement("
        INSERT OR IGNORE INTO brands (id, name, description) VALUES
        (1, 'Generic', 'Default brand')
    ");

    echo "Database tables created successfully!\n";

} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n";
}
