<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('auth_user_id')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
