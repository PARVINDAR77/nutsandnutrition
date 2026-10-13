<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

use App\Models\Setting;

class ContactMessageController extends Controller
{
    public function index()
    {
        $messages = ContactMessage::orderBy('created_at', 'desc')->paginate(15);
        
        $settings = Setting::where('group', 'contact_info')->pluck('value', 'key')->toArray();
        
        // Default values if not set
        $contactSettings = [
            'address_line_1' => $settings['address_line_1'] ?? '2/16 Arved Transcube Plaza, Near Ranip Bus Depo Terminal, Ranip',
            'address_line_2' => $settings['address_line_2'] ?? 'Ahmedabad, Gujarat, 382480',
            'phone' => $settings['phone'] ?? '+91 9106234089',
            'hours' => $settings['hours'] ?? 'Mon - Sat, 9am - 7pm',
            'email' => $settings['email'] ?? 'nutsandnutrition@gmail.com',
            'response_time' => $settings['response_time'] ?? 'We reply within 24 hours',
        ];

        return view('admin.contact_messages.index', compact('messages', 'contactSettings'));
    }
    
    public function updateSettings(Request $request)
    {
        $request->validate([
            'address_line_1' => 'required|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'phone' => 'required|string|max:255',
            'hours' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'response_time' => 'required|string|max:255',
        ]);
        
        $keys = ['address_line_1', 'address_line_2', 'phone', 'hours', 'email', 'response_time'];
        
        foreach ($keys as $key) {
            Setting::updateOrCreate(
                ['group' => 'contact_info', 'key' => $key],
                [
                    'value' => $request->$key, 
                    'type' => 'string',
                    'label' => ucwords(str_replace('_', ' ', $key))
                ]
            );
        }
        
        return redirect()->route('admin.contact-messages.index')->with('success', 'Contact settings updated successfully.');
    }

    public function destroy($id)
    {
        $message = ContactMessage::findOrFail($id);
        $message->delete();
        
        return redirect()->route('admin.contact-messages.index')->with('success', 'Message deleted successfully.');
    }
}
