<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ContactMessageController extends Controller
{
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
            \Log::warning('Contact message auth failed: ' . $e->getMessage());
        }

        return false;
    }

    protected function requireAdmin(Request $request): ?User
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return null;
        }
        return $user;
    }

    public function index(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'messages' => ContactMessage::query()
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'subject' => 'required|string|max:180',
            'message' => 'required|string|max:5000',
        ]);

        $msg = ContactMessage::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Message submitted successfully',
            'data' => $msg,
        ], 201);
    }

    public function show(Request $request, string $id)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'message' => ContactMessage::findOrFail($id),
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        ContactMessage::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Contact message deleted successfully',
        ]);
    }
}
