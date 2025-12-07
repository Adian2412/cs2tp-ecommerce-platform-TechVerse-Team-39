<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //add pagination, filters, eager loading
        $products = Product::with('variants')->paginate(20);
        return response()->json($products);
        

    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //for the admin ->validate and create product + optionally variants/attributes
        return response()->json(['message' => 'Product created'], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $product = Product::with(['variants.stock','attributes','reviews','images'])->findOrFail($id);
        return response()->json($product);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request,$id)
    {
        //for the admin -> validate and update product + optionally variants/attributes
        return response()->json(['message' => 'Product updated']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        //for the admin -> delete product + optionally variants/attributes
        return response()->json(['message' => 'Product deleted']);
    }
}
