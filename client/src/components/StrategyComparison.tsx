import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { 
  GitCompare, Trophy, TrendingUp, TrendingDown, Activity, 
  CheckCircle, XCircle, Scale, BarChart3
} from "lucide-react";

interface ComparisonResult {
  id?: number;
  results: Record<string, {
    metrics: {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
      totalTrades: number;
      profitFactor: number;
      annualizedReturn: number;
      sortinoRatio: number;
    };
    equityCurve: Array<{ date: string; value: number }>;
    analysisAccuracy: {
      accuracyRate: number;
      totalPredictions: number;
      correctPredictions: number;
    };
  }>;
  winner: string;
  summary: {
    symbol: string;
    period: string;
    strategies: string[];
    metrics: Record<string, {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
      totalTrades: number;
    }>;
  };
}

const STRATEGY_COLORS: Record<string, string> = {
  standard: '#3b82f6',
  enhanced: '#10b981',
  rl: '#8b5cf6',
};

const STRATEGY_LABELS: Record<string, string> = {
  standard: 'Standard Analysis',
  enhanced: 'Enhanced Analysis',
  rl: 'RL Agent',
};

export function StrategyComparison() {
  const [symbol, setSymbol] = useState("AAPL");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(["standard", "enhanced"]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const runComparison = trpc.strategyComparison.compare.useMutation({
    onSuccess: (data) => {
      setResult(data as ComparisonResult);
    },
  });

  const comparisonHistory = trpc.strategyComparison.list.useQuery({ limit: 10 });

  const handleStrategyToggle = (strategy: string) => {
    setSelectedStrategies(prev => {
      if (prev.includes(strategy)) {
        return prev.filter(s => s !== strategy);
      }
      return [...prev, strategy];
    });
  };

  const handleRunComparison = () => {
    if (selectedStrategies.length < 2) {
      alert("Please select at least 2 strategies to compare");
      return;
    }
    runComparison.mutate({
      symbol,
      startDate,
      endDate,
      initialCapital,
      strategies: selectedStrategies as ("standard" | "enhanced" | "rl")[],
    });
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toFixed(2);

  // Prepare radar chart data
  const getRadarData = () => {
    if (!result) return [];
    
    const metrics = ['Return', 'Sharpe', 'Win Rate', 'Profit Factor', 'Accuracy'];
    
    return metrics.map(metric => {
      const dataPoint: Record<string, string | number> = { metric };
      
      Object.entries(result.results).forEach(([strategy, data]) => {
        let value = 0;
        switch (metric) {
          case 'Return':
            value = Math.min(100, Math.max(0, (data.metrics.totalReturn + 0.5) * 100));
            break;
          case 'Sharpe':
            value = Math.min(100, Math.max(0, data.metrics.sharpeRatio * 33));
            break;
          case 'Win Rate':
            value = data.metrics.winRate * 100;
            break;
          case 'Profit Factor':
            value = Math.min(100, Math.max(0, data.metrics.profitFactor * 25));
            break;
          case 'Accuracy':
            value = data.analysisAccuracy.accuracyRate * 100;
            break;
        }
        dataPoint[strategy] = value;
      });
      
      return dataPoint;
    });
  };

  // Prepare equity curve comparison data
  const getEquityCurveData = () => {
    if (!result) return [];
    
    const allDates = new Set<string>();
    Object.values(result.results).forEach(data => {
      data.equityCurve.forEach(point => allDates.add(point.date));
    });
    
    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      const dataPoint: Record<string, string | number> = { date };
      
      Object.entries(result.results).forEach(([strategy, data]) => {
        const point = data.equityCurve.find(p => p.date === date);
        if (point) {
          dataPoint[strategy] = point.value;
        }
      });
      
      return dataPoint;
    });
  };

  // Prepare bar chart comparison data
  const getMetricComparisonData = () => {
    if (!result) return [];
    
    return [
      {
        metric: 'Total Return',
        ...Object.fromEntries(
          Object.entries(result.results).map(([s, d]) => [s, d.metrics.totalReturn * 100])
        ),
      },
      {
        metric: 'Sharpe Ratio',
        ...Object.fromEntries(
          Object.entries(result.results).map(([s, d]) => [s, d.metrics.sharpeRatio])
        ),
      },
      {
        metric: 'Win Rate',
        ...Object.fromEntries(
          Object.entries(result.results).map(([s, d]) => [s, d.metrics.winRate * 100])
        ),
      },
      {
        metric: 'Max Drawdown',
        ...Object.fromEntries(
          Object.entries(result.results).map(([s, d]) => [s, d.metrics.maxDrawdown * 100])
        ),
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Strategy Comparison
          </CardTitle>
          <CardDescription>
            Compare different analysis strategies side-by-side to find the best performer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
          </div>

          <div className="space-y-2 mb-4">
            <Label>Strategies to Compare (select at least 2)</Label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(STRATEGY_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedStrategies.includes(key)}
                    onCheckedChange={() => handleStrategyToggle(key)}
                  />
                  <label
                    htmlFor={key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleRunComparison}
            disabled={runComparison.isPending || selectedStrategies.length < 2}
          >
            {runComparison.isPending ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Running Comparison...
              </>
            ) : (
              <>
                <Scale className="h-4 w-4 mr-2" />
                Compare Strategies
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Winner Banner */}
          <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Trophy className="h-10 w-10 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Winner</p>
                    <p className="text-2xl font-bold">{STRATEGY_LABELS[result.winner]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Best Sharpe Ratio</p>
                  <p className="text-xl font-bold">
                    {formatNumber(result.results[result.winner]?.metrics.sharpeRatio || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="equity">Equity Curves</TabsTrigger>
              <TabsTrigger value="radar">Radar Chart</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(result.results).map(([strategy, data]) => (
                  <Card key={strategy} className={strategy === result.winner ? 'ring-2 ring-yellow-500' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: STRATEGY_COLORS[strategy] }}
                          />
                          {STRATEGY_LABELS[strategy]}
                        </CardTitle>
                        {strategy === result.winner && (
                          <Badge className="bg-yellow-500">Winner</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Return</span>
                        <span className={`font-bold ${data.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(data.metrics.totalReturn)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                        <span className="font-bold">{formatNumber(data.metrics.sharpeRatio)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Win Rate</span>
                        <span className="font-bold">{formatPercent(data.metrics.winRate)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Max Drawdown</span>
                        <span className="font-bold text-red-500">{formatPercent(data.metrics.maxDrawdown)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Accuracy</span>
                        <span className="font-bold">{formatPercent(data.analysisAccuracy.accuracyRate)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Trades</span>
                        <span className="font-bold">{data.metrics.totalTrades}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Metric Comparison Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metric Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getMetricComparisonData()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="metric" type="category" width={100} />
                        <Tooltip />
                        <Legend />
                        {Object.keys(result.results).map((strategy) => (
                          <Bar 
                            key={strategy}
                            dataKey={strategy} 
                            name={STRATEGY_LABELS[strategy]}
                            fill={STRATEGY_COLORS[strategy]} 
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Equity Curves Tab */}
            <TabsContent value="equity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Equity Curve Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getEquityCurveData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            formatCurrency(value), 
                            STRATEGY_LABELS[name] || name
                          ]}
                        />
                        <Legend formatter={(value) => STRATEGY_LABELS[value] || value} />
                        {Object.keys(result.results).map((strategy) => (
                          <Line 
                            key={strategy}
                            type="monotone" 
                            dataKey={strategy} 
                            stroke={STRATEGY_COLORS[strategy]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Radar Chart Tab */}
            <TabsContent value="radar">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Radar</CardTitle>
                  <CardDescription>
                    Multi-dimensional comparison of strategy performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getRadarData()}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        {Object.keys(result.results).map((strategy) => (
                          <Radar 
                            key={strategy}
                            name={STRATEGY_LABELS[strategy]}
                            dataKey={strategy}
                            stroke={STRATEGY_COLORS[strategy]}
                            fill={STRATEGY_COLORS[strategy]}
                            fillOpacity={0.3}
                          />
                        ))}
                        <Legend formatter={(value) => STRATEGY_LABELS[value] || value} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Metric</th>
                          {Object.keys(result.results).map(strategy => (
                            <th key={strategy} className="text-right p-3">
                              <div className="flex items-center justify-end gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: STRATEGY_COLORS[strategy] }}
                                />
                                {STRATEGY_LABELS[strategy]}
                                {strategy === result.winner && (
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Total Return</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className={`text-right p-3 font-bold ${data.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercent(data.metrics.totalReturn)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Annualized Return</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className={`text-right p-3 ${data.metrics.annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercent(data.metrics.annualizedReturn)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Sharpe Ratio</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {formatNumber(data.metrics.sharpeRatio)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Sortino Ratio</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {formatNumber(data.metrics.sortinoRatio)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Max Drawdown</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3 text-red-500">
                              {formatPercent(data.metrics.maxDrawdown)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Win Rate</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {formatPercent(data.metrics.winRate)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Profit Factor</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {formatNumber(data.metrics.profitFactor)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Total Trades</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {data.metrics.totalTrades}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Prediction Accuracy</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {formatPercent(data.analysisAccuracy.accuracyRate)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Correct Predictions</td>
                          {Object.entries(result.results).map(([strategy, data]) => (
                            <td key={strategy} className="text-right p-3">
                              {data.analysisAccuracy.correctPredictions} / {data.analysisAccuracy.totalPredictions}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* History */}
      {comparisonHistory.data && comparisonHistory.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Comparisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparisonHistory.data.slice(0, 5).map((comp: any) => (
                <div key={comp.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium">{comp.symbol}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {new Date(comp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-yellow-500">
                      <Trophy className="h-3 w-3 mr-1" />
                      {STRATEGY_LABELS[comp.winner] || comp.winner}
                    </Badge>
                    <Badge variant={comp.status === 'completed' ? 'default' : 'secondary'}>
                      {comp.status}
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
