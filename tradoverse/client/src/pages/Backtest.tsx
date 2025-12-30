import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  ChartLine, 
  Play, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  BarChart3,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function Backtest() {
  const [config, setConfig] = useState({
    name: "",
    strategyType: "momentum" as const,
    symbols: "AAPL",
    startDate: "2023-01-01",
    endDate: "2024-01-01",
    initialCapital: "100000",
    shortPeriod: "10",
    longPeriod: "20",
    stopLoss: "5",
    takeProfit: "10",
  });

  const [result, setResult] = useState<any>(null);

  const { data: backtests, isLoading: backtestsLoading, refetch } = trpc.backtest.list.useQuery();
  
  const runBacktestMutation = trpc.backtest.run.useMutation({
    onSuccess: (data) => {
      setResult(data.result);
      toast.success("Backtest completed successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Backtest failed");
    },
  });

  const handleRunBacktest = () => {
    if (!config.name || !config.symbols) {
      toast.error("Please fill in all required fields");
      return;
    }

    runBacktestMutation.mutate({
      name: config.name,
      strategy: {
        type: config.strategyType,
        parameters: {
          shortPeriod: parseInt(config.shortPeriod),
          longPeriod: parseInt(config.longPeriod),
        },
        entryConditions: [],
        exitConditions: [],
        positionSizing: "fixed",
        maxPositionSize: parseFloat(config.initialCapital) * 0.1,
        stopLoss: parseFloat(config.stopLoss) / 100,
        takeProfit: parseFloat(config.takeProfit) / 100,
      },
      symbols: config.symbols.split(",").map(s => s.trim().toUpperCase()),
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: parseFloat(config.initialCapital),
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backtesting</h1>
          <p className="text-muted-foreground">
            Test your trading strategies against historical market data
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Backtest Configuration</CardTitle>
              <CardDescription>Set up your backtest parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Backtest Name</Label>
                <Input
                  placeholder="My Backtest"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Strategy Type</Label>
                <Select value={config.strategyType} onValueChange={(v: any) => setConfig({ ...config, strategyType: v })}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="momentum">Momentum</SelectItem>
                    <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                    <SelectItem value="trend_following">Trend Following</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Symbols (comma-separated)</Label>
                <Input
                  placeholder="AAPL, MSFT, GOOGL"
                  value={config.symbols}
                  onChange={(e) => setConfig({ ...config, symbols: e.target.value })}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Start Date</Label>
                  <Input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">End Date</Label>
                  <Input
                    type="date"
                    value={config.endDate}
                    onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Initial Capital ($)</Label>
                <Input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => setConfig({ ...config, initialCapital: e.target.value })}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Short Period</Label>
                  <Input
                    type="number"
                    value={config.shortPeriod}
                    onChange={(e) => setConfig({ ...config, shortPeriod: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Long Period</Label>
                  <Input
                    type="number"
                    value={config.longPeriod}
                    onChange={(e) => setConfig({ ...config, longPeriod: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Stop Loss (%)</Label>
                  <Input
                    type="number"
                    value={config.stopLoss}
                    onChange={(e) => setConfig({ ...config, stopLoss: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Take Profit (%)</Label>
                  <Input
                    type="number"
                    value={config.takeProfit}
                    onChange={(e) => setConfig({ ...config, takeProfit: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <Button 
                onClick={handleRunBacktest}
                disabled={runBacktestMutation.isPending}
                className="w-full gradient-primary text-primary-foreground"
              >
                {runBacktestMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Backtest...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Backtest
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {runBacktestMutation.isPending && (
              <Card className="bg-card border-border">
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <ChartLine className="absolute inset-0 m-auto w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Running Backtest...</h3>
                    <p className="text-muted-foreground">
                      Analyzing historical data and simulating trades
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && !runBacktestMutation.isPending && (
              <>
                {/* Metrics Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total Return</span>
                      </div>
                      <p className={`text-2xl font-bold ${result.metrics.totalReturn >= 0 ? "text-profit" : "text-loss"}`}>
                        {formatPercent(result.metrics.totalReturn)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {result.metrics.sharpeRatio.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Max Drawdown</span>
                      </div>
                      <p className="text-2xl font-bold text-loss">
                        {formatPercent(result.metrics.maxDrawdown)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Win Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercent(result.metrics.winRate)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Equity Curve */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Equity Curve</CardTitle>
                    <CardDescription>Portfolio value over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.equityCurve.map((d: any) => ({
                          date: new Date(d.date).toLocaleDateString(),
                          equity: d.equity,
                        }))}>
                          <defs>
                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 260)" />
                          <XAxis dataKey="date" stroke="oklch(0.65 0 0)" fontSize={12} />
                          <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "oklch(0.16 0.01 260)", 
                              border: "1px solid oklch(0.28 0.02 260)",
                              borderRadius: "8px"
                            }}
                            labelStyle={{ color: "oklch(0.95 0 0)" }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="equity" 
                            stroke="oklch(0.65 0.2 145)" 
                            fill="url(#equityGradient)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Metrics */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Annualized Return</span>
                          <span className={`font-medium ${result.metrics.annualizedReturn >= 0 ? "text-profit" : "text-loss"}`}>
                            {formatPercent(result.metrics.annualizedReturn)}
                          </span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Sortino Ratio</span>
                          <span className="font-medium text-foreground">{result.metrics.sortinoRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Calmar Ratio</span>
                          <span className="font-medium text-foreground">{result.metrics.calmarRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Profit Factor</span>
                          <span className="font-medium text-foreground">{result.metrics.profitFactor.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Total Trades</span>
                          <span className="font-medium text-foreground">{result.metrics.totalTrades}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Winning Trades</span>
                          <span className="font-medium text-profit">{result.metrics.winningTrades}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Losing Trades</span>
                          <span className="font-medium text-loss">{result.metrics.losingTrades}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                          <span className="text-muted-foreground">Avg Holding Period</span>
                          <span className="font-medium text-foreground">{result.metrics.averageHoldingPeriod.toFixed(1)} days</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!result && !runBacktestMutation.isPending && (
              <Card className="bg-card border-border">
                <CardContent className="py-12">
                  <div className="text-center">
                    <ChartLine className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Backtest Results Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Configure your strategy parameters and run a backtest to see performance metrics
                    </p>
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
