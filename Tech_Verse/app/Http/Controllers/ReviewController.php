<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
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
            \Log::warning('Review header auth failed: ' . $e->getMessage());
        }

        return false;
    }

    protected function hasPurchasedProduct(int $userId, int $productId): bool
    {
        return OrderItem::query()
            ->whereHas('order', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->whereHas('variant', function ($query) use ($productId) {
                $query->where('product_id', $productId);
            })
            ->exists();
    }

    public function index(Request $request, $productId = null)
    {
        if ($productId) {
            $reviews = Review::with('user')
                ->where('product_id', $productId)
                ->orderByDesc('id')
                ->get();

            return response()->json(['reviews' => $reviews]);
        }

        $reviews = Review::with(['user', 'product'])
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json($reviews);
    }

    public function eligibility(Request $request, int $productId)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'can_review' => false,
                'is_signed_in' => false,
                'is_admin' => false,
                'reason' => 'Sign in with a customer account to leave a review.',
                'review' => null,
            ]);
        }

        if ($user->role === 'admin') {
            return response()->json([
                'can_review' => false,
                'is_signed_in' => true,
                'is_admin' => true,
                'reason' => 'Admin accounts cannot leave product reviews.',
                'review' => Review::where('user_id', $user->id)->where('product_id', $productId)->first(),
            ]);
        }

        $hasPurchased = $this->hasPurchasedProduct((int) $user->id, $productId);
        $existingReview = Review::where('user_id', $user->id)->where('product_id', $productId)->first();

        return response()->json([
            'can_review' => $hasPurchased,
            'is_signed_in' => true,
            'is_admin' => false,
            'reason' => $hasPurchased ? 'You can review this product.' : 'Only customers who purchased this product can leave a review.',
            'review' => $existingReview,
        ]);
    }

    public function show($id)
    {
        return response()->json(Review::with(['user', 'product'])->findOrFail($id));
    }

    public function store(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        if ($user->role === 'admin') {
            return response()->json(['error' => 'Admin accounts cannot leave product reviews.'], 403);
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $hasPurchased = $this->hasPurchasedProduct((int) $user->id, (int) $validated['product_id']);
        if (!$hasPurchased) {
            return response()->json([
                'error' => 'You can only review products you have purchased.'
            ], 403);
        }

        $review = Review::where('user_id', $user->id)
            ->where('product_id', $validated['product_id'])
            ->first();

        if ($review) {
            $review->update([
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
            ]);

            return response()->json([
                'message' => 'Review updated successfully',
                'review' => $review->fresh()->load('user'),
            ]);
        }

        $review = Review::create([
            'user_id' => $user->id,
            'product_id' => $validated['product_id'],
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Review created successfully',
            'review' => $review->load('user'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $this->tryHeaderAuth($request);
        $review = Review::findOrFail($id);
        $user = Auth::user();

        if (!$user || (int) $review->user_id !== (int) $user->id) {
            return response()->json(['error' => 'You can only update your own reviews'], 403);
        }

        $validated = $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review->update($validated);

        return response()->json([
            'message' => 'Review updated successfully',
            'review' => $review->fresh()->load('user'),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $this->tryHeaderAuth($request);
        $review = Review::findOrFail($id);
        $user = Auth::user();

        $isOwner = $user && (int) $review->user_id === (int) $user->id;
        $isAdmin = $user && $user->role === 'admin';

        if (!$isOwner && !$isAdmin) {
            return response()->json(['error' => 'You can only delete your own reviews'], 403);
        }

        $review->delete();

        return response()->json(['message' => 'Review deleted successfully']);
    }
}
