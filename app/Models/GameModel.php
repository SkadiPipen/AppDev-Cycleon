<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameModel extends Model
{
    use HasFactory;

    protected $table = 'game';

    protected $fillable = [
        'name',
    ];

    /**
     * Get all shops for the game.
     */
    public function shop(): HasMany
    {
        return $this->hasMany(ShopModel::class);
    }

    /**
     * Get all items for the game.
     */
    public function item(): HasMany
    {
        return $this->hasMany(ItemModel::class);
    }
}
