<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

Route::get('/', function () {
    return view('welcome');
});

// Serve images from storage
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    return response()->file($fullPath);
})->where('path', '.*');

// Reset database tables (for development setup)
Route::get('/reset-db', function () {
    try {
        // Drop all tables
        \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS product_images");
        \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS products");
        \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS categories");
        \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS brands");
        \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS users");

        return response("Database reset successfully!", 200)
            ->header('Content-Type', 'text/html');
    } catch (\Exception $e) {
        return response("Error resetting database: " . $e->getMessage(), 500)
            ->header('Content-Type', 'text/html');
    }
});

// Create database tables (for development setup)
Route::get('/create-tables', function () {
    try {
        // Create users table with correct schema
        \Illuminate\Support\Facades\DB::statement("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'customer',
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
                is_sold BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Create product_images table
        \Illuminate\Support\Facades\DB::statement("
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        return response("Database tables created successfully!", 200)
            ->header('Content-Type', 'text/html');
    } catch (\Exception $e) {
        return response("Error creating tables: " . $e->getMessage(), 500)
            ->header('Content-Type', 'text/html');
    }
});

// Test auth page (served from backend to avoid CORS issues)
Route::get('/test-auth', function () {
    $html = '
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Auth Test - Tech Verse</title>
    </head>
    <body>
        <h1>Authentication Test</h1>

        <h2>Setup Database</h2>
        <p><a href="/reset-db" target="_blank">Reset Database (DANGER - deletes all data)</a></p>
        <p><a href="/create-tables" target="_blank">Create Database Tables</a></p>
        <p><a href="/create-admin" target="_blank">Create Admin User</a></p>

        <h2>Register Test User</h2>
        <button id="register-test">Register Test User (test@example.com / password123)</button>
        <div id="register-result"></div>

        <h2>Login Test</h2>
        <div>
            <input type="email" id="login-email" placeholder="Email" value="test@example.com">
            <input type="password" id="login-password" placeholder="Password" value="password123">
            <button id="login-test">Login</button>
        </div>
        <div id="login-result"></div>

        <h2>Current User</h2>
        <div id="current-user"></div>
        <button id="check-user">Check Current User</button>
        <button id="logout-test">Logout</button>
        <div id="logout-result"></div>

        <script>
            const API_BASE = "/api";

            // Register test user
            document.getElementById("register-test").addEventListener("click", async () => {
                const result = document.getElementById("register-result");
                try {
                    const resp = await fetch(`${API_BASE}/register`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            username: "Test User",
                            email: "test@example.com",
                            password: "password123",
                            role: "customer"
                        })
                    });

                    const data = await resp.json();
                    result.innerHTML = `<pre>Status: ${resp.status}\n${JSON.stringify(data, null, 2)}</pre>`;
                } catch (err) {
                    result.textContent = `Error: ${err.message}`;
                }
            });

            // Login test
            document.getElementById("login-test").addEventListener("click", async () => {
                const result = document.getElementById("login-result");
                const email = document.getElementById("login-email").value;
                const password = document.getElementById("login-password").value;

                try {
                    const resp = await fetch(`${API_BASE}/login`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        credentials: "include",
                        body: JSON.stringify({ email, password })
                    });

                    const data = await resp.json();
                    result.innerHTML = `<pre>Status: ${resp.status}\n${JSON.stringify(data, null, 2)}</pre>`;

                    if (resp.ok && data.user) {
                        localStorage.setItem("techverse_auth_user", JSON.stringify(data.user));
                    }
                } catch (err) {
                    result.textContent = `Error: ${err.message}`;
                }
            });

            // Check current user
            document.getElementById("check-user").addEventListener("click", () => {
                const userDiv = document.getElementById("current-user");
                const user = localStorage.getItem("techverse_auth_user");
                if (user) {
                    userDiv.innerHTML = `<pre>${user}</pre>`;
                } else {
                    userDiv.textContent = "No user logged in";
                }
            });

            // Logout test
            document.getElementById("logout-test").addEventListener("click", async () => {
                const result = document.getElementById("logout-result");
                try {
                    const resp = await fetch(`${API_BASE}/logout`, {
                        method: "POST",
                        credentials: "include"
                    });

                    localStorage.removeItem("techverse_auth_user");
                    result.innerHTML = `<pre>Status: ${resp.status}\nLogged out successfully</pre>`;
                    document.getElementById("check-user").click();
                } catch (err) {
                    result.textContent = `Error: ${err.message}`;
                }
            });

            // Initial check
            document.getElementById("check-user").click();
        </script>
    </body>
    </html>';
    return response($html)->header('Content-Type', 'text/html');
});

// Create admin user (for development setup)
Route::get('/create-admin', function () {
    try {
        // First ensure the users table exists with correct schema
        \Illuminate\Support\Facades\DB::statement("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'customer',
                remember_token VARCHAR(100) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        $admin = \App\Models\User::firstOrCreate(
            ['email' => 'admin@techverse.com'],
            [
                'username' => 'Administrator',
                'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
                'role' => 'admin'
            ]
        );
        return response("Admin user created/updated successfully.<br>Email: admin@techverse.com<br>Password: admin123", 200)
            ->header('Content-Type', 'text/html');
    } catch (\Exception $e) {
        return response("Error creating admin: " . $e->getMessage(), 500)
            ->header('Content-Type', 'text/html');
    }
});


// Simple API route for testing registration
Route::post('/api/register', function (Request $request) {
    // Basic validation
    $data = $request->validate([
        'username' => 'required|string|max:255',
        'email' => 'required|string|email|max:255',
        'password' => 'required|string|min:8',
        'role' => 'in:admin,seller,customer'
    ]);

    // Simple response for testing
    return response()->json([
        'message' => 'Registration successful',
        'user' => [
            'id' => 1,
            'username' => $data['username'],
            'email' => $data['email'],
            'role' => $data['role'] ?? 'customer'
        ]
    ]);
});

// API routes are now handled exclusively in routes/api.php to avoid duplication






#//this is a test to ensure the currently commented db connection in .env works 


Route::get('/test-db-connection', function () {
    try {
//to fine if DB connection exists:
    if (!env('DB_CONNECTION')) {
        return 'DB_CONNECTION is not set in .env file.';
    }

        // Attempt to get a database connection
        DB::connection()->getPdo();
        return 'Database connection is working.';
    } catch (\Exception $e) {
        // Log the error message for debugging
         Log::error('Database connection failed: ' . $e->getMessage());
        return 'Database connection failed: ' . $e->getMessage();
    }
});