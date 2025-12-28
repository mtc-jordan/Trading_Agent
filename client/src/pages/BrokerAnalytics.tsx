import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, Activity,
  BarChart3, PieChart, Clock, Target, Zap, RefreshCw,
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useBroker, BrokerConnection } from '@/contexts/BrokerContext';

export default function BrokerAnalytics() {
  const { connectedBrokers, activeBroker, getBrokerName, getBrokerColor } = useBroker();
  const [selectedConnection, setSelectedConnection] = useState<string>(activeBroker?.id || 'all');
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'>('monthly');

  // Fetch aggregated analytics
  const { data: aggregatedAnalytics, isLoading: aggLoading } = trpc.broker.getAggregatedAnalytics.useQuery();

  // Fetch performance metrics for selected connection
  const { data: performanceMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.broker.getPerformanceMetrics.useQuery(
    { connectionId: selectedConnection !== 'all' ? selectedConnection : (activeBroker?.id || ''), periodType: selectedPeriod },
    { enabled: selectedConnection !== 'all' || !!activeBroker }
  );

  // Fetch buying power history
  const { data: buyingPowerHistory } = trpc.broker.getBuyingPowerHistory.useQuery(
    { connectionId: selectedConnection !== 'all' ? selectedConnection : (activeBroker?.id || ''), days: 30 },
    { enabled: selectedConnection !== 'all' || !!activeBroker }
  );

  // Fetch trade frequency
  const { data: tradeFrequency } = trpc.broker.getTradeFrequency.useQuery(
    { connectionId: selectedConnection !== 'all' ? selectedConnection : (activeBroker?.id || ''), days: 30 },
    { enabled: selectedConnection !== 'all' || !!activeBroker }
  );

  // Calculate metrics
  const calculateMetrics = trpc.broker.calculateMetrics.useMutation({
    onSuccess: () => refetchMetrics(),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const latestMetrics = performanceMetrics?.[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Broker Analytics</h1>
            <p className="text-muted-foreground">
              Monitor account performance, metrics, and trading patterns
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {connectedBrokers.map((conn: BrokerConnection) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {getBrokerName(conn.brokerType)} - {conn.accountId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedConnection !== 'all') {
                  calculateMetrics.mutate({ connectionId: selectedConnection, periodType: selectedPeriod });
                }
              }}
              disabled={selectedConnection === 'all' || calculateMetrics.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${calculateMetrics.isPending ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </div>

        {/* Aggregated Overview */}
        {selectedConnection === 'all' && aggregatedAnalytics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aggLoading ? '...' : formatCurrency(aggregatedAnalytics.totalEquity)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {aggregatedAnalytics.connectionCount} brokers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(aggregatedAnalytics.totalBuyingPower)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cash: {formatCurrency(aggregatedAnalytics.totalCash)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Day P&L</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${aggregatedAnalytics.totalDayPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(aggregatedAnalytics.totalDayPL)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {aggregatedAnalytics.totalDayPL >= 0 ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />}
                  Today's performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${aggregatedAnalytics.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(aggregatedAnalytics.totalPL)}
                </div>
                <p className="text-xs text-muted-foreground">
                  All-time performance
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Broker Breakdown */}
        {selectedConnection === 'all' && aggregatedAnalytics?.brokerBreakdown && (
          <Card>
            <CardHeader>
              <CardTitle>Broker Breakdown</CardTitle>
              <CardDescription>Performance by connected broker</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aggregatedAnalytics.brokerBreakdown.map((broker) => {
                  const percentage = aggregatedAnalytics.totalEquity > 0 
                    ? (broker.equity / aggregatedAnalytics.totalEquity) * 100 
                    : 0;
                  
                  return (
                    <div key={broker.connectionId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getBrokerColor(broker.brokerType as any) }}
                          />
                          <span className="font-medium">{getBrokerName(broker.brokerType as any)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(broker.equity)}
                          </span>
                          <span className={`text-sm ${broker.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(broker.totalPL)}
                          </span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        {selectedConnection !== 'all' && (
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="risk" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Risk Metrics
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Performance Tab */}
            <TabsContent value="performance">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(latestMetrics?.totalReturn || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {metricsLoading ? '...' : formatCurrency(latestMetrics?.totalReturn || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(latestMetrics?.totalReturnPercent || null)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metricsLoading ? '...' : `${(latestMetrics?.winRate || 0).toFixed(1)}%`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {latestMetrics?.winningTrades || 0}W / {latestMetrics?.losingTrades || 0}L
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metricsLoading ? '...' : (latestMetrics?.profitFactor || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg Win/Loss ratio
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metricsLoading ? '...' : formatCurrency(latestMetrics?.totalVolume || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {latestMetrics?.totalTrades || 0} trades
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Period Selector */}
              <Card className="mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Performance Period</CardTitle>
                    <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="all_time">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Average Win</p>
                      <p className="text-xl font-semibold text-green-500">
                        {formatCurrency(latestMetrics?.avgWin || 0)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Average Loss</p>
                      <p className="text-xl font-semibold text-red-500">
                        {formatCurrency(latestMetrics?.avgLoss || 0)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Avg Trade Size</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(latestMetrics?.avgTradeSize || 0)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Largest Win</p>
                      <p className="text-xl font-semibold text-green-500">
                        {formatCurrency(latestMetrics?.largestWin || 0)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Largest Loss</p>
                      <p className="text-xl font-semibold text-red-500">
                        {formatCurrency(latestMetrics?.largestLoss || 0)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Avg Holding Period</p>
                      <p className="text-xl font-semibold">
                        {(latestMetrics?.avgHoldingPeriod || 0).toFixed(1)} days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Risk Metrics Tab */}
            <TabsContent value="risk">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(latestMetrics?.sharpeRatio || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Risk-adjusted return
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {formatPercent(latestMetrics?.maxDrawdown ? -latestMetrics.maxDrawdown : null)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Peak to trough decline
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Volatility</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(latestMetrics?.volatility || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Standard deviation
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sortino Ratio</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(latestMetrics?.sortinoRatio || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Downside risk adjusted
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Buying Power Chart */}
              {buyingPowerHistory && buyingPowerHistory.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Margin Utilization</CardTitle>
                    <CardDescription>Buying power and margin usage over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-end gap-1">
                      {buyingPowerHistory.slice(-30).map((day, idx) => {
                        const maxUtil = Math.max(...buyingPowerHistory.map(d => d.marginUtilization));
                        const height = maxUtil > 0 ? (day.marginUtilization / maxUtil) * 100 : 0;
                        
                        return (
                          <div key={day.date} className="flex flex-col items-center flex-1">
                            <div 
                              className={`w-full rounded-t ${day.marginUtilization > 80 ? 'bg-red-500' : day.marginUtilization > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${day.marginUtilization.toFixed(1)}%`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              {tradeFrequency && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Daily Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Trading Activity</CardTitle>
                      <CardDescription>Number of trades per day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-end gap-1">
                        {tradeFrequency.daily.slice(-14).map((day) => {
                          const maxCount = Math.max(...tradeFrequency.daily.map(d => d.count));
                          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                          
                          return (
                            <div key={day.date} className="flex flex-col items-center flex-1">
                              <div 
                                className="w-full bg-primary rounded-t"
                                style={{ height: `${Math.max(height, 2)}%` }}
                                title={`${day.date}: ${day.count} trades`}
                              />
                              <span className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                                {day.date.slice(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hourly Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Trading Hours</CardTitle>
                      <CardDescription>Distribution by hour of day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-end gap-1">
                        {Array.from({ length: 24 }, (_, hour) => {
                          const hourData = tradeFrequency.hourly.find(h => h.hour === hour);
                          const count = hourData?.count || 0;
                          const maxCount = Math.max(...tradeFrequency.hourly.map(h => h.count));
                          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          
                          return (
                            <div key={hour} className="flex flex-col items-center flex-1">
                              <div 
                                className={`w-full rounded-t ${hour >= 9 && hour <= 16 ? 'bg-primary' : 'bg-muted'}`}
                                style={{ height: `${Math.max(height, 2)}%` }}
                                title={`${hour}:00 - ${count} trades`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>12 AM</span>
                        <span>12 PM</span>
                        <span>11 PM</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Traded Symbols */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Most Traded Symbols</CardTitle>
                      <CardDescription>Symbols ranked by trade count</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {tradeFrequency.bySymbol.slice(0, 10).map((item, idx) => {
                          const maxCount = tradeFrequency.bySymbol[0]?.count || 1;
                          const percentage = (item.count / maxCount) * 100;
                          
                          return (
                            <div key={item.symbol} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{idx + 1}</Badge>
                                  <span className="font-medium">{item.symbol}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {item.count} trades
                                </span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* No broker selected message */}
        {connectedBrokers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Brokers Connected</h3>
              <p className="text-muted-foreground text-center mb-4">
                Connect a broker to view analytics and performance metrics
              </p>
              <Button>Connect Broker</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
