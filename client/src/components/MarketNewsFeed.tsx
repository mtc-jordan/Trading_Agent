import { useState, useMemo, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Newspaper,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  Filter,
  Bookmark,
  Share2,
  ChevronRight,
  Sparkles,
  Globe,
  Building2,
  Zap,
  Brain,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SentimentTrendMini } from '@/components/SentimentTrendChart';

interface NewsArticle {
  id: string;
  headline: string;
  summary?: string;
  author?: string;
  source: string;
  url: string;
  symbols?: string[];
  images?: Array<{ size: string; url: string }>;
  createdAt: Date;
  updatedAt?: Date;
}

interface SentimentResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

interface MarketNewsFeedProps {
  watchlistSymbols?: string[];
  compact?: boolean;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

// Get source icon
function getSourceIcon(source: string) {
  const lowerSource = source.toLowerCase();
  if (lowerSource.includes('bloomberg')) return <Building2 className="h-3 w-3" />;
  if (lowerSource.includes('reuters')) return <Globe className="h-3 w-3" />;
  if (lowerSource.includes('cnbc') || lowerSource.includes('benzinga')) return <Zap className="h-3 w-3" />;
  return <Newspaper className="h-3 w-3" />;
}

// Sentiment Badge Component
function SentimentBadge({ 
  sentiment, 
  isLoading = false,
  showReasoning = false,
  reasoning = '',
}: { 
  sentiment: SentimentResult | null; 
  isLoading?: boolean;
  showReasoning?: boolean;
  reasoning?: string;
}) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">
        <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
        Analyzing...
      </Badge>
    );
  }

  if (!sentiment) return null;

  const config = {
    bullish: { 
      color: 'text-green-500', 
      bg: 'bg-green-500/10 border-green-500/30', 
      icon: TrendingUp, 
      label: 'Bullish',
      hoverBg: 'hover:bg-green-500/20'
    },
    bearish: { 
      color: 'text-red-500', 
      bg: 'bg-red-500/10 border-red-500/30', 
      icon: TrendingDown, 
      label: 'Bearish',
      hoverBg: 'hover:bg-red-500/20'
    },
    neutral: { 
      color: 'text-gray-400', 
      bg: 'bg-gray-500/10 border-gray-500/30', 
      icon: Minus, 
      label: 'Neutral',
      hoverBg: 'hover:bg-gray-500/20'
    },
  };

  const { color, bg, icon: Icon, label, hoverBg } = config[sentiment.sentiment];

  const badge = (
    <Badge 
      variant="outline" 
      className={`${color} ${bg} ${hoverBg} text-[10px] px-1.5 py-0 transition-colors cursor-default`}
    >
      <Icon className="h-2.5 w-2.5 mr-0.5" />
      {label}
      {sentiment.confidence > 0 && (
        <span className="ml-1 opacity-70">{sentiment.confidence}%</span>
      )}
    </Badge>
  );

  if (showReasoning && reasoning) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px]">
            <div className="flex items-start gap-2">
              <Brain className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-xs">{reasoning}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

