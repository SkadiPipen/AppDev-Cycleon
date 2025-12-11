import { useEffect, useState, useCallback, useRef } from "react";
import { H2 } from '@/components/h2';
import { H3 } from '@/components/h3';
import { H4 } from '@/components/h4';
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
import { BarChart, Line } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartBar,
    ChartXAxis,
    ChartYAxis
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
    image?: string;
}

interface CountdownInfo {
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

interface ForecastItem {
    name: string;
    icon: string;
    image: string;
    lastSeen: string;
    count: number;
    frequency: number;
    frequencyString: string;
    shops: string[];
    forecastData: Array<{ day: string; value: number }>;
}

interface NextOccurrence {
    occurrence: number;
    predicted_time: string;
    predicted_delta_minutes: number;
    confidence: number;
}

interface CycleProbability {
    cycle: number;
    minutes_from_now: number;
    probability: number;
}

interface TimeWindowProbability {
    minutes: number;
    predicted_time: string;
    probability: number;
}

interface ConfidenceWindow {
    confidence_level: number;
    cycles?: number;
    minutes?: number;
    predicted_time?: string;
}

interface ItemPredictionResponse {
    item: string;
    shop: string;
    prediction_mode: string;
    next_occurrences: NextOccurrence[];
    cycle_probabilities: CycleProbability[];
    confidence_windows: ConfidenceWindow[];
    error?: string;
}

interface WeatherPredictionResponse {
    weather: string;
    prediction_mode: string;
    next_occurrences: NextOccurrence[];
    time_window_probabilities: TimeWindowProbability[];
    confidence_windows: ConfidenceWindow[];
    error?: string;
}

interface PredictionData {
    type: 'item' | 'weather';
    name: string;
    category: string;
    predictionMode: string;
    nextRestockProbability: number;
    nextRestockTime: string;
    probabilityOverTime: Array<{
        time: string;
        probability: number;
        label: string;
    }>;
    confidenceIntervals: Array<{
        confidence: number;
        predictedTime: string;
        label: string;
    }>;
    error?: string;
}

const formatToPHTime = (dateTimeString: string): string => {
    if (!dateTimeString) return 'Unknown';

    try {
        let date: Date;
        date = new Date(dateTimeString);

        if (isNaN(date.getTime())) {
            const cleaned = dateTimeString.replace(/\.\d+$/, '');
            date = new Date(cleaned);
        }

        if (isNaN(date.getTime())) {
            return dateTimeString;
        }

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

const convertUTCtoPHTime = (utcString: string): string => {
    const formatted = formatToPHTime(utcString);
    const timeMatch = formatted.match(/\d{1,2}:\d{2}\s*[AP]M/i);
    return timeMatch ? timeMatch[0] : formatted;
};

const formatMinutesFromNow = (minutes: number): string => {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60000);
    return futureTime.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const getShopInterval = (category: string): number => {
    switch(category.toLowerCase()) {
        case 'seed': return 5;
        case 'gear': return 5;
        case 'event': return 30;
        case 'egg': return 30;
        case 'cosmetic': return 240;
        default: return 5;
    }
};

const getIntervalLabel = (intervalMinutes: number): string => {
    if (intervalMinutes >= 60) {
        const hours = intervalMinutes / 60;
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${intervalMinutes} ${intervalMinutes === 1 ? 'minute' : 'minutes'}`;
};

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

const calculateFrequencyPercentage = (frequencyString: string): string => {
    if (!frequencyString) return '0%';

    const lower = frequencyString.toLowerCase();
    const appearsEveryMatch = lower.match(/appears every (\d+(\.\d+)?)\s*hrs/i);
    if (appearsEveryMatch) {
        const hours = parseFloat(appearsEveryMatch[1]);
        const timesPerDay = 24 / hours;
        const percentage = Math.min((timesPerDay / 24) * 100, 100);
        return `${percentage.toFixed(1)}%`;
    }

    const appearsEveryMinsMatch = lower.match(/appears every (\d+(\.\d+)?)\s*mins/i);
    if (appearsEveryMinsMatch) {
        const minutes = parseFloat(appearsEveryMinsMatch[1]);
        const hours = minutes / 60;
        const timesPerDay = 24 / hours;
        const percentage = Math.min((timesPerDay / 24) * 100, 100);
        return `${percentage.toFixed(1)}%`;
    }

    if (lower.includes('%')) {
        return frequencyString;
    }

    const timesMatch = lower.match(/(\d+(\.\d+)?)\s*times?/i);
    if (timesMatch) {
        const times = parseFloat(timesMatch[1]);
        const percentage = Math.min((times / 10) * 100, 100);
        return `${percentage.toFixed(1)}%`;
    }

    const everyMatch = lower.match(/once\s*every\s*(\d+(\.\d+)?)/i);
    if (everyMatch) {
        const days = parseFloat(everyMatch[1]);
        const percentage = (1 / days) * 100;
        return `${percentage.toFixed(1)}%`;
    }

    const outOfMatch = lower.match(/(\d+)\s*out\s*of\s*(\d+)/i);
    if (outOfMatch) {
        const numerator = parseInt(outOfMatch[1]);
        const denominator = parseInt(outOfMatch[2]);
        if (denominator > 0) {
            const percentage = (numerator / denominator) * 100;
            return `${percentage.toFixed(1)}%`;
        }
    }

    const numberMatch = lower.match(/(\d+(\.\d+)?)/);
    if (numberMatch) {
        const number = parseFloat(numberMatch[1]);
        const percentage = Math.min((number / 10) * 100, 100);
        return `${percentage.toFixed(1)}%`;
    }

    return '0%';
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

    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedItem, setSelectedItem] = useState<string>("");
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
    const [selectedItemData, setSelectedItemData] = useState<ForecastItem | null>(null);
    const [selectedWeatherData, setSelectedWeatherData] = useState<ForecastItem | null>(null);
    const [isLoadingForecast, setIsLoadingForecast] = useState(false);

    const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
    const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
    const [showPredictions, setShowPredictions] = useState(false);

    const [fetchingShops, setFetchingShops] = useState<Set<string>>(new Set());
    const [countdowns, setCountdowns] = useState<Record<string, CountdownInfo>>({
        seed: { minutes: 5, seconds: 0, totalSeconds: 300 },
        gear: { minutes: 5, seconds: 0, totalSeconds: 300 },
        event: { minutes: 30, seconds: 0, totalSeconds: 1800 },
        egg: { minutes: 30, seconds: 0, totalSeconds: 1800 },
        cosmetic: { minutes: 240, seconds: 0, totalSeconds: 14400 }
    });

    const countdownIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
    const fetchTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
    const hasFetchedOnRestockRef = useRef<Record<string, boolean>>({});

    const fetchPredictions = async (): Promise<void> => {
        if (!selectedCategory || !selectedItem) {
            console.error('Cannot fetch predictions: missing category or item');
            return;
        }

        setIsLoadingPrediction(true);
        setPredictionData(null);

        try {
            let endpoint = '';
            let response: ItemPredictionResponse | WeatherPredictionResponse | null = null;

            console.log(`🔮 Fetching predictions for ${selectedCategory}: ${selectedItem}`);

            if (selectedCategory === 'weather') {
                // ... weather code remains the same ...
            } else {
                // For items: Use the item name as-is (with spaces)
                const endpoint = `/proxy/predict/items/${encodeURIComponent(selectedItem)}`;
                console.log(`🔗 Calling item endpoint: ${endpoint}`);

                const res = await fetch(endpoint);

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || errorData.detail || `HTTP ${res.status}`);
                }

                response = await res.json() as ItemPredictionResponse;

                // FIX: Check if response exists
                if (!response) {
                    throw new Error('No response received from item prediction API');
                }

                // FIX: Type guard for error
                if ('error' in response && response.error) {
                    throw new Error(`Item prediction error: ${response.error}`);
                }

                // FIX: Type narrowing
                const itemResponse = response as ItemPredictionResponse;
                const shopInterval = getShopInterval(selectedCategory);
                const mainOccurrence = itemResponse.next_occurrences?.[0];

                if (!mainOccurrence) {
                    throw new Error('No prediction data available');
                }

                // DEBUG: Log what data we're getting
                console.log('📊 Raw API response:', itemResponse);
                console.log('📊 Confidence windows:', itemResponse.confidence_windows);
                console.log('📊 Confidence windows length:', itemResponse.confidence_windows?.length);
                console.log('📊 Confidence windows data:', itemResponse.confidence_windows);

                if (itemResponse.confidence_windows && itemResponse.confidence_windows.length > 0) {
                    console.log('📊 First confidence window:', itemResponse.confidence_windows[0]);
                    console.log('📊 Confidence level:', itemResponse.confidence_windows[0].confidence_level);
                    console.log('📊 Cycles:', itemResponse.confidence_windows[0].cycles);
                }

                const transformedData: PredictionData = {
                    type: 'item',
                    name: itemResponse.item,
                    category: selectedCategory,
                    predictionMode: itemResponse.prediction_mode,
                    nextRestockProbability: mainOccurrence.confidence,
                    nextRestockTime: convertUTCtoPHTime(mainOccurrence.predicted_time),
                    probabilityOverTime: (itemResponse.cycle_probabilities || []).map((cycle: CycleProbability) => ({
                        time: formatMinutesFromNow(cycle.minutes_from_now),
                        probability: cycle.probability,
                        label: `Cycle ${cycle.cycle}`
                    })),
                    confidenceIntervals: (itemResponse.confidence_windows || []).map(window => {
                        // DEBUG: Log each window transformation
                        console.log('🔄 Transforming confidence window:', window);

                        const cycles = window.cycles || 1;
                        const predictedTime = formatMinutesFromNow(cycles * shopInterval);
                        const label = `${cycles} cycle${cycles !== 1 ? 's' : ''}`;

                        console.log(`🔄 Result: ${window.confidence_level}% -> ${predictedTime} (${label})`);

                        return {
                            confidence: window.confidence_level,
                            predictedTime: predictedTime,
                            label: label
                        };
                    })
                };

                // DEBUG: Log the final transformed data
                console.log('✅ Transformed prediction data:', transformedData);
                console.log('✅ Confidence intervals count:', transformedData.confidenceIntervals.length);

                if (transformedData.confidenceIntervals.length === 0) {
                    console.log('⚠️ No confidence intervals were created!');
                } else {
                    console.log('✅ Confidence intervals:', transformedData.confidenceIntervals);
                }

                setPredictionData(transformedData);
            }

            setShowPredictions(true);
            console.log('✅ Predictions loaded successfully');

        } catch (error) {
            console.error('Failed to fetch predictions:', error);

            setPredictionData({
                type: selectedCategory === 'weather' ? 'weather' : 'item',
                name: selectedItem,
                category: selectedCategory,
                predictionMode: 'error',
                nextRestockProbability: 0,
                nextRestockTime: 'Unknown',
                probabilityOverTime: [],
                confidenceIntervals: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            setShowPredictions(true);
        } finally {
            setIsLoadingPrediction(false);
        }
    };

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

    const seedRestock = calculateRestockTimes(5);
    const gearRestock = calculateRestockTimes(5);
    const cosmeticRestock = calculateRestockTimes(240);
    const eventShopRestock = calculateRestockTimes(30);
    const eggRestock = calculateRestockTimes(30);

    const startShopCountdown = useCallback((shopKey: string, intervalMinutes: number) => {
        if (countdownIntervalsRef.current[shopKey]) {
            clearInterval(countdownIntervalsRef.current[shopKey]);
        }

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

        setCountdowns(prev => ({
            ...prev,
            [shopKey]: {
                minutes: initialMinutes,
                seconds: initialSeconds,
                totalSeconds
            }
        }));

        hasFetchedOnRestockRef.current[shopKey] = false;

        countdownIntervalsRef.current[shopKey] = setInterval(() => {
            setCountdowns(prev => {
                const current = prev[shopKey];
                if (!current) return prev;

                let newTotalSeconds = current.totalSeconds - 1;
                if (newTotalSeconds < 0) newTotalSeconds = 0;

                const newMinutes = Math.floor(newTotalSeconds / 60);
                const newSeconds = newTotalSeconds % 60;

                if (newTotalSeconds === 0 && !hasFetchedOnRestockRef.current[shopKey]) {
                    hasFetchedOnRestockRef.current[shopKey] = true;

                    setTimeout(() => {
                        const shopConfig = {
                            seed: { url: 'https://gagapi.onrender.com/seeds', setter: setSeedStock, name: 'Seed Shop' },
                            gear: { url: 'https://gagapi.onrender.com/gear', setter: setGearStock, name: 'Gear Shop' },
                            event: { url: 'https://gagapi.onrender.com/honey', setter: setEventShopStock, name: 'Event Shop' },
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

    const formatCountdown = (shopKey: string): string => {
        const countdown = countdowns[shopKey];
        if (!countdown) return "0:00:00";

        if (countdown.totalSeconds === 0 && fetchingShops.has(shopKey)) {
            return "Restocking...";
        }

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

            let shopData = [];

            if (shopKey === 'seed') {
                shopData = data.seed_stock || data.raw_seeds || [];
            }
            else if (shopKey === 'gear') {
                shopData = data.gear_stock || data.raw_gear || [];
            }
            else if (shopKey === 'egg') {
                shopData = data.egg_stock || data.raw_eggs || [];
            }
            else if (shopKey === 'cosmetic') {
                shopData = data.cosmetic_stock || data.raw_cosmetics || [];
            }
            else if (shopKey === 'event') {
                shopData = data.event_shop_stock || data.raw_honey || [];
            }

            const transformedData = shopData.map((item: any) => {
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

            setter(transformedData);
            setLastUpdateTime(new Date());

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

            const response = await fetch('/proxy/stock/grow-a-garden');
            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            setSeedStock(data.seed_stock || data.raw_seeds || []);
            setGearStock(data.gear_stock || data.raw_gear || []);
            setEggStock(data.egg_stock || data.raw_eggs || []);
            setCosmeticStock(data.cosmetic_stock || data.raw_cosmetics || []);

            let eventItems = data.event_shop_stock || data.raw_honey || [];

            if (eventItems.length > 0) {
                const transformedEventData = eventItems.map((item: any) => {
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
                        image: itemImage,
                    };
                });

                setEventShopStock(transformedEventData);
            } else {
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
            setSeedStock([]);
            setGearStock([]);
            setEggStock([]);
            setCosmeticStock([]);
            setEventShopStock([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
                <div className="flex flex-col items-center justify-center w-full my-8 md:my-16 leading-none bg-transparent text-center px-4">
                    <H3 className="text-base md:text-lg lg:text-xl">
                        Stocks and Weather Events Live Tracking and Forecast for
                    </H3>
                    <H2 className="text-sidebar-primary text-2xl md:text-3xl lg:text-4xl">
                        Grow a Garden
                    </H2>
                </div>

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

                    <div className="sm:col-span-2 lg:col-span-1">
                        <WeatherCard
                            title="Current Weather"
                            items={weatherEvents}
                            isLoading={isLoading}
                        />
                    </div>
                </div>

                <div className="mt-8 md:mt-20 px-4">
                    <H4 className="text-lg md:text-xl mb-4">
                        Stocks and Weather Events Forecast
                    </H4>
                    <div className="relative min-h-[50vh] md:min-h-[60vh] flex flex-col gap-8 p-6 rounded-xl bg-background/20 border border-sidebar-border/70">

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
                                            setShowPredictions(false);

                                            try {
                                                if (category === "weather") {
                                                    const response = await fetch('/proxy/forecast/weather');
                                                    if (response.ok) {
                                                        const data = await response.json();
                                                        setAvailableItems(data.map((weatherName: string) => ({
                                                            value: weatherName,
                                                            label: `${getWeatherIconFromName(weatherName)} ${weatherName.charAt(0).toUpperCase() + weatherName.slice(1)}`
                                                        })));
                                                    }
                                                } else {
                                                    const response = await fetch(`/proxy/forecast/items-by-category/${category}`);

                                                    if (response.ok) {
                                                        const categoryItems = await response.json();

                                                        if (categoryItems.length > 0) {
                                                            let currentStockItems: StockItem[] = [];
                                                            switch(category) {
                                                                case 'seed': currentStockItems = seedStock; break;
                                                                case 'gear': currentStockItems = gearStock; break;
                                                                case 'event': currentStockItems = eventShopStock; break;
                                                                case 'egg': currentStockItems = eggStock; break;
                                                                case 'cosmetic': currentStockItems = cosmeticStock; break;
                                                            }

                                                            const stockItemMap = new Map();
                                                            currentStockItems.forEach(item => {
                                                                stockItemMap.set(item.name.toLowerCase(), item.image);
                                                            });

                                                            const itemsWithData = categoryItems.map((item: any) => {
                                                                const itemName = item.name || item.item || 'Unknown';
                                                                const itemImage = stockItemMap.get(itemName.toLowerCase()) ||
                                                                    `https://cdn.3itx.tech/image/GrowAGarden/${itemName.toLowerCase().replace(/\s+/g, '_')}`;

                                                                return {
                                                                    value: itemName,
                                                                    label: itemName,
                                                                    image: itemImage
                                                                };
                                                            });

                                                            setAvailableItems(itemsWithData);
                                                        } else {
                                                            setAvailableItems([]);
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
                                        setShowPredictions(false);

                                        if (selectedCategory && itemName) {
                                            setIsLoadingForecast(true);
                                            setSelectedItemData(null);
                                            setSelectedWeatherData(null);

                                            try {
                                                if (selectedCategory === "weather") {
                                                    const response = await fetch(`/proxy/forecast/weather-stats/${encodeURIComponent(itemName.toLowerCase())}`);
                                                    if (response.ok) {
                                                        const weatherData = await response.json();

                                                        if (weatherData.count > 0) {
                                                            const dateLabels = generateLast7Days();
                                                            const frequencyPercentageStr = calculateFrequencyPercentage(weatherData.frequency_string);
                                                            const frequencyPercentage = parseFloat(frequencyPercentageStr.replace('%', ''));

                                                            const forecastItem: ForecastItem = {
                                                                name: weatherData.weather.charAt(0).toUpperCase() + weatherData.weather.slice(1),
                                                                icon: getWeatherIconFromName(weatherData.weather),
                                                                image: `https://cdn.3itx.tech/image/GrowAGarden/${weatherData.weather.toLowerCase()}`,
                                                                lastSeen: weatherData.last_seen ? formatToPHTime(weatherData.last_seen) : 'Never',
                                                                count: weatherData.count || 0,
                                                                frequency: frequencyPercentage,
                                                                frequencyString: weatherData.frequency_string || 'Unknown frequency',
                                                                shops: ['eventshop'],
                                                                forecastData: (weatherData.appearances || Array(7).fill(0)).map((value: number, index: number) => ({
                                                                    day: dateLabels[index] || `Day ${index + 1}`,
                                                                    value: value
                                                                }))
                                                            };

                                                            setSelectedWeatherData(forecastItem);
                                                        } else {
                                                            setSelectedWeatherData(null);
                                                        }
                                                    }
                                                } else {
                                                    console.log(`📊 Searching stats for: "${itemName}"`);

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
                                                            count: itemData.appearances?.reduce((sum: number, val: number) => sum + val, 0) || 0,
                                                            frequency: itemData.frequency || 0,
                                                            frequencyString: itemData.frequency_string || 'Unknown frequency',
                                                            shops: itemData.shops || [selectedCategory],
                                                            forecastData: (itemData.appearances || Array(7).fill(0)).map((value: number, index: number) => ({
                                                                day: dateLabels[index] || `Day ${index + 1}`,
                                                                value: value
                                                            }))
                                                        };

                                                        setSelectedItemData(forecastItem);
                                                    } else {
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
                                                    {item.image ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.label}
                                                            className="w-6 h-6 rounded object-cover"
                                                            onError={(e) => {
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
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Last Seen</p>
                                                        <p className="text-base font-semibold text-primary">{selectedItemData.lastSeen}</p>
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Appearance Count</p>
                                                        <p className="text-xl font-bold text-primary">x{selectedItemData.count}</p>
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Appearance Rate</p>
                                                        <p className="text-xl font-bold text-primary">{selectedItemData.frequency}%</p>
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Frequency</p>
                                                        <p className="text-base font-semibold text-primary">
                                                            {selectedItemData.frequencyString}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg font-semibold mb-4 text-center">7-Day Appearance History</h4>
                                                    <div className="h-64 min-h-[256px] bg-card/30 rounded-lg border border-border/50 p-4">
                                                        <ChartContainer
                                                            config={{
                                                                value: {
                                                                    label: "Appearances",
                                                                    color: "#3b82f6",
                                                                },
                                                            }}
                                                            className="h-full w-full"
                                                        >
                                                            <BarChart data={selectedItemData.forecastData}>
                                                                <defs>
                                                                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                                                                    </linearGradient>
                                                                </defs>

                                                                <ChartXAxis
                                                                    dataKey="day"
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    tickMargin={8}
                                                                    tickFormatter={(value) => value}
                                                                />
                                                                <ChartYAxis
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    tickMargin={8}
                                                                />
                                                                <ChartTooltip
                                                                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                                                                    content={
                                                                        <ChartTooltipContent
                                                                            hideLabel={true}
                                                                            formatter={(value: unknown) => {
                                                                                const numValue = typeof value === 'number' ? value :
                                                                                    typeof value === 'string' ? parseFloat(value) : 0;
                                                                                return [`x${numValue}`, 'Appearances'] as [string, string];
                                                                            }}
                                                                        />
                                                                    }
                                                                />
                                                                <ChartBar
                                                                    dataKey="value"
                                                                    fill="url(#blueGradient)"
                                                                    radius={[4, 4, 0, 0]}
                                                                />
                                                            </BarChart>
                                                        </ChartContainer>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="flex justify-center pt-6">
                                                <Button
                                                    onClick={fetchPredictions}
                                                    className="w-full max-w-md"
                                                    variant="default"
                                                    disabled={isLoadingPrediction}
                                                >
                                                    {isLoadingPrediction ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                            Loading Predictions...
                                                        </>
                                                    ) : (
                                                        'Predict Stock'
                                                    )}
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
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Last Seen</p>
                                                        <p className="text-base font-semibold text-primary">{selectedWeatherData.lastSeen}</p>
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Total Occurrences</p>
                                                        <p className="text-xl font-bold text-primary">x{selectedWeatherData.count}</p>
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Occurrence Rate</p>
                                                        <p className="text-xl font-bold text-primary">{selectedWeatherData.frequency}%</p>
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                                                        <p className="text-xs text-muted-foreground">Frequency</p>
                                                        <p className="text-base font-semibold text-primary">
                                                            {selectedWeatherData.frequencyString}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg font-semibold mb-4 text-center">7-Day Weather History</h4>
                                                    <div className="h-64 min-h-[256px] bg-card/30 rounded-lg border border-border/50 p-4">
                                                        <ChartContainer
                                                            config={{
                                                                value: {
                                                                    label: "Occurrences",
                                                                    color: "#3b82f6",
                                                                },
                                                            }}
                                                            className="h-full w-full"
                                                        >
                                                            <BarChart data={selectedWeatherData.forecastData}>
                                                                <defs>
                                                                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                                                                    </linearGradient>
                                                                </defs>

                                                                <ChartXAxis
                                                                    dataKey="day"
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    tickMargin={8}
                                                                    tickFormatter={(value) => value}
                                                                />
                                                                <ChartYAxis
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    tickMargin={8}
                                                                />
                                                                <ChartTooltip
                                                                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                                                                    content={
                                                                        <ChartTooltipContent
                                                                            hideLabel={true}
                                                                            formatter={(value: unknown) => {
                                                                                const numValue = typeof value === 'number' ? value :
                                                                                    typeof value === 'string' ? parseFloat(value) : 0;
                                                                                return [`x${numValue}`, 'Occurrences'] as [string, string];
                                                                            }}
                                                                        />
                                                                    }
                                                                />
                                                                <ChartBar
                                                                    dataKey="value"
                                                                    fill="url(#blueGradient)"
                                                                    radius={[4, 4, 0, 0]}
                                                                />
                                                            </BarChart>
                                                        </ChartContainer>
                                                    </div>
                                                </div>
                                            </CardContent>

                                            <CardFooter className="flex justify-center pt-6">
                                                <Button
                                                    onClick={fetchPredictions}
                                                    className="w-full max-w-md"
                                                    variant="default"
                                                    disabled={isLoadingPrediction}
                                                >
                                                    {isLoadingPrediction ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                            Loading Predictions...
                                                        </>
                                                    ) : (
                                                        'Predict Weather Patterns'
                                                    )}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ) : null}
                                </div>
                            </div>
                        ) : !isLoadingForecast && selectedItem && !selectedItemData && !selectedWeatherData ? (
                            <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-amber-50/50 border border-amber-200">
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4 text-amber-500">📊</div>
                                    <p className="text-lg font-semibold mb-2 text-amber-800">Historical Data Not Available</p>
                                    <p className="text-amber-700 text-center max-w-md mb-4">
                                        No historical statistics found for "<span className="font-semibold">{selectedItem}</span>".
                                    </p>
                                    <Button
                                        onClick={() => {
                                            setSelectedItem("");
                                            setSelectedItemData(null);
                                            setSelectedWeatherData(null);
                                        }}
                                        className="mt-6"
                                        variant="outline"
                                    >
                                        ← Select Different Item
                                    </Button>
                                </div>
                            </div>
                        ) : null}

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

