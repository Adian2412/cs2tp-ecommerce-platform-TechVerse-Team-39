<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductVariant;

class ProductVariantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(ProductVariant::with('product','stock')->paginate(20));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //for the admin -> validate and create variant
        return response()->json(['message' => 'Product variant created'], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        return response()->json(ProductVariant::with('stock','stockMovements')->findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request,$id)
    {
        return response()->json(['message' => 'Product variant updated']);  
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        return response()->json(['message' => 'Product variant deleted']); 
    }
}
