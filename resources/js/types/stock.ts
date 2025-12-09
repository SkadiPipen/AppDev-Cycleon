export interface StockItem {
    name: string;
    Stock: number;
    Emoji?: string;
    image: string;
    Tier?: string;
    Set?: string;
}

export interface WeatherItem {
    weather: string;
    active: boolean;
    duration: number;
    start_timestamp_unix: number;
    end_timestamp_unix: number;
    image: string;
}

export interface StockData {
    seed_stock: StockItem[];
    gear_stock: StockItem[];
    egg_stock: StockItem[];
    cosmetic_stock: StockItem[];
    Season_Stock: StockItem[];
    weather_events?: WeatherItem[];
}
