<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// NOTE: Renamed from 0001_01_01_000002 to 0001_01_01_000008
// so it runs AFTER product_variants (000006). Foreign key requirement.

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')
                  ->unique()
                  ->constrained('product_variants')
                  ->cascadeOnDelete();
            $table->integer('quantity')->default(0);
            $table->integer('low_stock_threshold')->default(5);
            $table->timestamp('last_updated')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock');
    }
};
