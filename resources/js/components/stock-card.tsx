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
import { Clock, AlertCircle, Image as ImageIcon } from "lucide-react";
import React from "react";

export interface StockItem {
    name: string;
    Stock?: number;     // ← Make optional
    stock?: number;     // ← Add lowercase version
    quantity?: number;  // ← Add quantity field
    Emoji?: string;
    image?: string;     // ← Make optional
    Tier?: string;
    Set?: string;
}

interface StockCardProps {
    title: string;
    items: StockItem[];
    lastRestock: string;
    nextRestock: string;
    countdown: string;
    intervalMinutes: number;
    isLoading?: boolean;
    error?: string;
}

export default function StockCard({
                                      title,
                                      items,
                                      lastRestock,
                                      nextRestock,
                                      countdown,
                                      intervalMinutes,
                                      isLoading = false,
                                      error = "",
                                  }: StockCardProps) {

    // Helper to get stock count from ANY field
    const getStockCount = (item: StockItem): number => {
        return item.Stock || item.stock || item.quantity || 0;
    };

    // Helper to get image URL
    const getImageUrl = (item: StockItem): string => {
        if (item.image) return item.image;

        // Generate from name if no image
        const cleanName = (item.name || 'unknown')
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        return `https://cdn.3itx.tech/image/GrowAGarden/${cleanName}`;
    };

    // Handle broken images
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, itemName: string) => {
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
            const fallback = document.createElement('div');
            fallback.className = 'rounded-md w-12 h-12 bg-primary/20 flex items-center justify-center';
            fallback.textContent = itemName.charAt(0).toUpperCase();
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
                        <div className="space-y-1">
                            <div>Last restock: {lastRestock}</div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Restocks in: {countdown}</span>
                            </div>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[24rem]">
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
                        <div className="space-y-1">
                            <div>Last restock: {lastRestock}</div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Restocks in: {countdown}</span>
                            </div>
                        </div>
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
                        {items.length} items
                    </span>
                </CardTitle>
                <CardDescription>
                    <div className="space-y-1">
                        <div>Last restock: {lastRestock}</div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Restocks in: {countdown}</span>
                        </div>
                    </div>
                </CardDescription>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[24rem] overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No stock available
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {items.map((item, i) => {
                                const stockCount = getStockCount(item);
                                const imageUrl = getImageUrl(item);

                                return (
                                    <Item variant="muted" key={i} className="bg-primary/10 hover:bg-primary/20">
                                        <ItemMedia variant="image" className="relative">
                                            <div className="relative">
                                                <img
                                                    src={imageUrl}
                                                    alt={item.name}
                                                    className="rounded-md w-12 h-12 object-cover"
                                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                                        handleImageError(e, item.name);
                                                    }}
                                                    loading="lazy"
                                                />
                                                {/* Fallback */}
                                                <div
                                                    className="rounded-md w-12 h-12 bg-primary/20 flex items-center justify-center absolute inset-0 hidden"
                                                    id={`fallback-${i}`}
                                                >
                                                    <span className="font-bold text-sm">
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </ItemMedia>

                                        <ItemContent>
                                            <ItemTitle className="truncate">{item.name}</ItemTitle>
                                            {item.Tier && (
                                                <span className="text-xs text-gray-500">{item.Tier}</span>
                                            )}
                                            {item.Set && (
                                                <span className="text-xs text-gray-500 ml-2">({item.Set})</span>
                                            )}
                                        </ItemContent>

                                        <ItemContent className="text-right">
                                            <div className="text-xl font-bold">
                                                {stockCount}
                                            </div>
                                            <ItemDescription className="text-xs">
                                                in stock
                                            </ItemDescription>
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
