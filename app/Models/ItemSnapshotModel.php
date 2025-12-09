<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemSnapshotModel extends Model
{
    use HasFactory;

    protected $table = 'item_snapshot';

    protected $fillable = [
        'item_id',
        'shop_id',
        'quantity',
        'timestamp',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    /**
     * Get the item for the snapshot.
     */
    public function item()
    {
        return $this->belongsTo(ItemModel::class, 'item_id');
    }

    /**
     * Get the shop for the snapshot.
     */
    public function shop()
    {
        return $this->belongsTo(ShopModel::class, 'shop_id');
    }
}
