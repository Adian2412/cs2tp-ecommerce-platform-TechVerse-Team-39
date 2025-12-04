<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    //decides colums that can be mass assigned
    use HasFactory;
    protected $fillable = [
        'name',
        'slug',
    ];


    //relationships
public function products()
    {
        //each category has many products
        return $this->hasMany(Product::class);
    }
}


