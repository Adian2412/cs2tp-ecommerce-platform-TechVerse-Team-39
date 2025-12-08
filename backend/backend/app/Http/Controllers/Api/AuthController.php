<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Helper to return JSON responses.
     * CORS headers are handled by CorsMiddleware, so we don't override them here.
     * This prevents conflicts with credentials: 'include' requests.
     */
    protected function sendJson($data, $status = 200)
    {
        return response()->json($data, $status);
    }
    
    /**
     * Try to authenticate from X-Session-Token header (for cross-origin development).
     * This allows the frontend to store the session ID and send it as a header
     * when cookies don't work (cross-origin HTTP requests).
     */
    protected function tryHeaderAuth(Request $request)
    {
        // Check if already authenticated via session cookie
        if (Auth::check()) {
            return true;
        }
        
        // Try X-Session-Token header
        $token = $request->header('X-Session-Token');
        if (!$token) {
            return false;
        }
        
        // Try to load the session from database
        try {
            $sessionData = DB::table('sessions')->where('id', $token)->first();
            if ($sessionData && $sessionData->user_id) {
                // Log the user in
                $user = User::find($sessionData->user_id);
                if ($user) {
                    Auth::login($user);
                    return true;
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Header auth failed: ' . $e->getMessage());
        }
        
        return false;
    }

    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'username' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:8',
                'role' => 'in:admin,customer',
                'admin_code' => 'nullable|string' // Special code for admin registration
            ]);

            // Check if database connection works
            try {
                /** @var \Illuminate\Support\Facades\DB */
                DB::connection()->getPdo();
            } catch (\Exception $e) {
                $errorMsg = $e->getMessage();
                $helpMessage = 'Please ensure MySQL is running (XAMPP) and the database is configured. ';
                $helpMessage .= 'Run: setup-mysql.bat or visit http://localhost:8000/create-tables';
                
                return $this->sendJson([
                    'error' => 'Database connection failed',
                    'message' => $helpMessage,
                    'details' => $errorMsg
                ], 500);
            }

            // Check if users table exists
            try {
                /** @var \Illuminate\Support\Facades\DB */
                DB::table('users')->count();
            } catch (\Exception $e) {
                return $this->sendJson([
                    'error' => 'Users table not found',
                    'message' => 'Please create database tables. Visit http://localhost:8000/create-tables'
                ], 500);
            }

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
            
            // Explicitly save the session to ensure it persists in MySQL
            session()->save();
            
            // Get the session ID - this can be used as a token for cross-origin requests
            $sessionToken = session()->getId();

            $response = $this->sendJson([
                'user' => $user,
                'message' => 'User registered successfully',
                'session_token' => $sessionToken
            ]);
            
            // Also set the token in a response header
            $response->headers->set('X-Session-Token', $sessionToken);
            
            return $response;
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendJson([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return $this->sendJson([
                'error' => 'Registration failed',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        try {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

            // Check if database connection works
            try {
                /** @var \Illuminate\Support\Facades\DB */
                DB::connection()->getPdo();
            } catch (\Exception $e) {
                $errorMsg = $e->getMessage();
                $helpMessage = 'Please ensure MySQL is running (XAMPP) and the database is configured. ';
                $helpMessage .= 'Run: setup-mysql.bat or visit http://localhost:8000/create-tables';
                
                return $this->sendJson([
                    'error' => 'Database connection failed',
                    'message' => $helpMessage,
                    'details' => $errorMsg
                ], 500);
            }

            // Check if users table exists
            try {
                /** @var \Illuminate\Support\Facades\DB */
                DB::table('users')->count();
            } catch (\Exception $e) {
                return $this->sendJson([
                    'error' => 'Users table not found',
                    'message' => 'Please create database tables. Visit http://localhost:8000/create-tables'
                ], 500);
            }

        if (!Auth::attempt($validated)) {
            return $this->sendJson(['error' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();
        
        // Regenerate session ID for security after successful login
        $request->session()->regenerate();
        
        // Explicitly save the session to ensure it persists in MySQL
        session()->save();
        
        // Get the session ID - this can be used as a token for cross-origin requests
        $sessionToken = session()->getId();

        // Create response with user data and session token
        // The session token allows the frontend to authenticate even when
        // cookies don't work (cross-origin HTTP requests in development)
        $response = $this->sendJson([
            'user' => $user,
            'message' => 'Login successful',
            'session_token' => $sessionToken // Frontend can store this and send as X-Session-Token header
        ]);
        
        // Also set the token in a response header for easy access
        $response->headers->set('X-Session-Token', $sessionToken);

        return $response;
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendJson([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return $this->sendJson([
                'error' => 'Login failed',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Get current authenticated user
     */
    public function user(Request $request)
    {
        // Try header-based auth if cookie auth didn't work
        $this->tryHeaderAuth($request);
        
        $user = Auth::user();
        
        if (!$user) {
            return $this->sendJson(['error' => 'Not authenticated'], 401);
        }
        
        return $this->sendJson(['user' => $user]);
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
