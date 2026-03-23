<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// CANONICAL product_images migration.
// Replaces both:
//   2025_01_01_000017_create_product_images_table.php  (had 'url' column — delete this)
//   2025_11_06_220239_create_product_images_table.php  (had 'image_path' — delete this)
// Keep ONLY this file. Uses 'image_path' to match ProductImage model + ProductApiController.

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')
                  ->constrained('products')
                  ->cascadeOnDelete();
            $table->string('image_path');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
