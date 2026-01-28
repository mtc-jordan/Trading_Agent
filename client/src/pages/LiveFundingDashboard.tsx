import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  RefreshCw,
  Search,
  ArrowUpDown,
  Zap,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Types for funding rate data
interface FundingRate {
  symbol: string;
  exchange: string;
  rate: number;
  rateAnnualized: number;
  nextFundingTime: number;
  markPrice: number;
}

interface YieldOpportunity {
  type: string;
  symbol: string;
  exchange: string;
  direction: string;
  fundingRate: number;
  estimatedApr: number;
  riskLevel: string;
  description: string;
}

interface ArbitrageOpportunity {
  symbol: string;
  longExchange: string;
  shortExchange: string;
  netRateAnnualized: number;
  estimatedApr: number;
  riskScore: number;
}

// Demo data - in production, this would come from tRPC
const demoFundingRates: FundingRate[] = [
  { symbol: 'BTCUSDT', exchange: 'binance', rate: 0.0001, rateAnnualized: 10.95, nextFundingTime: Date.now() + 3600000, markPrice: 97500 },
  { symbol: 'BTCUSDT', exchange: 'bybit', rate: 0.00012, rateAnnualized: 13.14, nextFundingTime: Date.now() + 3600000, markPrice: 97520 },
  { symbol: 'BTCUSDT', exchange: 'dydx', rate: 0.00008, rateAnnualized: 8.76, nextFundingTime: Date.now() + 3600000, markPrice: 97480 },
  { symbol: 'ETHUSDT', exchange: 'binance', rate: 0.00015, rateAnnualized: 16.43, nextFundingTime: Date.now() + 3600000, markPrice: 3250 },
  { symbol: 'ETHUSDT', exchange: 'bybit', rate: 0.00018, rateAnnualized: 19.71, nextFundingTime: Date.now() + 3600000, markPrice: 3252 },
  { symbol: 'ETHUSDT', exchange: 'dydx', rate: 0.00014, rateAnnualized: 15.33, nextFundingTime: Date.now() + 3600000, markPrice: 3248 },
  { symbol: 'SOLUSDT', exchange: 'binance', rate: 0.00025, rateAnnualized: 27.38, nextFundingTime: Date.now() + 3600000, markPrice: 185 },
  { symbol: 'SOLUSDT', exchange: 'bybit', rate: 0.00028, rateAnnualized: 30.66, nextFundingTime: Date.now() + 3600000, markPrice: 185.5 },
  { symbol: 'AVAXUSDT', exchange: 'binance', rate: 0.00008, rateAnnualized: 8.76, nextFundingTime: Date.now() + 3600000, markPrice: 42 },
  { symbol: 'AVAXUSDT', exchange: 'bybit', rate: 0.00006, rateAnnualized: 6.57, nextFundingTime: Date.now() + 3600000, markPrice: 42.1 },
  { symbol: 'ARBUSDT', exchange: 'binance', rate: 0.00012, rateAnnualized: 13.14, nextFundingTime: Date.now() + 3600000, markPrice: 1.25 },
  { symbol: 'OPUSDT', exchange: 'binance', rate: 0.00010, rateAnnualized: 10.95, nextFundingTime: Date.now() + 3600000, markPrice: 2.85 },
  { symbol: 'LINKUSDT', exchange: 'binance', rate: 0.00007, rateAnnualized: 7.67, nextFundingTime: Date.now() + 3600000, markPrice: 22.5 },
  { symbol: 'DOGEUSDT', exchange: 'binance', rate: -0.00005, rateAnnualized: -5.48, nextFundingTime: Date.now() + 3600000, markPrice: 0.35 },
  { symbol: 'XRPUSDT', exchange: 'binance', rate: 0.00003, rateAnnualized: 3.29, nextFundingTime: Date.now() + 3600000, markPrice: 2.45 },
];

const demoYieldOpportunities: YieldOpportunity[] = [
  { type: 'cash_and_carry', symbol: 'SOLUSDT', exchange: 'bybit', direction: 'short', fundingRate: 0.00028, estimatedApr: 27.59, riskLevel: 'low', description: 'Short SOL perpetual on Bybit while holding spot. Receive 0.028% funding every 8 hours.' },
  { type: 'cash_and_carry', symbol: 'ETHUSDT', exchange: 'bybit', direction: 'short', fundingRate: 0.00018, estimatedApr: 17.74, riskLevel: 'low', description: 'Short ETH perpetual on Bybit while holding spot. Receive 0.018% funding every 8 hours.' },
  { type: 'funding_arb', symbol: 'BTCUSDT', exchange: 'bybit', direction: 'short', fundingRate: 0.00004, estimatedApr: 3.50, riskLevel: 'medium', description: 'Short on Bybit (0.012%) + Long on dYdX (0.008%). Net 0.004% per funding.' },
  { type: 'cash_and_carry', symbol: 'ARBUSDT', exchange: 'binance', direction: 'short', fundingRate: 0.00012, estimatedApr: 11.83, riskLevel: 'low', description: 'Short ARB perpetual on Binance while holding spot. Receive 0.012% funding every 8 hours.' },
];

