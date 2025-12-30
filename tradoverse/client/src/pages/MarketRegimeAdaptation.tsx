import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Settings,
  RefreshCw,
  BarChart3,
  Zap,
  Shield,
  Brain,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

// Regime colors
const REGIME_COLORS: Record<string, string> = {
  bull_trending: '#22c55e',
  bear_trending: '#ef4444',
  sideways_range: '#f59e0b',
  high_volatility: '#8b5cf6',
  crisis: '#dc2626',
  recovery: '#06b6d4',
  euphoria: '#f97316',
  capitulation: '#6b7280'
};

// Regime icons
const REGIME_ICONS: Record<string, React.ReactNode> = {
  bull_trending: <TrendingUp className="h-5 w-5 text-green-500" />,
  bear_trending: <TrendingDown className="h-5 w-5 text-red-500" />,
  sideways_range: <Minus className="h-5 w-5 text-yellow-500" />,
  high_volatility: <Activity className="h-5 w-5 text-purple-500" />,
  crisis: <AlertTriangle className="h-5 w-5 text-red-600" />,
  recovery: <RefreshCw className="h-5 w-5 text-cyan-500" />,
  euphoria: <Zap className="h-5 w-5 text-orange-500" />,
  capitulation: <Shield className="h-5 w-5 text-gray-500" />
};

// Agent colors for radar chart
const AGENT_COLORS = {
  technical: '#3b82f6',
  fundamental: '#22c55e',
  sentiment: '#a855f7',
  risk: '#ef4444',
  regime: '#f59e0b',
  execution: '#06b6d4'
};

interface RegimeState {
  currentRegime: string;
  confidence: number;
  previousRegime: string | null;
  regimeChangeDetected: boolean;
  indicators: {
    volatility: number;
    trend: number;
    momentum: number;
    sentiment: number;
    volume: number;
  };
  timestamp: number;
}

interface AgentWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  risk: number;
  regime: number;
  execution: number;
}

interface AdaptationConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  minConfidenceThreshold: number;
  cooldownPeriodMs: number;
  maxWeightChange: number;
  notifyOnChange: boolean;
}

