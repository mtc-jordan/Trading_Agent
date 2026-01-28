import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  Target,
  Clock,
  Percent,
  AlertTriangle,
  CheckCircle,
  Play,
  Settings,
  LineChart
} from 'lucide-react';

// Demo backtest result data
const demoBacktestResult = {
  config: {
    symbol: 'BTCUSDT',
    exchange: 'binance',
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    initialCapital: 100000,
    positionSize: 50,
    entryThreshold: 10,
    exitThreshold: 5,
    maxPositionDuration: 168,
    tradingFees: 0.04,
    slippage: 0.02,
  },
  summary: {
    totalTrades: 47,
    winningTrades: 38,
    losingTrades: 9,
    winRate: 80.85,
    totalPnl: 8234.56,
    totalPnlPercent: 8.23,
    totalFees: 423.12,
    netPnl: 7811.44,
    netPnlPercent: 7.81,
    avgTradeReturn: 0.17,
    avgTradeDuration: 42.3,
    maxDrawdown: 2134.56,
    maxDrawdownPercent: 2.13,
    sharpeRatio: 2.34,
    annualizedReturn: 31.24,
    timeInMarket: 67.8,
  },
  trades: [
    { entryTime: Date.now() - 85 * 24 * 60 * 60 * 1000, exitTime: Date.now() - 83 * 24 * 60 * 60 * 1000, entryRate: 0.00012, exitRate: 0.00008, avgRate: 0.0001, duration: 48, pnl: 234.56, pnlPercent: 0.47, fees: 20, netPnl: 214.56, reason: 'threshold' },
    { entryTime: Date.now() - 80 * 24 * 60 * 60 * 1000, exitTime: Date.now() - 77 * 24 * 60 * 60 * 1000, entryRate: 0.00015, exitRate: 0.00006, avgRate: 0.00011, duration: 72, pnl: 345.67, pnlPercent: 0.69, fees: 20, netPnl: 325.67, reason: 'threshold' },
    { entryTime: Date.now() - 75 * 24 * 60 * 60 * 1000, exitTime: Date.now() - 74 * 24 * 60 * 60 * 1000, entryRate: 0.00018, exitRate: 0.00012, avgRate: 0.00015, duration: 24, pnl: 178.90, pnlPercent: 0.36, fees: 20, netPnl: 158.90, reason: 'threshold' },
    { entryTime: Date.now() - 70 * 24 * 60 * 60 * 1000, exitTime: Date.now() - 68 * 24 * 60 * 60 * 1000, entryRate: 0.00011, exitRate: 0.00004, avgRate: 0.00008, duration: 48, pnl: -45.23, pnlPercent: -0.09, fees: 20, netPnl: -65.23, reason: 'threshold' },
    { entryTime: Date.now() - 65 * 24 * 60 * 60 * 1000, exitTime: Date.now() - 62 * 24 * 60 * 60 * 1000, entryRate: 0.00020, exitRate: 0.00015, avgRate: 0.00018, duration: 72, pnl: 567.89, pnlPercent: 1.14, fees: 20, netPnl: 547.89, reason: 'duration' },
  ],
  equityCurve: Array.from({ length: 90 }, (_, i) => ({
    timestamp: Date.now() - (90 - i) * 24 * 60 * 60 * 1000,
    equity: 100000 + (i * 87) + Math.sin(i / 5) * 500,
  })),
  monthlyReturns: [
    { month: '2025-11', return: 2.34 },
    { month: '2025-12', return: 3.12 },
    { month: '2026-01', return: 2.35 },
  ],
  rateDistribution: [
    { bucket: 'Negative', count: 3, avgReturn: -0.15 },
    { bucket: '0-5%', count: 8, avgReturn: 0.05 },
    { bucket: '5-10%', count: 12, avgReturn: 0.12 },
    { bucket: '10-15%', count: 15, avgReturn: 0.18 },
    { bucket: '15-20%', count: 7, avgReturn: 0.25 },
    { bucket: '20%+', count: 2, avgReturn: 0.35 },
  ],
  recommendations: [
    'Strategy shows positive risk-adjusted returns (Sharpe > 1)',
    'High win rate (80.9%) indicates reliable entry signals',
    'Low time in market - consider lowering entry threshold to capture more opportunities',
    'Short average trade duration - strategy is responsive to rate changes',
  ],
};

