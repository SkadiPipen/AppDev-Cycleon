import { useEffect, useState, useCallback, useRef } from "react";
import { H2 } from '@/components/h2';
import { H3 } from '@/components/h3';
import { H4 } from '@/components/h4';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import StockCard from "@/components/stock-card";
import WeatherCard from "@/components/weather-card";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    CardDescription
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BarChart } from "recharts"; // Only need BarChart from recharts
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartBar,
    ChartXAxis,
    ChartYAxis,
} from "@/components/ui/chart";
const growAGarden = () => ({ url: '/grow-a-garden' });

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

interface AvailableItem {
    value: string;
    label: string;
}

interface CountdownInfo {
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

// Define types for forecast data
interface ForecastItem {
    name: string;
    icon: string;
    image: string;
    lastSeen: string;
    count: number;
    frequency: number; // The numeric frequency/percentage (e.g., 100)
    frequencyString: string; // The descriptive string (e.g., "Appears every 4 hrs")
    shops: string[];
    forecastData: Array<{ day: string; value: number }>;
}



const calculatePercentage = (frequency: number): string => {
    return `${frequency}%`;
};

const calculateFrequencyPercentage = (frequencyString: string): string => {
    if (!frequencyString) return '0%';

    // Handle different frequency formats
    const lower = frequencyString.toLowerCase();

    // If it already contains a percentage, return it
    if (lower.includes('%')) {
        return frequencyString;
    }

    // Parse "x times per y" format
    const timesMatch = lower.match(/(\d+(\.\d+)?)\s*times?/i);
    if (timesMatch) {
        const times = parseFloat(timesMatch[1]);
        // Assuming max frequency is 10 times per period for 100%
        const percentage = Math.min((times / 10) * 100, 100);
        return `${percentage.toFixed(1)}%`;
    }

    // Parse "once every x" format
    const everyMatch = lower.match(/once\s*every\s*(\d+(\.\d+)?)/i);
    if (everyMatch) {
        const days = parseFloat(everyMatch[1]);
        const percentage = (1 / days) * 100;
        return `${percentage.toFixed(1)}%`;
    }

    // Parse "x out of y" format
    const outOfMatch = lower.match(/(\d+)\s*out\s*of\s*(\d+)/i);
    if (outOfMatch) {
        const numerator = parseInt(outOfMatch[1]);
        const denominator = parseInt(outOfMatch[2]);
        if (denominator > 0) {
            const percentage = (numerator / denominator) * 100;
            return `${percentage.toFixed(1)}%`;
        }
    }

    // Parse simple number
    const numberMatch = lower.match(/(\d+(\.\d+)?)/);
    if (numberMatch) {
        const number = parseFloat(numberMatch[1]);
        // Assuming it's a percentage out of 10
        const percentage = Math.min((number / 10) * 100, 100);
        return `${percentage.toFixed(1)}%`;
    }

    // Default fallback
    return '0%';
};

// Helper function to format to PH timezone (UTC+8)
const formatToPHTime = (dateTimeString: string): string => {
    if (!dateTimeString) return 'Unknown';

    try {
        const date = new Date(dateTimeString);

        const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));

        return phDate.toLocaleDateString('en-US', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return dateTimeString;
    }
};


// Helper function to generate last 7 days labels
const generateLast7Days = (): string[] => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const formattedDate = date.toLocaleDateString('en-US', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric'
        });

        days.push(formattedDate);
    }

    return days;
};

// Helper function to get weather icon
const getWeatherIcon = (weatherName: string): string => {
    const weatherIcons: Record<string, string> = {
        'heatwave': '🔥',
        'meteor': '☄️',
        'rain': '🌧️',
        'sandstorm': '🌪️',
        'snow': '❄️',
        'thunder': '⛈️'
    };
    return weatherIcons[weatherName.toLowerCase()] || '⛅';
};

// Helper function to get category icon
const getCategoryIcon = (category: string): string => {
    const categoryIcons: Record<string, string> = {
        'seed': '🌱',
        'gear': '🛠️',
        'event': '🎪',
        'egg': '🥚',
        'cosmetic': '💄',
        'weather': '⛅'
    };
    return categoryIcons[category] || '📦';
};

