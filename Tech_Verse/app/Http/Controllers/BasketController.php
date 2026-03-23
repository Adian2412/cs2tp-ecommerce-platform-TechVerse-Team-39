<?php

namespace App\Http\Controllers;

use App\Models\Basket;
use App\Models\BasketItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BasketController extends Controller
{
    protected function resolveUser(Request $request): ?User
    {
        if (Auth::check()) return Auth::user();
        $token = $request->header('X-Session-Token');
        if ($token) {
            $session = DB::table('sessions')->where('id', $token)->first();
            if ($session && $session->user_id) {
                $user = User::find($session->user_id);
                if ($user) { Auth::login($user); return $user; }
            }
        }
        $uid = $request->session()->get('auth_user_id');
        return $uid ? User::find($uid) : null;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) return response()->json(['error' => 'Authentication required'], 401);

        $basket = Basket::firstOrCreate(['user_id' => $user->id]);
        $basket->load('items.variant.product', 'items.variant.stock');

        return response()->json(['basket' => $basket]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) return response()->json(['error' => 'Authentication required'], 401);

        $validated = $request->validate([
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity'   => ['required', 'integer', 'min:1'],
        ]);

        $basket = Basket::firstOrCreate(['user_id' => $user->id]);

        BasketItem::updateOrCreate(
            ['basket_id' => $basket->id, 'product_variant_id' => $validated['variant_id']],
            ['quantity'  => $validated['quantity']]
        );

        return response()->json(['message' => 'Item added to basket.'], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $basket = Basket::with('items.variant.product')->findOrFail($id);
        if (!$user || ($user->role !== 'admin' && $basket->user_id !== $user->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }
        return response()->json($basket);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['message' => 'Use POST /api/cart to update cart items.']);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $basket = Basket::findOrFail($id);
        if (!$user || ($user->role !== 'admin' && $basket->user_id !== $user->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }
        $basket->items()->delete();
        $basket->delete();
        return response()->json(['message' => 'Basket cleared.']);
    }
}
