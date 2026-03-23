<?php

namespace App\Http\Controllers;

use App\Models\GdprDeletionRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GdprController extends Controller
{
    /**
     * Resolve authenticated user from Auth facade OR session key.
     * Supports both Api\AuthController (Auth::login) and
     * App\AuthController (session auth_user_id) flows.
     */
    protected function resolveUser(Request $request): ?User
    {
        // Try Auth facade first (Api\AuthController flow)
        if (Auth::check()) {
            return Auth::user();
        }

        // Try header-based session token (X-Session-Token)
        $token = $request->header('X-Session-Token');
        if ($token) {
            $session = DB::table('sessions')->where('id', $token)->first();
            if ($session && $session->user_id) {
                $user = User::find($session->user_id);
                if ($user) {
                    Auth::login($user);
                    return $user;
                }
            }
        }

        // Try session auth_user_id (App\AuthController OTP flow)
        $userId = $request->session()->get('auth_user_id');
        if ($userId) {
            return User::find($userId);
        }

        return null;
    }

    public function export(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (! $user) {
            return response()->json(['error' => 'Authentication required.'], 401);
        }

        return response()->json([
            'data_export' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->role,
                'created_at' => $user->created_at,
            ],
            'exported_at' => now()->toIso8601String(),
        ]);
    }

    public function requestDeletion(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (! $user) {
            return response()->json(['error' => 'Authentication required.'], 401);
        }

        $existing = GdprDeletionRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'A deletion request is already pending.'], 409);
        }

        GdprDeletionRequest::create([
            'user_id'      => $user->id,
            'status'       => 'pending',
            'ip_hash'      => hash('sha256', $request->ip()),
            'requested_at' => now(),
        ]);

        return response()->json([
            'message' => 'Your deletion request has been received and will be processed within 30 days.',
        ]);
    }
}
