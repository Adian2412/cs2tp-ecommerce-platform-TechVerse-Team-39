<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_variant_id',
        'quantity',
        'low_stock_threshold',
        'last_updated',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'last_updated' => 'datetime',
    ];

    //relationships

    public function variant() {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
