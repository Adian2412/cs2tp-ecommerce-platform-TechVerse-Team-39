<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Helper to return JSON with permissive CORS headers for development.
     */
    protected function sendJson($data, $status = 200)
    {
        return response()->json($data, $status)->withHeaders([
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, X-Requested-With, Authorization',
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Allow-Private-Network' => 'true'
        ]);
    }

    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'in:admin,customer',
            'admin_code' => 'nullable|string' // Special code for admin registration
        ]);

        // Only allow admin role with special developer code
        $requestedRole = $validated['role'] ?? 'customer';
        if ($requestedRole === 'admin') {
            if ($validated['admin_code'] !== 'DEV_ADMIN_2024') {
                return $this->sendJson(['error' => 'Invalid admin registration code'], 403);
            }
        }

        // All authenticated users are customers (guests are not authenticated)
        $finalRole = $requestedRole === 'admin' ? 'admin' : 'customer';

        $user = User::create([
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => $validated['password'], // No Hash::make needed - 'hashed' cast handles it
            'role' => $finalRole,
        ]);

        // For simplicity, we'll use session-based auth instead of tokens for now
        Auth::login($user);

        return $this->sendJson([
            'user' => $user,
            'message' => 'User registered successfully'
        ]);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($validated)) {
            return $this->sendJson(['error' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();

        return $this->sendJson([
            'user' => $user,
            'message' => 'Login successful'
        ]);
    }

    /**
     * Logout user
     */
    public function logout()
    {
        Auth::logout();
        return $this->sendJson(['message' => 'Logged out successfully']);
    }
}
