<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /auth/register
    public function register(Request $request)
    {
        // add validate input (name, email, password)
        // $data = $request->validate([...]);

        // add create user (hash password into password_hash)
        // $user = User::create([...]);

        // add  issue token (Sanctum) and return
        return response()->json(['message' => 'register endpoint ready'], 201);
    }

    // POST /auth/login
    public function login(Request $request)
    {
        // add: validate credentials
        // $user = User::where('email', $request->email)->first();
        // if (!Hash::check($request->password, $user->password_hash)) throw ValidationException...
        // create token and return
        return response()->json(['message' => 'login endpoint ready']);
    }

    // POST /authentication/logout
    public function logout(Request $request)
    {
        // add: revoke token
        return response()->json(['message' => 'logged out']);
    }

    // GET /authentication/me
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