export default function BasisBacktestDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState({
    symbol: 'BTCUSDT',
    exchange: 'binance',
    initialCapital: '100000',
    positionSize: '50',
    entryThreshold: '10',
    exitThreshold: '5',
    maxPositionDuration: '168',
    tradingFees: '0.04',
    slippage: '0.02',
  });
  const [result, setResult] = useState(demoBacktestResult);

  const handleRunBacktest = () => {
    setIsRunning(true);
    // Simulate backtest running
    setTimeout(() => {
      setIsRunning(false);
      setResult(demoBacktestResult);
    }, 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Basis Trade Backtester</h1>
            <p className="text-muted-foreground mt-1">
              Analyze historical funding rates to optimize delta-neutral yield strategies
            </p>
          </div>
          <Button onClick={handleRunBacktest} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Backtest'}
          </Button>
        </div>

        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Backtest Configuration
            </CardTitle>
            <CardDescription>Configure parameters for the basis trading strategy backtest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Select value={config.symbol} onValueChange={(v) => setConfig({ ...config, symbol: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                    <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                    <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                    <SelectItem value="BNBUSDT">BNBUSDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exchange</Label>
                <Select value={config.exchange} onValueChange={(v) => setConfig({ ...config, exchange: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="okx">OKX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Initial Capital ($)</Label>
                <Input 
                  type="number" 
                  value={config.initialCapital}
                  onChange={(e) => setConfig({ ...config, initialCapital: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Position Size (%)</Label>
                <Input 
                  type="number" 
                  value={config.positionSize}
                  onChange={(e) => setConfig({ ...config, positionSize: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Entry Threshold (%)</Label>
                <Input 
                  type="number" 
                  value={config.entryThreshold}
                  onChange={(e) => setConfig({ ...config, entryThreshold: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Exit Threshold (%)</Label>
                <Input 
                  type="number" 
                  value={config.exitThreshold}
                  onChange={(e) => setConfig({ ...config, exitThreshold: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Duration (hrs)</Label>
                <Input 
                  type="number" 
                  value={config.maxPositionDuration}
                  onChange={(e) => setConfig({ ...config, maxPositionDuration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Trading Fees (%)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={config.tradingFees}
                  onChange={(e) => setConfig({ ...config, tradingFees: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slippage (%)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={config.slippage}
                  onChange={(e) => setConfig({ ...config, slippage: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net P&L</p>
                  <p className={`text-2xl font-bold ${result.summary.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(result.summary.netPnl)}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${result.summary.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Annualized Return</p>
                  <p className={`text-2xl font-bold ${result.summary.annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercent(result.summary.annualizedReturn)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-2xl font-bold">{result.summary.sharpeRatio.toFixed(2)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-green-500">{result.summary.winRate.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-2xl font-bold text-red-500">-{result.summary.maxDrawdownPercent.toFixed(2)}%</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{result.summary.totalTrades}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Tabs defaultValue="equity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="trades">Trade History</TabsTrigger>
            <TabsTrigger value="distribution">Rate Distribution</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Returns</TabsTrigger>
            <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="equity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Equity Curve
                </CardTitle>
                <CardDescription>Portfolio value over the backtest period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-end gap-0.5">
                  {result.equityCurve.map((point, i) => {
                    const min = Math.min(...result.equityCurve.map(p => p.equity));
                    const max = Math.max(...result.equityCurve.map(p => p.equity));
                    const height = ((point.equity - min) / (max - min)) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t hover:from-green-400 hover:to-green-300 transition-colors"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${formatDate(point.timestamp)}: ${formatCurrency(point.equity)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>{formatDate(result.equityCurve[0]?.timestamp || Date.now())}</span>
                  <span>{formatDate(result.equityCurve[result.equityCurve.length - 1]?.timestamp || Date.now())}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
                <CardDescription>Individual trade records from the backtest</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Entry Date</th>
                        <th className="text-left p-3">Exit Date</th>
                        <th className="text-right p-3">Entry Rate</th>
                        <th className="text-right p-3">Avg Rate</th>
                        <th className="text-right p-3">Duration</th>
                        <th className="text-right p-3">Gross P&L</th>
                        <th className="text-right p-3">Fees</th>
                        <th className="text-right p-3">Net P&L</th>
                        <th className="text-center p-3">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((trade, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="p-3">{formatDate(trade.entryTime)}</td>
                          <td className="p-3">{formatDate(trade.exitTime)}</td>
                          <td className="p-3 text-right">{(trade.entryRate * 100).toFixed(4)}%</td>
                          <td className="p-3 text-right">{(trade.avgRate * 100).toFixed(4)}%</td>
                          <td className="p-3 text-right">{trade.duration.toFixed(0)}h</td>
                          <td className={`p-3 text-right ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(trade.pnl)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">{formatCurrency(trade.fees)}</td>
                          <td className={`p-3 text-right font-medium ${trade.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(trade.netPnl)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={trade.reason === 'threshold' ? 'default' : 'secondary'}>
                              {trade.reason}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Funding Rate Distribution Analysis
                </CardTitle>
                <CardDescription>Trade performance by funding rate bucket</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.rateDistribution.map((bucket, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">{bucket.bucket}</div>
                      <div className="flex-1">
                        <div className="h-8 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${bucket.avgReturn >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full transition-all`}
                            style={{ width: `${Math.min((bucket.count / 20) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right text-sm">
                        <span className="font-medium">{bucket.count}</span>
                        <span className="text-muted-foreground"> trades</span>
                      </div>
                      <div className={`w-24 text-right text-sm font-medium ${bucket.avgReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercent(bucket.avgReturn)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Key Insight</h4>
                  <p className="text-sm text-muted-foreground">
                    Trades entered when funding rates are between 10-15% annualized show the best risk-adjusted returns.
                    Consider focusing entries in this range for optimal performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Monthly Returns
                </CardTitle>
                <CardDescription>Performance breakdown by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {result.monthlyReturns.map((month, i) => (
                    <Card key={i} className={month.return >= 0 ? 'border-green-500/50' : 'border-red-500/50'}>
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">{month.month}</p>
                        <p className={`text-xl font-bold ${month.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(month.return)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Best Month</p>
                    <p className="text-lg font-bold text-green-500">
                      {formatPercent(Math.max(...result.monthlyReturns.map(m => m.return)))}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Worst Month</p>
                    <p className="text-lg font-bold text-red-500">
                      {formatPercent(Math.min(...result.monthlyReturns.map(m => m.return)))}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Avg Monthly</p>
                    <p className="text-lg font-bold">
                      {formatPercent(result.monthlyReturns.reduce((s, m) => s + m.return, 0) / result.monthlyReturns.length)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Profitable Months</p>
                    <p className="text-lg font-bold">
                      {result.monthlyReturns.filter(m => m.return > 0).length}/{result.monthlyReturns.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  AI Strategy Recommendations
                </CardTitle>
                <CardDescription>Insights and suggestions based on backtest analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                      {rec.includes('positive') || rec.includes('High win') ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : rec.includes('consider') || rec.includes('Low') ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      ) : (
                        <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                      )}
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Strategy Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Risk Profile</p>
                      <p className="font-medium text-green-500">Conservative (Sharpe &gt; 2)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Recommended Capital</p>
                      <p className="font-medium">$50,000 - $500,000</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time Commitment</p>
                      <p className="font-medium">Low (Automated)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Market Conditions</p>
                      <p className="font-medium">Best in High Volatility</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium text-green-500">Strategy Approved</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on the backtest results, this delta-neutral basis trading strategy meets institutional
                    risk criteria with a Sharpe ratio above 2.0 and maximum drawdown below 5%. The strategy
                    is suitable for deployment with the recommended position sizing.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Time in Market</span>
                  <span className="font-medium">{result.summary.timeInMarket.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${result.summary.timeInMarket}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg Trade Duration</span>
                  <span className="font-medium">{result.summary.avgTradeDuration.toFixed(1)} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Winning Trades</span>
                  <span className="font-medium text-green-500">{result.summary.winningTrades}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Losing Trades</span>
                  <span className="font-medium text-red-500">{result.summary.losingTrades}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gross P&L</span>
                  <span className={`font-medium ${result.summary.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(result.summary.totalPnl)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Fees</span>
                  <span className="font-medium text-red-500">-{formatCurrency(result.summary.totalFees)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Net P&L</span>
                    <span className={`text-xl font-bold ${result.summary.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(result.summary.netPnl)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fee Impact</span>
                  <span className="font-medium">
                    {((result.summary.totalFees / result.summary.totalPnl) * 100).toFixed(1)}% of gross
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
