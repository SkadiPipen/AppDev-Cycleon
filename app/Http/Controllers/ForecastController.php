<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ForecastController extends Controller
{
    // Base URL for the forecast API
    private $baseUrl = 'https://cycleonapi-production.up.railway.app';

    /**
     * Get all items for search/dropdown
     */
    public function getItems(Request $request)
    {
        try {
            Log::info('🌐 Fetching items from external API');

            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/items');

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch items: ' . $response->status());
                return response()->json(['error' => 'Failed to fetch items'], $response->status());
            }

            $data = $response->json();
            Log::info('✅ Fetched items', ['count' => count($data)]);

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('❌ Items API error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get all weather types for search/dropdown
     */
    public function getWeather(Request $request)
    {
        try {
            Log::info('🌐 Fetching weather list from external API');

            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/weather');

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch weather list: ' . $response->status());
                return response()->json(['error' => 'Failed to fetch weather'], $response->status());
            }

            $data = $response->json();
            Log::info('✅ Fetched weather list', ['count' => count($data)]);

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('❌ Weather API error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get specific weather stats for display
     */
    public function getWeatherStats(Request $request, $weather)
    {
        try {
            Log::info('🌐 Fetching weather stats', ['weather' => $weather]);

            $weather = urldecode($weather);

            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/weather-stats/' . urlencode($weather));

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch weather stats: ' . $response->status());
                return response()->json(['error' => 'Weather stats not found'], 404);
            }

            $data = $response->json();
            Log::info('✅ Fetched weather stats', ['weather' => $weather]);

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('❌ Weather stats API error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get ALL item stats for bulk display
     */
    public function getAllItemStats(Request $request)
    {
        try {
            Log::info('🌐 Fetching ALL item stats from external API');

            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/item-stats');

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch all item stats: ' . $response->status());
                return response()->json(['error' => 'Failed to fetch items stats'], $response->status());
            }

            $data = $response->json();
            Log::info('✅ Fetched all item stats', ['count' => count($data)]);

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('❌ All item stats API error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get specific item by searching in item-stats array
     */
    public function getItemStats(Request $request, $itemName)
    {
        try {
            Log::info('🔍 Searching for item stats', ['item' => $itemName]);

            // Get all item stats
            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/item-stats');

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch item stats: ' . $response->status());
                return response()->json(['error' => 'Failed to fetch item stats'], $response->status());
            }

            $allStats = $response->json();
            $itemName = urldecode($itemName);

            // Search for the item in the array (case-insensitive)
            $foundItem = null;
            foreach ($allStats as $stat) {
                if (strtolower($stat['item'] ?? '') === strtolower($itemName)) {
                    $foundItem = $stat;
                    break;
                }
            }

            if (!$foundItem) {
                Log::warning('⚠️ Item not found in stats', ['item' => $itemName]);
                return response()->json([
                    'error' => 'Item not found in historical data',
                    'item' => $itemName,
                    'message' => 'This item has not appeared in the shop yet or has no historical data.'
                ], 404);
            }

            Log::info('✅ Found item stats', ['item' => $itemName]);
            return response()->json($foundItem);

        } catch (\Exception $e) {
            Log::error('❌ Item stats search error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get ALL weather stats for bulk display
     */
    public function getAllWeatherStats(Request $request)
    {
        try {
            Log::info('🌐 Fetching ALL weather stats from external API');

            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/weather-stats');

            if (!$response->successful()) {
                Log::error('❌ Failed to fetch all weather stats: ' . $response->status());
                return response()->json(['error' => 'Failed to fetch weather stats'], $response->status());
            }

            $data = $response->json();
            Log::info('✅ Fetched all weather stats', ['count' => count($data)]);

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('❌ All weather stats API error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get items filtered by category with stats availability check
     */
    public function getItemsByCategory(Request $request, $category)
    {
        try {
            Log::info('🎯 Getting items by category with stats', ['category' => $category]);

            // Get all items first
            $itemsResponse = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/items');

            if (!$itemsResponse->successful()) {
                Log::error('❌ Failed to fetch items: ' . $itemsResponse->status());
                return response()->json(['error' => 'Failed to fetch items'], $itemsResponse->status());
            }

            $allItems = $itemsResponse->json();

            // Get all item stats to check availability
            $statsResponse = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/item-stats');

            if (!$statsResponse->successful()) {
                Log::error('❌ Failed to fetch item stats: ' . $statsResponse->status());
                return response()->json(['error' => 'Failed to fetch item stats'], $statsResponse->status());
            }

            $allStats = $statsResponse->json();

            // Create a map of items that have stats (non-zero appearances)
            $itemsWithStats = [];
            foreach ($allStats as $stat) {
                $hasAppearances = false;
                $appearances = $stat['appearances'] ?? [];
                foreach ($appearances as $count) {
                    if ($count > 0) {
                        $hasAppearances = true;
                        break;
                    }
                }
                if ($hasAppearances) {
                    $itemsWithStats[strtolower($stat['item'])] = true;
                }
            }

            Log::info('📊 Items with stats count:', ['count' => count($itemsWithStats)]);

            // Filter items by category and stats availability
            $filteredItems = [];
            foreach ($allItems as $item) {
                $itemName = $item['name'] ?? '';
                $itemShops = $item['shops'] ?? [];

                // Check if item belongs to requested category
                $hasCategory = false;
                $categoryLower = strtolower($category);

                foreach ($itemShops as $shop) {
                    $shopLower = strtolower($shop);
                    // Check if shop contains the category name
                    if (strpos($shopLower, $categoryLower) !== false) {
                        $hasCategory = true;
                        break;
                    }
                }

                if (!$hasCategory) {
                    continue;
                }

                // Check if item has stats (has appeared at least once)
                if (!isset($itemsWithStats[strtolower($itemName)])) {
                    continue; // Skip items without stats
                }

                $filteredItems[] = $item;
            }

            Log::info('✅ Found items by category with stats', [
                'category' => $category,
                'total_items' => count($allItems),
                'items_with_stats' => count($itemsWithStats),
                'filtered_items' => count($filteredItems)
            ]);

            return response()->json($filteredItems);

        } catch (\Exception $e) {
            Log::error('❌ Get items by category error: ' . $e->getMessage());
            Log::error('❌ Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Server error: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Debug endpoint to see what items have stats
     */
    public function debugItemsWithStats(Request $request)
    {
        try {
            Log::info('🔍 Debug: Checking items with stats');

            // Get all items
            $itemsResponse = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/items');

            if (!$itemsResponse->successful()) {
                return response()->json(['error' => 'Failed to fetch items'], $itemsResponse->status());
            }

            $allItems = $itemsResponse->json();

            // Get all item stats
            $statsResponse = Http::withOptions([
                'verify' => false,
                'timeout' => 30,
            ])->get($this->baseUrl . '/item-stats');

            $allStats = $statsResponse->successful() ? $statsResponse->json() : [];

            // Create a map of items that have non-zero appearances
            $itemsWithStats = [];
            foreach ($allStats as $stat) {
                $hasAppearances = false;
                $appearances = $stat['appearances'] ?? [];
                foreach ($appearances as $count) {
                    if ($count > 0) {
                        $hasAppearances = true;
                        break;
                    }
                }
                if ($hasAppearances) {
                    $itemsWithStats[strtolower($stat['item'])] = $stat;
                }
            }

            // Organize items by category
            $itemsByCategory = [
                'seed' => [],
                'gear' => [],
                'event' => [],
                'egg' => [],
                'cosmetic' => []
            ];

            foreach ($allItems as $item) {
                $itemName = $item['name'] ?? '';
                $hasStats = isset($itemsWithStats[strtolower($itemName)]);

                // Determine categories
                $itemShops = $item['shops'] ?? [];
                foreach ($itemShops as $shop) {
                    $shopLower = strtolower($shop);
                    if (strpos($shopLower, 'seed') !== false) {
                        $itemsByCategory['seed'][] = ['name' => $itemName, 'has_stats' => $hasStats];
                    }
                    if (strpos($shopLower, 'gear') !== false) {
                        $itemsByCategory['gear'][] = ['name' => $itemName, 'has_stats' => $hasStats];
                    }
                    if (strpos($shopLower, 'event') !== false) {
                        $itemsByCategory['event'][] = ['name' => $itemName, 'has_stats' => $hasStats];
                    }
                    if (strpos($shopLower, 'egg') !== false) {
                        $itemsByCategory['egg'][] = ['name' => $itemName, 'has_stats' => $hasStats];
                    }
                    if (strpos($shopLower, 'cosmetic') !== false) {
                        $itemsByCategory['cosmetic'][] = ['name' => $itemName, 'has_stats' => $hasStats];
                    }
                }
            }

            return response()->json([
                'total_items' => count($allItems),
                'total_stats' => count($allStats),
                'items_with_appearances' => count($itemsWithStats),
                'items_by_category' => $itemsByCategory,
                'stats_sample' => array_slice($allStats, 0, 5)
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Debug error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
