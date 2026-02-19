<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only redirect in production (not local dev)
        if (! $request->isSecure() && app()->environment('production')) {
            return redirect()->secure($request->getRequestUri(), 301);
        }

        $response = $next($request);

        // Add HSTS header in production
        if (app()->environment('production')) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        return $response;
    }
}
