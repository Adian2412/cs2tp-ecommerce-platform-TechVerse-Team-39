<?php

namespace App\Http\Controllers;

use App\Models\Basket;
use App\Models\BasketItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CartController extends Controller
{
    protected function resolveUserId(Request $request): ?int
    {
        if (Auth::check()) return (int) Auth::id();
        $id = $request->session()->get('auth_user_id');
        return $id ? (int) $id : null;
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        if (!$userId) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $basket = Basket::firstOrCreate(['user_id' => $userId]);
        $basket->load('items.variant.product', 'items.variant.stock');

        $items = $basket->items->map(function ($item) {
            $variant = $item->variant;
            $product = $variant?->product;
            $stock   = $variant?->stock;

            return [
                'id'            => $item->id,
                'variant_id'    => $item->product_variant_id,
                'quantity'      => $item->quantity,
                'unit_price'    => $variant?->price,
                'variant_label' => $variant?->variant_label,
                'sku'           => $variant?->sku,
                'product_id'    => $product?->id,
                'name'          => $product?->name,
                'image_url'     => $product?->image_url,
                'stock_qty'     => $stock?->quantity ?? $variant?->stock_qty ?? 0,
            ];
        });

        return response()->json(['items' => $items]);
    }

    public function update(Request $request): JsonResponse
    {
        $userId = $this->resolveUserId($request);
        if (!$userId) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $validated = $request->validate([
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity'   => ['required', 'integer', 'min:0'],
        ]);

        $basket = Basket::firstOrCreate(['user_id' => $userId]);

        if ($validated['quantity'] === 0) {
            BasketItem::where('basket_id', $basket->id)
                ->where('product_variant_id', $validated['variant_id'])
                ->delete();
        } else {
            BasketItem::updateOrCreate(
                ['basket_id' => $basket->id, 'product_variant_id' => $validated['variant_id']],
                ['quantity' => $validated['quantity']]
            );
        }

        return response()->json(['message' => 'Cart updated.']);
    }
}
