<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index($id)
    {
        $reviews = Review::where('product_id', $id)
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return response()->json($reviews);
    }

    public function store(Request $request, $id)
    {
        $userId = $request->session()->get('auth_user_id');

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        // One review per user per product
        $existing = Review::where('user_id', $userId)
            ->where('product_id', $id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You have already reviewed this product.'], 409);
        }

        $review = Review::create([
            'user_id'    => $userId,
            'product_id' => $id,
            'rating'     => $validated['rating'],
            'comment'    => $validated['comment'] ?? null,
        ]);

        return response()->json(['message' => 'Review created', 'review' => $review->load('user:id,name')], 201);
    }

    public function update(Request $request, $id)
    {
        $userId = $request->session()->get('auth_user_id');
        $review = Review::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $validated = $request->validate([
            'rating'  => 'sometimes|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review->update($validated);

        return response()->json(['message' => 'Review updated', 'review' => $review]);
    }

    public function destroy($id)
    {
        Review::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
