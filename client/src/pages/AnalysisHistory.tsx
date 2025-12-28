import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Minus,
  BarChart3,
  Brain,
  Target,
  Shield,
  Activity,
  Globe,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Clock,
  Percent,
  X,
  RefreshCw,
  FileText
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

// Agent icons mapping
const agentIcons: Record<string, React.ReactNode> = {
  technical: <BarChart3 className="h-4 w-4" />,
  fundamental: <FileText className="h-4 w-4" />,
  sentiment: <Brain className="h-4 w-4" />,
  risk: <Shield className="h-4 w-4" />,
  microstructure: <Activity className="h-4 w-4" />,
  macro: <Globe className="h-4 w-4" />,
  quant: <Calculator className="h-4 w-4" />,
};

// Action colors
const actionColors: Record<string, { bg: string; text: string; border: string }> = {
  strong_buy: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50" },
  buy: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50" },
  hold: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
  sell: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/50" },
  strong_sell: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50" },
};

// Chart colors
const CHART_COLORS = ["#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444"];

export default function AnalysisHistory() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Filter states
  const [symbol, setSymbol] = useState<string>("");
  const [consensusAction, setConsensusAction] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minConfidence, setMinConfidence] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const pageSize = 20;

  // Fetch filtered history
  const { data: historyData, isLoading: historyLoading, refetch } = trpc.agent.getFilteredHistory.useQuery({
    symbol: symbol || undefined,
    consensusAction: consensusAction !== "all" ? consensusAction as any : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
    limit: pageSize,
    offset: page * pageSize,
  }, {
    enabled: isAuthenticated,
  });

  // Fetch stats
  const { data: stats } = trpc.agent.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch unique symbols for filter dropdown
  const { data: uniqueSymbols } = trpc.agent.getUniqueSymbols.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch single analysis details
  const { data: analysisDetails, isLoading: detailsLoading } = trpc.agent.getById.useQuery(
    { id: selectedAnalysis?.id },
    { enabled: !!selectedAnalysis?.id }
  );

  // Calculate pagination
  const totalPages = historyData ? Math.ceil(historyData.total / pageSize) : 0;

  // Prepare chart data
  const actionChartData = useMemo(() => {
    if (!stats?.byAction) return [];
    return stats.byAction.map((item: any, index: number) => ({
      name: item.action?.replace("_", " ").toUpperCase() || "Unknown",
      value: item.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [stats]);

  const symbolChartData = useMemo(() => {
    if (!stats?.bySymbol) return [];
    return stats.bySymbol.slice(0, 5).map((item: any) => ({
      symbol: item.symbol,
      count: item.count,
    }));
  }, [stats]);

  // Reset filters
  const resetFilters = () => {
    setSymbol("");
    setConsensusAction("all");
    setStartDate("");
    setEndDate("");
    setMinConfidence("");
    setPage(0);
  };

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes("buy")) return <TrendingUp className="h-4 w-4" />;
    if (action.includes("sell")) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!historyData?.analyses) return;
    
    const headers = ["Date", "Symbol", "Action", "Confidence", "Consensus Score", "Technical", "Fundamental", "Sentiment", "Risk", "Microstructure", "Macro", "Quant"];
    const rows = historyData.analyses.map((a: any) => [
      formatDate(a.createdAt),
      a.symbol,
      a.consensusAction,
      a.confidence,
      a.consensusScore,
      a.technicalScore,
      a.fundamentalScore,
      a.sentimentScore,
      a.riskScore,
      a.microstructureScore,
      a.macroScore,
      a.quantScore,
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analysis-history-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your analysis history</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Analysis History</h1>
              <p className="text-sm text-muted-foreground">Review past AI trading recommendations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Analyses</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats?.totalAnalyses || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Symbols</p>
                  <p className="text-3xl font-bold text-blue-400">{uniqueSymbols?.length || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {stats?.avgConfidence ? `${(Number(stats.avgConfidence) * 100).toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Percent className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Page</p>
                  <p className="text-3xl font-bold text-amber-400">{historyData?.analyses?.length || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendation Distribution</CardTitle>
              <CardDescription>Breakdown of AI recommendations by action type</CardDescription>
            </CardHeader>
            <CardContent>
              {actionChartData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={actionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {actionChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Symbols */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Analyzed Symbols</CardTitle>
              <CardDescription>Most frequently analyzed stocks</CardDescription>
            </CardHeader>
            <CardContent>
              {symbolChartData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={symbolChartData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="symbol" width={60} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Symbol Filter */}
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Select value={symbol} onValueChange={(v) => { setSymbol(v === "all" ? "" : v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Symbols" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Symbols</SelectItem>
                    {uniqueSymbols?.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div className="space-y-2">
                <Label>Recommendation</Label>
                <Select value={consensusAction} onValueChange={(v) => { setConsensusAction(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="strong_buy">Strong Buy</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="strong_sell">Strong Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                />
              </div>

              {/* Min Confidence */}
              <div className="space-y-2">
                <Label>Min Confidence</Label>
                <Select value={minConfidence} onValueChange={(v) => { setMinConfidence(v === "any" ? "" : v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="0.5">50%+</SelectItem>
                    <SelectItem value="0.6">60%+</SelectItem>
                    <SelectItem value="0.7">70%+</SelectItem>
                    <SelectItem value="0.8">80%+</SelectItem>
                    <SelectItem value="0.9">90%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Analysis Results</CardTitle>
                <CardDescription>
                  {historyData?.total || 0} total analyses found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : historyData?.analyses?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analyses found matching your filters</p>
                <p className="text-sm mt-2">Try adjusting your filters or run a new analysis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData?.analyses?.map((analysis: any) => {
                  const actionStyle = actionColors[analysis.consensusAction] || actionColors.hold;
                  return (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                      onClick={() => { setSelectedAnalysis(analysis); setDetailsOpen(true); }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Symbol */}
                        <div className="w-20">
                          <p className="font-bold text-lg">{analysis.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(analysis.createdAt)}
                          </p>
                        </div>

                        {/* Action Badge */}
                        <Badge className={`${actionStyle.bg} ${actionStyle.text} ${actionStyle.border} border`}>
                          {getActionIcon(analysis.consensusAction)}
                          <span className="ml-1">{analysis.consensusAction?.replace("_", " ").toUpperCase()}</span>
                        </Badge>

                        {/* Confidence */}
                        <div className="hidden md:block">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={Number(analysis.confidence) * 100} 
                              className="w-24 h-2"
                            />
                            <span className="text-sm font-medium">
                              {(Number(analysis.confidence) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Consensus Score */}
                        <div className="hidden lg:block">
                          <p className="text-xs text-muted-foreground">Consensus</p>
                          <p className={`text-sm font-medium ${
                            Number(analysis.consensusScore) > 0 ? "text-green-400" : 
                            Number(analysis.consensusScore) < 0 ? "text-red-400" : "text-yellow-400"
                          }`}>
                            {Number(analysis.consensusScore) > 0 ? "+" : ""}{(Number(analysis.consensusScore) * 100).toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Analysis Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl font-bold">{selectedAnalysis?.symbol}</span>
              {selectedAnalysis?.consensusAction && (
                <Badge className={`${actionColors[selectedAnalysis.consensusAction]?.bg} ${actionColors[selectedAnalysis.consensusAction]?.text}`}>
                  {selectedAnalysis.consensusAction?.replace("_", " ").toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Analysis performed on {selectedAnalysis ? formatDate(selectedAnalysis.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="agents">Agent Scores</TabsTrigger>
                <TabsTrigger value="details">Full Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Consensus Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Consensus Score</p>
                      <p className={`text-3xl font-bold ${
                        Number(selectedAnalysis?.consensusScore) > 0 ? "text-green-400" : 
                        Number(selectedAnalysis?.consensusScore) < 0 ? "text-red-400" : "text-yellow-400"
                      }`}>
                        {Number(selectedAnalysis?.consensusScore) > 0 ? "+" : ""}
                        {(Number(selectedAnalysis?.consensusScore) * 100).toFixed(1)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Confidence Level</p>
                      <p className="text-3xl font-bold text-primary">
                        {(Number(selectedAnalysis?.confidence) * 100).toFixed(0)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Confidence Progress */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Confidence</span>
                        <span>{(Number(selectedAnalysis?.confidence) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={Number(selectedAnalysis?.confidence) * 100} className="h-3" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="agents" className="space-y-4 mt-4">
                {/* Agent Scores Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "technicalScore", name: "Technical Analysis", icon: agentIcons.technical },
                    { key: "fundamentalScore", name: "Fundamental Analysis", icon: agentIcons.fundamental },
                    { key: "sentimentScore", name: "Sentiment Analysis", icon: agentIcons.sentiment },
                    { key: "riskScore", name: "Risk Management", icon: agentIcons.risk },
                    { key: "microstructureScore", name: "Market Microstructure", icon: agentIcons.microstructure },
                    { key: "macroScore", name: "Macroeconomic", icon: agentIcons.macro },
                    { key: "quantScore", name: "Quantitative", icon: agentIcons.quant },
                  ].map((agent) => {
                    const score = Number(selectedAnalysis?.[agent.key]) || 0;
                    const isPositive = score > 0;
                    const isNegative = score < 0;
                    return (
                      <Card key={agent.key}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {agent.icon}
                              <span className="text-sm font-medium">{agent.name}</span>
                            </div>
                            <span className={`font-bold ${
                              isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-yellow-400"
                            }`}>
                              {isPositive ? "+" : ""}{(score * 100).toFixed(1)}
                            </span>
                          </div>
                          <Progress 
                            value={Math.abs(score) * 100} 
                            className={`h-2 ${isPositive ? "[&>div]:bg-green-500" : isNegative ? "[&>div]:bg-red-500" : "[&>div]:bg-yellow-500"}`}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-[400px]">
                      {JSON.stringify(analysisDetails?.analysisDetails || selectedAnalysis?.analysisDetails, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
