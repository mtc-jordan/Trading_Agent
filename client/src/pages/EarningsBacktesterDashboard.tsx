import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  Play,
  RefreshCw,
  Calendar,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  LineChart,
} from "lucide-react";

// Correlation heatmap cell component
function CorrelationCell({ value, pValue }: { value: number; pValue: number }) {
  const getColor = (corr: number) => {
    if (corr >= 0.4) return "bg-green-500/80";
    if (corr >= 0.2) return "bg-green-500/50";
    if (corr >= 0) return "bg-green-500/20";
    if (corr >= -0.2) return "bg-red-500/20";
    if (corr >= -0.4) return "bg-red-500/50";
    return "bg-red-500/80";
  };

  const isSignificant = pValue < 0.05;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`w-16 h-10 flex items-center justify-center rounded text-xs font-mono ${getColor(value)} ${isSignificant ? "ring-2 ring-yellow-400" : ""}`}
          >
            {value.toFixed(2)}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Correlation: {value.toFixed(4)}</p>
          <p>P-value: {pValue.toFixed(4)}</p>
          <p>{isSignificant ? "Statistically Significant" : "Not Significant"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Signal direction icon
function SignalIcon({ sentiment }: { sentiment: number }) {
  if (sentiment >= 0.6) {
    return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  }
  if (sentiment <= 0.4) {
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  }
  return <Minus className="h-4 w-4 text-yellow-500" />;
}

// Return badge with color
function ReturnBadge({ value }: { value: number }) {
  const color = value >= 0 ? "text-green-500" : "text-red-500";
  const bg = value >= 0 ? "bg-green-500/10" : "bg-red-500/10";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${color} ${bg}`}>
      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export default function EarningsBacktestDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState("3d");
  const [symbolInput, setSymbolInput] = useState("AAPL,MSFT,GOOGL,NVDA,META");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [isRunning, setIsRunning] = useState(false);

  // Fetch demo results
  const { data: results, isLoading: loadingDemo } = trpc.earningsBacktest.getDemoResults.useQuery();

  const handleRunBacktest = () => {
    setIsRunning(true);
    // Simulate backtest running
    setTimeout(() => {
      setIsRunning(false);
    }, 2000);
  };

  if (loadingDemo) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-green-500" />
            Earnings Sentiment Backtesting
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze historical correlation between earnings call sentiment and stock price movements
          </p>
        </div>
        <Badge variant="outline" className="text-green-500 border-green-500">
          <Brain className="h-3 w-3 mr-1" />
          AI-Powered Analysis
        </Badge>
      </div>

      {/* Configuration Panel */}
      <Card className="border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Backtest Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols (comma-separated)</Label>
              <Input
                id="symbols"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="AAPL,MSFT,GOOGL"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRunBacktest}
                disabled={isRunning}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Earnings Events</p>
                <p className="text-2xl font-bold text-green-500">{results.summary.totalEarningsEvents}</p>
              </div>
              <Hash className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Symbols Analyzed</p>
                <p className="text-2xl font-bold text-blue-500">{results.summary.symbolsAnalyzed}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overall Correlation</p>
                <p className="text-2xl font-bold text-purple-500">{results.summary.overallCorrelation.toFixed(2)}</p>
              </div>
              <LineChart className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Best Timeframe</p>
                <p className="text-2xl font-bold text-yellow-500">{results.summary.bestTimeframe}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Prediction Accuracy</p>
                <p className="text-2xl font-bold text-emerald-500">{(results.summary.predictionAccuracy * 100).toFixed(0)}%</p>
              </div>
              <Target className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Date Range</p>
                <p className="text-sm font-medium text-orange-500">
                  {results.summary.dateRange.start.slice(0, 7)} to {results.summary.dateRange.end.slice(0, 7)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
          <TabsTrigger value="signals">Signal Analysis</TabsTrigger>
          <TabsTrigger value="results">Sample Results</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Predictors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Top Predictive Factors
                </CardTitle>
                <CardDescription>
                  Sentiment factors ranked by correlation strength with price movements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.topPredictors.map((predictor, idx) => (
                    <div key={predictor.factor} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">
                            {predictor.factor.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <Badge
                            variant={predictor.significance === 'high' ? 'default' : 'secondary'}
                            className={predictor.significance === 'high' ? 'bg-green-500' : ''}
                          >
                            {predictor.significance}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.abs(predictor.correlation) * 100} className="h-2 flex-1" />
                          <span className="text-xs font-mono text-muted-foreground w-12">
                            r={predictor.correlation.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Signal Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Signal Performance
                </CardTitle>
                <CardDescription>
                  Trading signal accuracy based on sentiment classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Bullish Signals */}
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Bullish Signals</span>
                      </div>
                      <Badge className="bg-green-500">{results.signalPerformance.bullishSignals.count}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-2 font-mono text-green-500">
                          {(results.signalPerformance.bullishSignals.accuracy * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Return:</span>
                        <span className="ml-2 font-mono text-green-500">
                          +{results.signalPerformance.bullishSignals.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bearish Signals */}
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        <span className="font-medium">Bearish Signals</span>
                      </div>
                      <Badge variant="destructive">{results.signalPerformance.bearishSignals.count}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-2 font-mono text-red-500">
                          {(results.signalPerformance.bearishSignals.accuracy * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Return:</span>
                        <span className="ml-2 font-mono text-red-500">
                          {results.signalPerformance.bearishSignals.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Neutral Signals */}
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Minus className="h-5 w-5 text-yellow-500" />
                        <span className="font-medium">Neutral Signals</span>
                      </div>
                      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                        {results.signalPerformance.neutralSignals.count}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-2 font-mono text-yellow-500">
                          {(results.signalPerformance.neutralSignals.accuracy * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Return:</span>
                        <span className="ml-2 font-mono text-yellow-500">
                          +{results.signalPerformance.neutralSignals.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Correlation Matrix Tab */}
        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Sentiment-Price Correlation Matrix
              </CardTitle>
              <CardDescription>
                Pearson correlation coefficients between sentiment factors and price returns across timeframes.
                Yellow border indicates statistical significance (p &lt; 0.05).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground">Factor</th>
                      {results.correlationMatrix.timeframes.map((tf) => (
                        <th key={tf} className="text-center p-2 text-sm font-medium text-muted-foreground">
                          {tf}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.correlationMatrix.factors.map((factor, i) => (
                      <tr key={factor}>
                        <td className="p-2 text-sm font-medium capitalize">
                          {factor.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        {results.correlationMatrix.correlations[i].map((corr, j) => (
                          <td key={j} className="p-2">
                            <CorrelationCell
                              value={corr}
                              pValue={results.correlationMatrix.pValues[i][j]}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>Correlation Strength:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-500/80" />
                  <span>Strong +</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-500/50" />
                  <span>Moderate +</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-500/20" />
                  <span>Weak +</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-500/20" />
                  <span>Weak -</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-500/50" />
                  <span>Moderate -</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded ring-2 ring-yellow-400" />
                  <span>Significant</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Timeframe Selector */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Signal Analysis by Timeframe</CardTitle>
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="3d">3 Days</SelectItem>
                      <SelectItem value="5d">5 Days</SelectItem>
                      <SelectItem value="10d">10 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {/* Bullish Analysis */}
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                  <TrendingUp className="h-5 w-5" />
                  Bullish Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-500">
                      {(results.signalPerformance.bullishSignals.accuracy * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Signals</div>
                      <div className="font-mono">{results.signalPerformance.bullishSignals.count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Return</div>
                      <div className="font-mono text-green-500">
                        +{results.signalPerformance.bullishSignals.avgReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded bg-green-500/10 text-xs">
                    <Info className="h-3 w-3 inline mr-1" />
                    Sentiment score &gt; 0.6 triggers bullish signal
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bearish Analysis */}
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                  <TrendingDown className="h-5 w-5" />
                  Bearish Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-500">
                      {(results.signalPerformance.bearishSignals.accuracy * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Signals</div>
                      <div className="font-mono">{results.signalPerformance.bearishSignals.count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Return</div>
                      <div className="font-mono text-red-500">
                        {results.signalPerformance.bearishSignals.avgReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded bg-red-500/10 text-xs">
                    <Info className="h-3 w-3 inline mr-1" />
                    Sentiment score &lt; 0.4 triggers bearish signal
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Neutral Analysis */}
            <Card className="border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
                  <Minus className="h-5 w-5" />
                  Neutral Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-500">
                      {(results.signalPerformance.neutralSignals.accuracy * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Signals</div>
                      <div className="font-mono">{results.signalPerformance.neutralSignals.count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Return</div>
                      <div className="font-mono text-yellow-500">
                        +{results.signalPerformance.neutralSignals.avgReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded bg-yellow-500/10 text-xs">
                    <Info className="h-3 w-3 inline mr-1" />
                    Sentiment score 0.4-0.6 triggers neutral signal
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sample Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Sample Backtest Results
              </CardTitle>
              <CardDescription>
                Individual earnings events with sentiment scores and subsequent price movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead className="text-right">1-Day</TableHead>
                    <TableHead className="text-right">3-Day</TableHead>
                    <TableHead className="text-right">5-Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.sampleResults.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{result.symbol}</TableCell>
                      <TableCell className="text-muted-foreground">{result.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={result.sentiment * 100} className="w-16 h-2" />
                          <span className="text-xs font-mono">{(result.sentiment * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <SignalIcon sentiment={result.sentiment} />
                          <span className="text-xs">
                            {result.sentiment >= 0.6 ? 'Bullish' : result.sentiment <= 0.4 ? 'Bearish' : 'Neutral'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ReturnBadge value={result.return1d} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ReturnBadge value={result.return3d} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ReturnBadge value={result.return5d} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI-Generated Insights
              </CardTitle>
              <CardDescription>
                Key findings and recommendations from the backtesting analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    </div>
                    <p className="text-sm leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-green-500" />
                  Trading Recommendations
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Focus on guidance strength as the primary sentiment indicator
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Use 3-day holding period for optimal correlation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Combine with technical analysis for confirmation
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Bearish signals have lower accuracy - use with caution
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
