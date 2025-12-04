<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'role',
        'password_hash',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */


//relationships


    public function addresses(){
        return $this->hasMany(Address::class);
    }

  public function baskets() {
        return $this->hasOne(Basket::class);
    }

         public function orders() {
        return $this->hasMany(Order::class);
    }

      public function reviews() {
        return $this->hasMany(Review::class);
    }

    public function staffProfile() {
        return $this->hasMany(staffProfile::class);
    }

    protected function casts(): array
    {
        return [
          #  'email_verified_at' => 'datetime',
          //currently no email verification implemented
        ];
    }
    
}
