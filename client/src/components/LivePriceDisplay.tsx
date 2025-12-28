import { usePriceSubscription, PriceUpdate } from "@/hooks/useSocket";
import { useMemo, useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePriceDisplayProps {
  symbol: string;
  showVolume?: boolean;
  showChange?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
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

// Multi-symbol price ticker
interface PriceTickerProps {
  symbols: string[];
  className?: string;
}

export function PriceTicker({ symbols, className }: PriceTickerProps) {
  const { prices, isLoading } = usePriceSubscription(symbols);

  return (
    <div className={cn("flex items-center gap-4 overflow-x-auto", className)}>
      {symbols.map((symbol) => {
        const data = prices.get(symbol.toUpperCase());
        const isPositive = data ? data.changePercent >= 0 : true;

        return (
          <div
            key={symbol}
            className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border shrink-0"
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
              </>
            ) : (
              <span className="text-muted-foreground text-sm">--</span>
            )}
          </div>
        );
      })}
    </div>
  );
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
