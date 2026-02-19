<?php

namespace App\Http\Controllers;

use App\Models\Basket;
use App\Models\BasketItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->session()->get('auth_user_id');

        $basket = Basket::firstOrCreate(['user_id' => $userId]);

        // Eager load variant -> product and stock so frontend gets name, price, image
        $basket->load('items.variant.product', 'items.variant.stock');

        $items = $basket->items->map(function ($item) {
            $variant = $item->variant;
            $product = $variant ? $variant->product : null;
            $stock   = $variant ? $variant->stock   : null;

            return [
                'id'               => $item->id,
                'variant_id'       => $item->product_variant_id,
                'quantity'         => $item->quantity,
                'unit_price'       => $variant ? $variant->price        : null,
                'variant_label'    => $variant ? $variant->variant_label : null,
                'sku'              => $variant ? $variant->sku           : null,
                'product_id'       => $product ? $product->id           : null,
                'name'             => $product ? $product->name         : null,
                'image_url'        => $product ? $product->image_url    : null,
                'stock_qty'        => $stock   ? $stock->quantity       : ($variant ? $variant->stock_qty : null),
            ];
        });

        return response()->json(['items' => $items]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity'   => ['required', 'integer', 'min:0'],
        ]);

        $userId = $request->session()->get('auth_user_id');
        $basket = Basket::firstOrCreate(['user_id' => $userId]);

        if ($validated['quantity'] === 0) {
            BasketItem::where('basket_id', $basket->id)
                ->where('product_variant_id', $validated['variant_id'])
                ->delete();
        } else {
            BasketItem::updateOrCreate(
                [
                    'basket_id'          => $basket->id,
                    'product_variant_id' => $validated['variant_id'],
                ],
                ['quantity' => $validated['quantity']]
            );
        }

        return response()->json(['message' => 'Cart updated.']);
    }
}
