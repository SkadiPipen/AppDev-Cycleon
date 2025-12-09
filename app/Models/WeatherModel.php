<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WeatherModel extends Model
{
    use HasFactory;

    protected $table = 'weather';

    protected $fillable = [
        'name',
        'game_id'
    ];


    public function game()
    {
        return $this->belongsTo(GameModel::class, 'game_id');
    }

    /**
     * Get the weather snapshots for this weather.
     */
    public function weatherSnapshots()
    {
        return $this->hasMany(WeatherSnapshotModel::class, 'weather_id');
    }

    /**
     * Get the latest snapshot for this weather.
     */
    public function latestSnapshot()
    {
        return $this->hasOne(WeatherSnapshotModel::class)->latestOfMany();
    }

    /**
     * Get active weather snapshots.
     */
    public function activeSnapshot()
    {
        return $this->weatherSnapshot()->where('timestamp', '>=', now()->subHour());
    }

    /**
     * Check if this weather is currently active.
     */
    public function isCurrentlyActive()
    {
        return $this->activeSnapshot()->exists();
    }
}
