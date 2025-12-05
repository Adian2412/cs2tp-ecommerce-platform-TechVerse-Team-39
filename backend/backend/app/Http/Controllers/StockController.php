<?php

namespace App\Http\Controllers;

use App\Models\Stock;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index()
    {
        return response()->json(Stock::with('variant.product')->paginate(20));
    }

    public function update(Request $request, $id)
    {
 // update stock quantity
        return response()->json(['message' => 'stock updated']);
    }

    public function show($id)
    {
        return response()->json(Stock::with('variant')->findOrFail($id));
    }
}
