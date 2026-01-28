import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  MessageSquare,
  Target,
  Zap,
  Clock,
  BarChart3,
  Eye,
  Lock
} from 'lucide-react';

// Demo data for the swarm intelligence system
const demoAgents = [
  { id: 'alpha_orchestrator', name: 'Alpha Orchestrator (CIO)', status: 'active', role: 'Coordination', confidence: 92, lastAction: 'Coordinating BTC analysis' },
  { id: 'onchain_auditor', name: 'On-Chain Auditor', status: 'active', role: 'Crypto Integrity', confidence: 88, lastAction: 'Scanning whale wallets' },
  { id: 'macro_strategist', name: 'Macro Strategist', status: 'active', role: 'Global Links', confidence: 85, lastAction: 'Analyzing Fed minutes' },
  { id: 'volatility_architect', name: 'Volatility Architect', status: 'active', role: 'Options/Risk', confidence: 90, lastAction: 'Calculating Vanna exposure' },
  { id: 'devils_advocate', name: 'Adversarial Bear', status: 'active', role: 'Quality Control', confidence: 78, lastAction: 'Challenging BTC long thesis' },
];

const demoDebate = {
  topic: 'Should we increase BTC allocation by 5%?',
  status: 'in_progress',
  round: 3,
  arguments: [
    { agent: 'Macro Strategist', stance: 'bullish', argument: 'Fed pivot signals risk-on environment. BTC-Nasdaq correlation at 0.72 suggests upside.', confidence: 85 },
    { agent: 'On-Chain Auditor', stance: 'bullish', argument: 'Smart money accumulating. 3 whale wallets added $50M in past 24h.', confidence: 88 },
    { agent: 'Volatility Architect', stance: 'neutral', argument: 'IV at 45% is moderate. Vanna exposure acceptable but monitor gamma.', confidence: 75 },
    { agent: 'Adversarial Bear', stance: 'bearish', argument: 'SEC filing deadline in 2 weeks. Historical pattern shows 15% drawdowns around regulatory events.', confidence: 82 },
  ],
  consensusScore: 78,
  recommendation: 'PROCEED WITH CAUTION',
};

const demoGuardrails = {
  tradingStatus: 'active',
  checks: [
    { rule: '2% Rule', status: 'passed', message: 'Trade risk within 2% limit' },
    { rule: 'Position Limit', status: 'passed', message: 'Position within 10% cap' },
    { rule: 'Sector Exposure', status: 'warning', message: 'Crypto at 35% (limit 40%)' },
    { rule: 'Correlation Kill-Switch', status: 'passed', message: 'Asset correlations normal' },
    { rule: 'Circuit Breaker', status: 'passed', message: 'Daily loss at 0.8%' },
    { rule: 'HITL Check', status: 'pending', message: 'Trade $150K requires approval' },
  ],
  pendingApprovals: 2,
  portfolioRisk: 1.8,
  dailyLoss: 0.8,
  maxDrawdown: 3.2,
};

const demoMemory = {
  totalMemories: 1247,
  winRate: 62.4,
  avgPnL: 2.3,
  topPatterns: [
    { pattern: 'high_consensus', outcome: 0.68, occurrences: 156 },
    { pattern: 'crypto_risk-on', outcome: 0.45, occurrences: 89 },
    { pattern: 'contrarian_buy', outcome: 0.32, occurrences: 67 },
  ],
  recentLessons: [
    'Strong agent consensus (>80%) correlates with 68% win rate',
    'Avoid crypto longs when VIX > 30',
    'Fed announcement days show 2x normal volatility',
    'Whale accumulation signals precede 5-day rallies 72% of time',
  ],
};

const demoAgentLeaderboard = [
  { agent: 'On-Chain Auditor', winRate: 71.2, avgPnL: 3.8, trades: 234, bestRegime: 'risk-on' },
  { agent: 'Macro Strategist', winRate: 65.8, avgPnL: 2.9, trades: 312, bestRegime: 'transition' },
  { agent: 'Volatility Architect', winRate: 63.4, avgPnL: 2.1, trades: 189, bestRegime: 'risk-off' },
  { agent: 'Adversarial Bear', winRate: 58.9, avgPnL: 1.5, trades: 156, bestRegime: 'risk-off' },
];

