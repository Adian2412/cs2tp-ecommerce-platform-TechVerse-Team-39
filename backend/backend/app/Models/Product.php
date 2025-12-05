<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;
    protected $fillable = [
        'category_id',
        'brand_id',
        'user_id',
        'sku',
        'name',
        'slug',
        'description',
        'price',
        'stock',
        'image_url',
        'tracking_link',
        'is_sold',
        'is_active',

    ];



    //relationships

    //each product belongs to a category
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    //each product belongs to a user (seller)
    public function user()
    {
        return $this->belongsTo(User::class);
    }
     

    //each product has many reviews
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }


//each product has many attributes
    public function attributes()
    {
        return $this->hasMany(ProductAttribute::class);
    }

//each product has many variants
    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
   


    
    //images aren't stored in this table but in a separate one
    //images belong to product
    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    protected $casts = [
        'is_active' => 'boolean',
        'is_sold' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];




}
