<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\ReturnModel;
use App\Models\Review;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    protected function tryHeaderAuth(Request $request): bool
    {
        if (Auth::check()) {
            return true;
        }

        $token = $request->header('X-Session-Token');
        if (!$token) {
            return false;
        }

        $session = DB::table('sessions')->where('id', $token)->first();
        if ($session && $session->user_id) {
            $user = User::find($session->user_id);
            if ($user) {
                Auth::login($user);
                return true;
            }
        }

        return false;
    }

    protected function requireAdmin(Request $request): ?User
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return null;
        }
        return $user;
    }

    protected function resolveCategoryId(Request $request): int
    {
        $categoryId = (int) $request->input('category_id', 0);
        if ($categoryId > 0 && Category::where('id', $categoryId)->exists()) {
            return $categoryId;
        }

        $newCategoryName = trim((string) $request->input('new_category_name', ''));
        if ($newCategoryName !== '') {
            $slug = Str::slug($newCategoryName);
            $existing = Category::where('slug', $slug)->orWhere('name', $newCategoryName)->first();
            if ($existing) {
                return (int) $existing->id;
            }

            return (int) Category::create([
                'name' => Str::title($newCategoryName),
                'slug' => $slug ?: 'category-' . strtolower(Str::random(6)),
            ])->id;
        }

        $fallback = Category::orderBy('id')->first();
        if ($fallback) {
            return (int) $fallback->id;
        }

        return (int) Category::create([
            'name' => 'General',
            'slug' => 'general',
        ])->id;
    }

    protected function ensurePrimaryImage(Product $product, ?string $imageUrl): void
    {
        $imageUrl = trim((string) $imageUrl);
        if ($imageUrl === '') {
            return;
        }

        $product->image_url = $imageUrl;
        $product->save();

        $primary = $product->images()->where('is_primary', true)->first();
        if ($primary) {
            $primary->update(['image_path' => $imageUrl]);
            return;
        }

        ProductImage::create([
            'product_id' => $product->id,
            'image_path' => $imageUrl,
            'is_primary' => true,
        ]);
    }



    protected function storeUploadedImage(Request $request): ?string
    {
        if (!$request->hasFile('image_file')) {
            return null;
        }

        $file = $request->file('image_file');
        if (!$file || !$file->isValid()) {
            return null;
        }

        $destination = dirname(base_path()) . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'products';
        if (!is_dir($destination)) {
            @mkdir($destination, 0755, true);
        }

        $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        if ($safeName === '') {
            $safeName = 'product-image';
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = $safeName . '-' . strtolower(Str::random(8)) . '.' . $extension;
        $file->move($destination, $filename);

        return 'images/products/' . $filename;
    }

    protected function transformProduct(Product $product): array
    {
        $variant = $product->variants->first();
        $stock = $variant && $variant->stock ? (int) $variant->stock->quantity : (int) ($variant->stock_qty ?? 0);
        $threshold = $variant && $variant->stock ? (int) $variant->stock->low_stock_threshold : (int) ($variant->low_stock_threshold ?? 5);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'brand' => $product->brand,
            'image_url' => $product->image_url,
            'active' => (bool) $product->active,
            'is_sold' => (bool) ($product->is_sold ?? false),
            'created_at' => $product->created_at,
            'updated_at' => $product->updated_at,
            'category_id' => $product->category_id,
            'category_name' => optional($product->category)->name,
            'variant_id' => $variant?->id,
            'sku' => $variant?->sku,
            'variant_label' => $variant?->variant_label,
            'price' => $variant ? (float) $variant->price : 0.0,
            'stock' => $stock,
            'low_stock_threshold' => $threshold,
            'stock_state' => $stock <= 0 ? 'out' : ($stock <= $threshold ? 'low' : 'ok'),
            'has_order_history' => $variant ? $variant->orderItems()->exists() : false,
        ];
    }

    public function summary(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $recentOrders = Order::with(['user', 'items.variant.product'])
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $lowStock = Stock::query()
            ->with(['variant.product'])
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->orderBy('quantity')
            ->limit(10)
            ->get();

        $recentUsers = User::orderByDesc('id')->limit(8)->get();

        return response()->json([
            'stats' => [
                'users' => User::count(),
                'customers' => User::where('role', 'customer')->count(),
                'admins' => User::where('role', 'admin')->count(),
                'products' => Product::count(),
                'orders' => Order::count(),
                'pending_orders' => Order::where('status', 'pending')->count(),
                'shipped_orders' => Order::where('status', 'shipped')->count(),
                'low_stock_items' => Stock::whereColumn('quantity', '<=', 'low_stock_threshold')->count(),
                'pending_returns' => ReturnModel::where('status', 'requested')->count(),
                'processed_returns' => ReturnModel::whereIn('status', ['approved', 'refunded'])->count(),
            ],
            'recent_orders' => $recentOrders,
            'low_stock' => $lowStock,
            'recent_users' => $recentUsers,
        ]);
    }

    public function users(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'users' => User::orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function orders(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'orders' => Order::with(['user', 'items.variant.product', 'items.returns', 'address'])
                ->orderByDesc('id')
                ->limit(100)
                ->get(),
        ]);
    }

    public function returns(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'returns' => ReturnModel::with(['orderItem.order.user', 'orderItem.variant.product'])
                ->orderByDesc('id')
                ->limit(200)
                ->get(),
        ]);
    }

    public function updateReturn(Request $request, int $id)
    {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:requested,approved,rejected,refunded',
        ]);

        $return = ReturnModel::with(['orderItem.order', 'orderItem.variant.stock'])->findOrFail($id);
        $oldStatus = (string) $return->status;
        $newStatus = (string) $validated['status'];

        DB::transaction(function () use ($return, $oldStatus, $newStatus, $admin) {
            $return->status = $newStatus;
            $return->save();

            $eligibleForRestock = in_array($newStatus, ['approved', 'refunded'], true)
                && !in_array($oldStatus, ['approved', 'refunded'], true);

            if ($eligibleForRestock) {
                $item = $return->orderItem;
                $variant = $item?->variant;
                $stock = $variant?->stock;

                if ($item && $variant) {
                    $qty = (int) $item->quantity;
                    $variant->stock_qty = (int) $variant->stock_qty + $qty;
                    $variant->save();

                    if ($stock) {
                        $stock->quantity = (int) $stock->quantity + $qty;
                        $stock->save();
                    } else {
                        Stock::create([
                            'product_variant_id' => $variant->id,
                            'quantity' => $qty,
                            'low_stock_threshold' => (int) ($variant->low_stock_threshold ?? 5),
                        ]);
                    }

                    StockMovement::create([
                        'product_variant_id' => $variant->id,
                        'movement_type' => 'IN',
                        'quantity' => $qty,
                        'note' => 'Return #' . $return->id . ' processed by admin',
                        'created_by' => $admin->id,
                    ]);
                }
            }

            $order = $return->orderItem?->order;
            if ($order) {
                $allItems = $order->items()->with('returns')->get();
                $allReturned = $allItems->count() > 0 && $allItems->every(function ($item) {
                    return $item->returns->contains(function ($ret) {
                        return in_array($ret->status, ['approved', 'refunded'], true);
                    });
                });

                if ($allReturned) {
                    $order->status = 'returned';
                    $order->save();
                }
            }
        });

        return response()->json([
            'message' => 'Return updated successfully',
            'return' => $return->fresh()->load(['orderItem.order.user', 'orderItem.variant.product']),
        ]);
    }



    public function reviews(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'reviews' => Review::with(['user', 'product'])
                ->orderByDesc('id')
                ->limit(250)
                ->get(),
        ]);
    }
    public function categories(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json([
            'categories' => Category::orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    public function products(Request $request)
    {
        if (!$this->requireAdmin($request)) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $search = trim((string) $request->query('q', ''));

        $query = Product::with(['category', 'variants.stock', 'images'])
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $products = $query->limit(250)->get()->map(fn (Product $product) => $this->transformProduct($product));

        return response()->json(['products' => $products]);
    }

    public function storeProduct(Request $request)
    {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:180',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:120',
            'image_url' => 'nullable|string|max:255',
            'image_file' => 'nullable|image|max:4096',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0|max:9999',
            'active' => 'nullable|boolean',
            'variant_label' => 'nullable|string|max:120',
            'sku' => 'nullable|string|max:80',
            'category_id' => 'nullable|integer',
            'new_category_name' => 'nullable|string|max:120',
        ]);

        $categoryId = $this->resolveCategoryId($request);
        $threshold = (int) ($validated['low_stock_threshold'] ?? 5);
        $stockQty = (int) $validated['stock'];
        $uploadedImagePath = $this->storeUploadedImage($request);

        $product = DB::transaction(function () use ($validated, $admin, $categoryId, $threshold, $stockQty, $uploadedImagePath) {
            $slug = Str::slug($validated['name']);
            if ($slug === '') {
                $slug = 'product-' . strtolower(Str::random(6));
            }
            if (Product::where('slug', $slug)->exists()) {
                $slug .= '-' . strtolower(Str::random(4));
            }

            $product = Product::create([
                'category_id' => $categoryId,
                'user_id' => $admin->id,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'brand' => $validated['brand'] ?? null,
                'image_url' => $uploadedImagePath ?: ($validated['image_url'] ?? null),
                'active' => array_key_exists('active', $validated) ? (bool) $validated['active'] : true,
                'is_sold' => false,
            ]);

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => trim((string) ($validated['sku'] ?? '')) ?: ('TV-' . strtoupper(Str::random(8))),
                'variant_label' => trim((string) ($validated['variant_label'] ?? 'Default')) ?: 'Default',
                'price' => (float) $validated['price'],
                'stock_qty' => $stockQty,
                'low_stock_threshold' => $threshold,
            ]);

            Stock::create([
                'product_variant_id' => $variant->id,
                'quantity' => $stockQty,
                'low_stock_threshold' => $threshold,
            ]);

            if ($stockQty > 0) {
                StockMovement::create([
                    'product_variant_id' => $variant->id,
                    'movement_type' => 'IN',
                    'quantity' => $stockQty,
                    'note' => 'Initial stock from admin product creation',
                    'created_by' => $admin->id,
                ]);
            }

            $this->ensurePrimaryImage($product, $uploadedImagePath ?: ($validated['image_url'] ?? null));

            return $product->load(['category', 'variants.stock', 'images']);
        });

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $this->transformProduct($product),
        ], 201);
    }

    public function updateProduct(Request $request, int $id)
    {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:180',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:120',
            'image_url' => 'nullable|string|max:255',
            'image_file' => 'nullable|image|max:4096',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0|max:9999',
            'active' => 'nullable|boolean',
            'variant_label' => 'nullable|string|max:120',
            'sku' => 'nullable|string|max:80',
            'category_id' => 'nullable|integer',
            'new_category_name' => 'nullable|string|max:120',
        ]);

        $categoryId = $this->resolveCategoryId($request);
        $threshold = (int) ($validated['low_stock_threshold'] ?? 5);
        $newStockQty = (int) $validated['stock'];
        $uploadedImagePath = $this->storeUploadedImage($request);

        $product = Product::with(['variants.stock', 'images', 'category'])->findOrFail($id);

        DB::transaction(function () use ($product, $validated, $categoryId, $threshold, $newStockQty, $admin, $uploadedImagePath) {
            $product->update([
                'category_id' => $categoryId,
                'name' => $validated['name'],
                'slug' => Product::where('id', '!=', $product->id)->where('slug', Str::slug($validated['name']))->exists()
                    ? Str::slug($validated['name']) . '-' . strtolower(Str::random(4))
                    : (Str::slug($validated['name']) ?: 'product-' . strtolower(Str::random(6))),
                'description' => $validated['description'] ?? null,
                'brand' => $validated['brand'] ?? null,
                'image_url' => $uploadedImagePath ?: ($validated['image_url'] ?? null),
                'active' => array_key_exists('active', $validated) ? (bool) $validated['active'] : true,
            ]);

            $variant = $product->variants()->with('stock')->orderBy('id')->first();
            if (!$variant) {
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'sku' => trim((string) ($validated['sku'] ?? '')) ?: ('TV-' . strtoupper(Str::random(8))),
                    'variant_label' => trim((string) ($validated['variant_label'] ?? 'Default')) ?: 'Default',
                    'price' => (float) $validated['price'],
                    'stock_qty' => $newStockQty,
                    'low_stock_threshold' => $threshold,
                ]);
            }

            $oldStockQty = $variant->stock ? (int) $variant->stock->quantity : (int) $variant->stock_qty;

            $variant->update([
                'sku' => trim((string) ($validated['sku'] ?? $variant->sku)) ?: $variant->sku,
                'variant_label' => trim((string) ($validated['variant_label'] ?? $variant->variant_label)) ?: 'Default',
                'price' => (float) $validated['price'],
                'stock_qty' => $newStockQty,
                'low_stock_threshold' => $threshold,
            ]);

            $stockRecord = $variant->stock ?: Stock::create([
                'product_variant_id' => $variant->id,
                'quantity' => 0,
                'low_stock_threshold' => $threshold,
            ]);

            $stockRecord->update([
                'quantity' => $newStockQty,
                'low_stock_threshold' => $threshold,
            ]);

            $delta = $newStockQty - $oldStockQty;
            if ($delta !== 0) {
                StockMovement::create([
                    'product_variant_id' => $variant->id,
                    'movement_type' => 'ADJUST',
                    'quantity' => $delta,
                    'note' => 'Admin product edit adjusted stock',
                    'created_by' => $admin->id,
                ]);
            }

            $this->ensurePrimaryImage($product, $uploadedImagePath ?: ($validated['image_url'] ?? null));
        });

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $this->transformProduct($product->fresh()->load(['category', 'variants.stock', 'images'])),
        ]);
    }

    public function adjustStock(Request $request, int $id)
    {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $validated = $request->validate([
            'delta' => 'required|integer|not_in:0',
            'note' => 'nullable|string|max:255',
        ]);

        $product = Product::with(['variants.stock', 'category', 'images'])->findOrFail($id);
        $variant = $product->variants()->with('stock')->orderBy('id')->first();
        if (!$variant) {
            return response()->json(['error' => 'This product has no variant to adjust'], 422);
        }

        $stockRecord = $variant->stock ?: Stock::create([
            'product_variant_id' => $variant->id,
            'quantity' => 0,
            'low_stock_threshold' => $variant->low_stock_threshold ?? 5,
        ]);

        $currentQty = (int) $stockRecord->quantity;
        $delta = (int) $validated['delta'];
        $newQty = max(0, $currentQty + $delta);
        $actualDelta = $newQty - $currentQty;

        $variant->update(['stock_qty' => $newQty]);
        $stockRecord->update(['quantity' => $newQty]);

        if ($actualDelta !== 0) {
            StockMovement::create([
                'product_variant_id' => $variant->id,
                'movement_type' => $actualDelta > 0 ? 'IN' : 'OUT',
                'quantity' => $actualDelta,
                'note' => trim((string) ($validated['note'] ?? 'Admin stock adjustment')) ?: 'Admin stock adjustment',
                'created_by' => $admin->id,
            ]);
        }

        return response()->json([
            'message' => 'Stock adjusted successfully',
            'product' => $this->transformProduct($product->fresh()->load(['category', 'variants.stock', 'images'])),
        ]);
    }

    public function toggleProductActive(Request $request, int $id)
    {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $product = Product::with(['category', 'variants.stock', 'images'])->findOrFail($id);
        $product->active = !$product->active;
        $product->save();

        return response()->json([
            'message' => $product->active ? 'Product activated' : 'Product deactivated',
            'product' => $this->transformProduct($product->fresh()->load(['category', 'variants.stock', 'images'])),
        ]);
    }

    public function destroyProduct(Request $request, int $id)
    {
        $admin = $this->requireAdmin($request);
        if (!$admin) {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $product = Product::with(['variants.orderItems', 'images'])->findOrFail($id);

        $hasOrderHistory = $product->variants->contains(function ($variant) {
            return $variant->orderItems()->exists();
        });

        if ($hasOrderHistory) {
            return response()->json([
                'error' => 'This product has order history, so delete is blocked. Deactivate it instead.'
            ], 409);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}
