<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\StockController;
use App\Http\Controllers\EventsController;
use App\Http\Controllers\ForecastController;

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
