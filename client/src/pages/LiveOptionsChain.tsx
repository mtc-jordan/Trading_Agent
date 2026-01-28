import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  RefreshCw,
  Search,
  BarChart3,
  Layers,
  Target,
  Zap,
  Clock,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Types - matches EnhancedOptionData from alpacaOptions.ts
interface OptionData {
  symbol: string;
  underlying: string;
  expiration: Date;
  type: 'call' | 'put';
  strike: number;
  daysToExpiry: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  };
  iv: number;
  bidPrice: number;
  askPrice: number;
  midPrice: number;
  spread: number;
  spreadPercent: number;
  lastPrice: number;
}

interface OptionsAnalysis {
  underlying: string;
  spotPrice: number;
  timestamp: string;
  totalContracts: number;
  callCount: number;
  putCount: number;
  atmIV: number;
  avgCallIV: number;
  avgPutIV: number;
  ivSkew: number;
  ivTermStructure: 'contango' | 'backwardation' | 'flat';
  expectedMove: number;
  expectedMovePercent: number;
  recommendations: {
    type: string;
    title: string;
    description: string;
    confidence: number;
  }[];
}

export default function LiveOptionsChain() {
  const [symbol, setSymbol] = useState("AAPL");
  const [spotPrice, setSpotPrice] = useState(175);
  const [optionType, setOptionType] = useState<'all' | 'call' | 'put'>('all');
  const [minDTE, setMinDTE] = useState(1);
  const [maxDTE, setMaxDTE] = useState(60);
  // Using sonner toast directly

  // Queries
  const { data: alpacaStatus, isLoading: statusLoading } = trpc.options.alpacaStatus.useQuery();
  
  const { 
    data: optionsChain, 
    isLoading: chainLoading, 
    refetch: refetchChain,
    error: chainError 
  } = trpc.options.liveChain.useQuery({
    underlying: symbol,
    type: optionType === 'all' ? undefined : optionType,
    minDaysToExpiry: minDTE,
    maxDaysToExpiry: maxDTE,
    limit: 200
  }, {
    enabled: !!symbol && alpacaStatus?.configured,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { 
    data: analysis, 
    isLoading: analysisLoading,
    refetch: refetchAnalysis 
  } = trpc.options.liveAnalysis.useQuery({
    underlying: symbol,
    spotPrice: spotPrice
  }, {
    enabled: !!symbol && spotPrice > 0 && alpacaStatus?.configured,
    refetchInterval: 30000,
  });

  const { data: ivSurface, isLoading: surfaceLoading } = trpc.options.ivSurface.useQuery({
    underlying: symbol,
    spotPrice: spotPrice
  }, {
    enabled: !!symbol && spotPrice > 0 && alpacaStatus?.configured,
  });

  const { data: cacheStatus } = trpc.options.cacheStatus.useQuery();

  // Mutations
  const clearCacheMutation = trpc.options.clearCache.useMutation({
    onSuccess: () => {
      toast.success("Cache cleared", { description: "Options data cache has been cleared" });
      refetchChain();
      refetchAnalysis();
    }
  });

  const handleRefresh = () => {
    clearCacheMutation.mutate({ underlying: symbol });
  };

  const handleSearch = () => {
    refetchChain();
    refetchAnalysis();
  };

  // Group options by expiration
  const groupedOptions = optionsChain?.reduce((acc: Record<string, OptionData[]>, opt: OptionData) => {
    const expKey = opt.expiration instanceof Date ? opt.expiration.toLocaleDateString() : new Date(opt.expiration).toLocaleDateString();
    if (!acc[expKey]) acc[expKey] = [];
    acc[expKey].push(opt);
    return acc;
  }, {}) || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Options Chain</h1>
            <p className="text-muted-foreground">
              Real-time options data from Alpaca with Greeks and IV analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            {alpacaStatus?.configured ? (
              <Badge variant="default" className="bg-green-600">
                <Activity className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={clearCacheMutation.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${clearCacheMutation.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Connection Warning */}
        {!alpacaStatus?.configured && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alpaca Not Configured</AlertTitle>
            <AlertDescription>
              Please configure your Alpaca API credentials in the Brokers settings to access live options data.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Options Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-1 block">Symbol</label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="uppercase"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-1 block">Spot Price</label>
                <Input
                  type="number"
                  value={spotPrice}
                  onChange={(e) => setSpotPrice(parseFloat(e.target.value) || 0)}
                  placeholder="175.00"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={optionType} onValueChange={(v: 'all' | 'call' | 'put') => setOptionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="call">Calls</SelectItem>
                    <SelectItem value="put">Puts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="text-sm font-medium mb-1 block">Min DTE</label>
                <Input
                  type="number"
                  value={minDTE}
                  onChange={(e) => setMinDTE(parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="text-sm font-medium mb-1 block">Max DTE</label>
                <Input
                  type="number"
                  value={maxDTE}
                  onChange={(e) => setMaxDTE(parseInt(e.target.value) || 60)}
                  max={365}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={chainLoading}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Summary */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ATM IV</p>
                    <p className="text-2xl font-bold">{(analysis.atmIV * 100).toFixed(1)}%</p>
                  </div>
                  <Percent className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Call: {(analysis.avgCallIV * 100).toFixed(1)}% | Put: {(analysis.avgPutIV * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Move</p>
                    <p className="text-2xl font-bold">${analysis.expectedMove.toFixed(2)}</p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analysis.expectedMovePercent.toFixed(1)}% of spot price
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">IV Skew</p>
                    <p className="text-2xl font-bold">{(analysis.ivSkew * 100).toFixed(2)}%</p>
                  </div>
                  {analysis.ivSkew > 0 ? (
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analysis.ivSkew > 0 ? 'Put skew (bearish)' : 'Call skew (bullish)'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Term Structure</p>
                    <p className="text-2xl font-bold capitalize">{analysis.ivTermStructure}</p>
                  </div>
                  <Layers className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analysis.totalContracts} contracts ({analysis.callCount}C / {analysis.putCount}P)
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="chain" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chain" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Options Chain
            </TabsTrigger>
            <TabsTrigger value="surface" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              IV Surface
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          {/* Options Chain Tab */}
          <TabsContent value="chain">
            <Card>
              <CardHeader>
                <CardTitle>Live Options Chain</CardTitle>
                <CardDescription>
                  Real-time options data with Greeks from Alpaca
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chainLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : chainError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Options</AlertTitle>
                    <AlertDescription>{chainError.message}</AlertDescription>
                  </Alert>
                ) : optionsChain && optionsChain.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Strike</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">DTE</th>
                          <th className="text-right p-2">Bid</th>
                          <th className="text-right p-2">Ask</th>
                          <th className="text-right p-2">IV</th>
                          <th className="text-right p-2">Delta</th>
                          <th className="text-right p-2">Gamma</th>
                          <th className="text-right p-2">Theta</th>
                          <th className="text-right p-2">Vega</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optionsChain.slice(0, 50).map((opt: OptionData, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">${opt.strike.toFixed(2)}</td>
                            <td className="p-2">
                              <Badge variant={opt.type === 'call' ? 'default' : 'secondary'}>
                                {opt.type.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2">{opt.daysToExpiry}d</td>
                            <td className="text-right p-2">${opt.bidPrice.toFixed(2)}</td>
                            <td className="text-right p-2">${opt.askPrice.toFixed(2)}</td>
                            <td className="text-right p-2">{(opt.iv * 100).toFixed(1)}%</td>
                            <td className="text-right p-2">
                              <span className={opt.greeks.delta > 0 ? 'text-green-500' : 'text-red-500'}>
                                {opt.greeks.delta.toFixed(3)}
                              </span>
                            </td>
                            <td className="text-right p-2">{opt.greeks.gamma.toFixed(4)}</td>
                            <td className="text-right p-2 text-red-500">{opt.greeks.theta.toFixed(3)}</td>
                            <td className="text-right p-2">{opt.greeks.vega.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {optionsChain.length > 50 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 50 of {optionsChain.length} contracts
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No options data available. Try adjusting your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IV Surface Tab */}
          <TabsContent value="surface">
            <Card>
              <CardHeader>
                <CardTitle>Implied Volatility Surface</CardTitle>
                <CardDescription>
                  IV across strikes and expirations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {surfaceLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : ivSurface ? (
                  <div className="space-y-6">
                    {/* Term Structure */}
                    <div>
                      <h3 className="font-semibold mb-3">Term Structure</h3>
                      <div className="flex flex-wrap gap-4">
                        {ivSurface.termStructure.slice(0, 8).map((term: { daysToExpiry: number; atmIV: number }, idx: number) => (
                          <div key={idx} className="bg-muted p-3 rounded-lg min-w-[100px]">
                            <p className="text-xs text-muted-foreground">{term.daysToExpiry} DTE</p>
                            <p className="text-lg font-bold">{(term.atmIV * 100).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skew */}
                    <div>
                      <h3 className="font-semibold mb-3">Volatility Skew</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Strike</th>
                              <th className="text-right p-2">Moneyness</th>
                              <th className="text-right p-2">Call IV</th>
                              <th className="text-right p-2">Put IV</th>
                              <th className="text-right p-2">Skew</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ivSurface.skew.slice(0, 15).map((s: { strike: number; moneyness: number; callIV: number; putIV: number }, idx: number) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2">${s.strike.toFixed(2)}</td>
                                <td className="text-right p-2">{(s.moneyness * 100).toFixed(1)}%</td>
                                <td className="text-right p-2">{(s.callIV * 100).toFixed(1)}%</td>
                                <td className="text-right p-2">{(s.putIV * 100).toFixed(1)}%</td>
                                <td className="text-right p-2">
                                  <span className={s.putIV > s.callIV ? 'text-red-500' : 'text-green-500'}>
                                    {((s.putIV - s.callIV) * 100).toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No IV surface data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>
                  Trading opportunities based on options analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : analysis?.recommendations && analysis.recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.recommendations.map((rec, idx) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={
                                  rec.type === 'warning' ? 'destructive' :
                                  rec.type === 'opportunity' ? 'default' :
                                  'secondary'
                                }>
                                  {rec.type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {(rec.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <h4 className="font-semibold">{rec.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                            </div>
                            {rec.type === 'opportunity' ? (
                              <ArrowUpRight className="w-6 h-6 text-green-500" />
                            ) : rec.type === 'warning' ? (
                              <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            ) : (
                              <Info className="w-6 h-6 text-blue-500" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recommendations available at this time</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Cache Status */}
        {cacheStatus && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Cache: {cacheStatus.entries} entries | 
                  Symbols: {cacheStatus.underlyings.join(', ') || 'None'}
                </span>
                <span>
                  Last update: {cacheStatus.oldestEntry ? new Date(cacheStatus.oldestEntry).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
