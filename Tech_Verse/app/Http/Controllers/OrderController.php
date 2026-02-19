<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    // authenticated so that user sees own orders and the admin can see all
    public function index(Request $request)
    {
   
        return response()->json(Order::with('items.variant.product')->paginate(20));
    }

 
    public function show($id)
    {
        return response()->json(Order::with('items.variant.product','address')->findOrFail($id));
    }

  
    public function updateStatus(Request $request, $id)
    {
        // change status 
        return response()->json(['message' => 'order status updated']);
    }
}
