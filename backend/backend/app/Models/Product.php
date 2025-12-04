<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'brand',   //string field instead of foreign key
        'image_url',
        'active',
       
    ];



    //relationships

    //each product belongs to a category
    public function category()
    {
        return $this->belongsTo(Category::class);
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
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];




}
