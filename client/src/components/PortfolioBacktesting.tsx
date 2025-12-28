import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PieChart,
  BarChart3,
  Activity,
  Target,
  Shield,
  Plus,
  X,
  Layers,
  GitBranch,
} from "lucide-react";

interface PortfolioAsset {
  symbol: string;
  weight: number;
  name?: string;
}

interface AssetMetrics {
  symbol: string;
  weight: number;
  return: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  contribution: number;
  riskContribution: number;
}

interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

interface DiversificationMetrics {
  diversificationRatio: number;
  diversificationBenefit: number;
  effectiveAssets: number;
  concentrationRisk: number;
  correlationAverage: number;
  correlationMax: number;
  correlationMin: number;
}

interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  sharpe: number;
  weights: Record<string, number>;
}

interface PortfolioBacktestResult {
  config: {
    assets: PortfolioAsset[];
    initialCapital: number;
    rebalanceFrequency: string;
  };
  portfolioMetrics: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    maxDrawdownDuration: number;
    winRate: number;
    profitFactor: number;
  };
  benchmarkMetrics?: {
    totalReturn: number;
    volatility: number;
    sharpe: number;
    correlation: number;
    beta: number;
    alpha: number;
    trackingError: number;
    informationRatio: number;
  };
  assetMetrics: AssetMetrics[];
  correlationMatrix: CorrelationMatrix;
  diversificationMetrics: DiversificationMetrics;
  efficientFrontier: EfficientFrontierPoint[];
  currentPortfolioPosition: EfficientFrontierPoint;
  equityCurve: Array<{ date: string; value: number; drawdown: number }>;
  allocationHistory: Array<{
    date: string;
    allocations: Record<string, number>;
  }>;
  riskDecomposition: {
    systematic: number;
    idiosyncratic: number;
    factorExposures: Record<string, number>;
  };
  recommendations: {
    suggestedWeights: Record<string, number>;
    rebalanceNeeded: boolean;
    riskWarnings: string[];
    improvementPotential: number;
  };
}

const PRESET_PORTFOLIOS = [
  { name: "Tech Giants", assets: ["AAPL", "MSFT", "GOOGL", "AMZN", "META"] },
  { name: "Classic 60/40", assets: ["SPY", "BND"] },
  { name: "Diversified", assets: ["SPY", "QQQ", "IWM", "EFA", "EEM"] },
  { name: "Dividend Focus", assets: ["VYM", "SCHD", "HDV", "DVY"] },
];

