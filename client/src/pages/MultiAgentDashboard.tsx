import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Brain, TrendingUp, TrendingDown, Activity, Shield, AlertTriangle, Zap, BarChart3, LineChart, Target, Network, RefreshCw, Play, Pause, Settings } from "lucide-react";

interface AgentStatus {
  name: string;
  icon: React.ReactNode;
  specialty: string;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence: number;
  lastUpdate: Date;
  indicators: Record<string, number | string>;
  reasoning: string;
}

interface ArbitrageOpportunity {
  pair: string;
  zScore: number;
  expectedReturn: number;
  timeHorizon: string;
  action: string;
}

interface KillSwitchMetrics {
  isTriggered: boolean;
  severity: "warning" | "critical" | "emergency";
  var95: number;
  var99: number;
  ivSkew: number;
  fearLevel: number;
  correlationAlert: boolean;
  recommendedAction: string;
}

const mockAgents: AgentStatus[] = [
  { name: "MacroSentinel", icon: <Brain className="h-5 w-5" />, specialty: "Commodities & News (NLP)", signal: "buy", confidence: 0.78, lastUpdate: new Date(), indicators: { opecSentiment: 0.65, supplyChainRisk: 0.3, geopoliticalScore: 0.45 }, reasoning: "OPEC+ production cuts signal bullish commodities outlook" },
  { name: "DeltaHedger", icon: <Target className="h-5 w-5" />, specialty: "Options (RL/PPO)", signal: "hold", confidence: 0.72, lastUpdate: new Date(), indicators: { deltaExposure: -0.15, gammaRisk: 0.08, thetaDecay: -0.02, vegaExposure: 0.12 }, reasoning: "Greeks balanced, IV crush risk moderate" },
  { name: "AlphaChaser", icon: <TrendingUp className="h-5 w-5" />, specialty: "Stocks & ETFs (XGBoost)", signal: "strong_buy", confidence: 0.85, lastUpdate: new Date(), indicators: { momentumScore: 0.82, valueScore: 0.68, qualityScore: 0.75, growthScore: 0.79 }, reasoning: "Strong factor alignment across momentum and quality" },
  { name: "ChainTracker", icon: <Network className="h-5 w-5" />, specialty: "Crypto (GNN)", signal: "buy", confidence: 0.71, lastUpdate: new Date(), indicators: { whaleActivity: 0.6, exchangeInflow: -0.2, networkGrowth: 0.45, defiTVL: 0.55 }, reasoning: "Whale accumulation detected, exchange outflows bullish" },
  { name: "Executioner", icon: <Zap className="h-5 w-5" />, specialty: "Portfolio (Deep RL)", signal: "buy", confidence: 0.76, lastUpdate: new Date(), indicators: { slippageOptimal: 0.85, timingScore: 0.72, liquidityScore: 0.88, executionQuality: 0.81 }, reasoning: "Optimal execution window in Asian session" }
];

const mockArbitrage: ArbitrageOpportunity[] = [
  { pair: "SPY/BTC", zScore: 2.45, expectedReturn: 0.032, timeHorizon: "3-7 days", action: "Short SPY, Long BTC" },
  { pair: "GLD/SLV", zScore: -2.12, expectedReturn: 0.018, timeHorizon: "1-2 weeks", action: "Long GLD, Short SLV" },
  { pair: "AAPL/MSFT", zScore: 2.08, expectedReturn: 0.015, timeHorizon: "1-3 days", action: "Short AAPL, Long MSFT" }
];

const mockKillSwitch: KillSwitchMetrics = {
  isTriggered: false,
  severity: "warning",
  var95: 12500,
  var99: 18750,
  ivSkew: 0.08,
  fearLevel: 0.35,
  correlationAlert: false,
  recommendedAction: "Continue normal operations"
};

