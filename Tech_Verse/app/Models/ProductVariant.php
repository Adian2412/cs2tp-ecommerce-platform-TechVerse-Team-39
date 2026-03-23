<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'variant_label',
        'price',
        'stock_qty',
        'low_stock_threshold',
    ];

    protected $casts = [
        'price'               => 'decimal:2',
        'stock_qty'           => 'integer',
        'low_stock_threshold' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function stock()
    {
        return $this->hasOne(Stock::class, 'product_variant_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'product_variant_id');
    }

    public function basketItems()
    {
        return $this->hasMany(BasketItem::class, 'product_variant_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_variant_id');
    }
}
