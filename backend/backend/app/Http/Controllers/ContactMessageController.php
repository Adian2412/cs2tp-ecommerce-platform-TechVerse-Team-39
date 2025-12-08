<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
$validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:150',
            'subject' => 'nullable|string|max:250',
            'message' => 'required|string|max:2000',
        ]);

        $contact = ContactMessage::create($validated);

        return response()->json([
            'message' => 'Message received',
            'contact_message' => $contact
        ], 201);


    }


    public function index()
    {
        // admin: list messages
        return response()->json(
            ContactMessage::orderBy('created_at', 'desc')->paginate(50)
        );
    }


    public function show($id)
    {
        $contact = ContactMessage::findOrFail($id);
        return response()->json($contact);
    }




    public function destroy($id)
    {
        $contact = ContactMessage::findOrFail($id);
        $contact->delete();

        return response()->json([
            'message' => 'Message deleted'
        ]);
    }


}
