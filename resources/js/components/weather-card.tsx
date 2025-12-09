import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, CloudRain, CloudSnow, Sun, Thermometer, Wind, AlertCircle, Clock } from "lucide-react";
import React, { useEffect, useState } from "react";

interface WeatherEventItem {
    Name: string;
    DisplayName: string;
    Image: string;
    Description: string;
    LastSeen: number;
    start_timestamp_unix: number;
    end_timestamp_unix: number;
    active?: boolean;
    duration?: number;
}

interface WeatherCardProps {
    title: string;
    items: WeatherEventItem[];
    isLoading?: boolean;
    error?: string;
}

export default function WeatherCard({
                                        title,
                                        items,
                                        isLoading = false,
                                        error = "",
                                    }: WeatherCardProps) {
    // Add state to track current time for updating the timer
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

    // Update current time every 30 seconds for more accurate countdown
    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000));
        }, 30000); // Update every 30 seconds

        return () => clearInterval(intervalId);
    }, []);

    const getWeatherIcon = (weatherType: string) => {
        const type = weatherType.toLowerCase();
        if (type.includes('rain')) return <CloudRain className="h-6 w-6" />;
        if (type.includes('snow')) return <CloudSnow className="h-6 w-6" />;
        if (type.includes('sun') || type.includes('heat')) return <Sun className="h-6 w-6" />;
        if (type.includes('wind')) return <Wind className="h-6 w-6" />;
        return <Cloud className="h-6 w-6" />;
    };

    // Calculate remaining time for weather event
    const getRemainingTime = (endTimestamp: number) => {
        const now = currentTime;
        const remainingSeconds = endTimestamp - now;

        if (remainingSeconds <= 0) return "Ended";

        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    };

    // Format time nicely with singular/plural
    const formatRemainingTime = (endTimestamp: number) => {
        const now = currentTime;
        const remainingSeconds = endTimestamp - now;

        if (remainingSeconds <= 0) return "Ended";

        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            const seconds = remainingSeconds % 60;
            return `${seconds}s`;
        }
    };

    // Handle broken images
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, weatherName: string) => {
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
            const fallback = document.createElement('div');
            fallback.className = 'rounded-md w-12 h-12 bg-primary/20 flex items-center justify-center';
            fallback.textContent = weatherName.charAt(0).toUpperCase();
            parent.appendChild(fallback);
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <Card className="bg-background/20 hover:bg-primary/20 max-w-md">
                <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>
                        Current weather conditions in Grow a Garden
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[26rem]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Show error state
    if (error) {
        return (
            <Card className="bg-background/20 hover:bg-primary/20 max-w-md border-red-200">
                <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>
                        Current weather conditions in Grow a Garden
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[24rem] text-center p-4">
                        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                        <p className="text-red-600 font-medium">{error}</p>
                        <p className="text-gray-500 text-sm mt-2">Try refreshing the page</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-background/20 hover:bg-primary/20 max-w-md transition-all duration-200 hover:scale-[1.01]">
            <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                    <span>{title}</span>
                    <span className="text-sm font-normal bg-primary/20 px-2 py-1 rounded">
                        {items.length} {items.length === 1 ? 'event' : 'events'}
                    </span>
                </CardTitle>
                <CardDescription>
                    <div className="space-y-1">
                        <div>Current weather conditions in Grow a Garden</div>
                        <div className="flex items-center gap-2">
                        </div>
                    </div>
                </CardDescription>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[24rem] overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No weather events active
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {items.map((weather, i) => {
                                const remainingTime = formatRemainingTime(weather.end_timestamp_unix);
                                const imageUrl = weather.Image || `https://cdn.3itx.tech/image/GrowAGarden/${weather.Name.toLowerCase().replace(/\s+/g, '_')}`;

                                return (
                                    <Item variant="muted" key={i} className="bg-primary/10 hover:bg-primary/20">
                                        <ItemMedia variant="image" className="relative">
                                            <div className="relative">
                                                <img
                                                    src={imageUrl}
                                                    alt={weather.DisplayName}
                                                    className="rounded-md w-12 h-12 object-cover"
                                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                                        handleImageError(e, weather.DisplayName);
                                                    }}
                                                    loading="lazy"
                                                />
                                                {/* Fallback */}
                                                <div
                                                    className="rounded-md w-12 h-12 bg-primary/20 flex items-center justify-center absolute inset-0 hidden"
                                                    id={`weather-fallback-${i}`}
                                                >
                                                    {getWeatherIcon(weather.Name)}
                                                </div>
                                            </div>
                                        </ItemMedia>

                                        <ItemContent>
                                            <div className="flex items-center gap-2">
                                                <ItemTitle className="truncate">{weather.DisplayName}</ItemTitle>
                                                <span className={`px-2 py-0.5 text-xs rounded ${weather.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {weather.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <ItemDescription className="text-sm">
                                                {weather.Description}
                                            </ItemDescription>
                                        </ItemContent>

                                        <ItemContent className="text-right">
                                            <div className="text-xl font-bold">
                                                {remainingTime}
                                            </div>
                                            <ItemDescription className="text-xs">
                                                remaining
                                            </ItemDescription>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Started: {new Date(weather.start_timestamp_unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </ItemContent>
                                    </Item>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
