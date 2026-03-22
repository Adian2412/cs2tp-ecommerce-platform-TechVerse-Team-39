<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\Basket;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    protected function tryHeaderAuth(Request $request): bool
    {
        if (Auth::check()) {
            return true;
        }

        $token = $request->header('X-Session-Token');
        if (!$token) {
            return false;
        }

        $session = DB::table('sessions')->where('id', $token)->first();
        if ($session && $session->user_id) {
            $user = User::find($session->user_id);
            if ($user) {
                Auth::login($user);
                return true;
            }
        }

        return false;
    }

    public function checkout(Request $request)
    {
        $this->tryHeaderAuth($request);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $validated = $request->validate([
            'cart_items' => 'required|array|min:1',
            'cart_items.*.product_id' => 'nullable|integer',
            'cart_items.*.product_variant_id' => 'nullable|integer',
            'cart_items.*.quantity' => 'required|integer|min:1',
            'shipping_cost' => 'nullable|numeric|min:0',
            'address.line1' => 'nullable|string|max:180',
            'address.line2' => 'nullable|string|max:180',
            'address.city' => 'nullable|string|max:120',
            'address.postcode' => 'nullable|string|max:20',
            'address.country' => 'nullable|string|max:120',
        ]);

        try {
            $result = DB::transaction(function () use ($validated, $user) {
                $addressId = null;
                $addressData = $validated['address'] ?? [];
                if (!empty($addressData['line1']) && !empty($addressData['postcode']) && !empty($addressData['country'])) {
                    $address = Address::create([
                        'user_id' => $user->id,
                        'line1' => $addressData['line1'],
                        'line2' => $addressData['line2'] ?? null,
                        'city' => $addressData['city'] ?? 'Not provided',
                        'postcode' => $addressData['postcode'],
                        'country' => $addressData['country'],
                        'is_default' => 0,
                    ]);
                    $addressId = $address->id;
                }

                $order = Order::create([
                    'user_id' => $user->id,
                    'address_id' => $addressId,
                    'status' => 'pending',
                    'total' => 0,
                ]);

                $total = 0.0;

                foreach ($validated['cart_items'] as $item) {
                    $variant = null;

                    if (!empty($item['product_variant_id'])) {
                        $variant = ProductVariant::with(['product', 'stock'])->find($item['product_variant_id']);
                    }

                    if (!$variant && !empty($item['product_id'])) {
                        $variant = ProductVariant::with(['product', 'stock'])
                            ->where('product_id', $item['product_id'])
                            ->orderBy('id')
                            ->first();
                    }

                    if (!$variant) {
                        throw new \RuntimeException('A cart item could not be matched to a product variant.');
                    }

                    $qty = (int) $item['quantity'];
                    $stockRow = Stock::where('product_variant_id', $variant->id)->lockForUpdate()->first();
                    $available = $stockRow ? (int) $stockRow->quantity : (int) $variant->stock_qty;

                    if ($qty > $available) {
                        throw new \RuntimeException('Not enough stock available for ' . ($variant->product->name ?? 'this product') . '.');
                    }

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_variant_id' => $variant->id,
                        'unit_price' => $variant->price,
                        'quantity' => $qty,
                    ]);

                    if ($stockRow) {
                        $stockRow->quantity = max(0, $stockRow->quantity - $qty);
                        $stockRow->save();
                    }

                    $variant->stock_qty = max(0, (int) $variant->stock_qty - $qty);
                    $variant->save();

                    StockMovement::create([
                        'product_variant_id' => $variant->id,
                        'movement_type' => 'OUT',
                        'quantity' => $qty,
                        'note' => 'Checkout order #' . $order->id,
                        'created_by' => $user->id,
                    ]);

                    $total += ((float) $variant->price) * $qty;
                }

                $total += (float) ($validated['shipping_cost'] ?? 0);
                $order->total = $total;
                $order->save();

                $basket = Basket::where('user_id', $user->id)->first();
                if ($basket) {
                    $basket->items()->delete();
                }

                return $order->load(['items.variant.product', 'address']);
            });

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => $result,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
