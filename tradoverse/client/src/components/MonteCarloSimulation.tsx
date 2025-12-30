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
  Shield,
  Target,
  BarChart3,
  Activity,
  Percent,
  DollarSign,
  Gauge,
} from "lucide-react";

interface MonteCarloResult {
  config: {
    symbol: string;
    initialCapital: number;
    numSimulations: number;
    timeHorizonDays: number;
  };
  expectedReturn: number;
  medianReturn: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  valueAtRisk: Record<number, number>;
  conditionalVaR: Record<number, number>;
  maxDrawdownDistribution: {
    mean: number;
    median: number;
    percentile95: number;
    percentile99: number;
  };
  probabilityOfProfit: number;
  probabilityOfLoss: number;
  probabilityOfRuin: number;
  returnDistribution: {
    bins: number[];
    frequencies: number[];
  };
  confidenceIntervals: Record<number, { lower: number; upper: number }>;
  simulationPaths: Array<{
    day: number;
    mean: number;
    median: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
  }>;
  finalValues: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
  };
  scenarioAnalysis: {
    bullMarket: { probability: number; avgReturn: number };
    bearMarket: { probability: number; avgReturn: number };
    sideways: { probability: number; avgReturn: number };
  };
}

export function MonteCarloSimulation() {
  const [symbol, setSymbol] = useState("AAPL");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [numSimulations, setNumSimulations] = useState(1000);
  const [timeHorizonDays, setTimeHorizonDays] = useState(252);
  const [strategyType, setStrategyType] = useState<'buy_hold' | 'momentum' | 'mean_reversion' | 'enhanced'>('buy_hold');
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  const runMutation = trpc.monteCarlo.run.useMutation({
    onSuccess: (data) => {
      setResult(data as MonteCarloResult);
      toast.success("Monte Carlo simulation complete!");
    },
    onError: (error) => {
      toast.error(error.message || "Simulation failed");
    },
  });

  const handleRun = () => {
    if (!symbol.trim()) {
      toast.error("Please enter a stock symbol");
      return;
    }
    runMutation.mutate({
      symbol: symbol.toUpperCase(),
      initialCapital,
      numSimulations,
      timeHorizonDays,
      strategyType,
      confidenceLevels: [0.95, 0.99],
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Monte Carlo Simulation
          </CardTitle>
          <CardDescription>
            Stress-test strategies with thousands of random market scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Capital</Label>
              <Input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Simulations: {numSimulations.toLocaleString()}</Label>
              <Slider
                value={[numSimulations]}
                onValueChange={([v]) => setNumSimulations(v)}
                min={100}
                max={5000}
                step={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Horizon (days): {timeHorizonDays}</Label>
              <Slider
                value={[timeHorizonDays]}
                onValueChange={([v]) => setTimeHorizonDays(v)}
                min={21}
                max={504}
                step={21}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="space-y-2 flex-1">
              <Label>Strategy</Label>
              <Select value={strategyType} onValueChange={(v) => setStrategyType(v as typeof strategyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy_hold">Buy & Hold</SelectItem>
                  <SelectItem value="momentum">Momentum</SelectItem>
                  <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                  <SelectItem value="enhanced">Enhanced (RSI-based)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleRun}
              disabled={runMutation.isPending}
              className="mt-6"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running {numSimulations.toLocaleString()} simulations...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Target className="h-4 w-4" />
                  Expected Return
                </div>
                <div className={`text-2xl font-bold ${result.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(result.expectedReturn)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Profit Probability
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {formatPercent(result.probabilityOfProfit)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Shield className="h-4 w-4" />
                  VaR (95%)
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {formatPercent(result.valueAtRisk[0.95] || 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Ruin Probability
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {formatPercent(result.probabilityOfRuin)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <Tabs defaultValue="distribution">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="distribution">Distribution</TabsTrigger>
                  <TabsTrigger value="paths">Simulation Paths</TabsTrigger>
                  <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
                  <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                </TabsList>

                {/* Distribution Tab */}
                <TabsContent value="distribution" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Histogram */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Return Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48 flex items-end gap-0.5">
                          {result.returnDistribution.bins.map((bin, i) => {
                            const freq = result.returnDistribution.frequencies[i];
                            const maxFreq = Math.max(...result.returnDistribution.frequencies);
                            const height = (freq / maxFreq) * 100;
                            const isPositive = bin >= 0;
                            return (
                              <div
                                key={i}
                                className={`flex-1 ${isPositive ? 'bg-green-500/60' : 'bg-red-500/60'} rounded-t`}
                                style={{ height: `${height}%` }}
                                title={`${bin.toFixed(1)}%: ${freq.toFixed(1)}%`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{result.returnDistribution.bins[0]?.toFixed(0)}%</span>
                          <span>0%</span>
                          <span>{result.returnDistribution.bins[result.returnDistribution.bins.length - 1]?.toFixed(0)}%</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Statistics */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Distribution Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mean Return</span>
                          <span className="font-medium">{formatPercent(result.expectedReturn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Median Return</span>
                          <span className="font-medium">{formatPercent(result.medianReturn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Std Deviation</span>
                          <span className="font-medium">{formatPercent(result.standardDeviation)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Skewness</span>
                          <span className="font-medium">{result.skewness.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kurtosis</span>
                          <span className="font-medium">{result.kurtosis.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Confidence Intervals */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Confidence Intervals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(result.confidenceIntervals).map(([level, interval]) => (
                          <div key={level} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{(Number(level) * 100).toFixed(0)}% Confidence</span>
                              <span>
                                {formatPercent(interval.lower)} to {formatPercent(interval.upper)}
                              </span>
                            </div>
                            <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                              <div
                                className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"
                                style={{ left: '0%', width: '100%' }}
                              />
                              <div
                                className="absolute h-full bg-blue-500/50"
                                style={{
                                  left: `${((interval.lower + 1) / 2) * 100}%`,
                                  width: `${((interval.upper - interval.lower) / 2) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Simulation Paths Tab */}
                <TabsContent value="paths" className="space-y-4">
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Portfolio Value Paths (Fan Chart)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 relative">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(result.finalValues.max)}</span>
                          <span>{formatCurrency(result.finalValues.mean)}</span>
                          <span>{formatCurrency(result.finalValues.min)}</span>
                        </div>
                        {/* Chart area */}
                        <div className="ml-16 h-full relative">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* 95th percentile band */}
                            <path
                              d={`M 0 ${100 - ((result.simulationPaths[0]?.percentile95 || initialCapital) / result.finalValues.max) * 100} 
                                  ${result.simulationPaths.map((p, i) => 
                                    `L ${(i / result.simulationPaths.length) * 100} ${100 - (p.percentile95 / result.finalValues.max) * 100}`
                                  ).join(' ')}
                                  ${result.simulationPaths.slice().reverse().map((p, i) => 
                                    `L ${100 - (i / result.simulationPaths.length) * 100} ${100 - (p.percentile5 / result.finalValues.max) * 100}`
                                  ).join(' ')}
                                  Z`}
                              fill="rgba(34, 197, 94, 0.1)"
                            />
                            {/* 75th percentile band */}
                            <path
                              d={`M 0 ${100 - ((result.simulationPaths[0]?.percentile75 || initialCapital) / result.finalValues.max) * 100} 
                                  ${result.simulationPaths.map((p, i) => 
                                    `L ${(i / result.simulationPaths.length) * 100} ${100 - (p.percentile75 / result.finalValues.max) * 100}`
                                  ).join(' ')}
                                  ${result.simulationPaths.slice().reverse().map((p, i) => 
                                    `L ${100 - (i / result.simulationPaths.length) * 100} ${100 - (p.percentile25 / result.finalValues.max) * 100}`
                                  ).join(' ')}
                                  Z`}
                              fill="rgba(34, 197, 94, 0.2)"
                            />
                            {/* Median line */}
                            <path
                              d={`M 0 ${100 - ((result.simulationPaths[0]?.median || initialCapital) / result.finalValues.max) * 100} 
                                  ${result.simulationPaths.map((p, i) => 
                                    `L ${(i / result.simulationPaths.length) * 100} ${100 - (p.median / result.finalValues.max) * 100}`
                                  ).join(' ')}`}
                              fill="none"
                              stroke="rgb(34, 197, 94)"
                              strokeWidth="0.5"
                            />
                            {/* Initial capital line */}
                            <line
                              x1="0"
                              y1={100 - (initialCapital / result.finalValues.max) * 100}
                              x2="100"
                              y2={100 - (initialCapital / result.finalValues.max) * 100}
                              stroke="rgba(255, 255, 255, 0.3)"
                              strokeDasharray="2,2"
                              strokeWidth="0.3"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="flex justify-center gap-4 mt-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500/20 rounded" />
                          <span className="text-muted-foreground">5th-95th Percentile</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500/40 rounded" />
                          <span className="text-muted-foreground">25th-75th Percentile</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 bg-green-500" />
                          <span className="text-muted-foreground">Median</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Final Values */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="bg-background border-border">
                      <CardContent className="pt-4 text-center">
                        <div className="text-xs text-muted-foreground">Minimum</div>
                        <div className="text-lg font-bold text-red-400">{formatCurrency(result.finalValues.min)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background border-border">
                      <CardContent className="pt-4 text-center">
                        <div className="text-xs text-muted-foreground">25th Percentile</div>
                        <div className="text-lg font-bold text-orange-400">
                          {formatCurrency(result.simulationPaths[result.simulationPaths.length - 1]?.percentile25 || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background border-border">
                      <CardContent className="pt-4 text-center">
                        <div className="text-xs text-muted-foreground">Median</div>
                        <div className="text-lg font-bold text-yellow-400">{formatCurrency(result.finalValues.median)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background border-border">
                      <CardContent className="pt-4 text-center">
                        <div className="text-xs text-muted-foreground">75th Percentile</div>
                        <div className="text-lg font-bold text-green-400">
                          {formatCurrency(result.simulationPaths[result.simulationPaths.length - 1]?.percentile75 || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background border-border">
                      <CardContent className="pt-4 text-center">
                        <div className="text-xs text-muted-foreground">Maximum</div>
                        <div className="text-lg font-bold text-green-400">{formatCurrency(result.finalValues.max)}</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Risk Metrics Tab */}
                <TabsContent value="risk" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* VaR and CVaR */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4 text-orange-400" />
                          Value at Risk (VaR)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(result.valueAtRisk).map(([level, var_]) => (
                          <div key={level} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">VaR ({(Number(level) * 100).toFixed(0)}%)</span>
                              <span className="font-bold text-orange-400">{formatPercent(var_)}</span>
                            </div>
                            <Progress value={Math.min(var_ * 100, 100)} className="h-2" />
                          </div>
                        ))}
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            VaR represents the maximum expected loss at the given confidence level.
                            A 95% VaR of {formatPercent(result.valueAtRisk[0.95] || 0)} means there's a 5% chance
                            of losing more than this amount.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* CVaR */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          Conditional VaR (Expected Shortfall)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(result.conditionalVaR).map(([level, cvar]) => (
                          <div key={level} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CVaR ({(Number(level) * 100).toFixed(0)}%)</span>
                              <span className="font-bold text-red-400">{formatPercent(cvar)}</span>
                            </div>
                            <Progress value={Math.min(cvar * 100, 100)} className="h-2" />
                          </div>
                        ))}
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            CVaR (Expected Shortfall) is the average loss when losses exceed VaR.
                            It provides a more complete picture of tail risk.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Max Drawdown Distribution */}
                    <Card className="bg-background border-border col-span-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-400" />
                          Maximum Drawdown Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-muted/20 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Mean</div>
                            <div className="text-xl font-bold text-orange-400">
                              {formatPercent(result.maxDrawdownDistribution.mean)}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-muted/20 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Median</div>
                            <div className="text-xl font-bold text-orange-400">
                              {formatPercent(result.maxDrawdownDistribution.median)}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-muted/20 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">95th Percentile</div>
                            <div className="text-xl font-bold text-red-400">
                              {formatPercent(result.maxDrawdownDistribution.percentile95)}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-muted/20 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">99th Percentile</div>
                            <div className="text-xl font-bold text-red-400">
                              {formatPercent(result.maxDrawdownDistribution.percentile99)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Scenarios Tab */}
                <TabsContent value="scenarios" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Bull Market */}
                    <Card className="bg-background border-green-500/30 border-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          Bull Market Scenario
                        </CardTitle>
                        <CardDescription>Returns &gt; 15%</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400">
                            {formatPercent(result.scenarioAnalysis.bullMarket.probability)}
                          </div>
                          <div className="text-sm text-muted-foreground">Probability</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-semibold text-green-400">
                            {formatPercent(result.scenarioAnalysis.bullMarket.avgReturn)}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Return</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sideways Market */}
                    <Card className="bg-background border-yellow-500/30 border-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                          <Activity className="h-4 w-4" />
                          Sideways Market Scenario
                        </CardTitle>
                        <CardDescription>Returns -10% to 15%</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-400">
                            {formatPercent(result.scenarioAnalysis.sideways.probability)}
                          </div>
                          <div className="text-sm text-muted-foreground">Probability</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-semibold text-yellow-400">
                            {formatPercent(result.scenarioAnalysis.sideways.avgReturn)}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Return</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bear Market */}
                    <Card className="bg-background border-red-500/30 border-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                          <TrendingDown className="h-4 w-4" />
                          Bear Market Scenario
                        </CardTitle>
                        <CardDescription>Returns &lt; -10%</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-400">
                            {formatPercent(result.scenarioAnalysis.bearMarket.probability)}
                          </div>
                          <div className="text-sm text-muted-foreground">Probability</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-semibold text-red-400">
                            {formatPercent(result.scenarioAnalysis.bearMarket.avgReturn)}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Return</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Probability Summary */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Outcome Probabilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-400">Profit</span>
                            <span>{formatPercent(result.probabilityOfProfit)}</span>
                          </div>
                          <Progress value={result.probabilityOfProfit * 100} className="h-3 bg-muted" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-red-400">Loss</span>
                            <span>{formatPercent(result.probabilityOfLoss)}</span>
                          </div>
                          <Progress value={result.probabilityOfLoss * 100} className="h-3 bg-muted" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600">Ruin (&gt;50% loss)</span>
                            <span>{formatPercent(result.probabilityOfRuin)}</span>
                          </div>
                          <Progress value={result.probabilityOfRuin * 100} className="h-3 bg-muted" />
                        </div>
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
