<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_variant_id',
        'movement_type',
        'quantity',
        'note',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'created_at' => 'datetime',
    ];

    //relationships
    public function variant() {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }
}
