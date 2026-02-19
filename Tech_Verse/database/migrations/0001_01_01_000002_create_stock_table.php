<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->integer('quantity')->default(0);
            $table->integer('low_stock_threshold')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock');
    }
};