const getSignalColor = (signal: string) => {
  switch (signal) {
    case "strong_buy": return "bg-emerald-500";
    case "buy": return "bg-green-500";
    case "hold": return "bg-yellow-500";
    case "sell": return "bg-orange-500";
    case "strong_sell": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const getSignalText = (signal: string) => {
  switch (signal) {
    case "strong_buy": return "STRONG BUY";
    case "buy": return "BUY";
    case "hold": return "HOLD";
    case "sell": return "SELL";
    case "strong_sell": return "STRONG SELL";
    default: return "UNKNOWN";
  }
};

export default function MultiAgentDashboard() {
  const [agents] = useState<AgentStatus[]>(mockAgents);
  const [arbitrage] = useState<ArbitrageOpportunity[]>(mockArbitrage);
  const [killSwitch] = useState<KillSwitchMetrics>(mockKillSwitch);
  const [isRunning, setIsRunning] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);

  const calculateConsensus = () => {
    const signalScores: Record<string, number> = { strong_buy: 2, buy: 1, hold: 0, sell: -1, strong_sell: -2 };
    const totalScore = agents.reduce((sum, agent) => sum + signalScores[agent.signal] * agent.confidence, 0);
    const avgScore = totalScore / agents.length;
    if (avgScore >= 1.2) return { signal: "strong_buy", score: avgScore };
    if (avgScore >= 0.4) return { signal: "buy", score: avgScore };
    if (avgScore <= -1.2) return { signal: "strong_sell", score: avgScore };
    if (avgScore <= -0.4) return { signal: "sell", score: avgScore };
    return { signal: "hold", score: avgScore };
  };

  const consensus = calculateConsensus();
  const avgConfidence = agents.reduce((sum, a) => sum + a.confidence, 0) / agents.length;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Agent Trading System</h1>
          <p className="text-muted-foreground">5 Specialized AI Agents • Cross-Asset Arbitrage • Kill-Switch Protection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunning ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button variant="outline" size="sm"><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      {killSwitch.isTriggered && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kill-Switch {killSwitch.severity.toUpperCase()}</AlertTitle>
          <AlertDescription>{killSwitch.recommendedAction}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Multi-Agent Consensus</CardTitle>
            <CardDescription>Weighted signal from all 5 agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getSignalColor(consensus.signal)}`}>
                  {consensus.signal.includes("buy") ? <TrendingUp className="h-8 w-8 text-white" /> : consensus.signal.includes("sell") ? <TrendingDown className="h-8 w-8 text-white" /> : <Activity className="h-8 w-8 text-white" />}
                </div>
                <div>
                  <div className="text-2xl font-bold">{getSignalText(consensus.signal)}</div>
                  <div className="text-sm text-muted-foreground">Score: {consensus.score.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
                <div className="text-2xl font-bold">{(avgConfidence * 100).toFixed(0)}%</div>
                <Progress value={avgConfidence * 100} className="w-32 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" />Kill-Switch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm">Status</span><Badge variant={killSwitch.isTriggered ? "destructive" : "secondary"}>{killSwitch.isTriggered ? "ACTIVE" : "Normal"}</Badge></div>
              <div className="flex justify-between"><span className="text-sm">VaR 95%</span><span className="font-mono">${killSwitch.var95.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-sm">Fear Level</span><Progress value={killSwitch.fearLevel * 100} className="w-20" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" />Arbitrage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm">Opportunities</span><Badge>{arbitrage.length}</Badge></div>
              <div className="flex justify-between"><span className="text-sm">Best Z-Score</span><span className="font-mono">{Math.max(...arbitrage.map(a => Math.abs(a.zScore))).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-sm">Avg Return</span><span className="font-mono text-green-500">+{(arbitrage.reduce((s, a) => s + a.expectedReturn, 0) / arbitrage.length * 100).toFixed(1)}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">5 Specialized Agents</TabsTrigger>
          <TabsTrigger value="arbitrage">Statistical Arbitrage</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.name} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedAgent(agent)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {agent.icon}
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                    </div>
                    <Badge className={getSignalColor(agent.signal)}>{getSignalText(agent.signal)}</Badge>
                  </div>
                  <CardDescription>{agent.specialty}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <div className="flex items-center gap-2">
                        <Progress value={agent.confidence * 100} className="w-24" />
                        <span className="text-sm font-mono">{(agent.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <Separator />
                    <p className="text-sm text-muted-foreground line-clamp-2">{agent.reasoning}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(agent.indicators).slice(0, 3).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">{key}: {typeof value === "number" ? value.toFixed(2) : value}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Asset Statistical Arbitrage</CardTitle>
              <CardDescription>Z-Score based mean-reversion opportunities (threshold: ±2.0)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {arbitrage.map((opp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${opp.zScore > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                        <LineChart className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-semibold">{opp.pair}</div>
                        <div className="text-sm text-muted-foreground">{opp.action}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono">{opp.zScore > 0 ? "+" : ""}{opp.zScore.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Z-Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-500">+{(opp.expectedReturn * 100).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Expected Return</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{opp.timeHorizon}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Kill-Switch Status</CardTitle>
                <CardDescription>VaR, IV Skew, and Correlation Monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">VaR 95% (24h)</div>
                    <div className="text-2xl font-bold">${killSwitch.var95.toLocaleString()}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">VaR 99% (24h)</div>
                    <div className="text-2xl font-bold">${killSwitch.var99.toLocaleString()}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>IV Skew</span><span className="font-mono">{(killSwitch.ivSkew * 100).toFixed(1)}%</span></div>
                  <Progress value={killSwitch.ivSkew * 100 / 0.3 * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Fear Level</span><span className="font-mono">{(killSwitch.fearLevel * 100).toFixed(0)}%</span></div>
                  <Progress value={killSwitch.fearLevel * 100} />
                </div>
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertTitle>Recommended Action</AlertTitle>
                  <AlertDescription>{killSwitch.recommendedAction}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlation Matrix</CardTitle>
                <CardDescription>Cross-asset correlation convergence detection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><span>Stocks ↔ Crypto</span><Progress value={65} className="w-32" /><span className="font-mono">0.65</span></div>
                  <div className="flex justify-between items-center"><span>Stocks ↔ Commodities</span><Progress value={45} className="w-32" /><span className="font-mono">0.45</span></div>
                  <div className="flex justify-between items-center"><span>Crypto ↔ Commodities</span><Progress value={38} className="w-32" /><span className="font-mono">0.38</span></div>
                  <div className="flex justify-between items-center"><span>Average Correlation</span><Progress value={49} className="w-32" /><span className="font-mono">0.49</span></div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center gap-2">
                  <Badge variant={killSwitch.correlationAlert ? "destructive" : "secondary"}>
                    {killSwitch.correlationAlert ? "CONVERGENCE ALERT" : "Normal Dispersion"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Threshold: 0.80</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Execution Timeline</CardTitle>
              <CardDescription>Recent coordinated trading decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Bullish Bull Strategy</div>
                          <Badge>BUY</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Consensus from 5 agents • Confidence: 78% • 3 arbitrage opportunities
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">AAPL +5%</Badge>
                          <Badge variant="outline">BTC +3%</Badge>
                          <Badge variant="outline">GLD +2%</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{i * 15}m ago</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedAgent(null)}>
          <Card className="w-full max-w-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedAgent.icon}
                  <CardTitle>{selectedAgent.name}</CardTitle>
                </div>
                <Badge className={getSignalColor(selectedAgent.signal)}>{getSignalText(selectedAgent.signal)}</Badge>
              </div>
              <CardDescription>{selectedAgent.specialty}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Analysis Reasoning</h4>
                <p className="text-muted-foreground">{selectedAgent.reasoning}</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Key Indicators</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedAgent.indicators).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 border rounded">
                      <span className="text-sm">{key}</span>
                      <span className="font-mono">{typeof value === "number" ? value.toFixed(3) : value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedAgent(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
