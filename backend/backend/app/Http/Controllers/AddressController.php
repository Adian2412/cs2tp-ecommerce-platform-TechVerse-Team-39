<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Address;

class AddressController extends Controller
{
    public function index()
    {
        return response()->json(Address::paginate(20));
    }

   public function store(Request $request)
    {
        $validated = $request->validate([
          'user_id' => 'required|exists:users,id',
           'line1' => 'required|string|max:255',
            'line2' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'nullable|string|max:100',
            'postcode' => 'nullable|string|max:20',
            'country' => 'required|string|max:100',
        ]);

        $address = Address::create($validated);
        return response()->json(['message' => 'Address created', 'address' => $address], 201);
    }

   public function show($id)
    {
        return response()->json(Address::findOrFail($id));
    }

   public function update(Request $request, $id)
    {
        $address = Address::findOrFail($id);
        $validated = $request->validate([
           'line1' => 'sometimes|string|max:255',
           'line2' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:100',
            'state' => 'sometimes|string|max:100',
            'postcode' => 'sometimes|string|max:20',
            'country' => 'sometimes|string|max:100',
       ]);
        $address->update($validated);
        return response()->json(['message' => 'Address updated', 'address' => $address]);
 }

    public function destroy($id)
    {
        Address::findOrFail($id)->delete();
        return response()->json(['message' => 'Address deleted']);
    }
}
