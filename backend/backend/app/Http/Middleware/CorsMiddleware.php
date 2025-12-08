<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    /**
     * Allowed origins for CORS requests with credentials
     * 
     * Development:
     * - http://127.0.0.1:5500 (Live Server)
     * - http://localhost:5500 (Live Server)
     * - http://localhost:8000 (Laravel serve)
     * 
     * Production (Virtualmin):
     * - https://cs2team39.cs2410-web01pvm.aston.ac.uk
     * - Add your production domain here
     */
    private array $allowedOrigins = [
        // Development origins
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://127.0.0.1:5501',
        'http://localhost:5501',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        // Production origins (Virtualmin)
        'https://cs2team39.cs2410-web01pvm.aston.ac.uk',
        'http://cs2team39.cs2410-web01pvm.aston.ac.uk',
    ];

    /**
     * Allowed headers for cross-origin requests
     * Include X-Session-Token for cross-origin session authentication
     */
    private string $allowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept, X-XSRF-TOKEN, X-Session-Token, Origin';

    /**
     * Exposed headers that the frontend can read
     */
    private string $exposedHeaders = 'Set-Cookie, X-Session-Token, X-Session-Active, X-Session-ID, X-User-Authenticated, X-User-ID';

    /**
     * Allowed HTTP methods
     */
    private string $allowedMethods = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

    public function handle(Request $request, Closure $next)
    {
        // Get the origin from the request
        $origin = $request->header('Origin');

        // Determine allowed origin
        // For same-origin requests in production, origin header may be absent - that's OK
        $allowedOrigin = null;
        
        if ($origin) {
            // Check if the origin is in our allowlist
            if (in_array($origin, $this->allowedOrigins)) {
                $allowedOrigin = $origin;
            }
            // Also allow same-origin (when API and frontend share domain in production)
            elseif ($this->isSameOrigin($request, $origin)) {
                $allowedOrigin = $origin;
            }
            // Allow configurable origin from environment
            elseif ($this->isAllowedByEnv($origin)) {
                $allowedOrigin = $origin;
            }
        }

        // Handle preflight OPTIONS request - MUST return early with proper headers
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204); // 204 No Content for preflight

            if ($allowedOrigin) {
                $response->header('Access-Control-Allow-Origin', $allowedOrigin);
                $response->header('Access-Control-Allow-Credentials', 'true');
                $response->header('Vary', 'Origin');
            }

            return $response
                ->header('X-Cors-Middleware', 'hit-preflight')
                ->header('Access-Control-Allow-Methods', $this->allowedMethods)
                ->header('Access-Control-Allow-Headers', $this->allowedHeaders)
                ->header('Access-Control-Expose-Headers', $this->exposedHeaders)
                ->header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
        }

        $response = $next($request);

        // Add CORS headers to all responses
        if ($allowedOrigin) {
            $response->headers->set('Access-Control-Allow-Origin', $allowedOrigin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Vary', 'Origin');
        }

        // Always set these headers for consistency
        $response->headers->set('X-Cors-Middleware', 'hit');
        $response->headers->set('Access-Control-Allow-Methods', $this->allowedMethods);
        $response->headers->set('Access-Control-Allow-Headers', $this->allowedHeaders);
        $response->headers->set('Access-Control-Expose-Headers', $this->exposedHeaders);

        return $response;
    }

    /**
     * Check if request origin matches the server (same-origin in production)
     */
    private function isSameOrigin(Request $request, string $origin): bool
    {
        $serverHost = $request->getHost();
        $parsedOrigin = parse_url($origin, PHP_URL_HOST);
        
        return $serverHost === $parsedOrigin;
    }

    /**
     * Check if origin is allowed via environment variable
     * This allows production configuration without code changes
     */
    private function isAllowedByEnv(string $origin): bool
    {
        $envOrigins = env('CORS_ALLOWED_ORIGINS', '');
        if (empty($envOrigins)) {
            return false;
        }
        
        $origins = array_map('trim', explode(',', $envOrigins));
        return in_array($origin, $origins);
    }
}
