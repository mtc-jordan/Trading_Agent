import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, TrendingUp, TrendingDown, PieChart, BarChart3, 
  Target, Shield, Zap, Scale, Flame, RefreshCw, Info,
  DollarSign, Percent, AlertTriangle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

type RiskProfile = 'conservative' | 'moderate' | 'balanced' | 'growth' | 'aggressive';
type AssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond';

interface AssetData {
  symbol: string;
  name: string;
  assetType: AssetType;
  expectedReturn: number;
  volatility: number;
  currentPrice: number;
}

interface PortfolioAllocation {
  symbol: string;
  name: string;
  assetType: string;
  weight: number;
  expectedContribution: number;
}

interface OptimizedPortfolio {
  allocations: PortfolioAllocation[];
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  riskProfile: RiskProfile;
  diversificationScore: number;
  efficientFrontierPosition: string;
}

interface MonteCarloResult {
  percentile5: number;
  percentile25: number;
  median: number;
  percentile75: number;
  percentile95: number;
  mean: number;
  bestCase: number;
  worstCase: number;
  probabilityOfLoss: number;
  probabilityOfTarget: number;
}

const riskProfileConfig: Record<RiskProfile, { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  conservative: { 
    icon: <Shield className="h-4 w-4" />, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10',
    description: 'Low risk, stable returns'
  },
  moderate: { 
    icon: <Scale className="h-4 w-4" />, 
    color: 'text-cyan-500', 
    bgColor: 'bg-cyan-500/10',
    description: 'Balanced stability'
  },
  balanced: { 
    icon: <Target className="h-4 w-4" />, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    description: 'Growth with moderation'
  },
  growth: { 
    icon: <TrendingUp className="h-4 w-4" />, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
    description: 'Higher growth focus'
  },
  aggressive: { 
    icon: <Flame className="h-4 w-4" />, 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10',
    description: 'Maximum growth potential'
  },
};

const assetTypeColors: Record<string, string> = {
  stock: '#22c55e',
  crypto: '#f59e0b',
  forex: '#3b82f6',
  commodity: '#a855f7',
  bond: '#6b7280',
};

