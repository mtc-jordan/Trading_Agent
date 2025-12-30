import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Users,
  Heart,
  Share2,
  Search,
  Bell,
  Twitter,
  Hash,
  Flame,
  Eye,
  Star,
  Zap,
  Activity,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

// Platform colors
const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  reddit: '#FF4500',
  stocktwits: '#1E90FF',
  discord: '#5865F2',
  telegram: '#0088CC'
};

// Sentiment colors
function getSentimentColor(sentiment: number): string {
  if (sentiment >= 0.5) return '#22c55e';
  if (sentiment >= 0.2) return '#84cc16';
  if (sentiment >= -0.2) return '#f59e0b';
  if (sentiment >= -0.5) return '#f97316';
  return '#ef4444';
}

function getSentimentBadgeVariant(label: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (label) {
    case 'very_bullish':
    case 'bullish':
      return 'default';
    case 'very_bearish':
    case 'bearish':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatSentimentLabel(label: string): string {
  return label.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function SocialSentiment() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const symbolSentiment = trpc.broker.getSymbolSentiment.useQuery({ symbol: selectedSymbol });
  const trendingSymbols = trpc.broker.getTrendingSentiment.useQuery();
  const sentimentAlerts = trpc.broker.getSentimentAlerts.useQuery({ symbol: selectedSymbol });
  const sentimentHeatmap = trpc.broker.getSentimentHeatmap.useQuery();

  const handleRefresh = () => {
    symbolSentiment.refetch();
    trendingSymbols.refetch();
    sentimentAlerts.refetch();
  };

  // Format trend data for chart
  const trendChartData = useMemo(() => {
    if (!symbolSentiment.data?.sentimentTrend) return [];
    
    const grouped: Record<number, { timestamp: number; twitter: number; reddit: number; stocktwits: number }> = {};
    
    symbolSentiment.data.sentimentTrend.forEach((point: any) => {
      const hour = Math.floor(point.timestamp / 3600000) * 3600000;
      if (!grouped[hour]) {
        grouped[hour] = { timestamp: hour, twitter: 0, reddit: 0, stocktwits: 0 };
      }
      if (point.platform === 'twitter') grouped[hour].twitter = point.sentiment;
      if (point.platform === 'reddit') grouped[hour].reddit = point.sentiment;
      if (point.platform === 'stocktwits') grouped[hour].stocktwits = point.sentiment;
    });
    
    return Object.values(grouped).slice(-24);
  }, [symbolSentiment.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Social Sentiment Analysis</h1>
            <p className="text-muted-foreground mt-1">
              Real-time sentiment from Twitter, Reddit, StockTwits & more
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={symbolSentiment.isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${symbolSentiment.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search and Symbol Selection */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm) {
                  setSelectedSymbol(searchTerm.toUpperCase());
                }
              }}
              className="pl-9"
            />
          </div>
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
              <SelectItem value="stocktwits">StockTwits</SelectItem>
              <SelectItem value="discord">Discord</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Stats Cards */}
        {symbolSentiment.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Sentiment</p>
                    <p className="text-3xl font-bold" style={{ color: getSentimentColor(symbolSentiment.data.overallSentiment) }}>
                      {symbolSentiment.data.overallSentiment > 0 ? '+' : ''}{symbolSentiment.data.overallSentiment.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={getSentimentBadgeVariant(symbolSentiment.data.sentimentLabel)}>
                    {formatSentimentLabel(symbolSentiment.data.sentimentLabel)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {symbolSentiment.data.sentimentMomentum > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : symbolSentiment.data.sentimentMomentum < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {symbolSentiment.data.sentimentMomentum > 0 ? '+' : ''}{symbolSentiment.data.sentimentMomentum}% momentum
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Social Volume</p>
                    <p className="text-3xl font-bold">{symbolSentiment.data.socialVolume.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <MessageSquare className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-sm ${symbolSentiment.data.volumeChange24h > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {symbolSentiment.data.volumeChange24h > 0 ? '+' : ''}{symbolSentiment.data.volumeChange24h}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs 24h ago</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Buzz Score</p>
                    <p className="text-3xl font-bold">{symbolSentiment.data.buzzScore}</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-500/20">
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
                <Progress value={symbolSentiment.data.buzzScore} className="mt-4 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Influencer Mentions</p>
                    <p className="text-3xl font-bold">{symbolSentiment.data.influencerMentions}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/20">
                    <Star className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {symbolSentiment.data.uniqueMentioners} unique mentioners
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sentiment Trend (24h)
              </CardTitle>
              <CardDescription>
                Sentiment across platforms over the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit' })}
                      stroke="#666"
                    />
                    <YAxis domain={[-1, 1]} stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                      labelFormatter={(ts) => new Date(ts).toLocaleString()}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="twitter" 
                      stroke={PLATFORM_COLORS.twitter} 
                      fill={PLATFORM_COLORS.twitter}
                      fillOpacity={0.3}
                      name="Twitter"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="reddit" 
                      stroke={PLATFORM_COLORS.reddit} 
                      fill={PLATFORM_COLORS.reddit}
                      fillOpacity={0.3}
                      name="Reddit"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="stocktwits" 
                      stroke={PLATFORM_COLORS.stocktwits} 
                      fill={PLATFORM_COLORS.stocktwits}
                      fillOpacity={0.3}
                      name="StockTwits"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Platform Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Platform Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {symbolSentiment.data?.platformBreakdown?.map((platform: any) => (
                <div key={platform.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: PLATFORM_COLORS[platform.platform] }}
                      />
                      <span className="capitalize font-medium">{platform.platform}</span>
                    </div>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: getSentimentColor(platform.overallSentiment),
                        color: getSentimentColor(platform.overallSentiment)
                      }}
                    >
                      {platform.overallSentiment > 0 ? '+' : ''}{platform.overallSentiment.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {platform.postCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {platform.uniqueAuthors}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {platform.engagementScore}
                    </span>
                  </div>
                  <Progress 
                    value={(platform.overallSentiment + 1) * 50} 
                    className="h-1.5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trending Symbols */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Trending Symbols
              </CardTitle>
              <CardDescription>
                Most discussed symbols across social media
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trendingSymbols.data?.map((item: any, index: number) => (
                  <div 
                    key={item.symbol}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedSymbol(item.symbol)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{item.symbol}</p>
                        <p className="text-sm text-muted-foreground">{item.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p 
                          className="font-medium"
                          style={{ color: getSentimentColor(item.sentiment) }}
                        >
                          {item.sentiment > 0 ? '+' : ''}{item.sentiment.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.volume.toLocaleString()} mentions
                        </p>
                      </div>
                      <Badge variant="outline">
                        {item.volumeChange > 0 ? '+' : ''}{item.volumeChange}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Sentiment Alerts
              </CardTitle>
              <CardDescription>
                Recent sentiment changes and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentAlerts.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p>No alerts for {selectedSymbol}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentimentAlerts.data?.map((alert: any) => (
                    <div 
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                        alert.severity === 'high' ? 'border-orange-500 bg-orange-500/10' :
                        alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                        'border-blue-500 bg-blue-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Influencers & Key Narratives */}
        {symbolSentiment.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top Influencers
                </CardTitle>
                <CardDescription>
                  Key opinion leaders discussing {selectedSymbol}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {symbolSentiment.data.topInfluencers?.map((influencer: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: PLATFORM_COLORS[influencer.platform] + '30' }}
                        >
                          <span className="text-sm font-bold">
                            {influencer.author.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{influencer.author}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {influencer.platform} • {(influencer.followers / 1000).toFixed(0)}K followers
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={influencer.sentiment > 0 ? 'default' : influencer.sentiment < 0 ? 'destructive' : 'secondary'}
                      >
                        {influencer.sentiment > 0 ? 'Bullish' : influencer.sentiment < 0 ? 'Bearish' : 'Neutral'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Key Narratives & Risk Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Key Narratives</h4>
                  <div className="space-y-2">
                    {symbolSentiment.data.keyNarratives?.map((narrative: string, index: number) => (
                      <div 
                        key={index}
                        className="flex items-start gap-2 p-2 rounded bg-muted/50"
                      >
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <p className="text-sm">{narrative}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {symbolSentiment.data.riskSignals?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-red-500">Risk Signals</h4>
                    <div className="space-y-2">
                      {symbolSentiment.data.riskSignals?.map((signal: string, index: number) => (
                        <div 
                          key={index}
                          className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/30"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                          <p className="text-sm">{signal}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-3">Related Symbols</h4>
                  <div className="flex flex-wrap gap-2">
                    {symbolSentiment.data.relatedSymbols?.map((related: any) => (
                      <Badge 
                        key={related.symbol}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setSelectedSymbol(related.symbol)}
                      >
                        {related.symbol}
                        <span className="ml-1 text-muted-foreground">
                          ({related.coMentions})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
