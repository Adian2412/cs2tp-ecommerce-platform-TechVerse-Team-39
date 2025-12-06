<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
   
    //register new user
    public function register(Request $request)
    {
        try{
        // add validate input data
 $validated = $request->validate([
            'username' => 'required|string|min:3|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6'

 ]);

        // add create user 
$user = User::create([
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),


        ]);
        // issue token (Sanctum) and return
             $token = $user->createToken('auth_token')->plainTextToken;
        return response()->json(['message' => 'user registered successfully', 'access_token' => $token, 'token_type' => 'Bearer'], 201);
    }
    catch(\Exception $e){
        return response()->json(['message' => 'Registration failed', 'error' => $e->getMessage()], 500);
    }
}

    //login user
    public function login(Request $request)
    {
        try{
        //validate credentials
 $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // to find a user by email
        $user = User::where('email', $validated['email'])->first();

        //if user invalid throw exception
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided details are incorrect.'],
            ]);
        }


        // create token and return
        $token = $user->createToken('auth_token')->plainTextToken;
        return response()->json(['message' => 'Successfull login', 'access_token' => $token, 'token_type' => 'Bearer']);
    }
    catch(\Exception $e){
        return response()->json(['message' => 'Login failed', 'error' => $e->getMessage()], 500);
    }   
    }
    
    //logout user/revoke token
    public function logout(Request $request)
    {
        
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'logged out']);
    }

    
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
