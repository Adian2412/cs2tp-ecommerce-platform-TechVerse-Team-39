<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffProfile extends Model
{
    use HasFactory;

    protected $table = 'staff_profiles';
    protected $primaryKey = 'id';

    protected $fillable = [
        'user_id',
        'managed_by',
        'job_title',
        'phone',
        'hire_date',
        'active',
    ];

    protected $casts = [
        'hire_date' => 'date',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function manager() {
        return $this->belongsTo(User::class, 'managed_by');
    }
}