export function PortfolioBacktesting() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([
    { symbol: "AAPL", weight: 0.3 },
    { symbol: "MSFT", weight: 0.3 },
    { symbol: "GOOGL", weight: 0.2 },
    { symbol: "AMZN", weight: 0.2 },
  ]);
  const [newSymbol, setNewSymbol] = useState("");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'none'>('monthly');
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("SPY");
  const [result, setResult] = useState<PortfolioBacktestResult | null>(null);

  const runMutation = trpc.portfolioBacktest.backtest.useMutation({
    onSuccess: (data) => {
      setResult(data as PortfolioBacktestResult);
      toast.success("Portfolio backtest complete!");
    },
    onError: (error) => {
      toast.error(error.message || "Backtest failed");
    },
  });

  const handleAddAsset = () => {
    if (!newSymbol.trim()) return;
    if (assets.find(a => a.symbol === newSymbol.toUpperCase())) {
      toast.error("Asset already in portfolio");
      return;
    }
    setAssets([...assets, { symbol: newSymbol.toUpperCase(), weight: 0.1 }]);
    setNewSymbol("");
  };

  const handleRemoveAsset = (symbol: string) => {
    setAssets(assets.filter(a => a.symbol !== symbol));
  };

  const handleWeightChange = (symbol: string, weight: number) => {
    setAssets(assets.map(a => a.symbol === symbol ? { ...a, weight } : a));
  };

  const normalizeWeights = () => {
    const total = assets.reduce((sum, a) => sum + a.weight, 0);
    if (total > 0) {
      setAssets(assets.map(a => ({ ...a, weight: a.weight / total })));
    }
  };

  const equalWeight = () => {
    const weight = 1 / assets.length;
    setAssets(assets.map(a => ({ ...a, weight })));
  };

  const loadPreset = (preset: typeof PRESET_PORTFOLIOS[0]) => {
    const weight = 1 / preset.assets.length;
    setAssets(preset.assets.map(symbol => ({ symbol, weight })));
  };

  const handleRun = () => {
    if (assets.length < 2) {
      toast.error("Please add at least 2 assets");
      return;
    }
    runMutation.mutate({
      assets,
      initialCapital,
      rebalanceFrequency,
      benchmarkSymbol,
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatNumber = (value: number, decimals = 2) => value.toFixed(decimals);

  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-400" />
            Portfolio Backtesting
          </CardTitle>
          <CardDescription>
            Test multi-asset portfolios with correlation analysis and diversification metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Portfolios */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-2">Presets:</span>
            {PRESET_PORTFOLIOS.map(preset => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => loadPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          {/* Asset List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Portfolio Assets</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={equalWeight}>Equal Weight</Button>
                <Button variant="ghost" size="sm" onClick={normalizeWeights}>Normalize</Button>
              </div>
            </div>
            <div className="grid gap-2">
              {assets.map(asset => (
                <div key={asset.symbol} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                  <Badge variant="outline" className="w-16 justify-center">{asset.symbol}</Badge>
                  <Slider
                    value={[asset.weight * 100]}
                    onValueChange={([v]) => handleWeightChange(asset.symbol, v / 100)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-16 text-right text-sm">{(asset.weight * 100).toFixed(1)}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveAsset(asset.symbol)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Add symbol..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddAsset()}
              />
              <Button onClick={handleAddAsset} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {Math.abs(totalWeight - 1) > 0.01 && (
              <p className="text-sm text-orange-400">
                Total weight: {formatPercent(totalWeight)} (should be 100%)
              </p>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Initial Capital</Label>
              <Input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rebalance Frequency</Label>
              <Select value={rebalanceFrequency} onValueChange={(v) => setRebalanceFrequency(v as typeof rebalanceFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Rebalancing</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Benchmark</Label>
              <Input
                value={benchmarkSymbol}
                onChange={(e) => setBenchmarkSymbol(e.target.value.toUpperCase())}
                placeholder="SPY"
              />
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={runMutation.isPending || assets.length < 2}
            className="w-full"
          >
            {runMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running backtest...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Portfolio Backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Target className="h-4 w-4" />
                  Total Return
                </div>
                <div className={`text-2xl font-bold ${result.portfolioMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(result.portfolioMetrics.totalReturn)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Sharpe Ratio
                </div>
                <div className={`text-2xl font-bold ${result.portfolioMetrics.sharpeRatio >= 1 ? 'text-green-400' : result.portfolioMetrics.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatNumber(result.portfolioMetrics.sharpeRatio)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingDown className="h-4 w-4" />
                  Max Drawdown
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {formatPercent(result.portfolioMetrics.maxDrawdown)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Layers className="h-4 w-4" />
                  Diversification
                </div>
                <div className={`text-2xl font-bold ${result.diversificationMetrics.diversificationRatio >= 1.2 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {formatNumber(result.diversificationMetrics.diversificationRatio)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <GitBranch className="h-4 w-4" />
                  Effective Assets
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {formatNumber(result.diversificationMetrics.effectiveAssets, 1)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <Tabs defaultValue="performance">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="assets">Assets</TabsTrigger>
                  <TabsTrigger value="correlation">Correlation</TabsTrigger>
                  <TabsTrigger value="frontier">Efficient Frontier</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Equity Curve */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Equity Curve</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48 relative">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Equity line */}
                            <path
                              d={`M 0 ${100 - ((result.equityCurve[0]?.value || initialCapital) / Math.max(...result.equityCurve.map(e => e.value))) * 100} 
                                  ${result.equityCurve.map((e, i) => 
                                    `L ${(i / result.equityCurve.length) * 100} ${100 - (e.value / Math.max(...result.equityCurve.map(ec => ec.value))) * 100}`
                                  ).join(' ')}`}
                              fill="none"
                              stroke="rgb(34, 197, 94)"
                              strokeWidth="0.5"
                            />
                            {/* Initial capital line */}
                            <line
                              x1="0"
                              y1={100 - (initialCapital / Math.max(...result.equityCurve.map(e => e.value))) * 100}
                              x2="100"
                              y2={100 - (initialCapital / Math.max(...result.equityCurve.map(e => e.value))) * 100}
                              stroke="rgba(255, 255, 255, 0.3)"
                              strokeDasharray="2,2"
                              strokeWidth="0.3"
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{result.equityCurve[0]?.date}</span>
                          <span>{result.equityCurve[result.equityCurve.length - 1]?.date}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Portfolio vs Benchmark */}
                    {result.benchmarkMetrics && (
                      <Card className="bg-background border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Portfolio vs Benchmark ({benchmarkSymbol})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Return</span>
                              <div className="flex gap-4">
                                <span className={result.portfolioMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                                  Portfolio: {formatPercent(result.portfolioMetrics.totalReturn)}
                                </span>
                                <span className={result.benchmarkMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                                  Benchmark: {formatPercent(result.benchmarkMetrics.totalReturn)}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Alpha</span>
                              <span className={result.benchmarkMetrics.alpha >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatPercent(result.benchmarkMetrics.alpha)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Beta</span>
                              <span>{formatNumber(result.benchmarkMetrics.beta)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Correlation</span>
                              <span>{formatNumber(result.benchmarkMetrics.correlation)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tracking Error</span>
                              <span>{formatPercent(result.benchmarkMetrics.trackingError)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Information Ratio</span>
                              <span>{formatNumber(result.benchmarkMetrics.informationRatio)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Performance Metrics */}
                    <Card className="bg-background border-border col-span-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="p-3 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Annualized Return</div>
                            <div className={`text-lg font-bold ${result.portfolioMetrics.annualizedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercent(result.portfolioMetrics.annualizedReturn)}
                            </div>
                          </div>
                          <div className="p-3 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                            <div className="text-lg font-bold">{formatPercent(result.portfolioMetrics.volatility)}</div>
                          </div>
                          <div className="p-3 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Sortino Ratio</div>
                            <div className="text-lg font-bold">{formatNumber(result.portfolioMetrics.sortinoRatio)}</div>
                          </div>
                          <div className="p-3 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Calmar Ratio</div>
                            <div className="text-lg font-bold">{formatNumber(result.portfolioMetrics.calmarRatio)}</div>
                          </div>
                          <div className="p-3 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                            <div className="text-lg font-bold">{formatPercent(result.portfolioMetrics.winRate)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Assets Tab */}
                <TabsContent value="assets" className="space-y-4">
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Individual Asset Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-2">Asset</th>
                              <th className="text-right p-2">Weight</th>
                              <th className="text-right p-2">Return</th>
                              <th className="text-right p-2">Volatility</th>
                              <th className="text-right p-2">Sharpe</th>
                              <th className="text-right p-2">Beta</th>
                              <th className="text-right p-2">Contribution</th>
                              <th className="text-right p-2">Risk Contrib</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.assetMetrics.map(asset => (
                              <tr key={asset.symbol} className="border-b border-border/50">
                                <td className="p-2 font-medium">{asset.symbol}</td>
                                <td className="text-right p-2">{formatPercent(asset.weight)}</td>
                                <td className={`text-right p-2 ${asset.return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(asset.return)}
                                </td>
                                <td className="text-right p-2">{formatPercent(asset.volatility)}</td>
                                <td className="text-right p-2">{formatNumber(asset.sharpe)}</td>
                                <td className="text-right p-2">{formatNumber(asset.beta)}</td>
                                <td className={`text-right p-2 ${asset.contribution >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(asset.contribution)}
                                </td>
                                <td className="text-right p-2">{formatPercent(asset.riskContribution)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Decomposition */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Risk Decomposition</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex h-4 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-500" 
                              style={{ width: `${result.riskDecomposition.systematic * 100}%` }}
                            />
                            <div 
                              className="bg-purple-500" 
                              style={{ width: `${result.riskDecomposition.idiosyncratic * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded" />
                            <span>Systematic: {formatPercent(result.riskDecomposition.systematic)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded" />
                            <span>Idiosyncratic: {formatPercent(result.riskDecomposition.idiosyncratic)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Correlation Tab */}
                <TabsContent value="correlation" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Correlation Matrix */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Correlation Matrix</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="p-1"></th>
                                {result.correlationMatrix.symbols.map(s => (
                                  <th key={s} className="p-1 text-center">{s}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.correlationMatrix.matrix.map((row, i) => (
                                <tr key={i}>
                                  <td className="p-1 font-medium">{result.correlationMatrix.symbols[i]}</td>
                                  {row.map((corr, j) => {
                                    const color = corr === 1 ? 'bg-blue-500/50' :
                                      corr > 0.7 ? 'bg-red-500/50' :
                                      corr > 0.3 ? 'bg-orange-500/50' :
                                      corr > -0.3 ? 'bg-green-500/50' :
                                      'bg-green-600/50';
                                    return (
                                      <td key={j} className={`p-1 text-center ${color}`}>
                                        {corr.toFixed(2)}
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

                    {/* Diversification Metrics */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Diversification Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Diversification Ratio</span>
                            <span className="font-medium">{formatNumber(result.diversificationMetrics.diversificationRatio)}</span>
                          </div>
                          <Progress value={Math.min(result.diversificationMetrics.diversificationRatio * 50, 100)} className="h-2" />
                          <p className="text-xs text-muted-foreground">Higher is better (1.0 = no benefit, 2.0+ = excellent)</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Diversification Benefit</span>
                            <span className="font-medium text-green-400">{formatPercent(result.diversificationMetrics.diversificationBenefit)}</span>
                          </div>
                          <Progress value={result.diversificationMetrics.diversificationBenefit * 100} className="h-2" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Effective Assets</span>
                          <span className="font-medium">{formatNumber(result.diversificationMetrics.effectiveAssets, 1)} / {result.assetMetrics.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Concentration Risk</span>
                          <span className={result.diversificationMetrics.concentrationRisk > 0.5 ? 'text-orange-400' : 'text-green-400'}>
                            {formatNumber(result.diversificationMetrics.concentrationRisk)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Correlation</span>
                          <span className={result.diversificationMetrics.correlationAverage > 0.7 ? 'text-orange-400' : 'text-green-400'}>
                            {formatNumber(result.diversificationMetrics.correlationAverage)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Efficient Frontier Tab */}
                <TabsContent value="frontier" className="space-y-4">
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Efficient Frontier</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 relative">
                        {/* Y-axis label */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
                          Return
                        </div>
                        {/* Chart */}
                        <div className="ml-8 h-full relative">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Efficient frontier line */}
                            <path
                              d={`M ${result.efficientFrontier.map((p, i) => 
                                `${(p.volatility / Math.max(...result.efficientFrontier.map(ep => ep.volatility))) * 100} ${100 - (p.return / Math.max(...result.efficientFrontier.map(ep => ep.return))) * 100}`
                              ).join(' L ')}`}
                              fill="none"
                              stroke="rgb(59, 130, 246)"
                              strokeWidth="0.5"
                            />
                            {/* Current portfolio point */}
                            <circle
                              cx={(result.currentPortfolioPosition.volatility / Math.max(...result.efficientFrontier.map(p => p.volatility))) * 100}
                              cy={100 - (result.currentPortfolioPosition.return / Math.max(...result.efficientFrontier.map(p => p.return))) * 100}
                              r="2"
                              fill="rgb(34, 197, 94)"
                            />
                            {/* Max Sharpe point */}
                            {(() => {
                              const maxSharpe = result.efficientFrontier.reduce((best, p) => p.sharpe > best.sharpe ? p : best);
                              return (
                                <circle
                                  cx={(maxSharpe.volatility / Math.max(...result.efficientFrontier.map(p => p.volatility))) * 100}
                                  cy={100 - (maxSharpe.return / Math.max(...result.efficientFrontier.map(p => p.return))) * 100}
                                  r="2"
                                  fill="rgb(234, 179, 8)"
                                />
                              );
                            })()}
                          </svg>
                        </div>
                        {/* X-axis label */}
                        <div className="text-center text-xs text-muted-foreground mt-2">Volatility (Risk)</div>
                      </div>
                      <div className="flex justify-center gap-6 mt-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 bg-blue-500" />
                          <span className="text-muted-foreground">Efficient Frontier</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <span className="text-muted-foreground">Current Portfolio</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                          <span className="text-muted-foreground">Max Sharpe</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Current vs Optimal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-400">Current Portfolio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Return</span>
                            <span>{formatPercent(result.currentPortfolioPosition.return)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Volatility</span>
                            <span>{formatPercent(result.currentPortfolioPosition.volatility)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sharpe</span>
                            <span>{formatNumber(result.currentPortfolioPosition.sharpe)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yellow-400">Optimal (Max Sharpe)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const maxSharpe = result.efficientFrontier.reduce((best, p) => p.sharpe > best.sharpe ? p : best);
                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Return</span>
                                <span>{formatPercent(maxSharpe.return)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Volatility</span>
                                <span>{formatPercent(maxSharpe.volatility)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sharpe</span>
                                <span>{formatNumber(maxSharpe.sharpe)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-4">
                  {/* Risk Warnings */}
                  {result.recommendations.riskWarnings.length > 0 && (
                    <Card className="bg-background border-orange-500/30 border-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
                          <AlertTriangle className="h-4 w-4" />
                          Risk Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.recommendations.riskWarnings.map((warning, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-orange-400" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Suggested Weights */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-400" />
                        Suggested Optimal Weights
                      </CardTitle>
                      <CardDescription>
                        Weights that maximize risk-adjusted returns based on historical data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(result.recommendations.suggestedWeights).map(([symbol, weight]) => {
                          const currentWeight = result.assetMetrics.find(a => a.symbol === symbol)?.weight || 0;
                          const diff = weight - currentWeight;
                          return (
                            <div key={symbol} className="flex items-center gap-2">
                              <Badge variant="outline" className="w-16 justify-center">{symbol}</Badge>
                              <Progress value={weight * 100} className="flex-1 h-3" />
                              <span className="w-16 text-right">{formatPercent(weight)}</span>
                              <span className={`w-20 text-right text-sm ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                {diff > 0 ? '+' : ''}{formatPercent(diff)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        className="w-full mt-4"
                        variant="outline"
                        onClick={() => {
                          const newAssets = Object.entries(result.recommendations.suggestedWeights).map(([symbol, weight]) => ({
                            symbol,
                            weight,
                          }));
                          setAssets(newAssets);
                          toast.success("Applied suggested weights");
                        }}
                      >
                        Apply Suggested Weights
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Improvement Potential */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Optimization Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rebalancing Needed</span>
                        {result.recommendations.rebalanceNeeded ? (
                          <Badge className="bg-orange-500/20 text-orange-400">Yes</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400">No</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Improvement Potential</span>
                          <span className={result.recommendations.improvementPotential > 0.1 ? 'text-green-400' : 'text-muted-foreground'}>
                            {formatPercent(result.recommendations.improvementPotential)}
                          </span>
                        </div>
                        <Progress value={Math.min(result.recommendations.improvementPotential * 100, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Potential Sharpe ratio improvement by optimizing weights
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
