<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

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
    ];

    // Map Laravel's expected 'password' attribute to our 'password_hash' column
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function baskets()
    {
        return $this->hasMany(Basket::class);
    }

    public function gdprDeletionRequests()
    {
        return $this->hasMany(GdprDeletionRequest::class);
    }
}
