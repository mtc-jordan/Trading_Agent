/**
 * TradoVerse Live Price Ticker Component
 * 
 * Displays real-time price updates with:
 * - Price change animations (flash green/red)
 * - Connection status indicator
 * - Multi-asset support
 * - Compact and expanded views
 */

import { useState, useEffect } from 'react';
import { useRealtimePrices, type PriceUpdate, type AssetType } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Bitcoin,
  DollarSign,
  BarChart3,
  Gem
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ==================== TYPES ====================

interface LivePriceTickerProps {
  symbols: string[];
  variant?: 'compact' | 'expanded' | 'card';
  showConnectionStatus?: boolean;
  className?: string;
}

interface PriceCardProps {
  price: PriceUpdate;
  variant?: 'compact' | 'expanded' | 'card';
}

// ==================== HELPER FUNCTIONS ====================

function getAssetIcon(assetType?: AssetType) {
  switch (assetType) {
    case 'crypto':
      return <Bitcoin className="h-4 w-4" />;
    case 'forex':
      return <DollarSign className="h-4 w-4" />;
    case 'commodity':
      return <Gem className="h-4 w-4" />;
    default:
      return <BarChart3 className="h-4 w-4" />;
  }
}

function formatPrice(price: number, assetType?: AssetType): string {
  if (assetType === 'forex') {
    return price.toFixed(5);
  }
  if (assetType === 'crypto' && price < 1) {
    return price.toFixed(6);
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toString();
}

// ==================== PRICE CARD COMPONENT ====================

function PriceCard({ price, variant = 'compact' }: PriceCardProps) {
  const isPositive = price.changePercent >= 0;
  const isFlashing = price.isFlashing;
  const direction = price.priceDirection;

  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const flashBg = direction === 'up' 
    ? 'bg-green-500/20' 
    : direction === 'down' 
    ? 'bg-red-500/20' 
    : '';

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300",
          isFlashing && flashBg
        )}
      >
        <span className="text-xs text-muted-foreground">{getAssetIcon(price.assetType)}</span>
        <span className="font-medium text-sm">{price.symbol}</span>
        <span className={cn("font-mono text-sm", isFlashing && (direction === 'up' ? 'text-green-500' : direction === 'down' ? 'text-red-500' : ''))}>
          ${formatPrice(price.price, price.assetType)}
        </span>
        <span className={cn("text-xs flex items-center gap-0.5", changeColor)}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(price.changePercent).toFixed(2)}%
        </span>
      </div>
    );
  }

  if (variant === 'expanded') {
    return (
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-2 rounded-lg border transition-all duration-300",
          isFlashing && flashBg,
          "hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            {getAssetIcon(price.assetType)}
          </div>
          <div>
            <div className="font-semibold">{price.symbol}</div>
            <div className="text-xs text-muted-foreground capitalize">{price.assetType}</div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={cn(
            "font-mono text-lg font-semibold transition-colors duration-300",
            isFlashing && (direction === 'up' ? 'text-green-500' : direction === 'down' ? 'text-red-500' : '')
          )}>
            ${formatPrice(price.price, price.assetType)}
          </div>
          <div className={cn("text-sm flex items-center justify-end gap-1", changeColor)}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{price.change.toFixed(2)}</span>
            <span>({Math.abs(price.changePercent).toFixed(2)}%)</span>
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div 
      className={cn(
        "p-4 rounded-xl border bg-card transition-all duration-300",
        isFlashing && flashBg,
        "hover:shadow-lg"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-muted">
            {getAssetIcon(price.assetType)}
          </div>
          <div>
            <div className="font-semibold">{price.symbol}</div>
            <Badge variant="outline" className="text-xs capitalize">
              {price.assetType}
            </Badge>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-sm",
          isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        )}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {Math.abs(price.changePercent).toFixed(2)}%
        </div>
      </div>
      
      <div className={cn(
        "text-2xl font-bold font-mono mb-2 transition-colors duration-300",
        isFlashing && (direction === 'up' ? 'text-green-500' : direction === 'down' ? 'text-red-500' : '')
      )}>
        ${formatPrice(price.price, price.assetType)}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">Change</div>
          <div className={changeColor}>
            {isPositive ? '+' : ''}{price.change.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Volume</div>
          <div>{formatVolume(price.volume)}</div>
        </div>
        {price.high24h && (
          <div>
            <div className="text-muted-foreground">24h High</div>
            <div className="text-green-500">${formatPrice(price.high24h, price.assetType)}</div>
          </div>
        )}
        {price.low24h && (
          <div>
            <div className="text-muted-foreground">24h Low</div>
            <div className="text-red-500">${formatPrice(price.low24h, price.assetType)}</div>
          </div>
        )}
      </div>
      
      {price.bid && price.ask && (
        <div className="mt-3 pt-3 border-t flex justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Bid:</span>{' '}
            <span className="font-mono">${formatPrice(price.bid, price.assetType)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Ask:</span>{' '}
            <span className="font-mono">${formatPrice(price.ask, price.assetType)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function LivePriceTicker({ 
  symbols, 
  variant = 'compact',
  showConnectionStatus = true,
  className 
}: LivePriceTickerProps) {
  const { prices, connectionStatus, getAllPrices, refresh } = useRealtimePrices(symbols);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const allPrices = getAllPrices();

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1 overflow-x-auto", className)}>
        {showConnectionStatus && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "p-1.5 rounded-full",
                  connectionStatus.connected ? 'text-green-500' : 'text-red-500'
                )}>
                  {connectionStatus.connected ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {connectionStatus.connected ? 'Connected - Live prices' : 'Disconnected - Polling mode'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {allPrices.map(price => (
            <PriceCard key={price.symbol} price={price} variant="compact" />
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 shrink-0"
          onClick={handleRefresh}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showConnectionStatus && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
              connectionStatus.connected 
                ? 'bg-green-500/10 text-green-500' 
                : 'bg-red-500/10 text-red-500'
            )}>
              {connectionStatus.connected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline</span>
                </>
              )}
            </div>
            {connectionStatus.reconnecting && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Reconnecting...
              </span>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      )}
      
      {variant === 'expanded' ? (
        <div className="space-y-2">
          {allPrices.map(price => (
            <PriceCard key={price.symbol} price={price} variant="expanded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allPrices.map(price => (
            <PriceCard key={price.symbol} price={price} variant="card" />
          ))}
        </div>
      )}
      
      {allPrices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No price data available</p>
          <p className="text-sm">Add symbols to start tracking</p>
        </div>
      )}
    </div>
  );
}

// ==================== MINI TICKER COMPONENT ====================

export function MiniPriceTicker({ symbols }: { symbols: string[] }) {
  const { getAllPrices, connectionStatus } = useRealtimePrices(symbols);
  const allPrices = getAllPrices();

  return (
    <div className="flex items-center gap-4 overflow-x-auto py-2 px-4 bg-muted/30 rounded-lg">
      <div className={cn(
        "w-2 h-2 rounded-full shrink-0",
        connectionStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      )} />
      
      {allPrices.map(price => {
        const isPositive = price.changePercent >= 0;
        return (
          <div 
            key={price.symbol}
            className={cn(
              "flex items-center gap-2 shrink-0 transition-all duration-300",
              price.isFlashing && (price.priceDirection === 'up' ? 'text-green-500' : price.priceDirection === 'down' ? 'text-red-500' : '')
            )}
          >
            <span className="font-medium">{price.symbol}</span>
            <span className="font-mono">${formatPrice(price.price, price.assetType)}</span>
            <span className={cn("text-xs", isPositive ? 'text-green-500' : 'text-red-500')}>
              {isPositive ? '+' : ''}{price.changePercent.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default LivePriceTicker;
