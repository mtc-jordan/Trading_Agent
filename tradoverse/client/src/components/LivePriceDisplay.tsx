import { usePriceSubscription, PriceUpdate } from "@/hooks/useSocket";
import { useMemo, useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LivePriceDisplayProps {
  symbol: string;
  showVolume?: boolean;
  showChange?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Check if market is currently open (simplified check)
function isMarketOpen(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const dayOfWeek = etTime.getDay();

  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // Regular market hours: 9:30 AM - 4:00 PM ET
  const regularOpen = 9 * 60 + 30;
  const regularClose = 16 * 60;

  return currentMinutes >= regularOpen && currentMinutes < regularClose;
}

export function LivePriceDisplay({
  symbol,
  showVolume = false,
  showChange = true,
  size = "md",
  className,
}: LivePriceDisplayProps) {
  const symbols = useMemo(() => [symbol.toUpperCase()], [symbol]);
  const { prices } = usePriceSubscription(symbols);
  const priceData = prices.get(symbol.toUpperCase());
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  // Flash effect on price change
  useEffect(() => {
    if (priceData && prevPrice !== null) {
      if (priceData.price > prevPrice) {
        setFlash("up");
      } else if (priceData.price < prevPrice) {
        setFlash("down");
      }
      const timer = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(timer);
    }
    if (priceData) {
      setPrevPrice(priceData.price);
    }
  }, [priceData?.price]);

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl font-semibold",
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  if (!priceData) {
    return (
      <div className={cn("flex items-center gap-2", sizeClasses[size], className)}>
        <span className="text-muted-foreground">--</span>
      </div>
    );
  }

  const isPositive = priceData.changePercent >= 0;
  const isNeutral = priceData.changePercent === 0;

  return (
    <div className={cn("flex items-center gap-2", sizeClasses[size], className)}>
      <span
        className={cn(
          "font-mono transition-colors duration-300",
          flash === "up" && "text-green-400",
          flash === "down" && "text-red-400"
        )}
      >
        {formatPrice(priceData.price)}
      </span>

      {showChange && (
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs",
            isNeutral && "text-muted-foreground",
            isPositive && !isNeutral && "text-green-500",
            !isPositive && "text-red-500"
          )}
        >
          {isNeutral ? (
            <Minus className="h-3 w-3" />
          ) : isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive && !isNeutral && "+"}
          {priceData.changePercent.toFixed(2)}%
        </span>
      )}

      {showVolume && (
        <span className="text-xs text-muted-foreground">
          Vol: {formatVolume(priceData.volume)}
        </span>
      )}
    </div>
  );
}

// Multi-symbol price ticker with last closing prices fallback
interface PriceTickerProps {
  symbols: string[];
  className?: string;
}

