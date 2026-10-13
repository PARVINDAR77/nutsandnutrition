<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Services\Admin\SettingService;

class SettingsSeeder extends Seeder
{
    private SettingService $settingService;

    public function __construct(SettingService $settingService)
    {
        $this->settingService = $settingService;
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->settingService->initializeSettings();

        // Ensure Nuts & Nutrition store settings and contact info are set
        $defaults = [
            ['group' => 'general', 'key' => 'store_name', 'value' => 'Nuts & Nutrition', 'type' => 'text', 'label' => 'Store Name'],
            ['group' => 'general', 'key' => 'store_email', 'value' => 'nutsandnutrition@gmail.com', 'type' => 'text', 'label' => 'Store Email'],
            ['group' => 'general', 'key' => 'store_phone', 'value' => '9106234089', 'type' => 'text', 'label' => 'Phone Number'],
            ['group' => 'general', 'key' => 'store_address', 'value' => "2/16 Arved Transcube Plaza, Near Ranip Bus Depo Terminal, Ranip,\nAhmedabad, Gujarat, 382480", 'type' => 'textarea', 'label' => 'Store Address'],
            ['group' => 'contact_info', 'key' => 'address_line_1', 'value' => '2/16 Arved Transcube Plaza, Near Ranip Bus Depo Terminal, Ranip', 'type' => 'string', 'label' => 'Address Line 1'],
            ['group' => 'contact_info', 'key' => 'address_line_2', 'value' => 'Ahmedabad, Gujarat, 382480', 'type' => 'string', 'label' => 'Address Line 2'],
            ['group' => 'contact_info', 'key' => 'phone', 'value' => '+91 9106234089', 'type' => 'string', 'label' => 'Phone'],
            ['group' => 'contact_info', 'key' => 'hours', 'value' => 'Mon - Sat, 9am - 7pm', 'type' => 'string', 'label' => 'Hours'],
            ['group' => 'contact_info', 'key' => 'email', 'value' => 'nutsandnutrition@gmail.com', 'type' => 'string', 'label' => 'Email'],
            ['group' => 'contact_info', 'key' => 'response_time', 'value' => 'We reply within 24 hours', 'type' => 'string', 'label' => 'Response Time'],
        ];

        foreach ($defaults as $item) {
            \App\Models\Setting::updateOrCreate(
                ['key' => $item['key']],
                $item
            );
        }

        \App\Helpers\SettingsHelper::clearCache();

        $this->command->info('Settings initialized successfully.');
    }
}
