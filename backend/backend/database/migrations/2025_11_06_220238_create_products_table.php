<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
             // $table->string('uid')->primary(); // Uncomment if using uid instead
            $table->string('name');
            $table->string('slug')->nullable()->index();
            $table->string('sku')->unique();

             //if category is deleted all products are deleted
              $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
             //if a brand is deleted all its products are delete
              $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
             //if user is deleted all their products are deleted
              $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->decimal('price',10,2);
            $table->integer('stock');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('tracking_link')->nullable();
            $table->boolean('is_sold')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
