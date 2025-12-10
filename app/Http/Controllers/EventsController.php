<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\GameModel;
use App\Models\WeatherModel;
use App\Models\WeatherSnapshotModel;

class EventsController extends Controller
{
    private $gameId;

    public function __construct()
    {
        $this->gameId = $this->getGameId();
    }

    private function getGameId()
    {
        $game = GameModel::firstOrCreate(
            ['name' => 'Grow a Garden'],
            ['name' => 'Grow a Garden']
        );

        return $game->id;
    }

    public function proxy(string $game = 'grow-a-garden'): JsonResponse
    {
        if ($game === 'grow-a-garden') {
            try {
                Log::info('🌤️ Fetching weather data for GAG');

                $context = stream_context_create([
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                    ],
                    'http' => [
                        'timeout' => 10,
                    ]
                ]);

                $response = file_get_contents('https://gagapi.onrender.com/weather', false, $context);

                if ($response === false) {
                    throw new \Exception('Failed to fetch weather data');
                }

                $weatherData = json_decode($response, true);

                if ($weatherData && isset($weatherData['type'])) {
                    Log::info('✅ Weather data received', ['type' => $weatherData['type']]);

                    // STORE WEATHER DATA
                    $this->storeWeatherData($weatherData);

                    $lastSeen = $weatherData['lastUpdated'] ?? 'now';
                    $lastSeenTimestamp = is_numeric($lastSeen) ? $lastSeen : strtotime($lastSeen);

                    return response()->json([
                        'events' => [],
                        'lastSeenEvents' => [[
                            'Name' => $weatherData['type'],
                            'DisplayName' => ucfirst($weatherData['type']),
                            'Image' => 'https://cdn.3itx.tech/image/GrowAGarden/' . strtolower($weatherData['type']),
                            'Description' => implode(', ', $weatherData['effects'] ?? ['No effects']),
                            'LastSeen' => $lastSeenTimestamp,
                            'start_timestamp_unix' => $lastSeenTimestamp,
                            'end_timestamp_unix' => $lastSeenTimestamp + 3600,
                            'active' => $weatherData['active'] ?? false,
                            'duration' => 3600,
                        ]],
                        'nextEvent' => null,
                        'timestamp' => now()->toISOString(),
                    ]);
                } else {
                    Log::warning('⚠️ Invalid weather data format', ['data' => $weatherData]);
                }
            } catch (\Exception $e) {
                Log::error('❌ Weather API failed: ' . $e->getMessage());

                // Try to get last stored weather as fallback
                try {
                    $lastWeather = WeatherSnapshotModel::with('weather')
                        ->whereHas('weather', function($q) {
                            $q->where('game_id', $this->gameId);
                        })
                        ->latest()
                        ->first();

                    if ($lastWeather) {
                        Log::info('🔄 Using cached weather data');
                        return response()->json([
                            'events' => [],
                            'lastSeenEvents' => [[
                                'Name' => $lastWeather->weather->name,
                                'DisplayName' => ucfirst($lastWeather->weather->name),
                                'Image' => 'https://cdn.3itx.tech/image/GrowAGarden/' . strtolower($lastWeather->weather->name),
                                'Description' => 'Last known weather',
                                'LastSeen' => $lastWeather->timestamp->timestamp,
                                'start_timestamp_unix' => $lastWeather->timestamp->timestamp,
                                'end_timestamp_unix' => $lastWeather->timestamp->timestamp + 3600,
                                'active' => false,
                                'duration' => 3600,
                            ]],
                            'nextEvent' => null,
                            'timestamp' => now()->toISOString(),
                        ]);
                    }
                } catch (\Exception $fallbackError) {
                    Log::error('❌ Fallback also failed: ' . $fallbackError->getMessage());
                }
            }
        } else if ($game === 'plants-vs-brainrots') {
            $url = 'https://alpha-v0-lama.3itx.tech/api/v1/plantvsbrainrot/Events';
            $apiKey = 'a8aa7169-6483-4862-88c7-7932893fee2d';

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'x-api-key: ' . $apiKey,
                    'Accept: application/json',
                ],
                CURLOPT_TIMEOUT => 10,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);

            $response = curl_exec($ch);
            curl_close($ch);

            if ($response) {
                $data = json_decode($response, true);
                if ($data) {
                    return response()->json($data);
                }
            }
        }

        // Default fallback response
        return response()->json([
            'events' => [],
            'lastSeenEvents' => [],
            'nextEvent' => null,
            'timestamp' => now()->toISOString(),
        ]);
    }

    private function storeWeatherData(array $weatherData)
    {
        try {
            DB::beginTransaction();

            // Get or create weather type
            $weather = WeatherModel::firstOrCreate(
                [
                    'name' => $weatherData['type'],
                    'game_id' => $this->gameId
                ],
                [
                    'name' => $weatherData['type'],
                    'game_id' => $this->gameId
                ]
            );

            // Create snapshot
            WeatherSnapshotModel::create([
                'weather_id' => $weather->id,
                'duration' => $weatherData['duration'] ?? 3600,
                'timestamp' => now()
            ]);

            DB::commit();
            Log::info("💾 Stored weather data", ['type' => $weatherData['type']]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Failed to store weather data: " . $e->getMessage());
        }
    }
}
