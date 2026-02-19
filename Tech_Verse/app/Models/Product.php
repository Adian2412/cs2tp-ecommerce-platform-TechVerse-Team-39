<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'seller_id', 'category_id', 'title', 'description',
        'brand', 'condition', 'is_active',
    ];

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
}
