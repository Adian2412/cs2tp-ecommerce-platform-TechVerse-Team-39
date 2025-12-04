<?php

namespace App\Models; //history test for sabira
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'line1',
        'line2',
        'city',
        'postcode',
        'country',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    //relationships
    public function user() {
        return $this->belongsTo(User::class);
    }
}
