import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BacktestingValidation } from "@/components/BacktestingValidation";
import { StrategyComparison } from "@/components/StrategyComparison";
import { MonteCarloSimulation } from "@/components/MonteCarloSimulation";
import { WalkForwardOptimization } from "@/components/WalkForwardOptimization";
import { PortfolioBacktesting } from "@/components/PortfolioBacktesting";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Brain, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Loader2,
  Target,
  Shield,
  BarChart3,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Percent,
  Clock,
  TrendingUpIcon,
  LineChart,
  PieChart,
  Gauge
} from "lucide-react";
import { toast } from "sonner";

// Types for enhanced analysis
interface AgentAnalysis {
  agentType: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  priceTarget?: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number; percentB: number };
  atr: number;
  adx: number;
  stochastic: { k: number; d: number };
  ema20: number;
  ema50: number;
  ema200: number;
  vwap: number;
  obv: number;
  volumeRatio: number;
}

interface MarketRegime {
  type: 'bull' | 'bear' | 'sideways' | 'high_volatility' | 'low_volatility';
  confidence: number;
  trendStrength: number;
  volatilityLevel: number;
}

interface PositionSizing {
  kellyFraction: number;
  recommendedSize: number;
  maxRisk: number;
  riskRewardRatio: number;
}

interface EnhancedAnalysisResult {
  symbol: string;
  timestamp: string;
  currentPrice: number;
  agents: AgentAnalysis[];
  consensusRecommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  consensusConfidence: number;
  technicalIndicators: TechnicalIndicators;
  marketRegime: MarketRegime;
  positionSizing: PositionSizing;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  ensemblePrediction: {
    direction: 'up' | 'down' | 'neutral';
    magnitude: number;
    timeframe: string;
    confidence: number;
  };
  overallScore: number;
  profitProbability: number;
}

const agentColors: Record<string, { bg: string; text: string; icon: typeof Brain }> = {
  "Technical Analysis": { bg: "bg-blue-500/20", text: "text-blue-400", icon: LineChart },
  "Fundamental Analysis": { bg: "bg-green-500/20", text: "text-green-400", icon: BarChart3 },
  "Sentiment Analysis": { bg: "bg-purple-500/20", text: "text-purple-400", icon: Activity },
  "Risk Management": { bg: "bg-red-500/20", text: "text-red-400", icon: Shield },
  "Quantitative Analysis": { bg: "bg-cyan-500/20", text: "text-cyan-400", icon: PieChart },
};

const recommendationColors: Record<string, { bg: string; text: string; border: string }> = {
  strong_buy: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500" },
  buy: { bg: "bg-green-500/10", text: "text-green-300", border: "border-green-400" },
  hold: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500" },
  sell: { bg: "bg-red-500/10", text: "text-red-300", border: "border-red-400" },
  strong_sell: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500" },
};

const regimeColors: Record<string, { bg: string; text: string }> = {
  bull: { bg: "bg-green-500/20", text: "text-green-400" },
  bear: { bg: "bg-red-500/20", text: "text-red-400" },
  sideways: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  high_volatility: { bg: "bg-orange-500/20", text: "text-orange-400" },
  low_volatility: { bg: "bg-blue-500/20", text: "text-blue-400" },
};

const riskColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-green-500/20", text: "text-green-400" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400" },
  extreme: { bg: "bg-red-500/20", text: "text-red-400" },
};

