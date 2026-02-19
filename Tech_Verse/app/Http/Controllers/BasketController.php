<?php

namespace App\Http\Controllers;

use App\Models\Basket;
use App\Models\BasketItem;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class BasketController extends Controller
{
    // GET /basket 
    public function show(Request $request)
    {
        $basket = $request->user()->basket()->with('items.variant.product')->first();
        return response()->json($basket);
    }

    // POST /basket/add
    public function add(Request $request)
    {
        // input validation for variant_id and quantity
        return response()->json(['message' => 'item added to basket'], 201);
    }

    // PATCH /basket/update
    public function update(Request $request)
    {
      
        return response()->json(['message' => 'basket item updated']);
    }

  
    public function remove(Request $request)
    {
        // remove item
        return response()->json(null, 204);
    }

   
    public function clear(Request $request)
    {
        // clear all items
        return response()->json(['message' => 'basket cleared']);
    }
}
