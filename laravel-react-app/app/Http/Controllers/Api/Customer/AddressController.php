<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        $customerId = Auth::guard('customer_api')->id();

        $addresses = CustomerAddress::where('customer_id', $customerId)
            ->orderBy('is_default', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $addresses
        ]);
    }

    public function store(Request $request)
    {
        $customerId = Auth::guard('customer_api')->id();
        $user = Auth::guard('customer_api')->user();

        $validated = $request->validate([
            'type' => 'nullable|string|max:50',
            'name' => 'nullable|string|max:100',
            'mobile' => 'required|string|max:20',
            'address' => 'required|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:50',
            'pincode' => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
        ]);

        $hasAddresses = CustomerAddress::where('customer_id', $customerId)->exists();
        $isDefault = $request->boolean('is_default') || !$hasAddresses;

        if ($isDefault) {
            CustomerAddress::where('customer_id', $customerId)->update(['is_default' => false]);
        }

        $address = CustomerAddress::create([
            'customer_id' => $customerId,
            'type' => $validated['type'] ?? 'Home',
            'name' => $validated['name'] ?? ($user ? $user->name : ''),
            'mobile' => $validated['mobile'],
            'address' => $validated['address'],
            'city' => $validated['city'] ?? '',
            'state' => $validated['state'] ?? '',
            'country' => $validated['country'] ?? 'India',
            'pincode' => $validated['pincode'] ?? '',
            'is_default' => $isDefault,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Address saved successfully',
            'data' => $address
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $customerId = Auth::guard('customer_api')->id();
        $address = CustomerAddress::where('customer_id', $customerId)->findOrFail($id);

        $validated = $request->validate([
            'type' => 'nullable|string|max:50',
            'name' => 'nullable|string|max:100',
            'mobile' => 'required|string|max:20',
            'address' => 'required|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:50',
            'pincode' => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
        ]);

        if ($request->boolean('is_default')) {
            CustomerAddress::where('customer_id', $customerId)->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Address updated successfully',
            'data' => $address
        ]);
    }

    public function destroy($id)
    {
        $customerId = Auth::guard('customer_api')->id();
        $address = CustomerAddress::where('customer_id', $customerId)->findOrFail($id);
        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $next = CustomerAddress::where('customer_id', $customerId)->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Address deleted successfully'
        ]);
    }

    public function setDefault($id)
    {
        $customerId = Auth::guard('customer_api')->id();
        $address = CustomerAddress::where('customer_id', $customerId)->findOrFail($id);

        CustomerAddress::where('customer_id', $customerId)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Default address updated successfully',
            'data' => $address
        ]);
    }
}
