<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductApiController extends Controller
{
    protected function sendJson($data, int $status = 200)
    {
        return response()->json($data, $status);
    }

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
            $sessionData = DB::table('sessions')->where('id', $token)->first();
            if (!$sessionData || !$sessionData->user_id) {
                return false;
            }

            $user = User::find($sessionData->user_id);
            if (!$user) {
                return false;
            }

            Auth::login($user);
            return true;
        } catch (\Throwable $e) {
            \Log::warning('Header auth failed: ' . $e->getMessage());
            return false;
        }
    }

    protected function resolveCategory(?string $categoryInput): Category
    {
        if ($categoryInput) {
            $category = Category::query()
                ->where('slug', $categoryInput)
                ->orWhere('name', $categoryInput)
                ->first();

            if ($category) {
                return $category;
            }

            return Category::create([
                'name' => Str::title($categoryInput),
                'slug' => Str::slug($categoryInput),
            ]);
        }

        return Category::first() ?: Category::create([
            'name' => 'Uncategorised',
            'slug' => 'uncategorised',
        ]);
    }

    protected function storeImageForProduct(Product $product, $item, bool $isPrimary = false): ?string
    {
        if (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
            ProductImage::create([
                'product_id' => $product->id,
                'image_path' => $item,
                'is_primary' => $isPrimary,
            ]);
            return $item;
        }

        if (is_string($item) && preg_match('#^data:(image/[^;]+);base64,(.+)$#', $item, $m)) {
            $mime = $m[1];
            $b64 = $m[2];
            $ext = explode('/', $mime)[1] ?? 'png';
            $fileName = 'img_' . uniqid() . '.' . $ext;
            $path = 'products/' . $product->id . '/' . $fileName;
            Storage::disk('public')->put($path, base64_decode($b64));
            $url = url('/storage/' . $path);

            ProductImage::create([
                'product_id' => $product->id,
                'image_path' => $url,
                'is_primary' => $isPrimary,
            ]);

            return $url;
        }

        return null;
    }

    public function index(Request $request)
    {
        $perPage = max((int) $request->query('per_page', 20), 1);

        $products = Product::with([
                'category',
                'images',
                'variants.stock',
            ])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->where('active', true)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->sendJson($products);
    }

    public function myProducts(Request $request)
    {
        $this->tryHeaderAuth($request);

        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $perPage = max((int) $request->query('per_page', 50), 1);

        $products = Product::with([
                'category',
                'images',
                'variants.stock',
            ])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->sendJson($products);
    }

    public function store(Request $request)
    {
        $this->tryHeaderAuth($request);

        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required. Please log in first.'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:180',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:120',
            'brand' => 'nullable|string|max:120',
            'price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'image_url' => 'nullable|string|max:255',
            'images' => 'nullable',
        ]);

        $category = $this->resolveCategory($validated['category'] ?? null);
        $slug = Str::slug($validated['name']);
        if (Product::where('slug', $slug)->exists()) {
            $slug .= '-' . substr(uniqid(), -6);
        }

        $price = (float) ($validated['price'] ?? 0);
        $stockQty = (int) ($validated['stock'] ?? 0);

        $product = DB::transaction(function () use ($validated, $category, $slug, $price, $stockQty, $request) {
            $product = Product::create([
                'category_id' => $category->id,
                'user_id' => Auth::id(),
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'brand' => $validated['brand'] ?? null,
                'image_url' => $validated['image_url'] ?? null,
                'active' => true,
                'is_sold' => false,
            ]);

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => 'TV-' . strtoupper(substr(uniqid(), -8)),
                'variant_label' => 'Default',
                'price' => $price,
                'stock_qty' => $stockQty,
                'low_stock_threshold' => 5,
            ]);

            Stock::create([
                'product_variant_id' => $variant->id,
                'quantity' => $stockQty,
                'low_stock_threshold' => 5,
            ]);

            $primaryImage = null;

            if (!empty($validated['image_url'])) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => $validated['image_url'],
                    'is_primary' => true,
                ]);
                $primaryImage = $validated['image_url'];
            }

            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $index => $file) {
                    if (!$file->isValid()) {
                        continue;
                    }

                    $storedPath = $file->store('products/' . $product->id, 'public');
                    $url = url('/storage/' . $storedPath);

                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_path' => $url,
                        'is_primary' => $primaryImage === null && $index === 0,
                    ]);

                    if ($primaryImage === null) {
                        $primaryImage = $url;
                    }
                }
            }

            $images = $request->input('images');
            if (is_array($images)) {
                foreach ($images as $index => $item) {
                    $stored = $this->storeImageForProduct($product, $item, $primaryImage === null && $index === 0);
                    if ($primaryImage === null && $stored) {
                        $primaryImage = $stored;
                    }
                }
            }

            if ($primaryImage !== null) {
                $product->update(['image_url' => $primaryImage]);
            }

            return $product;
        });

        return $this->sendJson([
            'product' => $product->load(['category', 'images', 'variants.stock'])
        ], 201);
    }

    public function show($id)
    {
        $product = Product::with([
            'category',
            'images',
            'attributes',
            'reviews.user',
            'variants.stock',
            'user',
        ])->findOrFail($id);

        return $this->sendJson($product);
    }

    public function update(Request $request, $id)
    {
        $this->tryHeaderAuth($request);

        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $product = Product::with(['variants.stock', 'images'])->findOrFail($id);

        $user = Auth::user();
        $isOwner = (int) $product->user_id === (int) Auth::id();
        $isAdmin = $user && $user->role === 'admin';

        if (!$isOwner && !$isAdmin) {
            return $this->sendJson(['error' => 'You can only manage your own listings'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:180',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:120',
            'brand' => 'nullable|string|max:120',
            'price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'image_url' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'is_sold' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($validated, $product) {
            $updateData = [];

            if (array_key_exists('name', $validated)) {
                $updateData['name'] = $validated['name'];
                $newSlug = Str::slug($validated['name']);
                if (Product::where('slug', $newSlug)->where('id', '!=', $product->id)->exists()) {
                    $newSlug .= '-' . substr(uniqid(), -6);
                }
                $updateData['slug'] = $newSlug;
            }

            if (array_key_exists('description', $validated)) {
                $updateData['description'] = $validated['description'];
            }

            if (array_key_exists('brand', $validated)) {
                $updateData['brand'] = $validated['brand'];
            }

            if (array_key_exists('image_url', $validated)) {
                $updateData['image_url'] = $validated['image_url'];
            }

            if (array_key_exists('is_active', $validated)) {
                $updateData['active'] = (bool) $validated['is_active'];
            }

            if (array_key_exists('is_sold', $validated)) {
                $updateData['is_sold'] = (bool) $validated['is_sold'];
            }

            if (array_key_exists('category', $validated)) {
                $category = $this->resolveCategory($validated['category']);
                $updateData['category_id'] = $category->id;
            }

            if (!empty($updateData)) {
                $product->update($updateData);
            }

            $variant = $product->variants()->with('stock')->orderBy('id')->first();
            if ($variant) {
                $variantUpdate = [];

                if (array_key_exists('price', $validated)) {
                    $variantUpdate['price'] = (float) $validated['price'];
                }

                if (array_key_exists('stock', $validated)) {
                    $variantUpdate['stock_qty'] = (int) $validated['stock'];
                }

                if (!empty($variantUpdate)) {
                    $variant->update($variantUpdate);
                }

                if (array_key_exists('stock', $validated)) {
                    $stockRecord = $variant->stock ?: Stock::create([
                        'product_variant_id' => $variant->id,
                        'quantity' => 0,
                        'low_stock_threshold' => $variant->low_stock_threshold ?? 5,
                    ]);

                    $stockRecord->update([
                        'quantity' => (int) $validated['stock'],
                    ]);
                }
            }

            if (array_key_exists('image_url', $validated) && !empty($validated['image_url'])) {
                $primary = $product->images()->where('is_primary', true)->first();
                if ($primary) {
                    $primary->update(['image_path' => $validated['image_url']]);
                } else {
                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_path' => $validated['image_url'],
                        'is_primary' => true,
                    ]);
                }
            }
        });

        return $this->sendJson([
            'product' => $product->fresh()->load(['category', 'images', 'variants.stock'])
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $this->tryHeaderAuth($request);

        if (!Auth::check()) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $product = Product::with('images')->findOrFail($id);

        $user = Auth::user();
        $isOwner = (int) $product->user_id === (int) Auth::id();
        $isAdmin = $user && $user->role === 'admin';

        if (!$isOwner && !$isAdmin) {
            return $this->sendJson(['error' => 'You can only manage your own listings'], 403);
        }

        foreach ($product->images as $image) {
            $prefix = url('/storage/') . '/';
            if (str_starts_with($image->image_path, $prefix)) {
                $storedPath = substr($image->image_path, strlen($prefix));
                Storage::disk('public')->delete($storedPath);
            }
        }

        $product->delete();

        return $this->sendJson(['message' => 'Product deleted successfully']);
    }
}
