<?php

namespace App\Http\Controllers;

use App\Mail\ContactMail;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactMessageController extends Controller
{
    protected function tryHeaderAuth(Request $request): bool
    {
        if (Auth::check()) return true;

        $token = $request->header('X-Session-Token');
        if (!$token) return false;

        try {
            $session = DB::table('sessions')->where('id', $token)->first();
            if ($session && $session->user_id) {
                $user = User::find($session->user_id);
                if ($user) { Auth::login($user); return true; }
            }
        } catch (\Throwable $e) {
            Log::warning('Contact message auth failed: ' . $e->getMessage());
        }

        return false;
    }

    protected function requireAdmin(Request $request): ?User
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') return null;
        return $user;
    }

    // ── Admin: list all messages ───────────────────────────────────────────────
    public function index(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'messages' => ContactMessage::query()->orderByDesc('id')->get(),
        ]);
    }

    // ── Public: submit contact form ────────────────────────────────────────────
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:120',
            'email'   => 'required|email|max:190',
            'subject' => 'required|string|max:180',
            'message' => 'required|string|max:5000',
        ]);

        // Save to database
        $msg = ContactMessage::create($validated);

        // Send email notification to support inbox
        try {
            Mail::to('support@techverse.com')
                ->send(new ContactMail($msg));
        } catch (\Throwable $e) {
            // Log the failure but don't fail the request —
            // message is already saved in the database
            Log::error('Contact form email failed: ' . $e->getMessage(), [
                'contact_message_id' => $msg->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Message submitted successfully. We will get back to you soon.',
            'data'    => $msg,
        ], 201);
    }

    // ── Admin: view single message ────────────────────────────────────────────
    public function show(Request $request, string $id)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json(['message' => ContactMessage::findOrFail($id)]);
    }

    // ── Admin: delete message ─────────────────────────────────────────────────
    public function destroy(Request $request, string $id)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        ContactMessage::findOrFail($id)->delete();

        return response()->json(['message' => 'Contact message deleted successfully']);
    }
}
