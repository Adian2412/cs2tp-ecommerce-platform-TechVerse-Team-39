<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::with('variants')
            ->where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($products);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $product = Product::with('variants')->findOrFail($id);
        return response()->json($product);
    }
}
