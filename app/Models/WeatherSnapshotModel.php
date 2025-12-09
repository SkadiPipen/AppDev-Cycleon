<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WeatherSnapshotModel extends Model
{
    use HasFactory;

    protected $table = 'weather_snapshot';

    protected $fillable = [
        'weather_id',
        'duration',
        'timestamp'
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'duration' => 'integer'
    ];

    /**
     * Get the weather that owns this snapshot.
     */
    public function weather()
    {
        return $this->belongsTo(WeatherModel::class, 'weather_id');
    }


    /**
     * Check if snapshot is currently active.
     */
    public function isActive()
    {
        $now = now();
        return $this->timestamp <= $now &&
            (!$this->end_time || $this->end_time >= $now);
    }


}
