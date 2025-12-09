<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StockController extends Controller
{
    public function proxy(Request $request, $game = 'grow-a-garden')
    {
        if ($game === 'grow-a-garden') {
            try {
                Log::info('🔄 Fetching ALL GAG data');

                // Try to fetch all data at once
                $response = Http::withOptions([
                    'timeout' => 30,
                ])->get('https://gagapi.onrender.com/alldata');

                if ($response->successful()) {
                    $data = $response->json();

                    // Return formatted data
                    return response()->json([
                        'seed_stock' => $this->transformItems($data['seeds'] ?? []),
                        'gear_stock' => $this->transformItems($data['gear'] ?? []),
                        'egg_stock' => $this->transformItems($data['eggs'] ?? []),
                        'cosmetic_stock' => $this->transformItems($data['cosmetics'] ?? []),
                        'event_shop_stock' => $this->transformItems($data['honey'] ?? []),
                        'raw_seeds' => $data['seeds'] ?? [],
                        'raw_gear' => $data['gear'] ?? [],
                        'raw_eggs' => $data['eggs'] ?? [],
                        'raw_cosmetics' => $data['cosmetics'] ?? [],
                        'raw_honey' => $data['honey'] ?? [],
                    ]);
                }

                // If alldata fails, fetch individually
                Log::warning('⚠️ All data fetch failed, trying individual endpoints');
                return $this->fetchIndividualData();

            } catch (\Exception $e) {
                Log::error('❌ GAG API error: ' . $e->getMessage());
                return $this->fetchIndividualData();
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
                'honey' => 'https://gagapi.onrender.com/honey',
            ];

            $data = [];

            foreach ($endpoints as $key => $url) {
                $response = Http::withOptions(['timeout' => 10])->get($url);

                if ($response->successful()) {
                    $data[$key] = $response->json();
                } else {
                    Log::warning("⚠️ Failed to fetch {$key}: " . $response->status());
                    $data[$key] = [];
                }
            }

            return response()->json([
                'seed_stock' => $this->transformItems($data['seeds'] ?? []),
                'gear_stock' => $this->transformItems($data['gear'] ?? []),
                'egg_stock' => $this->transformItems($data['eggs'] ?? []),
                'cosmetic_stock' => $this->transformItems($data['cosmetics'] ?? []),
                'event_shop_stock' => $this->transformItems($data['honey'] ?? []),
                'raw_seeds' => $data['seeds'] ?? [],
                'raw_gear' => $data['gear'] ?? [],
                'raw_eggs' => $data['eggs'] ?? [],
                'raw_cosmetics' => $data['cosmetics'] ?? [],
                'raw_honey' => $data['honey'] ?? [],
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Individual fetch error: ' . $e->getMessage());

            // Return empty arrays on complete failure
            return response()->json([
                'seed_stock' => [],
                'gear_stock' => [],
                'egg_stock' => [],
                'cosmetic_stock' => [],
                'event_shop_stock' => [],
                'raw_seeds' => [],
                'raw_gear' => [],
                'raw_eggs' => [],
                'raw_cosmetics' => [],
                'raw_honey' => [],
            ]);
        }
    }

    private function transformItems(array $items): array
    {
        return array_map(function ($item) {
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
