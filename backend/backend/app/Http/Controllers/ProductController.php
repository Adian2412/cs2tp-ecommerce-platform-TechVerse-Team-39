<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductAttribute;
use App\Models\Review;
use App\Models\ProductImage;
use Illuminate\Support\Facades\Str;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
$user = $request->user();

   $query = Product::with([
            'variants',
            'images',
            'category',
            'brand'
        ])->orderBy('created_at', 'desc');

     // If the user is not an admin they can only see their own items
        if ($user && $user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        return response()->json(
            $query->paginate(20)
        );

    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {

 $user = $request->user();

 //for the admin ->validate and create product + optionally variants/attributes

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'sku'         => 'required|string|unique:products,sku',
            'category_id' => 'required|exists:categories,id',
            'brand_id'    => 'required|exists:brands,id',
            'price'       => 'required|numeric|min:0',
            'stock'       => 'required|integer|min:0',
            'description' => 'nullable|string',
        ]);

        $product = Product::create([
            ...$validated,
            'user_id' => $user->id,
            'slug'    => Str::slug($validated['name']),
            'is_active' => true,
            'is_sold'   => false,
        ]);

        return response()->json([
            'message' => 'Product created',
            'product' => $product
        ], 201);

      
    }




    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $product = Product::with(['variants.stock','attributes','reviews.user','images','category' , 'brand'])->findOrFail($id);
        return response()->json($product);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request,$id)

    //for the admin -> validate and update product + optionally variants/attributes
    {
  $product = Product::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $product->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

 $validated = $request->validate([
'name'        => 'sometimes|string|max:255',
'price'       => 'sometimes|numeric|min:0',
'stock'       => 'sometimes|integer|min:0',
'description' => 'nullable|string',
 'is_active'   => 'sometimes|boolean',
'is_sold'     => 'sometimes|boolean',
        ]);


        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $product->update($validated);

        return response()->json([
            'message' => 'Product updated',
            'product' => $product
        ]);


    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        //for the admin -> delete product + optionally variants/attributes
    $product = Product::findOrFail($id);
    $user = request()->user();

if ($user->role !== 'admin' && $product->user_id !== $user->id) {
    return response()->json(['message' => 'Unauthorized'], 403);
     }

 $product->delete();

        return response()->json([
            'message' => 'Product deleted'
        ]);
    
    }
}
