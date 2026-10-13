<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    public function settings()
    {
        $settings = Setting::where('group', 'contact_info')->pluck('value', 'key')->toArray();
        
        return response()->json([
            'status' => 'success',
            'data' => [
                'address_line_1' => $settings['address_line_1'] ?? '2/16 Arved Transcube Plaza, Near Ranip Bus Depo Terminal, Ranip',
                'address_line_2' => $settings['address_line_2'] ?? 'Ahmedabad, Gujarat, 382480',
                'phone' => $settings['phone'] ?? '+91 9106234089',
                'hours' => $settings['hours'] ?? 'Mon - Sat, 9am - 7pm',
                'email' => $settings['email'] ?? 'nutsandnutrition@gmail.com',
                'response_time' => $settings['response_time'] ?? 'We reply within 24 hours',
            ]
        ]);
    }

    public function submit(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|digits:10',
            'message' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        ContactMessage::create($validator->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Message sent successfully.'
        ], 201);
    }
}
