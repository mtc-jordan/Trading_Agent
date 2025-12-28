import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Scale, Brain, 
  RefreshCw, Calendar, BarChart3, PieChart as PieChartIcon,
  ArrowUp, ArrowDown, Minus, Clock, Target
} from 'lucide-react';

const AGENT_COLORS: Record<string, string> = {
  technical: '#3b82f6',
  fundamental: '#10b981',
  sentiment: '#f59e0b',
  risk: '#ef4444',
  regime: '#8b5cf6',
  execution: '#06b6d4',
  coordinator: '#ec4899',
};

const AGENT_NAMES: Record<string, string> = {
  technical: 'Technical Analysis',
  fundamental: 'Fundamental Analysis',
  sentiment: 'Sentiment Analysis',
  risk: 'Risk Management',
  regime: 'Market Regime',
  execution: 'Execution',
  coordinator: 'Coordinator',
};

const REGIME_COLORS: Record<string, string> = {
  bull: '#10b981',
  bear: '#ef4444',
  sideways: '#f59e0b',
  volatile: '#8b5cf6',
  calm: '#06b6d4',
};

export default function AgentWeightVisualization() {
  const [timeRange, setTimeRange] = useState('30');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  // Fetch weight history
  const { data: weightHistory, isLoading: historyLoading, refetch: refetchHistory } = 
    trpc.broker.getWeightHistory.useQuery({ days: parseInt(timeRange) });
  
  // Fetch current weights
  const { data: currentWeights, isLoading: weightsLoading } = 
    trpc.broker.getCurrentWeights.useQuery();
  
  // Fetch prediction stats
  const { data: predictionStats, isLoading: statsLoading } = 
    trpc.broker.getPredictionStats.useQuery({ days: parseInt(timeRange) });

  // Process weight history for charts
  const chartData = useMemo(() => {
    if (!weightHistory) return [];
    
    return weightHistory.map((snapshot: any) => ({
      date: new Date(snapshot.snapshotTimestamp).toLocaleDateString(),
      timestamp: new Date(snapshot.snapshotTimestamp).getTime(),
      regime: snapshot.marketRegime,
      ...snapshot.weights,
    }));
  }, [weightHistory]);

  // Calculate weight changes
  const weightChanges = useMemo(() => {
    if (!weightHistory || weightHistory.length < 2) return {};
    
    const latest = weightHistory[weightHistory.length - 1];
    const previous = weightHistory[weightHistory.length - 2];
    
    const changes: Record<string, number> = {};
    for (const agent of Object.keys(latest.weights)) {
      changes[agent] = (latest.weights[agent] - previous.weights[agent]) * 100;
    }
    return changes;
  }, [weightHistory]);

  // Radar chart data for current weights
  const radarData = useMemo(() => {
    if (!currentWeights) return [];
    
    return Object.entries(currentWeights).map(([agent, weight]) => ({
      agent: AGENT_NAMES[agent] || agent,
      weight: (weight as number) * 100,
      fullMark: 30,
    }));
  }, [currentWeights]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!currentWeights) return [];
    
    return Object.entries(currentWeights).map(([agent, weight]) => ({
      name: AGENT_NAMES[agent] || agent,
      value: (weight as number) * 100,
      color: AGENT_COLORS[agent] || '#888',
    }));
  }, [currentWeights]);

  // Regime distribution
  const regimeDistribution = useMemo(() => {
    if (!weightHistory) return [];
    
    const counts: Record<string, number> = {};
    weightHistory.forEach((snapshot: any) => {
      counts[snapshot.marketRegime] = (counts[snapshot.marketRegime] || 0) + 1;
    });
    
    return Object.entries(counts).map(([regime, count]) => ({
      regime,
      count,
      percentage: (count / weightHistory.length) * 100,
      color: REGIME_COLORS[regime] || '#888',
    }));
  }, [weightHistory]);

  const isLoading = historyLoading || weightsLoading || statsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Agent Weight Visualization</h1>
            <p className="text-muted-foreground mt-1">
              Track how agent weights evolve based on market conditions and performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetchHistory()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Current Weights Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentWeights && Object.entries(currentWeights).slice(0, 4).map(([agent, weight]) => (
            <Card key={agent}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: AGENT_COLORS[agent] }}
                    />
                    <span className="font-medium text-sm">{AGENT_NAMES[agent]}</span>
                  </div>
                  {weightChanges[agent] !== undefined && (
                    <Badge variant={weightChanges[agent] > 0 ? 'default' : weightChanges[agent] < 0 ? 'destructive' : 'secondary'}>
                      {weightChanges[agent] > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : 
                       weightChanges[agent] < 0 ? <ArrowDown className="w-3 h-3 mr-1" /> : 
                       <Minus className="w-3 h-3 mr-1" />}
                      {Math.abs(weightChanges[agent]).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold">{((weight as number) * 100).toFixed(1)}%</div>
                  <Progress 
                    value={(weight as number) * 100 * 3.33} 
                    className="mt-2 h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">
              <Activity className="w-4 h-4 mr-2" />
              Weight Timeline
            </TabsTrigger>
            <TabsTrigger value="distribution">
              <PieChartIcon className="w-4 h-4 mr-2" />
              Distribution
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <BarChart3 className="w-4 h-4 mr-2" />
              Agent Comparison
            </TabsTrigger>
            <TabsTrigger value="performance">
              <Target className="w-4 h-4 mr-2" />
              Performance Impact
            </TabsTrigger>
          </TabsList>

          {/* Weight Timeline */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Agent Weight Evolution</CardTitle>
                <CardDescription>
                  How each agent's influence has changed over time based on market conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis 
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                        domain={[0, 0.3]}
                        className="text-xs"
                      />
                      <Tooltip 
                        formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      {Object.keys(AGENT_COLORS).map((agent) => (
                        <Area
                          key={agent}
                          type="monotone"
                          dataKey={agent}
                          name={AGENT_NAMES[agent]}
                          stackId="1"
                          stroke={AGENT_COLORS[agent]}
                          fill={AGENT_COLORS[agent]}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Market Regime Timeline */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Market Regime History</CardTitle>
                <CardDescription>
                  Detected market conditions that influenced weight adjustments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {regimeDistribution.map((item) => (
                    <Badge 
                      key={item.regime}
                      variant="outline"
                      style={{ borderColor: item.color, color: item.color }}
                    >
                      {item.regime}: {item.percentage.toFixed(0)}%
                    </Badge>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="date" hide />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{data.date}</p>
                              <p className="text-sm" style={{ color: REGIME_COLORS[data.regime] }}>
                                Regime: {data.regime}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey={() => 1} 
                      fill="#888"
                      shape={(props: any) => {
                        const { x, y, width, height, payload } = props;
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={REGIME_COLORS[payload.regime] || '#888'}
                            rx={2}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution View */}
          <TabsContent value="distribution">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Weight Distribution</CardTitle>
                  <CardDescription>
                    How influence is distributed among the 7 agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name.split(' ')[0]}: ${value.toFixed(1)}%`}
                        outerRadius={120}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent Capability Radar</CardTitle>
                  <CardDescription>
                    Relative weight of each agent's contribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="agent" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 25]} />
                      <Radar
                        name="Weight"
                        dataKey="weight"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                      />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Agent Comparison */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Agent Weight Comparison</CardTitle>
                <CardDescription>
                  Compare how agent weights have changed over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={Object.entries(currentWeights || {}).map(([agent, weight]) => ({
                    agent: AGENT_NAMES[agent],
                    current: (weight as number) * 100,
                    change: weightChanges[agent] || 0,
                    color: AGENT_COLORS[agent],
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="agent" className="text-xs" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="current" name="Current Weight" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="change" name="Recent Change" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Individual Agent Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {currentWeights && Object.entries(currentWeights).map(([agent, weight]) => (
                <Card key={agent} className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedAgent(selectedAgent === agent ? null : agent)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${AGENT_COLORS[agent]}20` }}
                      >
                        <Brain className="w-5 h-5" style={{ color: AGENT_COLORS[agent] }} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{AGENT_NAMES[agent]}</h3>
                        <p className="text-sm text-muted-foreground">
                          {((weight as number) * 100).toFixed(1)}% influence
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Weight Change</span>
                        <span className={weightChanges[agent] > 0 ? 'text-green-500' : 
                                        weightChanges[agent] < 0 ? 'text-red-500' : ''}>
                          {weightChanges[agent] > 0 ? '+' : ''}{(weightChanges[agent] || 0).toFixed(2)}%
                        </span>
                      </div>
                      <Progress 
                        value={(weight as number) * 100 * 4}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Performance Impact */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prediction Accuracy by Agent</CardTitle>
                  <CardDescription>
                    How accurate each agent's predictions have been
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {predictionStats?.byAgent ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart 
                        data={Object.entries(predictionStats.byAgent).map(([agent, stats]: [string, any]) => ({
                          agent: AGENT_NAMES[agent] || agent,
                          accuracy: stats.accuracy,
                          contribution: stats.contribution,
                          color: AGENT_COLORS[agent],
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="agent" width={120} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Bar dataKey="accuracy" name="Accuracy" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      No prediction data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Performance Metrics</CardTitle>
                  <CardDescription>
                    Summary of prediction performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {predictionStats ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-3xl font-bold text-primary">
                            {predictionStats.overallAccuracy.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Overall Accuracy</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-3xl font-bold text-green-500">
                            {predictionStats.winRate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Predictions</span>
                          <span className="font-medium">{predictionStats.totalPredictions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Profitable</span>
                          <span className="font-medium text-green-500">{predictionStats.profitablePredictions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Loss</span>
                          <span className="font-medium text-red-500">{predictionStats.lossPredictions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Average Return</span>
                          <span className={`font-medium ${predictionStats.averageReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {predictionStats.averageReturn >= 0 ? '+' : ''}{predictionStats.averageReturn.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Profit Factor</span>
                          <span className="font-medium">
                            {predictionStats.profitFactor === Infinity ? '∞' : predictionStats.profitFactor.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3">Performance by Signal</h4>
                        <div className="space-y-2">
                          {(['buy', 'sell', 'hold'] as const).map((signal) => (
                            <div key={signal} className="flex items-center gap-3">
                              <Badge variant={signal === 'buy' ? 'default' : signal === 'sell' ? 'destructive' : 'secondary'}>
                                {signal.toUpperCase()}
                              </Badge>
                              <Progress 
                                value={predictionStats.bySignal[signal].accuracy} 
                                className="flex-1 h-2"
                              />
                              <span className="text-sm w-16 text-right">
                                {predictionStats.bySignal[signal].accuracy.toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      No performance data available
                    </div>
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
