<?php

namespace App\Http\Controllers;

use App\Models\Address;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index()
    {
        return response()->json(Address::orderByDesc('id')->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'line1' => 'required|string|max:180',
            'line2' => 'nullable|string|max:180',
            'city' => 'required|string|max:120',
            'postcode' => 'required|string|max:20',
            'country' => 'required|string|max:120',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            Address::where('user_id', $validated['user_id'])->update(['is_default' => false]);
        }

        $address = Address::create([
            'user_id' => $validated['user_id'],
            'line1' => $validated['line1'],
            'line2' => $validated['line2'] ?? null,
            'city' => $validated['city'],
            'postcode' => $validated['postcode'],
            'country' => $validated['country'],
            'is_default' => (bool) ($validated['is_default'] ?? false),
        ]);

        return response()->json([
            'message' => 'Address created',
            'address' => $address,
        ], 201);
    }

    public function show($id)
    {
        return response()->json(Address::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $address = Address::findOrFail($id);

        $validated = $request->validate([
            'line1' => 'sometimes|string|max:180',
            'line2' => 'nullable|string|max:180',
            'city' => 'sometimes|string|max:120',
            'postcode' => 'sometimes|string|max:20',
            'country' => 'sometimes|string|max:120',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            Address::where('user_id', $address->user_id)
                ->where('id', '!=', $address->id)
                ->update(['is_default' => false]);
        }

        $address->update($validated);

        return response()->json([
            'message' => 'Address updated',
            'address' => $address,
        ]);
    }

    public function destroy($id)
    {
        Address::findOrFail($id)->delete();
        return response()->json(['message' => 'Address deleted']);
    }
}
