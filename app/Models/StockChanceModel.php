<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockChanceModel extends Model
{
    use HasFactory;

    protected $table = 'stock_chance';

    protected $fillable = [
        'item_id',
        'chance',
        'amount',
    ];

    protected $casts = [
        'chance' => 'decimal:4',
    ];

    /**
     * Get the item that owns the stock chance.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