                    {showPredictions && (
                        <Card className="bg-background/20 border-primary/20 mt-8">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-xl">
                                        {predictionData ? (
                                            predictionData.error ? 'Prediction Error' :
                                                `${predictionData.type === 'item' ? 'Stock' : 'Weather'} Predictions for ${predictionData.name}`
                                        ) : (
                                            'Loading Predictions...'
                                        )}
                                    </CardTitle>
                                    <Button
                                        onClick={() => {
                                            setShowPredictions(false);
                                            setPredictionData(null);
                                        }}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                    >
                                        ×
                                    </Button>
                                </div>
                                {predictionData && !predictionData.error && (
                                    <CardDescription>
                                        {predictionData.type === 'item' ? (
                                            `${predictionData.category.charAt(0).toUpperCase() + predictionData.category.slice(1)} Shop • ` +
                                            `${getIntervalLabel(getShopInterval(predictionData.category))} intervals`
                                        ) : (
                                            'Weather Event Predictions'
                                        )}
                                        {predictionData.predictionMode !== 'error' && (
                                            <> • Mode: {predictionData.predictionMode}</>
                                        )}
                                    </CardDescription>
                                )}
                            </CardHeader>

                            {isLoadingPrediction ? (
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                                    <p className="text-lg font-semibold text-muted-foreground">Loading predictions...</p>
                                    <p className="text-sm text-gray-500 text-center max-w-md mt-2">
                                        Analyzing historical patterns and calculating probabilities...
                                    </p>
                                </CardContent>
                            ) : predictionData ? (
                                predictionData.error ? (
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <div className="text-4xl mb-4 text-red-500">❌</div>
                                        <p className="text-lg font-semibold text-red-600 mb-2">Prediction Failed</p>
                                        <p className="text-sm text-gray-600 text-center max-w-md mb-4">
                                            {predictionData.error}
                                        </p>
                                        <Button
                                            onClick={fetchPredictions}
                                            variant="outline"
                                            className="mt-4"
                                        >
                                            Try Again
                                        </Button>
                                    </CardContent>
                                ) : (
                                    <CardContent className="space-y-8">
                                        <div className="bg-primary/10 rounded-lg p-6 text-center">
                                            <p className="text-sm text-muted-foreground mb-2">Probability for next occurrence</p>
                                            <p className="text-4xl font-bold text-primary">
                                                {predictionData.nextRestockProbability.toFixed(1)}% chance
                                            </p>
                                            <p className="text-base text-muted-foreground mt-2">
                                                will appear at <span className="font-semibold text-primary">
                                                    {predictionData.nextRestockTime}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Prediction mode: {predictionData.predictionMode}
                                            </p>
                                        </div>

                                        {predictionData.probabilityOverTime.length > 0 && (
                                            <div>
                                                <div className="h-48 bg-card/30 rounded-lg border border-border/50 p-4">
                                                    <ChartContainer
                                                        config={{
                                                            probability: {
                                                                label: "Probability",
                                                                color: "#3b82f6",
                                                            },
                                                        }}
                                                        className="h-full w-full"
                                                    >
                                                        <BarChart data={predictionData.probabilityOverTime}>
                                                            <defs>
                                                                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                                                                </linearGradient>
                                                            </defs>

                                                            <ChartXAxis
                                                                dataKey="time"
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickMargin={12}
                                                                tickFormatter={(value) => value}
                                                            />
                                                            <ChartYAxis
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickMargin={12}
                                                                domain={[0, 100]}
                                                                tickFormatter={(value) => `${value}%`}
                                                                padding={{ top: 10, bottom: 5 }}
                                                            />
                                                            <ChartTooltip
                                                                cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                                                                content={
                                                                    <ChartTooltipContent
                                                                        hideLabel={true}
                                                                        formatter={(value: unknown, name: unknown, props: any) => {
                                                                            const numValue = typeof value === 'number' ? value :
                                                                                typeof value === 'string' ? parseFloat(value) : 0;
                                                                            const label = props.payload?.label || '';
                                                                            return [
                                                                                `${numValue.toFixed(1)}%`,
                                                                                label ? `Probability (${label})` : 'Probability'
                                                                            ] as [string, string];
                                                                        }}
                                                                    />
                                                                }
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="probability"
                                                                stroke="url(#lineGradient)"
                                                                strokeWidth={3}
                                                                dot={{
                                                                    r: 5,
                                                                    fill: "#3b82f6",
                                                                    strokeWidth: 2,
                                                                    stroke: "#fff"
                                                                }}
                                                                activeDot={{
                                                                    r: 7,
                                                                    fill: "#1d4ed8",
                                                                    strokeWidth: 2,
                                                                    stroke: "#fff"
                                                                }}
                                                            />
                                                        </BarChart>
                                                    </ChartContainer>
                                                </div>
                                                <p className="text-xs text-muted-foreground text-center mt-2">
                                                    {predictionData.type === 'item' ? (
                                                        `Probability over next ${predictionData.probabilityOverTime.length} restock cycles`
                                                    ) : (
                                                        `Probability over next ${predictionData.probabilityOverTime.length} time windows`
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {predictionData.confidenceIntervals.length > 0 && (
                                            <div>
                                                <h4 className="text-lg font-semibold mb-4 text-center">Confidence Intervals</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {predictionData.confidenceIntervals.map((interval, index) => (
                                                        <div key={index} className="bg-primary/10 rounded-lg p-4 text-center">
                                                            <div className="flex items-center justify-center mb-3">
                                                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                                                    interval.confidence >= 90 ? 'bg-green-500' :
                                                                        interval.confidence >= 85 ? 'bg-blue-500' :
                                                                            'bg-blue-400'
                                                                }`}></div>
                                                                <span className="text-sm font-medium text-foreground">
                                                                    {interval.confidence}% Confidence
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Will appear at {interval.predictedTime} within<br />
                                                                <span className="text-2xl font-bold text-primary mb-1 mt-2 block">
                                                                    {interval.label}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {predictionData.probabilityOverTime.length === 0 && predictionData.confidenceIntervals.length === 0 && (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500">No detailed prediction data available</p>
                                            </div>
                                        )}
                                    </CardContent>
                                )
                            ) : (
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="text-4xl mb-4 opacity-30">📊</div>
                                    <p className="text-lg font-semibold text-muted-foreground">No prediction data available</p>
                                    <p className="text-sm text-gray-500 text-center max-w-md mt-2">
                                        Could not load predictions. Please try again.
                                    </p>
                                    <Button
                                        onClick={fetchPredictions}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        Retry
                                    </Button>
                                </CardContent>
                            )}

                            <CardFooter className="border-t border-border/50 pt-6">
                                <div className="text-xs text-muted-foreground text-center w-full">
                                    {predictionData ? (
                                        predictionData.error ? 'Error fetching predictions' :
                                            `Predictions based on ${predictionData.predictionMode} analysis`
                                    ) : (
                                        'Predictions based on historical appearance patterns'
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
