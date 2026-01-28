import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Zap,
  Clock,
  BarChart3,
  Layers,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  Shield,
  Gauge
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface SecondOrderGreeks {
  vanna: number;
  charm: number;
  vomma: number;
  veta: number;
}

interface PortfolioState {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  isBalanced: boolean;
  lossFunction: number;
}

interface RegimeState {
  regime: string;
  probability: number;
  duration: number;
}

interface RebalanceAction {
  symbol: string;
  action: string;
  positionType: string;
  quantity: number;
  priority: string;
  reasoning: string;
}

interface IVSurfacePoint {
  strike: number;
  expiry: number;
  iv: number;
}

// ============================================================================
// Mock Data (Replace with real API calls)
// ============================================================================

const mockPortfolioState: PortfolioState = {
  totalDelta: 0.35,
  totalGamma: 0.08,
  totalTheta: -0.12,
  totalVega: 0.25,
  isBalanced: false,
  lossFunction: 0.42
};

const mockSecondOrderGreeks: SecondOrderGreeks = {
  vanna: 0.045,
  charm: -0.008,
  vomma: 0.12,
  veta: -0.03
};

const mockRegimeState: RegimeState = {
  regime: 'mean_reverting',
  probability: 0.72,
  duration: 8
};

const mockRebalanceActions: RebalanceAction[] = [
  {
    symbol: 'SPY',
    action: 'sell',
    positionType: 'stock',
    quantity: 35,
    priority: 'high',
    reasoning: 'Hedge portfolio delta from 0.35 toward neutral'
  },
  {
    symbol: 'SPY',
    action: 'buy',
    positionType: 'call',
    quantity: 2,
    priority: 'medium',
    reasoning: 'Add gamma exposure to benefit from large moves'
  }
];

const mockIVSurface: IVSurfacePoint[] = [
  { strike: 440, expiry: 7, iv: 0.28 },
  { strike: 445, expiry: 7, iv: 0.25 },
  { strike: 450, expiry: 7, iv: 0.22 },
  { strike: 455, expiry: 7, iv: 0.23 },
  { strike: 460, expiry: 7, iv: 0.26 },
  { strike: 440, expiry: 30, iv: 0.24 },
  { strike: 445, expiry: 30, iv: 0.22 },
  { strike: 450, expiry: 30, iv: 0.20 },
  { strike: 455, expiry: 30, iv: 0.21 },
  { strike: 460, expiry: 30, iv: 0.23 },
  { strike: 440, expiry: 60, iv: 0.23 },
  { strike: 445, expiry: 60, iv: 0.21 },
  { strike: 450, expiry: 60, iv: 0.19 },
  { strike: 455, expiry: 60, iv: 0.20 },
  { strike: 460, expiry: 60, iv: 0.22 },
];

// ============================================================================
// Components
// ============================================================================

