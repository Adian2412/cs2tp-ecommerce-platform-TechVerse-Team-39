<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    // ── Register ─────────────────────────────────────────────────────────────
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name'          => strip_tags($validated['name']),
            'email'         => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'role'          => 'customer',
        ]);

        return response()->json([
            'message' => 'Account created successfully.',
            'user'    => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ], 201);
    }

    // ── Login (step 1 – password check, sends OTP) ────────────────────────────
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $key = 'login.' . md5($validated['email'] . $request->ip());

        if (RateLimiter::tooManyAttempts($key, 10)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Too many login attempts. Please wait {$seconds} seconds.",
            ], 429);
        }

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password_hash)) {
            RateLimiter::hit($key, 300);
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        RateLimiter::clear($key);

        // Generate 6-digit OTP
        $otp     = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $otpHash = hash('sha256', $otp);

        $request->session()->put('mfa_user_id',   $user->id);
        $request->session()->put('mfa_otp_hash',  $otpHash);
        $request->session()->put('mfa_otp_expiry', now()->addMinutes(10)->timestamp);
        $request->session()->put('mfa_attempts',  0);

        Mail::to($user->email)->send(new OtpMail($otp, $user->name));

        return response()->json([
            'mfa_required' => true,
            'message'      => "A 6-digit verification code has been sent to {$user->email}.",
        ]);
    }

    // ── Verify OTP (step 2) ───────────────────────────────────────────────────
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $userId   = $request->session()->get('mfa_user_id');
        $otpHash  = $request->session()->get('mfa_otp_hash');
        $expiry   = $request->session()->get('mfa_otp_expiry');
        $attempts = (int) $request->session()->get('mfa_attempts', 0);

        if (! $userId || ! $otpHash) {
            return response()->json(['message' => 'No active verification session. Please log in again.'], 401);
        }

        if ($attempts >= 5) {
            $this->clearMfaSession($request);
            return response()->json(['message' => 'Too many failed attempts. Please log in again.'], 429);
        }

        if (now()->timestamp > $expiry) {
            $this->clearMfaSession($request);
            return response()->json(['message' => 'Verification code has expired. Please log in again.'], 401);
        }

        if (! hash_equals($otpHash, hash('sha256', $validated['otp']))) {
            $request->session()->put('mfa_attempts', $attempts + 1);
            $remaining = 4 - $attempts;
            return response()->json([
                'message' => "Invalid code. {$remaining} attempt(s) remaining.",
            ], 401);
        }

        // OTP correct – clear MFA session data and fully log in
        $user = User::find($userId);
        $this->clearMfaSession($request);

        $request->session()->put('auth_user_id', $user->id);
        $request->session()->regenerate();

        return response()->json([
            'authenticated' => true,
            'user'          => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    // ── Me (check session) ────────────────────────────────────────────────────
    public function me(Request $request): JsonResponse
    {
        $userId = $request->session()->get('auth_user_id');
        if (! $userId) {
            return response()->json(['authenticated' => false], 401);
        }

        $user = User::find($userId);
        if (! $user) {
            $request->session()->forget('auth_user_id');
            return response()->json(['authenticated' => false], 401);
        }

        return response()->json([
            'authenticated' => true,
            'user'          => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    public function logout(Request $request): JsonResponse
    {
        $request->session()->forget(['auth_user_id', 'mfa_user_id', 'mfa_otp_hash', 'mfa_otp_expiry', 'mfa_attempts']);
        $request->session()->regenerate();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private function clearMfaSession(Request $request): void
    {
        $request->session()->forget(['mfa_user_id', 'mfa_otp_hash', 'mfa_otp_expiry', 'mfa_attempts']);
    }
}
