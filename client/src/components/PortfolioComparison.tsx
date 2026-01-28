/**
 * Portfolio Performance Comparison Component
 * 
 * Displays charts comparing returns across different brokers
 * to help users optimize their allocation.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

// Broker metadata for display
const BROKER_METADATA: Record<string, { name: string; color: string; icon: string }> = {
  alpaca: { name: 'Alpaca', color: '#00C805', icon: '🦙' },
  interactive_brokers: { name: 'Interactive Brokers', color: '#D92B2B', icon: '📊' },
  binance: { name: 'Binance', color: '#F0B90B', icon: '🔶' },
  coinbase: { name: 'Coinbase', color: '#0052FF', icon: '🪙' }
};

interface BrokerPerformance {
  brokerId: string;
  brokerType: string;
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  returnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weekChange: number;
  weekChangePercent: number;
  monthChange: number;
  monthChangePercent: number;
  positions: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

interface PortfolioComparisonProps {
  brokerPerformances: BrokerPerformance[];
  isLoading?: boolean;
}

export function PortfolioComparison({ brokerPerformances, isLoading }: PortfolioComparisonProps) {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [sortBy, setSortBy] = useState<'return' | 'value' | 'risk'>('return');

  // Calculate aggregate statistics
  const aggregateStats = useMemo(() => {
    if (brokerPerformances.length === 0) return null;

    const totalValue = brokerPerformances.reduce((sum, b) => sum + b.totalValue, 0);
    const totalCost = brokerPerformances.reduce((sum, b) => sum + b.totalCost, 0);
    const totalReturn = totalValue - totalCost;
    const returnPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    const avgWinRate = brokerPerformances.reduce((sum, b) => sum + b.winRate, 0) / brokerPerformances.length;
    const avgSharpe = brokerPerformances.reduce((sum, b) => sum + b.sharpeRatio, 0) / brokerPerformances.length;

    return {
      totalValue,
      totalCost,
      totalReturn,
      returnPercent,
      avgWinRate,
      avgSharpe,
      brokerCount: brokerPerformances.length
    };
  }, [brokerPerformances]);

  // Sort brokers based on selected criteria
  const sortedBrokers = useMemo(() => {
    return [...brokerPerformances].sort((a, b) => {
      switch (sortBy) {
        case 'return':
          return b.returnPercent - a.returnPercent;
        case 'value':
          return b.totalValue - a.totalValue;
        case 'risk':
          return a.volatility - b.volatility; // Lower volatility is better
        default:
          return 0;
      }
    });
  }, [brokerPerformances, sortBy]);

  // Calculate allocation percentages
  const allocations = useMemo(() => {
    const total = brokerPerformances.reduce((sum, b) => sum + b.totalValue, 0);
    return brokerPerformances.map(b => ({
      ...b,
      allocation: total > 0 ? (b.totalValue / total) * 100 : 0
    }));
  }, [brokerPerformances]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (brokerPerformances.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Broker Data Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Connect multiple brokers to compare their performance and optimize your portfolio allocation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregate Summary */}
      {aggregateStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Portfolio</p>
                  <p className="text-2xl font-bold">{formatCurrency(aggregateStats.totalValue)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Return</p>
                  <p className={`text-2xl font-bold ${getChangeColor(aggregateStats.totalReturn)}`}>
                    {formatCurrency(aggregateStats.totalReturn)}
                  </p>
                  <p className={`text-sm ${getChangeColor(aggregateStats.returnPercent)}`}>
                    {formatPercent(aggregateStats.returnPercent)}
                  </p>
                </div>
                {aggregateStats.totalReturn >= 0 ? (
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
                  <p className="text-sm text-muted-foreground">Avg Win Rate</p>
                  <p className="text-2xl font-bold">{aggregateStats.avgWinRate.toFixed(1)}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Brokers Connected</p>
                  <p className="text-2xl font-bold">{aggregateStats.brokerCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Comparison Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Broker Performance Comparison</CardTitle>
              <CardDescription>Compare returns and risk metrics across your connected brokers</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">1 Day</SelectItem>
                  <SelectItem value="week">1 Week</SelectItem>
                  <SelectItem value="month">1 Month</SelectItem>
                  <SelectItem value="year">1 Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="return">By Return</SelectItem>
                  <SelectItem value="value">By Value</SelectItem>
                  <SelectItem value="risk">By Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
            </TabsList>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              {sortedBrokers.map((broker, index) => {
                const meta = BROKER_METADATA[broker.brokerType] || { 
                  name: broker.brokerType, 
                  color: '#888888', 
                  icon: '📈' 
                };
                const change = timeframe === 'day' ? broker.dayChangePercent :
                              timeframe === 'week' ? broker.weekChangePercent :
                              broker.monthChangePercent;

                return (
                  <div 
                    key={broker.brokerId}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-12 w-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{meta.name}</span>
                          {index === 0 && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                              Top Performer
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {broker.positions} positions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Value</p>
                        <p className="font-semibold">{formatCurrency(broker.totalValue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Return</p>
                        <p className={`font-semibold ${getChangeColor(broker.returnPercent)}`}>
                          {formatPercent(broker.returnPercent)}
                        </p>
                      </div>
                      <div className="text-right min-w-24">
                        <p className="text-sm text-muted-foreground">{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Change</p>
                        <div className="flex items-center justify-end gap-1">
                          {getChangeIcon(change)}
                          <span className={`font-semibold ${getChangeColor(change)}`}>
                            {formatPercent(change)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Allocation Tab */}
            <TabsContent value="allocation" className="space-y-4">
              <div className="space-y-4">
                {/* Visual allocation bar */}
                <div className="h-8 rounded-full overflow-hidden flex">
                  {allocations.map((broker) => {
                    const meta = BROKER_METADATA[broker.brokerType] || { color: '#888888' };
                    return (
                      <div
                        key={broker.brokerId}
                        className="h-full transition-all duration-300"
                        style={{ 
                          width: `${broker.allocation}%`,
                          backgroundColor: meta.color
                        }}
                        title={`${BROKER_METADATA[broker.brokerType]?.name || broker.brokerType}: ${broker.allocation.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Allocation details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allocations.map((broker) => {
                    const meta = BROKER_METADATA[broker.brokerType] || { 
                      name: broker.brokerType, 
                      color: '#888888', 
                      icon: '📈' 
                    };

                    return (
                      <div 
                        key={broker.brokerId}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="font-medium">{meta.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{broker.allocation.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(broker.totalValue)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Risk Metrics Tab */}
            <TabsContent value="risk" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Broker</th>
                      <th className="text-right py-3 px-4 font-medium">Sharpe Ratio</th>
                      <th className="text-right py-3 px-4 font-medium">Max Drawdown</th>
                      <th className="text-right py-3 px-4 font-medium">Volatility</th>
                      <th className="text-right py-3 px-4 font-medium">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBrokers.map((broker) => {
                      const meta = BROKER_METADATA[broker.brokerType] || { 
                        name: broker.brokerType, 
                        icon: '📈' 
                      };

                      return (
                        <tr key={broker.brokerId} className="border-b hover:bg-accent/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span>{meta.icon}</span>
                              <span className="font-medium">{meta.name}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className={broker.sharpeRatio >= 1 ? 'text-green-500' : broker.sharpeRatio >= 0 ? 'text-yellow-500' : 'text-red-500'}>
                              {broker.sharpeRatio.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className="text-red-500">
                              -{broker.maxDrawdown.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className={broker.volatility <= 15 ? 'text-green-500' : broker.volatility <= 25 ? 'text-yellow-500' : 'text-red-500'}>
                              {broker.volatility.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className={broker.winRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                              {broker.winRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Risk Legend */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Sharpe Ratio:</span>
                  <span className="text-green-500">≥1 Good</span>
                  <span className="text-yellow-500">0-1 Moderate</span>
                  <span className="text-red-500">&lt;0 Poor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Volatility:</span>
                  <span className="text-green-500">≤15% Low</span>
                  <span className="text-yellow-500">15-25% Medium</span>
                  <span className="text-red-500">&gt;25% High</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioComparison;
