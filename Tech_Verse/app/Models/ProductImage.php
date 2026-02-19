<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProductImage extends Model
{
    use HasFactory;
    protected $fillable = [
        'product_id',
        'image_path',
        'is_primary',
    ];
    //each product image belongs to a product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}


//This may not be needed if images are handled differently