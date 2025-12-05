<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(['message' => 'Not implemented yet']);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //validate and create category
        return response()->json(['message' => 'Category created'], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        return response()->json(['message' => 'Not implemented yet']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'Category updated']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        //delete category
        return response()->json(['message' => 'Category deleted']); 
    }
}
