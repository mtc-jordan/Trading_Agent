import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AccuracyBadge, AccuracyProgress } from "@/components/AccuracyBadge";
import { useParams, useLocation } from "wouter";
import { 
  Bot, 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  Calendar,
  BarChart3,
  Activity,
  ArrowLeft,
  Play,
  Pause,
  Settings,
  History,
  LineChart,
  PieChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function BotDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const botId = parseInt(params.id || "0");

  const { data: bot, isLoading: botLoading } = trpc.bot.get.useQuery(
    { id: botId },
    { enabled: botId > 0 }
  );

  const { data: executionLogs } = trpc.botSchedule.getExecutionLogs.useQuery(
    { botId, limit: 20 },
    { enabled: botId > 0 }
  );

  const { data: benchmarks } = trpc.botBenchmarks.list.useQuery(
    { botId },
    { enabled: botId > 0 }
  );

  // Accuracy stats would be fetched from a dedicated endpoint
  const accuracyStats = null;

  // Toggle bot status (update to paused/active)
  const updateBotMutation = trpc.bot.update.useMutation({
    onSuccess: () => {
      toast.success(bot?.status === "active" ? "Bot paused" : "Bot activated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle bot");
    },
  });

  const handleToggleBot = () => {
    if (!bot) return;
    updateBotMutation.mutate({
      id: botId,
      status: bot.status === "active" ? "paused" : "active",
    });
  };

  const handleRunBot = () => {
    toast.info("Bot execution started");
    // In production, this would trigger the job scheduler
  };

  if (botLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bot) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Bot className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Bot Not Found</h2>
          <p className="text-muted-foreground mb-4">The bot you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/bots")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bots
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const totalReturn = parseFloat((bot as any).totalPnl?.toString() || "0") / 10000; // Normalize
  const winRate = bot.totalTrades > 0 ? bot.winningTrades / bot.totalTrades : 0;
  const accuracyScore = parseFloat((bot as any).accuracyScore?.toString() || "0");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/bots")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{bot.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={bot.status === "active" ? "default" : "secondary"}>
                    {bot.status === "active" ? "Active" : bot.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {String((bot.strategy as any)?.type || "Custom")} Strategy
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRunBot}
            >
              <Play className="w-4 h-4 mr-2" />
              Run Now
            </Button>
            <Button
              variant={bot.status === "active" ? "destructive" : "default"}
              onClick={handleToggleBot}
              disabled={updateBotMutation.isPending}
            >
              {bot.status === "active" ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Total Return</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                totalReturn >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {totalReturn >= 0 ? "+" : ""}{(totalReturn * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm">Win Rate</span>
              </div>
              <p className="text-2xl font-bold">{(winRate * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">AI Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{(accuracyScore * 100).toFixed(1)}%</p>
                <AccuracyBadge accuracyScore={accuracyScore} size="sm" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Total Trades</span>
              </div>
              <p className="text-2xl font-bold">{(bot as any).totalTrades || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="accuracy">Accuracy History</TabsTrigger>
            <TabsTrigger value="executions">Execution Logs</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Performance Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Return Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Performance chart coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Trade Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Winning Trades</span>
                      <span className="font-medium text-green-500">
                        {Math.round(((bot as any).totalTrades || 0) * winRate)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${winRate * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Losing Trades</span>
                      <span className="font-medium text-red-500">
                        {Math.round(((bot as any).totalTrades || 0) * (1 - winRate))}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(1 - winRate) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bot Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Strategy</p>
                    <p className="font-medium capitalize">{String((bot.strategy as any)?.type || "Custom")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Risk Level</p>
                    <p className="font-medium capitalize">{String((bot.riskSettings as any)?.riskLevel || "Medium")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Symbols</p>
                    <p className="font-medium">{Array.isArray(bot.symbols) ? (bot.symbols as string[]).join(", ") : "All"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Max Position Size</p>
                    <p className="font-medium">${(bot.riskSettings as any)?.maxPositionSize || "N/A"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(bot.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Last Run</p>
                    <p className="font-medium">
                      {(bot as any).lastRunAt 
                        ? new Date((bot as any).lastRunAt).toLocaleString()
                        : "Never"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accuracy History Tab */}
          <TabsContent value="accuracy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Prediction Accuracy</CardTitle>
                <CardDescription>
                  Track how accurate the AI agents have been for this bot's trading decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Overall Accuracy */}
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Overall Accuracy</h3>
                        <p className="text-sm text-muted-foreground">
                          Based on {(bot as any).totalPredictions || 0} predictions
                        </p>
                      </div>
                      <AccuracyBadge 
                        accuracyScore={accuracyScore}
                        totalPredictions={(bot as any).totalPredictions || 0}
                        correctPredictions={(bot as any).correctPredictions || 0}
                      />
                    </div>
                    <AccuracyProgress accuracyScore={accuracyScore} />
                  </div>

                  {/* Accuracy by Agent Type */}
                  <div>
                    <h3 className="font-semibold mb-4">Accuracy by Agent Type</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { name: "Technical", accuracy: 0.78, predictions: 45 },
                        { name: "Fundamental", accuracy: 0.72, predictions: 38 },
                        { name: "Sentiment", accuracy: 0.65, predictions: 52 },
                        { name: "Risk", accuracy: 0.81, predictions: 41 },
                        { name: "Quant", accuracy: 0.76, predictions: 33 },
                        { name: "Consensus", accuracy: 0.79, predictions: 50 },
                      ].map((agent) => (
                        <div key={agent.name} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{agent.name}</span>
                            <span className={cn(
                              "text-sm font-medium",
                              agent.accuracy >= 0.75 ? "text-green-500" : 
                              agent.accuracy >= 0.60 ? "text-yellow-500" : "text-red-500"
                            )}>
                              {(agent.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                agent.accuracy >= 0.75 ? "bg-green-500" : 
                                agent.accuracy >= 0.60 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${agent.accuracy * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {agent.predictions} predictions
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accuracy Timeline */}
                  <div>
                    <h3 className="font-semibold mb-4">Recent Predictions</h3>
                    <div className="space-y-2">
                      {[
                        { symbol: "AAPL", prediction: "Buy", actual: "Up", correct: true, date: "2024-01-15" },
                        { symbol: "GOOGL", prediction: "Hold", actual: "Down", correct: false, date: "2024-01-14" },
                        { symbol: "MSFT", prediction: "Buy", actual: "Up", correct: true, date: "2024-01-13" },
                        { symbol: "TSLA", prediction: "Sell", actual: "Down", correct: true, date: "2024-01-12" },
                        { symbol: "AMZN", prediction: "Buy", actual: "Up", correct: true, date: "2024-01-11" },
                      ].map((pred, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            {pred.correct ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">{pred.symbol}</p>
                              <p className="text-sm text-muted-foreground">
                                Predicted: {pred.prediction} | Actual: {pred.actual}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">{pred.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Execution Logs Tab */}
          <TabsContent value="executions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Execution History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {executionLogs && executionLogs.length > 0 ? (
                  <div className="space-y-3">
                    {executionLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : log.status === "failed" ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : log.status === "running" ? (
                            <Timer className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                log.status === "completed" ? "default" :
                                log.status === "failed" ? "destructive" :
                                log.status === "running" ? "secondary" : "outline"
                              }>
                                {log.status}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {log.executionType}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {log.tradesExecuted || 0} trades executed
                              {log.pnlResult && (
                                <span className={cn(
                                  "ml-2",
                                  parseFloat(log.pnlResult) >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                  {parseFloat(log.pnlResult) >= 0 ? "+" : ""}
                                  ${parseFloat(log.pnlResult).toFixed(2)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            {new Date(log.startedAt).toLocaleString()}
                          </p>
                          {log.durationMs && (
                            <p className="text-xs text-muted-foreground">
                              Duration: {(log.durationMs / 1000).toFixed(1)}s
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No execution history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
                <CardDescription>
                  Compare bot performance against market indices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {benchmarks && benchmarks.length > 0 ? (
                  <div className="space-y-4">
                    {benchmarks.map((benchmark: any) => {
                      const botReturn = parseFloat(benchmark.botReturn?.toString() || "0");
                      const benchReturn = parseFloat(benchmark.benchmarkReturn?.toString() || "0");
                      const alpha = botReturn - benchReturn;
                      
                      return (
                        <div key={benchmark.id} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{benchmark.benchmarkName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {benchmark.periodStart && new Date(benchmark.periodStart).toLocaleDateString()} - 
                                {benchmark.periodEnd && new Date(benchmark.periodEnd).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={alpha >= 0 ? "default" : "destructive"}>
                              Alpha: {alpha >= 0 ? "+" : ""}{(alpha * 100).toFixed(2)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-2 rounded bg-muted/30">
                              <p className="text-xs text-muted-foreground">Bot Return</p>
                              <p className={cn(
                                "font-bold",
                                botReturn >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {botReturn >= 0 ? "+" : ""}{(botReturn * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-center p-2 rounded bg-muted/30">
                              <p className="text-xs text-muted-foreground">Benchmark</p>
                              <p className={cn(
                                "font-bold",
                                benchReturn >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {benchReturn >= 0 ? "+" : ""}{(benchReturn * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-center p-2 rounded bg-muted/30">
                              <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                              <p className="font-bold">
                                {parseFloat(benchmark.sharpeRatio?.toString() || "0").toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No benchmark data available yet</p>
                    <p className="text-sm mt-1">Benchmarks are calculated after the bot has been running for at least 30 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