interface LastClosingPrice {
  symbol: string;
  close: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export function PriceTicker({ symbols, className }: PriceTickerProps) {
  const { prices, isLoading: isStreamLoading } = usePriceSubscription(symbols);
  const marketOpen = isMarketOpen();
  
  // Fetch last closing prices when market is closed
  const { data: lastClosingPrices, isLoading: isClosingLoading } = trpc.alpaca.getLastClosingPrices.useQuery(
    { symbols },
    {
      enabled: !marketOpen,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    }
  );

  const { data: clockData } = trpc.alpaca.getClock.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const nextOpen = clockData?.next_open ? new Date(clockData.next_open) : null;
  const timeUntilOpen = nextOpen ? formatTimeUntil(nextOpen) : null;

  // Determine which data source to use
  const hasLiveData = symbols.some(s => prices.get(s.toUpperCase()));
  const showClosingPrices = !marketOpen && !hasLiveData && lastClosingPrices;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Market closed indicator */}
      {!marketOpen && !hasLiveData && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Moon className="h-3.5 w-3.5" />
          <span>Showing last closing prices</span>
          {timeUntilOpen && (
            <span className="text-green-400">• Opens in {timeUntilOpen}</span>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-4 overflow-x-auto">
        {symbols.map((symbol) => {
          const liveData = prices.get(symbol.toUpperCase());
          const closingData = lastClosingPrices?.find(p => p.symbol === symbol.toUpperCase());
          
          // Use live data if available, otherwise use closing data
          const data = liveData || (closingData ? {
            price: closingData.close,
            changePercent: closingData.changePercent,
            volume: closingData.volume,
          } : null);
          
          const isPositive = data ? data.changePercent >= 0 : true;
          const isLive = !!liveData;

          return (
            <Tooltip key={symbol}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border shrink-0 cursor-default",
                    !isLive && data && "border-dashed opacity-80"
                  )}
                >
                  <span className="font-medium text-sm">{symbol}</span>
                  {data ? (
                    <>
                      <span className="font-mono text-sm">
                        ${data.price.toFixed(2)}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isPositive ? "text-green-500" : "text-red-500"
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {data.changePercent.toFixed(2)}%
                      </span>
                      {!isLive && (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">--</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isLive ? (
                  <p className="text-xs">Live streaming price</p>
                ) : data ? (
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Last Closing Price</p>
                    {closingData && (
                      <>
                        <p>Previous Close: ${closingData.previousClose.toFixed(2)}</p>
                        <p>Change: {closingData.change >= 0 ? '+' : ''}${closingData.change.toFixed(2)}</p>
                        <p>Volume: {formatVolume(closingData.volume)}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs">No price data available</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeUntil(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return "now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}

// Compact price badge for lists
interface PriceBadgeProps {
  symbol: string;
  className?: string;
}

export function PriceBadge({ symbol, className }: PriceBadgeProps) {
  const symbols = useMemo(() => [symbol.toUpperCase()], [symbol]);
  const { prices } = usePriceSubscription(symbols);
  const data = prices.get(symbol.toUpperCase());

  if (!data) {
    return (
      <span className={cn("text-muted-foreground", className)}>--</span>
    );
  }

  const isPositive = data.changePercent >= 0;

  return (
    <span
      className={cn(
        "font-mono",
        isPositive ? "text-green-500" : "text-red-500",
        className
      )}
    >
      ${data.price.toFixed(2)}
    </span>
  );
}

// Enhanced price card with overnight change
interface PriceCardProps {
  symbol: string;
  showOvernightChange?: boolean;
  className?: string;
}

export function PriceCard({ symbol, showOvernightChange = true, className }: PriceCardProps) {
  const symbols = useMemo(() => [symbol.toUpperCase()], [symbol]);
  const { prices } = usePriceSubscription(symbols);
  const liveData = prices.get(symbol.toUpperCase());
  const marketOpen = isMarketOpen();

  const { data: closingData } = trpc.alpaca.getLastClosingPrices.useQuery(
    { symbols: [symbol] },
    {
      enabled: showOvernightChange,
      staleTime: 5 * 60 * 1000,
    }
  );

  const lastClose = closingData?.[0];
  const currentPrice = liveData?.price || lastClose?.close;
  const previousClose = lastClose?.previousClose;
  
  // Calculate overnight change (from previous close to current/last close)
  const overnightChange = currentPrice && previousClose 
    ? ((currentPrice - previousClose) / previousClose) * 100 
    : null;

  if (!currentPrice) {
    return (
      <div className={cn("p-4 bg-card rounded-lg border", className)}>
        <div className="text-center text-muted-foreground">
          <p className="font-medium">{symbol}</p>
          <p className="text-sm">No data available</p>
        </div>
      </div>
    );
  }

  const isPositive = overnightChange ? overnightChange >= 0 : true;

  return (
    <div className={cn("p-4 bg-card rounded-lg border", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{symbol}</span>
        {!marketOpen && !liveData && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Closed
          </span>
        )}
      </div>
      
      <p className="text-2xl font-mono font-bold">
        ${currentPrice.toFixed(2)}
      </p>
      
      {showOvernightChange && overnightChange !== null && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {marketOpen ? "Today's Change" : "Since Previous Close"}
            </span>
            <span className={cn(
              "flex items-center gap-1",
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{overnightChange.toFixed(2)}%
            </span>
          </div>
          {previousClose && (
            <p className="text-xs text-muted-foreground mt-1">
              Previous Close: ${previousClose.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
