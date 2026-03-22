<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductImageApiController extends Controller
{
    protected function sendJson($data, int $status = 200)
    {
        return response()->json($data, $status);
    }

    public function store(Request $request, $id)
    {
        $product = Product::find($id);
        if (!$product) {
            return $this->sendJson(['error' => 'Product not found'], 404);
        }

        $stored = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $file) {
                if (!$file->isValid()) {
                    continue;
                }

                $path = $file->store('products/' . $product->id, 'public');
                $url = url('/storage/' . $path);

                $stored[] = ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => $url,
                    'is_primary' => $index === 0 && !$product->images()->where('is_primary', true)->exists(),
                ]);
            }
        }

        $images = $request->input('images');
        if (is_array($images)) {
            foreach ($images as $index => $item) {
                if (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
                    $stored[] = ProductImage::create([
                        'product_id' => $product->id,
                        'image_path' => $item,
                        'is_primary' => $index === 0 && !$product->images()->where('is_primary', true)->exists(),
                    ]);
                    continue;
                }

                if (is_string($item) && preg_match('#^data:(image/[^;]+);base64,(.+)$#', $item, $m)) {
                    $mime = $m[1];
                    $ext = explode('/', $mime)[1] ?? 'png';
                    $fileName = 'img_' . uniqid() . '.' . $ext;
                    $path = 'products/' . $product->id . '/' . $fileName;
                    Storage::disk('public')->put($path, base64_decode($m[2]));
                    $url = url('/storage/' . $path);

                    $stored[] = ProductImage::create([
                        'product_id' => $product->id,
                        'image_path' => $url,
                        'is_primary' => $index === 0 && !$product->images()->where('is_primary', true)->exists(),
                    ]);
                }
            }
        }

        $primary = $product->images()->where('is_primary', true)->first() ?: ($stored[0] ?? null);
        if ($primary) {
            $product->update(['image_url' => $primary->image_path]);
        }

        return $this->sendJson(['images' => $stored]);
    }
}
