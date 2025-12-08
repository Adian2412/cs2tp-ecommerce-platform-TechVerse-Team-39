<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;

class ConfigureSessionCookie
{
    /**
     * Handle an incoming request.
     * 
     * Configure session cookie settings for cross-origin requests.
     * This must run BEFORE StartSession middleware to take effect.
     * 
     * Works for both development (localhost) and production (Virtualmin/HTTPS).
     */
    public function handle(Request $request, Closure $next)
    {
        // Check if we're on localhost (development)
        $host = $request->getHost();
        $isLocalhost = in_array($host, ['localhost', '127.0.0.1', '::1']) ||
                       str_contains($host, 'localhost') ||
                       str_contains($host, '127.0.0.1');
        
        // Check for HTTPS - also check common proxy headers
        $isHttps = $request->secure() || 
                   $request->header('X-Forwarded-Proto') === 'https' ||
                   $request->header('X-Forwarded-Ssl') === 'on';

        // Check if this is a cross-origin request (different port or different host)
        $origin = $request->header('Origin');
        $originHost = $origin ? parse_url($origin, PHP_URL_HOST) : null;
        $originPort = $origin ? parse_url($origin, PHP_URL_PORT) : null;
        $serverPort = $request->getPort();
        $isCrossOrigin = $origin && ($originHost !== $host || $originPort !== $serverPort);
        
        // Check if origin is also localhost (just different port)
        $isLocalhostOrigin = $originHost && (
            in_array($originHost, ['localhost', '127.0.0.1', '::1']) ||
            str_contains($originHost, 'localhost') ||
            str_contains($originHost, '127.0.0.1')
        );

        // For development on localhost with cross-origin requests (different ports)
        if ($isLocalhost && $isLocalhostOrigin && !$isHttps) {
            // Use 'lax' for same-site localhost requests - this is more compatible
            // 'none' requires Secure flag which doesn't work well on HTTP
            Config::set('session.same_site', 'lax');
            Config::set('session.secure', false);
            Config::set('session.domain', null); // null allows cross-port
            Config::set('session.http_only', true);
        } elseif ($isLocalhost && !$isHttps) {
            // Non-cross-origin localhost request
            Config::set('session.same_site', 'lax');
            Config::set('session.secure', false);
            Config::set('session.domain', null);
            Config::set('session.http_only', true);
        } elseif ($isHttps) {
            // Production HTTPS - use 'none' with 'secure' for cross-origin
            // Or 'lax' if same-origin
            if ($isCrossOrigin) {
                Config::set('session.same_site', 'none');
                Config::set('session.secure', true);
            } else {
                Config::set('session.same_site', 'lax');
                Config::set('session.secure', true);
            }
            Config::set('session.domain', null);
            Config::set('session.http_only', true);
        } else {
            // Default fallback
            Config::set('session.same_site', 'lax');
            Config::set('session.secure', false);
            Config::set('session.domain', null);
            Config::set('session.http_only', true);
        }

        // Ensure session path is set correctly
        Config::set('session.path', '/');

        return $next($request);
    }
}
