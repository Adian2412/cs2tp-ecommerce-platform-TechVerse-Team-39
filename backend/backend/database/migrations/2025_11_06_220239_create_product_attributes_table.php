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
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            // $table->string('uid')->primary(); // optional custom primary key
          
          // Foreign key linking attribute to a product
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();

            $table->string('attribute_name');
            $table->string('attribute_value');

            // Avoid calling timestamps() here in case another migration or macro
            // would inadvertently add duplicate created_at/updated_at columns.
            // If you need timestamps, run a dedicated migration to add them.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_attributes');
    }
};
