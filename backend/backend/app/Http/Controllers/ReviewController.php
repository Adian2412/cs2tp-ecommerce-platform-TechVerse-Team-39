<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function index(Request $request, $productId = null)
    {
        // If productId is provided (from /products/{id}/reviews route), get reviews for that product
        if ($productId) {
            $reviews = Review::with('user')
                ->where('product_id', $productId)
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        } else {
            // Get all reviews (for admin or general listing from /api/reviews)
            $reviews = Review::with(['user', 'product'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        }
        
        return response()->json($reviews);
    }
    
    /**
     * Show a single review
     */
    public function show($id)
    {
        $review = Review::with(['user', 'product'])->findOrFail($id);
        return response()->json($review);
    }

    public function store(Request $request)
    {
        // Validate request
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Check if user is authenticated
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        // Check if user already reviewed this product
        $existingReview = Review::where('user_id', $userId)
            ->where('product_id', $validated['product_id'])
            ->first();

        if ($existingReview) {
            // Update existing review instead of creating duplicate
            $existingReview->update([
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
            ]);
            
            return response()->json([
                'message' => 'Review updated successfully',
                'review' => $existingReview->load('user')
            ], 200);
        }

        // Create new review
        $review = Review::create([
            'user_id' => $userId,
            'product_id' => $validated['product_id'],
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Review created successfully',
            'review' => $review->load('user')
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $review = Review::findOrFail($id);
        
        // Check ownership
        $userId = Auth::id();
        if (!$userId || $review->user_id !== $userId) {
            return response()->json(['error' => 'You can only update your own reviews'], 403);
        }

        $validated = $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review->update($validated);
        
        return response()->json([
            'message' => 'Review updated successfully',
            'review' => $review->load('user')
        ]);
    }

    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        
        // Check ownership or admin
        $userId = Auth::id();
        $user = Auth::user();
        $isOwner = $review->user_id === $userId;
        $isAdmin = $user && $user->role === 'admin';
        
        if (!$isOwner && !$isAdmin) {
            return response()->json(['error' => 'You can only delete your own reviews'], 403);
        }

        $review->delete();
        
        return response()->json(['message' => 'Review deleted successfully'], 204);
    }
}
