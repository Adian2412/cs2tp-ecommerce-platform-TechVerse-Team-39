<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BasketItem;

class BasketItemController extends Controller
{
    public function index()
    {
        return response()->json(BasketItem::paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'basket_id' => 'required|exists:baskets,id',
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $item = BasketItem::create($validated);
        return response()->json(['message' => 'Basket item created', 'item' => $item], 201);
    }

    public function show($id)
    {
        return response()->json(BasketItem::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $item = BasketItem::findOrFail($id);
        $validated = $request->validate([
            'quantity' => 'sometimes|integer|min:1',
        ]);
        $item->update($validated);
        return response()->json(['message' => 'Basket item updated', 'item' => $item]);
    }

    public function destroy($id)
    {
        BasketItem::findOrFail($id)->delete();
        return response()->json(['message' => 'Basket item deleted']);
    }
}
