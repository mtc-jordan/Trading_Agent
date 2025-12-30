import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Play, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Shield,
  Zap,
  RefreshCw,
  Copy,
  Layers,
  Target,
  DollarSign,
  Percent,
  Activity,
  Scale,
  Info,
  FileText,
  Rocket,
  Search,
  Loader2,
  ExternalLink
} from "lucide-react";
import { useBroker } from "@/contexts/BrokerContext";
import { toast } from "sonner";

interface SimulatedTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedPrice: number;
}

interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  weight: number;
}

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'JNJ', 'V'];

export default function TradeSimulator() {
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [scenarioName, setScenarioName] = useState("My Scenario");
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [cash, setCash] = useState(15000);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  
  // New trade form state
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    side: 'buy' as 'buy' | 'sell',
    quantity: 0,
    estimatedPrice: 0,
  });

  // Scenarios for comparison
  const [scenarios, setScenarios] = useState<Array<{ name: string; trades: SimulatedTrade[] }>>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Get sample positions
  const { data: sampleData, isLoading: loadingSample } = trpc.broker.getSamplePositions.useQuery();

  // Simulation mutation
  const simulateMutation = trpc.broker.simulateTrades.useMutation();
  
  // Compare scenarios mutation
  const compareMutation = trpc.broker.compareScenarios.useMutation();
  
  // Templates
  const { data: templates, isLoading: loadingTemplates } = trpc.broker.getTemplates.useQuery();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  
  // Trade execution
  const { connectedBrokers, activeBroker } = useBroker();
  const executeMutation = trpc.broker.executeTrades.useMutation({
    onSuccess: (data) => {
      if (data.status === 'filled') {
        toast.success(`Successfully executed ${data.trades.length} trades`);
      } else if (data.status === 'partial') {
        toast.warning(`Partially executed: ${data.trades.filter(t => t.status === 'filled').length}/${data.trades.length} trades`);
      } else {
        toast.error(`Execution failed: ${data.errors.join(', ')}`);
      }
    },
    onError: (error) => {
      toast.error(`Execution error: ${error.message}`);
    },
  });
  const generateTradesMutation = trpc.broker.generateTradesFromTemplate.useMutation();
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);

  // Load sample positions
  const loadSamplePositions = () => {
    if (sampleData) {
      setPositions(sampleData.positions);
      setCash(sampleData.cash);
    }
  };

  // Add a new trade
  const addTrade = () => {
    if (!newTrade.symbol || newTrade.quantity <= 0 || newTrade.estimatedPrice <= 0) return;
    
    setTrades([...trades, {
      id: `trade-${Date.now()}`,
      ...newTrade,
    }]);
    
    setNewTrade({ symbol: '', side: 'buy', quantity: 0, estimatedPrice: 0 });
    setShowAddTrade(false);
  };

  // Remove a trade
  const removeTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  // Run simulation
  const runSimulation = () => {
    if (trades.length === 0) return;
    
    simulateMutation.mutate({
      trades: trades.map(t => ({
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        estimatedPrice: t.estimatedPrice,
      })),
      scenarioName,
      currentPositions: positions.length > 0 ? positions : undefined,
      currentCash: cash,
    });
  };

  // Save current scenario
  const saveScenario = () => {
    if (trades.length === 0) return;
    
    setScenarios([...scenarios, {
      name: scenarioName || `Scenario ${scenarios.length + 1}`,
      trades: [...trades],
    }]);
    
    setTrades([]);
    setScenarioName(`Scenario ${scenarios.length + 2}`);
  };

  // Compare all scenarios
  const compareAllScenarios = () => {
    if (scenarios.length < 2) return;
    
    compareMutation.mutate({
      scenarios: scenarios.map(s => ({
        name: s.name,
        trades: s.trades.map(t => ({
          symbol: t.symbol,
          side: t.side,
          quantity: t.quantity,
          estimatedPrice: t.estimatedPrice,
        })),
      })),
      currentPositions: positions.length > 0 ? positions : undefined,
      currentCash: cash,
    });
    
    setShowCompareDialog(true);
  };

  // Calculate totals for trades
  const tradeTotals = useMemo(() => {
    const buys = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.quantity * t.estimatedPrice, 0);
    const sells = trades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.quantity * t.estimatedPrice, 0);
    return { buys, sells, net: sells - buys };
  }, [trades]);

  const result = simulateMutation.data;
  const comparisonResult = compareMutation.data;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-8 w-8 text-primary" />
              Trade Simulator
            </h1>
            <p className="text-muted-foreground mt-1">
              What-if analysis for your trades before execution
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSamplePositions} disabled={loadingSample}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Load Sample Portfolio
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="builder">
              <Layers className="h-4 w-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!result}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="compare" disabled={scenarios.length < 2}>
              <Scale className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="execute" disabled={trades.length === 0}>
              <Rocket className="h-4 w-4 mr-2" />
              Execute
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Current Portfolio */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Current Portfolio
                  </CardTitle>
                  <CardDescription>
                    Your starting positions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Cash Available</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <Input
                        type="number"
                        value={cash}
                        onChange={(e) => setCash(Number(e.target.value))}
                        className="w-28 h-8 text-right"
                      />
                    </div>
                  </div>
                  
                  {positions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <PieChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No positions loaded</p>
                      <p className="text-sm mt-1">Click "Load Sample Portfolio" to start</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {positions.map((pos) => (
                          <div key={pos.symbol} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{pos.symbol}</span>
                              <Badge variant={pos.unrealizedPL >= 0 ? "default" : "destructive"}>
                                {pos.unrealizedPL >= 0 ? '+' : ''}{pos.unrealizedPLPercent.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                              <div>Qty: {pos.quantity}</div>
                              <div>Price: ${pos.currentPrice.toFixed(2)}</div>
                              <div>Avg Cost: ${pos.avgCost.toFixed(2)}</div>
                              <div>Value: ${pos.marketValue.toFixed(0)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Portfolio Value</span>
                    <span className="text-lg">
                      ${(positions.reduce((sum, p) => sum + p.marketValue, 0) + cash).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Builder */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Simulated Trades
                      </CardTitle>
                      <CardDescription>
                        Add trades to simulate their impact
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Scenario name"
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        className="w-40"
                      />
                      <Dialog open={showAddTrade} onOpenChange={setShowAddTrade}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Trade
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Simulated Trade</DialogTitle>
                            <DialogDescription>
                              Enter the details of the trade you want to simulate
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Symbol</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="e.g., AAPL"
                                  value={newTrade.symbol}
                                  onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
                                />
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {POPULAR_SYMBOLS.map(sym => (
                                  <Badge
                                    key={sym}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => setNewTrade({ ...newTrade, symbol: sym })}
                                  >
                                    {sym}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Side</Label>
                              <Select
                                value={newTrade.side}
                                onValueChange={(v) => setNewTrade({ ...newTrade, side: v as 'buy' | 'sell' })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="buy">
                                    <span className="flex items-center gap-2">
                                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                                      Buy
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="sell">
                                    <span className="flex items-center gap-2">
                                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                                      Sell
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={newTrade.quantity || ''}
                                  onChange={(e) => setNewTrade({ ...newTrade, quantity: Number(e.target.value) })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Estimated Price ($)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={newTrade.estimatedPrice || ''}
                                  onChange={(e) => setNewTrade({ ...newTrade, estimatedPrice: Number(e.target.value) })}
                                />
                              </div>
                            </div>
                            {newTrade.quantity > 0 && newTrade.estimatedPrice > 0 && (
                              <div className="p-3 bg-muted rounded-lg">
                                <div className="flex justify-between text-sm">
                                  <span>Estimated Value</span>
                                  <span className="font-semibold">
                                    ${(newTrade.quantity * newTrade.estimatedPrice).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddTrade(false)}>
                              Cancel
                            </Button>
                            <Button onClick={addTrade} disabled={!newTrade.symbol || newTrade.quantity <= 0}>
                              Add Trade
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {trades.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No trades added yet</p>
                      <p className="text-sm mt-1">Click "Add Trade" to start building your simulation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {trades.map((trade) => (
                          <div
                            key={trade.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${trade.side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                {trade.side === 'buy' ? (
                                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                                ) : (
                                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold">{trade.symbol}</div>
                                <div className="text-sm text-muted-foreground">
                                  {trade.side.toUpperCase()} {trade.quantity} @ ${trade.estimatedPrice.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className={`font-semibold ${trade.side === 'buy' ? 'text-red-500' : 'text-green-500'}`}>
                                  {trade.side === 'buy' ? '-' : '+'}${(trade.quantity * trade.estimatedPrice).toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Estimated Value
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTrade(trade.id)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Trade Summary */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Total Buys</div>
                          <div className="text-lg font-semibold text-red-500">
                            -${tradeTotals.buys.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Total Sells</div>
                          <div className="text-lg font-semibold text-green-500">
                            +${tradeTotals.sells.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Net Cash Flow</div>
                          <div className={`text-lg font-semibold ${tradeTotals.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tradeTotals.net >= 0 ? '+' : ''}{tradeTotals.net.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={saveScenario}>
                          <Copy className="h-4 w-4 mr-2" />
                          Save Scenario
                        </Button>
                        <Button onClick={runSimulation} disabled={simulateMutation.isPending}>
                          {simulateMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Run Simulation
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Saved Scenarios */}
            {scenarios.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Saved Scenarios ({scenarios.length})</CardTitle>
                      <CardDescription>Compare multiple scenarios side by side</CardDescription>
                    </div>
                    <Button
                      onClick={compareAllScenarios}
                      disabled={scenarios.length < 2 || compareMutation.isPending}
                    >
                      <Scale className="h-4 w-4 mr-2" />
                      Compare All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {scenarios.map((scenario, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{scenario.name}</span>
                          <Badge variant="outline">{scenario.trades.length} trades</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {scenario.trades.slice(0, 3).map((t, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {t.side === 'buy' ? (
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-500" />
                              )}
                              {t.symbol} x{t.quantity}
                            </div>
                          ))}
                          {scenario.trades.length > 3 && (
                            <div className="text-xs">+{scenario.trades.length - 3} more</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            setScenarios(scenarios.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {result && (
              <>
                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <Alert
                        key={idx}
                        variant={warning.severity === 'high' ? 'destructive' : 'default'}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="capitalize">{warning.type} Warning</AlertTitle>
                        <AlertDescription>{warning.message}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Impact Summary */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Portfolio Value Change</p>
                          <p className={`text-2xl font-bold ${result.impact.totalValueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {result.impact.totalValueChange >= 0 ? '+' : ''}
                            ${result.impact.totalValueChange.toFixed(2)}
                          </p>
                        </div>
                        {result.impact.totalValueChange >= 0 ? (
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        ) : (
                          <TrendingDown className="h-8 w-8 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {result.impact.totalValueChangePercent >= 0 ? '+' : ''}
                        {result.impact.totalValueChangePercent.toFixed(2)}% change
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Diversification</p>
                          <p className="text-2xl font-bold">
                            {result.afterMetrics.diversificationScore.toFixed(0)}
                          </p>
                        </div>
                        <PieChart className="h-8 w-8 text-primary" />
                      </div>
                      <p className={`text-xs mt-2 ${result.impact.diversificationChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {result.impact.diversificationChange >= 0 ? '+' : ''}
                        {result.impact.diversificationChange.toFixed(1)} from current
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Portfolio Beta</p>
                          <p className="text-2xl font-bold">
                            {result.afterMetrics.beta.toFixed(2)}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-primary" />
                      </div>
                      <p className={`text-xs mt-2 ${result.impact.betaChange <= 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {result.impact.betaChange >= 0 ? '+' : ''}
                        {result.impact.betaChange.toFixed(2)} from current
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Costs</p>
                          <p className="text-2xl font-bold text-red-500">
                            ${result.costs.totalCosts.toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-red-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Commission + Slippage + Tax
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Before/After Comparison */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Before vs After Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: 'Total Value', before: result.beforeMetrics.totalValue, after: result.afterMetrics.totalValue, format: 'currency' },
                          { label: 'Cash', before: result.beforeMetrics.totalCash, after: result.afterMetrics.totalCash, format: 'currency' },
                          { label: 'Diversification Score', before: result.beforeMetrics.diversificationScore, after: result.afterMetrics.diversificationScore, format: 'number' },
                          { label: 'Concentration Risk', before: result.beforeMetrics.concentrationRisk, after: result.afterMetrics.concentrationRisk, format: 'percent', inverse: true },
                          { label: 'Volatility', before: result.beforeMetrics.volatility, after: result.afterMetrics.volatility, format: 'percent', inverse: true },
                          { label: 'Sharpe Ratio', before: result.beforeMetrics.sharpeRatio, after: result.afterMetrics.sharpeRatio, format: 'ratio' },
                        ].map((metric, idx) => {
                          const change = metric.after - metric.before;
                          const isPositive = metric.inverse ? change < 0 : change > 0;
                          
                          return (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{metric.label}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm">
                                  {metric.format === 'currency' && '$'}
                                  {metric.before.toFixed(metric.format === 'currency' ? 0 : 2)}
                                  {metric.format === 'percent' && '%'}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className={`text-sm font-semibold ${isPositive ? 'text-green-500' : change === 0 ? '' : 'text-red-500'}`}>
                                  {metric.format === 'currency' && '$'}
                                  {metric.after.toFixed(metric.format === 'currency' ? 0 : 2)}
                                  {metric.format === 'percent' && '%'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estimated Commission</span>
                          <span className="font-semibold">${result.costs.estimatedCommission.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estimated Slippage</span>
                          <span className="font-semibold">${result.costs.estimatedSlippage.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estimated Tax Impact</span>
                          <span className="font-semibold">${result.costs.estimatedTaxImpact.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Total Costs</span>
                          <span className="text-lg font-bold text-red-500">${result.costs.totalCosts.toFixed(2)}</span>
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <div className="space-y-3">
                        <h4 className="font-semibold">Position Changes</h4>
                        {result.impact.newPositions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-500">New</Badge>
                            <span className="text-sm">{result.impact.newPositions.join(', ')}</span>
                          </div>
                        )}
                        {result.impact.closedPositions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">Closed</Badge>
                            <span className="text-sm">{result.impact.closedPositions.join(', ')}</span>
                          </div>
                        )}
                        {result.impact.increasedPositions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-green-500 text-green-500">Increased</Badge>
                            <span className="text-sm">{result.impact.increasedPositions.join(', ')}</span>
                          </div>
                        )}
                        {result.impact.decreasedPositions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-red-500 text-red-500">Decreased</Badge>
                            <span className="text-sm">{result.impact.decreasedPositions.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sector Exposure */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Sector Exposure (After)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {Object.entries(result.afterMetrics.sectorExposure)
                        .sort((a, b) => b[1] - a[1])
                        .map(([sector, weight]) => (
                          <div key={sector} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{sector}</span>
                              <span className="font-semibold">{weight.toFixed(1)}%</span>
                            </div>
                            <Progress value={weight} className="h-2" />
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-6">
            {comparisonResult && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Recommendation</AlertTitle>
                  <AlertDescription>{comparisonResult.recommendation}</AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-green-500/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="h-5 w-5" />
                        Best Scenario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{comparisonResult.bestScenario}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5" />
                        Worst Scenario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{comparisonResult.worstScenario}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Metric</th>
                            {comparisonResult.scenarios.map(s => (
                              <th key={s.scenarioId} className="text-right py-3 px-4">
                                {s.scenarioName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">Value Change</td>
                            {comparisonResult.scenarios.map(s => (
                              <td key={s.scenarioId} className={`text-right py-3 px-4 font-semibold ${s.impact.totalValueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {s.impact.totalValueChange >= 0 ? '+' : ''}${s.impact.totalValueChange.toFixed(0)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">Diversification</td>
                            {comparisonResult.scenarios.map(s => (
                              <td key={s.scenarioId} className="text-right py-3 px-4">
                                {s.afterMetrics.diversificationScore.toFixed(0)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">Volatility</td>
                            {comparisonResult.scenarios.map(s => (
                              <td key={s.scenarioId} className="text-right py-3 px-4">
                                {s.afterMetrics.volatility.toFixed(1)}%
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">Sharpe Ratio</td>
                            {comparisonResult.scenarios.map(s => (
                              <td key={s.scenarioId} className="text-right py-3 px-4">
                                {s.afterMetrics.sharpeRatio.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">Total Costs</td>
                            {comparisonResult.scenarios.map(s => (
                              <td key={s.scenarioId} className="text-right py-3 px-4 text-red-500">
                                ${s.costs.totalCosts.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-4 text-muted-foreground">Warnings</td>
                            {comparisonResult.scenarios.map(s => (
                              <td key={s.scenarioId} className="text-right py-3 px-4">
                                {s.warnings.length === 0 ? (
                                  <Badge variant="outline" className="border-green-500 text-green-500">None</Badge>
                                ) : (
                                  <Badge variant={s.warnings.some(w => w.severity === 'high') ? 'destructive' : 'outline'}>
                                    {s.warnings.length}
                                  </Badge>
                                )}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="sector_rotation">Sector Rotation</SelectItem>
                  <SelectItem value="dividend_growth">Dividend Growth</SelectItem>
                  <SelectItem value="momentum">Momentum</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="defensive">Defensive</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates
                  ?.filter(t => selectedCategory === 'all' || t.category === selectedCategory)
                  .filter(t => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.tags.some(tag => tag.includes(templateSearch.toLowerCase())))
                  .map((template) => (
                    <Card key={template.id} className="hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {template.description.slice(0, 100)}...
                            </CardDescription>
                          </div>
                          <Badge variant={
                            template.riskLevel === 'conservative' ? 'outline' :
                            template.riskLevel === 'moderate' ? 'secondary' : 'destructive'
                          }>
                            {template.riskLevel}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Est. Return</span>
                            <p className="font-semibold text-green-500">+{(template.estimatedReturn * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Volatility</span>
                            <p className="font-semibold">{(template.estimatedVolatility * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rebalance</span>
                            <p className="font-semibold capitalize">{template.rebalanceFrequency}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Min Investment</span>
                            <p className="font-semibold">${template.minInvestment.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Top Holdings</p>
                          <div className="space-y-1">
                            {template.targetAllocation.slice(0, 3).map((alloc) => (
                              <div key={alloc.symbol} className="flex items-center justify-between text-sm">
                                <span>{alloc.symbol}</span>
                                <span className="text-muted-foreground">{alloc.targetPercent}%</span>
                              </div>
                            ))}
                            {template.targetAllocation.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{template.targetAllocation.length - 3} more</p>
                            )}
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => {
                            const portfolioValue = positions.reduce((sum, p) => sum + p.marketValue, 0) + cash;
                            generateTradesMutation.mutate({
                              templateId: template.id,
                              portfolioValue: portfolioValue || 100000,
                              currentPositions: positions.map(p => ({
                                symbol: p.symbol,
                                quantity: p.quantity,
                                currentPrice: p.currentPrice,
                              })),
                              currentCash: cash,
                            }, {
                              onSuccess: (generatedTrades) => {
                                setTrades(generatedTrades.map((t, i) => ({
                                  id: `template-${Date.now()}-${i}`,
                                  symbol: t.symbol,
                                  side: t.side,
                                  quantity: t.quantity,
                                  estimatedPrice: t.estimatedPrice,
                                })));
                                setScenarioName(template.name);
                                setActiveTab('builder');
                                toast.success(`Generated ${generatedTrades.length} trades from template`);
                              },
                            });
                          }}
                          disabled={generateTradesMutation.isPending}
                        >
                          {generateTradesMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Execute Tab */}
          <TabsContent value="execute" className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Live Trade Execution</AlertTitle>
              <AlertDescription>
                This will execute real trades through your connected broker. Please review all trades carefully before proceeding.
              </AlertDescription>
            </Alert>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Trades to Execute</CardTitle>
                  <CardDescription>
                    {trades.length} trade{trades.length !== 1 ? 's' : ''} ready for execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {trades.map((trade) => (
                        <div key={trade.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                                {trade.side.toUpperCase()}
                              </Badge>
                              <span className="font-semibold text-lg">{trade.symbol}</span>
                            </div>
                            <span className="text-lg font-bold">
                              ${(trade.quantity * trade.estimatedPrice).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-muted-foreground">
                            <div>Quantity: {trade.quantity}</div>
                            <div>Est. Price: ${trade.estimatedPrice.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Execution Settings</CardTitle>
                  <CardDescription>
                    Configure how trades will be executed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select Broker</Label>
                    <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a connected broker" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedBrokers.map((broker) => (
                          <SelectItem key={broker.id} value={broker.id}>
                            <div className="flex items-center gap-2">
                              <span className="capitalize">{broker.brokerType.replace('_', ' ')}</span>
                              {broker.isPaper && <Badge variant="outline">Paper</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {connectedBrokers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No brokers connected. <a href="/settings" className="text-primary hover:underline">Connect a broker</a>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Dry Run Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Simulate execution without placing real orders
                      </p>
                    </div>
                    <Button
                      variant={dryRun ? 'default' : 'outline'}
                      onClick={() => setDryRun(!dryRun)}
                    >
                      {dryRun ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Buy Value</span>
                      <span className="font-semibold text-green-500">
                        ${tradeTotals.buys.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Sell Value</span>
                      <span className="font-semibold text-red-500">
                        ${tradeTotals.sells.toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Net Cash Flow</span>
                      <span className={`text-lg font-bold ${tradeTotals.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tradeTotals.net >= 0 ? '+' : ''}${tradeTotals.net.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!selectedBrokerId || trades.length === 0 || executeMutation.isPending}
                    onClick={() => {
                      executeMutation.mutate({
                        connectionId: selectedBrokerId,
                        trades: trades.map(t => ({
                          symbol: t.symbol,
                          side: t.side,
                          quantity: t.quantity,
                          estimatedPrice: t.estimatedPrice,
                        })),
                        dryRun,
                      });
                    }}
                  >
                    {executeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4 mr-2" />
                    )}
                    {dryRun ? 'Run Simulation' : 'Execute Trades'}
                  </Button>

                  {executeMutation.data && (
                    <Alert variant={executeMutation.data.status === 'filled' ? 'default' : 'destructive'}>
                      {executeMutation.data.status === 'filled' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {executeMutation.data.status === 'filled' ? 'Execution Complete' : 'Execution Issues'}
                      </AlertTitle>
                      <AlertDescription>
                        {executeMutation.data.trades.filter(t => t.status === 'filled').length} of {executeMutation.data.trades.length} trades executed.
                        Total value: ${executeMutation.data.totalValue.toLocaleString()}
                        {executeMutation.data.totalCommission > 0 && (
                          <> | Commission: ${executeMutation.data.totalCommission.toFixed(2)}</>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
