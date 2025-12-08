<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // CRITICAL: CORS middleware must run FIRST for all requests (especially OPTIONS preflight)
        // Using prepend on global stack ensures it runs before any other middleware
        $middleware->prepend(\App\Http\Middleware\CorsMiddleware::class);
        
        // Ensure sessions table exists before session middleware runs (for setup routes)
        $middleware->web(prepend: [
            \App\Http\Middleware\EnsureSessionsTableExists::class,
            \App\Http\Middleware\ConfigureSessionCookie::class,
        ]);
        
        // Enable session middleware for API routes (needed for session-based authentication)
        // We're using session-based auth, not Sanctum tokens, so we configure sessions manually
        $middleware->api(prepend: [
            \App\Http\Middleware\EnsureSessionsTableExists::class,
            \App\Http\Middleware\ConfigureSessionCookie::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \App\Http\Middleware\EnsureSessionCookie::class, // Run after StartSession to fix cookie attributes
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
