import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Newspaper,
  Twitter,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Activity,
  RefreshCw,
  ExternalLink,
  Clock,
  Users,
  Gauge
} from "lucide-react";

type SentimentLevel = 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';

interface SentimentSource {
  name: string;
  type: 'news' | 'social' | 'analyst' | 'insider';
  score: number;
  confidence: number;
  sampleSize: number;
  lastUpdated: string;
}

interface NewsSentiment {
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: SentimentLevel;
  score: number;
  relevance: number;
  summary: string;
}

interface SocialSentiment {
  platform: string;
  mentions: number;
  sentimentScore: number;
  volumeChange: number;
  topTopics: string[];
  influencerSentiment: number;
}

interface FearGreedIndex {
  value: number;
  level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  components: {
    marketMomentum: number;
    stockPriceStrength: number;
    stockPriceBreadth: number;
    putCallRatio: number;
    marketVolatility: number;
    safehavenDemand: number;
    junkBondDemand: number;
  };
  history: Array<{ date: string; value: number }>;
}

interface SentimentAnalysisResult {
  symbol: string;
  overallSentiment: SentimentLevel;
  overallScore: number;
  confidence: number;
  sources: SentimentSource[];
  news: NewsSentiment[];
  social: SocialSentiment[];
  momentum: {
    current: number;
    previous: number;
    change: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    velocity: number;
  };
  fearGreedIndex: FearGreedIndex;
  indicators: Array<{
    name: string;
    value: number;
    interpretation: string;
    weight: number;
  }>;
  aiInterpretation: string;
  tradingImplications: {
    signal: 'buy' | 'sell' | 'hold';
    strength: 'strong' | 'moderate' | 'weak';
    reasoning: string;
    risks: string[];
  };
  historicalSentiment: Array<{
    date: string;
    score: number;
    level: SentimentLevel;
  }>;
}

const sentimentColors: Record<SentimentLevel, string> = {
  very_bearish: 'bg-red-600',
  bearish: 'bg-red-400',
  neutral: 'bg-yellow-500',
  bullish: 'bg-green-400',
  very_bullish: 'bg-green-600',
};

const sentimentIcons: Record<SentimentLevel, React.ReactNode> = {
  very_bearish: <TrendingDown className="h-5 w-5" />,
  bearish: <TrendingDown className="h-5 w-5" />,
  neutral: <Minus className="h-5 w-5" />,
  bullish: <TrendingUp className="h-5 w-5" />,
  very_bullish: <TrendingUp className="h-5 w-5" />,
};

const fearGreedColors: Record<string, string> = {
  extreme_fear: 'text-red-600',
  fear: 'text-red-400',
  neutral: 'text-yellow-500',
  greed: 'text-green-400',
  extreme_greed: 'text-green-600',
};

