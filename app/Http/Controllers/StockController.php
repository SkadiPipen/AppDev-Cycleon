<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\GameModel;
use App\Models\ItemModel;
use App\Models\ShopModel;
use App\Models\WeatherModel;
use App\Models\ItemSnapshotModel;
use App\Models\WeatherSnapshotModel;

class StockController extends Controller
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

    public function proxy(Request $request, $game = 'grow-a-garden')
    {
        if ($game === 'grow-a-garden') {
            try {
                Log::info('🔄 Fetching ALL GAG data');

                $response = Http::withOptions([
                    'verify' => false,
                    'timeout' => 30,
                ])->get('https://gagapi.onrender.com/alldata');

                if (!$response->successful()) {
                    Log::error('❌ Failed to fetch GAG data: ' . $response->status());
                    return $this->fetchIndividualData();
                }

                $data = $response->json();

                // DEBUG: Log all keys
                Log::info('🔍 All keys in response:', array_keys($data));

                // Check if 'honey' exists (this is the eventshop!)
                if (isset($data['honey'])) {
                    Log::info('🍯 Found "honey" key with ' . count($data['honey']) . ' items');
                    if (count($data['honey']) > 0) {
                        Log::info('🔍 First honey item:', $data['honey'][0]);
                    }
                }

                // Store data in database (optional)
                // $this->storeAllData($data);

                // Return data with CORRECT KEY for eventshop
                return response()->json([
                    'seed_stock' => $this->transformItems($data['seeds'] ?? []),
                    'gear_stock' => $this->transformItems($data['gear'] ?? []),
                    'egg_stock' => $this->transformItems($data['eggs'] ?? []),
                    'cosmetic_stock' => $this->transformItems($data['cosmetics'] ?? []),
                    'event_shop_stock' => $this->transformItems($data['honey'] ?? []), // ← Use 'honey' not 'eventshop'!
                    // Also include traveling merchant if needed
                    'traveling_merchant' => $data['travelingMerchant'] ?? null,
                    // Raw data for debugging
                    'raw_seeds' => $data['seeds'] ?? [],
                    'raw_gear' => $data['gear'] ?? [],
                    'raw_eggs' => $data['eggs'] ?? [],
                    'raw_cosmetics' => $data['cosmetics'] ?? [],
                    'raw_honey' => $data['honey'] ?? [], // ← Add this for debugging
                    'raw_events' => $data['events'] ?? [], // ← Regular events
                ]);

            } catch (\Exception $e) {
                Log::error('❌ GAG API error: ' . $e->getMessage());
                return response()->json(['error' => $e->getMessage()], 500);
            }
        }

        return response()->json(['error' => 'Game not supported'], 404);
    }

    private function fetchIndividualData()
    {
        try {
            $endpoints = [
                'seeds' => 'https://gagapi.onrender.com/seeds',
                'gear' => 'https://gagapi.onrender.com/gear',
                'eggs' => 'https://gagapi.onrender.com/eggs',
                'cosmetics' => 'https://gagapi.onrender.com/cosmetics',
                // 'eventshop' => 'https://gagapi.onrender.com/eventshop', // This might not exist
                'honey' => 'https://gagapi.onrender.com/honey', // Try this instead!
            ];

            $data = [];

            foreach ($endpoints as $key => $url) {
                Log::info("🔍 Fetching {$key} from {$url}");

                $response = Http::withOptions(['verify' => false])->get($url);

                if ($response->successful()) {
                    $items = $response->json();
                    $data[$key] = $items;
                    Log::info("✅ Fetched {$key}", [
                        'count' => count($items),
                        'first_item' => count($items) > 0 ? $items[0] : 'none'
                    ]);
                } else {
                    Log::warning("⚠️ Failed to fetch {$key}: " . $response->status());
                    $data[$key] = [];
                }
            }

            // Return with correct mapping
            return response()->json([
                'seed_stock' => $this->transformItems($data['seeds'] ?? []),
                'gear_stock' => $this->transformItems($data['gear'] ?? []),
                'egg_stock' => $this->transformItems($data['eggs'] ?? []),
                'cosmetic_stock' => $this->transformItems($data['cosmetics'] ?? []),
                'event_shop_stock' => $this->transformItems($data['honey'] ?? []), // Use honey!
                // Raw data
                'raw_seeds' => $data['seeds'] ?? [],
                'raw_gear' => $data['gear'] ?? [],
                'raw_eggs' => $data['eggs'] ?? [],
                'raw_cosmetics' => $data['cosmetics'] ?? [],
                'raw_honey' => $data['honey'] ?? [],
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Individual fetch error: ' . $e->getMessage());
            return response()->json([
                'seed_stock' => [],
                'gear_stock' => [],
                'egg_stock' => [],
                'cosmetic_stock' => [],
                'event_shop_stock' => [],
            ]);
        }
    }

    private function storeAllData(array $data)
    {
        Log::info('💾 Starting data storage', ['keys' => array_keys($data)]);

        // Store each shop's data
        if (isset($data['seeds']) && is_array($data['seeds'])) {
            Log::info('🌱 Storing seeds', ['count' => count($data['seeds'])]);
            $this->storeShopData($data['seeds'], 'Seed Shop', 'seed');
        }

        if (isset($data['gear']) && is_array($data['gear'])) {
            Log::info('🛠️ Storing gear', ['count' => count($data['gear'])]);
            $this->storeShopData($data['gear'], 'Gear Shop', 'gear');
        }

        if (isset($data['eggs']) && is_array($data['eggs'])) {
            Log::info('🥚 Storing eggs', ['count' => count($data['eggs'])]);
            $this->storeShopData($data['eggs'], 'Egg Shop', 'egg');
        }

        if (isset($data['cosmetics']) && is_array($data['cosmetics'])) {
            Log::info('💄 Storing cosmetics', ['count' => count($data['cosmetics'])]);
            $this->storeShopData($data['cosmetics'], 'Cosmetic Shop', 'cosmetic');
        }

        // ========== FIXED: Use 'honey' instead of 'eventshop' ==========
        if (isset($data['honey']) && is_array($data['honey'])) {
            Log::info('🍯 Storing honey (event shop)', ['count' => count($data['honey'])]);
            $this->storeShopData($data['honey'], 'Event Shop', 'event');
        }

        // Store weather if available
        if (isset($data['weather']) && is_array($data['weather'])) {
            Log::info('🌤️ Storing weather');
            $this->storeWeatherData($data['weather']);
        }

        Log::info('✅ Data storage completed');
    }

    private function storeShopData(array $items, string $shopName, string $itemType)
    {
        try {
            DB::beginTransaction();
            Log::info("💾 Starting to store {$shopName} data");

            $shop = ShopModel::firstOrCreate(
                ['name' => $shopName, 'game_id' => $this->gameId],
                ['name' => $shopName, 'game_id' => $this->gameId]
            );

            Log::info("🏪 Shop ID: {$shop->id}");

            $timestamp = now();
            $storedCount = 0;

            foreach ($items as $itemData) {
                // Check if itemData has required fields
                if (!isset($itemData['name'])) {
                    Log::warning("⚠️ Skipping item without name", ['data' => $itemData]);
                    continue;
                }

                // Get or create item
                $item = ItemModel::firstOrCreate(
                    [
                        'name' => $itemData['name'],
                        'game_id' => $this->gameId
                    ],
                    [
                        'name' => $itemData['name'],
                        'type' => $itemType,
                        'rarity' => 'common',
                        'game_id' => $this->gameId,
                        'is_obtainable' => true
                    ]
                );

                // Determine quantity
                $quantity = $itemData['quantity'] ?? $itemData['Stock'] ?? $itemData['stock'] ?? 0;

                // Create snapshot
                ItemSnapshotModel::create([
                    'item_id' => $item->id,
                    'shop_id' => $shop->id,
                    'quantity' => $quantity,
                    'timestamp' => $timestamp
                ]);

                $storedCount++;
            }

            DB::commit();
            Log::info("✅ Stored {$shopName} data successfully", ['count' => $storedCount]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Failed to store {$shopName} data: " . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
        }
    }

    private function storeWeatherData(array $weatherData)
    {
        try {
            DB::beginTransaction();
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
            Log::info("✅ Stored weather data", ['type' => $weatherData['type']]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Failed to store weather data: " . $e->getMessage());
        }
    }

    private function transformItems(array $items): array
    {
        return array_map(function ($item) {
            Log::debug("📦 Transforming item:", $item);

            $name = $item['name'] ?? $item['Name'] ?? $item['title'] ?? 'Unknown Item';
            $stock = $item['Stock'] ?? $item['stock'] ?? $item['quantity'] ?? $item['Quantity'] ?? 0;
            $image = $item['image'] ?? $item['Image'] ?? $item['img'] ?? null;

            if (!$image) {
                $cleanName = strtolower(preg_replace('/[^a-z0-9]/i', '_', $name));
                $image = 'https://cdn.3itx.tech/image/GrowAGarden/' . $cleanName;
            }

            return [
                'name' => $name,
                'Stock' => (int)$stock,
                'quantity' => (int)$stock,
                'image' => $image
            ];
        }, $items);
    }
}
