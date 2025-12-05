<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes provide a simple API surface for the frontend static pages
| to create/list products and upload product images. The controllers live
| in App\Http\Controllers\Api and are lightweight wrappers around the
| existing Eloquent models.
|
*/

// Product routes - public browsing
Route::get('/products', [App\Http\Controllers\Api\ProductApiController::class, 'index']);
Route::get('/products/{id}', [App\Http\Controllers\Api\ProductApiController::class, 'show']);

// Product routes - authenticated user actions
Route::post('/products', [App\Http\Controllers\Api\ProductApiController::class, 'store']);
Route::put('/products/{id}', [App\Http\Controllers\Api\ProductApiController::class, 'update']);
Route::delete('/products/{id}', [App\Http\Controllers\Api\ProductApiController::class, 'destroy']);

// Get only the current user's products (for seller dashboard)
Route::get('/my-products', [App\Http\Controllers\Api\ProductApiController::class, 'myProducts']);

// upload image(s) for an existing product
Route::post('/products/{id}/images', [App\Http\Controllers\Api\ProductImageApiController::class, 'store']);

// Test route
Route::get('/test', function () {
    return response()->json(['message' => 'API routes from api.php working']);
});

// Auth routes
Route::post('/login', [App\Http\Controllers\Api\AuthController::class, 'login']);
Route::post('/register', [App\Http\Controllers\Api\AuthController::class, 'register']);
Route::post('/logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);

// Note: CORS preflight (OPTIONS) requests are handled by CorsMiddleware
// Do NOT add explicit OPTIONS routes here as they will override the middleware
