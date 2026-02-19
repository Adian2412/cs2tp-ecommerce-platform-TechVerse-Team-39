<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ConsentController;
use App\Http\Controllers\GdprController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| All routes use the 'web' middleware group so that Laravel sessions work.
| CSRF is excluded for api/* in bootstrap/app.php.
*/

Route::middleware('web')->group(function () {

    // ── Auth ─────────────────────────────────────────────────────────────────
    Route::post('/auth/register',   [AuthController::class, 'register']);
    Route::post('/auth/login',      [AuthController::class, 'login']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/logout',     [AuthController::class, 'logout']);
    Route::post('/auth/me',         [AuthController::class, 'me']);

    // ── Categories (public) ───────────────────────────────────────────────────
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index']);
    });

    // ── Products (public) ─────────────────────────────────────────────────────
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/products',      [ProductController::class, 'index']);
        Route::get('/products/{id}', [ProductController::class, 'show'])->where('id', '[0-9]+');

        // Reviews (public read)
        Route::get('/products/{id}/reviews', [ReviewController::class, 'index'])->where('id', '[0-9]+');
    });

    // ── Authenticated routes ───────────────────────────────────────────────────
    Route::middleware('auth.session')->group(function () {

        // Cart
        Route::get('/cart',  [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'update']);

        // Orders
        Route::get('/orders',          [OrderController::class, 'index']);
        Route::get('/orders/{id}',     [OrderController::class, 'show'])->where('id', '[0-9]+');

        // Reviews (authenticated write)
        Route::post('/products/{id}/reviews', [ReviewController::class, 'store'])->where('id', '[0-9]+');

        // GDPR
        Route::get('/gdpr/export',            [GdprController::class, 'export']);
        Route::post('/gdpr/request-deletion', [GdprController::class, 'requestDeletion']);

    });

    // ── Cookie consent (public) ───────────────────────────────────────────────
    Route::post('/consent', [ConsentController::class, 'store']);

});
