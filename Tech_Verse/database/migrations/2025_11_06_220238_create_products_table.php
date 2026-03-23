<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // seller
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('brand')->nullable();          // NOT unique — multiple products per brand
            $table->string('image_url')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_sold')->default(false);   // seller can mark as sold
            $table->timestamps();

            $table->index(['category_id', 'active']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
