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
        $basket = Basket::with('items.productVariant')
            ->firstOrCreate(['user_id' => $userId]);

        return response()->json(['cart' => $basket->items]);
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
                ->where('variant_id', $validated['variant_id'])
                ->delete();
        } else {
            BasketItem::updateOrCreate(
                ['basket_id' => $basket->id, 'variant_id' => $validated['variant_id']],
                ['quantity'  => $validated['quantity']]
            );
        }

        return response()->json(['message' => 'Cart updated.']);
    }
}
