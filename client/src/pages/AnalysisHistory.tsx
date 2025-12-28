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
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  GitCompare,
  CheckSquare,
  Square,
  Layers,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid } from "recharts";

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

// Chart colors for comparison
const COMPARISON_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
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
  
  // Comparison states
  const [selectedForComparison, setSelectedForComparison] = useState<Set<number>>(new Set());
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  
  const pageSize = 20;
  const maxComparisons = 5;

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

  // Prepare comparison radar chart data
  const comparisonRadarData = useMemo(() => {
    if (comparisonData.length === 0) return [];
    
    const agents = [
      { key: "technicalScore", name: "Technical" },
      { key: "fundamentalScore", name: "Fundamental" },
      { key: "sentimentScore", name: "Sentiment" },
      { key: "riskScore", name: "Risk" },
      { key: "microstructureScore", name: "Microstructure" },
      { key: "macroScore", name: "Macro" },
      { key: "quantScore", name: "Quant" },
    ];

    return agents.map(agent => {
      const dataPoint: any = { agent: agent.name };
      comparisonData.forEach((analysis, index) => {
        dataPoint[`analysis${index + 1}`] = Math.abs(Number(analysis[agent.key]) || 0) * 100;
      });
      return dataPoint;
    });
  }, [comparisonData]);

  // Prepare evolution timeline data
  const evolutionTimelineData = useMemo(() => {
    if (comparisonData.length === 0) return [];
    
    return comparisonData
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((analysis, index) => ({
        date: new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        symbol: analysis.symbol,
        confidence: Number(analysis.confidence) * 100,
        consensus: Number(analysis.consensusScore) * 100,
        action: analysis.consensusAction,
        index: index + 1,
      }));
  }, [comparisonData]);

  // Toggle selection for comparison
  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedForComparison);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else if (newSelection.size < maxComparisons) {
      newSelection.add(id);
    }
    setSelectedForComparison(newSelection);
  };

  // Select all visible
  const selectAllVisible = () => {
    const newSelection = new Set(selectedForComparison);
    historyData?.analyses?.slice(0, maxComparisons).forEach((a: any) => {
      if (newSelection.size < maxComparisons) {
        newSelection.add(a.id);
      }
    });
    setSelectedForComparison(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedForComparison(new Set());
  };

  // Open comparison view
  const openComparison = () => {
    const selectedAnalyses = historyData?.analyses?.filter((a: any) => selectedForComparison.has(a.id)) || [];
    setComparisonData(selectedAnalyses);
    setComparisonOpen(true);
  };

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

  // Export comparison to CSV
  const exportComparisonToCSV = () => {
    if (comparisonData.length === 0) return;
    
    const headers = ["Date", "Symbol", "Action", "Confidence", "Consensus Score", "Technical", "Fundamental", "Sentiment", "Risk", "Microstructure", "Macro", "Quant"];
    const rows = comparisonData.map((a: any) => [
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
    link.download = `analysis-comparison-${new Date().toISOString().split("T")[0]}.csv`;
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
            {/* Comparison Mode Toggle */}
            <Button 
              variant={comparisonMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setComparisonMode(!comparisonMode);
                if (comparisonMode) clearSelection();
              }}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {comparisonMode ? "Exit Compare" : "Compare Mode"}
            </Button>
            
            {comparisonMode && selectedForComparison.size > 0 && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={openComparison}
                className="bg-primary"
              >
                <Layers className="h-4 w-4 mr-2" />
                Compare ({selectedForComparison.size})
              </Button>
            )}
            
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
        {/* Comparison Mode Banner */}
        {comparisonMode && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <GitCompare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Comparison Mode Active</p>
                    <p className="text-sm text-muted-foreground">
                      Select up to {maxComparisons} analyses to compare side-by-side. 
                      {selectedForComparison.size > 0 && ` (${selectedForComparison.size} selected)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllVisible}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select First {maxComparisons}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  const isSelected = selectedForComparison.has(analysis.id);
                  return (
                    <div
                      key={analysis.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border/50 bg-card/50 hover:bg-card/80"
                      }`}
                      onClick={() => {
                        if (comparisonMode) {
                          toggleSelection(analysis.id);
                        } else {
                          setSelectedAnalysis(analysis);
                          setDetailsOpen(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox for comparison mode */}
                        {comparisonMode && (
                          <div className="flex items-center">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(analysis.id)}
                              className="h-5 w-5"
                            />
                          </div>
                        )}
                        
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

                      {!comparisonMode && (
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      )}
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

      {/* Comparison Dialog */}
      <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <GitCompare className="h-6 w-6 text-primary" />
              <span>Analysis Comparison</span>
              <Badge variant="outline">{comparisonData.length} analyses</Badge>
            </DialogTitle>
            <DialogDescription>
              Compare multiple analyses side-by-side to track recommendation evolution
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[80vh]">
            <Tabs defaultValue="side-by-side" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="radar">Agent Comparison</TabsTrigger>
                <TabsTrigger value="timeline">Evolution Timeline</TabsTrigger>
                <TabsTrigger value="table">Data Table</TabsTrigger>
              </TabsList>

              {/* Side by Side View */}
              <TabsContent value="side-by-side" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {comparisonData.map((analysis, index) => {
                    const actionStyle = actionColors[analysis.consensusAction] || actionColors.hold;
                    return (
                      <Card key={analysis.id} className="relative">
                        <div 
                          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                          style={{ backgroundColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length] }}
                        />
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{analysis.symbol}</CardTitle>
                            <Badge 
                              variant="outline" 
                              style={{ 
                                borderColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length],
                                color: COMPARISON_COLORS[index % COMPARISON_COLORS.length]
                              }}
                            >
                              #{index + 1}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            {formatDate(analysis.createdAt)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Action */}
                          <div>
                            <Badge className={`${actionStyle.bg} ${actionStyle.text} ${actionStyle.border} border w-full justify-center`}>
                              {getActionIcon(analysis.consensusAction)}
                              <span className="ml-1">{analysis.consensusAction?.replace("_", " ").toUpperCase()}</span>
                            </Badge>
                          </div>

                          {/* Metrics */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Confidence</span>
                              <span className="font-medium">{(Number(analysis.confidence) * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={Number(analysis.confidence) * 100} className="h-2" />
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Consensus</span>
                            <span className={`font-medium ${
                              Number(analysis.consensusScore) > 0 ? "text-green-400" : 
                              Number(analysis.consensusScore) < 0 ? "text-red-400" : "text-yellow-400"
                            }`}>
                              {Number(analysis.consensusScore) > 0 ? "+" : ""}{(Number(analysis.consensusScore) * 100).toFixed(1)}
                            </span>
                          </div>

                          <Separator />

                          {/* Agent Scores Summary */}
                          <div className="space-y-1 text-xs">
                            {[
                              { key: "technicalScore", name: "Tech" },
                              { key: "fundamentalScore", name: "Fund" },
                              { key: "sentimentScore", name: "Sent" },
                              { key: "riskScore", name: "Risk" },
                            ].map(agent => {
                              const score = Number(analysis[agent.key]) || 0;
                              return (
                                <div key={agent.key} className="flex justify-between">
                                  <span className="text-muted-foreground">{agent.name}</span>
                                  <span className={score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-yellow-400"}>
                                    {score > 0 ? "+" : ""}{(score * 100).toFixed(0)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Radar Chart View */}
              <TabsContent value="radar" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Agent Score Comparison</CardTitle>
                    <CardDescription>Radar chart comparing all 7 agent scores across selected analyses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={comparisonRadarData}>
                          <PolarGrid stroke="#333" />
                          <PolarAngleAxis dataKey="agent" tick={{ fill: '#888', fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888', fontSize: 10 }} />
                          {comparisonData.map((analysis, index) => (
                            <Radar
                              key={analysis.id}
                              name={`${analysis.symbol} (${formatDate(analysis.createdAt).split(",")[0]})`}
                              dataKey={`analysis${index + 1}`}
                              stroke={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
                              fill={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
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

              {/* Timeline View */}
              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Confidence Evolution</CardTitle>
                      <CardDescription>Track how confidence levels changed over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolutionTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                              labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="confidence" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={{ fill: '#10b981', strokeWidth: 2 }}
                              name="Confidence %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Consensus Score Evolution</CardTitle>
                      <CardDescription>Track how consensus scores changed over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolutionTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} />
                            <YAxis domain={[-100, 100]} tick={{ fill: '#888', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                              labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="consensus" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                              name="Consensus Score"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline Cards */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recommendation Timeline</CardTitle>
                      <CardDescription>Visual timeline of recommendation changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                        <div className="space-y-4">
                          {evolutionTimelineData.map((item, index) => {
                            const actionStyle = actionColors[item.action] || actionColors.hold;
                            return (
                              <div key={index} className="relative pl-10">
                                <div 
                                  className="absolute left-2 w-4 h-4 rounded-full border-2 border-background"
                                  style={{ backgroundColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length] }}
                                />
                                <div className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border/50">
                                  <div className="text-sm text-muted-foreground w-24">{item.date}</div>
                                  <div className="font-bold">{item.symbol}</div>
                                  <Badge className={`${actionStyle.bg} ${actionStyle.text}`}>
                                    {item.action?.replace("_", " ").toUpperCase()}
                                  </Badge>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Confidence:</span>{" "}
                                    <span className="font-medium">{item.confidence.toFixed(0)}%</span>
                                  </div>
                                  {index < evolutionTimelineData.length - 1 && (
                                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Data Table View */}
              <TabsContent value="table" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Comparison Data Table</CardTitle>
                        <CardDescription>Detailed comparison of all metrics</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={exportComparisonToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Metric</th>
                            {comparisonData.map((analysis, index) => (
                              <th key={analysis.id} className="text-center py-3 px-2">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge 
                                    variant="outline"
                                    style={{ 
                                      borderColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length],
                                      color: COMPARISON_COLORS[index % COMPARISON_COLORS.length]
                                    }}
                                  >
                                    {analysis.symbol}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(analysis.createdAt).split(",")[0]}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-2 font-medium">Action</td>
                            {comparisonData.map((analysis) => {
                              const actionStyle = actionColors[analysis.consensusAction] || actionColors.hold;
                              return (
                                <td key={analysis.id} className="text-center py-3 px-2">
                                  <Badge className={`${actionStyle.bg} ${actionStyle.text}`}>
                                    {analysis.consensusAction?.replace("_", " ").toUpperCase()}
                                  </Badge>
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-2 font-medium">Confidence</td>
                            {comparisonData.map((analysis) => (
                              <td key={analysis.id} className="text-center py-3 px-2 font-medium">
                                {(Number(analysis.confidence) * 100).toFixed(0)}%
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-2 font-medium">Consensus Score</td>
                            {comparisonData.map((analysis) => {
                              const score = Number(analysis.consensusScore);
                              return (
                                <td key={analysis.id} className={`text-center py-3 px-2 font-medium ${
                                  score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-yellow-400"
                                }`}>
                                  {score > 0 ? "+" : ""}{(score * 100).toFixed(1)}
                                </td>
                              );
                            })}
                          </tr>
                          {[
                            { key: "technicalScore", name: "Technical" },
                            { key: "fundamentalScore", name: "Fundamental" },
                            { key: "sentimentScore", name: "Sentiment" },
                            { key: "riskScore", name: "Risk" },
                            { key: "microstructureScore", name: "Microstructure" },
                            { key: "macroScore", name: "Macro" },
                            { key: "quantScore", name: "Quant" },
                          ].map((agent) => (
                            <tr key={agent.key} className="border-b border-border/50">
                              <td className="py-3 px-2 font-medium">{agent.name}</td>
                              {comparisonData.map((analysis) => {
                                const score = Number(analysis[agent.key]) || 0;
                                return (
                                  <td key={analysis.id} className={`text-center py-3 px-2 ${
                                    score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-yellow-400"
                                  }`}>
                                    {score > 0 ? "+" : ""}{(score * 100).toFixed(1)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
