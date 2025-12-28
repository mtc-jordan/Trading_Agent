/**
 * Agent Explainability Dashboard
 * 
 * Visual interface showing how each AI agent reached its decision,
 * including specific indicators, patterns, and data points that influenced the vote.
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Shield,
  Zap,
  Eye,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Scale,
  Lightbulb,
  GitBranch
} from 'lucide-react';

// Types
interface IndicatorContribution {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  contribution: number;
  explanation: string;
}

interface PatternContribution {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: number;
  contribution: number;
  explanation: string;
}

interface DataPointInfluence {
  category: string;
  name: string;
  value: string | number;
  impact: 'high' | 'medium' | 'low';
  direction: 'bullish' | 'bearish' | 'neutral';
  explanation: string;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative';
  category: string;
}

interface DecisionNode {
  level: number;
  condition: string;
  result: boolean;
  impact: 'major' | 'minor';
  nextAction: string;
}

interface Counterfactual {
  scenario: string;
  changedFeature: string;
  originalValue: string | number;
  newValue: string | number;
  resultingSignal: 'buy' | 'sell' | 'hold';
  explanation: string;
}

interface AgentExplanation {
  agentName: string;
  agentType: string;
  finalSignal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  indicatorContributions: IndicatorContribution[];
  patternContributions: PatternContribution[];
  dataPointInfluences: DataPointInfluence[];
  bullishFactors: number;
  bearishFactors: number;
  neutralFactors: number;
  dominantFactor: string;
  decisionPath: DecisionNode[];
  featureImportance: FeatureImportance[];
  counterfactuals: Counterfactual[];
}

interface ConflictingSignal {
  agent1: string;
  agent1Signal: 'buy' | 'sell' | 'hold';
  agent2: string;
  agent2Signal: 'buy' | 'sell' | 'hold';
  conflictReason: string;
  resolution: string;
}

interface RiskFactor {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

interface ConsensusExplanation {
  symbol: string;
  assetType: 'stock' | 'crypto';
  finalDecision: 'buy' | 'sell' | 'hold';
  overallConfidence: number;
  agentExplanations: AgentExplanation[];
  votingBreakdown: {
    buyVotes: number;
    sellVotes: number;
    holdVotes: number;
    consensusMethod: string;
    consensusReached: boolean;
    dissenterAgents: string[];
  };
  topBullishFactors: DataPointInfluence[];
  topBearishFactors: DataPointInfluence[];
  conflictingSignals: ConflictingSignal[];
  riskFactors: RiskFactor[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

// Signal badge component
function SignalBadge({ signal }: { signal: 'buy' | 'sell' | 'hold' | 'bullish' | 'bearish' | 'neutral' }) {
  const config = {
    buy: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: TrendingUp },
    sell: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: TrendingDown },
    hold: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Minus },
    bullish: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: TrendingUp },
    bearish: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: TrendingDown },
    neutral: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Minus },
  };
  
  const { color, icon: Icon } = config[signal];
  
  return (
    <Badge className={`${color} border`}>
      <Icon className="w-3 h-3 mr-1" />
      {signal.charAt(0).toUpperCase() + signal.slice(1)}
    </Badge>
  );
}

// Contribution bar component
function ContributionBar({ value, maxValue = 1 }: { value: number; maxValue?: number }) {
  const percentage = Math.abs(value / maxValue) * 100;
  const isPositive = value > 0;
  
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// Feature importance chart
function FeatureImportanceChart({ features }: { features: FeatureImportance[] }) {
  const maxImportance = Math.max(...features.map(f => f.importance));
  
  return (
    <div className="space-y-3">
      {features.slice(0, 8).map((feature, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">{feature.feature}</span>
            <span className={feature.direction === 'positive' ? 'text-green-400' : 'text-red-400'}>
              {(feature.importance * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${feature.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${(feature.importance / maxImportance) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Decision path visualization
function DecisionPathVisualization({ path }: { path: DecisionNode[] }) {
  return (
    <div className="space-y-2">
      {path.map((node, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              node.result ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {node.result ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </div>
            {index < path.length - 1 && <div className="w-0.5 h-8 bg-gray-700" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200">{node.condition}</span>
              <Badge variant="outline" className={node.impact === 'major' ? 'border-yellow-500 text-yellow-400' : 'border-gray-500 text-gray-400'}>
                {node.impact}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              <ChevronRight className="w-3 h-3 inline mr-1" />
              {node.nextAction}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Agent card component
function AgentCard({ agent, isExpanded, onToggle }: { 
  agent: AgentExplanation; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const agentIcons: Record<string, typeof Brain> = {
    technical: Activity,
    fundamental: BarChart3,
    sentiment: Brain,
    risk: Shield,
    regime: Target,
    execution: Zap,
    coordinator: Scale,
  };
  
  const Icon = agentIcons[agent.agentType] || Brain;
  
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              agent.finalSignal === 'buy' ? 'bg-green-500/20' :
              agent.finalSignal === 'sell' ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}>
              <Icon className={`w-5 h-5 ${
                agent.finalSignal === 'buy' ? 'text-green-400' :
                agent.finalSignal === 'sell' ? 'text-red-400' : 'text-yellow-400'
              }`} />
            </div>
            <div>
              <CardTitle className="text-base">{agent.agentName}</CardTitle>
              <CardDescription className="text-xs">
                Dominant factor: {agent.dominantFactor}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SignalBadge signal={agent.finalSignal} />
            <div className="text-right">
              <div className="text-lg font-bold">{agent.confidence.toFixed(0)}%</div>
              <div className="text-xs text-gray-400">confidence</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          
          <Tabs defaultValue="indicators" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900/50">
              <TabsTrigger value="indicators">Indicators</TabsTrigger>
              <TabsTrigger value="importance">Importance</TabsTrigger>
              <TabsTrigger value="path">Decision Path</TabsTrigger>
              <TabsTrigger value="whatif">What-If</TabsTrigger>
            </TabsList>
            
            <TabsContent value="indicators" className="mt-4 space-y-4">
              {/* Factor summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{agent.bullishFactors}</div>
                  <div className="text-xs text-gray-400">Bullish Factors</div>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{agent.bearishFactors}</div>
                  <div className="text-xs text-gray-400">Bearish Factors</div>
                </div>
                <div className="text-center p-3 bg-gray-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-gray-400">{agent.neutralFactors}</div>
                  <div className="text-xs text-gray-400">Neutral Factors</div>
                </div>
              </div>
              
              {/* Indicator contributions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Indicator Contributions</h4>
                {agent.indicatorContributions.map((indicator, index) => (
                  <div key={index} className="p-3 bg-gray-900/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{indicator.name}</span>
                        <SignalBadge signal={indicator.signal} />
                      </div>
                      <span className="text-sm text-gray-400">
                        Value: {typeof indicator.value === 'number' ? indicator.value.toFixed(2) : indicator.value}
                      </span>
                    </div>
                    <ContributionBar value={indicator.contribution} />
                    <p className="text-xs text-gray-400">{indicator.explanation}</p>
                  </div>
                ))}
              </div>
              
              {/* Pattern contributions */}
              {agent.patternContributions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Pattern Contributions</h4>
                  {agent.patternContributions.map((pattern, index) => (
                    <div key={index} className="p-3 bg-gray-900/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{pattern.name}</span>
                          <SignalBadge signal={pattern.type} />
                        </div>
                        <span className="text-sm text-gray-400">
                          Reliability: {(pattern.reliability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <ContributionBar value={pattern.contribution} />
                      <p className="text-xs text-gray-400">{pattern.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="importance" className="mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300">Feature Importance (SHAP-like)</h4>
                <FeatureImportanceChart features={agent.featureImportance} />
              </div>
            </TabsContent>
            
            <TabsContent value="path" className="mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300">Decision Path</h4>
                {agent.decisionPath.length > 0 ? (
                  <DecisionPathVisualization path={agent.decisionPath} />
                ) : (
                  <p className="text-sm text-gray-400">No decision path available</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="whatif" className="mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Counterfactual Analysis
                </h4>
                {agent.counterfactuals.length > 0 ? (
                  agent.counterfactuals.map((cf, index) => (
                    <div key={index} className="p-3 bg-gray-900/50 rounded-lg space-y-2">
                      <div className="font-medium text-sm">{cf.scenario}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">{cf.changedFeature}:</span>
                        <span className="text-red-400">{cf.originalValue}</span>
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                        <span className="text-green-400">{cf.newValue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Would result in:</span>
                        <SignalBadge signal={cf.resultingSignal} />
                      </div>
                      <p className="text-xs text-gray-400">{cf.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No counterfactual scenarios available</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Reasoning summary */}
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5" />
              <p className="text-sm text-gray-300">{agent.reasoning}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Arrow right icon
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

export default function AgentExplainabilityPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [searchSymbol, setSearchSymbol] = useState('AAPL');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  
  // Fetch explanation data
  const { data: explanation, isLoading, refetch } = trpc.broker.getAgentExplanation.useQuery(
    { symbol: searchSymbol },
    { enabled: !!searchSymbol }
  );
  
  const handleSearch = () => {
    setSearchSymbol(symbol.toUpperCase());
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="w-7 h-7 text-purple-400" />
              Agent Explainability
            </h1>
            <p className="text-gray-400 mt-1">
              Understand how each AI agent reached its trading decision
            </p>
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter symbol..."
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-40 bg-gray-800 border-gray-700"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="w-4 h-4 mr-2" />
              Analyze
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : explanation ? (
          <>
            {/* Consensus Summary */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-400" />
                      Consensus Decision: {explanation.symbol}
                    </CardTitle>
                    <CardDescription>
                      {(explanation.assetType as string) === 'crypto' ? 'Cryptocurrency' : 'Stock'} Analysis
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <SignalBadge signal={explanation.finalDecision} />
                      <div>
                        <div className="text-2xl font-bold">{explanation.overallConfidence.toFixed(0)}%</div>
                        <div className="text-xs text-gray-400">overall confidence</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Voting breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Voting Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-green-400 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> Buy
                        </span>
                        <span className="font-bold">{explanation.votingBreakdown.buyVotes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" /> Sell
                        </span>
                        <span className="font-bold">{explanation.votingBreakdown.sellVotes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Minus className="w-4 h-4" /> Hold
                        </span>
                        <span className="font-bold">{explanation.votingBreakdown.holdVotes}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-gray-400">Method: </span>
                      <span className="text-gray-200">{explanation.votingBreakdown.consensusMethod}</span>
                    </div>
                    {explanation.votingBreakdown.dissenterAgents.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-400">Dissenters: </span>
                        <span className="text-orange-400">
                          {explanation.votingBreakdown.dissenterAgents.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Risk assessment */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Risk Assessment</h4>
                    <div className={`p-3 rounded-lg ${
                      (explanation.overallRiskLevel as string) === 'low' ? 'bg-green-500/10' :
                      (explanation.overallRiskLevel as string) === 'medium' ? 'bg-yellow-500/10' :
                      (explanation.overallRiskLevel as string) === 'high' ? 'bg-orange-500/10' :
                      'bg-red-500/10'
                    }`}>
                      <div className={`text-lg font-bold ${
                        (explanation.overallRiskLevel as string) === 'low' ? 'text-green-400' :
                        (explanation.overallRiskLevel as string) === 'medium' ? 'text-yellow-400' :
                        (explanation.overallRiskLevel as string) === 'high' ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {explanation.overallRiskLevel.toUpperCase()} RISK
                      </div>
                    </div>
                    {explanation.riskFactors.slice(0, 2).map((risk: RiskFactor, index: number) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                          risk.severity === 'critical' ? 'text-red-400' :
                          risk.severity === 'high' ? 'text-orange-400' :
                          risk.severity === 'medium' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`} />
                        <div>
                          <div className="text-gray-200">{risk.name}</div>
                          <div className="text-xs text-gray-400">{risk.mitigation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Key factors */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Key Factors</h4>
                    <div className="space-y-2">
                      {explanation.topBullishFactors.slice(0, 2).map((factor: DataPointInfluence, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <ArrowUp className="w-4 h-4 text-green-400" />
                          <span className="text-gray-200">{factor.name}</span>
                        </div>
                      ))}
                      {explanation.topBearishFactors.slice(0, 2).map((factor: DataPointInfluence, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <ArrowDown className="w-4 h-4 text-red-400" />
                          <span className="text-gray-200">{factor.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Conflicting signals */}
                {explanation.conflictingSignals.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-500/10 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      Conflicting Signals
                    </h4>
                    <div className="space-y-2">
                      {explanation.conflictingSignals.map((conflict: ConflictingSignal, index: number) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-300">{conflict.agent1}</span>
                          <span className="text-gray-500"> ({conflict.agent1Signal}) vs </span>
                          <span className="text-gray-300">{conflict.agent2}</span>
                          <span className="text-gray-500"> ({conflict.agent2Signal})</span>
                          <p className="text-xs text-gray-400 mt-1">{conflict.resolution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Agent Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Individual Agent Analysis
              </h2>
              
              {explanation.agentExplanations.map((agent: AgentExplanation) => (
                <AgentCard
                  key={agent.agentType}
                  agent={agent}
                  isExpanded={expandedAgent === agent.agentType}
                  onToggle={() => setExpandedAgent(
                    expandedAgent === agent.agentType ? null : agent.agentType
                  )}
                />
              ))}
            </div>
          </>
        ) : (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Search className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400">Enter a symbol to analyze agent decisions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
