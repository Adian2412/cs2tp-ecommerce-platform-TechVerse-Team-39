<?php
// This file contains ONLY the new methods to add to ProductApiController.php
// Add these methods inside the class body of App\Http\Controllers\Api\ProductApiController

// ── Add to ProductApiController ───────────────────────────────────────────────
// These handle /api/products/{id}/like and /api/me/wishlist routes
// Copy these methods into the existing ProductApiController class

/*
    public function like(Request $request, $id)
    {
        $this->tryHeaderAuth($request);
        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        // Basic like toggle using session (no dedicated likes table yet)
        $key = 'likes_' . Auth::id();
        $liked = $request->session()->get($key, []);

        if (in_array((int)$id, $liked)) {
            $liked = array_filter($liked, fn($v) => $v !== (int)$id);
            $message = 'Removed from likes.';
            $liked_status = false;
        } else {
            $liked[] = (int)$id;
            $message = 'Added to likes.';
            $liked_status = true;
        }

        $request->session()->put($key, array_values($liked));

        return $this->sendJson(['message' => $message, 'liked' => $liked_status]);
    }

    public function wishlist(Request $request)
    {
        $this->tryHeaderAuth($request);
        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $key = 'wishlist_' . Auth::id();
        $ids = $request->session()->get($key, []);

        if (empty($ids)) {
            return $this->sendJson(['wishlist' => []]);
        }

        $products = Product::with(['category', 'images', 'variants.stock'])
            ->whereIn('id', $ids)
            ->get();

        return $this->sendJson(['wishlist' => $products]);
    }

    public function addToWishlist(Request $request)
    {
        $this->tryHeaderAuth($request);
        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $validated = $request->validate(['product_id' => 'required|integer|exists:products,id']);
        $key = 'wishlist_' . Auth::id();
        $list = $request->session()->get($key, []);
        if (!in_array((int)$validated['product_id'], $list)) {
            $list[] = (int)$validated['product_id'];
            $request->session()->put($key, $list);
        }

        return $this->sendJson(['message' => 'Added to wishlist.']);
    }

    public function removeFromWishlist(Request $request, $id)
    {
        $this->tryHeaderAuth($request);
        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $key = 'wishlist_' . Auth::id();
        $list = $request->session()->get($key, []);
        $list = array_filter($list, fn($v) => $v !== (int)$id);
        $request->session()->put($key, array_values($list));

        return $this->sendJson(['message' => 'Removed from wishlist.']);
    }
*/

// NOTE: Paste these methods into App\Http\Controllers\Api\ProductApiController
// at the end of the class, before the closing brace.
// Also add `use App\Models\Product;` at the top if not already present.
