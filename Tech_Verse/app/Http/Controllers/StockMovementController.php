<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index()
    {
        return response()->json(StockMovement::with('variant','creator')->latest()->paginate(50));
    }

    public function store(Request $request)
    {
        return response()->json(['message' => 'stock movement created'], 201);
    }
}
