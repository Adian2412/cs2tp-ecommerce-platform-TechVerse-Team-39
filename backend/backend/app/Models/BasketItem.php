<?php
//this is basketitem model
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BasketItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'basket_id',
        'product_variant_id',
        'quantity',
    ];

    // relationships

    public function basket() {
        return $this->belongsTo(Basket::class);
    }

    public function variant() {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
