<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\Product;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku',
        'variant_label',
        'price',
        'stock_qty',
        'low_stock_threshold',
    ];

    protected $casts = [
        'price' => 'float',
        'stock_qty' => 'integer',
        'low_stock_threshold' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function product() {
        return $this->belongsTo(Product::class);
    }

    public function stock() {
        return $this->hasOne(Stock::class);
    }

    public function stockMovements() {
        return $this->hasMany(StockMovement::class);
    }

    public function basketItems() {
        return $this->hasMany(BasketItem::class);
    }

    public function orderItems() {
        return $this->hasMany(OrderItem::class);
    }
}
