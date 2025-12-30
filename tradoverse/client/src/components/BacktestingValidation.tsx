import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, 
  Play, History, BarChart3, PieChartIcon, Activity
} from "lucide-react";

interface BacktestResult {
  id?: number;
  config: {
    symbol: string;
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    strategyType: string;
  };
  trades: Array<{
    entryDate: Date;
    entryPrice: number;
    exitDate: Date;
    exitPrice: number;
    side: string;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    recommendation: string;
    confidence: number;
    exitReason: string;
  }>;
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgHoldingPeriod: number;
    calmarRatio: number;
  };
  equityCurve: Array<{ date: string; value: number }>;
  drawdownCurve: Array<{ date: string; drawdown: number }>;
  analysisAccuracy: {
    totalPredictions: number;
    correctPredictions: number;
    accuracyRate: number;
    avgConfidence: number;
    byRecommendation: Record<string, { total: number; correct: number; accuracy: number }>;
  };
  status: string;
  errorMessage?: string;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export function BacktestingValidation() {
  const [symbol, setSymbol] = useState("AAPL");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [strategyType, setStrategyType] = useState<"standard" | "enhanced">("enhanced");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const runBacktest = trpc.backtestValidation.run.useMutation({
    onSuccess: (data) => {
      setResult(data as BacktestResult);
    },
  });

  const backtestHistory = trpc.backtestValidation.list.useQuery({ limit: 10 });

  const handleRunBacktest = () => {
    runBacktest.mutate({
      symbol,
      startDate,
      endDate,
      initialCapital,
      strategyType,
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toFixed(2);

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Backtesting Validation
          </CardTitle>
          <CardDescription>
            Test analysis recommendations against historical data to measure prediction accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital</Label>
              <Input
                id="capital"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={strategyType} onValueChange={(v) => setStrategyType(v as "standard" | "enhanced")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Analysis</SelectItem>
                  <SelectItem value="enhanced">Enhanced Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            className="mt-4" 
            onClick={handleRunBacktest}
            disabled={runBacktest.isPending}
          >
            {runBacktest.isPending ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && result.status === 'completed' && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className={`text-2xl font-bold ${result.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercent(result.metrics.totalReturn)}
                      </p>
                    </div>
                    {result.metrics.totalReturn >= 0 ? (
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-2xl font-bold">{formatNumber(result.metrics.sharpeRatio)}</p>
                    </div>
                    <Badge variant={result.metrics.sharpeRatio >= 1 ? "default" : "secondary"}>
                      {result.metrics.sharpeRatio >= 2 ? "Excellent" : result.metrics.sharpeRatio >= 1 ? "Good" : "Fair"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">{formatPercent(result.metrics.winRate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {result.metrics.winningTrades}W / {result.metrics.losingTrades}L
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-2xl font-bold text-red-500">{formatPercent(result.metrics.maxDrawdown)}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accuracy Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prediction Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Overall Accuracy</span>
                      <span className="font-bold">{formatPercent(result.analysisAccuracy.accuracyRate)}</span>
                    </div>
                    <Progress value={result.analysisAccuracy.accuracyRate * 100} className="h-3" />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">
                      {result.analysisAccuracy.correctPredictions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {result.analysisAccuracy.totalPredictions} correct
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equity Curve Tab */}
          <TabsContent value="equity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Equity"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        fill="#10b98133"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.drawdownCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value: number) => [formatPercent(value), "Drawdown"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="drawdown" 
                        stroke="#ef4444" 
                        fill="#ef444433"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accuracy Tab */}
          <TabsContent value="accuracy" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Accuracy by Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={Object.entries(result.analysisAccuracy.byRecommendation).map(([rec, data]) => ({
                          recommendation: rec.replace('_', ' '),
                          accuracy: data.accuracy * 100,
                          total: data.total,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis dataKey="recommendation" type="category" width={100} />
                        <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Accuracy"]} />
                        <Bar dataKey="accuracy" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Prediction Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(result.analysisAccuracy.byRecommendation).map(([rec, data], index) => ({
                            name: rec.replace('_', ' '),
                            value: data.total,
                            fill: COLORS[index % COLORS.length],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(result.analysisAccuracy.byRecommendation).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accuracy Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{result.analysisAccuracy.totalPredictions}</p>
                    <p className="text-sm text-muted-foreground">Total Predictions</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{result.analysisAccuracy.correctPredictions}</p>
                    <p className="text-sm text-muted-foreground">Correct</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{formatPercent(result.analysisAccuracy.accuracyRate)}</p>
                    <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{formatPercent(result.analysisAccuracy.avgConfidence)}</p>
                    <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trade History ({result.trades.length} trades)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Entry Date</th>
                        <th className="text-left p-2">Exit Date</th>
                        <th className="text-right p-2">Entry Price</th>
                        <th className="text-right p-2">Exit Price</th>
                        <th className="text-right p-2">P&L</th>
                        <th className="text-right p-2">Return</th>
                        <th className="text-left p-2">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.slice(0, 20).map((trade, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2">{new Date(trade.entryDate).toLocaleDateString()}</td>
                          <td className="p-2">{new Date(trade.exitDate).toLocaleDateString()}</td>
                          <td className="text-right p-2">{formatCurrency(trade.entryPrice)}</td>
                          <td className="text-right p-2">{formatCurrency(trade.exitPrice)}</td>
                          <td className={`text-right p-2 ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(trade.pnl)}
                          </td>
                          <td className={`text-right p-2 ${trade.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatPercent(trade.pnlPercent)}
                          </td>
                          <td className="p-2">
                            <Badge variant={
                              trade.exitReason === 'take_profit' ? 'default' :
                              trade.exitReason === 'stop_loss' ? 'destructive' :
                              'secondary'
                            }>
                              {trade.exitReason.replace('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.trades.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Showing 20 of {result.trades.length} trades
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Return Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Return</span>
                    <span className={`font-bold ${result.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercent(result.metrics.totalReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Annualized Return</span>
                    <span className={`font-bold ${result.metrics.annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercent(result.metrics.annualizedReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Win</span>
                    <span className="font-bold text-green-500">{formatCurrency(result.metrics.avgWin)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Loss</span>
                    <span className="font-bold text-red-500">{formatCurrency(result.metrics.avgLoss)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-bold">{formatNumber(result.metrics.sharpeRatio)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sortino Ratio</span>
                    <span className="font-bold">{formatNumber(result.metrics.sortinoRatio)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Calmar Ratio</span>
                    <span className="font-bold">{formatNumber(result.metrics.calmarRatio)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="font-bold text-red-500">{formatPercent(result.metrics.maxDrawdown)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trade Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="font-bold">{result.metrics.totalTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-bold">{formatPercent(result.metrics.winRate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Profit Factor</span>
                    <span className="font-bold">{formatNumber(result.metrics.profitFactor)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Holding Period</span>
                    <span className="font-bold">{formatNumber(result.metrics.avgHoldingPeriod)} days</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Win/Loss Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Winning', value: result.metrics.winningTrades, fill: '#10b981' },
                            { name: 'Losing', value: result.metrics.losingTrades, fill: '#ef4444' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Error State */}
      {result && result.status === 'failed' && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Backtest Failed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{result.errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {backtestHistory.data && backtestHistory.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Backtests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backtestHistory.data.slice(0, 5).map((bt: any) => (
                <div key={bt.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium">{bt.symbol}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {bt.strategyType} • {new Date(bt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold ${Number(bt.totalReturn) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercent(Number(bt.totalReturn))}
                    </span>
                    <Badge variant={bt.status === 'completed' ? 'default' : 'secondary'}>
                      {bt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
