<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    protected function resolveUser(Request $request): ?User
    {
        if (Auth::check()) return Auth::user();
        $token = $request->header('X-Session-Token');
        if ($token) {
            $session = DB::table('sessions')->where('id', $token)->first();
            if ($session && $session->user_id) {
                $user = User::find($session->user_id);
                if ($user) { Auth::login($user); return $user; }
            }
        }
        $uid = $request->session()->get('auth_user_id');
        return $uid ? User::find($uid) : null;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) return response()->json(['error' => 'Authentication required'], 401);
        return response()->json($user->addresses()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) return response()->json(['error' => 'Authentication required'], 401);

        $validated = $request->validate([
            'line1'      => 'required|string|max:180',
            'line2'      => 'nullable|string|max:180',
            'city'       => 'required|string|max:120',
            'postcode'   => 'required|string|max:20',
            'country'    => 'required|string|max:120',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            $user->addresses()->update(['is_default' => false]);
        }

        $address = $user->addresses()->create($validated);
        return response()->json($address, 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $address = Address::findOrFail($id);
        if (!$user || ($user->role !== 'admin' && $address->user_id !== $user->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }
        return response()->json($address);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $address = Address::findOrFail($id);
        if (!$user || ($user->role !== 'admin' && $address->user_id !== $user->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $validated = $request->validate([
            'line1'      => 'sometimes|string|max:180',
            'line2'      => 'nullable|string|max:180',
            'city'       => 'sometimes|string|max:120',
            'postcode'   => 'sometimes|string|max:20',
            'country'    => 'sometimes|string|max:120',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            Address::where('user_id', $address->user_id)->update(['is_default' => false]);
        }

        $address->update($validated);
        return response()->json($address);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $address = Address::findOrFail($id);
        if (!$user || ($user->role !== 'admin' && $address->user_id !== $user->id)) {
            return response()->json(['error' => 'Access denied'], 403);
        }
        $address->delete();
        return response()->json(['message' => 'Address deleted.']);
    }
}
