<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\StockController;
use App\Http\Controllers\EventsController;
use App\Http\Controllers\ForecastController;
use App\Http\Controllers\PredictController;

Route::get('/', function () {
    return redirect()->route('grow-a-garden');
})->name('home');

Route::get('grow-a-garden', function () {
    return Inertia::render('grow-a-garden', []);
})->name('grow-a-garden');

// Stock endpoints
Route::get('/proxy/stock/grow-a-garden', [StockController::class, 'proxy'])->defaults('game', 'grow-a-garden');
Route::get('/proxy/stock', [StockController::class, 'proxy'])->defaults('game', 'grow-a-garden');

// Events endpoints
Route::get('/proxy/events/grow-a-garden', [EventsController::class, 'proxy'])->defaults('game', 'grow-a-garden');
Route::get('/proxy/events', [EventsController::class, 'proxy'])->defaults('game', 'grow-a-garden');

// Forecast API routes
Route::get('/proxy/forecast/items', [ForecastController::class, 'getItems']);
Route::get('/proxy/forecast/weather', [ForecastController::class, 'getWeather']);
Route::get('/proxy/forecast/weather-stats/{weather}', [ForecastController::class, 'getWeatherStats']);
Route::get('/proxy/forecast/item-stats/{item}', [ForecastController::class, 'getItemStats']);
Route::get('/proxy/forecast/all-item-stats', [ForecastController::class, 'getAllItemStats']);
Route::get('/proxy/forecast/all-weather-stats', [ForecastController::class, 'getAllWeatherStats']);
Route::get('/proxy/forecast/items-by-category/{category}', [ForecastController::class, 'getItemsByCategory']);
Route::get('/proxy/forecast/debug-items', [ForecastController::class, 'debugItemsWithStats']);
Route::get('/proxy/predict/items/{item}', [PredictController::class, 'predictItem']);

Route::get('/test-route', function () {
    return response()->json([
        'status' => 'OK',
        'predict_routes' => [
            '/proxy/predict/items/Basic_Sprinkler',
            '/proxy/predict/items/test-item',
            '/proxy/predict/weather/sunny'
        ],
        'timestamp' => now()
    ]);
});

// In routes/web.php
Route::get('/debug/external-api', function () {
    try {
        $baseUrl = 'https://cycleonapi-production.up.railway.app';

        // Test 1: Check if API is reachable
        $pingResponse = Http::withOptions(['verify' => false])
            ->timeout(10)
            ->get($baseUrl);

        // Test 2: Try a simple prediction
        $testItem = 'test';
        $predictionUrl = $baseUrl . '/predict/items/' . $testItem;
        $predictionResponse = Http::withOptions(['verify' => false])
            ->timeout(10)
            ->get($predictionUrl);

        return response()->json([
            'api_base_url' => $baseUrl,
            'ping_status' => $pingResponse->status(),
            'ping_successful' => $pingResponse->successful(),
            'prediction_test_url' => $predictionUrl,
            'prediction_status' => $predictionResponse->status(),
            'prediction_successful' => $predictionResponse->successful(),
            'prediction_body' => $predictionResponse->body(),
            'timestamp' => now()
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'api_base_url' => $baseUrl,
            'timestamp' => now()
        ], 500);
    }
});

Route::get('/debug/predict/known-items', function () {
    // Try some common items that might exist
    $testItems = [
        'Basic Sprinkler',
        'Watering Can',
        'Shovel',
        'Seed Pack',
        'Fertilizer',
        'Rain'
    ];

    $baseUrl = 'https://cycleonapi-production.up.railway.app';
    $results = [];

    foreach ($testItems as $item) {
        try {
            $apiUrl = $baseUrl . '/predict/items/' . urlencode($item);
            $response = Http::withOptions(['verify' => false])
                ->timeout(10)
                ->get($apiUrl);

            $results[$item] = [
                'status' => $response->status(),
                'success' => $response->successful(),
                'exists' => $response->status() !== 404,
                'response' => $response->successful() ? 'Has data' : $response->body()
            ];

        } catch (\Exception $e) {
            $results[$item] = [
                'status' => 'error',
                'success' => false,
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }

        // Small delay between requests
        usleep(200000);
    }

    return response()->json([
        'test_items' => $results,
        'api_base_url' => $baseUrl,
        'timestamp' => now()
    ]);
});

// Prediction routes
Route::prefix('proxy/predict')->group(function () {
    Route::get('/items/{item}', [PredictController::class, 'predictItem']);
    Route::get('/weather/{weather}', [PredictController::class, 'predictWeather']);

});

Route::get('/debug/predict-api', [PredictController::class, 'debugApi']);
