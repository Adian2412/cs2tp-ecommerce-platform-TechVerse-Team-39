<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    /**
     * Allowed origins for CORS requests with credentials
     */
    private array $allowedOrigins = [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://127.0.0.1:5501',
        'http://localhost:5501',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://cs2team39.cs2410-web01pvm.aston.ac.uk',
    ];

    public function handle(Request $request, Closure $next)
    {
        // Get the origin from the request
        $origin = $request->header('Origin');

        // Reflect the request origin when it is in our allowlist; fall back to the
        // first configured origin to avoid sending the wildcard (*) with credentials.
        $allowedOrigin = null;
        if ($origin && (empty($this->allowedOrigins) || in_array($origin, $this->allowedOrigins))) {
            $allowedOrigin = $origin;
        } elseif (!empty($this->allowedOrigins)) {
            $allowedOrigin = $this->allowedOrigins[0];
        }

        // Handle preflight OPTIONS request
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
            
            if ($allowedOrigin) {
                $response->header('Access-Control-Allow-Origin', $allowedOrigin);
                $response->header('Access-Control-Allow-Credentials', 'true');
                $response->header('Vary', 'Origin');
            }

            return $response
                ->header('X-Cors-Middleware', 'hit-preflight')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-XSRF-TOKEN')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        // Add CORS headers to all responses
        if ($allowedOrigin) {
            $response->headers->set('Access-Control-Allow-Origin', $allowedOrigin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Vary', 'Origin');
        }
        
        $response->headers->set('X-Cors-Middleware', 'hit');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-XSRF-TOKEN');

        return $response;
    }
}
