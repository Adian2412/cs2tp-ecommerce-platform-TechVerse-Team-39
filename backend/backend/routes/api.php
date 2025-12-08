<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController as ApiAuthController;
use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\Api\ProductImageApiController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductAttributeController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\BasketController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\API\AddressController;





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
Route::get('/products', [ProductApiController::class, 'index']);
Route::get('/products/{id}', [ProductApiController::class, 'show']);

// Product routes - authenticated user actions
Route::post('/products', [ProductApiController::class, 'store']);
Route::put('/products/{id}', [ProductApiController::class, 'update']);
Route::delete('/products/{id}', [ProductApiController::class, 'destroy']);

// Get only the current user's products (for seller dashboard)
Route::get('/my-products', [ProductApiController::class, 'myProducts']);

// upload image(s) for an existing product
Route::post('/products/{id}/images', [ProductImageApiController::class, 'store']);

// Product-specific reviews route (get reviews for a product)
Route::get('/products/{id}/reviews', [ReviewController::class, 'index']);

// Test route
Route::get('/test', function () {
    return response()->json(['message' => 'API routes from api.php working']);
});

// Debug session route
Route::get('/debug-session', function () {
    return response()->json([
        'session_id' => session()->getId(),
        'user_id' => \Illuminate\Support\Facades\Auth::id(),
        'authenticated' => \Illuminate\Support\Facades\Auth::check(),
        'user' => \Illuminate\Support\Facades\Auth::user(),
        'session_driver' => config('session.driver'),
        'session_same_site' => config('session.same_site'),
        'session_secure' => config('session.secure'),
    ]);
});

// Auth routes
Route::post('/login', [ApiAuthController::class, 'login']);
Route::post('/register', [ApiAuthController::class, 'register']);
Route::post('/logout', [ApiAuthController::class, 'logout']);
Route::get('/user', [ApiAuthController::class, 'user']); // Get current authenticated user

// Helpful GET routes for API endpoints (for debugging - these return info instead of errors)
Route::get('/register', function () {
    return response()->json([
        'error' => 'Method Not Allowed',
        'message' => 'The /api/register endpoint only accepts POST requests.',
        'usage' => 'Use POST with JSON body: { "username": "...", "email": "...", "password": "...", "role": "customer" }',
        'example' => 'fetch("http://localhost:8000/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...}) })'
    ], 405);
});

Route::get('/login', function () {
    return response()->json([
        'error' => 'Method Not Allowed',
        'message' => 'The /api/login endpoint only accepts POST requests.',
        'usage' => 'Use POST with JSON body: { "email": "...", "password": "..." }',
        'example' => 'fetch("http://localhost:8000/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...}) })'
    ], 405);
});

// Note: CORS preflight (OPTIONS) requests are handled by CorsMiddleware
// Do NOT add explicit OPTIONS routes here as they will override the middleware



//CRUD
Route::apiResources([
    'users' => UserController::class,
    'addresses' => AddressController::class,
    'baskets' => BasketController::class,
    'categories' => CategoryController::class,
    'contact-messages' => ContactMessageController::class,
    'orders' => OrderController::class,
    'products' => ProductController::class,
    'product-attributes' => ProductAttributeController::class,
    'product-images' => ProductImageController::class,
    'product-variants' => ProductVariantController::class,
    'reviews' => ReviewController::class,
    'stocks' => StockController::class,
    'stock-movements' => StockMovementController::class,
]);