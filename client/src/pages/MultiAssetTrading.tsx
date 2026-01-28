/**
 * Multi-Asset Trading Page
 * Unified trading interface for Stocks, Crypto, and Options
 * Leverages all Alpaca broker capabilities
 */

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  StarOff,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LineChart,
  CandlestickChart,
  Zap,
  Shield,
  Target,
  Layers
} from 'lucide-react';
import { useAssetClass, AssetClass, ASSET_CLASSES, POPULAR_SYMBOLS } from '@/contexts/AssetClassContext';
import { useBroker } from '@/contexts/BrokerContext';
import { AssetClassSelector, AssetClassBadge } from '@/components/AssetClassSelector';
import { cn } from '@/lib/utils';

// Asset class specific icons
const ASSET_ICONS = {
  stocks: '📈',
  crypto: '₿',
  options: '📊',
};

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
}

// Using any for positions to avoid type conflicts with server types

export default function MultiAssetTrading() {
  const { 
    assetClass, 
    setAssetClass, 
    currentAssetInfo, 
    popularSymbols, 
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    isMarketOpen,
    formatSymbol 
  } = useAssetClass();
  
  const { activeBroker, hasConnectedBroker, isPaperMode } = useBroker();

  // State
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc' | 'ioc' | 'fok'>('day');
  
  // Options specific state
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [expirationDate, setExpirationDate] = useState('');
  const [strikePrice, setStrikePrice] = useState('');

  // Set default symbol when asset class changes
  useEffect(() => {
    // Reset to first popular symbol when asset class changes
    if (popularSymbols.length > 0) {
      setSelectedSymbol(popularSymbols[0]);
    } else {
      setSelectedSymbol('');
    }
  }, [assetClass]); // Only trigger on asset class change, not on popularSymbols or selectedSymbol

  // Queries based on asset class
  const stockQuoteQuery = trpc.alpaca.getQuote.useQuery(
    { symbol: selectedSymbol },
    { enabled: assetClass === 'stocks' && !!selectedSymbol && hasConnectedBroker }
  );

  const cryptoQuoteQuery = trpc.crypto.price.useQuery(
    { symbol: selectedSymbol.replace('/USD', '') },
    { enabled: assetClass === 'crypto' && !!selectedSymbol }
  );

  const positionsQuery = trpc.alpaca.getPositions.useQuery(
    {},
    { enabled: hasConnectedBroker }
  );

  const accountQuery = trpc.alpaca.getAccountBalance.useQuery(
    undefined,
    { enabled: hasConnectedBroker }
  );

  // Options chain query
  const optionsChainQuery = trpc.alpaca.getOptionsChain.useQuery(
    { symbol: selectedSymbol },
    { enabled: assetClass === 'options' && !!selectedSymbol && hasConnectedBroker }
  );

  // Order mutation
  const placeOrderMutation = trpc.alpaca.placeOrder.useMutation({
    onSuccess: () => {
      // Reset form
      setQuantity('1');
      setLimitPrice('');
      setStopPrice('');
    },
  });

  // Get current quote based on asset class
  const currentQuote = useMemo((): Quote | null => {
    if (assetClass === 'stocks' && stockQuoteQuery.data) {
      return stockQuoteQuery.data as unknown as Quote;
    }
    if (assetClass === 'crypto' && cryptoQuoteQuery.data) {
      const data = cryptoQuoteQuery.data;
      return {
        symbol: selectedSymbol,
        price: data.price,
        change: data.priceChange24h || 0,
        changePercent: data.priceChangePercent24h || 0,
        volume: data.volume24h || 0,
        high: data.high24h || data.price,
        low: data.low24h || data.price,
        open: data.price - (data.priceChange24h || 0),
        previousClose: data.price - (data.priceChange24h || 0),
      };
    }
    return null;
  }, [assetClass, stockQuoteQuery.data, cryptoQuoteQuery.data, selectedSymbol]);

  // Filter positions by asset class
  const filteredPositions = useMemo(() => {
    if (!positionsQuery.data) return [];
    return positionsQuery.data.filter((pos: any) => {
      if (assetClass === 'stocks') return pos.assetClass === 'us_equity';
      if (assetClass === 'crypto') return pos.assetClass === 'crypto';
      if (assetClass === 'options') return pos.assetClass === 'option';
      return true;
    });
  }, [positionsQuery.data, assetClass]);

  // Handle order submission
  const handlePlaceOrder = () => {
    if (!selectedSymbol || !quantity) return;

    const orderData: any = {
      symbol: formatSymbol(selectedSymbol),
      qty: parseFloat(quantity),
      side: orderSide,
      type: orderType,
      time_in_force: timeInForce,
    };

    if (orderType === 'limit' || orderType === 'stop_limit') {
      orderData.limit_price = parseFloat(limitPrice);
    }
    if (orderType === 'stop' || orderType === 'stop_limit') {
      orderData.stop_price = parseFloat(stopPrice);
    }

    placeOrderMutation.mutate(orderData);
  };

  // Format helpers
  const formatPrice = (value: number) => {
    if (!value) return '--';
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  const formatChange = (value: number) => {
    if (!value && value !== 0) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatVolume = (value: number) => {
    if (!value) return '--';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  // Estimated order value
  const estimatedValue = useMemo(() => {
    const price = orderType === 'limit' ? parseFloat(limitPrice) : currentQuote?.price;
    const qty = parseFloat(quantity);
    if (!price || !qty) return 0;
    return price * qty;
  }, [orderType, limitPrice, currentQuote?.price, quantity]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Asset Class Selector */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className="text-4xl">{currentAssetInfo.icon}</span>
                Multi-Asset Trading
              </h1>
              <p className="text-muted-foreground mt-1">
                Trade {currentAssetInfo.name} with AI-powered insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AssetClassBadge />
              {isPaperMode && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Paper Trading
                </Badge>
              )}
            </div>
          </div>
          
          {/* Asset Class Tabs */}
          <AssetClassSelector variant="pills" />
        </div>

        {/* Market Status Banner */}
        {!currentAssetInfo.is24x7 && !isMarketOpen && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-yellow-500">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Market Closed - {currentAssetInfo.tradingHours}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  Orders will be queued for next market open
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {currentAssetInfo.is24x7 && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-green-500">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  24/7 Trading Available
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  Cryptocurrency markets never close
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Symbol Selection & Watchlist */}
          <div className="space-y-6">
            {/* Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Find {currentAssetInfo.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${assetClass === 'crypto' ? 'cryptocurrencies' : assetClass === 'options' ? 'underlying symbols' : 'stocks & ETFs'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Popular Symbols */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Popular</Label>
                  <div className="flex flex-wrap gap-2">
                    {popularSymbols.slice(0, 8).map((symbol) => (
                      <Button
                        key={symbol}
                        variant={selectedSymbol === symbol ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSymbol(symbol)}
                        className="text-xs"
                      >
                        {symbol}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Watchlist */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Watchlist
                  </CardTitle>
                  <Badge variant="outline">{watchlist.length} items</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {watchlist.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No items in watchlist</p>
                      <p className="text-xs">Click the star icon to add symbols</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {watchlist.map((symbol) => (
                        <div
                          key={symbol}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                            selectedSymbol === symbol ? "bg-primary/10" : "hover:bg-muted"
                          )}
                          onClick={() => setSelectedSymbol(symbol)}
                        >
                          <span className="font-medium">{symbol}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWatchlist(symbol);
                            }}
                          >
                            <StarOff className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Positions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {currentAssetInfo.name} Positions
                  </CardTitle>
                  <Badge variant="outline">{filteredPositions.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {filteredPositions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No {assetClass} positions</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPositions.map((pos: any) => (
                        <div
                          key={pos.symbol}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                            selectedSymbol === pos.symbol ? "bg-primary/10" : "hover:bg-muted"
                          )}
                          onClick={() => setSelectedSymbol(pos.symbol)}
                        >
                          <div>
                            <span className="font-medium">{pos.symbol}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {pos.qty} shares
                            </span>
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            pos.unrealizedPL >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {formatChange(pos.unrealizedPLPercent)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Quote & Chart */}
          <div className="space-y-6">
            {/* Quote Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currentAssetInfo.icon}</span>
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {selectedSymbol || 'Select Symbol'}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedSymbol) {
                              if (isInWatchlist(selectedSymbol)) {
                                removeFromWatchlist(selectedSymbol);
                              } else {
                                addToWatchlist(selectedSymbol);
                              }
                            }
                          }}
                        >
                          {isInWatchlist(selectedSymbol) ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                      </CardTitle>
                      <CardDescription>{currentAssetInfo.name}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (assetClass === 'stocks') stockQuoteQuery.refetch();
                    if (assetClass === 'crypto') cryptoQuoteQuery.refetch();
                  }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {currentQuote ? (
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold">
                        {formatPrice(currentQuote.price)}
                      </span>
                      <span className={cn(
                        "text-lg font-medium flex items-center gap-1",
                        currentQuote.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {currentQuote.changePercent >= 0 ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5" />
                        )}
                        {formatChange(currentQuote.changePercent)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Open</span>
                        <p className="font-medium">{formatPrice(currentQuote.open)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prev Close</span>
                        <p className="font-medium">{formatPrice(currentQuote.previousClose)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Day High</span>
                        <p className="font-medium text-green-500">{formatPrice(currentQuote.high)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Day Low</span>
                        <p className="font-medium text-red-500">{formatPrice(currentQuote.low)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volume</span>
                        <p className="font-medium">{formatVolume(currentQuote.volume)}</p>
                      </div>
                      {(currentQuote as any).bid && (currentQuote as any).ask && (
                        <div>
                          <span className="text-muted-foreground">Bid/Ask</span>
                          <p className="font-medium">
                            {formatPrice((currentQuote as any).bid)} / {formatPrice((currentQuote as any).ask)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {stockQuoteQuery.isLoading || cryptoQuoteQuery.isLoading ? (
                      <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                    ) : (
                      <>
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Select a symbol to view quote</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Options Chain (for options asset class) */}
            {assetClass === 'options' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Options Chain
                  </CardTitle>
                  <CardDescription>
                    Select expiration and strike price
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Option Type</Label>
                        <Select value={optionType} onValueChange={(v: 'call' | 'put') => setOptionType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="put">Put</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Expiration</Label>
                        <Input
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {optionsChainQuery.data && optionsChainQuery.data.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1">
                          {optionsChainQuery.data
                            .filter((opt: any) => opt.type === optionType)
                            .slice(0, 10)
                            .map((opt: any) => (
                              <div
                                key={opt.symbol}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded cursor-pointer",
                                  strikePrice === opt.strikePrice.toString() ? "bg-primary/10" : "hover:bg-muted"
                                )}
                                onClick={() => setStrikePrice(opt.strikePrice.toString())}
                              >
                                <span className="font-mono text-sm">${opt.strikePrice}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(opt.expirationDate).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {optionsChainQuery.isLoading ? (
                          <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                        ) : (
                          'Select a symbol to view options chain'
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Order Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Place Order</CardTitle>
                <CardDescription>
                  {hasConnectedBroker ? (
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected to {activeBroker?.brokerType || 'broker'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-500">
                      <AlertCircle className="h-3 w-3" />
                      Connect a broker to trade
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={orderSide === 'buy' ? 'default' : 'outline'}
                    className={cn(
                      orderSide === 'buy' && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => setOrderSide('buy')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Buy
                  </Button>
                  <Button
                    variant={orderSide === 'sell' ? 'default' : 'outline'}
                    className={cn(
                      orderSide === 'sell' && "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={() => setOrderSide('sell')}
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Sell
                  </Button>
                </div>

                <Separator />

                {/* Order Type */}
                <div>
                  <Label>Order Type</Label>
                  <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="stop_limit">Stop Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step={assetClass === 'crypto' ? '0.0001' : '1'}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>

                {/* Limit Price */}
                {(orderType === 'limit' || orderType === 'stop_limit') && (
                  <div>
                    <Label>Limit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="Enter limit price"
                    />
                  </div>
                )}

                {/* Stop Price */}
                {(orderType === 'stop' || orderType === 'stop_limit') && (
                  <div>
                    <Label>Stop Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      placeholder="Enter stop price"
                    />
                  </div>
                )}

                {/* Time in Force */}
                <div>
                  <Label>Time in Force</Label>
                  <Select value={timeInForce} onValueChange={(v: any) => setTimeInForce(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="gtc">Good Till Canceled</SelectItem>
                      <SelectItem value="ioc">Immediate or Cancel</SelectItem>
                      <SelectItem value="fok">Fill or Kill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Order Summary */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="font-medium">{selectedSymbol || '--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Price</span>
                    <span className="font-medium">
                      {orderType === 'market' 
                        ? formatPrice((currentQuote as any)?.price || 0)
                        : formatPrice(parseFloat(limitPrice) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Total</span>
                    <span className="font-bold">{formatPrice(estimatedValue)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className={cn(
                    "w-full",
                    orderSide === 'buy' 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-red-600 hover:bg-red-700"
                  )}
                  disabled={!hasConnectedBroker || !selectedSymbol || !quantity || placeOrderMutation.isPending}
                  onClick={handlePlaceOrder}
                >
                  {placeOrderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
                </Button>

                {placeOrderMutation.isError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {placeOrderMutation.error?.message || 'Failed to place order'}
                  </div>
                )}

                {placeOrderMutation.isSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                    Order placed successfully!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Summary */}
            {accountQuery.data && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buying Power</span>
                    <span className="font-medium">{formatPrice(accountQuery.data.buyingPower)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash</span>
                    <span className="font-medium">{formatPrice(accountQuery.data.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio Value</span>
                    <span className="font-medium">{formatPrice(accountQuery.data.portfolioValue)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
