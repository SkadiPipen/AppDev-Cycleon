<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->foreignId('game_id')->constrained('game')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['name', 'game_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop');
    }
};
