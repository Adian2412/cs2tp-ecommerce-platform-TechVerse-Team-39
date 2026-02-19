<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Update the authenticated user's profile (name, email).
     */
    public function update(Request $request)
    {
        $userId = $request->session()->get('auth_user_id');
        $user   = User::findOrFail($userId);

        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $userId,
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated.',
            'user'    => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $userId = $request->session()->get('auth_user_id');
        $user   = User::findOrFail($userId);

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password_hash)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password_hash' => Hash::make($validated['new_password'])]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    /**
     * List all users (admin only).
     */
    public function index(Request $request)
    {
        $userId = $request->session()->get('auth_user_id');
        $actor  = User::findOrFail($userId);

        if ($actor->role !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(User::select('id', 'name', 'email', 'role', 'created_at')->paginate(20));
    }

    /**
     * Show a single user (admin only).
     */
    public function show(Request $request, $id)
    {
        $userId = $request->session()->get('auth_user_id');
        $actor  = User::findOrFail($userId);

        if ($actor->role !== 'admin' && $actor->id !== (int) $id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(User::findOrFail($id));
    }

    /**
     * Delete a user (admin only).
     */
    public function destroy(Request $request, $id)
    {
        $userId = $request->session()->get('auth_user_id');
        $actor  = User::findOrFail($userId);

        if ($actor->role !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        User::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