export function SentimentAnalysis() {
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState<SentimentAnalysisResult | null>(null);

  const analyzeMutation = trpc.sentiment.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data as SentimentAnalysisResult);
    },
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({ symbol: symbol.toUpperCase() });
  };

  const formatSentiment = (level: SentimentLevel) => {
    return level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Sentiment Analysis
          </CardTitle>
          <CardDescription>
            Aggregate sentiment from news, social media, and analyst reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Stock Symbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzeMutation.isPending}
                className="w-full md:w-auto"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Sentiment...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Sentiment
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="feargreed">Fear & Greed</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Overall Sentiment */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${sentimentColors[result.overallSentiment]} text-white`}>
                      {sentimentIcons[result.overallSentiment]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{formatSentiment(result.overallSentiment)}</h3>
                      <p className="text-muted-foreground">Overall market sentiment for {result.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {result.overallScore >= 0 ? '+' : ''}{(result.overallScore * 100).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Sentiment Score</div>
                    <Badge variant="outline" className="mt-1">
                      {(result.confidence * 100).toFixed(0)}% Confidence
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Gauge */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative h-8 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 rounded-full">
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-black rounded-full shadow-lg transition-all"
                    style={{ left: `${((result.overallScore + 1) / 2) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Very Bearish</span>
                  <span>Neutral</span>
                  <span>Very Bullish</span>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Sources */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.sources.map((source) => (
                <Card key={source.name}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {source.type === 'news' && <Newspaper className="h-4 w-4" />}
                      {source.type === 'social' && <Twitter className="h-4 w-4" />}
                      {source.type === 'analyst' && <Users className="h-4 w-4" />}
                      {source.type === 'insider' && <Activity className="h-4 w-4" />}
                      <span className="text-sm font-medium">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {source.score > 0 ? (
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                      ) : source.score < 0 ? (
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className={`font-bold ${
                        source.score > 0 ? 'text-green-500' : 
                        source.score < 0 ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {source.score >= 0 ? '+' : ''}{(source.score * 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {source.sampleSize.toLocaleString()} samples
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Interpretation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Interpretation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{result.aiInterpretation}</p>
              </CardContent>
            </Card>

            {/* Sentiment Momentum */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sentiment Momentum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {result.momentum.current >= 0 ? '+' : ''}{(result.momentum.current * 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Current</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {result.momentum.previous >= 0 ? '+' : ''}{(result.momentum.previous * 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Previous</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className={`text-2xl font-bold ${
                      result.momentum.change > 0 ? 'text-green-500' : 
                      result.momentum.change < 0 ? 'text-red-500' : ''
                    }`}>
                      {result.momentum.change >= 0 ? '+' : ''}{(result.momentum.change * 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Change</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Badge variant={
                      result.momentum.trend === 'improving' ? 'default' :
                      result.momentum.trend === 'deteriorating' ? 'destructive' : 'secondary'
                    }>
                      {result.momentum.trend}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">Trend</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  Recent News Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.news.map((item, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.headline}</h4>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <span>{item.source}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge className={sentimentColors[item.sentiment]}>
                        {formatSentiment(item.sentiment)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Score:</span>
                        <span className={`text-sm font-medium ${
                          item.score > 0 ? 'text-green-500' : 
                          item.score < 0 ? 'text-red-500' : ''
                        }`}>
                          {item.score >= 0 ? '+' : ''}{(item.score * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Relevance:</span>
                        <Progress value={item.relevance * 100} className="w-20 h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.social.map((platform) => (
                <Card key={platform.platform}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Twitter className="h-5 w-5" />
                      {platform.platform}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{platform.mentions.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Mentions</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className={`text-2xl font-bold ${
                          platform.volumeChange > 0 ? 'text-green-500' : 
                          platform.volumeChange < 0 ? 'text-red-500' : ''
                        }`}>
                          {platform.volumeChange >= 0 ? '+' : ''}{platform.volumeChange.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Volume Change</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Sentiment Score</div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(platform.sentimentScore + 1) / 2 * 100} 
                          className="flex-1 h-3"
                        />
                        <span className={`font-bold ${
                          platform.sentimentScore > 0 ? 'text-green-500' : 
                          platform.sentimentScore < 0 ? 'text-red-500' : ''
                        }`}>
                          {platform.sentimentScore >= 0 ? '+' : ''}{(platform.sentimentScore * 100).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Influencer Sentiment</div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(platform.influencerSentiment + 1) / 2 * 100} 
                          className="flex-1 h-3"
                        />
                        <span className={`font-bold ${
                          platform.influencerSentiment > 0 ? 'text-green-500' : 
                          platform.influencerSentiment < 0 ? 'text-red-500' : ''
                        }`}>
                          {platform.influencerSentiment >= 0 ? '+' : ''}{(platform.influencerSentiment * 100).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Top Topics</div>
                      <div className="flex flex-wrap gap-1">
                        {platform.topTopics.map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            #{topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Fear & Greed Tab */}
          <TabsContent value="feargreed" className="space-y-4">
            {/* Main Gauge */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Gauge className={`h-16 w-16 mx-auto mb-4 ${fearGreedColors[result.fearGreedIndex.level]}`} />
                  <div className={`text-5xl font-bold ${fearGreedColors[result.fearGreedIndex.level]}`}>
                    {result.fearGreedIndex.value}
                  </div>
                  <div className="text-xl font-medium mt-2 capitalize">
                    {result.fearGreedIndex.level.replace('_', ' ')}
                  </div>
                </div>

                {/* Gauge Bar */}
                <div className="mt-6 relative h-6 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 rounded-full">
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white border-2 border-black rounded shadow-lg transition-all"
                    style={{ left: `${result.fearGreedIndex.value}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Extreme Fear (0)</span>
                  <span>Neutral (50)</span>
                  <span>Extreme Greed (100)</span>
                </div>
              </CardContent>
            </Card>

            {/* Components */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Index Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(result.fearGreedIndex.components).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-40 text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <Progress value={value} className="flex-1 h-3" />
                      <div className="w-12 text-right font-mono">{value.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* History Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">30-Day History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-end gap-1">
                  {result.fearGreedIndex.history.map((item, i) => {
                    const color = item.value < 25 ? 'bg-red-600' :
                                  item.value < 45 ? 'bg-red-400' :
                                  item.value < 55 ? 'bg-yellow-500' :
                                  item.value < 75 ? 'bg-green-400' : 'bg-green-600';
                    return (
                      <div
                        key={i}
                        className={`flex-1 ${color} rounded-t transition-all hover:opacity-80`}
                        style={{ height: `${item.value}%` }}
                        title={`${item.date}: ${item.value}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{result.fearGreedIndex.history[0]?.date}</span>
                  <span>{result.fearGreedIndex.history[result.fearGreedIndex.history.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-4">
            {/* Trading Signal */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-6">
                  <div className={`p-6 rounded-full ${
                    result.tradingImplications.signal === 'buy' ? 'bg-green-500' :
                    result.tradingImplications.signal === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                  } text-white`}>
                    {result.tradingImplications.signal === 'buy' ? (
                      <TrendingUp className="h-10 w-10" />
                    ) : result.tradingImplications.signal === 'sell' ? (
                      <TrendingDown className="h-10 w-10" />
                    ) : (
                      <Minus className="h-10 w-10" />
                    )}
                  </div>
                  <div>
                    <div className="text-3xl font-bold capitalize">{result.tradingImplications.signal}</div>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {result.tradingImplications.strength} Signal
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reasoning */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signal Reasoning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{result.tradingImplications.reasoning}</p>
              </CardContent>
            </Card>

            {/* Risks */}
            {result.tradingImplications.risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tradingImplications.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sentiment Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sentiment Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.indicators.map((indicator, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{indicator.name}</span>
                        <span className={`font-bold ${
                          indicator.value > 0 ? 'text-green-500' : 
                          indicator.value < 0 ? 'text-red-500' : ''
                        }`}>
                          {indicator.value >= 0 ? '+' : ''}{(indicator.value * 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{indicator.interpretation}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Weight:</span>
                        <Progress value={indicator.weight * 100} className="w-20 h-1" />
                        <span className="text-xs">{(indicator.weight * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Historical Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sentiment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-24 flex items-center">
                  <div className="w-full h-full flex items-center gap-1">
                    {result.historicalSentiment.slice(-30).map((item, i) => {
                      const normalizedHeight = ((item.score + 1) / 2) * 100;
                      return (
                        <div
                          key={i}
                          className={`flex-1 ${sentimentColors[item.level]} rounded transition-all hover:opacity-80`}
                          style={{ height: `${normalizedHeight}%` }}
                          title={`${item.date}: ${formatSentiment(item.level)} (${(item.score * 100).toFixed(0)})`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{result.historicalSentiment[0]?.date}</span>
                  <span>{result.historicalSentiment[result.historicalSentiment.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
