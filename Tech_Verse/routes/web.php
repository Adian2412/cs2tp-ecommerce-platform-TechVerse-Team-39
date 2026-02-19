<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

Route::get('/', function () {
    return view('welcome');
});







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