import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  Brain, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useBroker } from '@/contexts/BrokerContext';
import { BrokerBadge } from '@/components/BrokerBadge';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type AgentResult = {
  agent: string;
  score: number;
  signal: string;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
};

type ConsensusResult = {
  symbol: string;
  timestamp: string;
  agents: AgentResult[];
  consensusScore: number;
  consensusSignal: string;
  overallConfidence: number;
  recommendation: string;
  riskAssessment: string;
};

const agentColors: Record<string, { bg: string; text: string }> = {
  technical: { bg: "bg-blue-500/20", text: "text-blue-400" },
  fundamental: { bg: "bg-green-500/20", text: "text-green-400" },
  sentiment: { bg: "bg-purple-500/20", text: "text-purple-400" },
  risk: { bg: "bg-red-500/20", text: "text-red-400" },
  microstructure: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  macro: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  quant: { bg: "bg-pink-500/20", text: "text-pink-400" },
};

const signalColors: Record<string, { bg: string; text: string; icon: typeof TrendingUp }> = {
  strong_buy: { bg: "bg-green-500/20", text: "text-green-400", icon: TrendingUp },
  buy: { bg: "bg-green-500/10", text: "text-green-300", icon: TrendingUp },
  hold: { bg: "bg-yellow-500/20", text: "text-yellow-400", icon: Minus },
  sell: { bg: "bg-red-500/10", text: "text-red-300", icon: TrendingDown },
  strong_sell: { bg: "bg-red-500/20", text: "text-red-400", icon: TrendingDown },
};

export default function Analysis() {
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState<ConsensusResult | null>(null);
  
  // Broker context
  const { activeBroker, hasConnectedBroker, isPaperMode, getBrokerName } = useBroker();
  
  const { data: availableAgents } = trpc.agent.getAvailableAgents.useQuery();
  const analyzeMutation = trpc.agent.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data as unknown as ConsensusResult);
      toast.success(`Analysis complete for ${symbol.toUpperCase()}`);
    },
    onError: (error) => {
      toast.error(error.message || "Analysis failed");
    },
  });

  const handleAnalyze = () => {
    if (!symbol.trim()) {
      toast.error("Please enter a stock symbol");
      return;
    }
    analyzeMutation.mutate({ symbol: symbol.toUpperCase() });
  };

  const formatSignal = (signal: string) => {
    return signal.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Analysis</h1>
            <p className="text-muted-foreground">
              Get consensus analysis from {availableAgents?.length || 7} specialized AI agents
            </p>
          </div>
          {/* Broker indicator */}
          {hasConnectedBroker && activeBroker && (
            <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Trade via:</span>
              <BrokerBadge size="sm" showStatus={true} showMode={true} />
            </div>
          )}
        </div>

        {/* Search Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Analyze Stock</CardTitle>
            <CardDescription>
              Enter a stock symbol to get AI-powered analysis from multiple perspectives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter symbol (e.g., AAPL, MSFT, GOOGL)"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="pl-10 bg-input border-border text-foreground"
                />
              </div>
              <Button 
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className="gradient-primary text-primary-foreground"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>

            {/* Available Agents */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Available agents:</span>
              {availableAgents?.map((agent) => (
                <span 
                  key={agent} 
                  className={`px-2 py-1 rounded-full text-xs ${agentColors[agent]?.bg || "bg-primary/20"} ${agentColors[agent]?.text || "text-primary"}`}
                >
                  {agent}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {analyzeMutation.isPending && (
          <Card className="bg-card border-border">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Brain className="absolute inset-0 m-auto w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Analyzing {symbol}...</h3>
                <p className="text-muted-foreground">
                  Our AI agents are evaluating the stock from multiple perspectives
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && !analyzeMutation.isPending && (
          <div className="space-y-6">
            {/* Consensus Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-foreground">{result.symbol}</CardTitle>
                    <CardDescription>
                      Analysis completed at {new Date(result.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${signalColors[result.consensusSignal]?.bg || "bg-muted"}`}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const SignalIcon = signalColors[result.consensusSignal]?.icon || Minus;
                        return <SignalIcon className={`w-5 h-5 ${signalColors[result.consensusSignal]?.text || "text-muted-foreground"}`} />;
                      })()}
                      <span className={`text-lg font-bold ${signalColors[result.consensusSignal]?.text || "text-muted-foreground"}`}>
                        {formatSignal(result.consensusSignal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Consensus Score</p>
                    <p className={`text-3xl font-bold ${result.consensusScore >= 0 ? "text-profit" : "text-loss"}`}>
                      {result.consensusScore >= 0 ? "+" : ""}{(result.consensusScore * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                    <p className="text-3xl font-bold text-foreground">
                      {(result.overallConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Agents Analyzed</p>
                    <p className="text-3xl font-bold text-foreground">
                      {result.agents.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Recommendation</p>
                        <p className="text-muted-foreground">{result.recommendation}</p>
                      </div>
                    </div>
                  </div>

                  {result.riskAssessment && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Risk Assessment</p>
                          <p className="text-muted-foreground">{result.riskAssessment}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Individual Agent Results */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.agents.map((agent) => (
                <Card key={agent.agent} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${agentColors[agent.agent]?.bg || "bg-primary/20"} ${agentColors[agent.agent]?.text || "text-primary"}`}>
                        {agent.agent.charAt(0).toUpperCase() + agent.agent.slice(1)}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${signalColors[agent.signal]?.bg || "bg-muted"} ${signalColors[agent.signal]?.text || "text-muted-foreground"}`}>
                        {formatSignal(agent.signal)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <span className={`font-bold ${agent.score >= 0 ? "text-profit" : "text-loss"}`}>
                          {agent.score >= 0 ? "+" : ""}{(agent.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="font-medium text-foreground">
                          {(agent.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      {/* Score bar */}
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${agent.score >= 0 ? "bg-profit" : "bg-loss"}`}
                          style={{ 
                            width: `${Math.abs(agent.score) * 50}%`,
                            marginLeft: agent.score >= 0 ? "50%" : `${50 - Math.abs(agent.score) * 50}%`
                          }}
                        />
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {agent.reasoning}
                      </p>

                      {agent.keyFactors && agent.keyFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {agent.keyFactors.slice(0, 3).map((factor, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-secondary text-xs text-muted-foreground">
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !analyzeMutation.isPending && (
          <Card className="bg-card border-border">
            <CardContent className="py-12">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Analysis Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Enter a stock symbol above to get AI-powered analysis from our team of specialized agents
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
