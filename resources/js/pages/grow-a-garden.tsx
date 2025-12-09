import { useEffect, useState, useCallback, useRef } from "react";
import { H2 } from '@/components/h2';
import { H3 } from '@/components/h3';
import { H4 } from '@/components/h4';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { growAGarden } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import StockCard from "@/components/stock-card";
import WeatherCard from "@/components/weather-card";
import {RotateCcw} from "lucide-react";
import {Button} from "@/components/ui/button";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Grow a Garden',
        href: growAGarden().url,
    },
];

export interface StockItem {
    name: string;
    Stock: number;
    image: string;
}

interface WeatherData {
    type: string;
    active: boolean;
    effects: string[];
    lastUpdated: string;
}

interface CountdownInfo {
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

export default function GrowAGarden() {
    const [seedStock, setSeedStock] = useState<StockItem[]>([]);
    const [gearStock, setGearStock] = useState<StockItem[]>([]);
    const [cosmeticStock, setCosmeticStock] = useState<StockItem[]>([]);
    const [eventShopStock, setEventShopStock] = useState<StockItem[]>([]);
    const [eggStock, setEggStock] = useState<StockItem[]>([]);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);

    // For tracking which shops are currently fetching
    const [fetchingShops, setFetchingShops] = useState<Set<string>>(new Set());

    // Store countdown values
    const [countdowns, setCountdowns] = useState<Record<string, CountdownInfo>>({
        seed: { minutes: 5, seconds: 0, totalSeconds: 300 },
        gear: { minutes: 5, seconds: 0, totalSeconds: 300 },
        event: { minutes: 30, seconds: 0, totalSeconds: 1800 },
        egg: { minutes: 30, seconds: 0, totalSeconds: 1800 },
        cosmetic: { minutes: 240, seconds: 0, totalSeconds: 14400 }
    });

    // Refs for intervals and timeouts
    const countdownIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
    const fetchTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
    const hasFetchedOnRestockRef = useRef<Record<string, boolean>>({});

