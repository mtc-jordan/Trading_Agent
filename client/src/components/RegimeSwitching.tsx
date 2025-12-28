import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Shield,
  Zap,
  Clock,
  RefreshCw
} from "lucide-react";

type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile';

interface RegimeAnalysisResult {
  symbol: string;
  currentRegime: MarketRegime;
  regimeProbabilities: {
    bull: number;
    bear: number;
    sideways: number;
    volatile: number;
  };
  regimeConfidence: number;
  indicators: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
    rsi: number;
    macdHistogram: number;
    atr: number;
    atrPercent: number;
    historicalVolatility: number;
    bollingerWidth: number;
    adx: number;
    plusDI: number;
    minusDI: number;
    priceVsSma200: number;
    priceVsSma50: number;
  };
  transitionMatrix: Array<{
    fromRegime: MarketRegime;
    toRegime: MarketRegime;
    probability: number;
    avgDuration: number;
  }>;
  regimeHistory: Array<{
    date: string;
    regime: MarketRegime;
    probability: number;
  }>;
  strategyAdjustments: {
    regime: MarketRegime;
    positionSizeMultiplier: number;
    stopLossMultiplier: number;
    takeProfitMultiplier: number;
    preferredStrategies: string[];
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
    description: string;
  };
  signals: {
    trendDirection: 'up' | 'down' | 'neutral';
    trendStrength: 'strong' | 'moderate' | 'weak';
    volatilityLevel: 'high' | 'normal' | 'low';
    momentum: 'bullish' | 'bearish' | 'neutral';
  };
  recommendations: string[];
}

const regimeColors: Record<MarketRegime, string> = {
  bull: 'bg-green-500',
  bear: 'bg-red-500',
  sideways: 'bg-yellow-500',
  volatile: 'bg-purple-500',
};

const regimeIcons: Record<MarketRegime, React.ReactNode> = {
  bull: <TrendingUp className="h-5 w-5" />,
  bear: <TrendingDown className="h-5 w-5" />,
  sideways: <Minus className="h-5 w-5" />,
  volatile: <Activity className="h-5 w-5" />,
};

const regimeDescriptions: Record<MarketRegime, string> = {
  bull: 'Upward trending market with positive momentum',
  bear: 'Downward trending market with negative momentum',
  sideways: 'Range-bound market with no clear direction',
  volatile: 'High volatility with unpredictable price swings',
};

