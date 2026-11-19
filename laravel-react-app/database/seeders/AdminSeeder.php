<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Admin::firstOrCreate(
            [
                'email' => 'admin@example.com',
            ],
            [
                'name' => 'Super Admin',
                'password' => Hash::make(env('DEFAULT_ADMIN_PASSWORD', 'Admin@123')),
                'role' => 'admin',
                'status' => true,
                'password_changed_at' => now(),
                'last_login_at' => null,
                'last_login_ip' => null,
            ]
        );
    }
}
