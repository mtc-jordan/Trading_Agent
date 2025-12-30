import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  GitCompare, TrendingUp, TrendingDown, Award, AlertTriangle,
  RefreshCw, Trash2, BarChart3, Target
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function BacktestComparison() {
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  
  // Fetch backtest runs
  const { data: runs, isLoading: runsLoading, refetch: refetchRuns } = 
    trpc.broker.getBacktestRuns.useQuery();
  
  // Compare selected runs
  const { data: comparison, isLoading: comparisonLoading } = 
    trpc.broker.compareBacktestResults.useQuery(
      { backtestIds: selectedRuns },
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

  // Prepare radar chart data
  const radarData = comparison?.comparison ? [
    { metric: 'Return', ...Object.fromEntries(comparison.comparison.map(r => [r.strategyName, Math.min(r.totalReturn / 50 * 100, 100)])) },
    { metric: 'Sharpe', ...Object.fromEntries(comparison.comparison.map(r => [r.strategyName, Math.min(r.sharpeRatio / 3 * 100, 100)])) },
    { metric: 'Win Rate', ...Object.fromEntries(comparison.comparison.map(r => [r.strategyName, r.winRate])) },
    { metric: 'Profit Factor', ...Object.fromEntries(comparison.comparison.map(r => [r.strategyName, Math.min(r.profitFactor / 3 * 100, 100)])) },
    { metric: 'Low Drawdown', ...Object.fromEntries(comparison.comparison.map(r => [r.strategyName, 100 - r.maxDrawdown])) },
  ] : [];

  // Prepare bar chart data
  const barData = comparison?.comparison?.map(r => ({
    name: r.strategyName.substring(0, 15),
    'Total Return': r.totalReturn,
    'Sharpe Ratio': r.sharpeRatio * 10,
    'Win Rate': r.winRate,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GitCompare className="w-8 h-8 text-primary" />
              Backtest Comparison
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare multiple backtest results side by side
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchRuns()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRuns([])}
              disabled={selectedRuns.length === 0}
            >
              Clear Selection
            </Button>
          </div>
        </div>

        {/* Run Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Runs to Compare</CardTitle>
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
              <div className="grid gap-3">
                {runs.map((run: any) => (
                  <div 
                    key={run.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      selectedRuns.includes(run.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedRuns.includes(run.id)}
                        onCheckedChange={() => toggleRunSelection(run.id)}
                      />
                      {selectedRuns.includes(run.id) && (
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getRunColor(run.id) }}
                        />
                      )}
                      <div>
                        <div className="font-medium">{run.strategyName || run.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {run.symbol} • {new Date(run.startDate || run.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-medium ${(run.totalReturn || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(run.totalReturn || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sharpe: {formatNumber(run.sharpeRatio || 0)}
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
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No backtest runs found</p>
                <p className="text-sm mt-1">Run some backtests first to compare them</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {selectedRuns.length >= 2 && (
          <>
            {comparisonLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : comparison ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-green-500/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-green-500 mb-2">
                        <Award className="w-5 h-5" />
                        <span className="text-sm">Best Overall</span>
                      </div>
                      <div className="font-semibold">
                        {comparison.comparison.find(r => r.id === comparison.bestOverall)?.strategyName || 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-500/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-blue-500 mb-2">
                        <Target className="w-5 h-5" />
                        <span className="text-sm">Best Risk-Adjusted</span>
                      </div>
                      <div className="font-semibold">
                        {comparison.comparison.find(r => r.id === comparison.bestRiskAdjusted)?.strategyName || 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-500/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-yellow-500 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm">Highest Win Rate</span>
                      </div>
                      <div className="font-semibold">
                        {comparison.comparison.find(r => r.id === comparison.bestWinRate)?.strategyName || 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Comparison */}
                <Tabs defaultValue="table" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="table">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Table View
                    </TabsTrigger>
                    <TabsTrigger value="radar">
                      <Target className="w-4 h-4 mr-2" />
                      Radar Chart
                    </TabsTrigger>
                    <TabsTrigger value="bar">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Bar Chart
                    </TabsTrigger>
                  </TabsList>

                  {/* Table Comparison */}
                  <TabsContent value="table">
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
                              <TableHead>Strategy</TableHead>
                              <TableHead className="text-right">Total Return</TableHead>
                              <TableHead className="text-right">Sharpe Ratio</TableHead>
                              <TableHead className="text-right">Max Drawdown</TableHead>
                              <TableHead className="text-right">Win Rate</TableHead>
                              <TableHead className="text-right">Profit Factor</TableHead>
                              <TableHead className="text-right">Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparison.comparison.map((run, idx) => (
                              <TableRow key={run.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    />
                                    {run.strategyName}
                                    {run.id === comparison.bestOverall && (
                                      <Badge variant="default" className="ml-2">Best</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className={`text-right ${run.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatPercent(run.totalReturn)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(run.sharpeRatio)}
                                </TableCell>
                                <TableCell className="text-right text-red-500">
                                  -{formatNumber(run.maxDrawdown)}%
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(run.winRate)}%
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(run.profitFactor)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatNumber(run.score)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Radar Chart */}
                  <TabsContent value="radar">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Radar</CardTitle>
                        <CardDescription>
                          Visual comparison across multiple dimensions
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="metric" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              {comparison.comparison.map((run, idx) => (
                                <Radar
                                  key={run.id}
                                  name={run.strategyName}
                                  dataKey={run.strategyName}
                                  stroke={COLORS[idx % COLORS.length]}
                                  fill={COLORS[idx % COLORS.length]}
                                  fillOpacity={0.2}
                                />
                              ))}
                              <Legend />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Bar Chart */}
                  <TabsContent value="bar">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Bars</CardTitle>
                        <CardDescription>
                          Comparison of key metrics across strategies
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="Total Return" fill="#3b82f6" />
                              <Bar dataKey="Sharpe Ratio" fill="#10b981" />
                              <Bar dataKey="Win Rate" fill="#f59e0b" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </>
        )}

        {/* Selection Hint */}
        {selectedRuns.length === 1 && (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Select at least one more run to compare
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
