<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Basket;
use App\Models\OrderItem;
use App\Models\Stock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    
    public function checkout(Request $request)
    {

  $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

 // Load basket
        $basket = Basket::with('items.variant')->where('user_id', $user->id)->first();

        if (! $basket || $basket->items->isEmpty()) {
            return response()->json(['message' => 'Basket is empty'], 400);
        }


 // validate address / payment later
        $request->validate([
            'shipping_address' => 'required|string|max:255',
        ]);

        try {
            DB::transaction(function () use ($user, $basket, &$order) {


// validate stock for each item
         foreach ($basket->items as $item) {
             if ($item->variant->stock_qty < $item->quantity) {
            throw new \Exception(
    "Insufficient stock for {$item->variant->variant_label}"
      );
      }}


// Create order
  $order = Order::create([
 'user_id' => $user->id,
 'status' => 'pending',
 'total' => 0,
]);

$total = 0;



// create order items + deduct stock
    foreach ($basket->items as $item) {
                    $price = $item->variant->price;
                    $subtotal = $price * $item->quantity;
                    $total += $subtotal;

OrderItem::create([
     'order_id' => $order->id,
    'product_variant_id' => $item->product_variant_id,
    'quantity' => $item->quantity,
    'price' => $price,
     ]);

// deduct stock
 $item->variant->decrement('stock_qty', $item->quantity);


// stock movement
StockMovement::create([
    'product_variant_id' => $item->product_variant_id,
    'change' => -$item->quantity,
    'type' => 'sale',
    'note' => 'Order #' . $order->id,
     ]);
         }

  // Update order 
     $order->update(['total' => $total]);

  //clear basket
     $basket->items()->delete();
            });


            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Checkout failed',
                'error' => $e->getMessage(),
            ], 400);
        }

        return response()->json([
            'message' => 'Order placed successfully',
            'order' => $order->load('items.variant'),
        ], 201);


    }
}
