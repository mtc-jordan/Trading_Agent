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
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
  Layers,
  RefreshCw,
  Target,
  Zap,
} from "lucide-react";

interface WindowResult {
  windowIndex: number;
  trainingStart: Date | string;
  trainingEnd: Date | string;
  testingStart: Date | string;
  testingEnd: Date | string;
  trainingReturn: number;
  trainingSharpe: number;
  trainingWinRate: number;
  testingReturn: number;
  testingSharpe: number;
  testingWinRate: number;
  testingMaxDrawdown: number;
  returnDegradation: number;
  sharpeRatio: number;
  isOverfit: boolean;
  modelParameters?: Record<string, number>;
}

interface WalkForwardResult {
  config: {
    symbol: string;
    totalPeriodDays: number;
    trainingWindowDays: number;
    testingWindowDays: number;
    stepSizeDays: number;
    optimizationType: string;
    strategyType: string;
    initialCapital: number;
  };
  windows: WindowResult[];
  aggregateMetrics: {
    totalReturn: number;
    avgTestingReturn: number;
    avgReturnDegradation: number;
    avgSharpe: number;
    avgWinRate: number;
    avgMaxDrawdown: number;
    consistencyRatio: number;
    overfitRatio: number;
  };
  stabilityMetrics: {
    returnStability: number;
    sharpeStability: number;
    parameterStability: number;
  };
  combinedEquityCurve: Array<{ date: string; value: number }>;
  performanceTimeline: Array<{
    date: string;
    cumulativeReturn: number;
    windowReturn: number;
    isTraining: boolean;
  }>;
  recommendations: {
    isStrategyRobust: boolean;
    suggestedTrainingWindow: number;
    suggestedTestingWindow: number;
    overfitWarning: boolean;
    stabilityScore: number;
  };
}

