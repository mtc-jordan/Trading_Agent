import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  TrendingUp, TrendingDown, Minus, Search, Loader2, 
  BarChart3, Bitcoin, DollarSign, Wheat, LineChart,
  AlertTriangle, CheckCircle, XCircle, Info, Wifi, WifiOff
} from 'lucide-react';
import { LivePriceTicker, MiniPriceTicker } from '@/components/LivePriceTicker';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { CorrelationMatrix } from '@/components/CorrelationMatrix';
import { PortfolioOptimizer } from '@/components/PortfolioOptimizer';

type AssetType = 'stock' | 'crypto' | 'options' | 'forex' | 'commodity';
type SignalStrength = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

const assetTypeIcons: Record<AssetType, React.ReactNode> = {
  stock: <BarChart3 className="h-4 w-4" />,
  crypto: <Bitcoin className="h-4 w-4" />,
  options: <LineChart className="h-4 w-4" />,
  forex: <DollarSign className="h-4 w-4" />,
  commodity: <Wheat className="h-4 w-4" />,
};

const assetTypeLabels: Record<AssetType, string> = {
  stock: 'Stocks',
  crypto: 'Cryptocurrency',
  options: 'Options',
  forex: 'Forex',
  commodity: 'Commodities',
};

const signalColors: Record<SignalStrength, string> = {
  strong_buy: 'bg-green-500',
  buy: 'bg-green-400',
  hold: 'bg-yellow-500',
  sell: 'bg-red-400',
  strong_sell: 'bg-red-500',
};

const signalLabels: Record<SignalStrength, string> = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  hold: 'Hold',
  sell: 'Sell',
  strong_sell: 'Strong Sell',
};

const riskColors: Record<string, string> = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  extreme: 'text-red-500',
};

// Default watchlist for each asset type
const defaultWatchlists: Record<AssetType, string[]> = {
  stock: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'],
  crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD'],
  options: ['AAPL', 'SPY', 'QQQ', 'TSLA'],
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD'],
  commodity: ['GC=F', 'SI=F', 'CL=F', 'NG=F'],
};

