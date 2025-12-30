import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Target,
  Shield,
  Zap,
  Clock,
  BarChart3,
  Award,
  Crown,
  ChevronUp,
  ChevronDown,
  Activity,
  Users,
  Brain,
  Eye
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

// Rank colors
function getRankColor(rank: number): string {
  switch (rank) {
    case 1: return '#ffd700';
    case 2: return '#c0c0c0';
    case 3: return '#cd7f32';
    default: return '#6b7280';
  }
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2: return <Medal className="h-5 w-5 text-gray-400" />;
    case 3: return <Medal className="h-5 w-5 text-amber-600" />;
    default: return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  }
}

function getTrendIcon(change: number) {
  if (change > 0) return <ChevronUp className="h-4 w-4 text-green-500" />;
  if (change < 0) return <ChevronDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
}

function getBadgeRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500';
    case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    default: return 'bg-gray-500';
  }
}

export default function AgentLeaderboard() {
  const [timeFrame, setTimeFrame] = useState('1m');
  const [marketCondition, setMarketCondition] = useState<string>('all');
  const [agentType, setAgentType] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const leaderboard = trpc.broker.getAgentLeaderboard.useQuery({
    timeFrame,
    marketCondition: marketCondition === 'all' ? undefined : marketCondition,
    agentType: agentType === 'all' ? undefined : agentType,
  });
  
  const stats = trpc.broker.getLeaderboardStats.useQuery();
  const conditions = trpc.broker.getMarketConditions.useQuery();
  const agentTypes = trpc.broker.getAgentTypes.useQuery();
  const badges = trpc.broker.getAllBadges.useQuery();
  
  const agentDetails = trpc.broker.getAgentDetails.useQuery(
    { agentId: selectedAgent!, timeFrame },
    { enabled: !!selectedAgent }
  );

  // Radar chart data for selected agent
  const radarData = useMemo(() => {
    if (!agentDetails.data) return [];
    const agent = agentDetails.data;
    return [
      { metric: 'Accuracy', value: agent.accuracy * 100 },
      { metric: 'Returns', value: Math.min(100, agent.avgReturn * 500) },
      { metric: 'Sharpe', value: Math.min(100, agent.sharpeRatio * 33) },
      { metric: 'Win Rate', value: agent.winRate * 100 },
      { metric: 'Consistency', value: 100 - agent.maxDrawdown * 500 },
    ];
  }, [agentDetails.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Agent Performance Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare AI agent performance across market conditions
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {stats.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Agents</p>
                    <p className="text-3xl font-bold">{stats.data.totalAgents}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <Brain className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Signals</p>
                    <p className="text-3xl font-bold">{stats.data.totalSignals.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/20">
                    <Activity className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                    <p className="text-3xl font-bold">{(stats.data.avgAccuracy * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/20">
                    <Target className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Performer</p>
                    <p className="text-lg font-bold truncate">{stats.data.topPerformer}</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Frame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="1w">1 Week</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={marketCondition} onValueChange={setMarketCondition}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Market Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {conditions.data?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agentType} onValueChange={setAgentType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Agent Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {agentTypes.data?.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Rankings
              </CardTitle>
              <CardDescription>
                {marketCondition !== 'all' 
                  ? `Performance in ${conditions.data?.find((c: any) => c.id === marketCondition)?.name || marketCondition}`
                  : 'Overall performance across all conditions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.data?.map((entry: any) => (
                  <div
                    key={entry.agent.agentId}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedAgent === entry.agent.agentId
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedAgent(entry.agent.agentId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-16">
                          {getRankIcon(entry.rank)}
                          <div className="flex items-center">
                            {getTrendIcon(entry.rankChange)}
                            {entry.rankChange !== 0 && (
                              <span className={`text-xs ${entry.rankChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {Math.abs(entry.rankChange)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium">{entry.agent.agentName}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {entry.agent.agentType.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Accuracy</p>
                          <p className="font-medium">{(entry.agent.accuracy * 100).toFixed(1)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Returns</p>
                          <p className={`font-medium ${entry.agent.avgReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {entry.agent.avgReturn >= 0 ? '+' : ''}{(entry.agent.avgReturn * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Sharpe</p>
                          <p className="font-medium">{entry.agent.sharpeRatio.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-1">
                          {entry.agent.badges.slice(0, 3).map((badge: any) => (
                            <span key={badge.id} title={badge.name} className="text-lg">
                              {badge.icon}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Performance bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Win Rate</span>
                        <span>{(entry.agent.winRate * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={entry.agent.winRate * 100} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Agent Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Brain className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select an agent to view details</p>
                </div>
              ) : agentDetails.isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : agentDetails.data ? (
                <div className="space-y-6">
                  {/* Agent Info */}
                  <div>
                    <h3 className="font-bold text-lg">{agentDetails.data.agentName}</h3>
                    <p className="text-sm text-muted-foreground">{agentDetails.data.description}</p>
                    <Badge variant="outline" className="mt-2 capitalize">
                      {agentDetails.data.agentType.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Radar Chart */}
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="metric" stroke="#666" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#666" />
                        <Radar
                          name="Performance"
                          dataKey="value"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Total Signals</p>
                      <p className="font-bold">{agentDetails.data.totalSignals}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Profit Factor</p>
                      <p className="font-bold">{agentDetails.data.profitFactor.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Max Drawdown</p>
                      <p className="font-bold text-red-500">-{(agentDetails.data.maxDrawdown * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Avg Hold Time</p>
                      <p className="font-bold">{agentDetails.data.avgHoldingPeriod.toFixed(1)}d</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Earned Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      {agentDetails.data.badges.map((badge: any) => (
                        <div
                          key={badge.id}
                          className={`px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-1 ${getBadgeRarityColor(badge.rarity)}`}
                          title={badge.description}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Signals */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Signals</h4>
                    <div className="space-y-2">
                      {agentDetails.data.recentSignals.slice(0, 5).map((signal: any, index: number) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={signal.direction === 'buy' ? 'default' : signal.direction === 'sell' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {signal.direction.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{signal.symbol}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={signal.outcome === 'win' ? 'default' : signal.outcome === 'loss' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {signal.outcome === 'pending' ? '⏳' : signal.outcome === 'win' ? '✓' : '✗'}
                            </Badge>
                            {signal.returnPercent !== undefined && (
                              <span className={`text-xs ${signal.returnPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {signal.returnPercent >= 0 ? '+' : ''}{signal.returnPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* All Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievement Badges
            </CardTitle>
            <CardDescription>
              Badges agents can earn through exceptional performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {badges.data?.map((badge: any) => (
                <div 
                  key={badge.id}
                  className="p-4 rounded-lg border text-center"
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <p className="font-medium mt-2">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  <Badge 
                    variant="outline" 
                    className={`mt-2 capitalize ${
                      badge.rarity === 'legendary' ? 'border-yellow-500 text-yellow-500' :
                      badge.rarity === 'epic' ? 'border-purple-500 text-purple-500' :
                      badge.rarity === 'rare' ? 'border-blue-500 text-blue-500' :
                      ''
                    }`}
                  >
                    {badge.rarity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Condition Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Market Condition
            </CardTitle>
            <CardDescription>
              How each agent performs in different market environments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Agent</th>
                    {conditions.data?.map((c: any) => (
                      <th key={c.id} className="text-center py-3 px-2 text-sm">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.data?.map((entry: any) => (
                    <tr key={entry.agent.agentId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{entry.agent.agentName}</td>
                      {conditions.data?.map((c: any) => {
                        const perf = entry.agent.conditionPerformance[c.id];
                        return (
                          <td key={c.id} className="text-center py-3 px-2">
                            <div className="flex flex-col items-center">
                              <Badge 
                                variant={perf?.rank <= 2 ? 'default' : perf?.rank <= 4 ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                #{perf?.rank || '-'}
                              </Badge>
                              <span className={`text-xs mt-1 ${
                                perf?.avgReturn >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {perf?.avgReturn >= 0 ? '+' : ''}{((perf?.avgReturn || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
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
      </div>
    </DashboardLayout>
  );
}
