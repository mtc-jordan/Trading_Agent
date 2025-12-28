/**
 * Crypto Trading Page
 * 24/7 cryptocurrency trading with crypto-specific indicators and DeFi integration
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bitcoin, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  Zap,
  Globe,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Percent
} from 'lucide-react';

const TOP_CRYPTOS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

export default function CryptoTrading() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [searchQuery, setSearchQuery] = useState('');
  const [interval, setInterval] = useState<'1h' | '4h' | '1d' | '1w'>('1d');

  // Queries
  const priceQuery = trpc.crypto.price.useQuery({ symbol: selectedSymbol });
  const pricesQuery = trpc.crypto.prices.useQuery({ symbols: TOP_CRYPTOS });
  const indicatorsQuery = trpc.crypto.indicators.useQuery({ symbol: selectedSymbol });
  const ohlcvQuery = trpc.crypto.ohlcv.useQuery({ symbol: selectedSymbol, interval, limit: 30 });
  const defiQuery = trpc.crypto.defiProtocols.useQuery();
  const analysisMutation = trpc.crypto.analysis.useMutation();

  const price = priceQuery.data;
  const prices = pricesQuery.data || [];
  const indicators = indicatorsQuery.data;
  const ohlcv = ohlcvQuery.data || [];
  const defiProtocols = defiQuery.data || [];

  const filteredCryptos = prices.filter(c => 
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAnalyze = () => {
    analysisMutation.mutate({ symbol: selectedSymbol });
  };

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bitcoin className="h-8 w-8 text-orange-500" />
              Crypto Trading
            </h1>
            <p className="text-muted-foreground mt-1">
              24/7 cryptocurrency trading with AI-powered analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              24/7 Market
            </Badge>
            <Button variant="outline" size="sm" onClick={() => pricesQuery.refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="market" className="space-y-4">
          <TabsList>
            <TabsTrigger value="market">Market Overview</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
            <TabsTrigger value="defi">DeFi Protocols</TabsTrigger>
          </TabsList>

          {/* Market Overview Tab */}
          <TabsContent value="market" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Crypto List */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Top Cryptocurrencies</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    {filteredCryptos.map((crypto) => (
                      <button
                        key={crypto.symbol}
                        onClick={() => setSelectedSymbol(crypto.symbol)}
                        className={`w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors border-b ${
                          selectedSymbol === crypto.symbol ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {crypto.symbol.slice(0, 2)}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{crypto.symbol}</div>
                            <div className="text-xs text-muted-foreground">{crypto.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatPrice(crypto.price)}</div>
                          <div className={`text-xs flex items-center justify-end ${
                            crypto.priceChangePercent24h >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {crypto.priceChangePercent24h >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {formatChange(crypto.priceChangePercent24h)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Crypto Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                        {selectedSymbol.slice(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{selectedSymbol}</CardTitle>
                        <CardDescription>{price?.name || 'Loading...'}</CardDescription>
                      </div>
                    </div>
                    <Select value={interval} onValueChange={(v) => setInterval(v as typeof interval)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1H</SelectItem>
                        <SelectItem value="4h">4H</SelectItem>
                        <SelectItem value="1d">1D</SelectItem>
                        <SelectItem value="1w">1W</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {price && (
                    <>
                      {/* Price Display */}
                      <div className="flex items-baseline gap-4">
                        <span className="text-4xl font-bold">{formatPrice(price.price)}</span>
                        <span className={`text-lg flex items-center ${
                          price.priceChangePercent24h >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {price.priceChangePercent24h >= 0 ? (
                            <TrendingUp className="h-5 w-5 mr-1" />
                          ) : (
                            <TrendingDown className="h-5 w-5 mr-1" />
                          )}
                          {formatChange(price.priceChangePercent24h)}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Market Cap</div>
                          <div className="font-semibold">{formatMarketCap(price.marketCap)}</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">24h Volume</div>
                          <div className="font-semibold">{formatVolume(price.volume24h)}</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">24h High</div>
                          <div className="font-semibold text-green-500">{formatPrice(price.high24h)}</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">24h Low</div>
                          <div className="font-semibold text-red-500">{formatPrice(price.low24h)}</div>
                        </div>
                      </div>

                      {/* Price Chart Placeholder */}
                      <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed">
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Price chart visualization</p>
                          <p className="text-sm">{ohlcv.length} data points loaded</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  AI-Powered Crypto Analysis
                </CardTitle>
                <CardDescription>
                  Get comprehensive analysis for {selectedSymbol} using our AI trading agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={analysisMutation.isPending}
                  className="w-full"
                >
                  {analysisMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing {selectedSymbol}...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      Analyze {selectedSymbol}
                    </>
                  )}
                </Button>

                {analysisMutation.data && (
                  <div className="space-y-4">
                    {/* Recommendation */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Recommendation</span>
                        <Badge variant={
                          analysisMutation.data.recommendation.action.includes('buy') ? 'default' :
                          analysisMutation.data.recommendation.action.includes('sell') ? 'destructive' : 'secondary'
                        }>
                          {analysisMutation.data.recommendation.action.toUpperCase().replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Confidence:</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${analysisMutation.data.recommendation.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {(analysisMutation.data.recommendation.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Sentiment Analysis</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Overall:</span>
                        <Badge variant={
                          analysisMutation.data.sentiment.overall.includes('bullish') ? 'default' :
                          analysisMutation.data.sentiment.overall.includes('bearish') ? 'destructive' : 'secondary'
                        }>
                          {analysisMutation.data.sentiment.overall.toUpperCase().replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">Score: {analysisMutation.data.sentiment.score.toFixed(2)}</div>
                      <ul className="space-y-1 text-sm">
                        {analysisMutation.data.sentiment.signals.map((signal: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Price Targets */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Price Targets</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Support Levels</div>
                          {analysisMutation.data.recommendation.priceTargets.support.map((level: number, i: number) => (
                            <div key={i} className="text-sm font-medium text-green-500">{formatPrice(level)}</div>
                          ))}
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Resistance Levels</div>
                          {analysisMutation.data.recommendation.priceTargets.resistance.map((level: number, i: number) => (
                            <div key={i} className="text-sm font-medium text-red-500">{formatPrice(level)}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Analysis Reasoning</h4>
                      <ul className="space-y-1 text-sm">
                        {analysisMutation.data.recommendation.reasoning.map((reason: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Indicators Tab */}
          <TabsContent value="indicators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Crypto-Specific Indicators for {selectedSymbol}
                </CardTitle>
                <CardDescription>
                  Technical indicators optimized for cryptocurrency markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {indicators ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* RSI */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">RSI (14)</span>
                        <Badge variant={
                          indicators.rsi > 70 ? 'destructive' :
                          indicators.rsi < 30 ? 'default' : 'secondary'
                        }>
                          {indicators.rsi > 70 ? 'Overbought' :
                           indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">{indicators.rsi.toFixed(1)}</div>
                      <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            indicators.rsi > 70 ? 'bg-red-500' :
                            indicators.rsi < 30 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${indicators.rsi}%` }}
                        />
                      </div>
                    </div>

                    {/* MACD */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">MACD</span>
                        <Badge variant={indicators.macd.histogram > 0 ? 'default' : 'destructive'}>
                          {indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value:</span>
                          <span className="font-medium">{indicators.macd.value.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Signal:</span>
                          <span className="font-medium">{indicators.macd.signal.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Histogram:</span>
                          <span className={`font-medium ${indicators.macd.histogram > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {indicators.macd.histogram.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bollinger Bands */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Bollinger Bands</span>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Upper:</span>
                          <span className="font-medium text-red-500">{formatPrice(indicators.bollingerBands.upper)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Middle:</span>
                          <span className="font-medium">{formatPrice(indicators.bollingerBands.middle)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lower:</span>
                          <span className="font-medium text-green-500">{formatPrice(indicators.bollingerBands.lower)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fear & Greed */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Fear & Greed</span>
                        <Badge variant={
                          indicators.fearGreedIndex > 75 ? 'destructive' :
                          indicators.fearGreedIndex < 25 ? 'default' : 'secondary'
                        }>
                          {indicators.fearGreedIndex > 75 ? 'Extreme Greed' :
                           indicators.fearGreedIndex > 55 ? 'Greed' :
                           indicators.fearGreedIndex < 25 ? 'Extreme Fear' :
                           indicators.fearGreedIndex < 45 ? 'Fear' : 'Neutral'}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">{indicators.fearGreedIndex}</div>
                      <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full mt-2 relative">
                        <div 
                          className="absolute w-2 h-4 bg-white border-2 border-gray-800 rounded -top-1"
                          style={{ left: `${indicators.fearGreedIndex}%` }}
                        />
                      </div>
                    </div>

                    {/* Moving Averages */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Moving Averages</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">EMA 20:</span>
                          <span className="font-medium">{formatPrice(indicators.ema20)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">EMA 50:</span>
                          <span className="font-medium">{formatPrice(indicators.ema50)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">EMA 200:</span>
                          <span className="font-medium">{formatPrice(indicators.ema200)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Crypto Metrics */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">On-Chain Metrics</span>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">NVT Ratio:</span>
                          <span className="font-medium">{indicators.nvtRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">MVRV Ratio:</span>
                          <span className="font-medium">{indicators.mvrvRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Funding Rate:</span>
                          <span className={`font-medium ${indicators.fundingRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(indicators.fundingRate * 100).toFixed(4)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Loading indicators...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DeFi Tab */}
          <TabsContent value="defi" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  DeFi Protocols
                </CardTitle>
                <CardDescription>
                  Top decentralized finance protocols by total value locked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {defiProtocols.map((protocol) => (
                    <div key={protocol.name} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{protocol.name}</span>
                        <Badge variant="outline">{protocol.chain}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">TVL:</span>
                          <span className="font-medium">{formatVolume(protocol.tvl)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">APY:</span>
                          <span className="font-medium text-green-500">{protocol.apy.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium capitalize">{protocol.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">24h Change:</span>
                          <span className={`font-medium ${protocol.tvlChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {protocol.tvlChange24h >= 0 ? '+' : ''}{protocol.tvlChange24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
