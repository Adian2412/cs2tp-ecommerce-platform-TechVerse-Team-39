<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BasketController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductAttributeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ContactMessageController;

// Authentication routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
});

// Categories routes
Route::apiResource('categories', CategoryController::class);

// Products & variants routes
Route::apiResource('products', ProductController::class);
Route::apiResource('product-variants', ProductVariantController::class);
Route::apiResource('product-attributes', ProductAttributeController::class);
Route::apiResource('product-images', ProductImageController::class);





// Basket
Route::apiResource('baskets', BasketController::class);

// Checkout
Route::post('/checkout', [CheckoutController::class, 'checkout']);

// Orders
Route::apiResource('orders', OrderController::class);

// Stock & movements
Route::apiResource('stock', StockController::class);
Route::apiResource('stock-movements', StockMovementController::class);

// Reviews
Route::apiResource('reviews', ReviewController::class);

// Contact messages
Route::apiResource('contact-messages', ContactMessageController::class);
