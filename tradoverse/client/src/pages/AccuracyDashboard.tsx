import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Clock, 
  Award,
  Brain,
  Activity
} from "lucide-react";

export default function AccuracyDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1day" | "7day" | "30day">("7day");
  
  const { data: accuracyStats, isLoading } = trpc.accuracy.getStats.useQuery();
  const { data: accuracyRecords } = trpc.accuracy.getRecords.useQuery({
    timeframe: selectedTimeframe,
    limit: 50,
  });

  const agentIcons: Record<string, React.ReactNode> = {
    technical: <BarChart3 className="h-4 w-4" />,
    fundamental: <TrendingUp className="h-4 w-4" />,
    sentiment: <Activity className="h-4 w-4" />,
    risk: <Target className="h-4 w-4" />,
    microstructure: <Clock className="h-4 w-4" />,
    macro: <TrendingDown className="h-4 w-4" />,
    quant: <Brain className="h-4 w-4" />,
    consensus: <Award className="h-4 w-4" />,
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-500";
    if (accuracy >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 90) return { label: "Expert", variant: "default" as const };
    if (accuracy >= 80) return { label: "Advanced", variant: "secondary" as const };
    if (accuracy >= 70) return { label: "Proficient", variant: "outline" as const };
    if (accuracy >= 60) return { label: "Developing", variant: "outline" as const };
    return { label: "Learning", variant: "destructive" as const };
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Prediction Accuracy</h1>
        <p className="text-muted-foreground">
          Track the accuracy of AI agent predictions and monitor performance over time
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getAccuracyColor(accuracyStats?.overall.accuracy || 0)}`}>
                {accuracyStats?.overall.accuracy || 0}%
              </span>
              <Badge {...getAccuracyBadge(accuracyStats?.overall.accuracy || 0)}>
                {getAccuracyBadge(accuracyStats?.overall.accuracy || 0).label}
              </Badge>
            </div>
            <Progress 
              value={accuracyStats?.overall.accuracy || 0} 
              className="mt-3" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {accuracyStats?.overall.correct || 0} correct out of {accuracyStats?.overall.total || 0} predictions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{accuracyStats?.overall.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Across all agents and timeframes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performing Agent</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {accuracyStats?.byAgent && Object.keys(accuracyStats.byAgent).length > 0 ? (
              <>
                <div className="text-xl font-bold capitalize">
                  {Object.entries(accuracyStats.byAgent)
                    .sort((a, b) => b[1].accuracy - a[1].accuracy)[0]?.[0] || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Object.entries(accuracyStats.byAgent)
                    .sort((a, b) => b[1].accuracy - a[1].accuracy)[0]?.[1].accuracy || 0}% accuracy
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">By Agent</TabsTrigger>
          <TabsTrigger value="timeframe">By Timeframe</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accuracyStats?.byAgent && Object.entries(accuracyStats.byAgent).map(([agent, stats]) => (
              <Card key={agent}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {agentIcons[agent]}
                    <CardTitle className="text-sm font-medium capitalize">{agent}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
                    {stats.accuracy}%
                  </div>
                  <Progress value={stats.accuracy} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.correct}/{stats.total} correct
                  </p>
                </CardContent>
              </Card>
            ))}
            {(!accuracyStats?.byAgent || Object.keys(accuracyStats.byAgent).length === 0) && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No agent accuracy data available yet. Run some analyses to start tracking accuracy.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeframe" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accuracyStats?.byTimeframe && Object.entries(accuracyStats.byTimeframe).map(([timeframe, stats]) => (
              <Card key={timeframe}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {timeframe === "1day" ? "1 Day" : timeframe === "7day" ? "7 Days" : "30 Days"}
                  </CardTitle>
                  <CardDescription>
                    Prediction accuracy for {timeframe === "1day" ? "next day" : timeframe === "7day" ? "next week" : "next month"} forecasts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
                    {stats.accuracy}%
                  </div>
                  <Progress value={stats.accuracy} className="mt-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{stats.correct} correct</span>
                    <span>{stats.total} total</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!accuracyStats?.byTimeframe || Object.keys(accuracyStats.byTimeframe).length === 0) && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No timeframe accuracy data available yet.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy Records</CardTitle>
              <CardDescription>
                Historical accuracy data by period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accuracyRecords && accuracyRecords.length > 0 ? (
                <div className="space-y-4">
                  {accuracyRecords.map((record) => (
                    <div 
                      key={record.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {record.agentType && agentIcons[record.agentType]}
                          <span className="font-medium capitalize">
                            {record.agentType || "Overall"}
                          </span>
                        </div>
                        {record.symbol && (
                          <Badge variant="outline">{record.symbol}</Badge>
                        )}
                        <Badge variant="secondary">{record.timeframe}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-bold ${getAccuracyColor(Number(record.accuracyRate) * 100 || 0)}`}>
                            {((Number(record.accuracyRate) || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.correctPredictions}/{record.totalPredictions}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No accuracy records yet. Predictions will be tracked automatically.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">How Accuracy is Calculated</h3>
              <p className="text-sm text-muted-foreground">
                Prediction accuracy is measured by comparing AI recommendations (Buy, Sell, Hold) 
                against actual price movements over the specified timeframe. A prediction is considered 
                correct if the price moved in the recommended direction by at least 1% within the timeframe.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
