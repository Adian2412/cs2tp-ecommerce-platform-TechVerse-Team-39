<?php

namespace App\Http\Controllers;

use App\Models\Basket;
use App\Models\BasketItem;
use App\Models\ProductVariant;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class BasketController extends Controller

{
 public function index()
    {
        return response()->json(Basket::paginate(20));
    }

    /**
     * Store a newly created resource in storage.
     */
 public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $basket = Basket::create($validated);
        return response()->json(['message' => 'Basket created', 'basket' => $basket], 201);
    }


    // GET /basket 
    public function show($id)
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
    public function update(Request $request, $id)
    {
        $basket = Basket ::findOrFail($id);
        $validated = $request->validate([
            'user_id' => 'sometimes|exists:users,id',
        ]);
      
        $basket->update($validated);
        return response()->json(['message' => 'basket item updated']);
    }

     public function destroy($id)
    {
        Basket ::findOrFail($id)->delete();
        return response()->json(['message' => 'basket deleted']);
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
