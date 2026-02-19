<?php

namespace App\Http\Controllers;

use App\Models\GdprDeletionRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GdprController extends Controller
{
    public function export(Request $request): JsonResponse
    {
        $userId = $request->session()->get('auth_user_id');
        $user   = User::findOrFail($userId);

        return response()->json([
            'data_export' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'created_at' => $user->created_at,
            ],
            'exported_at' => now()->toIso8601String(),
        ]);
    }

    public function requestDeletion(Request $request): JsonResponse
    {
        $userId = $request->session()->get('auth_user_id');

        $existing = GdprDeletionRequest::where('user_id', $userId)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'A deletion request is already pending.'], 409);
        }

        GdprDeletionRequest::create([
            'user_id'    => $userId,
            'status'     => 'pending',
            'ip_hash'    => hash('sha256', $request->ip()),
            'requested_at' => now(),
        ]);

        return response()->json([
            'message' => 'Your deletion request has been received and will be processed within 30 days.',
        ]);
    }
}
