<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSessionCookie
{
    /**
     * Handle an incoming request.
     * 
     * This middleware ensures the session cookie is properly set.
     * It runs after StartSession to add debug headers.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        
        // Add debug headers to help diagnose session issues
        if ($request->is('api/*')) {
            $sessionId = session()->getId();
            $hasCookie = $request->hasCookie(config('session.cookie'));
            $cookieValue = $request->cookie(config('session.cookie'));
            
            // Log cookie state
            \Log::info('EnsureSessionCookie middleware', [
                'endpoint' => $request->path(),
                'session_id' => $sessionId,
                'request_has_cookie' => $hasCookie,
                'cookie_value_present' => !empty($cookieValue),
                'response_has_set_cookie' => $response->headers->has('Set-Cookie'),
            ]);
            
            if ($sessionId) {
                $response->headers->set('X-Session-Active', 'true');
                $response->headers->set('X-Session-ID', $sessionId);
                $response->headers->set('X-Request-Had-Cookie', $hasCookie ? 'true' : 'false');
                
                if (\Illuminate\Support\Facades\Auth::check()) {
                    $response->headers->set('X-User-Authenticated', 'true');
                    $response->headers->set('X-User-ID', (string)\Illuminate\Support\Facades\Auth::id());
                } else {
                    $response->headers->set('X-User-Authenticated', 'false');
                }
            } else {
                $response->headers->set('X-Session-Active', 'false');
                $response->headers->set('X-Request-Had-Cookie', $hasCookie ? 'true' : 'false');
            }
            
            // Check if Set-Cookie header is present
            $setCookieHeaders = $response->headers->get('Set-Cookie', null, false);
            $cookieCount = is_array($setCookieHeaders) ? count($setCookieHeaders) : ($setCookieHeaders !== null ? 1 : 0);
            $response->headers->set('X-Response-Set-Cookie-Count', (string)$cookieCount);
        }
        
        return $response;
    }
}
