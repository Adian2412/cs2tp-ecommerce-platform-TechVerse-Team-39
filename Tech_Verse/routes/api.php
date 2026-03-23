<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\BasketController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\ConsentController;
use App\Http\Controllers\GdprController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductAttributeController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\ServiceReviewController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\AuthController as AppAuthController;
use App\Http\Controllers\Api\AuthController as ApiAuthController;
use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\Api\ProductImageApiController;
use App\Http\Controllers\Api\AdminController;

// ── Health check ──────────────────────────────────────────────────────────────
Route::get('/ping', fn () => response()->json(['ok' => true, 'time' => now()->toDateTimeString()]));

// ── Auth — /api/auth/* (matches frontend JS calls) ───────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register',    [ApiAuthController::class, 'register']);
    Route::post('/login',       [AppAuthController::class, 'login']);       // OTP step 1
    Route::post('/verify-otp',  [AppAuthController::class, 'verifyOtp']);  // OTP step 2
    Route::post('/logout',      [AppAuthController::class, 'logout']);
    Route::get('/me',           [AppAuthController::class, 'me']);
    Route::post('/me',          [AppAuthController::class, 'me']);          // frontend uses POST
});

// Legacy auth routes (keep for compatibility)
Route::post('/login',           [ApiAuthController::class, 'login']);
Route::post('/register',        [ApiAuthController::class, 'register']);
Route::post('/logout',          [ApiAuthController::class, 'logout']);
Route::get('/user',             [ApiAuthController::class, 'user']);
Route::post('/change-password', [ApiAuthController::class, 'changePassword']);

// ── Products ──────────────────────────────────────────────────────────────────
Route::get('/products',                     [ProductApiController::class, 'index']);
Route::get('/products/{id}',                [ProductApiController::class, 'show']);
Route::post('/products',                    [ProductApiController::class, 'store']);
Route::put('/products/{id}',                [ProductApiController::class, 'update']);
Route::patch('/products/{id}',              [ProductApiController::class, 'update']);
Route::delete('/products/{id}',             [ProductApiController::class, 'destroy']);
Route::get('/my-products',                  [ProductApiController::class, 'myProducts']);
Route::post('/products/{id}/images',        [ProductImageApiController::class, 'store']);
Route::get('/products/{id}/reviews',        [ReviewController::class, 'index']);
Route::get('/products/{id}/review-eligibility', [ReviewController::class, 'eligibility']);

// Product likes and wishlist
Route::post('/products/{id}/like',          [ProductApiController::class, 'like']);
Route::get('/me/wishlist',                  [ProductApiController::class, 'wishlist']);
Route::post('/me/wishlist',                 [ProductApiController::class, 'addToWishlist']);
Route::delete('/me/wishlist/{id}',          [ProductApiController::class, 'removeFromWishlist']);

// ── Reviews ───────────────────────────────────────────────────────────────────
Route::post('/reviews',                         [ReviewController::class, 'store']);
Route::put('/reviews/{id}',                     [ReviewController::class, 'update']);
Route::delete('/reviews/{id}',                  [ReviewController::class, 'destroy']);
Route::get('/service-reviews/me',               [ServiceReviewController::class, 'myReview']);
Route::post('/service-reviews',                 [ServiceReviewController::class, 'store']);

// ── Cart (/api/cart — matches frontend) ──────────────────────────────────────
Route::get('/cart',                         [CartController::class, 'index']);
Route::post('/cart',                        [CartController::class, 'update']);

// ── Checkout, orders, returns ─────────────────────────────────────────────────
Route::post('/checkout',                    [CheckoutController::class, 'checkout']);
Route::get('/my-orders',                    [OrderController::class, 'myOrders']);
Route::get('/orders/{id}',                  [OrderController::class, 'show']);
Route::post('/order-items/{id}/return',     [OrderController::class, 'requestReturn']);

// ── GDPR (/api/gdpr — matches frontend) ──────────────────────────────────────
Route::get('/gdpr',                         [GdprController::class, 'export']);
Route::post('/gdpr',                        [GdprController::class, 'requestDeletion']);

// ── Consent (/api/consent — matches frontend) ─────────────────────────────────
Route::post('/consent',                     [ConsentController::class, 'store']);

// ── Admin ─────────────────────────────────────────────────────────────────────
Route::prefix('admin')->group(function () {
    Route::get('/summary',                  [AdminController::class, 'summary']);
    Route::get('/orders',                   [AdminController::class, 'orders']);
    Route::get('/users',                    [AdminController::class, 'users']);
    Route::get('/returns',                  [AdminController::class, 'returns']);
    Route::get('/reviews',                  [AdminController::class, 'reviews']);
    Route::get('/service-reviews',          [ServiceReviewController::class, 'adminIndex']);
    Route::delete('/service-reviews/{id}',  [ServiceReviewController::class, 'destroy']);
    Route::get('/contact-messages',         [ContactMessageController::class, 'index']);
    Route::delete('/contact-messages/{id}', [ContactMessageController::class, 'destroy']);
    Route::put('/returns/{id}',             [AdminController::class, 'updateReturn']);
    Route::patch('/returns/{id}',           [AdminController::class, 'updateReturn']);
    Route::get('/categories',               [AdminController::class, 'categories']);
    Route::get('/products',                 [AdminController::class, 'products']);
    Route::post('/products',                [AdminController::class, 'storeProduct']);
    Route::put('/products/{id}',            [AdminController::class, 'updateProduct']);
    Route::patch('/products/{id}',          [AdminController::class, 'updateProduct']);
    Route::post('/products/{id}/adjust-stock',   [AdminController::class, 'adjustStock']);
    Route::post('/products/{id}/toggle-active',  [AdminController::class, 'toggleProductActive']);
    Route::delete('/products/{id}',         [AdminController::class, 'destroyProduct']);
});

// ── Resource routes ───────────────────────────────────────────────────────────
Route::apiResources([
    'users'              => UserController::class,
    'addresses'          => AddressController::class,
    'baskets'            => BasketController::class,
    'categories'         => CategoryController::class,
    'contact-messages'   => ContactMessageController::class,
    'orders'             => OrderController::class,
    'product-attributes' => ProductAttributeController::class,
    'product-images'     => ProductImageController::class,
    'product-variants'   => ProductVariantController::class,
    'reviews'            => ReviewController::class,
    'stocks'             => StockController::class,
    'stock-movements'    => StockMovementController::class,
]);
