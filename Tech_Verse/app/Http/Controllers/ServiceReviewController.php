<?php

namespace App\Http\Controllers;

use App\Models\ServiceReview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ServiceReviewController extends Controller
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
            \Log::warning('ServiceReview header auth failed: ' . $e->getMessage());
        }

        return false;
    }

    public function myReview(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }
        return response()->json(['review' => ServiceReview::where('user_id', $user->id)->first()]);
    }

    public function store(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }
        if ($user->role === 'admin') {
            return response()->json(['error' => 'Admin accounts cannot leave service reviews.'], 403);
        }

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review = ServiceReview::updateOrCreate(
            ['user_id' => $user->id],
            [
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Service review saved successfully',
            'review' => $review->load('user'),
        ], $review->wasRecentlyCreated ? 201 : 200);
    }

    public function adminIndex(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }
        return response()->json([
            'reviews' => ServiceReview::with('user')->orderByDesc('id')->limit(250)->get(),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        $review = ServiceReview::findOrFail($id);
        $isOwner = $user && (int) $review->user_id === (int) $user->id;
        $isAdmin = $user && $user->role === 'admin';
        if (!$isOwner && !$isAdmin) {
            return response()->json(['error' => 'You can only delete your own service review'], 403);
        }
        $review->delete();
        return response()->json(['message' => 'Service review deleted successfully']);
    }
}
