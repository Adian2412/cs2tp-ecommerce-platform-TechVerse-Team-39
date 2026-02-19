<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index($productId)
    {
        return response()->json(Review::where('product_id', $productId)->paginate(20));
    }

    public function store(Request $request)
    {
  
        return response()->json(['message' => 'review created'], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'review updated']);
    }

    public function destroy($id)
    {
        return response()->json(null, 204);
    }
}
