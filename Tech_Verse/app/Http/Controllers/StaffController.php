<?php

namespace App\Http\Controllers;

use App\Models\StaffProfile;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index()
    {
        return response()->json(StaffProfile::with('user','manager')->paginate(20));
    }

    public function store(Request $request)
    {
        return response()->json(['message' => 'staff created'], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'staff updated']);
    }

    public function deactivate($id)
    {
        return response()->json(['message' => 'staff deactivated']);
    }
}
