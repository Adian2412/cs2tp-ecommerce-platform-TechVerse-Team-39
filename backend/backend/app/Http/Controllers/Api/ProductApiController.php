<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\Category;
use App\Models\ProductImage;
use App\Models\Brand;
use App\Models\User;

class ProductApiController extends Controller
{
    /**
     * Helper to return JSON responses.
     * CORS headers are handled by CorsMiddleware, so we don't override them here.
     * This prevents conflicts with credentials: 'include' requests.
     */
    protected function sendJson($data, $status = 200)
    {
        return response()->json($data, $status);
    }
    
    /**
     * Try to authenticate from X-Session-Token header (for cross-origin development).
     * This allows the frontend to store the session ID and send it as a header
     * when cookies don't work (cross-origin HTTP requests).
     */
    protected function tryHeaderAuth(Request $request)
    {
        // Check if already authenticated via session cookie
        if (Auth::check()) {
            return true;
        }
        
        // Try X-Session-Token header
        $token = $request->header('X-Session-Token');
        if (!$token) {
            return false;
        }
        
        // Try to load the session from database
        try {
            $sessionData = DB::table('sessions')->where('id', $token)->first();
            if ($sessionData && $sessionData->user_id) {
                // Log the user in
                $user = User::find($sessionData->user_id);
                if ($user) {
                    Auth::login($user);
                    return true;
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Header auth failed: ' . $e->getMessage());
        }
        
        return false;
    }

    /**
     * List products (paginated) - shows all active products that are not sold
     * This endpoint is for browsing/shopping - everyone can see all available products
     */
    public function index(Request $request)
    {
        $per = (int) $request->query('per_page', 20);

        // Show active products that are not sold (public browsing)
        $products = Product::with(['images', 'user'])
            ->where('is_active', true)
            ->where('is_sold', false)
            ->paginate($per);

        return $this->sendJson($products);
    }

    /**
     * List only the current user's products (for seller dashboard)
     * This shows ALL products owned by the authenticated user, including sold ones
     */
    public function myProducts(Request $request)
    {
        // Try header-based auth if cookie auth didn't work
        $this->tryHeaderAuth($request);
        
        $userId = Auth::id();
        
        if (!$userId) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        $per = (int) $request->query('per_page', 50);

        // Show only products owned by the current user
        $products = Product::with(['images', 'user'])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate($per);

        return $this->sendJson($products);
    }

    /**
     * Store a new product. Accepts multipart/form-data (file uploads) or JSON.
     */
    public function store(Request $request)
    {
        // basic validation (keep permissive)
        $name = $request->input('name') ?? $request->input('title') ?? null;
        if (!$name) {
            return $this->sendJson(['error' => 'name required'], 422);
        }

        $categoryInput = $request->input('category');
        $category = null;
        if ($categoryInput) {
            $category = Category::where('slug', $categoryInput)->orWhere('name', $categoryInput)->first();
            if (!$category) {
                $category = Category::create([
                    'name' => Str::title($categoryInput),
                    'slug' => Str::slug($categoryInput),
                ]);
            }
        } else {
            // ensure at least one category exists (create 'Uncategorized' if needed)
            $category = Category::first();
            if (!$category) {
                $category = Category::create(['name' => 'Uncategorized', 'slug' => 'uncategorized']);
            }
        }

        $description = $request->input('description') ?? $request->input('desc') ?? '';
        $brandInput = $request->input('brand') ?? null;

        $slug = Str::slug($name);
        // avoid slug collision
        $exists = Product::where('slug', $slug)->exists();
        if ($exists) $slug = $slug . '-' . substr(uniqid(), -6);

        // Ensure we have a brand_id to satisfy DB schema (brands table exists)
        $brandId = null;
        if ($brandInput) {
            $b = Brand::where('name', $brandInput)->orWhere('slug', $brandInput)->first();
            if (!$b) {
                $b = Brand::create(['name' => Str::title($brandInput), 'description' => null]);
            }
            $brandId = $b->id;
        } else {
            // fallback to first brand or create a generic one
            $b = Brand::first();
            if (!$b) {
                $b = Brand::create(['name' => 'Generic', 'description' => 'Auto-created brand']);
            }
            $brandId = $b->id;
        }

        // Generate SKU and fill price/stock from request if present
        $sku = $request->input('sku') ?? strtoupper('SKU'.substr(uniqid(), -8));
        $price = null;
        if ($request->has('price')) {
            $price = $request->input('price');
        } elseif ($request->has('price_cents')) {
            $price = (float) $request->input('price_cents') / 100;
        }
        $stock = $request->input('quantity') ?? $request->input('stock') ?? 0;

        // Try header-based auth if cookie auth didn't work (for cross-origin development)
        $this->tryHeaderAuth($request);
        
        // Get authenticated user - all customers can sell
        $userId = Auth::id();
        
        if (!$userId) {
            return $this->sendJson(['error' => 'Authentication required. Please log in first.'], 401);
        }

        $product = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brandId,
            'user_id' => $userId,
            'sku' => $sku,
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
            'price' => $price ?? 0.0,
            'stock' => (int) $stock,
            'image_url' => null,
            'tracking_link' => null,
            'is_sold' => false,
            'is_active' => true,
        ]);
        

        // handle image uploads: either real files (multipart) or base64 data URLs in JSON
        $storedFirstUrl = null;

        // 1) real uploaded files
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if (!$file->isValid()) continue;
                $path = $file->storePubliclyAs('products/' . $product->id, $file->getClientOriginalName(), 'public');
                $url = url('/storage/' . $path); // Use url() helper for full URL
                ProductImage::create(['product_id' => $product->id, 'image_path' => $url]);
                if (!$storedFirstUrl) $storedFirstUrl = $url;
            }
        }

        // 2) JSON images as array of data-URLs or URLs
        $images = $request->input('images') ?? $request->input('image_urls') ?? null;
        if ($images && is_array($images)) {
            foreach ($images as $idx => $item) {
                // If item looks like a data URL (base64), decode and store
                if (is_string($item) && preg_match('#^data:(image/[^;]+);base64,(.+)$#', $item, $m)) {
                    $mime = $m[1]; $b64 = $m[2];
                    $ext = explode('/', $mime)[1] ?? 'png';
                    $fname = 'img_' . ($idx+1) . '_' . time() . '.' . $ext;
                    $bin = base64_decode($b64);
                    $path = 'products/' . $product->id . '/' . $fname;
                    Storage::disk('public')->put($path, $bin);
                    $url = url('/storage/' . $path); // Use url() helper for full URL
                    ProductImage::create(['product_id' => $product->id, 'image_path' => $url]);
                    if (!$storedFirstUrl) $storedFirstUrl = $url;
                } elseif (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
                    // external URL - store as-is in image_path
                    ProductImage::create(['product_id' => $product->id, 'image_path' => $item]);
                    if (!$storedFirstUrl) $storedFirstUrl = $item;
                }
            }
        }

        // if we stored an image, set product.image_url
        if ($storedFirstUrl) {
            $product->image_url = $storedFirstUrl;
            $product->save();
        }

        // Save session to ensure it persists
        session()->save();

        return $this->sendJson(['product' => $product->load('images')], 201);
    }

    /**
     * Show product with images and relations
     */
    public function show($id)
    {
        $product = Product::with(['images','attributes','reviews','user'])->findOrFail($id);
        return $this->sendJson($product);
    }

    /**
     * Update product (only by owner or admin)
     */
    public function update(Request $request, $id)
    {
        // Try header-based auth if cookie auth didn't work
        $this->tryHeaderAuth($request);
        
        $product = Product::findOrFail($id);

        // Check authentication
        $userId = Auth::id();
        if (!$userId) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        // Check ownership - only the owner or admin can update
        $user = Auth::user();
        $isOwner = $product->user_id === $userId;
        $isAdmin = $user && $user->role === 'admin';

        if (!$isOwner && !$isAdmin) {
            return $this->sendJson(['error' => 'You can only manage your own listings'], 403);
        }

        $validated = $request->validate([
            'tracking_link' => 'nullable|string',
            'is_sold' => 'boolean',
            'name' => 'string',
            'description' => 'string',
            'price' => 'numeric',
            'stock' => 'integer',
        ]);

        $product->update($validated);
        return $this->sendJson(['product' => $product->load('images')]);
    }

    /**
     * Delete product (only by owner or admin)
     * This permanently removes the product from the database
     */
    public function destroy(Request $request, $id)
    {
        // Try header-based auth if cookie auth didn't work
        $this->tryHeaderAuth($request);
        
        $product = Product::findOrFail($id);

        // Check authentication
        $userId = Auth::id();
        if (!$userId) {
            return $this->sendJson(['error' => 'Authentication required'], 401);
        }

        // Check ownership - only the owner or admin can delete
        $user = Auth::user();
        $isOwner = $product->user_id === $userId;
        $isAdmin = $user && $user->role === 'admin';

        if (!$isOwner && !$isAdmin) {
            return $this->sendJson(['error' => 'You can only delete your own listings'], 403);
        }

        // Delete associated images from storage
        foreach ($product->images as $image) {
            $path = str_replace(url('/storage/'), '', $image->image_path);
            Storage::disk('public')->delete($path);
            $image->delete(); // Also delete the image record from database
        }

        // Delete the product from the database
        $product->delete();
        
        return $this->sendJson(['message' => 'Product deleted successfully from database']);
    }
}
