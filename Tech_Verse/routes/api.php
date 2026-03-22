<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\BasketController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductAttributeController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\ServiceReviewController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Api\AuthController as ApiAuthController;
use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\Api\ProductImageApiController;
use App\Http\Controllers\Api\AdminController;

Route::get('/ping', fn () => response()->json(['ok' => true, 'time' => now()->toDateTimeString()]));

// Product API used by the current frontend
Route::get('/products', [ProductApiController::class, 'index']);
Route::get('/products/{id}', [ProductApiController::class, 'show']);
Route::post('/products', [ProductApiController::class, 'store']);
Route::put('/products/{id}', [ProductApiController::class, 'update']);
Route::patch('/products/{id}', [ProductApiController::class, 'update']);
Route::delete('/products/{id}', [ProductApiController::class, 'destroy']);
Route::get('/my-products', [ProductApiController::class, 'myProducts']);
Route::post('/products/{id}/images', [ProductImageApiController::class, 'store']);
Route::get('/products/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/products/{id}/review-eligibility', [ReviewController::class, 'eligibility']);
Route::get('/service-reviews/me', [ServiceReviewController::class, 'myReview']);
Route::post('/service-reviews', [ServiceReviewController::class, 'store']);

// Auth
Route::post('/login', [ApiAuthController::class, 'login']);
Route::post('/register', [ApiAuthController::class, 'register']);
Route::post('/logout', [ApiAuthController::class, 'logout']);
Route::get('/user', [ApiAuthController::class, 'user']);
Route::post('/change-password', [ApiAuthController::class, 'changePassword']);

// Checkout, orders, and returns
Route::post('/checkout', [CheckoutController::class, 'checkout']);
Route::get('/my-orders', [OrderController::class, 'myOrders']);
Route::post('/order-items/{id}/return', [OrderController::class, 'requestReturn']);

// Admin dashboard data and management
Route::get('/admin/summary', [AdminController::class, 'summary']);
Route::get('/admin/orders', [AdminController::class, 'orders']);
Route::get('/admin/users', [AdminController::class, 'users']);
Route::get('/admin/returns', [AdminController::class, 'returns']);
Route::get('/admin/reviews', [AdminController::class, 'reviews']);
Route::get('/admin/service-reviews', [ServiceReviewController::class, 'adminIndex']);
Route::delete('/admin/service-reviews/{id}', [ServiceReviewController::class, 'destroy']);
Route::get('/admin/contact-messages', [ContactMessageController::class, 'index']);
Route::delete('/admin/contact-messages/{id}', [ContactMessageController::class, 'destroy']);
Route::put('/admin/returns/{id}', [AdminController::class, 'updateReturn']);
Route::patch('/admin/returns/{id}', [AdminController::class, 'updateReturn']);
Route::get('/admin/categories', [AdminController::class, 'categories']);
Route::get('/admin/products', [AdminController::class, 'products']);
Route::post('/admin/products', [AdminController::class, 'storeProduct']);
Route::put('/admin/products/{id}', [AdminController::class, 'updateProduct']);
Route::patch('/admin/products/{id}', [AdminController::class, 'updateProduct']);
Route::post('/admin/products/{id}/adjust-stock', [AdminController::class, 'adjustStock']);
Route::post('/admin/products/{id}/toggle-active', [AdminController::class, 'toggleProductActive']);
Route::delete('/admin/products/{id}', [AdminController::class, 'destroyProduct']);

// Resource routes
Route::apiResources([
    'users' => UserController::class,
    'addresses' => AddressController::class,
    'baskets' => BasketController::class,
    'categories' => CategoryController::class,
    'contact-messages' => ContactMessageController::class,
    'orders' => OrderController::class,
    'product-attributes' => ProductAttributeController::class,
    'product-images' => ProductImageController::class,
    'product-variants' => ProductVariantController::class,
    'reviews' => ReviewController::class,
    'stocks' => StockController::class,
    'stock-movements' => StockMovementController::class,
]);