const demoArbitrageOpportunities: ArbitrageOpportunity[] = [
  { symbol: 'BTCUSDT', longExchange: 'dydx', shortExchange: 'bybit', netRateAnnualized: 4.38, estimatedApr: 3.50, riskScore: 25 },
  { symbol: 'ETHUSDT', longExchange: 'dydx', shortExchange: 'bybit', netRateAnnualized: 4.38, estimatedApr: 3.50, riskScore: 25 },
  { symbol: 'SOLUSDT', longExchange: 'binance', shortExchange: 'bybit', netRateAnnualized: 3.28, estimatedApr: 2.62, riskScore: 30 },
];

export default function LiveFundingDashboard() {
  const [activeTab, setActiveTab] = useState('rates');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'rate' | 'apr'>('apr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // In production, use tRPC to fetch real data
  const fundingRates = demoFundingRates;
  const yieldOpportunities = demoYieldOpportunities;
  const arbitrageOpportunities = demoArbitrageOpportunities;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdate(new Date());
    }, 2000);
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort funding rates
  const filteredRates = fundingRates
    .filter(r => r.symbol.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'symbol') comparison = a.symbol.localeCompare(b.symbol);
      else if (sortBy === 'rate') comparison = a.rate - b.rate;
      else if (sortBy === 'apr') comparison = a.rateAnnualized - b.rateAnnualized;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Group rates by symbol
  const groupedRates = filteredRates.reduce((acc, rate) => {
    if (!acc[rate.symbol]) acc[rate.symbol] = [];
    acc[rate.symbol].push(rate);
    return acc;
  }, {} as Record<string, FundingRate[]>);

  // Calculate stats
  const avgFundingRate = fundingRates.reduce((sum, r) => sum + r.rate, 0) / fundingRates.length;
  const positiveRates = fundingRates.filter(r => r.rate > 0).length;
  const negativeRates = fundingRates.filter(r => r.rate < 0).length;
  const highestApr = Math.max(...fundingRates.map(r => r.rateAnnualized));

  const formatRate = (rate: number) => {
    const percentage = (rate * 100).toFixed(4);
    return rate >= 0 ? `+${percentage}%` : `${percentage}%`;
  };

  const formatApr = (apr: number) => {
    return apr >= 0 ? `+${apr.toFixed(2)}%` : `${apr.toFixed(2)}%`;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getExchangeBadge = (exchange: string) => {
    const colors: Record<string, string> = {
      binance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      bybit: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      dydx: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return <Badge className={colors[exchange] || 'bg-gray-500/20'}>{exchange}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Funding Rates</h1>
          <p className="text-muted-foreground mt-1">
            Real-time funding rates from Binance, Bybit, and dYdX
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Funding Rate</p>
                <p className="text-2xl font-bold text-green-400">{formatRate(avgFundingRate)}</p>
                <p className="text-xs text-muted-foreground">Per 8 hours</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Highest APR</p>
                <p className="text-2xl font-bold text-blue-400">{formatApr(highestApr)}</p>
                <p className="text-xs text-muted-foreground">Annualized</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Positive / Negative</p>
                <p className="text-2xl font-bold">
                  <span className="text-green-400">{positiveRates}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-red-400">{negativeRates}</span>
                </p>
                <p className="text-xs text-muted-foreground">Funding rates</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yield Opportunities</p>
                <p className="text-2xl font-bold text-orange-400">{yieldOpportunities.length}</p>
                <p className="text-xs text-muted-foreground">Available now</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="rates">Funding Rates</TabsTrigger>
          <TabsTrigger value="yield">Yield Opportunities</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
          <TabsTrigger value="heatmap">Rate Heatmap</TabsTrigger>
        </TabsList>

        {/* Funding Rates Tab */}
        <TabsContent value="rates" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (sortBy === 'apr') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('apr');
              }}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort by APR
            </Button>
          </div>

          <div className="grid gap-4">
            {Object.entries(groupedRates).map(([symbol, rates]) => (
              <Card key={symbol}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{symbol.replace('USDT', '/USDT')}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Next funding in {Math.floor((rates[0].nextFundingTime - Date.now()) / 60000)} min
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rates.map((rate) => (
                      <div
                        key={`${rate.symbol}-${rate.exchange}`}
                        className="p-4 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {getExchangeBadge(rate.exchange)}
                          <span className="text-sm text-muted-foreground">
                            ${rate.markPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Rate (8h)</span>
                            <span className={`font-mono font-medium ${rate.rate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatRate(rate.rate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">APR</span>
                            <span className={`font-mono font-bold ${rate.rateAnnualized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatApr(rate.rateAnnualized)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Yield Opportunities Tab */}
        <TabsContent value="yield" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Yield Opportunities</CardTitle>
              <CardDescription>
                Automated strategies to capture funding rate yield
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {yieldOpportunities.map((opp, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {opp.type.replace(/_/g, ' ')}
                          </Badge>
                          {getExchangeBadge(opp.exchange)}
                          {getRiskBadge(opp.riskLevel)}
                        </div>
                        <h4 className="font-semibold">{opp.symbol.replace('USDT', '/USDT')}</h4>
                        <p className="text-sm text-muted-foreground">{opp.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {opp.estimatedApr.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Est. APR</div>
                        <Button size="sm" className="mt-2">
                          <Zap className="h-4 w-4 mr-1" />
                          Execute
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Exchange Arbitrage</CardTitle>
              <CardDescription>
                Funding rate differences between exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {arbitrageOpportunities.map((arb, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{arb.symbol.replace('USDT', '/USDT')}</h4>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-400">Long {arb.longExchange}</span>
                          <span className="text-muted-foreground">+</span>
                          <span className="text-red-400">Short {arb.shortExchange}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Risk Score: {arb.riskScore}/100
                          </span>
                          <Progress value={100 - arb.riskScore} className="w-20 h-2" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-400">
                          {arb.estimatedApr.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Est. APR</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Net Rate: {arb.netRateAnnualized.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funding Rate Heatmap</CardTitle>
              <CardDescription>
                Visual comparison of funding rates across exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Symbol</th>
                      <th className="text-center p-3 font-medium">
                        <Badge className="bg-yellow-500/20 text-yellow-400">Binance</Badge>
                      </th>
                      <th className="text-center p-3 font-medium">
                        <Badge className="bg-orange-500/20 text-orange-400">Bybit</Badge>
                      </th>
                      <th className="text-center p-3 font-medium">
                        <Badge className="bg-purple-500/20 text-purple-400">dYdX</Badge>
                      </th>
                      <th className="text-center p-3 font-medium">Spread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedRates).slice(0, 10).map(([symbol, rates]) => {
                      const binanceRate = rates.find(r => r.exchange === 'binance');
                      const bybitRate = rates.find(r => r.exchange === 'bybit');
                      const dydxRate = rates.find(r => r.exchange === 'dydx');
                      
                      const allRates = [binanceRate?.rate || 0, bybitRate?.rate || 0, dydxRate?.rate || 0].filter(r => r !== 0);
                      const spread = allRates.length > 1 ? Math.max(...allRates) - Math.min(...allRates) : 0;

                      const getRateColor = (rate: number | undefined) => {
                        if (!rate) return 'text-muted-foreground';
                        if (rate > 0.0002) return 'text-green-400 bg-green-500/20';
                        if (rate > 0.0001) return 'text-green-300 bg-green-500/10';
                        if (rate > 0) return 'text-green-200';
                        if (rate < -0.0001) return 'text-red-400 bg-red-500/20';
                        return 'text-red-200';
                      };

                      return (
                        <tr key={symbol} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{symbol.replace('USDT', '')}</td>
                          <td className={`p-3 text-center font-mono ${getRateColor(binanceRate?.rate)}`}>
                            {binanceRate ? formatRate(binanceRate.rate) : '-'}
                          </td>
                          <td className={`p-3 text-center font-mono ${getRateColor(bybitRate?.rate)}`}>
                            {bybitRate ? formatRate(bybitRate.rate) : '-'}
                          </td>
                          <td className={`p-3 text-center font-mono ${getRateColor(dydxRate?.rate)}`}>
                            {dydxRate ? formatRate(dydxRate.rate) : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {spread > 0 && (
                              <Badge variant="outline" className={spread > 0.0001 ? 'border-green-500 text-green-400' : ''}>
                                {formatRate(spread)}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/20" />
                  <span className="text-muted-foreground">High positive (&gt;0.02%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/10" />
                  <span className="text-muted-foreground">Moderate positive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500/20" />
                  <span className="text-muted-foreground">Negative</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Exchange Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exchange Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['binance', 'bybit', 'dydx'].map((exchange) => (
              <div key={exchange} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {getExchangeBadge(exchange)}
                  <span className="capitalize">{exchange}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Connected</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