export default function SwarmIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              Swarm Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Elite Institutional Grade Multi-Agent Trading System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              <Activity className="h-3 w-3 mr-1" />
              System Active
            </Badge>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
              5 Agents Online
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consensus Score</p>
                  <p className="text-3xl font-bold text-purple-400">{demoDebate.consensusScore}%</p>
                </div>
                <Target className="h-10 w-10 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-3xl font-bold text-green-400">{demoMemory.winRate}%</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Risk</p>
                  <p className="text-3xl font-bold text-blue-400">{demoGuardrails.portfolioRisk}%</p>
                </div>
                <Shield className="h-10 w-10 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending HITL</p>
                  <p className="text-3xl font-bold text-amber-400">{demoGuardrails.pendingApprovals}</p>
                </div>
                <Lock className="h-10 w-10 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="debate">Agent Debate</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Active Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Active Agents
                  </CardTitle>
                  <CardDescription>Council of Experts status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="font-medium text-sm">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{agent.confidence}%</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{agent.lastAction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Debate Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Current Debate
                  </CardTitle>
                  <CardDescription>{demoDebate.topic}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Round {demoDebate.round}</Badge>
                      <Badge className={demoDebate.consensusScore >= 85 ? 'bg-green-500' : demoDebate.consensusScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}>
                        Consensus: {demoDebate.consensusScore}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {demoDebate.arguments.slice(0, 3).map((arg, i) => (
                        <div key={i} className="p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{arg.agent}</span>
                            <Badge variant="outline" className={
                              arg.stance === 'bullish' ? 'text-green-500 border-green-500/30' :
                              arg.stance === 'bearish' ? 'text-red-500 border-red-500/30' :
                              'text-gray-500 border-gray-500/30'
                            }>
                              {arg.stance}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{arg.argument}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">Recommendation: <span className="text-amber-500">{demoDebate.recommendation}</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Guardrail Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Guardrail Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {demoGuardrails.checks.map((check, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 text-center">
                      {check.status === 'passed' ? (
                        <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      ) : check.status === 'warning' ? (
                        <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                      ) : (
                        <Clock className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                      )}
                      <p className="text-xs font-medium">{check.rule}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debate Tab */}
          <TabsContent value="debate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Agent Debate System</CardTitle>
                <CardDescription>ReAct Loop: Reasoning + Action before execution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Debate Topic */}
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h3 className="font-semibold text-lg mb-2">Current Topic</h3>
                    <p className="text-muted-foreground">{demoDebate.topic}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <Badge variant="outline">Round {demoDebate.round} of 5</Badge>
                      <Progress value={demoDebate.round * 20} className="flex-1 max-w-[200px]" />
                    </div>
                  </div>

                  {/* Arguments */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Agent Arguments</h3>
                    {demoDebate.arguments.map((arg, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${
                        arg.stance === 'bullish' ? 'bg-green-500/5 border-green-500/20' :
                        arg.stance === 'bearish' ? 'bg-red-500/5 border-red-500/20' :
                        'bg-gray-500/5 border-gray-500/20'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{arg.agent}</span>
                            <Badge variant="outline" className={
                              arg.stance === 'bullish' ? 'text-green-500' :
                              arg.stance === 'bearish' ? 'text-red-500' :
                              'text-gray-500'
                            }>
                              {arg.stance === 'bullish' ? <TrendingUp className="h-3 w-3 mr-1" /> :
                               arg.stance === 'bearish' ? <TrendingDown className="h-3 w-3 mr-1" /> :
                               <Activity className="h-3 w-3 mr-1" />}
                              {arg.stance}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">Confidence: {arg.confidence}%</span>
                        </div>
                        <p className="text-sm">{arg.argument}</p>
                      </div>
                    ))}
                  </div>

                  {/* Consensus */}
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Consensus Score</h3>
                      <span className="text-2xl font-bold">{demoDebate.consensusScore}%</span>
                    </div>
                    <Progress value={demoDebate.consensusScore} className="h-3" />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>0% - Reject</span>
                      <span>85% - Execute</span>
                      <span>100%</span>
                    </div>
                    <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm font-medium text-amber-500">
                        Recommendation: {demoDebate.recommendation}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Score below 85% threshold. Consider reducing position size or waiting for more data.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guardrails Tab */}
          <TabsContent value="guardrails" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Guardrail Checks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Operational Guardrails
                  </CardTitle>
                  <CardDescription>Hard constraints for institutional trading</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoGuardrails.checks.map((check, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        check.status === 'passed' ? 'bg-green-500/5 border-green-500/20' :
                        check.status === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                        'bg-blue-500/5 border-blue-500/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {check.status === 'passed' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : check.status === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500" />
                            )}
                            <span className="font-medium">{check.rule}</span>
                          </div>
                          <Badge variant="outline" className={
                            check.status === 'passed' ? 'text-green-500' :
                            check.status === 'warning' ? 'text-amber-500' :
                            'text-blue-500'
                          }>
                            {check.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-7">{check.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* HITL Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Human-In-The-Loop Approvals
                  </CardTitle>
                  <CardDescription>Trades requiring manual approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">BTC Long Position</span>
                        <Badge variant="outline" className="text-amber-500">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Trade size $150,000 exceeds HITL threshold ($100,000)
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-500/30">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">ETH Short Position</span>
                        <Badge variant="outline" className="text-amber-500">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Current drawdown 10.2% requires approval for new trades
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-500/30">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Portfolio Risk (2% Rule)</p>
                    <div className="flex items-center gap-3">
                      <Progress value={demoGuardrails.portfolioRisk / 2 * 100} className="flex-1" />
                      <span className="font-medium">{demoGuardrails.portfolioRisk}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Max: 2% per trade</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Daily Loss</p>
                    <div className="flex items-center gap-3">
                      <Progress value={demoGuardrails.dailyLoss / 3 * 100} className="flex-1" />
                      <span className="font-medium">{demoGuardrails.dailyLoss}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Circuit breaker: 3%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Max Drawdown</p>
                    <div className="flex items-center gap-3">
                      <Progress value={demoGuardrails.maxDrawdown / 15 * 100} className="flex-1" />
                      <span className="font-medium">{demoGuardrails.maxDrawdown}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Limit: 15%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memory Tab */}
          <TabsContent value="memory" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Memory Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Agent Memory System
                  </CardTitle>
                  <CardDescription>Learning from past trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{demoMemory.totalMemories}</p>
                      <p className="text-xs text-muted-foreground">Total Memories</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-2xl font-bold text-green-500">{demoMemory.winRate}%</p>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-500/10">
                      <p className="text-2xl font-bold text-blue-500">+{demoMemory.avgPnL}%</p>
                      <p className="text-xs text-muted-foreground">Avg P&L</p>
                    </div>
                  </div>

                  <h4 className="font-medium mb-3">Top Patterns Detected</h4>
                  <div className="space-y-2">
                    {demoMemory.topPatterns.map((pattern, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm font-medium">{pattern.pattern}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{pattern.occurrences} trades</span>
                          <Badge variant="outline" className={pattern.outcome > 0 ? 'text-green-500' : 'text-red-500'}>
                            {pattern.outcome > 0 ? '+' : ''}{(pattern.outcome * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Lessons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Recent Lessons Learned
                  </CardTitle>
                  <CardDescription>Insights from past trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoMemory.recentLessons.map((lesson, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Zap className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{lesson}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Agent Performance Leaderboard
                </CardTitle>
                <CardDescription>Which agents perform best in different conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Rank</th>
                        <th className="text-left py-3 px-4">Agent</th>
                        <th className="text-right py-3 px-4">Win Rate</th>
                        <th className="text-right py-3 px-4">Avg P&L</th>
                        <th className="text-right py-3 px-4">Trades</th>
                        <th className="text-left py-3 px-4">Best Regime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoAgentLeaderboard.map((agent, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <span className={`font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : ''}`}>
                              #{i + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{agent.agent}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={agent.winRate >= 65 ? 'text-green-500' : agent.winRate >= 55 ? 'text-amber-500' : 'text-red-500'}>
                              {agent.winRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={agent.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {agent.avgPnL >= 0 ? '+' : ''}{agent.avgPnL}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{agent.trades}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{agent.bestRegime}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