export default function EnhancedAnalysis() {
  const [symbol, setSymbol] = useState("");
  const [accountBalance, setAccountBalance] = useState(10000);
  const [result, setResult] = useState<EnhancedAnalysisResult | null>(null);
  
  const analyzeMutation = trpc.agent.enhancedAnalysis.useMutation({
    onSuccess: (data) => {
      setResult(data as unknown as EnhancedAnalysisResult);
      toast.success(`Enhanced analysis complete for ${symbol.toUpperCase()}`);
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
    analyzeMutation.mutate({ 
      symbol: symbol.toUpperCase(),
      accountBalance 
    });
  };

  const formatRecommendation = (rec: string) => {
    return rec.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'up') return <TrendingUp className="h-5 w-5 text-green-400" />;
    if (direction === 'down') return <TrendingDown className="h-5 w-5 text-red-400" />;
    return <Minus className="h-5 w-5 text-yellow-400" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Enhanced AI Analysis</h1>
              <p className="text-muted-foreground">
                Research-backed multi-agent consensus with Kelly Criterion position sizing
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Search className="h-5 w-5" />
              Analyze Stock
            </CardTitle>
            <CardDescription>
              Enter a stock symbol to run enhanced analysis with 5 specialized AI agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Stock Symbol</label>
                <Input
                  placeholder="e.g., AAPL, GOOGL, MSFT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="bg-background"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="text-sm text-muted-foreground mb-1 block">Account Balance</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="bg-background"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Consensus Card */}
              <Card className={`bg-card border-2 ${recommendationColors[result.consensusRecommendation].border}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Consensus</p>
                      <p className={`text-2xl font-bold ${recommendationColors[result.consensusRecommendation].text}`}>
                        {formatRecommendation(result.consensusRecommendation)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${recommendationColors[result.consensusRecommendation].bg}`}>
                      {result.consensusRecommendation.includes('buy') ? (
                        <TrendingUp className="h-6 w-6 text-green-400" />
                      ) : result.consensusRecommendation.includes('sell') ? (
                        <TrendingDown className="h-6 w-6 text-red-400" />
                      ) : (
                        <Minus className="h-6 w-6 text-yellow-400" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="text-foreground">{formatPercent(result.consensusConfidence)}</span>
                    </div>
                    <Progress value={result.consensusConfidence * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Overall Score Card */}
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                      <p className="text-2xl font-bold text-foreground">{result.overallScore.toFixed(0)}/100</p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-500/20">
                      <Gauge className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Profit Probability</span>
                      <span className="text-foreground">{formatPercent(result.profitProbability)}</span>
                    </div>
                    <Progress value={result.profitProbability * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Market Regime Card */}
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Market Regime</p>
                      <p className={`text-2xl font-bold capitalize ${regimeColors[result.marketRegime.type].text}`}>
                        {result.marketRegime.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${regimeColors[result.marketRegime.type].bg}`}>
                      <Activity className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Trend Strength</span>
                      <p className="text-foreground">{result.marketRegime.trendStrength.toFixed(1)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volatility</span>
                      <p className="text-foreground">{result.marketRegime.volatilityLevel.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Level Card */}
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Level</p>
                      <p className={`text-2xl font-bold capitalize ${riskColors[result.riskLevel].text}`}>
                        {result.riskLevel}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${riskColors[result.riskLevel].bg}`}>
                      <Shield className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk/Reward</span>
                      <span className="text-foreground">1:{result.positionSizing.riskRewardRatio.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price & Position Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Current Price & Targets */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    Price Levels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-background">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="text-xl font-bold text-foreground">{formatPrice(result.currentPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10">
                      <span className="text-muted-foreground">Take Profit</span>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-400">{formatPrice(result.suggestedTakeProfit)}</span>
                        <p className="text-xs text-green-400/70">
                          +{((result.suggestedTakeProfit - result.currentPrice) / result.currentPrice * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10">
                      <span className="text-muted-foreground">Stop Loss</span>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-red-400">{formatPrice(result.suggestedStopLoss)}</span>
                        <p className="text-xs text-red-400/70">
                          {((result.suggestedStopLoss - result.currentPrice) / result.currentPrice * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Position Sizing (Kelly Criterion) */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-400" />
                    Position Sizing (Kelly)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-background">
                      <span className="text-muted-foreground">Kelly Fraction</span>
                      <span className="text-lg font-semibold text-foreground">
                        {formatPercent(result.positionSizing.kellyFraction)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10">
                      <span className="text-muted-foreground">Recommended Size</span>
                      <span className="text-lg font-semibold text-blue-400">
                        {formatPrice(result.positionSizing.recommendedSize)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-background">
                      <span className="text-muted-foreground">Max Risk</span>
                      <span className="text-lg font-semibold text-foreground">
                        {formatPrice(result.positionSizing.maxRisk)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ensemble Prediction */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5 text-purple-400" />
                    Ensemble Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-background">
                      <span className="text-muted-foreground">Direction</span>
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(result.ensemblePrediction.direction)}
                        <span className="text-lg font-semibold capitalize text-foreground">
                          {result.ensemblePrediction.direction}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-background">
                      <span className="text-muted-foreground">Expected Move</span>
                      <span className="text-lg font-semibold text-foreground">
                        ±{result.ensemblePrediction.magnitude.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-background">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Timeframe
                      </span>
                      <span className="text-lg font-semibold text-foreground">
                        {result.ensemblePrediction.timeframe}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis Tabs */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <Tabs defaultValue="agents" className="w-full">
                  <TabsList className="grid w-full grid-cols-8 mb-6">
                    <TabsTrigger value="agents">AI Agents</TabsTrigger>
                    <TabsTrigger value="technical">Technical</TabsTrigger>
                    <TabsTrigger value="research">Research</TabsTrigger>
                    <TabsTrigger value="backtest">Backtest</TabsTrigger>
                    <TabsTrigger value="compare">Compare</TabsTrigger>
                    <TabsTrigger value="montecarlo">Monte Carlo</TabsTrigger>
                    <TabsTrigger value="walkforward">Walk-Forward</TabsTrigger>
                    <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                  </TabsList>

                  {/* Agents Tab */}
                  <TabsContent value="agents" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.agents.map((agent) => {
                        const colors = agentColors[agent.agentType] || { bg: "bg-gray-500/20", text: "text-gray-400", icon: Brain };
                        const AgentIcon = colors.icon;
                        return (
                          <Card key={agent.agentType} className={`bg-background border ${recommendationColors[agent.recommendation].border}`}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                                    <AgentIcon className={`h-4 w-4 ${colors.text}`} />
                                  </div>
                                  <CardTitle className="text-sm">{agent.agentType}</CardTitle>
                                </div>
                                <Badge className={`${recommendationColors[agent.recommendation].bg} ${recommendationColors[agent.recommendation].text}`}>
                                  {formatRecommendation(agent.recommendation)}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Confidence</span>
                                    <span>{formatPercent(agent.confidence)}</span>
                                  </div>
                                  <Progress value={agent.confidence * 100} className="h-1.5" />
                                </div>
                                <p className="text-sm text-muted-foreground">{agent.reasoning}</p>
                                <div className="flex flex-wrap gap-1">
                                  {agent.keyFactors.slice(0, 3).map((factor, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {factor}
                                    </Badge>
                                  ))}
                                </div>
                                {agent.priceTarget && (
                                  <div className="text-sm pt-2 border-t border-border">
                                    <span className="text-muted-foreground">Target: </span>
                                    <span className="text-green-400">{formatPrice(agent.priceTarget)}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Technical Indicators Tab */}
                  <TabsContent value="technical" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* RSI */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">RSI (14)</p>
                        <p className={`text-2xl font-bold ${
                          result.technicalIndicators.rsi < 30 ? 'text-green-400' :
                          result.technicalIndicators.rsi > 70 ? 'text-red-400' : 'text-foreground'
                        }`}>
                          {result.technicalIndicators.rsi.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.technicalIndicators.rsi < 30 ? 'Oversold' :
                           result.technicalIndicators.rsi > 70 ? 'Overbought' : 'Neutral'}
                        </p>
                      </div>

                      {/* MACD */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">MACD</p>
                        <p className={`text-2xl font-bold ${
                          result.technicalIndicators.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {result.technicalIndicators.macd.value.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Signal: {result.technicalIndicators.macd.signal.toFixed(2)}
                        </p>
                      </div>

                      {/* ADX */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">ADX (Trend)</p>
                        <p className="text-2xl font-bold text-foreground">
                          {result.technicalIndicators.adx.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.technicalIndicators.adx > 25 ? 'Strong Trend' : 'Weak Trend'}
                        </p>
                      </div>

                      {/* ATR */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">ATR (Volatility)</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatPrice(result.technicalIndicators.atr)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(result.technicalIndicators.atr / result.currentPrice * 100).toFixed(2)}% of price
                        </p>
                      </div>

                      {/* Stochastic */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">Stochastic %K</p>
                        <p className={`text-2xl font-bold ${
                          result.technicalIndicators.stochastic.k < 20 ? 'text-green-400' :
                          result.technicalIndicators.stochastic.k > 80 ? 'text-red-400' : 'text-foreground'
                        }`}>
                          {result.technicalIndicators.stochastic.k.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          %D: {result.technicalIndicators.stochastic.d.toFixed(1)}
                        </p>
                      </div>

                      {/* Bollinger %B */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">Bollinger %B</p>
                        <p className={`text-2xl font-bold ${
                          result.technicalIndicators.bollingerBands.percentB < 0.2 ? 'text-green-400' :
                          result.technicalIndicators.bollingerBands.percentB > 0.8 ? 'text-red-400' : 'text-foreground'
                        }`}>
                          {(result.technicalIndicators.bollingerBands.percentB * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.technicalIndicators.bollingerBands.percentB < 0.2 ? 'Near Lower Band' :
                           result.technicalIndicators.bollingerBands.percentB > 0.8 ? 'Near Upper Band' : 'Mid Range'}
                        </p>
                      </div>

                      {/* Volume Ratio */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">Volume Ratio</p>
                        <p className={`text-2xl font-bold ${
                          result.technicalIndicators.volumeRatio > 1.5 ? 'text-green-400' :
                          result.technicalIndicators.volumeRatio < 0.5 ? 'text-red-400' : 'text-foreground'
                        }`}>
                          {result.technicalIndicators.volumeRatio.toFixed(2)}x
                        </p>
                        <p className="text-xs text-muted-foreground">
                          vs 20-day avg
                        </p>
                      </div>

                      {/* VWAP */}
                      <div className="p-4 rounded-lg bg-background">
                        <p className="text-sm text-muted-foreground">VWAP</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatPrice(result.technicalIndicators.vwap)}
                        </p>
                        <p className={`text-xs ${
                          result.currentPrice > result.technicalIndicators.vwap ? 'text-green-400' : 'text-red-400'
                        }`}>
                          Price {result.currentPrice > result.technicalIndicators.vwap ? 'above' : 'below'} VWAP
                        </p>
                      </div>
                    </div>

                    {/* EMA Levels */}
                    <div className="p-4 rounded-lg bg-background">
                      <p className="text-sm text-muted-foreground mb-3">Moving Averages</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">EMA 20</p>
                          <p className={`text-lg font-semibold ${
                            result.currentPrice > result.technicalIndicators.ema20 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPrice(result.technicalIndicators.ema20)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">EMA 50</p>
                          <p className={`text-lg font-semibold ${
                            result.currentPrice > result.technicalIndicators.ema50 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPrice(result.technicalIndicators.ema50)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">EMA 200</p>
                          <p className={`text-lg font-semibold ${
                            result.currentPrice > result.technicalIndicators.ema200 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPrice(result.technicalIndicators.ema200)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Research Basis Tab */}
                  <TabsContent value="research" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-background border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            Research Foundation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 rounded-lg bg-card">
                            <p className="font-medium text-foreground">Multi-Agent Consensus</p>
                            <p className="text-sm text-muted-foreground">
                              Based on CFA Institute research showing ensemble methods outperform single models by 10-15%
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <p className="font-medium text-foreground">Kelly Criterion</p>
                            <p className="text-sm text-muted-foreground">
                              Mathematical position sizing formula for optimal capital allocation and risk management
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <p className="font-medium text-foreground">Market Regime Detection</p>
                            <p className="text-sm text-muted-foreground">
                              Adapts strategy to current market conditions (bull/bear/sideways/volatile)
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-background border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            Risk Considerations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 rounded-lg bg-card">
                            <p className="font-medium text-foreground">ATR-Based Stops</p>
                            <p className="text-sm text-muted-foreground">
                              Stop-loss and take-profit levels calculated using Average True Range for volatility-adjusted exits
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <p className="font-medium text-foreground">Fractional Kelly</p>
                            <p className="text-sm text-muted-foreground">
                              Uses 25% of full Kelly to reduce volatility while maintaining edge
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-card">
                            <p className="font-medium text-foreground">Confidence Weighting</p>
                            <p className="text-sm text-muted-foreground">
                              Agent recommendations weighted by confidence level for more reliable consensus
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-background border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">Expert Insights (2024-2025)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <blockquote className="border-l-4 border-purple-500 pl-4 italic text-muted-foreground">
                          "Start with strategy. Don't rely on models alone. Focus on market inefficiencies and then use machine learning to fine-tune strategy development, risk management, and execution."
                          <footer className="text-sm mt-2 text-foreground">— Stefan Jensen, CEO Applied AI</footer>
                        </blockquote>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Backtest Tab */}
                  <TabsContent value="backtest">
                    <BacktestingValidation />
                  </TabsContent>

                  {/* Compare Tab */}
                  <TabsContent value="compare">
                    <StrategyComparison />
                  </TabsContent>

                  {/* Monte Carlo Tab */}
                  <TabsContent value="montecarlo">
                    <MonteCarloSimulation />
                  </TabsContent>

                  {/* Walk-Forward Tab */}
                  <TabsContent value="walkforward">
                    <WalkForwardOptimization />
                  </TabsContent>

                  {/* Portfolio Tab */}
                  <TabsContent value="portfolio">
                    <PortfolioBacktesting />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!result && !analyzeMutation.isPending && (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter a stock symbol above to run enhanced AI analysis with 5 specialized agents, 
                Kelly Criterion position sizing, and research-backed strategies.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
