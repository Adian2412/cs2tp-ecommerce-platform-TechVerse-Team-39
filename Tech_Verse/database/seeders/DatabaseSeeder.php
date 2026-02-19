<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Admin user
        User::factory()->admin()->create([
            'name'  => 'TechVerse Admin',
            'email' => 'admin@techverse.local',
            'password_hash' => Hash::make('password'),
        ]);

        // Staff user
        User::factory()->staff()->create([
            'name'  => 'Inventory Staff',
            'email' => 'staff@techverse.local',
            'password_hash' => Hash::make('password'),
        ]);

        // Customer user
        User::factory()->create([
            'name'  => 'Test Customer',
            'email' => 'customer@techverse.local',
            'password_hash' => Hash::make('password'),
        ]);
    }
}