    // Calculate restock times for display only
    const calculateRestockTimes = (intervalMinutes: number) => {
        const now = new Date();
        const intervalMs = intervalMinutes * 60 * 1000;
        const midnight = new Date(now);
        midnight.setHours(0, 0, 0, 0);
        const timeSinceMidnight = now.getTime() - midnight.getTime();
        const intervalsSinceMidnight = Math.floor(timeSinceMidnight / intervalMs);
        const lastRestockTime = new Date(midnight.getTime() + (intervalsSinceMidnight * intervalMs));
        const nextRestockTime = new Date(lastRestockTime.getTime() + intervalMs);

        return {
            lastRestock: lastRestockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            nextRestock: nextRestockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    };

    // Restock times for display
    const seedRestock = calculateRestockTimes(5);
    const gearRestock = calculateRestockTimes(5);
    const cosmeticRestock = calculateRestockTimes(240);
    const eventShopRestock = calculateRestockTimes(30);
    const eggRestock = calculateRestockTimes(30);

    // Function to start countdown for a shop
    const startShopCountdown = useCallback((shopKey: string, intervalMinutes: number) => {
        // Clear existing interval if any
        if (countdownIntervalsRef.current[shopKey]) {
            clearInterval(countdownIntervalsRef.current[shopKey]);
        }

        // Calculate initial time until next restock
        const now = new Date();
        const intervalMs = intervalMinutes * 60 * 1000;
        const midnight = new Date(now);
        midnight.setHours(0, 0, 0, 0);
        const timeSinceMidnight = now.getTime() - midnight.getTime();
        const intervalsSinceMidnight = Math.floor(timeSinceMidnight / intervalMs);
        const lastRestockTime = new Date(midnight.getTime() + (intervalsSinceMidnight * intervalMs));
        const nextRestockTime = new Date(lastRestockTime.getTime() + intervalMs);
        const msUntilRestock = nextRestockTime.getTime() - now.getTime();

        let totalSeconds = Math.floor(msUntilRestock / 1000);
        if (totalSeconds < 0) totalSeconds = 0;

        const initialMinutes = Math.floor(totalSeconds / 60);
        const initialSeconds = totalSeconds % 60;

        // Set initial countdown
        setCountdowns(prev => ({
            ...prev,
            [shopKey]: {
                minutes: initialMinutes,
                seconds: initialSeconds,
                totalSeconds
            }
        }));

        // Reset fetch flag
        hasFetchedOnRestockRef.current[shopKey] = false;

        // Start countdown interval
        countdownIntervalsRef.current[shopKey] = setInterval(() => {
            setCountdowns(prev => {
                const current = prev[shopKey];
                if (!current) return prev;

                let newTotalSeconds = current.totalSeconds - 1;
                if (newTotalSeconds < 0) newTotalSeconds = 0;

                const newMinutes = Math.floor(newTotalSeconds / 60);
                const newSeconds = newTotalSeconds % 60;

                // Check if countdown reached 0 AND we haven't fetched yet
                if (newTotalSeconds === 0 && !hasFetchedOnRestockRef.current[shopKey]) {
                    hasFetchedOnRestockRef.current[shopKey] = true;

                    // Trigger fetch for this shop
                    setTimeout(() => {
                        const shopConfig = {
                            seed: { url: 'https://gagapi.onrender.com/seeds', setter: setSeedStock, name: 'Seed Shop' },
                            gear: { url: 'https://gagapi.onrender.com/gear', setter: setGearStock, name: 'Gear Shop' },
                            event: { url: 'https://gagapi.onrender.com/eventshop', setter: setEventShopStock, name: 'Event Shop' },
                            egg: { url: 'https://gagapi.onrender.com/eggs', setter: setEggStock, name: 'Egg Shop' },
                            cosmetic: { url: 'https://gagapi.onrender.com/cosmetics', setter: setCosmeticStock, name: 'Cosmetic Shop' }
                        }[shopKey];

                        if (shopConfig) {
                            fetchShopData(shopConfig.url, shopConfig.setter, shopConfig.name, shopKey);
                        }
                    }, 100);
                }

                return {
                    ...prev,
                    [shopKey]: {
                        minutes: newMinutes,
                        seconds: newSeconds,
                        totalSeconds: newTotalSeconds
                    }
                };
            });
        }, 1000);
    }, []);

    // Function to format countdown for display
    const formatCountdown = (shopKey: string): string => {
        const countdown = countdowns[shopKey];
        if (!countdown) return "0:00:00";

        // When countdown reaches 0, show "Restocking..." while fetching
        if (countdown.totalSeconds === 0 && fetchingShops.has(shopKey)) {
            return "Restocking...";
        }

        // When countdown reaches 0 and fetch is done, reset to full interval
        if (countdown.totalSeconds === 0 && !fetchingShops.has(shopKey)) {
            const intervalMinutes = {
                seed: 5, gear: 5, event: 30, egg: 30, cosmetic: 240
            }[shopKey] || 5;

            // For cosmetic shop, format as HH:MM:SS
            if (shopKey === 'cosmetic') {
                const hours = Math.floor(intervalMinutes / 60);
                const minutes = intervalMinutes % 60;
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
            } else {
                return `${intervalMinutes}:00`;
            }
        }

        if (shopKey === 'cosmetic') {
            const hours = Math.floor(countdown.totalSeconds / 3600);
            const minutes = Math.floor((countdown.totalSeconds % 3600) / 60);
            const seconds = countdown.totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${countdown.minutes}:${countdown.seconds.toString().padStart(2, '0')}`;
        }
    };

    const fetchShopData = useCallback(async (
        url: string,
        setter: (items: StockItem[]) => void,
        shopName: string,
        shopKey: string
    ) => {
        try {
            console.log(`🔄 Fetching ${shopName} on restock`);

            setFetchingShops(prev => new Set(prev).add(shopKey));

            // Fetch ALL data
            const response = await fetch('/proxy/stock/grow-a-garden');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // DEBUG: Log available keys
            console.log(`🔑 Available keys for ${shopName}:`, Object.keys(data));

            // SIMPLE EXTRACTION - no complex logic
            let shopData = [];

            if (shopKey === 'seed') {
                shopData = data.seed_stock || data.raw_seeds || [];
                console.log(`🌱 Seed shop items: ${shopData.length}`);
            }
            else if (shopKey === 'gear') {
                shopData = data.gear_stock || data.raw_gear || [];
                console.log(`🛠️ Gear shop items: ${shopData.length}`);
            }
            else if (shopKey === 'egg') {
                shopData = data.egg_stock || data.raw_eggs || [];
                console.log(`🥚 Egg shop items: ${shopData.length}`);
            }
            else if (shopKey === 'cosmetic') {
                shopData = data.cosmetic_stock || data.raw_cosmetics || [];
                console.log(`💄 Cosmetic shop items: ${shopData.length}`);
            }
            // EVENT SHOP - SPECIAL HANDLING
            else if (shopKey === 'event') {
                console.log(`🎪 Looking for event shop data...`);

                // Try all possible event data sources
                if (data.event_shop_stock && Array.isArray(data.event_shop_stock) && data.event_shop_stock.length > 0) {
                    shopData = data.event_shop_stock;
                    console.log(`✅ Using event_shop_stock: ${shopData.length} items`);
                }
                else if (data.raw_eventshop && Array.isArray(data.raw_eventshop) && data.raw_eventshop.length > 0) {
                    shopData = data.raw_eventshop;
                    console.log(`✅ Using raw_eventshop: ${shopData.length} items`);
                }
                else {
                    // Check any key containing "event"
                    const eventKeys = Object.keys(data).filter(k =>
                        k.toLowerCase().includes('event') &&
                        Array.isArray(data[k])
                    );
                    console.log(`🔍 Found event-related keys:`, eventKeys);

                    if (eventKeys.length > 0) {
                        shopData = data[eventKeys[0]];
                        console.log(`✅ Using "${eventKeys[0]}": ${shopData.length} items`);
                    }
                }

                if (shopData.length > 0 && shopData[0]) {
                    console.log('📋 First event item structure:', shopData[0]);
                }
            }

            // Transform data to consistent format
            const transformedData = shopData.map((item: any) => {
                // Use the same transformation logic as fetchAllData
                const itemName = item.name || item.Name || item.title || 'Unknown Item';

                const stockCount =
                    item.Stock !== undefined ? item.Stock :
                        item.stock !== undefined ? item.stock :
                            item.quantity !== undefined ? item.quantity :
                                item.Quantity !== undefined ? item.Quantity :
                                    0;

                const itemImage =
                    item.image || item.Image || item.img || item.icon ||
                    `https://cdn.3itx.tech/image/GrowAGarden/${
                        itemName.toLowerCase()
                            .replace(/\s+/g, '_')
                            .replace(/[^a-z0-9_]/g, '')
                    }`;

                return {
                    name: itemName,
                    Stock: Number(stockCount),
                    stock: Number(stockCount),
                    quantity: Number(stockCount),
                    image: itemImage
                };
            });

            console.log(`✅ ${shopName} transformed items:`, transformedData.length);
            setter(transformedData);
            setLastUpdateTime(new Date());

            // Reset countdown
            setTimeout(() => {
                const intervalMinutes = {
                    seed: 5, gear: 5, event: 30, egg: 30, cosmetic: 240
                }[shopKey] || 5;
                startShopCountdown(shopKey, intervalMinutes);
            }, 1000);

            return true;
        } catch (error) {
            console.error(`❌ Failed to fetch ${shopName}:`, error);

            setTimeout(() => {
                const intervalMinutes = {
                    seed: 5, gear: 5, event: 30, egg: 30, cosmetic: 240
                }[shopKey] || 5;
                startShopCountdown(shopKey, intervalMinutes);
            }, 1000);

            return false;
        } finally {
            setTimeout(() => {
                setFetchingShops(prev => {
                    const next = new Set(prev);
                    next.delete(shopKey);
                    return next;
                });
            }, 500);
        }
    }, [startShopCountdown]);

    // Function to fetch weather data
    const fetchWeatherData = useCallback(async () => {
        try {
            const response = await fetch('/proxy/events/grow-a-garden');
            if (!response.ok) return false;

            const data = await response.json();

            if (data.lastSeenEvents && data.lastSeenEvents.length > 0) {
                const weatherEvent = data.lastSeenEvents[0];
                setWeatherData({
                    type: weatherEvent.Name || 'unknown',
                    active: weatherEvent.active || false,
                    effects: [weatherEvent.Description || 'No description'],
                    lastUpdated: new Date((weatherEvent.LastSeen || Date.now()/1000) * 1000).toISOString()
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to fetch weather:', error);
            return false;
        }
    }, []);

    const fetchAllData = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('🚀 Starting to fetch all data...');

            // Fetch ALL data from your Laravel endpoint
            const response = await fetch('/proxy/stock/grow-a-garden');
            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Full stock data received');

            // CRITICAL: Log EVERY key and its type/length
            console.log('🔑 ALL KEYS in response:');
            Object.keys(data).forEach(key => {
                console.log(`  ${key}:`, Array.isArray(data[key]) ? `Array(${data[key].length})` : typeof data[key]);
            });

            console.log('🔍 DIRECT CHECK of event_shop_stock:');
            console.log('Type:', typeof data.event_shop_stock);
            console.log('Is array?', Array.isArray(data.event_shop_stock));
            console.log('Length:', data.event_shop_stock ? data.event_shop_stock.length : 'undefined');
            if (data.event_shop_stock && data.event_shop_stock.length > 0) {
                console.log('First item structure:', data.event_shop_stock[0]);
            }

            console.log('🔍 Checking raw_eventshop:');
            console.log('Length:', data.raw_eventshop ? data.raw_eventshop.length : 'undefined');
            if (data.raw_eventshop && data.raw_eventshop.length > 0) {
                console.log('First raw item:', data.raw_eventshop[0]);
            }

            // Set all shop data from the single response
            setSeedStock(data.seed_stock || data.raw_seeds || []);
            setGearStock(data.gear_stock || data.raw_gear || []);
            setEggStock(data.egg_stock || data.raw_eggs || []);
            setCosmeticStock(data.cosmetic_stock || data.raw_cosmetics || []);

            console.log('🎯 Setting event shop data...');

            let eventSource = null;
            let eventItems = [];


            if (data.event_shop_stock && Array.isArray(data.event_shop_stock) && data.event_shop_stock.length > 0) {
                console.log('✅ Using transformed event_shop_stock data');
                eventSource = 'event_shop_stock';
                eventItems = data.event_shop_stock;
            }
            else if (data.raw_eventshop && Array.isArray(data.raw_eventshop) && data.raw_eventshop.length > 0) {
                console.log('✅ Using raw_eventshop data');
                eventSource = 'raw_eventshop';
                eventItems = data.raw_eventshop;
            }
            else {
                const eventKeys = Object.keys(data).filter(k =>
                    k.toLowerCase().includes('event') &&
                    Array.isArray(data[k]) &&
                    data[k].length > 0
                );
                if (eventKeys.length > 0) {
                    console.log(`✅ Using event data from: "${eventKeys[0]}"`);
                    eventSource = eventKeys[0];
                    eventItems = data[eventKeys[0]];
                }
            }

            if (eventItems.length > 0) {
                console.log(`📊 Found ${eventItems.length} event items from source: ${eventSource}`);


                const transformedEventData = eventItems.map((item: any, index: number) => {
                    // Debug first item
                    if (index === 0) {
                        console.log('🔍 First event item raw structure:', item);
                    }

                    // Extract name from various possible fields
                    const itemName = item.name || item.Name || item.title || 'Unknown Item';

                    // Extract stock count from various possible fields
                    const stockCount =
                        item.Stock !== undefined ? item.Stock :
                            item.stock !== undefined ? item.stock :
                                item.quantity !== undefined ? item.quantity :
                                    item.Quantity !== undefined ? item.Quantity :
                                        0;

                    // Extract image from various possible fields
                    const itemImage =
                        item.image || item.Image || item.img || item.icon ||
                        `https://cdn.3itx.tech/image/GrowAGarden/${
                            itemName.toLowerCase()
                                .replace(/\s+/g, '_')
                                .replace(/[^a-z0-9_]/g, '')
                        }`;

                    return {
                        name: itemName,
                        Stock: Number(stockCount),
                        stock: Number(stockCount),
                        quantity: Number(stockCount),
                        image: itemImage,

                    };
                });

                console.log('✅ Transformed event data sample:', transformedEventData[0]);
                console.log(`✅ Total event items: ${transformedEventData.length}`);
                setEventShopStock(transformedEventData);
            } else {
                console.log('⚠️ No event shop data found in any source');
                setEventShopStock([]);
            }

            try {
                const weatherResponse = await fetch('/proxy/events/grow-a-garden');
                if (weatherResponse.ok) {
                    const weatherData = await weatherResponse.json();

                    if (weatherData.lastSeenEvents && weatherData.lastSeenEvents.length > 0) {
                        const weatherEvent = weatherData.lastSeenEvents[0];
                        setWeatherData({
                            type: weatherEvent.Name,
                            active: weatherEvent.active || false,
                            effects: [weatherEvent.Description],
                            lastUpdated: new Date(weatherEvent.LastSeen * 1000).toISOString()
                        });
                    }
                }
            } catch (weatherError) {
                console.error('Failed to fetch weather:', weatherError);
            }

            setLastUpdateTime(new Date());

        } catch (error) {
            console.error('Failed to fetch data:', error);

            // Set empty arrays to prevent UI errors
            setSeedStock([]);
            setGearStock([]);
            setEggStock([]);
            setCosmeticStock([]);
            setEventShopStock([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial setup
    useEffect(() => {
        fetchAllData();

        const shopConfigs = [
            { key: 'seed', interval: 5 },
            { key: 'gear', interval: 5 },
            { key: 'event', interval: 30 },
            { key: 'egg', interval: 30 },
            { key: 'cosmetic', interval: 240 },
        ];

        const timer = setTimeout(() => {
            shopConfigs.forEach(config => {
                startShopCountdown(config.key, config.interval);
            });
        }, 1000);

        const weatherInterval = setInterval(fetchWeatherData, 5 * 60 * 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(weatherInterval);
            Object.values(countdownIntervalsRef.current).forEach(clearInterval);
            Object.values(fetchTimeoutsRef.current).forEach(clearTimeout);
        };
    }, [fetchAllData, fetchWeatherData, startShopCountdown]);


    // Transform weather data
    const weatherEvents = weatherData ? [{
        Name: weatherData.type,
        DisplayName: weatherData.type.charAt(0).toUpperCase() + weatherData.type.slice(1),
        Image: `https://cdn.3itx.tech/image/GrowAGarden/${weatherData.type.toLowerCase()}`,
        Description: weatherData.effects.join(', '),
        LastSeen: new Date(weatherData.lastUpdated).getTime() / 1000,
        start_timestamp_unix: new Date(weatherData.lastUpdated).getTime() / 1000,
        end_timestamp_unix: new Date(weatherData.lastUpdated).getTime() / 1000 + 3600,
        active: weatherData.active,
        duration: 3600
    }] : [];

    // Manual refresh
    const handleManualRefresh = useCallback(async () => {
        setIsLoading(true);
        await fetchAllData();

        const shopConfigs = [
            { key: 'seed', interval: 5 },
            { key: 'gear', interval: 5 },
            { key: 'event', interval: 30 },
            { key: 'egg', interval: 30 },
            { key: 'cosmetic', interval: 240 },
        ];

        shopConfigs.forEach(config => {
            startShopCountdown(config.key, config.interval);
        });
    }, [fetchAllData, startShopCountdown]);

    return (
        <AppLayout breadcrumbs={breadcrumbs} data-theme="red">
            <Head title="Grow a Garden" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4 bg-transparent">
                <div className="flex flex-col items-center justify-center w-full my-16 leading-none bg-transparent">
                    <H3>
                        Stocks and Weather Events Live Tracking and Forecast for
                    </H3>
                    <H2 className="text-sidebar-primary">
                        Grow a Garden
                    </H2>

                    {/* Last Update Indicator */}
                    <div className="mt-4 text-sm text-gray-500">

                    </div>
                </div>

                <div className="flex justify-between items-center w-full">
                    <H4>
                        Live Stocks and Weather Events
                    </H4>
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>Updating data...</span>
                        </div>
                    ) : (
                        <Button onClick={handleManualRefresh}>
                            <RotateCcw/> Refresh
                        </Button>
                    )}

                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-3 bg-transparent">
                    <StockCard
                        title="Seed Shop"
                        items={seedStock}
                        lastRestock={seedRestock.lastRestock}
                        nextRestock={seedRestock.nextRestock}
                        countdown={formatCountdown('seed')}
                        intervalMinutes={5}
                        isLoading={isLoading || fetchingShops.has('seed')}
                    />
                    <StockCard
                        title="Event Shop"
                        items={eventShopStock}
                        lastRestock={eventShopRestock.lastRestock}
                        nextRestock={eventShopRestock.nextRestock}
                        countdown={formatCountdown('event')}
                        intervalMinutes={30}
                        isLoading={isLoading || fetchingShops.has('event')}
                    />
                    <StockCard
                        title="Gear Shop"
                        items={gearStock}
                        lastRestock={gearRestock.lastRestock}
                        nextRestock={gearRestock.nextRestock}
                        countdown={formatCountdown('gear')}
                        intervalMinutes={5}
                        isLoading={isLoading || fetchingShops.has('gear')}
                    />
                    <StockCard
                        title="Egg Shop"
                        items={eggStock}
                        lastRestock={eggRestock.lastRestock}
                        nextRestock={eggRestock.nextRestock}
                        countdown={formatCountdown('egg')}
                        intervalMinutes={30}
                        isLoading={isLoading || fetchingShops.has('egg')}
                    />
                    <StockCard
                        title="Cosmetic Shop"
                        items={cosmeticStock}
                        lastRestock={cosmeticRestock.lastRestock}
                        nextRestock={cosmeticRestock.nextRestock}
                        countdown={formatCountdown('cosmetic')}
                        intervalMinutes={240}
                        isLoading={isLoading || fetchingShops.has('cosmetic')}
                    />

                    {/* Weather Card */}
                    <WeatherCard
                        title="Current Weather"
                        items={weatherEvents}
                        isLoading={isLoading}
                    />
                </div>

                <H4 className="mt-20">
                    Stocks and Weather Events Forecast
                </H4>
                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border bg-transparent">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
