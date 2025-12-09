<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_chance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('item')->onDelete('cascade');
            $table->decimal('chance', 5, 4)->default(0.0000); // e.g., 0.1234 for 12.34%
            $table->integer('amount')->default(1);
            $table->timestamps();

            $table->unique(['item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_chance');
    }
};
