<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReturnModel extends Model
{
    use HasFactory;

    protected $table = 'returns';

    protected $fillable = [
        'order_item_id',
        'reason',
        'status',
    ];

    public function orderItem() {
        return $this->belongsTo(OrderItem::class, 'order_item_id');
    }
}