function GreekGauge({ 
  label, 
  value, 
  target = 0, 
  min = -1, 
  max = 1,
  icon: Icon,
  color
}: { 
  label: string; 
  value: number; 
  target?: number;
  min?: number;
  max?: number;
  icon: React.ElementType;
  color: string;
}) {
  const normalizedValue = ((value - min) / (max - min)) * 100;
  const normalizedTarget = ((target - min) / (max - min)) * 100;
  const isNearTarget = Math.abs(value - target) < 0.1;
  
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-5 ${color}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
          </div>
          {isNearTarget ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              On Target
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              Adjust
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">
          {value >= 0 ? '+' : ''}{value.toFixed(3)}
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute h-full ${color} transition-all duration-500`}
            style={{ width: `${Math.max(0, Math.min(100, normalizedValue))}%` }}
          />
          <div 
            className="absolute h-full w-0.5 bg-white/50"
            style={{ left: `${normalizedTarget}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{min}</span>
          <span>Target: {target}</span>
          <span>{max}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SecondOrderGreekCard({
  label,
  value,
  description,
  trend
}: {
  label: string;
  value: number;
  description: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{value.toFixed(4)}</span>
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
      </div>
    </div>
  );
}

function RegimeIndicator({ regime, probability, duration }: RegimeState) {
  const regimeConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    bull_trending: { color: 'bg-green-500', icon: TrendingUp, label: 'Bull Trending' },
    bear_trending: { color: 'bg-red-500', icon: TrendingDown, label: 'Bear Trending' },
    mean_reverting: { color: 'bg-blue-500', icon: Activity, label: 'Mean Reverting' },
    high_volatility: { color: 'bg-orange-500', icon: Zap, label: 'High Volatility' },
    low_volatility: { color: 'bg-purple-500', icon: Minus, label: 'Low Volatility' }
  };
  
  const config = regimeConfig[regime] || regimeConfig.mean_reverting;
  const Icon = config.icon;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Market Regime</CardTitle>
          <Badge className={`${config.color} text-white`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Confidence</span>
              <span className="font-medium">{(probability * 100).toFixed(0)}%</span>
            </div>
            <Progress value={probability * 100} className="h-2" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{duration} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IVSurfaceHeatmap({ data }: { data: IVSurfacePoint[] }) {
  const strikes = Array.from(new Set(data.map(d => d.strike))).sort((a, b) => a - b);
  const expiries = Array.from(new Set(data.map(d => d.expiry))).sort((a, b) => a - b);
  
  const getColor = (iv: number) => {
    if (iv > 0.25) return 'bg-red-500';
    if (iv > 0.22) return 'bg-orange-500';
    if (iv > 0.20) return 'bg-yellow-500';
    if (iv > 0.18) return 'bg-green-500';
    return 'bg-blue-500';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">IV Surface Heatmap</CardTitle>
        <CardDescription>Implied volatility across strikes and expiries</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left">Strike / DTE</th>
                {expiries.map(exp => (
                  <th key={exp} className="p-2 text-center">{exp}d</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strikes.map(strike => (
                <tr key={strike}>
                  <td className="p-2 font-medium">${strike}</td>
                  {expiries.map(exp => {
                    const point = data.find(d => d.strike === strike && d.expiry === exp);
                    const iv = point?.iv || 0;
                    return (
                      <td key={exp} className="p-1">
                        <div 
                          className={`${getColor(iv)} text-white text-center py-1 px-2 rounded text-xs font-medium`}
                        >
                          {(iv * 100).toFixed(1)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>&lt;18%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>18-20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>20-22%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>22-25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>&gt;25%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RebalanceRecommendations({ actions }: { actions: RebalanceAction[] }) {
  const priorityConfig: Record<string, { color: string; label: string }> = {
    critical: { color: 'bg-red-500', label: 'Critical' },
    high: { color: 'bg-orange-500', label: 'High' },
    medium: { color: 'bg-yellow-500', label: 'Medium' },
    low: { color: 'bg-green-500', label: 'Low' }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Rebalancing Recommendations</CardTitle>
            <CardDescription>AI-powered position adjustments</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
            const priority = priorityConfig[action.priority] || priorityConfig.medium;
            return (
              <div key={index} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`${priority.color} text-white`}>
                      {priority.label}
                    </Badge>
                    <span className="font-medium">{action.symbol}</span>
                  </div>
                  <Badge variant="outline">
                    {action.action.toUpperCase()} {action.quantity} {action.positionType}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{action.reasoning}</p>
              </div>
            );
          })}
          {actions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Portfolio is well-balanced. No immediate action required.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LossFunctionDisplay({ 
  deltaComponent, 
  costComponent, 
  gammaComponent, 
  totalLoss 
}: { 
  deltaComponent: number;
  costComponent: number;
  gammaComponent: number;
  totalLoss: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Loss Function Breakdown</CardTitle>
        <CardDescription>L = w₁(Δ)² + w₂(Cost) - w₃(γ)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Delta Penalty (w₁Δ²)</span>
            <span className="font-mono text-sm">{deltaComponent.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Cost Penalty (w₂C)</span>
            <span className="font-mono text-sm">{costComponent.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Gamma Reward (-w₃γ)</span>
            <span className="font-mono text-sm text-green-500">{gammaComponent.toFixed(4)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Loss</span>
              <span className="font-mono font-bold text-lg">{totalLoss.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OptionsGreeksDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState('SPY');
  const [portfolioState, setPortfolioState] = useState<PortfolioState>(mockPortfolioState);
  const [secondOrderGreeks, setSecondOrderGreeks] = useState<SecondOrderGreeks>(mockSecondOrderGreeks);
  const [regimeState, setRegimeState] = useState<RegimeState>(mockRegimeState);
  const [rebalanceActions, setRebalanceActions] = useState<RebalanceAction[]>(mockRebalanceActions);
  const [ivSurface, setIVSurface] = useState<IVSurfacePoint[]>(mockIVSurface);
  const [weights, setWeights] = useState({ delta: 1.0, cost: 0.5, gamma: 0.3 });
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Options Greeks Dashboard</h1>
            <p className="text-muted-foreground">
              AI-powered Greeks optimization with Neural Volatility Surfaces
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SPY">SPY</SelectItem>
                <SelectItem value="QQQ">QQQ</SelectItem>
                <SelectItem value="IWM">IWM</SelectItem>
                <SelectItem value="AAPL">AAPL</SelectItem>
                <SelectItem value="TSLA">TSLA</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Brain className="h-4 w-4 mr-2" />
              Run Analysis
            </Button>
          </div>
        </div>
        
        {/* Portfolio Balance Alert */}
        {!portfolioState.isBalanced && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Portfolio Imbalance Detected</AlertTitle>
            <AlertDescription>
              Your portfolio has significant delta exposure ({portfolioState.totalDelta.toFixed(2)}). 
              Consider the rebalancing recommendations below.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Greeks Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GreekGauge 
            label="Delta (Δ)" 
            value={portfolioState.totalDelta}
            target={0}
            min={-1}
            max={1}
            icon={Target}
            color="bg-blue-500"
          />
          <GreekGauge 
            label="Gamma (γ)" 
            value={portfolioState.totalGamma}
            target={0.1}
            min={-0.2}
            max={0.3}
            icon={Zap}
            color="bg-green-500"
          />
          <GreekGauge 
            label="Theta (θ)" 
            value={portfolioState.totalTheta}
            target={0}
            min={-0.5}
            max={0.5}
            icon={Clock}
            color="bg-orange-500"
          />
          <GreekGauge 
            label="Vega (ν)" 
            value={portfolioState.totalVega}
            target={0}
            min={-0.5}
            max={0.5}
            icon={Activity}
            color="bg-purple-500"
          />
        </div>
        
        <Tabs defaultValue="surface" className="space-y-4">
          <TabsList>
            <TabsTrigger value="surface">IV Surface</TabsTrigger>
            <TabsTrigger value="second-order">Second-Order Greeks</TabsTrigger>
            <TabsTrigger value="regime">Market Regime</TabsTrigger>
            <TabsTrigger value="rebalance">Rebalancing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="surface" className="space-y-4">
            <IVSurfaceHeatmap data={ivSurface} />
          </TabsContent>
          
          <TabsContent value="second-order" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Second-Order Greeks</CardTitle>
                  <CardDescription>Advanced risk metrics beyond the Big Four</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SecondOrderGreekCard 
                    label="Vanna (∂Δ/∂σ)"
                    value={secondOrderGreeks.vanna}
                    description="Delta sensitivity to IV changes"
                    trend={secondOrderGreeks.vanna > 0 ? 'up' : 'down'}
                  />
                  <SecondOrderGreekCard 
                    label="Charm (∂Δ/∂t)"
                    value={secondOrderGreeks.charm}
                    description="Delta decay over time"
                    trend={secondOrderGreeks.charm > 0 ? 'up' : 'down'}
                  />
                  <SecondOrderGreekCard 
                    label="Vomma (∂ν/∂σ)"
                    value={secondOrderGreeks.vomma}
                    description="Vega convexity"
                    trend={secondOrderGreeks.vomma > 0 ? 'up' : 'down'}
                  />
                  <SecondOrderGreekCard 
                    label="Veta (∂ν/∂t)"
                    value={secondOrderGreeks.veta}
                    description="Vega decay over time"
                    trend={secondOrderGreeks.veta > 0 ? 'up' : 'down'}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Friday Effect Prediction</CardTitle>
                  <CardDescription>Market Maker hedging flow analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Pinning Probability</span>
                        <Badge variant="outline">65%</Badge>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Dominant Strike</div>
                        <div className="text-lg font-bold">$450</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">MM Hedging</div>
                        <div className="text-lg font-bold text-green-500">Buying</div>
                      </div>
                    </div>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        High probability of pinning to $450 by Friday close. 
                        Consider selling premium at this strike.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="regime" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RegimeIndicator {...regimeState} />
              
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Regime-Specific Strategies</CardTitle>
                  <CardDescription>Recommended options strategies for current regime</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-500 text-white">Best</Badge>
                        <span className="font-medium text-sm">Iron Condor</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sell OTM put spread and call spread to collect premium in range-bound market
                      </p>
                      <div className="mt-2 text-xs">
                        <span className="text-green-500">Suitability: 95%</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Good</Badge>
                        <span className="font-medium text-sm">Calendar Spread</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sell near-term, buy far-term options at same strike
                      </p>
                      <div className="mt-2 text-xs">
                        <span className="text-blue-500">Suitability: 80%</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Moderate</Badge>
                        <span className="font-medium text-sm">Short Straddle</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sell ATM call and put for maximum premium collection
                      </p>
                      <div className="mt-2 text-xs">
                        <span className="text-yellow-500">Suitability: 70%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Regime Transition Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      15% chance of transitioning to high_volatility regime (expected in 5 days)
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      10% chance of transitioning to bull_trending regime (expected in 8 days)
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rebalance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RebalanceRecommendations actions={rebalanceActions} />
              </div>
              
              <div className="space-y-4">
                <LossFunctionDisplay 
                  deltaComponent={weights.delta * Math.pow(portfolioState.totalDelta, 2)}
                  costComponent={weights.cost * 0.1}
                  gammaComponent={-weights.gamma * portfolioState.totalGamma}
                  totalLoss={portfolioState.lossFunction}
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Optimization Weights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Delta Penalty (w₁)</span>
                        <span>{weights.delta.toFixed(1)}</span>
                      </div>
                      <Slider 
                        value={[weights.delta]} 
                        min={0} 
                        max={2} 
                        step={0.1}
                        onValueChange={([v]) => setWeights(w => ({ ...w, delta: v }))}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Cost Penalty (w₂)</span>
                        <span>{weights.cost.toFixed(1)}</span>
                      </div>
                      <Slider 
                        value={[weights.cost]} 
                        min={0} 
                        max={2} 
                        step={0.1}
                        onValueChange={([v]) => setWeights(w => ({ ...w, cost: v }))}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Gamma Reward (w₃)</span>
                        <span>{weights.gamma.toFixed(1)}</span>
                      </div>
                      <Slider 
                        value={[weights.gamma]} 
                        min={0} 
                        max={1} 
                        step={0.1}
                        onValueChange={([v]) => setWeights(w => ({ ...w, gamma: v }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
