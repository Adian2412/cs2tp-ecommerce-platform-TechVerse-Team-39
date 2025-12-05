<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
        return response()->json(['message' => 'message received'], 201);
    }

    public function index()
    {
        // admin: list messages
        return response()->json(ContactMessage::latest()->paginate(50));
    }
}
