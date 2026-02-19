<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductImage;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ProductImage::query();

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate(50)
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //handled by ProductImageApiController
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return response()->json(ProductImage::findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
         $image = ProductImage::findOrFail($id);

        $validated = $request->validate([
            'image_path' => 'required|string'
        ]);

        $image->update($validated);

        return response()->json(['message' => 'Product image updated', 'image' => $image]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
         $image = ProductImage::findOrFail($id);

    
if ($image->image_path && str_contains($image->image_path, '/storage/')) {
  $path = str_replace(url('/storage/'), '', $image->image_path);
  Storage::disk('public')->delete($path);
        }

        $image->delete();

return response()->json([
         'message' => 'Image deleted'
        ]);
    }

    }

