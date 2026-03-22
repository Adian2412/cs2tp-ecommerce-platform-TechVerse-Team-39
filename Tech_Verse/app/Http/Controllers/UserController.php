<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    protected function tryHeaderAuth(Request $request): bool
    {
        if (Auth::check()) {
            return true;
        }

        $token = $request->header('X-Session-Token');
        if (!$token) {
            return false;
        }

        $session = DB::table('sessions')->where('id', $token)->first();
        if ($session && $session->user_id) {
            $user = User::find($session->user_id);
            if ($user) {
                Auth::login($user);
                return true;
            }
        }

        return false;
    }

    public function index(Request $request)
    {
        $this->tryHeaderAuth($request);
        $user = Auth::user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        return response()->json(User::orderByDesc('id')->paginate(50));
    }

    public function show(Request $request, string $id)
    {
        $this->tryHeaderAuth($request);
        $current = Auth::user();
        $target = User::findOrFail($id);

        if (!$current || ($current->role !== 'admin' && (int) $current->id !== (int) $target->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $data = $target->toArray();
        $data['username'] = $target->name;
        return response()->json($data);
    }

    public function update(Request $request, string $id)
    {
        $this->tryHeaderAuth($request);
        $current = Auth::user();
        $target = User::findOrFail($id);

        if (!$current || ($current->role !== 'admin' && (int) $current->id !== (int) $target->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:120',
            'username' => 'sometimes|string|max:120',
            'email' => 'sometimes|email|max:190|unique:users,email,' . $target->id,
            'role' => 'sometimes|in:customer,staff,admin',
            'password' => 'sometimes|string|min:8',
        ]);

        if (array_key_exists('username', $validated) && !array_key_exists('name', $validated)) {
            $validated['name'] = $validated['username'];
            unset($validated['username']);
        }

        if (($validated['role'] ?? null) && $current->role !== 'admin') {
            unset($validated['role']);
        }

        if (!empty($validated['password'])) {
            $validated['password_hash'] = Hash::make($validated['password']);
            unset($validated['password']);
        }

        $target->update($validated);

        $data = $target->fresh()->toArray();
        $data['username'] = $data['name'] ?? null;

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $data,
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->tryHeaderAuth($request);
        $current = Auth::user();
        $target = User::findOrFail($id);

        if (!$current || ($current->role !== 'admin' && (int) $current->id !== (int) $target->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $target->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }
}
