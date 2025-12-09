<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\StockController;
use App\Http\Controllers\EventsController;

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

