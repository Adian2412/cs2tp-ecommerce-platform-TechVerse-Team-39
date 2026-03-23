<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'user_id',
        'name',
        'slug',
        'description',
        'brand',
        'image_url',
        'active',
        'is_sold',
    ];

    protected $casts = [
        'active'     => 'boolean',
        'is_sold'    => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'price',
        'stock',
        'is_active',
        'low_stock_threshold',
        'is_low_stock',
        'is_out_of_stock',
        'availability_label',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function attributes()
    {
        return $this->hasMany(ProductAttribute::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class, 'product_id');
    }

    // ── Computed attributes ────────────────────────────────────────────────────

    protected function resolvePrimaryVariant(): ?ProductVariant
    {
        return $this->relationLoaded('variants')
            ? $this->variants->first()
            : $this->variants()->with('stock')->orderBy('id')->first();
    }

    public function getPriceAttribute(): ?float
    {
        $variant = $this->resolvePrimaryVariant();
        return $variant ? (float) $variant->price : null;
    }

    public function getStockAttribute(): int
    {
        $variant = $this->resolvePrimaryVariant();
        if (!$variant) return 0;
        if ($variant->relationLoaded('stock') && $variant->stock) {
            return (int) $variant->stock->quantity;
        }
        if ($variant->stock) {
            return (int) $variant->stock->quantity;
        }
        return (int) ($variant->stock_qty ?? 0);
    }

    public function getLowStockThresholdAttribute(): int
    {
        $variant = $this->resolvePrimaryVariant();
        if (!$variant) return 0;
        if ($variant->relationLoaded('stock') && $variant->stock && $variant->stock->low_stock_threshold !== null) {
            return (int) $variant->stock->low_stock_threshold;
        }
        if ($variant->stock && $variant->stock->low_stock_threshold !== null) {
            return (int) $variant->stock->low_stock_threshold;
        }
        return (int) ($variant->low_stock_threshold ?? 5);
    }

    public function getIsActiveAttribute(): bool
    {
        return (bool) ($this->attributes['active'] ?? false);
    }

    public function getIsOutOfStockAttribute(): bool
    {
        return $this->stock <= 0;
    }

    public function getIsLowStockAttribute(): bool
    {
        if (!$this->is_active || $this->is_sold) return false;
        $threshold = $this->low_stock_threshold;
        $stock = $this->stock;
        return $stock > 0 && $threshold > 0 && $stock <= $threshold;
    }

    public function getAvailabilityLabelAttribute(): string
    {
        if ($this->is_sold)   return 'Sold';
        if (!$this->is_active) return 'Unavailable';
        if ($this->stock <= 0) return 'Out of stock';
        if ($this->is_low_stock) return 'Low stock';
        return 'In stock';
    }
}
