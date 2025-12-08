<?php

namespace App\Http\Controllers;

use App\Models\Basket;
use App\Models\BasketItem;
use App\Models\ProductVariant;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class BasketController extends Controller

{
 public function index(Request $request)
    {
   
        $user = $request->user();

        $basket = Basket::with('items.variant.product')
            ->firstOrCreate(['user_id' => $user->id]);

        return response()->json($basket);

    }

    /**
     * Store a newly created resource in storage.
     */
 public function store(Request $request)
    {
           $user = $request->user();

        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $basket = Basket::firstOrCreate(['user_id' => $user->id]);
        $variant = ProductVariant::findOrFail($validated['product_variant_id']);
        
        //return response()->json(['message' => 'Basket created', 'basket' => $basket], 201);


        //to check the stock
        if($variant->stock_qty < $validated['quantity']) {
            return response()->json(['message' => 'Insufficient stock'], 400);
        }

        // Add or update basket item
         $item = BasketItem::firstOrNew([
            'basket_id' => $basket->id,
            'product_variant_id' => $variant->id
        ]);


    // update quantity
    $item->quantity += $validated['quantity'];
        $item->save();

        return response()->json([
            'message' => 'Item added to basket',
            'basket' => $basket->load('items.variant.product')
        ], 201);

    }


    // GET /basket 
    public function show(Request $request, $id=null)
    {
        $basket = $request->user()->basket()->with('items.variant.product')->first();
        return response()->json($basket);
    }


    // PATCH /basket/update
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $item = BasketItem::findOrFail($id);

    if($item->basket->user_id != $request->user()->id) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    if($item->variant->stock_qty < $validated['quantity']) {
        return response()->json(['message' => 'Insufficient stock'], 400);
    }
        $item->quantity = $validated['quantity'];
        $item->save();
        return response()->json(['message' => 'basket item updated', 'item' => $item]);
    }



    

     public function destroy($id, Request $request)
    {
    $item = BasketItem::findOrFail($id);
    if($item->basket->user_id != $request->user()->id) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $item->delete();
    return response()->json(['message' => 'basket item deleted']);

     
    }

   
    public function clear(Request $request)
    {
       $basket = Basket::where('user_id', $request->user()->id)->first();
       if ($basket) {
           $basket->items()->delete();
         }
        return response()->json(['message' => 'basket cleared']);
    }
}
