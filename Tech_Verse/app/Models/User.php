<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password_hash',
        'role',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function setPasswordAttribute($value)
    {
        if (!is_string($value) || $value === '') {
            return;
        }

        // Avoid double-hashing when a bcrypt hash is already supplied.
        $this->attributes['password_hash'] = Str::startsWith($value, ['$2y$', '$2b$', '$argon'])
            ? $value
            : bcrypt($value);
    }

    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    public function basket()
    {
        return $this->hasOne(Basket::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function staffProfile()
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
