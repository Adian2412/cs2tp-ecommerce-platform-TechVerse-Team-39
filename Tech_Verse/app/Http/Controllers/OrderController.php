<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->session()->get('auth_user_id');
        $user   = User::findOrFail($userId);

        if ($user->role === 'admin' || $user->role === 'staff') {
            $orders = Order::with('items.variant.product')->paginate(20);
        } else {
            $orders = Order::with('items.variant.product')
                ->where('user_id', $userId)
                ->paginate(20);
        }

        return response()->json($orders);
    }

    public function show(Request $request, $id)
    {
        $userId = $request->session()->get('auth_user_id');
        $user   = User::findOrFail($userId);
        $order  = Order::with('items.variant.product', 'address')->findOrFail($id);

        // Customers can only view their own orders
        if ($user->role === 'customer' && $order->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($order);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,paid,shipped,returned,cancelled',
        ]);

        $order = Order::findOrFail($id);
        $order->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Order status updated', 'order' => $order]);
    }
}