export function PortfolioOptimizer() {

  const [riskProfile, setRiskProfile] = useState<RiskProfile>('balanced');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [portfolioValue, setPortfolioValue] = useState<number>(100000);
  const [yearsToProject, setYearsToProject] = useState<number>(5);
  const [optimizedPortfolio, setOptimizedPortfolio] = useState<OptimizedPortfolio | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [activeTab, setActiveTab] = useState('assets');

  // Fetch sample assets
  const { data: sampleAssets, isLoading: loadingAssets } = trpc.portfolioOptimizer.getSampleAssets.useQuery();

  // Fetch risk profiles
  const { data: riskProfiles } = trpc.portfolioOptimizer.getAllRiskProfiles.useQuery();

  // Optimize mutation
  const optimizeMutation = trpc.portfolioOptimizer.optimize.useMutation({
    onSuccess: (data) => {
      setOptimizedPortfolio(data);
      setActiveTab('results');
      toast.success('Portfolio Optimized', {
        description: `Found optimal allocation with ${(data.sharpeRatio).toFixed(2)} Sharpe ratio`,
      });
    },
    onError: (error) => {
      toast.error('Optimization Failed', {
        description: error.message,
      });
    },
  });

  // Monte Carlo mutation
  const monteCarloMutation = trpc.portfolioOptimizer.runMonteCarloSimulation.useMutation({
    onSuccess: (data) => {
      setMonteCarloResult(data);
      toast.success('Simulation Complete', {
        description: `Ran 10,000 scenarios over ${yearsToProject} years`,
      });
    },
  });

  // Risk slider value (0-4 maps to profiles)
  const riskSliderValue = useMemo(() => {
    const profiles: RiskProfile[] = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];
    return profiles.indexOf(riskProfile);
  }, [riskProfile]);

  const handleRiskSliderChange = (value: number[]) => {
    const profiles: RiskProfile[] = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];
    setRiskProfile(profiles[value[0]]);
  };

  const toggleAsset = (symbol: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedAssets(newSelected);
  };

  const selectAllAssets = () => {
    if (sampleAssets) {
      setSelectedAssets(new Set(sampleAssets.map(a => a.symbol)));
    }
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  const handleOptimize = () => {
    if (!sampleAssets || selectedAssets.size < 2) {
      toast.error('Select More Assets', {
        description: 'Please select at least 2 assets to optimize',
      });
      return;
    }

    const assets = sampleAssets.filter(a => selectedAssets.has(a.symbol));
    optimizeMutation.mutate({
      assets,
      riskProfile,
      iterations: 10000,
    });
  };

  const handleRunSimulation = () => {
    if (!optimizedPortfolio) return;
    
    monteCarloMutation.mutate({
      expectedReturn: optimizedPortfolio.expectedReturn,
      expectedVolatility: optimizedPortfolio.expectedVolatility,
      initialValue: portfolioValue,
      yearsToProject,
      simulations: 10000,
    });
  };

  // Calculate pie chart segments
  const pieChartSegments = useMemo(() => {
    if (!optimizedPortfolio) return [];
    
    let currentAngle = 0;
    return optimizedPortfolio.allocations
      .filter(a => a.weight > 0.01)
      .map(allocation => {
        const angle = allocation.weight * 360;
        const segment = {
          ...allocation,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          color: assetTypeColors[allocation.assetType] || '#6b7280',
        };
        currentAngle += angle;
        return segment;
      });
  }, [optimizedPortfolio]);

  // SVG pie chart path generator
  const getArcPath = (startAngle: number, endAngle: number, radius: number = 80) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const currentRiskConfig = riskProfileConfig[riskProfile];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Portfolio Optimizer
            </CardTitle>
            <CardDescription>
              AI-powered asset allocation using Modern Portfolio Theory
            </CardDescription>
          </div>
          {optimizedPortfolio && (
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Optimized
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assets">Select Assets</TabsTrigger>
            <TabsTrigger value="risk">Risk Profile</TabsTrigger>
            <TabsTrigger value="results" disabled={!optimizedPortfolio}>Results</TabsTrigger>
          </TabsList>

          {/* Assets Selection Tab */}
          <TabsContent value="assets" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select assets to include in your portfolio ({selectedAssets.size} selected)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAssets}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            {loadingAssets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sampleAssets?.map((asset) => (
                  <div
                    key={asset.symbol}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAssets.has(asset.symbol)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleAsset(asset.symbol)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={selectedAssets.has(asset.symbol)} />
                        <div>
                          <p className="font-medium">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {asset.name}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: assetTypeColors[asset.assetType] }}
                      >
                        {asset.assetType}
                      </Badge>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Return: {(asset.expectedReturn * 100).toFixed(1)}%</span>
                      <span>Vol: {(asset.volatility * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => setActiveTab('risk')} 
                disabled={selectedAssets.size < 2}
              >
                Next: Set Risk Profile
              </Button>
            </div>
          </TabsContent>

          {/* Risk Profile Tab */}
          <TabsContent value="risk" className="space-y-6">
            <div className="space-y-4">
              <Label>Risk Tolerance</Label>
              <div className="px-2">
                <Slider
                  value={[riskSliderValue]}
                  onValueChange={handleRiskSliderChange}
                  max={4}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Conservative</span>
                  <span>Moderate</span>
                  <span>Balanced</span>
                  <span>Growth</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </div>

            <Card className={`${currentRiskConfig.bgColor} border-0`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${currentRiskConfig.bgColor} ${currentRiskConfig.color}`}>
                    {currentRiskConfig.icon}
                  </div>
                  <div>
                    <p className={`font-semibold capitalize ${currentRiskConfig.color}`}>
                      {riskProfile} Profile
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentRiskConfig.description}
                    </p>
                  </div>
                </div>
                {riskProfiles && (
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Target Return</p>
                      <p className="font-medium">
                        {riskProfiles.find(p => p.id === riskProfile)?.targetReturn}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Volatility</p>
                      <p className="font-medium">
                        {riskProfiles.find(p => p.id === riskProfile)?.targetVolatility}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Suitable For</p>
                      <p className="font-medium">
                        {riskProfiles.find(p => p.id === riskProfile)?.suitableFor}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="portfolioValue">Portfolio Value ($)</Label>
                <Input
                  id="portfolioValue"
                  type="number"
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(Number(e.target.value))}
                  min={1000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years">Projection Years</Label>
                <Input
                  id="years"
                  type="number"
                  value={yearsToProject}
                  onChange={(e) => setYearsToProject(Number(e.target.value))}
                  min={1}
                  max={30}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('assets')}>
                Back
              </Button>
              <Button 
                onClick={handleOptimize} 
                disabled={optimizeMutation.isPending || selectedAssets.size < 2}
              >
                {optimizeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Optimizing...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" />Optimize Portfolio</>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {optimizedPortfolio && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <TrendingUp className="h-4 w-4" />
                        Expected Return
                      </div>
                      <p className="text-2xl font-bold text-green-500">
                        {(optimizedPortfolio.expectedReturn * 100).toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Volatility
                      </div>
                      <p className="text-2xl font-bold text-orange-500">
                        {(optimizedPortfolio.expectedVolatility * 100).toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <BarChart3 className="h-4 w-4" />
                        Sharpe Ratio
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {optimizedPortfolio.sharpeRatio.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <PieChart className="h-4 w-4" />
                        Diversification
                      </div>
                      <p className="text-2xl font-bold text-blue-500">
                        {optimizedPortfolio.diversificationScore}/100
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pie Chart and Allocations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Allocation Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center">
                        <svg width="200" height="200" viewBox="0 0 200 200">
                          {pieChartSegments.map((segment, i) => (
                            <path
                              key={i}
                              d={getArcPath(segment.startAngle, segment.endAngle)}
                              fill={segment.color}
                              stroke="hsl(var(--background))"
                              strokeWidth="2"
                              className="transition-all hover:opacity-80"
                            >
                              <title>{segment.symbol}: {(segment.weight * 100).toFixed(1)}%</title>
                            </path>
                          ))}
                          <circle cx="100" cy="100" r="40" fill="hsl(var(--background))" />
                          <text x="100" y="95" textAnchor="middle" className="fill-foreground text-xs">
                            Portfolio
                          </text>
                          <text x="100" y="112" textAnchor="middle" className="fill-foreground font-bold text-sm">
                            ${(portfolioValue / 1000).toFixed(0)}K
                          </text>
                        </svg>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {pieChartSegments.map((segment) => (
                          <div key={segment.symbol} className="flex items-center gap-1 text-xs">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: segment.color }}
                            />
                            <span>{segment.symbol}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Allocation List */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Recommended Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {optimizedPortfolio.allocations
                          .filter(a => a.weight > 0.01)
                          .map((allocation) => (
                            <div 
                              key={allocation.symbol}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-8 rounded-full"
                                  style={{ backgroundColor: assetTypeColors[allocation.assetType] }}
                                />
                                <div>
                                  <p className="font-medium">{allocation.symbol}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {allocation.assetType}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{(allocation.weight * 100).toFixed(1)}%</p>
                                <p className="text-xs text-muted-foreground">
                                  ${(portfolioValue * allocation.weight).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Monte Carlo Simulation */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Monte Carlo Simulation</CardTitle>
                        <CardDescription>
                          Project portfolio outcomes over {yearsToProject} years (10,000 scenarios)
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={handleRunSimulation}
                        disabled={monteCarloMutation.isPending}
                        size="sm"
                      >
                        {monteCarloMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Run Simulation</span>
                      </Button>
                    </div>
                  </CardHeader>
                  {monteCarloResult && (
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-red-500/10">
                          <p className="text-xs text-muted-foreground">Worst Case (5%)</p>
                          <p className="text-lg font-bold text-red-500">
                            ${monteCarloResult.percentile5.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-500/10">
                          <p className="text-xs text-muted-foreground">25th Percentile</p>
                          <p className="text-lg font-bold text-orange-500">
                            ${monteCarloResult.percentile25.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-500/10">
                          <p className="text-xs text-muted-foreground">Median (50%)</p>
                          <p className="text-lg font-bold text-green-500">
                            ${monteCarloResult.median.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-blue-500/10">
                          <p className="text-xs text-muted-foreground">Best Case (95%)</p>
                          <p className="text-lg font-bold text-blue-500">
                            ${monteCarloResult.percentile95.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Probability of Loss</span>
                          </div>
                          <p className="text-xl font-bold">{monteCarloResult.probabilityOfLoss}%</p>
                        </div>
                        <div className="p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Probability of 50% Gain</span>
                          </div>
                          <p className="text-xl font-bold">{monteCarloResult.probabilityOfTarget}%</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('risk')}>
                    Adjust Settings
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setOptimizedPortfolio(null);
                    setMonteCarloResult(null);
                    setActiveTab('assets');
                  }}>
                    Start Over
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PortfolioOptimizer;
