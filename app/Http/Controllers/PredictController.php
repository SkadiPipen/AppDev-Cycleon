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
            Log::info('🔮 [ITEM PREDICT] Starting prediction for: ' . $item);

            $baseUrl = $this->getBaseUrl();
            $decodedItem = urldecode($item);

            Log::info('🔍 Decoded item: ' . $decodedItem);

            // The API seems to expect items with %20 encoding (not +)
            $itemForApi = $decodedItem;
            $apiUrl = $baseUrl . '/predict/items/' . rawurlencode($itemForApi);

            Log::info('🔗 External API URL: ' . $apiUrl);

            $response = Http::withOptions([
                'timeout' => 30,
                'connect_timeout' => 10,
                'verify' => false,
            ])->get($apiUrl);

            Log::info('📊 External API Response Status: ' . $response->status());

            if ($response->successful()) {
                $predictionData = $response->json();
                Log::info('✅ Item prediction successful', [
                    'item' => $itemForApi,
                    'has_confidence_windows' => isset($predictionData['confidence_windows']),
                    'confidence_windows_count' => isset($predictionData['confidence_windows']) ? count($predictionData['confidence_windows']) : 0,
                ]);

                // Ensure all arrays exist
                $predictionData['next_occurrences'] = $predictionData['next_occurrences'] ?? [];
                $predictionData['cycle_probabilities'] = $predictionData['cycle_probabilities'] ?? [];
                $predictionData['confidence_windows'] = $predictionData['confidence_windows'] ?? [];

                return response()->json($predictionData);
            }

            // Handle 404 - item not found
            if ($response->status() === 404) {
                $errorBody = $response->json();
                $errorMessage = $errorBody['detail'] ?? 'Item not found in prediction database';

                Log::warning('⚠️ Item not found in API', [
                    'item' => $itemForApi,
                    'error' => $errorMessage
                ]);

                return response()->json([
                    'item' => $itemForApi,
                    'prediction_mode' => 'error',
                    'next_occurrences' => [],
                    'cycle_probabilities' => [],
                    'confidence_windows' => [],
                    'error' => $errorMessage
                ], 404);
            }

            // Handle other errors
            Log::warning('⚠️ Item prediction API error', [
                'status' => $response->status(),
                'item' => $itemForApi,
                'response' => $response->body()
            ]);

            return response()->json([
                'item' => $itemForApi,
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'cycle_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Prediction API returned status: ' . $response->status()
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('❌ Item prediction failed: ' . $e->getMessage());

            return response()->json([
                'item' => $item ?? 'unknown',
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'cycle_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Connection failed: ' . $e->getMessage()
            ], 503);
        }
    }

    public function predictWeather(string $weather): JsonResponse
    {
        try {
            Log::info('🌤️ [WEATHER PREDICT] Starting prediction for: ' . $weather);

            $baseUrl = $this->getBaseUrl();
            $decodedWeather = urldecode($weather);

            Log::info('🔍 Decoded weather: ' . $decodedWeather);

            // Try different formats - API might expect lowercase with underscores
            $weatherFormats = [
                strtolower($decodedWeather),
                str_replace(' ', '_', strtolower($decodedWeather)),
                $decodedWeather, // Original
            ];

            $uniqueFormats = array_unique($weatherFormats);

            $lastError = null;
            $lastResponse = null;

            foreach ($uniqueFormats as $weatherForApi) {
                try {
                    $apiUrl = $baseUrl . '/predict/weather/' . rawurlencode($weatherForApi);
                    Log::info('🔄 Trying weather format: ' . $apiUrl);

                    $response = Http::withOptions([
                        'timeout' => 15,
                        'connect_timeout' => 5,
                        'verify' => false,
                    ])->get($apiUrl);

                    if ($response->successful()) {
                        $predictionData = $response->json();
                        Log::info('✅ Weather prediction successful', [
                            'weather' => $weatherForApi,
                            'format_used' => $weatherForApi
                        ]);

                        // Ensure all arrays exist
                        $predictionData['next_occurrences'] = $predictionData['next_occurrences'] ?? [];
                        $predictionData['time_window_probabilities'] = $predictionData['time_window_probabilities'] ?? [];
                        $predictionData['confidence_windows'] = $predictionData['confidence_windows'] ?? [];

                        return response()->json($predictionData);
                    }

                    $errorBody = $response->json();
                    $lastError = $errorBody['detail'] ?? 'HTTP ' . $response->status();
                    $lastResponse = $response->body();

                    Log::warning('⚠️ Weather format failed: ' . $weatherForApi, [
                        'status' => $response->status(),
                        'error' => $lastError
                    ]);

                } catch (\Exception $e) {
                    Log::warning('⚠️ Weather format error: ' . $e->getMessage());
                    $lastError = $e->getMessage();
                }
            }

            // All formats failed
            Log::error('❌ All weather formats failed for: ' . $decodedWeather);

            return response()->json([
                'weather' => $decodedWeather,
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'time_window_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Weather prediction failed: ' . ($lastError ?? 'Unknown error'),
                'suggestion' => 'Try a different weather name like "sunny", "rain", or "storm"'
            ], 404);

        } catch (\Exception $e) {
            Log::error('❌ Weather prediction failed: ' . $e->getMessage());

            return response()->json([
                'weather' => $weather ?? 'unknown',
                'prediction_mode' => 'error',
                'next_occurrences' => [],
                'time_window_probabilities' => [],
                'confidence_windows' => [],
                'error' => 'Connection failed: ' . $e->getMessage()
            ], 503);
        }
    }
}
