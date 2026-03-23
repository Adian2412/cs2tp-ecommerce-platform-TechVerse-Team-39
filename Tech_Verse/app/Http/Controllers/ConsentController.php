<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ConsentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // 'custom' added — sent by cookie-consent.js granular preferences modal
            'consent_type' => ['required', 'string', 'in:all,essential,preferences,custom'],
            'detail'        => ['nullable', 'array'],   // per-category breakdown from preferences modal
        ]);

        $userId = null;
        if (Auth::check()) {
            $userId = Auth::id();
        } elseif ($request->session()->has('auth_user_id')) {
            $userId = $request->session()->get('auth_user_id');
        }

        DB::table('gdpr_consent_log')->insert([
            'user_id'      => $userId,
            'consent_type' => $validated['consent_type'],
            'ip_hash'      => hash('sha256', $request->ip()),
            'user_agent'   => substr($request->userAgent() ?? '', 0, 255),
            'created_at'   => now(),
        ]);

        return response()->json(['message' => 'Consent recorded.']);
    }
}
