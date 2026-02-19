<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConsentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consent_type' => ['required', 'string', 'in:all,essential,preferences'],
        ]);

        DB::table('gdpr_consent_log')->insert([
            'user_id'      => $request->session()->get('auth_user_id'),
            'consent_type' => $validated['consent_type'],
            'ip_hash'      => hash('sha256', $request->ip()),
            'user_agent'   => substr($request->userAgent() ?? '', 0, 255),
            'created_at'   => now(),
        ]);

        return response()->json(['message' => 'Consent recorded.']);
    }
}
