<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Basket;
use App\Models\OrderItem;

class CheckoutService
{
    public function checkout(Basket $basket)
    {
       
        $order = Order::create([
            'user_id' => $basket->user_id,
            'total' => $basket->calculateTotal(), 
        ]);

        //to change basket items to order items
        foreach($basket->items as $item){
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'price' => $item->product->price,
            ]);
        }

  
        $basket->reduceStock();

        $basket->clear();

        return $order;
    }
}
