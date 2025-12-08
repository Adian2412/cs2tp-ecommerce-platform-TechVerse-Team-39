<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductAttribute;
use App\Models\Product;

class ProductAttributeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)

    {

$query = ProductAttribute::with('product');

    if ($request->has('product_id')) {
      $query->where('product_id', $request->product_id);
        }

      return response()->json(
       $query->paginate(20)
        );
     
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {

$validated = $request->validate([
 'product_id' => 'required|exists:products,id',
  'name' => 'required|string|max:100',
 'value' => 'required|string|max:255',
      ]);

  $attribute = ProductAttribute::create($validated);

 return response()->json([
    'message' => 'Product attribute created',
    'attribute' => $attribute->load('product')
  ], 201);


        
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        $attribute = ProductAttribute::with('product')->findOrFail($id);
        return response()->json($attribute);
    }



    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
$attribute = ProductAttribute::findOrFail($id);

        $validated = $request->validate([
            'name'  => 'sometimes|string|max:100',
            'value' => 'sometimes|string|max:255',
        ]);

        $attribute->update($validated);

        return response()->json([
            'message' => 'Product attribute updated',
            'attribute' => $attribute
        ]);

    }


    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
      $attribute = ProductAttribute::findOrFail($id);
      $attribute->delete();

        return response()->json(['message' => 'Product attribute deleted']);
    }
}
