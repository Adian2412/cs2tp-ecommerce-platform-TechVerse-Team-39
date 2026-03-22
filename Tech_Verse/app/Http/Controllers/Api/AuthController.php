<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected function sendJson($data, int $status = 200)
    {
        return response()->json($data, $status);
    }

    protected function tryHeaderAuth(Request $request): bool
    {
        if (Auth::check()) {
            return true;
        }

        $token = $request->header('X-Session-Token');
        if (!$token) {
            return false;
        }

        try {
            $session = DB::table('sessions')->where('id', $token)->first();
            if ($session && $session->user_id) {
                $user = User::find($session->user_id);
                if ($user) {
                    Auth::login($user);
                    return true;
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('Header auth failed: ' . $e->getMessage());
        }

        return false;
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|max:120',
            'email' => 'required|string|email|max:190|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'nullable|in:customer,admin',
            'admin_code' => 'nullable|string',
        ]);

        $role = ($validated['role'] ?? 'customer') === 'admin' ? 'admin' : 'customer';
        if ($role === 'admin' && ($validated['admin_code'] ?? null) !== 'DEV_ADMIN_2024') {
            return $this->sendJson(['error' => 'Invalid admin registration code'], 403);
        }

        $user = User::create([
            'name' => $validated['username'],
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'role' => $role,
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        session()->save();
        $sessionToken = session()->getId();

        $userData = $user->toArray();
        $userData['username'] = $user->name;

        $response = $this->sendJson([
            'user' => $userData,
            'message' => 'User registered successfully',
            'session_token' => $sessionToken,
        ], 201);
        $response->headers->set('X-Session-Token', $sessionToken);

        return $response;
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']])) {
            return $this->sendJson(['error' => 'Invalid credentials'], 401);
        }

        $request->session()->regenerate();
        session()->save();
        $sessionToken = session()->getId();

        $user = Auth::user();
        $userData = $user->toArray();
        $userData['username'] = $user->name;

        $response = $this->sendJson([
            'user' => $userData,
            'message' => 'Login successful',
            'session_token' => $sessionToken,
        ]);
        $response->headers->set('X-Session-Token', $sessionToken);

        return $response;
    }

    public function logout(Request $request)
    {
        $this->tryHeaderAuth($request);

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->sendJson(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        $this->tryHeaderAuth($request);

        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Unauthenticated'], 401);
        }

        $user = Auth::user()->toArray();
        $user['username'] = $user['name'] ?? null;

        return $this->sendJson(['user' => $user]);
    }

    public function changePassword(Request $request)
    {
        $this->tryHeaderAuth($request);

        $user = Auth::user();
        if (!$user) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
        ]);

        if (!Hash::check($validated['current_password'], $user->password_hash)) {
            return $this->sendJson(['error' => 'Current password is incorrect'], 422);
        }

        $user->password_hash = Hash::make($validated['new_password']);
        $user->save();

        return $this->sendJson(['message' => 'Password changed successfully']);
    }
}
