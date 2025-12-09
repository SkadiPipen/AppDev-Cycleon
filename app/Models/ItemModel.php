<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ItemModel extends Model
{
    use HasFactory;

    protected $table = 'item';

    protected $fillable = [
        'name',
        'type',
        'rarity',
        'game_id',
        'is_obtainable',
    ];

    protected $attributes = [
        'is_obtainable' => true,
    ];

    protected $casts = [
        'is_obtainable' => 'boolean',
    ];

    /**
     * Get the game that owns the item.
     */
    public function game()
    {
        return $this->belongsTo(GameModel::class, 'game_id');
    }

    /**
     * Get all snapshots for the item.
     */
    public function itemSnapshots()
    {
        return $this->hasMany(ItemSnapshotModel::class, 'item_id');
    }

    /**
     * Get the stock chance for the item.
     */
    public function stockChance(): HasOne
    {
        return $this->hasOne(StockChanceModel::class);
    }

    /**
     * Get all shops through snapshots.
     */
    public function shop()
    {
        return $this->hasManyThrough(ShopModel::class, ItemSnapshotModel::class);
    }


}
