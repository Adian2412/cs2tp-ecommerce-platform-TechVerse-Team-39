<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'address_id',
        'status',
        'total',
    ];

    protected $casts = [
        'total' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    //relationships

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function address() {
        return $this->belongsTo(Address::class);
    }

    public function items() {
        return $this->hasMany(OrderItem::class);
    }
}