export default function MarketRegimeAdaptation() {
  const [config, setConfig] = useState<AdaptationConfig>({
    enabled: true,
    sensitivity: 'medium',
    minConfidenceThreshold: 60,
    cooldownPeriodMs: 3600000,
    maxWeightChange: 0.15,
    notifyOnChange: true
  });

  const [currentRegime, setCurrentRegime] = useState<RegimeState | null>(null);
  const [currentWeights, setCurrentWeights] = useState<AgentWeights>({
    technical: 0.20,
    fundamental: 0.20,
    sentiment: 0.15,
    risk: 0.15,
    regime: 0.15,
    execution: 0.15
  });

  const [regimeHistory, setRegimeHistory] = useState<Array<{
    regime: string;
    startTime: number;
    duration: number | null;
  }>>([]);

  const getConfig = trpc.broker.getRegimeAdaptationConfig.useQuery();
  const updateConfig = trpc.broker.updateRegimeAdaptationConfig.useMutation();
  const detectRegime = trpc.broker.detectMarketRegime.useMutation();
  const adaptWeights = trpc.broker.autoAdaptWeights.useMutation();
  const getHistory = trpc.broker.getRegimeHistory.useQuery();
  const getStatistics = trpc.broker.getRegimeStatistics.useQuery();

  useEffect(() => {
    if (getConfig.data) {
      setConfig(getConfig.data);
    }
  }, [getConfig.data]);

  useEffect(() => {
    if (getHistory.data) {
      setRegimeHistory(getHistory.data);
    }
  }, [getHistory.data]);

  const handleDetectRegime = async () => {
    try {
      // Generate sample market data for demo
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.random() * 20 - 10 + i * 0.5);
      const volumes = Array.from({ length: 30 }, () => 1000000 + Math.random() * 500000);
      const highs = prices.map(p => p + Math.random() * 2);
      const lows = prices.map(p => p - Math.random() * 2);

      const result = await detectRegime.mutateAsync({
        prices,
        volumes,
        highs,
        lows,
        symbol: 'SPY'
      });
      setCurrentRegime(result as RegimeState);
    } catch (error) {
      console.error('Failed to detect regime:', error);
    }
  };

  const handleAdaptWeights = async () => {
    try {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.random() * 20 - 10 + i * 0.5);
      const volumes = Array.from({ length: 30 }, () => 1000000 + Math.random() * 500000);
      const highs = prices.map(p => p + Math.random() * 2);
      const lows = prices.map(p => p - Math.random() * 2);

      const result = await adaptWeights.mutateAsync({
        currentWeights,
        marketData: { prices, volumes, highs, lows }
      });

      if (result.adapted && result.recommendation) {
        setCurrentWeights(result.recommendation.recommendedWeights);
      }
    } catch (error) {
      console.error('Failed to adapt weights:', error);
    }
  };

  const handleConfigChange = async (updates: Partial<AdaptationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await updateConfig.mutateAsync(newConfig);
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  // Prepare radar chart data
  const radarData = Object.entries(currentWeights).map(([key, value]) => ({
    agent: key.charAt(0).toUpperCase() + key.slice(1),
    weight: value * 100,
    fullMark: 100
  }));

  // Prepare pie chart data for regime distribution
  const pieData = getStatistics.data?.regimeDistribution
    ? Object.entries(getStatistics.data.regimeDistribution)
        .filter(([_, count]) => count > 0)
        .map(([regime, count]) => ({
          name: regime.replace('_', ' '),
          value: count,
          color: REGIME_COLORS[regime]
        }))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Market Regime Auto-Adaptation</h1>
            <p className="text-muted-foreground mt-1">
              Automatically detect market regimes and adjust agent weights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={config.enabled ? 'default' : 'secondary'} className="flex items-center gap-2">
              {config.enabled ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {config.enabled ? 'Auto-Adaptation ON' : 'Auto-Adaptation OFF'}
            </Badge>
            <Button onClick={handleDetectRegime} disabled={detectRegime.isPending}>
              <Activity className="h-4 w-4 mr-2" />
              {detectRegime.isPending ? 'Detecting...' : 'Detect Regime'}
            </Button>
          </div>
        </div>

        {/* Current Regime Card */}
        {currentRegime && (
          <Card className={`border-2 ${currentRegime.regimeChangeDetected ? 'border-yellow-500' : 'border-border'}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {REGIME_ICONS[currentRegime.currentRegime]}
                  Current Market Regime
                </span>
                {currentRegime.regimeChangeDetected && (
                  <Badge variant="destructive" className="animate-pulse">
                    Regime Change Detected!
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-2xl font-bold capitalize" style={{ color: REGIME_COLORS[currentRegime.currentRegime] }}>
                    {currentRegime.currentRegime.replace('_', ' ')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <Progress value={currentRegime.confidence} className="h-2 w-24" />
                    <span className="text-sm font-medium">{currentRegime.confidence}%</span>
                  </div>
                  {currentRegime.previousRegime && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span className="capitalize">{currentRegime.previousRegime.replace('_', ' ')}</span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="capitalize font-medium">{currentRegime.currentRegime.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Market Indicators</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volatility:</span>
                      <span>{currentRegime.indicators.volatility.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trend:</span>
                      <span>{currentRegime.indicators.trend.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Momentum:</span>
                      <span>{currentRegime.indicators.momentum.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sentiment:</span>
                      <span>{currentRegime.indicators.sentiment.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <Button 
                    onClick={handleAdaptWeights} 
                    disabled={adaptWeights.isPending || !config.enabled}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {adaptWeights.isPending ? 'Adapting...' : 'Adapt Weights Now'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Manually trigger weight adaptation based on current regime
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Weights Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Current Agent Weights
              </CardTitle>
              <CardDescription>
                Weight distribution across the 6 trading agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="agent" />
                    <PolarRadiusAxis angle={30} domain={[0, 40]} />
                    <Radar
                      name="Weight %"
                      dataKey="weight"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.5}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {Object.entries(currentWeights).map(([agent, weight]) => (
                  <div key={agent} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm capitalize">{agent}</span>
                    <Badge variant="outline">{(weight * 100).toFixed(0)}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Auto-Adaptation Settings
              </CardTitle>
              <CardDescription>
                Configure how the system responds to regime changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Auto-Adaptation</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically adjust weights when regime changes
                  </div>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) => handleConfigChange({ enabled })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Sensitivity</span>
                  <Select
                    value={config.sensitivity}
                    onValueChange={(v: 'low' | 'medium' | 'high') => handleConfigChange({ sensitivity: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Higher sensitivity means faster response to regime changes
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Confidence Threshold</span>
                  <span className="text-sm">{config.minConfidenceThreshold}%</span>
                </div>
                <Slider
                  value={[config.minConfidenceThreshold]}
                  onValueChange={([v]) => handleConfigChange({ minConfidenceThreshold: v })}
                  min={30}
                  max={90}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum confidence required to trigger adaptation
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Max Weight Change</span>
                  <span className="text-sm">{(config.maxWeightChange * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.maxWeightChange * 100]}
                  onValueChange={([v]) => handleConfigChange({ maxWeightChange: v / 100 })}
                  min={5}
                  max={30}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum change allowed per adaptation cycle
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Notify on Change</div>
                  <div className="text-sm text-muted-foreground">
                    Send notification when weights are adapted
                  </div>
                </div>
                <Switch
                  checked={config.notifyOnChange}
                  onCheckedChange={(notifyOnChange) => handleConfigChange({ notifyOnChange })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics and History */}
        <Tabs defaultValue="statistics">
          <TabsList>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="history">Regime History</TabsTrigger>
            <TabsTrigger value="presets">Regime Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {getStatistics.data?.totalRegimeChanges || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Regime Changes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {getStatistics.data?.averageRegimeDuration 
                      ? `${Math.round(getStatistics.data.averageRegimeDuration / 3600000)}h`
                      : '0h'}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Regime Duration</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {getStatistics.data?.currentStreak || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="h-32">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data yet
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground text-center">Regime Distribution</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                {regimeHistory.length > 0 ? (
                  <div className="space-y-2">
                    {regimeHistory.slice(-10).reverse().map((entry, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {REGIME_ICONS[entry.regime]}
                          <div>
                            <div className="font-medium capitalize">
                              {entry.regime.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(entry.startTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {entry.duration 
                            ? `${Math.round(entry.duration / 60000)} min`
                            : 'Active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Clock className="h-12 w-12 mb-4 opacity-50" />
                    <p>No regime history yet</p>
                    <p className="text-sm">Start detecting regimes to build history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="presets">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(REGIME_COLORS).map(([regime, color]) => (
                <Card key={regime} className="border-l-4" style={{ borderLeftColor: color }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {REGIME_ICONS[regime]}
                      <span className="capitalize">{regime.replace('_', ' ')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Technical</span>
                        <span>20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fundamental</span>
                        <span>20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sentiment</span>
                        <span>15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk</span>
                        <span>15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regime</span>
                        <span>15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Execution</span>
                        <span>15%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
