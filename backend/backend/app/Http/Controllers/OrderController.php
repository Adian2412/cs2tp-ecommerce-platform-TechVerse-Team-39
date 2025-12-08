<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    // authenticated so that user sees own orders and the admin can see all
    public function index(Request $request)
    {

 $user = $request->user();

        $query = Order::with('items.variant.product', 'address')
            ->orderBy('created_at', 'desc');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->paginate(20));

    }

    public function show(Request $request, $id)
    {

 $order = Order::with('items.variant.product', 'address')
            ->findOrFail($id);

        $user = $request->user();

        if ($user->role !== 'admin' && $order->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($order);

       
    }

  
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Admin only'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,paid,shipped,completed,cancelled',
        ]);

        $order->status = $validated['status'];
        $order->save();

        return response()->json([
            'message' => 'Order status updated',
            'order' => $order
        ]);
    }
}
