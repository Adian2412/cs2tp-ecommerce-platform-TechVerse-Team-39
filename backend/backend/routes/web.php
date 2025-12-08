<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

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

// Development routes removed for production deployment
// Use 'php artisan migrate' for database setup instead
// Use 'php artisan tinker' or API endpoints for admin user creation

// API routes are now handled exclusively in routes/api.php






#//this is a test to ensure the currently commented db connection in .env works 


// Development routes removed for production deployment