<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ConsentController;
use App\Http\Controllers\GdprController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| All routes use the 'web' middleware group so that Laravel sessions work.
| CSRF is excluded for api/* in bootstrap/app.php.
*/

Route::middleware('web')->group(function () {

    // ── Auth ──────────────────────────────────────────────────────────────────
    Route::post('/auth/register',   [AuthController::class, 'register']);
    Route::post('/auth/login',      [AuthController::class, 'login']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/logout',     [AuthController::class, 'logout']);
    Route::post('/auth/me',         [AuthController::class, 'me']);

    // ── Geo (server-side country detection — replaces client-side IP calls) ───
    // Returns the visitor's country code based on the request IP, resolved
    // server-side so no user IP is ever sent to a third-party from the browser.
    Route::middleware('throttle:60,1')->get('/geo', function (Request $request) {
        $ip = $request->ip();

        // In local/dev environments (127.x, ::1) just return GB as default
        if (in_array($ip, ['127.0.0.1', '::1', 'localhost'])) {
            return response()->json(['country' => 'GB']);
        }

        // Use ip-api.com server-to-server (free, no key needed, not exposed to client)
        try {
            $url  = 'http://ip-api.com/json/' . urlencode($ip) . '?fields=countryCode';
            $json = @file_get_contents($url);
            if ($json) {
                $data = json_decode($json, true);
                if (!empty($data['countryCode'])) {
                    return response()->json(['country' => strtoupper($data['countryCode'])]);
                }
            }
        } catch (\Exception $e) {
            // fall through to default
        }

        return response()->json(['country' => null]);
    });

    // ── Categories (public) ───────────────────────────────────────────────────
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index']);
    });

    // ── Products (public) ─────────────────────────────────────────────────────
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/products',      [ProductController::class, 'index']);
        Route::get('/products/{id}', [ProductController::class, 'show'])->where('id', '[0-9]+');
        Route::get('/products/{id}/reviews', [ReviewController::class, 'index'])->where('id', '[0-9]+');
    });

    // ── Cookie consent (rate limited to prevent spam) ─────────────────────────
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/consent', [ConsentController::class, 'store']);
    });

    // ── Authenticated routes ───────────────────────────────────────────────────
    Route::middleware('auth.session')->group(function () {

        // Cart
        Route::get('/cart',  [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'update']);

        // Orders
        Route::get('/orders',      [OrderController::class, 'index']);
        Route::get('/orders/{id}', [OrderController::class, 'show'])->where('id', '[0-9]+');

        // Reviews (write)
        Route::post('/products/{id}/reviews', [ReviewController::class, 'store'])->where('id', '[0-9]+');

        // Profile
        Route::put('/user',             [UserController::class, 'update']);
        Route::put('/user/password',    [UserController::class, 'changePassword']);

        // GDPR
        Route::get('/gdpr/export',            [GdprController::class, 'export']);
        Route::post('/gdpr/request-deletion', [GdprController::class, 'requestDeletion']);

    });

});
