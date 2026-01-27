/**
 * Advanced AI Analysis Dashboard
 * 
 * Comprehensive dashboard showing:
 * - Agent explainability (how each agent reached its decision)
 * - Cross-asset correlation breakdown
 * - Alternative data signals
 * - RL strategy recommendations
 * - Round Table discussion visualization
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  BarChart3,
  Users,
  Lightbulb,
  Target,
  Activity,
  Zap,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AgentDecision {
  agentName: string;
  agentRole: string;
  signal: string;
  confidence: number;
  reasoning: string;
  keyFindings: string[];
  dataPoints: Record<string, any>;
  recommendations: string[];
}

interface RoundTableContribution {
  agent: string;
  statement: string;
  referencedAgents?: string[];
  buildingOn?: string;
}

interface AdvancedAIAnalysisDashboardProps {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'option' | 'forex' | 'commodity';
}

export function AdvancedAIAnalysisDashboard({ symbol, assetType }: AdvancedAIAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [riskTolerance, setRiskTolerance] = useState([50]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mock data for demonstration (in production, would come from tRPC)
  const [analysisResult, setAnalysisResult] = useState<{
    agents: AgentDecision[];
    roundTable: {
      phases: { phase: string; contributions: RoundTableContribution[] }[];
      consensus: { signal: string; confidence: number; synthesizedReasoning: string };
    };
    alternativeData: {
      onChain?: { nvtSignal: string; whaleSignal: string; flowSignal: string };
      social: { sentimentScore: number; isTrending: boolean; mentionCount: number };
    };
    rlRecommendation: {
      action: string;
      confidence: number;
      positionSize: number;
      reasoning: string;
    };
    correlations: { asset1: string; asset2: string; correlation: number; trend: string }[];
  } | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info('Running advanced AI analysis...', { duration: 2000 });

    // Simulate analysis (in production, would call tRPC endpoints)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setAnalysisResult({
      agents: [
        {
          agentName: 'The Researcher',
          agentRole: 'researcher',
          signal: 'buy',
          confidence: 72,
          reasoning: 'Macro conditions favor risk assets with moderating inflation and stable growth outlook.',
          keyFindings: [
            'Interest rates trending lower, supportive for risk assets',
            'Technology sector showing strong momentum',
            'Earnings growth at 18% exceeds expectations'
          ],
          dataPoints: {
            interestRateTrend: 'falling',
            sectorMomentum: 0.65,
            peRatio: 22.5,
            earningsGrowth: 18
          },
          recommendations: [
            'Consider building position on pullbacks',
            'Monitor sector rotation for confirmation'
          ]
        },
        {
          agentName: 'The Quant',
          agentRole: 'quant',
          signal: 'buy',
          confidence: 78,
          reasoning: 'Technical setup shows bullish momentum with RSI recovering from oversold and MACD crossover.',
          keyFindings: [
            'RSI at 42 recovering from oversold',
            'MACD showing bullish crossover',
            'Price above key moving averages',
            'IV percentile at 35% - options are cheap'
          ],
          dataPoints: {
            rsi: 42,
            macdSignal: 'bullish',
            ivPercentile: 35,
            putCallRatio: 0.85
          },
          recommendations: [
            'Technical setup supports long bias',
            'Low IV environment favors long options strategies'
          ]
        },
        {
          agentName: 'The Risk Manager',
          agentRole: 'risk_manager',
          signal: 'hold',
          confidence: 65,
          reasoning: 'Risk parameters acceptable but drawdown at 45% of limit warrants measured approach.',
          keyFindings: [
            'Drawdown within acceptable range (45% of limit)',
            'Good diversification with low correlation (28%)',
            'Recommended position size: 4.2% of portfolio'
          ],
          dataPoints: {
            drawdownUtilization: 45,
            avgCorrelation: 0.28,
            recommendedSize: 4.2,
            sharpeRatio: 1.2
          },
          recommendations: [
            'Limit new position to 4.2% of portfolio',
            'Maintain current allocation'
          ]
        }
      ],
      roundTable: {
        phases: [
          {
            phase: 'Initial Presentations',
            contributions: [
              {
                agent: 'The Researcher',
                statement: 'From a macro perspective: conditions favor risk assets with moderating inflation. My signal is BUY with 72% confidence.'
              },
              {
                agent: 'The Quant',
                statement: 'Technical analysis shows bullish momentum with RSI recovery and MACD crossover. My signal is BUY with 78% confidence.'
              },
              {
                agent: 'The Risk Manager',
                statement: 'Risk assessment: drawdown at 45% of limit. My signal is HOLD with 65% confidence to maintain prudent exposure.'
              }
            ]
          },
          {
            phase: 'Discussion and Synthesis',
            contributions: [
              {
                agent: 'The Researcher',
                statement: 'Building on The Quant\'s technical analysis, I note that while technicals show buy, the fundamental backdrop supports this view with strong earnings.',
                referencedAgents: ['The Quant'],
                buildingOn: 'technical analysis'
              },
              {
                agent: 'The Quant',
                statement: 'Acknowledging The Risk Manager\'s concerns, the options market reflects moderate uncertainty with IV at 35%. Position sizing should be conservative.',
                referencedAgents: ['The Risk Manager'],
                buildingOn: 'risk assessment'
              },
              {
                agent: 'The Risk Manager',
                statement: 'Considering both The Researcher\'s macro view and The Quant\'s technical setup, I recommend measured position building with strict position limits.',
                referencedAgents: ['The Researcher', 'The Quant'],
                buildingOn: 'combined analysis'
              }
            ]
          }
        ],
        consensus: {
          signal: 'buy',
          confidence: 72,
          synthesizedReasoning: 'Team consensus is BUY based on aligned macro and technical signals, with risk-adjusted position sizing.'
        }
      },
      alternativeData: {
        onChain: assetType === 'crypto' ? {
          nvtSignal: 'undervalued',
          whaleSignal: 'accumulating',
          flowSignal: 'bullish'
        } : undefined,
        social: {
          sentimentScore: 0.35,
          isTrending: true,
          mentionCount: 12500
        }
      },
      rlRecommendation: {
        action: 'buy',
        confidence: 74,
        positionSize: 4.5,
        reasoning: 'RL model recommends BUY with 74% confidence. Policy weights favor momentum (30%) and trend (25%). Market regime: trending.'
      },
      correlations: [
        { asset1: symbol, asset2: 'SPY', correlation: 0.72, trend: 'stable' },
        { asset1: symbol, asset2: 'QQQ', correlation: 0.85, trend: 'increasing' },
        { asset1: symbol, asset2: 'BTC', correlation: 0.35, trend: 'decreasing' },
        { asset1: symbol, asset2: 'GLD', correlation: -0.15, trend: 'stable' }
      ]
    });

    setIsAnalyzing(false);
    toast.success('Analysis complete!');
  };

  const getSignalColor = (signal: string) => {
    switch (signal.toLowerCase()) {
      case 'strong_buy': return 'bg-green-500';
      case 'buy': return 'bg-green-400';
      case 'hold': return 'bg-yellow-400';
      case 'sell': return 'bg-red-400';
      case 'strong_sell': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal.toLowerCase()) {
      case 'strong_buy':
      case 'buy':
        return <TrendingUp className="h-4 w-4" />;
      case 'sell':
      case 'strong_sell':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'researcher': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case 'quant': return <BarChart3 className="h-5 w-5 text-purple-500" />;
      case 'risk_manager': return <Shield className="h-5 w-5 text-orange-500" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Advanced AI Analysis
          </h2>
          <p className="text-muted-foreground">
            Multi-agent analysis with explainability for {symbol} ({assetType})
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      {/* Risk Tolerance Slider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Risk Tolerance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Conservative</span>
            <Slider
              value={riskTolerance}
              onValueChange={setRiskTolerance}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">Aggressive</span>
            <Badge variant="outline">{riskTolerance[0]}%</Badge>
          </div>
        </CardContent>
      </Card>

      {analysisResult ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agent Decisions</TabsTrigger>
            <TabsTrigger value="roundtable">Round Table</TabsTrigger>
            <TabsTrigger value="altdata">Alt Data</TabsTrigger>
            <TabsTrigger value="correlations">Correlations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Consensus Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Consensus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge className={`${getSignalColor(analysisResult.roundTable.consensus.signal)} text-white`}>
                      {getSignalIcon(analysisResult.roundTable.consensus.signal)}
                      <span className="ml-1">{analysisResult.roundTable.consensus.signal.toUpperCase()}</span>
                    </Badge>
                    <span className="text-2xl font-bold">{analysisResult.roundTable.consensus.confidence}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {analysisResult.roundTable.consensus.synthesizedReasoning}
                  </p>
                </CardContent>
              </Card>

              {/* RL Recommendation Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    RL Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge className={`${getSignalColor(analysisResult.rlRecommendation.action)} text-white`}>
                      {analysisResult.rlRecommendation.action.toUpperCase()}
                    </Badge>
                    <span className="text-lg font-semibold">
                      {analysisResult.rlRecommendation.positionSize}% size
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {analysisResult.rlRecommendation.reasoning}
                  </p>
                </CardContent>
              </Card>

              {/* Social Sentiment Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Social Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge variant={analysisResult.alternativeData.social.sentimentScore > 0 ? 'default' : 'destructive'}>
                      {analysisResult.alternativeData.social.sentimentScore > 0 ? 'Bullish' : 'Bearish'}
                    </Badge>
                    {analysisResult.alternativeData.social.isTrending && (
                      <Badge variant="outline" className="bg-blue-50">🔥 Trending</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {analysisResult.alternativeData.social.mentionCount.toLocaleString()} mentions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Agent Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Agent Signals Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.agents.map((agent) => (
                    <div key={agent.agentName} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getRoleIcon(agent.agentRole)}
                        <div>
                          <p className="font-medium">{agent.agentName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{agent.agentRole.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${getSignalColor(agent.signal)} text-white`}>
                          {agent.signal.toUpperCase()}
                        </Badge>
                        <div className="w-24">
                          <Progress value={agent.confidence} className="h-2" />
                        </div>
                        <span className="text-sm font-medium w-12">{agent.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Decisions Tab */}
          <TabsContent value="agents" className="space-y-4">
            {analysisResult.agents.map((agent) => (
              <Card key={agent.agentName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(agent.agentRole)}
                      <div>
                        <CardTitle>{agent.agentName}</CardTitle>
                        <CardDescription className="capitalize">{agent.agentRole.replace('_', ' ')}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getSignalColor(agent.signal)} text-white`}>
                        {getSignalIcon(agent.signal)}
                        <span className="ml-1">{agent.signal.toUpperCase()}</span>
                      </Badge>
                      <span className="text-lg font-bold">{agent.confidence}%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reasoning */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Reasoning
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {agent.reasoning}
                    </p>
                  </div>

                  {/* Key Findings */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Findings</h4>
                    <ul className="space-y-1">
                      {agent.keyFindings.map((finding, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Data Points */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Data Points</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(agent.dataPoints).map(([key, value]) => (
                        <div key={key} className="bg-muted/50 p-2 rounded text-center">
                          <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="font-medium">
                            {typeof value === 'number' ? value.toFixed(2) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {agent.recommendations.map((rec, idx) => (
                        <Badge key={idx} variant="outline">{rec}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Round Table Tab */}
          <TabsContent value="roundtable" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Round Table Discussion
                </CardTitle>
                <CardDescription>
                  Watch how agents collaborate and build on each other's insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {analysisResult.roundTable.phases.map((phase, phaseIdx) => (
                  <div key={phaseIdx}>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Badge variant="outline">{phaseIdx + 1}</Badge>
                      {phase.phase}
                    </h4>
                    <div className="space-y-3 ml-4 border-l-2 border-muted pl-4">
                      {phase.contributions.map((contribution, contribIdx) => (
                        <div key={contribIdx} className="bg-muted/30 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getRoleIcon(
                              contribution.agent === 'The Researcher' ? 'researcher' :
                              contribution.agent === 'The Quant' ? 'quant' : 'risk_manager'
                            )}
                            <span className="font-medium">{contribution.agent}</span>
                            {contribution.referencedAgents && (
                              <span className="text-xs text-muted-foreground">
                                → referencing {contribution.referencedAgents.join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{contribution.statement}</p>
                          {contribution.buildingOn && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Building on: {contribution.buildingOn}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Consensus */}
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Final Consensus
                  </h4>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={`${getSignalColor(analysisResult.roundTable.consensus.signal)} text-white`}>
                      {analysisResult.roundTable.consensus.signal.toUpperCase()}
                    </Badge>
                    <span className="font-bold">{analysisResult.roundTable.consensus.confidence}% confidence</span>
                  </div>
                  <p className="text-sm">{analysisResult.roundTable.consensus.synthesizedReasoning}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alternative Data Tab */}
          <TabsContent value="altdata" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* On-Chain Data (for crypto) */}
              {analysisResult.alternativeData.onChain && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">On-Chain Metrics</CardTitle>
                    <CardDescription>Blockchain-based signals</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">NVT Signal</span>
                      <Badge variant={analysisResult.alternativeData.onChain.nvtSignal === 'undervalued' ? 'default' : 'destructive'}>
                        {analysisResult.alternativeData.onChain.nvtSignal}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Whale Activity</span>
                      <Badge variant={analysisResult.alternativeData.onChain.whaleSignal === 'accumulating' ? 'default' : 'secondary'}>
                        {analysisResult.alternativeData.onChain.whaleSignal}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Exchange Flow</span>
                      <Badge variant={analysisResult.alternativeData.onChain.flowSignal === 'bullish' ? 'default' : 'destructive'}>
                        {analysisResult.alternativeData.onChain.flowSignal}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Sentiment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Social Sentiment</CardTitle>
                  <CardDescription>Twitter, Reddit, Discord signals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">Sentiment Score</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(analysisResult.alternativeData.social.sentimentScore + 1) * 50} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm font-medium">
                        {(analysisResult.alternativeData.social.sentimentScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">Trending Status</span>
                    <Badge variant={analysisResult.alternativeData.social.isTrending ? 'default' : 'secondary'}>
                      {analysisResult.alternativeData.social.isTrending ? '🔥 Trending' : 'Not Trending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">Mention Count (24h)</span>
                    <span className="font-medium">{analysisResult.alternativeData.social.mentionCount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Correlations Tab */}
          <TabsContent value="correlations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cross-Asset Correlations</CardTitle>
                <CardDescription>How {symbol} moves relative to other assets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.correlations.map((corr, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{corr.asset1}</span>
                        <span className="text-muted-foreground">↔</span>
                        <span className="font-medium">{corr.asset2}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-24 h-3 rounded-full overflow-hidden bg-gray-200"
                          title={`Correlation: ${(corr.correlation * 100).toFixed(0)}%`}
                        >
                          <div 
                            className={`h-full ${corr.correlation > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.abs(corr.correlation) * 100}%` }}
                          />
                        </div>
                        <span className={`font-medium w-16 text-right ${corr.correlation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(corr.correlation * 100).toFixed(0)}%
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {corr.trend === 'increasing' ? '↑' : corr.trend === 'decreasing' ? '↓' : '→'} {corr.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-12 text-center">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground mb-4">
            Click "Run Analysis" to get comprehensive AI-powered insights for {symbol}
          </p>
          <Button onClick={runAnalysis} disabled={isAnalyzing}>
            <Zap className="h-4 w-4 mr-2" />
            Run Analysis
          </Button>
        </Card>
      )}
    </div>
  );
}

export default AdvancedAIAnalysisDashboard;
