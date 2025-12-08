<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Product;
use App\Models\ProductImage;

class ProductImageApiController extends Controller
{
    protected function sendJson($data, $status = 200)
    {
        return response()->json($data, $status)->withHeaders([
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, X-Requested-With, Authorization'
        ]);
    }
    /**
     * Store images for an existing product
     */
    public function store(Request $request, $id)
    {

$request->validate([
    'images.*' => 'image|max:5120' // max 5MB per image
]);


        $product = Product::find($id);
        if (!$product) return $this->sendJson(['error' => 'product not found'], 404);

        // check authentication
        if (!auth()->check()) {
    return $this->sendJson(['error' => 'Authentication required'], 401);
}

$user = auth()->user();

if ($user->role !== 'admin' && $product->user_id !== $user->id) {
    return $this->sendJson(['error' => 'Unauthorized'], 403);
}



        $stored = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if (!$file->isValid()) continue;
                $path = $file->storePubliclyAs('products/' . $product->id, $file->getClientOriginalName(), 'public');
                $url = Storage::disk('public')->url($path);
                $pi = ProductImage::create(['product_id' => $product->id, 'image_path' => $url]);
                $stored[] = $pi;
            }
        }


        // also accept JSON array 'images' containing data URLs or remote URLs
        $images = $request->input('images');
        if ($images && is_array($images)) {
            foreach ($images as $idx => $item) {
                if (is_string($item) && preg_match('#^data:(image/[^;]+);base64,(.+)$#', $item, $m)) {
                    $mime = $m[1]; $b64 = $m[2];
                    $ext = explode('/', $mime)[1] ?? 'png';
                    $fname = 'img_' . ($idx+1) . '_' . time() . '.' . $ext;
                    $bin = base64_decode($b64);
                    $path = 'products/' . $product->id . '/' . $fname;
                    Storage::disk('public')->put($path, $bin);
                    $url = Storage::disk('public')->url($path);
                    $pi = ProductImage::create(['product_id' => $product->id, 'image_path' => $url]);
                    $stored[] = $pi;
                } elseif (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
                    $pi = ProductImage::create(['product_id' => $product->id, 'image_path' => $item]);
                    $stored[] = $pi;
                }
            }
        }

        // if any images stored, set product.image_url to first one
        if (!empty($stored) && $product) {
            $product->image_url = $stored[0]->image_path;
            $product->save();
        }

        return $this->sendJson(['images' => $stored]);
    }

}


