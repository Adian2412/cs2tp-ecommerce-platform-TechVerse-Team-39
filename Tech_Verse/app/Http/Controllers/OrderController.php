<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReturnModel;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
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

    public function index(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $query = Order::with(['user', 'items.variant.product', 'items.returns', 'address'])->orderByDesc('id');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->paginate(50));
    }

    public function myOrders(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $orders = Order::with(['items.variant.product', 'items.returns', 'address'])
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        return response()->json(['orders' => $orders]);
    }

    public function show(Request $request, string $id)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $order = Order::with(['user', 'items.variant.product', 'items.returns', 'address'])->findOrFail($id);

        if ($user->role !== 'admin' && (int) $order->user_id !== (int) $user->id) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        return response()->json($order);
    }

    public function requestReturn(Request $request, int $orderItemId)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $item = OrderItem::with(['order', 'variant.product', 'returns'])->findOrFail($orderItemId);

        if ((int) $item->order->user_id !== (int) $user->id) {
            return response()->json(['error' => 'You can only request returns for your own orders.'], 403);
        }

        if (!in_array((string) $item->order->status, ['paid', 'shipped', 'delivered'], true)) {
            return response()->json(['error' => 'This order is not eligible for returns yet.'], 422);
        }

        $hasExisting = $item->returns->contains(function ($ret) {
            return in_array((string) $ret->status, ['requested', 'approved', 'refunded'], true);
        });

        if ($hasExisting) {
            return response()->json(['error' => 'A return has already been requested for this order item.'], 409);
        }

        $return = ReturnModel::create([
            'order_item_id' => $item->id,
            'reason' => trim((string) $validated['reason']),
            'status' => 'requested',
        ]);

        return response()->json([
            'message' => 'Return request submitted successfully',
            'return' => $return,
        ], 201);
    }

    public function store(Request $request)
    {
        return response()->json(['error' => 'Use /api/checkout to create orders.'], 405);
    }

    public function update(Request $request, string $id)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,paid,shipped,delivered,returned,cancelled',
        ]);

        $order = Order::findOrFail($id);
        $order->status = $validated['status'];
        $order->save();

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order->load(['user', 'items.variant.product', 'items.returns', 'address']),
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        Order::findOrFail($id)->delete();
        return response()->json(['message' => 'Order deleted']);
    }
}