export function WalkForwardOptimization() {
  const [symbol, setSymbol] = useState("AAPL");
  const [totalPeriodDays, setTotalPeriodDays] = useState(504);
  const [trainingWindowDays, setTrainingWindowDays] = useState(126);
  const [testingWindowDays, setTestingWindowDays] = useState(63);
  const [stepSizeDays, setStepSizeDays] = useState(63);
  const [optimizationType, setOptimizationType] = useState<'anchored' | 'rolling'>('rolling');
  const [strategyType, setStrategyType] = useState<'rl' | 'momentum' | 'mean_reversion' | 'enhanced'>('enhanced');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [result, setResult] = useState<WalkForwardResult | null>(null);

  const runMutation = trpc.walkForward.run.useMutation({
    onSuccess: (data) => {
      setResult(data as WalkForwardResult);
      toast.success("Walk-forward optimization complete!");
    },
    onError: (error) => {
      toast.error(error.message || "Optimization failed");
    },
  });

  const handleRun = () => {
    if (!symbol.trim()) {
      toast.error("Please enter a stock symbol");
      return;
    }
    runMutation.mutate({
      symbol: symbol.toUpperCase(),
      totalPeriodDays,
      trainingWindowDays,
      testingWindowDays,
      stepSizeDays,
      optimizationType,
      strategyType,
      initialCapital,
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatNumber = (value: number, decimals = 2) => value.toFixed(decimals);

  const getOverfitColor = (severity: string) => {
    switch (severity) {
      case 'none': return 'text-green-400';
      case 'low': return 'text-yellow-400';
      case 'moderate': return 'text-orange-400';
      case 'high': return 'text-red-400';
      case 'severe': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getOverfitBadge = (severity: string) => {
    switch (severity) {
      case 'none': return <Badge className="bg-green-500/20 text-green-400">No Overfit</Badge>;
      case 'low': return <Badge className="bg-yellow-500/20 text-yellow-400">Low Overfit</Badge>;
      case 'moderate': return <Badge className="bg-orange-500/20 text-orange-400">Moderate Overfit</Badge>;
      case 'high': return <Badge className="bg-red-500/20 text-red-400">High Overfit</Badge>;
      case 'severe': return <Badge className="bg-red-600/20 text-red-600">Severe Overfit</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-400" />
            Walk-Forward Optimization
          </CardTitle>
          <CardDescription>
            Re-train strategies on rolling windows to prevent overfitting and adapt to changing markets
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
              <Label>Total Period: {totalPeriodDays} days (~{(totalPeriodDays / 252).toFixed(1)} years)</Label>
              <Slider
                value={[totalPeriodDays]}
                onValueChange={([v]) => setTotalPeriodDays(v)}
                min={252}
                max={1260}
                step={63}
              />
            </div>
            <div className="space-y-2">
              <Label>Training Window: {trainingWindowDays} days</Label>
              <Slider
                value={[trainingWindowDays]}
                onValueChange={([v]) => setTrainingWindowDays(v)}
                min={63}
                max={252}
                step={21}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Testing Window: {testingWindowDays} days</Label>
              <Slider
                value={[testingWindowDays]}
                onValueChange={([v]) => setTestingWindowDays(v)}
                min={21}
                max={126}
                step={21}
              />
            </div>
            <div className="space-y-2">
              <Label>Step Size: {stepSizeDays} days</Label>
              <Slider
                value={[stepSizeDays]}
                onValueChange={([v]) => setStepSizeDays(v)}
                min={21}
                max={126}
                step={21}
              />
            </div>
            <div className="space-y-2">
              <Label>Optimization Type</Label>
              <Select value={optimizationType} onValueChange={(v) => setOptimizationType(v as typeof optimizationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rolling">Rolling Window</SelectItem>
                  <SelectItem value="anchored">Anchored Window</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select value={strategyType} onValueChange={(v) => setStrategyType(v as typeof strategyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enhanced">Enhanced Analysis</SelectItem>
                  <SelectItem value="rl">Reinforcement Learning</SelectItem>
                  <SelectItem value="momentum">Momentum</SelectItem>
                  <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleRun}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running optimization...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Walk-Forward
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Target className="h-4 w-4" />
                  Total Return
                </div>
                <div className={`text-2xl font-bold ${result.aggregateMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(result.aggregateMetrics.totalReturn)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Avg Sharpe
                </div>
                <div className={`text-2xl font-bold ${result.aggregateMetrics.avgSharpe >= 1 ? 'text-green-400' : result.aggregateMetrics.avgSharpe >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatNumber(result.aggregateMetrics.avgSharpe)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Zap className="h-4 w-4" />
                  WF Efficiency
                </div>
                <div className={`text-2xl font-bold ${(result.recommendations.stabilityScore / 100) >= 0.7 ? 'text-green-400' : (result.recommendations.stabilityScore / 100) >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatPercent((result.recommendations.stabilityScore / 100))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Layers className="h-4 w-4" />
                  Consistency
                </div>
                <div className={`text-2xl font-bold ${result.aggregateMetrics.consistencyRatio >= 0.7 ? 'text-green-400' : result.aggregateMetrics.consistencyRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatPercent(result.aggregateMetrics.consistencyRatio)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Overfit Status
                </div>
                <div className="mt-1">
                  {getOverfitBadge((result.recommendations.overfitWarning ? 'moderate' : 'none'))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <Tabs defaultValue="windows">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="windows">Window Results</TabsTrigger>
                  <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>

                {/* Windows Tab */}
                <TabsContent value="windows" className="space-y-4">
                  {/* Timeline visualization */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Walk-Forward Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.windows.map((window, idx) => (
                          <div key={window.windowIndex} className="flex items-center gap-2">
                            <div className="w-8 text-xs text-muted-foreground">W{idx + 1}</div>
                            <div className="flex-1 flex h-6 rounded overflow-hidden">
                              <div 
                                className="bg-blue-500/40 flex items-center justify-center text-xs"
                                style={{ width: `${(trainingWindowDays / (trainingWindowDays + testingWindowDays)) * 100}%` }}
                              >
                                Train
                              </div>
                              <div 
                                className={`flex items-center justify-center text-xs ${window.testingReturn >= 0 ? 'bg-green-500/40' : 'bg-red-500/40'}`}
                                style={{ width: `${(testingWindowDays / (trainingWindowDays + testingWindowDays)) * 100}%` }}
                              >
                                Test: {formatPercent(window.testingReturn)}
                              </div>
                            </div>
                            <div className="w-16 text-right">
                              {window.testingReturn >= 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400 inline" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400 inline" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Window Details Table */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Window Performance Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-2">Window</th>
                              <th className="text-right p-2">Train Return</th>
                              <th className="text-right p-2">Test Return</th>
                              <th className="text-right p-2">Train Sharpe</th>
                              <th className="text-right p-2">Test Sharpe</th>
                              <th className="text-right p-2">Win Rate</th>
                              <th className="text-right p-2">Max DD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.windows.map((window, idx) => (
                              <tr key={window.windowIndex} className="border-b border-border/50">
                                <td className="p-2">Window {idx + 1}</td>
                                <td className={`text-right p-2 ${window.trainingReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(window.trainingReturn)}
                                </td>
                                <td className={`text-right p-2 ${window.testingReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(window.testingReturn)}
                                </td>
                                <td className="text-right p-2">{formatNumber(window.trainingSharpe)}</td>
                                <td className="text-right p-2">{formatNumber(window.testingSharpe)}</td>
                                <td className="text-right p-2">{formatPercent(window.testingWinRate)}</td>
                                <td className="text-right p-2 text-orange-400">{formatPercent(window.testingMaxDrawdown)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Training vs Testing Comparison */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Training vs Testing Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Training returns line */}
                            <path
                              d={`M 0 50 ${result.windows.map((w: WindowResult, i: number) => 
                                `L ${(i / (result.windows.length - 1)) * 100} ${50 - w.trainingReturn * 200}`
                              ).join(' ')}`}
                              fill="none"
                              stroke="rgb(59, 130, 246)"
                              strokeWidth="0.5"
                            />
                            {/* Testing returns line */}
                            <path
                              d={`M 0 50 ${result.windows.map((w: WindowResult, i: number) => 
                                `L ${(i / (result.windows.length - 1)) * 100} ${50 - w.testingReturn * 200}`
                              ).join(' ')}`}
                              fill="none"
                              stroke="rgb(34, 197, 94)"
                              strokeWidth="0.5"
                            />
                            {/* Zero line */}
                            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
                          </svg>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-blue-500" />
                            <span className="text-muted-foreground">Training</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-green-500" />
                            <span className="text-muted-foreground">Testing</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Overfit Analysis */}
                    <Card className="bg-background border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${getOverfitColor((result.recommendations.overfitWarning ? 'moderate' : 'none'))}`} />
                          Overfit Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Overfit Ratio</span>
                            <span className={getOverfitColor((result.recommendations.overfitWarning ? 'moderate' : 'none'))}>
                              {formatNumber(result.aggregateMetrics.overfitRatio)}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(result.aggregateMetrics.overfitRatio * 50, 100)} 
                            className="h-2" 
                          />
                          <p className="text-xs text-muted-foreground">
                            Ratio &lt; 1 indicates testing performs worse than training (potential overfit)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Robustness Score</span>
                            <span className={result.recommendations.stabilityScore / 100 >= 0.7 ? 'text-green-400' : 'text-orange-400'}>
                              {formatPercent(result.recommendations.stabilityScore / 100)}
                            </span>
                          </div>
                          <Progress value={result.recommendations.stabilityScore / 100 * 100} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Return Consistency (Std Dev)</span>
                            <span>{formatPercent(result.stabilityMetrics.returnStability)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Aggregate Statistics */}
                    <Card className="bg-background border-border col-span-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Aggregate Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Avg Testing Return</div>
                            <div className={`text-xl font-bold ${result.aggregateMetrics.avgTestingReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercent(result.aggregateMetrics.avgTestingReturn)}
                            </div>
                          </div>
                          <div className="p-4 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Avg Testing Sharpe</div>
                            <div className={`text-xl font-bold ${result.aggregateMetrics.avgSharpe >= 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {formatNumber(result.aggregateMetrics.avgSharpe)}
                            </div>
                          </div>
                          <div className="p-4 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Avg Win Rate</div>
                            <div className={`text-xl font-bold ${result.aggregateMetrics.avgWinRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercent(result.aggregateMetrics.avgWinRate)}
                            </div>
                          </div>
                          <div className="p-4 bg-muted/20 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">Avg Max Drawdown</div>
                            <div className="text-xl font-bold text-orange-400">
                              {formatPercent(result.aggregateMetrics.avgMaxDrawdown)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-4">
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Strategy Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          result.recommendations.isStrategyRobust 
                            ? "Strategy shows robust out-of-sample performance" 
                            : "Strategy may be overfit - consider adjusting parameters",
                          result.recommendations.overfitWarning 
                            ? "Warning: Significant performance degradation between training and testing" 
                            : "Good: Training and testing performance are consistent",
                          `Suggested training window: ${result.recommendations.suggestedTrainingWindow} days`,
                          `Suggested testing window: ${result.recommendations.suggestedTestingWindow} days`,
                          `Overall stability score: ${result.recommendations.stabilityScore.toFixed(0)}/100`
                        ].map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                            <div className="mt-0.5">
                              {rec.includes('Warning') || rec.includes('overfit') ? (
                                <AlertTriangle className="h-5 w-5 text-orange-400" />
                              ) : rec.includes('Good') || rec.includes('robust') ? (
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                              ) : (
                                <Activity className="h-5 w-5 text-blue-400" />
                              )}
                            </div>
                            <p className="text-sm">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configuration Summary */}
                  <Card className="bg-background border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Configuration Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Symbol:</span>
                          <span className="ml-2 font-medium">{result.config.symbol}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Strategy:</span>
                          <span className="ml-2 font-medium capitalize">{result.config.strategyType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Optimization:</span>
                          <span className="ml-2 font-medium capitalize">{result.config.optimizationType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Windows:</span>
                          <span className="ml-2 font-medium">{result.windows.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Training:</span>
                          <span className="ml-2 font-medium">{result.config.trainingWindowDays} days</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Testing:</span>
                          <span className="ml-2 font-medium">{result.config.testingWindowDays} days</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Step Size:</span>
                          <span className="ml-2 font-medium">{result.config.stepSizeDays} days</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Period:</span>
                          <span className="ml-2 font-medium">{result.config.totalPeriodDays} days</span>
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
