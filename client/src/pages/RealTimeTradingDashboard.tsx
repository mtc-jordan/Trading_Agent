import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, TrendingUp, TrendingDown, Zap, AlertTriangle,
  CheckCircle, Clock, Radio, Users, Target, Shield, Play, Pause, RefreshCw
} from 'lucide-react';

interface DebateUpdate {
  debateId: string;
  phase: string;
  agentId: string;
  agentName: string;
  stance: 'bullish' | 'bearish' | 'neutral';
  argument: string;
  confidence: number;
  timestamp: Date;
}

interface ConsensusUpdate {
  signalId: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  consensusScore: number;
  bullishVotes: number;
  bearishVotes: number;
  neutralVotes: number;
  readyForExecution: boolean;
  timestamp: Date;
}

interface TradeExecution {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  filledQuantity: number;
  avgPrice: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'failed';
  timestamp: Date;
}

interface Alert {
  alertId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  requiresAction: boolean;
}

export default function RealTimeTradingDashboard() {
  const [connected, setConnected] = useState(false);
  const [debates, setDebates] = useState<DebateUpdate[]>([]);
  const [consensus, setConsensus] = useState<ConsensusUpdate | null>(null);
  const [executions, setExecutions] = useState<TradeExecution[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const generateDemoData = useCallback(() => {
    if (isPaused) return;
    const agents = [
      { id: 'macro', name: 'Macro Strategist', stance: 'bullish' as const },
      { id: 'onchain', name: 'On-Chain Auditor', stance: 'bearish' as const },
      { id: 'volatility', name: 'Volatility Architect', stance: 'neutral' as const },
      { id: 'momentum', name: 'Momentum Agent', stance: 'bullish' as const },
      { id: 'devil', name: "Devil's Advocate", stance: 'bearish' as const }
    ];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const arguments_list = [
      'Strong institutional accumulation detected in the past 24 hours',
      'RSI showing overbought conditions, potential reversal ahead',
      'Funding rates turning negative, suggesting bearish sentiment',
      'Breaking above key resistance level with high volume',
      'Whale wallets showing distribution pattern',
      'Macro conditions favor risk-on assets',
      'Technical indicators showing bullish divergence'
    ];
    const newDebate: DebateUpdate = {
      debateId: `debate_${Date.now()}`,
      phase: ['research', 'analysis', 'challenge', 'verdict'][Math.floor(Math.random() * 4)],
      agentId: randomAgent.id,
      agentName: randomAgent.name,
      stance: randomAgent.stance,
      argument: arguments_list[Math.floor(Math.random() * arguments_list.length)],
      confidence: 60 + Math.floor(Math.random() * 35),
      timestamp: new Date()
    };
    setDebates(prev => [newDebate, ...prev.slice(0, 19)]);
    const bullish = 2 + Math.floor(Math.random() * 3);
    const bearish = 1 + Math.floor(Math.random() * 2);
    const neutral = 5 - bullish - bearish;
    const score = Math.round((bullish / 5) * 100);
    setConsensus({
      signalId: `signal_${Date.now()}`,
      symbol: ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA'][Math.floor(Math.random() * 5)],
      action: score > 70 ? 'buy' : score < 30 ? 'sell' : 'hold',
      consensusScore: score,
      bullishVotes: bullish,
      bearishVotes: bearish,
      neutralVotes: neutral,
      readyForExecution: score >= 85,
      timestamp: new Date()
    });
  }, [isPaused]);

  const generateDemoExecution = useCallback(() => {
    if (isPaused) return;
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const quantity = 10 + Math.floor(Math.random() * 90);
    const price = 100 + Math.random() * 400;
    const newExecution: TradeExecution = {
      orderId: `order_${Date.now()}`,
      symbol,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      quantity,
      filledQuantity: quantity,
      avgPrice: Math.round(price * 100) / 100,
      status: 'filled',
      timestamp: new Date()
    };
    setExecutions(prev => [newExecution, ...prev.slice(0, 9)]);
    const newAlert: Alert = {
      alertId: `alert_${Date.now()}`,
      type: 'success',
      title: 'Trade Executed',
      message: `${newExecution.side.toUpperCase()} ${quantity} ${symbol} @ $${newExecution.avgPrice}`,
      source: 'TradeExecution',
      timestamp: new Date(),
      requiresAction: false
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
  }, [isPaused]);

  useEffect(() => {
    setConnected(true);
    generateDemoData();
    generateDemoExecution();
    const debateInterval = setInterval(generateDemoData, 3000);
    const executionInterval = setInterval(generateDemoExecution, 8000);
    return () => {
      clearInterval(debateInterval);
      clearInterval(executionInterval);
    };
  }, [generateDemoData, generateDemoExecution]);

  const getStanceColor = (stance: string) => {
    switch (stance) {
      case 'bullish': return 'text-green-500';
      case 'bearish': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filled': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Filled</Badge>;
      case 'partial': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Partial</Badge>;
      case 'pending': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pending</Badge>;
      case 'cancelled': return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Cancelled</Badge>;
      case 'failed': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Real-Time Trading</h1>
            <p className="text-muted-foreground">Live agent debates, consensus scoring, and trade execution</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { generateDemoData(); generateDemoExecution(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consensus Score</p>
                  <p className="text-3xl font-bold text-green-400">{consensus?.consensusScore || 0}%</p>
                </div>
                <Target className="h-10 w-10 text-green-500/50" />
              </div>
              <Progress value={consensus?.consensusScore || 0} className="mt-4 h-2" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Debates</p>
                  <p className="text-3xl font-bold text-blue-400">{debates.length}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">5 agents participating</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Executions Today</p>
                  <p className="text-3xl font-bold text-purple-400">{executions.length}</p>
                </div>
                <Zap className="h-10 w-10 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{executions.filter(e => e.status === 'filled').length} filled</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className="text-3xl font-bold text-orange-400">{alerts.length}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-orange-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{alerts.filter(a => a.requiresAction).length} require action</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="debates" className="space-y-4">
          <TabsList className="bg-background/50 border">
            <TabsTrigger value="debates" className="data-[state=active]:bg-primary/20"><Radio className="h-4 w-4 mr-2" />Live Debates</TabsTrigger>
            <TabsTrigger value="consensus" className="data-[state=active]:bg-primary/20"><Target className="h-4 w-4 mr-2" />Consensus</TabsTrigger>
            <TabsTrigger value="executions" className="data-[state=active]:bg-primary/20"><Activity className="h-4 w-4 mr-2" />Executions</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-primary/20"><AlertTriangle className="h-4 w-4 mr-2" />Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="debates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-green-500 animate-pulse" />Live Agent Debates</CardTitle>
                <CardDescription>Real-time arguments and analysis from the agent council</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {debates.map((debate, index) => (
                    <div key={`${debate.debateId}_${index}`} className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{debate.phase.toUpperCase()}</Badge>
                          <span className="font-medium">{debate.agentName}</span>
                          <span className={`text-sm font-medium ${getStanceColor(debate.stance)}`}>
                            {debate.stance === 'bullish' && <TrendingUp className="h-4 w-4 inline mr-1" />}
                            {debate.stance === 'bearish' && <TrendingDown className="h-4 w-4 inline mr-1" />}
                            {debate.stance.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(debate.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{debate.argument}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <Progress value={debate.confidence} className="h-1 w-24" />
                        <span className="text-xs font-medium">{debate.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consensus" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Current Consensus</CardTitle>
                <CardDescription>Aggregated signal from all agents</CardDescription>
              </CardHeader>
              <CardContent>
                {consensus && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Symbol</p>
                        <p className="text-3xl font-bold">{consensus.symbol}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Action</p>
                        <Badge className={`text-lg px-4 py-2 ${consensus.action === 'buy' ? 'bg-green-500/20 text-green-400 border-green-500/30' : consensus.action === 'sell' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                          {consensus.action.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Score</p>
                        <p className={`text-3xl font-bold ${consensus.consensusScore >= 85 ? 'text-green-400' : consensus.consensusScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{consensus.consensusScore}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                        <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-400">{consensus.bullishVotes}</p>
                        <p className="text-sm text-muted-foreground">Bullish Votes</p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                        <Activity className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-yellow-400">{consensus.neutralVotes}</p>
                        <p className="text-sm text-muted-foreground">Neutral Votes</p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                        <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-400">{consensus.bearishVotes}</p>
                        <p className="text-sm text-muted-foreground">Bearish Votes</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-2">
                        {consensus.readyForExecution ? (
                          <><CheckCircle className="h-5 w-5 text-green-500" /><span className="text-green-400 font-medium">Ready for Execution</span></>
                        ) : (
                          <><Clock className="h-5 w-5 text-yellow-500" /><span className="text-yellow-400 font-medium">Below Threshold (85%)</span></>
                        )}
                      </div>
                      <Button disabled={!consensus.readyForExecution} className={consensus.readyForExecution ? 'bg-green-600 hover:bg-green-700' : ''}>
                        <Zap className="h-4 w-4 mr-2" />Execute Trade
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Trade Executions</CardTitle>
                <CardDescription>Recent trade executions from the AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {executions.map((execution, index) => (
                    <div key={`${execution.orderId}_${index}`} className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${execution.side === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {execution.side === 'buy' ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                        </div>
                        <div>
                          <p className="font-medium">{execution.side.toUpperCase()} {execution.quantity} {execution.symbol}</p>
                          <p className="text-sm text-muted-foreground">@ ${execution.avgPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">${(execution.quantity * execution.avgPrice).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(execution.timestamp).toLocaleTimeString()}</p>
                        </div>
                        {getStatusBadge(execution.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />System Alerts</CardTitle>
                <CardDescription>Important notifications and required actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div key={`${alert.alertId}_${index}`} className={`flex items-start gap-4 p-4 rounded-lg border ${alert.type === 'error' ? 'bg-red-500/10 border-red-500/20' : alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : alert.type === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                      <div className={`p-2 rounded-lg ${alert.type === 'error' ? 'bg-red-500/20' : alert.type === 'warning' ? 'bg-yellow-500/20' : alert.type === 'success' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                        {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {alert.type === 'info' && <Shield className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{alert.title}</p>
                          <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">Source: {alert.source}</p>
                      </div>
                      {alert.requiresAction && <Button size="sm" variant="outline">Take Action</Button>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
