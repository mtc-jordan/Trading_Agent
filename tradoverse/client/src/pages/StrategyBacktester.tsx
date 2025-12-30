/**
 * Strategy Backtester Page
 * 
 * Allows users to backtest the 7-agent consensus system against historical data
 * to validate performance before deploying with real capital.
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar,
  DollarSign,
  Percent,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';

export default function StrategyBacktester() {
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [positionSizing, setPositionSizing] = useState<'fixed' | 'percent'>('percent');
  const [positionSize, setPositionSize] = useState(50);
  const [stopLoss, setStopLoss] = useState(5);
  const [takeProfit, setTakeProfit] = useState(10);
  const [useAgentWeights, setUseAgentWeights] = useState(true);
  
  const backtestMutation = trpc.broker.runAgentBacktest.useMutation();
  
  const handleRunBacktest = () => {
    backtestMutation.mutate({
      symbol,
      startDate,
      endDate,
      initialCapital,
      positionSizing,
      positionSize,
      stopLoss,
      takeProfit,
      useAgentWeights,
    });
  };
  
  const result = backtestMutation.data;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Strategy Backtester
            </h1>
            <p className="text-gray-400 mt-1">
              Validate the 7-agent consensus system against historical data
            </p>
          </div>
          <Button 
            onClick={handleRunBacktest}
            disabled={backtestMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {backtestMutation.isPending ? (
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
        </div>
        
        {/* Configuration */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle>Backtest Configuration</CardTitle>
            <CardDescription>Configure the backtest parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Symbol */}
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              {/* Initial Capital */}
              <div className="space-y-2">
                <Label>Initial Capital</Label>
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              {/* Position Sizing */}
              <div className="space-y-2">
                <Label>Position Sizing</Label>
                <Select value={positionSizing} onValueChange={(v) => setPositionSizing(v as 'fixed' | 'percent')}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percent">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Position Size */}
              <div className="space-y-2">
                <Label>Position Size ({positionSizing === 'percent' ? '%' : '$'})</Label>
                <Input
                  type="number"
                  value={positionSize}
                  onChange={(e) => setPositionSize(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              {/* Stop Loss */}
              <div className="space-y-2">
                <Label>Stop Loss (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[stopLoss]}
                    onValueChange={([v]) => setStopLoss(v)}
                    min={1}
                    max={20}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{stopLoss}%</span>
                </div>
              </div>
              
              {/* Take Profit */}
              <div className="space-y-2">
                <Label>Take Profit (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[takeProfit]}
                    onValueChange={([v]) => setTakeProfit(v)}
                    min={1}
                    max={50}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{takeProfit}%</span>
                </div>
              </div>
            </div>
            
            {/* Agent Weights Toggle */}
            <div className="mt-6 flex items-center gap-3">
              <Switch
                checked={useAgentWeights}
                onCheckedChange={setUseAgentWeights}
              />
              <Label>Use adaptive agent weights</Label>
            </div>
          </CardContent>
        </Card>
        
        {/* Results */}
        {result && (
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="bg-gray-800">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="agents">Agent Analysis</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <MetricCard
                  title="Total Return"
                  value={`${(result.summary.totalReturn * 100).toFixed(2)}%`}
                  icon={result.summary.totalReturn >= 0 ? TrendingUp : TrendingDown}
                  color={result.summary.totalReturn >= 0 ? 'green' : 'red'}
                />
                <MetricCard
                  title="Annualized Return"
                  value={`${(result.summary.annualizedReturn * 100).toFixed(2)}%`}
                  icon={Percent}
                  color={result.summary.annualizedReturn >= 0 ? 'green' : 'red'}
                />
                <MetricCard
                  title="Sharpe Ratio"
                  value={result.summary.sharpeRatio.toFixed(2)}
                  icon={Target}
                  color={result.summary.sharpeRatio >= 1 ? 'green' : result.summary.sharpeRatio >= 0.5 ? 'yellow' : 'red'}
                />
                <MetricCard
                  title="Max Drawdown"
                  value={`${(result.summary.maxDrawdown * 100).toFixed(2)}%`}
                  icon={AlertTriangle}
                  color={result.summary.maxDrawdown <= 0.1 ? 'green' : result.summary.maxDrawdown <= 0.2 ? 'yellow' : 'red'}
                />
                <MetricCard
                  title="Win Rate"
                  value={`${(result.summary.winRate * 100).toFixed(1)}%`}
                  icon={CheckCircle}
                  color={result.summary.winRate >= 0.5 ? 'green' : 'red'}
                />
                <MetricCard
                  title="Total Trades"
                  value={result.summary.totalTrades.toString()}
                  icon={Activity}
                  color="blue"
                />
              </div>
              
              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volatility</span>
                      <span>{(result.summary.volatility * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sortino Ratio</span>
                      <span>{result.summary.sortinoRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Calmar Ratio</span>
                      <span>{result.summary.calmarRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown Duration</span>
                      <span>{result.summary.maxDrawdownDuration} days</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Factor</span>
                      <span>{result.summary.profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Win</span>
                      <span className="text-green-400">+{(result.summary.avgWin * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Loss</span>
                      <span className="text-red-400">-{(result.summary.avgLoss * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Holding Period</span>
                      <span>{result.summary.avgHoldingPeriod.toFixed(1)} days</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Equity curve visualization</p>
                      <p className="text-sm">Final Value: ${result.dailySnapshots[result.dailySnapshots.length - 1]?.portfolioValue.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Monthly Returns */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle>Monthly Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {result.monthlyReturns.map((month: { month: string; return: number; benchmarkReturn: number }) => (
                      <div
                        key={month.month}
                        className={`p-2 rounded text-center text-xs ${
                          month.return >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        <div className="font-medium">{month.month.split('-')[1]}</div>
                        <div>{(month.return * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Drawdown Periods */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle>Drawdown Periods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.drawdownPeriods.slice(0, 5).map((period: { startDate: string; endDate: string; duration: number; maxDrawdown: number }, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <div>
                            <div className="text-sm">{period.startDate} to {period.endDate}</div>
                            <div className="text-xs text-gray-400">{period.duration} days</div>
                          </div>
                        </div>
                        <div className="text-red-400 font-medium">
                          -{(period.maxDrawdown * 100).toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Trades Tab */}
            <TabsContent value="trades" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle>Trade History</CardTitle>
                  <CardDescription>{result.trades.length} trades executed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.trades.map((trade: { id: string; symbol: string; side: string; timestamp: number; quantity: number; price: number; totalValue: number; confidence: number }) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {trade.side === 'buy' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{trade.symbol}</span>
                              <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                                {trade.side.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(trade.timestamp).toLocaleDateString()} • {trade.quantity} shares @ ${trade.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${trade.totalValue.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">
                            Confidence: {(trade.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Agent Analysis Tab */}
            <TabsContent value="agents" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.agentPerformance.map((agent: { agentType: string; accuracy: number; profitableSignals: number; totalSignals: number; contribution: number }) => (
                  <Card key={agent.agentType} className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">{agent.agentType} Agent</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Accuracy</span>
                        <span className={agent.accuracy >= 0.5 ? 'text-green-400' : 'text-red-400'}>
                          {(agent.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Profitable Signals</span>
                        <span>{agent.profitableSignals} / {agent.totalSignals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weight Contribution</span>
                        <span>{(agent.contribution * 100).toFixed(1)}%</span>
                      </div>
                      {/* Accuracy Bar */}
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${agent.accuracy >= 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${agent.accuracy * 100}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            {/* Benchmark Tab */}
            <TabsContent value="benchmark" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle>Benchmark Comparison</CardTitle>
                  <CardDescription>Performance vs {result.config.benchmark}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-sm text-gray-400">Strategy Return</div>
                      <div className={`text-2xl font-bold ${result.summary.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(result.summary.totalReturn * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-sm text-gray-400">Benchmark Return</div>
                      <div className={`text-2xl font-bold ${result.benchmarkComparison.benchmarkReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(result.benchmarkComparison.benchmarkReturn * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-sm text-gray-400">Excess Return (Alpha)</div>
                      <div className={`text-2xl font-bold ${result.benchmarkComparison.excessReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(result.benchmarkComparison.excessReturn * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-sm text-gray-400">Information Ratio</div>
                      <div className="text-2xl font-bold">
                        {result.benchmarkComparison.informationRatio.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Tracking Error</div>
                    <div className="text-lg">
                      {(result.benchmarkComparison.trackingError * 100).toFixed(2)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Measures how closely the strategy follows the benchmark
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* No Results State */}
        {!result && !backtestMutation.isPending && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Backtest Results</h3>
                <p className="text-sm">Configure your parameters and click "Run Backtest" to see results</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  };
  
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-gray-400">{title}</div>
            <div className={`text-lg font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
