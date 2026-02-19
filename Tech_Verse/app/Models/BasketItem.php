<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BasketItem extends Model
{
    protected $fillable = ['basket_id', 'variant_id', 'quantity'];

    public function basket()
    {
        return $this->belongsTo(Basket::class);
    }

    public function productVariant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
