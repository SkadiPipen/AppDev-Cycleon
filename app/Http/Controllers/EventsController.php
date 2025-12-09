<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class EventsController extends Controller
{
    public function proxy(string $game = 'grow-a-garden'): JsonResponse
    {
        if ($game === 'grow-a-garden') {
            try {
                Log::info('🌤️ Fetching weather data for GAG');

                $response = Http::withOptions([
                    'timeout' => 10,
                ])->get('https://gagapi.onrender.com/weather');

                if ($response->successful()) {
                    $weatherData = $response->json();

                    if (isset($weatherData['type'])) {
                        Log::info('✅ Weather data received', ['type' => $weatherData['type']]);

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
                    }
                }

                Log::warning('⚠️ Weather API failed or returned invalid data');

            } catch (\Exception $e) {
                Log::error('❌ Weather API failed: ' . $e->getMessage());
            }

            // Return empty weather on failure
            return response()->json([
                'events' => [],
                'lastSeenEvents' => [],
                'nextEvent' => null,
                'timestamp' => now()->toISOString(),
            ]);
        }

        if ($game === 'plants-vs-brainrots') {
            try {
                $response = Http::withOptions([
                    'timeout' => 10,
                ])->withHeaders([
                    'x-api-key' => 'a8aa7169-6483-4862-88c7-7932893fee2d',
                    'Accept' => 'application/json',
                ])->get('https://alpha-v0-lama.3itx.tech/api/v1/plantvsbrainrot/Events');

                if ($response->successful()) {
                    return response()->json($response->json());
                }
            } catch (\Exception $e) {
                Log::error('❌ PvB API failed: ' . $e->getMessage());
            }
        }

        // Default fallback
        return response()->json([
            'events' => [],
            'lastSeenEvents' => [],
            'nextEvent' => null,
            'timestamp' => now()->toISOString(),
        ]);
    }
}
