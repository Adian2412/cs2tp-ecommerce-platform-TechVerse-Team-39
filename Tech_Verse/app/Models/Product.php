<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'slug', 'description',
        'brand', 'image_url', 'active',
    ];

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
}
