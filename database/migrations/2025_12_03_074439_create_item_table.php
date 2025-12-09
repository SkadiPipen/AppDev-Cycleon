<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->string('rarity');
            $table->foreignId('game_id')->constrained('game')->onDelete('cascade');
            $table->boolean('is_obtainable')->default(true);
            $table->timestamps();

            $table->unique(['name', 'game_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item');
    }
};
