<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
{
    $query = Product::with(['category', 'variants'])
        ->where('active', true)
        ->orderBy('created_at', 'desc');

    if ($request->filled('search')) {
        $term = '%' . $request->input('search') . '%';
        $query->where(function ($q) use ($term) {
            $q->where('name', 'like', $term)
              ->orWhere('description', 'like', $term)
              ->orWhere('brand', 'like', $term);
        });
    }

    if ($request->filled('category')) {
        $query->whereHas('category', function ($q) use ($request) {
            $q->where('slug', $request->input('category'));
        });
    }

    return response()->json($query->paginate(20));
}

public function show(Request $request, int $id): JsonResponse
{
    $product = Product::with(['category', 'variants', 'reviews.user', 'attributes'])
        ->findOrFail($id);

    return response()->json($product);
}
}