export default function MultiAssetAnalysis() {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showLivePrices, setShowLivePrices] = useState(true);

  // Get watchlist symbols based on current asset type
  const watchlistSymbols = defaultWatchlists[assetType];
  
  // Real-time price tracking
  const { prices, connectionStatus, getPrice } = useRealtimePrices(watchlistSymbols);

  const analyzeMutation = trpc.multiAsset.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
  });

  const detectAssetType = trpc.multiAsset.detectAssetType.useQuery(
    { symbol },
    { enabled: symbol.length > 2 }
  );

  const handleAnalyze = () => {
    if (!symbol) return;

    const input: any = {
      symbol: symbol.toUpperCase(),
      assetType,
      currentPrice: 100,
      priceChange24h: 2.5,
      volume24h: 1000000,
    };

    if (assetType === 'stock') {
      input.stockData = {
        sector: 'Technology',
        industry: 'Software',
        peRatio: 25,
        earningsGrowth: 15,
        dividendYield: 0.5,
      };
    } else if (assetType === 'crypto') {
      input.cryptoData = {
        symbol: symbol.toUpperCase(),
        category: 'layer1',
        currentPrice: 100,
        priceChange24h: 2.5,
        priceChange7d: 5.0,
        volume24h: 1000000,
        marketCap: 100000000,
      };
    } else if (assetType === 'forex') {
      input.forexData = {
        baseCurrency: symbol.split('/')[0] || 'EUR',
        quoteCurrency: symbol.split('/')[1] || 'USD',
        interestRateDiff: 1.5,
        centralBankBias: 'neutral',
        cotPositioning: 25,
      };
    } else if (assetType === 'commodity') {
      input.commodityData = {
        commodityType: 'energy',
        inventoryLevels: 45,
        seasonalPattern: 0.3,
        supplyDisruption: false,
      };
    } else if (assetType === 'options') {
      input.optionsData = {
        symbol: symbol.toUpperCase(),
        underlyingPrice: 100,
        greeks: {
          delta: 0.5, gamma: 0.05, theta: -0.02, vega: 0.15, rho: 0.01,
          impliedVolatility: 0.25, historicalVolatility: 0.20,
          ivRank: 45, ivPercentile: 50, openInterest: 5000, volume: 1000,
          bid: 2.50, ask: 2.55, lastPrice: 2.52, bidAskSpread: 0.05,
          strikePrice: 100, underlyingPrice: 100, daysToExpiry: 30, optionType: 'call',
        },
      };
    }

    analyzeMutation.mutate(input);
  };

  const getSignalIcon = (signal: SignalStrength) => {
    if (signal === 'strong_buy' || signal === 'buy') {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (signal === 'strong_sell' || signal === 'sell') {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return <Minus className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Multi-Asset AI Analysis</h1>
            <p className="text-muted-foreground mt-1">
              Analyze stocks, crypto, options, forex, and commodities with specialized AI agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              connectionStatus.connected 
                ? 'bg-green-500/10 text-green-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {connectionStatus.connected ? (
                <><Wifi className="h-4 w-4" /><span>Live</span></>
              ) : (
                <><WifiOff className="h-4 w-4" /><span>Offline</span></>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowLivePrices(!showLivePrices)}
            >
              {showLivePrices ? 'Hide Prices' : 'Show Prices'}
            </Button>
          </div>
        </div>

        {/* Live Price Ticker */}
        {showLivePrices && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Live {assetTypeLabels[assetType]} Prices
              </CardTitle>
              <CardDescription>
                Real-time price updates via WebSocket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LivePriceTicker 
                symbols={watchlistSymbols} 
                variant="card"
                showConnectionStatus={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Cross-Asset Correlation Matrix */}
        <CorrelationMatrix
          symbols={['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH', 'GOLD', 'EUR/USD']}
          assetTypes={['stock', 'stock', 'stock', 'crypto', 'crypto', 'commodity', 'forex']}
          defaultPeriod="7d"
          onCellClick={(asset1, asset2, correlation) => {
            console.log(`Correlation between ${asset1} and ${asset2}: ${correlation}`);
          }}
        />

        {/* Portfolio Optimizer */}
        <PortfolioOptimizer />

        <Tabs value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
          <TabsList className="grid w-full grid-cols-5">
            {(Object.keys(assetTypeLabels) as AssetType[]).map((type) => (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                {assetTypeIcons[type]}
                <span className="hidden sm:inline">{assetTypeLabels[type]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={`Enter ${assetTypeLabels[assetType]} symbol (e.g., ${
                      assetType === 'stock' ? 'AAPL' :
                      assetType === 'crypto' ? 'BTC-USD' :
                      assetType === 'options' ? 'AAPL240119C00150000' :
                      assetType === 'forex' ? 'EUR/USD' : 'GC=F'
                    })`}
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  />
                  {detectAssetType.data && symbol.length > 2 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Detected type: {assetTypeLabels[detectAssetType.data.assetType as AssetType]}
                    </p>
                  )}
                </div>
                <Button onClick={handleAnalyze} disabled={!symbol || analyzeMutation.isPending}>
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Analyze
                </Button>
              </div>
            </CardContent>
          </Card>

          {analysisResult && (
            <div className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {assetTypeIcons[analysisResult.assetType as AssetType]}
                      <div>
                        <CardTitle className="text-2xl">{analysisResult.symbol}</CardTitle>
                        <CardDescription>
                          {assetTypeLabels[analysisResult.assetType as AssetType]} Analysis
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`${signalColors[analysisResult.overallSignal as SignalStrength]} text-white`}>
                        {getSignalIcon(analysisResult.overallSignal)}
                        <span className="ml-1">{signalLabels[analysisResult.overallSignal as SignalStrength]}</span>
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-2xl font-bold">{analysisResult.confidence}%</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Risk Level</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${riskColors[analysisResult.riskLevel]}`} />
                        <span className={`font-semibold capitalize ${riskColors[analysisResult.riskLevel]}`}>
                          {analysisResult.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Analysis Confidence</p>
                      <Progress value={analysisResult.confidence} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Analysis Time</p>
                      <p className="font-medium">
                        {new Date(analysisResult.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">AI Recommendation</p>
                    <p className="font-medium">{analysisResult.recommendation}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent Analyses</CardTitle>
                  <CardDescription>
                    Individual AI agent assessments for {analysisResult.symbol}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.analyses.map((analysis: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {analysis.signal === 'strong_buy' || analysis.signal === 'buy' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : analysis.signal === 'strong_sell' || analysis.signal === 'sell' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Info className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{analysis.agentName}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {analysis.reasoning}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={signalColors[analysis.signal as SignalStrength]}>
                            {signalLabels[analysis.signal as SignalStrength]}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Confidence</p>
                            <p className="font-semibold">{analysis.confidence}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {Object.keys(analysisResult.keyMetrics || {}).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Metrics</CardTitle>
                    <CardDescription>Asset-specific indicators and metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(analysisResult.keyMetrics).map(([key, value]) => (
                        value !== undefined && value !== null && (
                          <div key={key} className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-lg font-semibold">
                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                            </p>
                          </div>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!analysisResult && !analyzeMutation.isPending && (
            <Card className="mt-6">
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  {assetTypeIcons[assetType]}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Analyze {assetTypeLabels[assetType]}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Enter a symbol above to get AI-powered analysis with specialized agents for {assetTypeLabels[assetType].toLowerCase()}.
                </p>
              </CardContent>
            </Card>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
