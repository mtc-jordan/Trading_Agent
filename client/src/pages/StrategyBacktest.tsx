import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine 
} from 'recharts';
import { 
  Play, TrendingUp, TrendingDown, Activity, Target, AlertTriangle,
  Calendar, DollarSign, Percent, Clock, Award, BarChart3, Download
} from 'lucide-react';

export default function StrategyBacktest() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [initialCapital, setInitialCapital] = useState('100000');
  const [isRunning, setIsRunning] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);

  // Fetch strategy templates
  const { data: templates } = trpc.broker.getStrategyTemplates.useQuery();
  
  // Run backtest mutation
  const runBacktestMutation = trpc.broker.runAgentBacktest.useMutation({
    onSuccess: (data: any) => {
      setBacktestResult(data);
      setIsRunning(false);
    },
    onError: () => {
      setIsRunning(false);
    },
  });

  const handleRunBacktest = () => {
    if (!selectedStrategy) return;
    
    setIsRunning(true);
    runBacktestMutation.mutate({
      symbol,
      startDate: startDate,
      endDate: endDate,
      initialCapital: parseFloat(initialCapital),
      positionSizing: 'percent' as const,
      positionSize: 10,
      stopLoss: 5,
      takeProfit: 10,
      useAgentWeights: true,
    });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy Backtesting</h1>
            <p className="text-muted-foreground">
              Test your trading strategies against historical data
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Backtest Configuration
            </CardTitle>
            <CardDescription>
              Configure your backtest parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  onChange={(e) => setInitialCapital(e.target.value)}
                  placeholder="100000"
                />
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleRunBacktest} 
                  disabled={!selectedStrategy || isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {backtestResult && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="equity">Equity Curve</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Return</p>
                        <p className={`text-2xl font-bold ${backtestResult.metrics.totalReturnPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(backtestResult.metrics.totalReturnPercent)}
                        </p>
                      </div>
                      {backtestResult.metrics.totalReturnPercent >= 0 ? (
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
                        <p className="text-2xl font-bold">{backtestResult.metrics.sharpeRatio.toFixed(2)}</p>
                      </div>
                      <Award className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Max Drawdown</p>
                        <p className="text-2xl font-bold text-red-500">
                          -{backtestResult.metrics.maxDrawdownPercent.toFixed(2)}%
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Win Rate</p>
                        <p className="text-2xl font-bold">{backtestResult.metrics.winRate.toFixed(1)}%</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annualized Return</span>
                        <span className={backtestResult.metrics.annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatPercent(backtestResult.metrics.annualizedReturn)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit Factor</span>
                        <span>{backtestResult.metrics.profitFactor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sortino Ratio</span>
                        <span>{backtestResult.metrics.sortinoRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Calmar Ratio</span>
                        <span>{backtestResult.metrics.calmarRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volatility</span>
                        <span>{backtestResult.metrics.volatility.toFixed(2)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Trades</span>
                        <span>{backtestResult.metrics.totalTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Winning Trades</span>
                        <span className="text-green-500">{backtestResult.metrics.winningTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losing Trades</span>
                        <span className="text-red-500">{backtestResult.metrics.losingTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Win</span>
                        <span className="text-green-500">{formatCurrency(backtestResult.metrics.avgWin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Loss</span>
                        <span className="text-red-500">{formatCurrency(backtestResult.metrics.avgLoss)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Benchmark Comparison */}
              {backtestResult.benchmark && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">vs Benchmark ({backtestResult.benchmark.symbol})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Strategy Return</p>
                        <p className={`text-xl font-bold ${backtestResult.metrics.totalReturnPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(backtestResult.metrics.totalReturnPercent)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Benchmark Return</p>
                        <p className={`text-xl font-bold ${backtestResult.benchmark.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(backtestResult.benchmark.return)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Alpha</p>
                        <p className={`text-xl font-bold ${(backtestResult.metrics.totalReturnPercent - backtestResult.benchmark.return) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(backtestResult.metrics.totalReturnPercent - backtestResult.benchmark.return)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Equity Curve Tab */}
            <TabsContent value="equity">
              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                  <CardDescription>Portfolio value over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={backtestResult.equityCurve.slice(0, 100)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
                          stroke="#888"
                        />
                        <YAxis 
                          yAxisId="equity"
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          stroke="#888"
                        />
                        <YAxis 
                          yAxisId="drawdown"
                          orientation="right"
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          stroke="#888"
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          formatter={(value: any, name: string) => {
                            if (name === 'Equity') return [formatCurrency(value), name];
                            return [`${value.toFixed(2)}%`, name];
                          }}
                          labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
                        />
                        <Legend />
                        <Area
                          yAxisId="equity"
                          type="monotone"
                          dataKey="equity"
                          name="Equity"
                          fill="#22c55e"
                          fillOpacity={0.3}
                          stroke="#22c55e"
                        />
                        <Line
                          yAxisId="drawdown"
                          type="monotone"
                          dataKey="drawdownPercent"
                          name="Drawdown %"
                          stroke="#ef4444"
                          dot={false}
                        />
                        <ReferenceLine yAxisId="equity" y={parseFloat(initialCapital)} stroke="#666" strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trades Tab */}
            <TabsContent value="trades">
              <Card>
                <CardHeader>
                  <CardTitle>Trade History</CardTitle>
                  <CardDescription>All executed trades during backtest</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Entry Date</th>
                          <th className="text-left py-3 px-4">Exit Date</th>
                          <th className="text-right py-3 px-4">Entry Price</th>
                          <th className="text-right py-3 px-4">Exit Price</th>
                          <th className="text-right py-3 px-4">Quantity</th>
                          <th className="text-right py-3 px-4">P&L</th>
                          <th className="text-right py-3 px-4">P&L %</th>
                          <th className="text-left py-3 px-4">Exit Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResult.trades.slice(0, 20).map((trade: any) => (
                          <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4">{new Date(trade.entryTime).toLocaleDateString()}</td>
                            <td className="py-3 px-4">{new Date(trade.exitTime).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-right">${trade.entryPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">${trade.exitPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">{trade.quantity}</td>
                            <td className={`py-3 px-4 text-right ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(trade.pnl)}
                            </td>
                            <td className={`py-3 px-4 text-right ${trade.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercent(trade.pnlPercent)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{trade.exitReason}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {backtestResult.trades.length > 20 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Showing 20 of {backtestResult.trades.length} trades
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monthly Tab */}
            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                  <CardDescription>Returns breakdown by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={backtestResult.monthlyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" stroke="#888" />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#888" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          formatter={(value: any) => [formatCurrency(value), 'Return']}
                        />
                        <Bar 
                          dataKey="return" 
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Month</th>
                          <th className="text-right py-3 px-4">Return</th>
                          <th className="text-right py-3 px-4">Trades</th>
                          <th className="text-right py-3 px-4">Win Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResult.monthlyPerformance.map((month: any) => (
                          <tr key={month.month} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4">{month.month}</td>
                            <td className={`py-3 px-4 text-right ${month.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(month.return)}
                            </td>
                            <td className="py-3 px-4 text-right">{month.trades}</td>
                            <td className="py-3 px-4 text-right">{month.winRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Risk Analysis Tab */}
            <TabsContent value="risk" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Max Drawdown</span>
                          <span className="text-red-500">{backtestResult.metrics.maxDrawdownPercent.toFixed(2)}%</span>
                        </div>
                        <Progress value={Math.min(backtestResult.metrics.maxDrawdownPercent, 100)} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Volatility</span>
                          <span>{backtestResult.metrics.volatility.toFixed(2)}%</span>
                        </div>
                        <Progress value={Math.min(backtestResult.metrics.volatility, 100)} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Downside Volatility</span>
                          <span>{backtestResult.metrics.downsidevVolatility.toFixed(2)}%</span>
                        </div>
                        <Progress value={Math.min(backtestResult.metrics.downsidevVolatility, 100)} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Consecutive Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Consecutive Wins</span>
                        <span className="text-green-500">{backtestResult.metrics.maxConsecutiveWins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Consecutive Losses</span>
                        <span className="text-red-500">{backtestResult.metrics.maxConsecutiveLosses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Consecutive Wins</span>
                        <span>{backtestResult.metrics.avgConsecutiveWins.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Consecutive Losses</span>
                        <span>{backtestResult.metrics.avgConsecutiveLosses.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exposure Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Time in Market</p>
                      <p className="text-2xl font-bold">{backtestResult.metrics.timeInMarket.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Avg Position Size</p>
                      <p className="text-2xl font-bold">{formatCurrency(backtestResult.metrics.avgPositionSize)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Avg Holding Period</p>
                      <p className="text-2xl font-bold">{backtestResult.metrics.avgHoldingPeriod.toFixed(1)} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!backtestResult && !isRunning && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Backtest Results</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Select a strategy and configure your backtest parameters to see historical performance results.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
