<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class PredictController extends Controller
{
    /**
     * Base URL for the prediction API
     */
    private function getBaseUrl(): string
    {
        return 'https://cycleonapi-production.up.railway.app';
    }

    public function predictItem(string $item): JsonResponse
    {
        try {
            Log::info('🔮 [PREDICT START] Item parameter: ' . $item);

            $baseUrl = 'https://cycleonapi-production.up.railway.app';
            $decodedItem = urldecode($item);

            Log::info('🔍 Decoded item: ' . $decodedItem);

            // Try different encoding methods
            $encodingMethods = [
                'rawurlencode' => rawurlencode($decodedItem),  // Use %20 for spaces
                'urlencode' => urlencode($decodedItem),        // Use + for spaces (what we were using)
                'str_replace' => str_replace(' ', '%20', $decodedItem), // Manual %20
                'no_encode' => $decodedItem,                   // No encoding at all
            ];

            Log::info('🔄 Encoding methods:', $encodingMethods);

            $lastError = null;
            $lastResponse = null;

            foreach ($encodingMethods as $methodName => $encodedItem) {
                try {
                    $apiUrl = $baseUrl . '/predict/items/' . $encodedItem;
                    Log::info("🔄 Trying encoding '$methodName': $apiUrl");

                    $response = Http::withOptions([
                        'timeout' => 15,
                        'connect_timeout' => 5,
                        'verify' => false,
                    ])->get($apiUrl);

                    Log::info("📊 Response status for '$methodName': " . $response->status());

                    if ($response->successful()) {
                        Log::info("✅ Success with encoding '$methodName'");
                        $predictionData = $response->json();

                        // Add debug info
                        $predictionData['_debug'] = [
                            'original_item' => $item,
                            'successful_encoding' => $methodName,
                            'encoded_item_sent' => $encodedItem,
                            'api_url_used' => $apiUrl
                        ];

                        return response()->json($predictionData);
                    }

                    $errorBody = $response->json();
                    $lastError = $errorBody['detail'] ?? 'HTTP ' . $response->status();
                    $lastResponse = $response->body();

                    Log::warning("⚠️ Encoding '$methodName' failed: " . $lastError);

                } catch (\Exception $e) {
                    Log::warning("⚠️ Encoding '$methodName' error: " . $e->getMessage());
                    $lastError = $e->getMessage();
                }
            }

            // If all encoding methods failed
            Log::error('❌ All encoding methods failed for: ' . $decodedItem);

            return response()->json([
                'item' => $decodedItem,
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'cycle_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Item not found in prediction database: ' . ($lastError ?? 'Unknown error'),
                'debug' => [
                    'original_item' => $item,
                    'decoded_item' => $decodedItem,
                    'tried_encodings' => $encodingMethods,
                    'last_response' => $lastResponse
                ]
            ], 404);

        } catch (\Exception $e) {
            Log::error('❌ Predict controller error: ' . $e->getMessage());

            return response()->json([
                'item' => $item ?? 'unknown',
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'cycle_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function predictWeather(string $weather): JsonResponse
    {
        try {
            Log::info('🌤️ Fetching weather prediction: ' . $weather);

            $response = Http::withOptions([
                'timeout' => 30,
                'connect_timeout' => 10,
                'verify' => false,
            ])->get($this->getBaseUrl() . '/predict/weather/' . urlencode(strtolower($weather)));

            if ($response->successful()) {
                $predictionData = $response->json();
                Log::info('✅ Weather prediction received', ['weather' => $weather]);

                return response()->json($predictionData);
            }

            Log::warning('⚠️ Weather prediction API failed', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return response()->json([
                'weather' => $weather,
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'time_window_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'API returned status: ' . $response->status()
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('❌ Weather prediction failed: ' . $e->getMessage());

            return response()->json([
                'weather' => $weather,
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'time_window_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Connection failed: ' . $e->getMessage()
            ], 503);
        }
    }
}
