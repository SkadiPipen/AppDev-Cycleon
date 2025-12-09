<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopModel extends Model
{
    use HasFactory;

    protected $table = 'shop';

    protected $fillable = [
        'name',
        'game_id',
    ];

    /**
     * Get the game that owns the shop.
     */
    public function game()
    {
        return $this->belongsTo(GameModel::class, 'game_id');
    }

    /**
     * Get all snapshots for the shop.
     */
    public function itemSnapshots()
    {
        return $this->hasMany(ItemSnapshotModel::class, 'shop_id');
    }
    /**
     * Get all items through snapshots.
     */
    public function item()
    {
        return $this->hasManyThrough(ItemModel::class, ItemSnapshotModel::class);
    }
}
