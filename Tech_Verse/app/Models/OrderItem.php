<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'order_items';

    protected $fillable = [
        'order_id',
        'product_variant_id',
        'unit_price',
        'quantity',
    ];

    protected $casts = [
        'unit_price' => 'float',
        'quantity' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function returns()
    {
        return $this->hasMany(ReturnModel::class, 'order_item_id');
    }
}
