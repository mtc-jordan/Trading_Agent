import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { trpc } from '@/lib/trpc';
import { 
  AlertTriangle,
  RefreshCw,
  Shield,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
  Target,
  Zap,
  History,
  Calculator,
  PieChart,
  ArrowDown,
  ArrowUp,
  Info,
  Play,
  ChevronRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  Legend,
  ReferenceLine
} from 'recharts';

// Risk level colors
function getRiskColor(level: string): string {
  switch (level) {
    case 'extreme': return '#ef4444';
    case 'high': return '#f97316';
    case 'moderate': return '#f59e0b';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
}

function getRiskBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'extreme':
    case 'high':
      return 'destructive';
    case 'moderate':
      return 'secondary';
    default:
      return 'default';
  }
}

export default function PortfolioStressTesting() {
  const [selectedScenario, setSelectedScenario] = useState('financial_crisis_2008');
  const [simulations, setSimulations] = useState(1000);
  const [timeHorizon, setTimeHorizon] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [activeTab, setActiveTab] = useState('monte_carlo');

  const scenarios = trpc.broker.getStressScenarios.useQuery();
  const monteCarloResult = trpc.broker.runMonteCarloStress.useMutation();
  const historicalResult = trpc.broker.runHistoricalStress.useMutation();
  const sensitivityResult = trpc.broker.runSensitivityAnalysis.useMutation();
  const varResult = trpc.broker.calculatePortfolioVaR.useQuery();

  const handleRunMonteCarlo = async () => {
    await monteCarloResult.mutateAsync({
      simulations,
      timeHorizon,
      confidenceLevel,
    });
  };

  const handleRunHistorical = async () => {
    await historicalResult.mutateAsync({
      scenario: selectedScenario,
    });
  };

  const handleRunSensitivity = async () => {
    await sensitivityResult.mutateAsync({
      factors: ['market', 'interest_rate', 'volatility', 'inflation'],
    });
  };

  const currentResult = activeTab === 'monte_carlo' 
    ? monteCarloResult.data 
    : activeTab === 'historical' 
    ? historicalResult.data 
    : null;

  // Format distribution data for chart
  const distributionData = useMemo(() => {
    if (!currentResult?.distribution) return [];
    return currentResult.distribution.map((d: any) => ({
      percentile: `${d.percentile}%`,
      value: d.value,
      loss: d.loss,
    }));
  }, [currentResult]);

  // Format asset impact data for chart
  const assetImpactData = useMemo(() => {
    if (!currentResult?.assetImpacts) return [];
    return currentResult.assetImpacts.map((a: any) => ({
      symbol: a.symbol,
      currentValue: a.currentValue,
      stressedValue: a.stressedValue,
      lossPercent: a.lossPercent,
    }));
  }, [currentResult]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio Stress Testing</h1>
            <p className="text-muted-foreground mt-1">
              Monte Carlo simulations and historical crisis scenarios
            </p>
          </div>
        </div>

        {/* Test Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="monte_carlo">Monte Carlo</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
            <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          </TabsList>

          {/* Monte Carlo Tab */}
          <TabsContent value="monte_carlo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Monte Carlo Simulation
                </CardTitle>
                <CardDescription>
                  Run thousands of simulations to estimate potential portfolio outcomes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Simulations</label>
                    <Select 
                      value={simulations.toString()} 
                      onValueChange={(v) => setSimulations(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="1000">1,000</SelectItem>
                        <SelectItem value="5000">5,000</SelectItem>
                        <SelectItem value="10000">10,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Horizon (Days)</label>
                    <div className="pt-2">
                      <Slider
                        value={[timeHorizon]}
                        onValueChange={([v]) => setTimeHorizon(v)}
                        min={1}
                        max={365}
                        step={1}
                      />
                      <p className="text-sm text-muted-foreground mt-1">{timeHorizon} days</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confidence Level</label>
                    <Select 
                      value={confidenceLevel.toString()} 
                      onValueChange={(v) => setConfidenceLevel(parseFloat(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.90">90%</SelectItem>
                        <SelectItem value="0.95">95%</SelectItem>
                        <SelectItem value="0.99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleRunMonteCarlo}
                  disabled={monteCarloResult.isPending}
                  className="w-full"
                >
                  {monteCarloResult.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Monte Carlo Simulation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Tab */}
          <TabsContent value="historical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historical Crisis Scenarios
                </CardTitle>
                <CardDescription>
                  Test portfolio against past market crises
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scenarios.data?.map((scenario: any) => (
                    <div
                      key={scenario.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedScenario === scenario.id 
                          ? 'border-primary bg-primary/10' 
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {scenario.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-red-500 font-medium">
                          {scenario.peakToTrough}%
                        </span>
                        <span className="text-muted-foreground">
                          {scenario.recoveryDays} days recovery
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleRunHistorical}
                  disabled={historicalResult.isPending}
                  className="w-full"
                >
                  {historicalResult.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Historical Stress Test
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensitivity Tab */}
          <TabsContent value="sensitivity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Sensitivity Analysis
                </CardTitle>
                <CardDescription>
                  Analyze portfolio sensitivity to market factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Market', 'Interest Rate', 'Volatility', 'Inflation'].map((factor) => (
                    <div key={factor} className="p-4 rounded-lg border text-center">
                      <p className="font-medium">{factor}</p>
                      <p className="text-sm text-muted-foreground">Factor</p>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleRunSensitivity}
                  disabled={sensitivityResult.isPending}
                  className="w-full"
                >
                  {sensitivityResult.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Sensitivity Analysis
                </Button>

                {sensitivityResult.data && (
                  <div className="space-y-4 mt-6">
                    {sensitivityResult.data.map((analysis: any) => (
                      <div key={analysis.factor} className="p-4 rounded-lg border">
                        <h4 className="font-medium capitalize mb-4">{analysis.factor.replace('_', ' ')}</h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analysis.impacts}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis 
                                dataKey="change" 
                                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                                stroke="#666"
                              />
                              <YAxis 
                                tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                                stroke="#666"
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Portfolio Value']}
                              />
                              <ReferenceLine y={analysis.baseValue} stroke="#666" strokeDasharray="3 3" />
                              <Line 
                                type="monotone" 
                                dataKey="portfolioValue" 
                                stroke="#22c55e" 
                                strokeWidth={2}
                                dot={{ fill: '#22c55e' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Results Section */}
        {currentResult && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Loss</p>
                      <p className="text-3xl font-bold text-red-500">
                        -{currentResult.expectedLossPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-red-500/20">
                      <TrendingDown className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    ${currentResult.expectedLoss.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Value at Risk</p>
                      <p className="text-3xl font-bold text-orange-500">
                        ${(currentResult.valueAtRisk / 1000).toFixed(1)}k
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-orange-500/20">
                      <Shield className="h-6 w-6 text-orange-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {(confidenceLevel * 100).toFixed(0)}% confidence
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-3xl font-bold text-yellow-500">
                        -{currentResult.maxDrawdown.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-yellow-500/20">
                      <ArrowDown className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Worst case scenario
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Level</p>
                      <Badge 
                        variant={getRiskBadgeVariant(currentResult.riskLevel)}
                        className="text-lg px-3 py-1 mt-1"
                      >
                        {currentResult.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div 
                      className="p-3 rounded-full"
                      style={{ backgroundColor: getRiskColor(currentResult.riskLevel) + '30' }}
                    >
                      <AlertTriangle 
                        className="h-6 w-6" 
                        style={{ color: getRiskColor(currentResult.riskLevel) }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {currentResult.recoveryTime} days recovery
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Loss Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="percentile" stroke="#666" />
                        <YAxis 
                          tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                          stroke="#666"
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Portfolio Value']}
                        />
                        <Bar dataKey="value" fill="#3b82f6">
                          {distributionData.map((entry: any, index: number) => (
                            <Cell 
                              key={index}
                              fill={entry.loss > 0 ? '#ef4444' : '#22c55e'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Asset Impact Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Asset Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assetImpactData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis 
                          type="number"
                          tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                          stroke="#666"
                        />
                        <YAxis type="category" dataKey="symbol" stroke="#666" width={60} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                        />
                        <Legend />
                        <Bar dataKey="currentValue" fill="#3b82f6" name="Current" />
                        <Bar dataKey="stressedValue" fill="#ef4444" name="Stressed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            {currentResult.recommendations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Risk Mitigation Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentResult.recommendations.map((rec: string, index: number) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          rec.includes('CRITICAL') 
                            ? 'bg-red-500/10 border border-red-500/30' 
                            : 'bg-muted/50'
                        }`}
                      >
                        <ChevronRight className={`h-5 w-5 mt-0.5 ${
                          rec.includes('CRITICAL') ? 'text-red-500' : 'text-primary'
                        }`} />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VaR Summary */}
            {varResult.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Value at Risk Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">1-Day VaR (95%)</p>
                      <p className="text-2xl font-bold">${varResult.data.var.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{varResult.data.varPercent.toFixed(2)}% of portfolio</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Method</p>
                      <p className="text-2xl font-bold capitalize">{varResult.data.method}</p>
                      <p className="text-sm text-muted-foreground">Parametric approach</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Interpretation</p>
                      <p className="text-sm">
                        There is a 5% chance of losing more than ${varResult.data.var.toLocaleString()} in a single day
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
