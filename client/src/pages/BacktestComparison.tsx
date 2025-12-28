import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  GitCompare, TrendingUp, TrendingDown, Award, AlertTriangle,
  RefreshCw, Trash2, ChevronRight, BarChart3, Activity, Target
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function BacktestComparison() {
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  
  // Fetch backtest runs
  const { data: runs, isLoading: runsLoading, refetch: refetchRuns } = 
    trpc.broker.getBacktestRuns.useQuery();
  
  // Compare selected runs
  const { data: comparison, isLoading: comparisonLoading } = 
    trpc.broker.compareBacktests.useQuery(
      { runIds: selectedRuns },
      { enabled: selectedRuns.length >= 2 }
    );
  
  // Delete mutation
  const deleteMutation = trpc.broker.deleteBacktestRun.useMutation({
    onSuccess: () => refetchRuns(),
  });

  const toggleRunSelection = (runId: string) => {
    setSelectedRuns(prev => 
      prev.includes(runId) 
        ? prev.filter(id => id !== runId)
        : [...prev, runId]
    );
  };

  const getRunColor = (runId: string) => {
    const index = selectedRuns.indexOf(runId);
    return COLORS[index % COLORS.length];
  };

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  const formatNumber = (value: number) => value.toFixed(2);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GitCompare className="w-8 h-8" />
              Backtest Comparison
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare multiple backtest runs to find the best strategy configuration
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchRuns()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Run Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Backtests to Compare</CardTitle>
            <CardDescription>
              Choose 2 or more backtest runs to compare their performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : runs && runs.length > 0 ? (
              <div className="space-y-3">
                {runs.map((run: any) => (
                  <div 
                    key={run.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      selectedRuns.includes(run.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedRuns.includes(run.id)}
                        onCheckedChange={() => toggleRunSelection(run.id)}
                      />
                      {selectedRuns.includes(run.id) && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getRunColor(run.id) }}
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{run.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {run.symbol} • {run.startDate} to {run.endDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-medium ${run.results.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(run.results.totalReturn)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sharpe: {formatNumber(run.results.sharpeRatio)}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteMutation.mutate({ runId: run.id })}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No backtest runs available. Run a backtest from the Strategy Backtester page.
              </div>
            )}
            
            {selectedRuns.length > 0 && selectedRuns.length < 2 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Select at least 2 backtests to compare</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparison && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Award className="w-4 h-4" />
                    <span className="text-sm">Best Overall</span>
                  </div>
                  <div className="font-semibold">
                    {comparison.runs.find((r: any) => r.id === comparison.summary.bestOverall)?.name}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">Best Risk-Adjusted</span>
                  </div>
                  <div className="font-semibold">
                    {comparison.runs.find((r: any) => r.id === comparison.summary.bestRiskAdjusted)?.name}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm">Lowest Drawdown</span>
                  </div>
                  <div className="font-semibold">
                    {comparison.runs.find((r: any) => r.id === comparison.summary.lowestDrawdown)?.name}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Highest Win Rate</span>
                  </div>
                  <div className="font-semibold">
                    {comparison.runs.find((r: any) => r.id === comparison.summary.highestWinRate)?.name}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            {comparison.summary.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {comparison.summary.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Detailed Comparison */}
            <Tabs defaultValue="metrics" className="space-y-4">
              <TabsList>
                <TabsTrigger value="metrics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="equity">
                  <Activity className="w-4 h-4 mr-2" />
                  Equity Curves
                </TabsTrigger>
                <TabsTrigger value="drawdown">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Drawdowns
                </TabsTrigger>
                <TabsTrigger value="monthly">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Monthly Returns
                </TabsTrigger>
              </TabsList>

              {/* Metrics Comparison */}
              <TabsContent value="metrics">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics Comparison</CardTitle>
                    <CardDescription>
                      Side-by-side comparison of key performance indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          {comparison.runs.map((run: any) => (
                            <TableHead key={run.id} className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getRunColor(run.id) }}
                                />
                                {run.name}
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="text-center">Winner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.metrics.map((metric: any) => (
                          <TableRow key={metric.metric}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{metric.metric}</div>
                                <div className="text-xs text-muted-foreground">{metric.description}</div>
                              </div>
                            </TableCell>
                            {metric.values.map((value: any) => {
                              const isWinner = value.runId === metric.winner;
                              return (
                                <TableCell key={value.runId} className="text-center">
                                  <span className={isWinner ? 'font-bold text-primary' : ''}>
                                    {metric.metric.includes('Return') || metric.metric.includes('Rate') || metric.metric.includes('Drawdown')
                                      ? formatPercent(value.value)
                                      : formatNumber(value.value)}
                                  </span>
                                  {isWinner && <Badge className="ml-2" variant="secondary">#{value.rank}</Badge>}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {comparison.runs.find((r: any) => r.id === metric.winner)?.name.split(' ')[0]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Equity Curves */}
              <TabsContent value="equity">
                <Card>
                  <CardHeader>
                    <CardTitle>Equity Curve Comparison</CardTitle>
                    <CardDescription>
                      Portfolio value over time for each strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={comparison.equityCurveComparison}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis 
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          className="text-xs"
                        />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        {comparison.runs.map((run: any, idx: number) => (
                          <Line
                            key={run.id}
                            type="monotone"
                            dataKey={run.name}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Drawdowns */}
              <TabsContent value="drawdown">
                <Card>
                  <CardHeader>
                    <CardTitle>Drawdown Comparison</CardTitle>
                    <CardDescription>
                      Peak-to-trough decline over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={comparison.drawdownComparison}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis 
                          tickFormatter={(value) => `${value.toFixed(0)}%`}
                          className="text-xs"
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        {comparison.runs.map((run: any, idx: number) => (
                          <Line
                            key={run.id}
                            type="monotone"
                            dataKey={run.name}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Monthly Returns */}
              <TabsContent value="monthly">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Returns Comparison</CardTitle>
                    <CardDescription>
                      Month-by-month performance breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={comparison.monthlyComparison}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis 
                          tickFormatter={(value) => `${value.toFixed(0)}%`}
                          className="text-xs"
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        {comparison.runs.map((run: any, idx: number) => (
                          <Bar
                            key={run.id}
                            dataKey={run.name}
                            fill={COLORS[idx % COLORS.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Correlation Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Strategy Correlation Matrix</CardTitle>
                <CardDescription>
                  How correlated are the equity curves of different strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      {comparison.runs.map((run: any) => (
                        <TableHead key={run.id} className="text-center">{run.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.correlationMatrix.map((row: number[], i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{comparison.runs[i].name}</TableCell>
                        {row.map((corr: number, j: number) => (
                          <TableCell 
                            key={j} 
                            className="text-center"
                            style={{
                              backgroundColor: i === j 
                                ? 'transparent' 
                                : `rgba(59, 130, 246, ${Math.abs(corr) * 0.3})`,
                            }}
                          >
                            {corr.toFixed(2)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading State */}
        {comparisonLoading && selectedRuns.length >= 2 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