// News Card Component
function NewsCard({ 
  article, 
  compact = false,
  sentiment,
  isAnalyzing = false,
}: { 
  article: NewsArticle; 
  compact?: boolean;
  sentiment?: SentimentResult | null;
  isAnalyzing?: boolean;
}) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const thumbnail = article.images?.find(img => img.size === 'thumb' || img.size === 'small')?.url;
  
  if (compact) {
    return (
      <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/50 last:border-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {getSourceIcon(article.source)}
              {article.source}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(article.createdAt)}
            </span>
            <SentimentBadge 
              sentiment={sentiment || null} 
              isLoading={isAnalyzing}
              showReasoning={true}
              reasoning={sentiment?.reasoning}
            />
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-primary transition-colors line-clamp-2"
          >
            {article.headline}
          </a>
          {article.symbols && article.symbols.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {article.symbols.slice(0, 3).map(symbol => (
                <Badge key={symbol} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                  {symbol}
                </Badge>
              ))}
              {article.symbols.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{article.symbols.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  }
  
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      <div className="flex">
        {thumbnail && (
          <div className="w-32 h-full flex-shrink-0 relative overflow-hidden">
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/80" />
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {getSourceIcon(article.source)}
                {article.source}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(article.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setIsBookmarked(!isBookmarked)}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-primary text-primary' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bookmark</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.share?.({ url: article.url, title: article.headline })}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group/link"
          >
            <h3 className="font-semibold text-sm mb-2 group-hover/link:text-primary transition-colors line-clamp-2">
              {article.headline}
            </h3>
            {article.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {article.summary}
              </p>
            )}
          </a>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {article.symbols && article.symbols.slice(0, 4).map(symbol => (
                <Badge key={symbol} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono hover:bg-primary/20 cursor-pointer">
                  {symbol}
                </Badge>
              ))}
              {article.symbols && article.symbols.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{article.symbols.length - 4} more</span>
              )}
            </div>
            <SentimentBadge 
              sentiment={sentiment || null} 
              isLoading={isAnalyzing}
              showReasoning={true}
              reasoning={sentiment?.reasoning}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

// Loading skeleton
function NewsLoadingSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <Skeleton className="w-32 h-32" />
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function MarketNewsFeed({
  watchlistSymbols = [],
  compact = false,
  maxItems = 20,
  showHeader = true,
  className = '',
}: MarketNewsFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'trending'>('all');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');
  const [sentimentMap, setSentimentMap] = useState<Map<string, SentimentResult>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [aiEnabled, setAiEnabled] = useState(true);
  
  // Fetch news for all symbols
  const { data: allNews, isLoading: allNewsLoading, refetch: refetchAll } = trpc.alpaca.getNews.useQuery(
    { limit: maxItems },
    { refetchInterval: 60000 } // Refresh every minute
  );
  
  // Fetch news for watchlist symbols
  const { data: watchlistNews, isLoading: watchlistLoading, refetch: refetchWatchlist } = trpc.alpaca.getNews.useQuery(
    { symbols: watchlistSymbols, limit: maxItems },
    { enabled: watchlistSymbols.length > 0, refetchInterval: 60000 }
  );
  
  // AI Sentiment Analysis mutation
  const analyzeSentimentMutation = trpc.alpaca.analyzeNewsSentiment.useMutation({
    onSuccess: (results) => {
      setSentimentMap(prev => {
        const newMap = new Map(prev);
        results.forEach(result => {
          newMap.set(result.articleId, result.sentiment);
        });
        return newMap;
      });
      setAnalyzingIds(new Set());
    },
    onError: (error) => {
      console.error('Sentiment analysis error:', error);
      setAnalyzingIds(new Set());
    },
  });
  
  // Analyze sentiment for new articles
  const analyzeArticles = useCallback((articles: NewsArticle[]) => {
    if (!aiEnabled || articles.length === 0) return;
    
    // Filter articles that haven't been analyzed yet
    const unanalyzed = articles.filter(a => !sentimentMap.has(a.id) && !analyzingIds.has(a.id));
    
    if (unanalyzed.length === 0) return;
    
    // Mark as analyzing
    setAnalyzingIds(prev => {
      const newSet = new Set(prev);
      unanalyzed.forEach(a => newSet.add(a.id));
      return newSet;
    });
    
    // Analyze in batches of 10
    const batch = unanalyzed.slice(0, 10);
    analyzeSentimentMutation.mutate({
      articles: batch.map(a => ({ id: a.id, headline: a.headline })),
    });
  }, [aiEnabled, sentimentMap, analyzingIds, analyzeSentimentMutation]);
  
  // Trigger analysis when news loads
  useEffect(() => {
    if (allNews && aiEnabled) {
      analyzeArticles(allNews);
    }
  }, [allNews, aiEnabled, analyzeArticles]);
  
  useEffect(() => {
    if (watchlistNews && aiEnabled) {
      analyzeArticles(watchlistNews);
    }
  }, [watchlistNews, aiEnabled, analyzeArticles]);
  
  // Get unique sources for filtering
  const sources = useMemo(() => {
    const allSources = new Set<string>();
    allNews?.forEach(article => allSources.add(article.source));
    watchlistNews?.forEach(article => allSources.add(article.source));
    return Array.from(allSources).sort();
  }, [allNews, watchlistNews]);
  
  // Filter and sort news
  const filteredNews = useMemo(() => {
    let news: NewsArticle[] = [];
    
    if (activeTab === 'watchlist' && watchlistNews) {
      news = watchlistNews;
    } else if (activeTab === 'trending' && allNews) {
      // Sort by number of symbols mentioned (more symbols = more trending)
      news = [...allNews].sort((a, b) => (b.symbols?.length || 0) - (a.symbols?.length || 0));
    } else if (allNews) {
      news = allNews;
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      news = news.filter(article =>
        article.headline.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.symbols?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    // Apply source filter
    if (selectedSource) {
      news = news.filter(article => article.source === selectedSource);
    }
    
    // Apply sentiment filter
    if (selectedSentiment !== 'all') {
      news = news.filter(article => {
        const sentiment = sentimentMap.get(article.id);
        return sentiment?.sentiment === selectedSentiment;
      });
    }
    
    return news;
  }, [activeTab, allNews, watchlistNews, searchQuery, selectedSource, selectedSentiment, sentimentMap]);
  
  // Sentiment statistics
  const sentimentStats = useMemo(() => {
    let bullish = 0, bearish = 0, neutral = 0;
    filteredNews.forEach(article => {
      const sentiment = sentimentMap.get(article.id);
      if (sentiment) {
        if (sentiment.sentiment === 'bullish') bullish++;
        else if (sentiment.sentiment === 'bearish') bearish++;
        else neutral++;
      }
    });
    const total = bullish + bearish + neutral;
    return { bullish, bearish, neutral, total };
  }, [filteredNews, sentimentMap]);
  
  const isLoading = activeTab === 'watchlist' ? watchlistLoading : allNewsLoading;
  
  const handleRefresh = () => {
    if (activeTab === 'watchlist') {
      refetchWatchlist();
    } else {
      refetchAll();
    }
  };
  
  return (
    <Card className={`${className}`}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Newspaper className="h-5 w-5 text-primary" />
              Market News
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* AI Sentiment Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={aiEnabled ? "default" : "ghost"} 
                      size="sm" 
                      className={`h-8 gap-1.5 ${aiEnabled ? 'bg-primary/90 hover:bg-primary' : ''}`}
                      onClick={() => setAiEnabled(!aiEnabled)}
                    >
                      <Brain className={`h-4 w-4 ${analyzeSentimentMutation.isPending ? 'animate-pulse' : ''}`} />
                      <span className="text-xs hidden sm:inline">AI Sentiment</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {aiEnabled ? 'AI sentiment analysis enabled' : 'Enable AI sentiment analysis'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh news</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Filter className={`h-4 w-4 ${selectedSource ? 'text-primary' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedSource(null)}>
                    All Sources
                    {!selectedSource && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  {sources.map(source => (
                    <DropdownMenuItem key={source} onClick={() => setSelectedSource(source)}>
                      {source}
                      {selectedSource === source && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Sentiment Filter Bar */}
          {aiEnabled && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted/50">
              <Brain className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground">Filter:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant={selectedSentiment === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 px-2.5 text-xs ${selectedSentiment === 'all' ? 'bg-primary/90' : ''}`}
                  onClick={() => setSelectedSentiment('all')}
                >
                  All
                  {sentimentStats.total > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                      {sentimentStats.total}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={selectedSentiment === 'bullish' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 px-2.5 text-xs ${selectedSentiment === 'bullish' ? 'bg-green-600 hover:bg-green-700' : 'text-green-500 hover:text-green-400 hover:bg-green-500/10'}`}
                  onClick={() => setSelectedSentiment('bullish')}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Bullish
                  {sentimentStats.bullish > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-green-500/20">
                      {sentimentStats.bullish}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={selectedSentiment === 'bearish' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 px-2.5 text-xs ${selectedSentiment === 'bearish' ? 'bg-red-600 hover:bg-red-700' : 'text-red-500 hover:text-red-400 hover:bg-red-500/10'}`}
                  onClick={() => setSelectedSentiment('bearish')}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Bearish
                  {sentimentStats.bearish > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-red-500/20">
                      {sentimentStats.bearish}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={selectedSentiment === 'neutral' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 px-2.5 text-xs ${selectedSentiment === 'neutral' ? 'bg-gray-600 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'}`}
                  onClick={() => setSelectedSentiment('neutral')}
                >
                  <Minus className="h-3 w-3 mr-1" />
                  Neutral
                  {sentimentStats.neutral > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-gray-500/20">
                      {sentimentStats.neutral}
                    </Badge>
                  )}
                </Button>
              </div>
              {analyzeSentimentMutation.isPending && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing...
                </span>
              )}
            </div>
          )}
          
          {/* Sentiment Trend Chart */}
          {aiEnabled && (
            <div className="mt-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <SentimentTrendMini />
            </div>
          )}
          
          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? 'pt-0' : ''}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all" className="text-xs">
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              All News
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="text-xs" disabled={watchlistSymbols.length === 0}>
              <Bookmark className="h-3.5 w-3.5 mr-1.5" />
              Watchlist
              {watchlistSymbols.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">
                  {watchlistSymbols.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Trending
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className={compact ? 'h-[400px]' : 'h-[600px]'}>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <NewsLoadingSkeleton key={i} compact={compact} />
                  ))}
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Newspaper className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No news found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {selectedSentiment !== 'all' 
                      ? `No ${selectedSentiment} articles found. Try a different sentiment filter.`
                      : searchQuery 
                        ? 'Try a different search term' 
                        : 'Check back later for updates'}
                  </p>
                  {selectedSentiment !== 'all' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 text-xs"
                      onClick={() => setSelectedSentiment('all')}
                    >
                      Clear sentiment filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className={compact ? 'divide-y divide-border/50' : 'space-y-3'}>
                  {filteredNews.map(article => (
                    <NewsCard 
                      key={article.id} 
                      article={article} 
                      compact={compact}
                      sentiment={sentimentMap.get(article.id)}
                      isAnalyzing={analyzingIds.has(article.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        {filteredNews.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Showing {filteredNews.length} articles
              {selectedSentiment !== 'all' && (
                <span className={`ml-1 ${selectedSentiment === 'bullish' ? 'text-green-500' : selectedSentiment === 'bearish' ? 'text-red-500' : 'text-gray-400'}`}>
                  ({selectedSentiment})
                </span>
              )}
              {selectedSource && ` from ${selectedSource}`}
            </p>
            <div className="flex items-center gap-2">
              {aiEnabled && (
                <Badge variant="outline" className="text-[10px]">
                  <Brain className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <a href="https://alpaca.markets/docs/api-references/market-data-api/news-data/" target="_blank" rel="noopener noreferrer">
                  Powered by Alpaca
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact news ticker for header/footer
export function NewsTicker({ className = '' }: { className?: string }) {
  const { data: news } = trpc.alpaca.getNews.useQuery(
    { limit: 10 },
    { refetchInterval: 120000 }
  );
  
  if (!news || news.length === 0) return null;
  
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
        {news.map((article, index) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-medium">{article.symbols?.[0] || 'NEWS'}</span>
            <span className="max-w-[300px] truncate">{article.headline}</span>
            {index < news.length - 1 && <span className="text-border">•</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

export default MarketNewsFeed;