const getWeatherIconFromName = (weatherName: string): string => {
    const weatherNameLower = weatherName.toLowerCase();

    if (weatherNameLower.includes('rain')) return '🌧️';
    if (weatherNameLower.includes('sun') || weatherNameLower.includes('heat')) return '☀️';
    if (weatherNameLower.includes('snow')) return '❄️';
    if (weatherNameLower.includes('storm') || weatherNameLower.includes('thunder')) return '⛈️';
    if (weatherNameLower.includes('wind') || weatherNameLower.includes('sand')) return '💨';
    if (weatherNameLower.includes('meteor')) return '☄️';

    return '⛅';
};

export default function GrowAGarden() {
    const [seedStock, setSeedStock] = useState<StockItem[]>([]);
    const [gearStock, setGearStock] = useState<StockItem[]>([]);
    const [cosmeticStock, setCosmeticStock] = useState<StockItem[]>([]);
    const [eventShopStock, setEventShopStock] = useState<StockItem[]>([]);
    const [eggStock, setEggStock] = useState<StockItem[]>([]);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);

    // For forecast section
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedItem, setSelectedItem] = useState<string>("");
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
    const [selectedItemData, setSelectedItemData] = useState<ForecastItem | null>(null);
    const [selectedWeatherData, setSelectedWeatherData] = useState<ForecastItem | null>(null);
    const [isLoadingForecast, setIsLoadingForecast] = useState(false);

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

            const response = await fetch('/proxy/stock/grow-a-garden');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            console.log(`🔑 Available keys for ${shopName}:`, Object.keys(data));

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
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4 md:p-6 bg-transparent">
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center w-full my-8 md:my-16 leading-none bg-transparent text-center px-4">
                    <H3 className="text-base md:text-lg lg:text-xl">
                        Stocks and Weather Events Live Tracking and Forecast for
                    </H3>
                    <H2 className="text-sidebar-primary text-2xl md:text-3xl lg:text-4xl">
                        Grow a Garden
                    </H2>
                </div>

                {/* Header with Refresh Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 px-4">
                    <H4 className="text-lg md:text-xl">
                        Live Stocks and Weather Events
                    </H4>
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm md:text-base">Updating data...</span>
                        </div>
                    ) : (
                        <Button onClick={handleManualRefresh} size="sm" className="w-full sm:w-auto">
                            <RotateCcw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                    )}
                </div>

                {/* Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min gap-4 md:gap-6 bg-transparent px-4">
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

                    {/* Weather Card - spans full width on mobile, then normal */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <WeatherCard
                            title="Current Weather"
                            items={weatherEvents}
                            isLoading={isLoading}
                        />
                    </div>
                </div>

                {/* Forecast Section - WORKING VERSION */}
                <div className="mt-8 md:mt-20 px-4">
                    <H4 className="text-lg md:text-xl mb-4">
                        Stocks and Weather Events Forecast
                    </H4>
                    <div className="relative min-h-[50vh] md:min-h-[60vh] flex flex-col gap-8 p-6 rounded-xl bg-background/20 border border-sidebar-border/70">

                        {/* CATEGORY SELECTION */}
                        <div>
                            <label className="block text-lg font-semibold mb-3">Select Category</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                {['seed', 'gear', 'event', 'egg', 'cosmetic', 'weather'].map((category) => (
                                    <Button
                                        key={category}
                                        type="button"
                                        variant={selectedCategory === category ? "default" : "outline"}
                                        className={`flex flex-col items-center justify-center h-20 ${
                                            selectedCategory === category
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-primary/10 hover:bg-primary/20"
                                        }`}
                                        onClick={async () => {
                                            setSelectedCategory(category);
                                            setSelectedItem("");
                                            setSelectedItemData(null);
                                            setSelectedWeatherData(null);

                                            try {
                                                if (category === "weather") {
                                                    // Weather always has stats
                                                    const response = await fetch('/proxy/forecast/weather');
                                                    if (response.ok) {
                                                        const data = await response.json();
                                                        setAvailableItems(data.map((weatherName: string) => ({
                                                            value: weatherName,
                                                            label: `${getWeatherIconFromName(weatherName)} ${weatherName.charAt(0).toUpperCase() + weatherName.slice(1)}`
                                                        })));
                                                    }
                                                } else {
                                                    // Get items with stats from the forecast API
                                                    const response = await fetch(`/proxy/forecast/items-by-category/${category}`);

                                                    if (response.ok) {
                                                        const categoryItems = await response.json();
                                                        console.log(`📊 ${category} items with stats:`, categoryItems);

                                                        if (categoryItems.length > 0) {
                                                            // Get current stock items for this category to find images
                                                            let currentStockItems: StockItem[] = [];
                                                            switch(category) {
                                                                case 'seed': currentStockItems = seedStock; break;
                                                                case 'gear': currentStockItems = gearStock; break;
                                                                case 'event': currentStockItems = eventShopStock; break;
                                                                case 'egg': currentStockItems = eggStock; break;
                                                                case 'cosmetic': currentStockItems = cosmeticStock; break;
                                                            }

                                                            // Create a map of item names to their images
                                                            const stockItemMap = new Map();
                                                            currentStockItems.forEach(item => {
                                                                stockItemMap.set(item.name.toLowerCase(), item.image);
                                                            });

                                                            // Create available items with their actual images/names
                                                            const itemsWithData = categoryItems.map((item: any) => {
                                                                const itemName = item.name || item.item || 'Unknown';
                                                                const itemImage = stockItemMap.get(itemName.toLowerCase()) ||
                                                                    `https://cdn.3itx.tech/image/GrowAGarden/${itemName.toLowerCase().replace(/\s+/g, '_')}`;

                                                                // Return item data
                                                                return {
                                                                    value: itemName,
                                                                    label: itemName,
                                                                    image: itemImage
                                                                };
                                                            });

                                                            setAvailableItems(itemsWithData);
                                                        } else {
                                                            setAvailableItems([]);
                                                            console.log(`⚠️ No ${category} items found with historical stats`);
                                                        }
                                                    } else {
                                                        setAvailableItems([]);
                                                    }
                                                }
                                            } catch (error) {
                                                console.error(`Error fetching ${category} items:`, error);
                                                setAvailableItems([]);
                                            }
                                        }}
                                    >
                                        <span className="text-2xl mb-1">{getCategoryIcon(category)}</span>
                                        <span className="text-xs font-medium">
                            {category.charAt(0).toUpperCase() + category.slice(1)} {category === 'weather' ? '' : 'Shop'}
                        </span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* ITEM SELECTION */}
                        {selectedCategory && (
                            <div>
                                <label className="block text-lg font-semibold mb-2">
                                    Select {selectedCategory === "weather" ? "Weather" : "Item"}
                                </label>
                                <Select
                                    value={selectedItem}
                                    onValueChange={async (itemName) => {
                                        console.log('🎯 Selected item:', itemName);
                                        setSelectedItem(itemName);

                                        if (selectedCategory && itemName) {
                                            setIsLoadingForecast(true);
                                            setSelectedItemData(null);
                                            setSelectedWeatherData(null);

                                            try {
                                                if (selectedCategory === "weather") {
                                                    const response = await fetch(`/proxy/forecast/weather-stats/${encodeURIComponent(itemName.toLowerCase())}`);
                                                    if (response.ok) {
                                                        const weatherData = await response.json();

                                                        // Check if weather has actually appeared (count > 0)
                                                        if (weatherData.count > 0) {
                                                            const dateLabels = generateLast7Days();
                                                            const forecastItem: ForecastItem = {
                                                                name: weatherData.weather.charAt(0).toUpperCase() + weatherData.weather.slice(1),
                                                                icon: getWeatherIconFromName(weatherData.weather),
                                                                image: `https://cdn.3itx.tech/image/GrowAGarden/${weatherData.weather.toLowerCase()}`,
                                                                lastSeen: weatherData.last_seen ? formatToPHTime(weatherData.last_seen) : 'Never',
                                                                count: weatherData.count || 0,
                                                                frequency: weatherData.frequency || 0, // Add this
                                                                frequencyString: weatherData.frequency_string || 'Unknown frequency', // Add this
                                                                shops: ['eventshop'],
                                                                forecastData: (weatherData.appearances || Array(7).fill(0)).map((value: number, index: number) => ({
                                                                    day: dateLabels[index] || `Day ${index + 1}`,
                                                                    value: value
                                                                }))
                                                            };

                                                            setSelectedWeatherData(forecastItem);
                                                        } else {
                                                            // Weather has never appeared
                                                            setSelectedWeatherData(null);
                                                        }
                                                    }
                                                } else {
                                                    console.log(`📊 Searching stats for: "${itemName}"`);

                                                    // Use /item-stats/{item} endpoint which searches in the array
                                                    const response = await fetch(`/proxy/forecast/item-stats/${encodeURIComponent(itemName)}`);

                                                    if (response.ok) {
                                                        const itemData = await response.json();
                                                        console.log('✅ Item stats found:', itemData);

                                                        const dateLabels = generateLast7Days();
                                                        const forecastItem: ForecastItem = {
                                                            name: itemData.item || itemName,
                                                            icon: getCategoryIcon(selectedCategory),
                                                            image: `https://cdn.3itx.tech/image/GrowAGarden/${itemName.toLowerCase().replace(/\s+/g, '_')}`,
                                                            lastSeen: formatToPHTime(itemData.last_seen),
                                                            count: itemData.appearances?.reduce((sum: number, val: number) => sum + val, 0) || 0, // Total of appearances array
                                                            frequency: itemData.frequency || 0, // The percentage (100)
                                                            frequencyString: itemData.frequency_string || 'Unknown frequency', // "Appears every 4 hrs"
                                                            shops: itemData.shops || [selectedCategory],
                                                            forecastData: (itemData.appearances || Array(7).fill(0)).map((value: number, index: number) => ({
                                                                day: dateLabels[index] || `Day ${index + 1}`,
                                                                value: value
                                                            }))
                                                        };

                                                        setSelectedItemData(forecastItem);
                                                    } else {
                                                        // Item not found or has no stats
                                                        console.log(`❌ Item "${itemName}" has no historical data`);
                                                        setSelectedItemData(null);
                                                    }
                                                }
                                            } catch (error) {
                                                console.error(`Error fetching stats:`, error);
                                            } finally {
                                                setIsLoadingForecast(false);
                                            }
                                        }
                                    }}
                                    disabled={availableItems.length === 0}
                                >
                                    <SelectTrigger className="w-full bg-background text-foreground border-primary/20">
                                        <SelectValue
                                            placeholder={
                                                availableItems.length === 0
                                                    ? `No ${selectedCategory === "weather" ? "weather" : "items"} available...`
                                                    : `Select ${selectedCategory === "weather" ? "weather" : "item"}...`
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border-primary/20 max-h-60">
                                        {availableItems.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                <div className="flex items-center gap-2">
                                                    {/* Display item image if available */}
                                                    {(item as any).image ? (
                                                        <img
                                                            src={(item as any).image}
                                                            alt={item.label}
                                                            className="w-6 h-6 rounded object-cover"
                                                            onError={(e) => {
                                                                // Fallback if image fails to load
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <span>{item.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* LOADING STATE */}
                        {isLoadingForecast && (
                            <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-background/10">
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-lg font-semibold mb-2 text-muted-foreground">Loading forecast data...</p>
                                    <p className="text-gray-500 text-center max-w-md">
                                        {selectedCategory === 'weather' ? 'Fetching weather patterns...' : 'Analyzing item appearance history...'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* FORECAST DISPLAY - Shows only when data is available from API */}
                        {(selectedItemData || selectedWeatherData) && !isLoadingForecast ? (
                            <div className="flex justify-center">
                                <div className="w-full max-w-4xl">
                                    {selectedItemData ? (
                                        <Card className="bg-background/20 border-primary/20">
                                            <CardHeader className="text-center pb-6">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center">
                                                        {selectedItemData.image ? (
                                                            <img
                                                                src={selectedItemData.image}
                                                                alt={selectedItemData.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // If image fails, show icon
                                                                    e.currentTarget.style.display = 'none';
                                                                    const iconSpan = document.createElement('span');
                                                                    iconSpan.className = 'text-4xl';
                                                                    iconSpan.textContent = selectedItemData.icon;
                                                                    e.currentTarget.parentElement?.appendChild(iconSpan);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-4xl">{selectedItemData.icon}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-xl">
                                                            {selectedItemData.name}
                                                        </CardTitle>
                                                        <CardDescription className="mt-2">
                                    <span className="text-sm bg-primary/20 px-2 py-1 rounded ml-2">
                                        {selectedCategory?.charAt(0).toUpperCase() + selectedCategory?.slice(1)} Shop
                                    </span>
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {/* CHANGED: Updated grid to have 4 columns */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                                    {/* Box 1: Last Seen - UPDATED with text-primary */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Last Seen</p>
                                                        <p className="text-base font-semibold text-primary">{selectedItemData.lastSeen}</p>
                                                    </div>

                                                    {/* Box 2: Appearance Count */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Appearance Count</p>
                                                        <p className="text-xl font-bold text-primary">x{selectedItemData.count}</p>
                                                    </div>

                                                    {/* Box 3: Appearance Rate */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Appearance Rate</p>
                                                        <p className="text-xl font-bold text-primary">{selectedItemData.frequency}%</p>
                                                    </div>

                                                    {/* Box 4: NEW - Frequency String */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Frequency</p>
                                                        <p className="text-base font-semibold text-primary">
                                                            {selectedItemData.frequencyString}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg font-semibold mb-4 text-center">7-Day Appearance History</h4>
                                                    <div className="h-64 min-h-[256px]">
                                                        <ChartContainer
                                                            config={{
                                                                value: {
                                                                    label: "Appearances",
                                                                    color: "hsl(var(--primary))",
                                                                },
                                                            }}
                                                            className="h-full w-full"
                                                        >
                                                            <BarChart data={selectedItemData.forecastData}>
                                                                <ChartXAxis
                                                                    dataKey="day"
                                                                    stroke="hsl(var(--muted-foreground))"
                                                                    axisLine={false}
                                                                    tickLine={false}
                                                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                                                />
                                                                <ChartYAxis
                                                                    stroke="hsl(var(--muted-foreground))"
                                                                    axisLine={false}
                                                                    tickLine={false}
                                                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                                                />
                                                                <ChartTooltip
                                                                    content={
                                                                        <ChartTooltipContent
                                                                            labelFormatter={(value: string) => value}
                                                                            formatter={(value: unknown) => {
                                                                                // Handle both number and string values
                                                                                const numValue = typeof value === 'number' ? value :
                                                                                    typeof value === 'string' ? parseFloat(value) : 0;
                                                                                return [`x${numValue}`, ' Appearances'] as [string, string];
                                                                            }}
                                                                        />
                                                                    }
                                                                />
                                                                <ChartBar
                                                                    dataKey="value"
                                                                    fill="var(--color-value)"
                                                                    radius={[4, 4, 0, 0]}
                                                                    className="transition-all hover:opacity-80"
                                                                />
                                                            </BarChart>
                                                        </ChartContainer>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="flex justify-center pt-6">
                                                <Button
                                                    onClick={() => alert(`Predicting forecast for ${selectedItemData.name}...`)}
                                                    className="w-full max-w-md"
                                                    variant="default"
                                                >
                                                    Predict Future Trends
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ) : selectedWeatherData ? (
                                        <Card className="bg-background/20 border-primary/20">
                                            <CardHeader className="text-center pb-6">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center">
                                                        {selectedWeatherData.image ? (
                                                            <img
                                                                src={selectedWeatherData.image}
                                                                alt={selectedWeatherData.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // If image fails, show icon
                                                                    e.currentTarget.style.display = 'none';
                                                                    const iconSpan = document.createElement('span');
                                                                    iconSpan.className = 'text-4xl';
                                                                    iconSpan.textContent = selectedWeatherData.icon;
                                                                    e.currentTarget.parentElement?.appendChild(iconSpan);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-4xl">{selectedWeatherData.icon}</span>
                                                        )}
                                                    </div>
                                                    <CardTitle className="text-xl">
                                                        {selectedWeatherData.name}
                                                    </CardTitle>
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {/* CHANGED: Updated grid to have 4 columns */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                                    {/* Box 1: Last Seen */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Last Seen</p>
                                                        <p className="text-base font-semibold text-primary">{selectedWeatherData.lastSeen}</p>
                                                    </div>

                                                    {/* Box 2: Total Occurrences */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Total Occurrences</p>
                                                        <p className="text-xl font-bold text-primary">x{selectedWeatherData.count}</p>
                                                    </div>

                                                    {/* Box 3: Occurrence Rate */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Occurrence Rate</p>
                                                        <p className="text-xl font-bold text-primary">{selectedWeatherData.frequency}%</p>
                                                    </div>

                                                    {/* Box 4: NEW - Frequency String */}
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Frequency</p>
                                                        <p className="text-base font-semibold text-primary">
                                                            {selectedWeatherData.frequencyString}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg font-semibold mb-4 text-center">7-Day Weather History</h4>
                                                    <div className="h-64 min-h-[256px]">
                                                        <ChartContainer
                                                            config={{
                                                                value: {
                                                                    label: "Occurrences",
                                                                    color: "hsl(var(--primary))",
                                                                },
                                                            }}
                                                            className="h-full w-full"
                                                        >
                                                            <BarChart data={selectedWeatherData.forecastData}>
                                                                <ChartXAxis
                                                                    dataKey="day"
                                                                    stroke="hsl(var(--muted-foreground))"
                                                                    axisLine={false}
                                                                    tickLine={false}
                                                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                                                />
                                                                <ChartYAxis
                                                                    stroke="hsl(var(--muted-foreground))"
                                                                    axisLine={false}
                                                                    tickLine={false}
                                                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                                                />
                                                                <ChartTooltip
                                                                    content={
                                                                        <ChartTooltipContent
                                                                            labelFormatter={(value: string) => value}
                                                                            formatter={(value: unknown) => {
                                                                                // Handle both number and string values
                                                                                const numValue = typeof value === 'number' ? value :
                                                                                    typeof value === 'string' ? parseFloat(value) : 0;
                                                                                return [`x${numValue}`, ' Occurrences'] as [string, string];
                                                                            }}
                                                                        />
                                                                    }
                                                                />
                                                                <ChartBar
                                                                    dataKey="value"
                                                                    fill="var(--color-value)"
                                                                    radius={[4, 4, 0, 0]}
                                                                    className="transition-all hover:opacity-80"
                                                                />
                                                            </BarChart>
                                                        </ChartContainer>
                                                    </div>
                                                </div>
                                            </CardContent>

                                            <CardFooter className="flex justify-center pt-6">
                                                <Button
                                                    onClick={() => alert(`Predicting weather forecast for ${selectedWeatherData.name}...`)}
                                                    className="w-full max-w-md"
                                                    variant="default"
                                                >
                                                    Predict Weather Patterns
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ) : null}
                                </div>
                            </div>
                        ) :null}


                        {/* PLACEHOLDER WHEN NOTHING SELECTED */}
                        {!selectedItemData && !selectedWeatherData && !isLoadingForecast && !selectedItem && availableItems.length > 0 && (
                            <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-background/10">
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4 opacity-30">📈</div>
                                    <p className="text-lg font-semibold mb-2 text-muted-foreground">Select an item to view forecast</p>
                                    <p className="text-gray-500 text-center max-w-md">
                                        Choose an item from the dropdown above to see its historical appearance patterns
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