export function RegimeSwitching() {
  const [symbol, setSymbol] = useState("AAPL");
  const [lookbackDays, setLookbackDays] = useState(90);
  const [result, setResult] = useState<RegimeAnalysisResult | null>(null);

  const analyzeMutation = trpc.regime.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data as RegimeAnalysisResult);
    },
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({ symbol: symbol.toUpperCase(), lookbackDays });
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Market Regime Detection
          </CardTitle>
          <CardDescription>
            Identify current market conditions and adjust strategy parameters automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Stock Symbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-2">
              <Label>Lookback Period: {lookbackDays} days</Label>
              <Slider
                value={[lookbackDays]}
                onValueChange={([v]) => setLookbackDays(v)}
                min={30}
                max={365}
                step={15}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzeMutation.isPending}
                className="w-full"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Detect Regime
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Current Regime */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${regimeColors[result.currentRegime]} text-white`}>
                      {regimeIcons[result.currentRegime]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold capitalize">{result.currentRegime} Market</h3>
                      <p className="text-muted-foreground">{regimeDescriptions[result.currentRegime]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{(result.regimeConfidence * 100).toFixed(0)}%</div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regime Probabilities */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.entries(result.regimeProbabilities) as [MarketRegime, number][]).map(([regime, prob]) => (
                <Card key={regime} className={regime === result.currentRegime ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${regimeColors[regime]} text-white`}>
                        {regimeIcons[regime]}
                      </div>
                      <span className="font-medium capitalize">{regime}</span>
                    </div>
                    <Progress value={prob * 100} className="h-2" />
                    <div className="text-right text-sm mt-1">{(prob * 100).toFixed(1)}%</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Market Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="flex justify-center mb-2">
                      {result.signals.trendDirection === 'up' ? (
                        <ArrowUpRight className="h-6 w-6 text-green-500" />
                      ) : result.signals.trendDirection === 'down' ? (
                        <ArrowDownRight className="h-6 w-6 text-red-500" />
                      ) : (
                        <Minus className="h-6 w-6 text-yellow-500" />
                      )}
                    </div>
                    <div className="font-medium capitalize">{result.signals.trendDirection}</div>
                    <div className="text-xs text-muted-foreground">Trend Direction</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="flex justify-center mb-2">
                      <Zap className={`h-6 w-6 ${
                        result.signals.trendStrength === 'strong' ? 'text-green-500' :
                        result.signals.trendStrength === 'moderate' ? 'text-yellow-500' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="font-medium capitalize">{result.signals.trendStrength}</div>
                    <div className="text-xs text-muted-foreground">Trend Strength</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="flex justify-center mb-2">
                      <Activity className={`h-6 w-6 ${
                        result.signals.volatilityLevel === 'high' ? 'text-red-500' :
                        result.signals.volatilityLevel === 'low' ? 'text-green-500' : 'text-yellow-500'
                      }`} />
                    </div>
                    <div className="font-medium capitalize">{result.signals.volatilityLevel}</div>
                    <div className="text-xs text-muted-foreground">Volatility</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="flex justify-center mb-2">
                      <TrendingUp className={`h-6 w-6 ${
                        result.signals.momentum === 'bullish' ? 'text-green-500' :
                        result.signals.momentum === 'bearish' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                    </div>
                    <div className="font-medium capitalize">{result.signals.momentum}</div>
                    <div className="text-xs text-muted-foreground">Momentum</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Indicators Tab */}
          <TabsContent value="indicators" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trend Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trend Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">SMA 20</span>
                    <span className="font-mono">${result.indicators.sma20.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">SMA 50</span>
                    <span className="font-mono">${result.indicators.sma50.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">SMA 200</span>
                    <span className="font-mono">${result.indicators.sma200.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price vs SMA 200</span>
                    <Badge variant={result.indicators.priceVsSma200 > 0 ? 'default' : 'destructive'}>
                      {result.indicators.priceVsSma200 > 0 ? '+' : ''}{result.indicators.priceVsSma200.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price vs SMA 50</span>
                    <Badge variant={result.indicators.priceVsSma50 > 0 ? 'default' : 'destructive'}>
                      {result.indicators.priceVsSma50 > 0 ? '+' : ''}{result.indicators.priceVsSma50.toFixed(2)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Momentum Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Momentum Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <Badge variant={
                      result.indicators.rsi > 70 ? 'destructive' :
                      result.indicators.rsi < 30 ? 'default' : 'secondary'
                    }>
                      {result.indicators.rsi.toFixed(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MACD Histogram</span>
                    <Badge variant={result.indicators.macdHistogram > 0 ? 'default' : 'destructive'}>
                      {result.indicators.macdHistogram.toFixed(3)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">ADX</span>
                    <span className="font-mono">{result.indicators.adx.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">+DI / -DI</span>
                    <span className="font-mono">
                      {result.indicators.plusDI.toFixed(1)} / {result.indicators.minusDI.toFixed(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Volatility Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Volatility Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">ATR (14)</span>
                    <span className="font-mono">${result.indicators.atr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">ATR %</span>
                    <span className="font-mono">{result.indicators.atrPercent.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Historical Volatility</span>
                    <Badge variant={result.indicators.historicalVolatility > 0.3 ? 'destructive' : 'secondary'}>
                      {(result.indicators.historicalVolatility * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Bollinger Width</span>
                    <span className="font-mono">{(result.indicators.bollingerWidth * 100).toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Moving Averages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">EMA Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">EMA 12</span>
                    <span className="font-mono">${result.indicators.ema12.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">EMA 26</span>
                    <span className="font-mono">${result.indicators.ema26.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">EMA 12/26 Spread</span>
                    <Badge variant={result.indicators.ema12 > result.indicators.ema26 ? 'default' : 'destructive'}>
                      ${(result.indicators.ema12 - result.indicators.ema26).toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategy Adjustments for {result.currentRegime.charAt(0).toUpperCase() + result.currentRegime.slice(1)} Market
                </CardTitle>
                <CardDescription>{result.strategyAdjustments.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risk Level */}
                <div className="flex items-center gap-4">
                  <Shield className={`h-8 w-8 ${
                    result.strategyAdjustments.riskLevel === 'conservative' ? 'text-green-500' :
                    result.strategyAdjustments.riskLevel === 'aggressive' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <div>
                    <div className="font-medium capitalize">{result.strategyAdjustments.riskLevel} Risk Level</div>
                    <div className="text-sm text-muted-foreground">Recommended approach for current conditions</div>
                  </div>
                </div>

                {/* Multipliers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-3xl font-bold text-primary">
                        {result.strategyAdjustments.positionSizeMultiplier.toFixed(1)}x
                      </div>
                      <div className="text-sm text-muted-foreground">Position Size</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-3xl font-bold text-red-500">
                        {result.strategyAdjustments.stopLossMultiplier.toFixed(1)}x
                      </div>
                      <div className="text-sm text-muted-foreground">Stop Loss</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-3xl font-bold text-green-500">
                        {result.strategyAdjustments.takeProfitMultiplier.toFixed(1)}x
                      </div>
                      <div className="text-sm text-muted-foreground">Take Profit</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Preferred Strategies */}
                <div>
                  <h4 className="font-medium mb-2">Preferred Strategies</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.strategyAdjustments.preferredStrategies.map((strategy, i) => (
                      <Badge key={i} variant="outline" className="capitalize">
                        {strategy.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transition Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Regime Transition Probabilities
                </CardTitle>
                <CardDescription>
                  Historical probability of transitioning between market regimes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">From → To</th>
                        {['Bull', 'Bear', 'Sideways', 'Volatile'].map(regime => (
                          <th key={regime} className="text-center p-2">{regime}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['bull', 'bear', 'sideways', 'volatile'] as MarketRegime[]).map(fromRegime => (
                        <tr key={fromRegime} className="border-b">
                          <td className="p-2 font-medium capitalize">{fromRegime}</td>
                          {(['bull', 'bear', 'sideways', 'volatile'] as MarketRegime[]).map(toRegime => {
                            const transition = result.transitionMatrix.find(
                              t => t.fromRegime === fromRegime && t.toRegime === toRegime
                            );
                            const prob = transition?.probability || 0;
                            return (
                              <td key={toRegime} className="text-center p-2">
                                <span className={`font-mono ${prob > 0.3 ? 'text-primary font-bold' : ''}`}>
                                  {(prob * 100).toFixed(0)}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regime History</CardTitle>
                <CardDescription>
                  Historical market regime classifications over the lookback period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Timeline visualization */}
                <div className="space-y-2">
                  <div className="flex gap-1 h-8">
                    {result.regimeHistory.slice(-60).map((item, i) => (
                      <div
                        key={i}
                        className={`flex-1 ${regimeColors[item.regime]} rounded-sm opacity-${Math.round(item.probability * 10) * 10}`}
                        title={`${item.date}: ${item.regime} (${(item.probability * 100).toFixed(0)}%)`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{result.regimeHistory[0]?.date}</span>
                    <span>{result.regimeHistory[result.regimeHistory.length - 1]?.date}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-4 justify-center">
                  {(Object.entries(regimeColors) as [MarketRegime, string][]).map(([regime, color]) => (
                    <div key={regime} className="flex items-center gap-1">
                      <div className={`h-3 w-3 rounded ${color}`} />
                      <span className="text-xs capitalize">{regime}</span>
                    </div>
                  ))}
                </div>

                {/* Recent History Table */}
                <div className="mt-6 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Regime</th>
                        <th className="text-right p-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.regimeHistory.slice(-20).reverse().map((item, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 font-mono text-xs">{item.date}</td>
                          <td className="p-2">
                            <Badge className={regimeColors[item.regime]}>
                              {item.regime}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {(item.probability * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
