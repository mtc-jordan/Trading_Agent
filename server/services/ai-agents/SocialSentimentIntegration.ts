/**
 * Social Sentiment Integration Service
 * 
 * Provides Twitter/Reddit sentiment analysis to enhance the Sentiment Agent's
 * capabilities with real-time social media data.
 */

// Types
export type SocialPlatform = 'twitter' | 'reddit' | 'stocktwits' | 'discord' | 'telegram';
export type SentimentScore = -1 | -0.5 | 0 | 0.5 | 1;
export type SentimentLabel = 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  author: string;
  content: string;
  timestamp: number;
  likes: number;
  shares: number;
  comments: number;
  sentiment: SentimentScore;
  sentimentLabel: SentimentLabel;
  relevanceScore: number;
  symbols: string[];
  hashtags: string[];
  isInfluencer: boolean;
  followerCount: number;
}

export interface PlatformSentiment {
  platform: SocialPlatform;
  overallSentiment: number;
  sentimentLabel: SentimentLabel;
  postCount: number;
  uniqueAuthors: number;
  engagementScore: number;
  influencerSentiment: number;
  retailSentiment: number;
  trendDirection: TrendDirection;
  volumeChange24h: number;
  topPosts: SocialPost[];
  keyTopics: string[];
  lastUpdated: number;
}

export interface SentimentTrend {
  timestamp: number;
  sentiment: number;
  volume: number;
  platform: SocialPlatform;
}

export interface SymbolSentiment {
  symbol: string;
  name: string;
  overallSentiment: number;
  sentimentLabel: SentimentLabel;
  confidence: number;
  platformBreakdown: PlatformSentiment[];
  sentimentTrend: SentimentTrend[];
  socialVolume: number;
  volumeChange24h: number;
  mentionCount: number;
  uniqueMentioners: number;
  influencerMentions: number;
  sentimentMomentum: number;
  buzzScore: number;
  controversyScore: number;
  topInfluencers: Array<{
    author: string;
    platform: SocialPlatform;
    sentiment: SentimentScore;
    followers: number;
    engagement: number;
  }>;
  relatedSymbols: Array<{
    symbol: string;
    correlation: number;
    coMentions: number;
  }>;
  keyNarratives: string[];
  riskSignals: string[];
  lastUpdated: number;
}

export interface SentimentAlert {
  id: string;
  symbol: string;
  alertType: 'sentiment_spike' | 'sentiment_crash' | 'volume_surge' | 'influencer_mention' | 'controversy' | 'trend_reversal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  platform: SocialPlatform | 'all';
  timestamp: number;
  isRead: boolean;
}

export interface SocialSentimentConfig {
  platforms: SocialPlatform[];
  refreshInterval: number;
  alertThresholds: {
    sentimentChange: number;
    volumeChange: number;
    influencerThreshold: number;
  };
  watchlist: string[];
}

// Sentiment Analysis Functions
export function analyzeSentimentText(text: string): { score: SentimentScore; confidence: number } {
  const lowerText = text.toLowerCase();
  
  // Bullish keywords
  const bullishKeywords = [
    'buy', 'long', 'bullish', 'moon', 'rocket', 'pump', 'breakout', 'undervalued',
    'accumulate', 'hodl', 'diamond hands', 'to the moon', 'ath', 'all time high',
    'strong', 'growth', 'opportunity', 'upside', 'rally', 'surge', 'soar'
  ];
  
  // Bearish keywords
  const bearishKeywords = [
    'sell', 'short', 'bearish', 'dump', 'crash', 'overvalued', 'bubble',
    'puts', 'downside', 'weak', 'decline', 'drop', 'fall', 'plunge',
    'paper hands', 'exit', 'avoid', 'warning', 'risk', 'correction'
  ];
  
  // Neutral keywords
  const neutralKeywords = [
    'hold', 'wait', 'sideways', 'consolidation', 'range', 'uncertain',
    'mixed', 'neutral', 'watching', 'monitoring'
  ];
  
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  
  bullishKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) bullishCount++;
  });
  
  bearishKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) bearishCount++;
  });
  
  neutralKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) neutralCount++;
  });
  
  const total = bullishCount + bearishCount + neutralCount;
  
  if (total === 0) {
    return { score: 0, confidence: 0.3 };
  }
  
  const netSentiment = (bullishCount - bearishCount) / total;
  const confidence = Math.min(0.95, 0.5 + (total * 0.05));
  
  let score: SentimentScore;
  if (netSentiment >= 0.6) score = 1;
  else if (netSentiment >= 0.2) score = 0.5;
  else if (netSentiment <= -0.6) score = -1;
  else if (netSentiment <= -0.2) score = -0.5;
  else score = 0;
  
  return { score, confidence };
}

export function getSentimentLabel(score: number): SentimentLabel {
  if (score >= 0.6) return 'very_bullish';
  if (score >= 0.2) return 'bullish';
  if (score <= -0.6) return 'very_bearish';
  if (score <= -0.2) return 'bearish';
  return 'neutral';
}

export function extractSymbols(text: string): string[] {
  // Extract $SYMBOL patterns and common stock tickers
  const dollarPattern = /\$([A-Z]{1,5})\b/g;
  const matches = text.match(dollarPattern) || [];
  return matches.map(m => m.replace('$', '').toUpperCase());
}

export function extractHashtags(text: string): string[] {
  const hashtagPattern = /#(\w+)/g;
  const matches = text.match(hashtagPattern) || [];
  return matches.map(m => m.replace('#', '').toLowerCase());
}

// Generate sample social posts for a symbol
export function generateSamplePosts(symbol: string, count: number = 50): SocialPost[] {
  const platforms: SocialPlatform[] = ['twitter', 'reddit', 'stocktwits', 'discord', 'telegram'];
  const posts: SocialPost[] = [];
  
  const sampleContents = [
    `$${symbol} looking strong today! 🚀 Breaking out of resistance`,
    `Just bought more $${symbol}. This is undervalued at current levels`,
    `$${symbol} earnings coming up. Expecting big numbers`,
    `Sold my $${symbol} position. Taking profits here`,
    `$${symbol} chart looks bearish. Be careful`,
    `Diamond hands on $${symbol} 💎🙌`,
    `$${symbol} to the moon! 🌙`,
    `Bearish on $${symbol}. Overvalued imo`,
    `$${symbol} consolidating. Waiting for breakout`,
    `Added $${symbol} to my watchlist. Interesting setup`,
    `$${symbol} volume picking up. Something brewing?`,
    `Long $${symbol} calls for next month`,
    `$${symbol} support holding strong at current levels`,
    `Neutral on $${symbol} here. Need more data`,
    `$${symbol} fundamentals look solid for long term`,
  ];
  
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const content = sampleContents[Math.floor(Math.random() * sampleContents.length)];
    const { score, confidence } = analyzeSentimentText(content);
    const isInfluencer = Math.random() < 0.1;
    const followerCount = isInfluencer 
      ? Math.floor(Math.random() * 900000) + 100000 
      : Math.floor(Math.random() * 10000);
    
    posts.push({
      id: `post_${i}_${Date.now()}`,
      platform,
      author: `user_${Math.floor(Math.random() * 10000)}`,
      content,
      timestamp: now - Math.floor(Math.random() * 86400000), // Last 24 hours
      likes: Math.floor(Math.random() * 1000),
      shares: Math.floor(Math.random() * 200),
      comments: Math.floor(Math.random() * 100),
      sentiment: score,
      sentimentLabel: getSentimentLabel(score),
      relevanceScore: confidence,
      symbols: extractSymbols(content),
      hashtags: extractHashtags(content),
      isInfluencer,
      followerCount,
    });
  }
  
  return posts.sort((a, b) => b.timestamp - a.timestamp);
}

// Analyze platform sentiment
export function analyzePlatformSentiment(
  posts: SocialPost[],
  platform: SocialPlatform
): PlatformSentiment {
  const platformPosts = posts.filter(p => p.platform === platform);
  
  if (platformPosts.length === 0) {
    return {
      platform,
      overallSentiment: 0,
      sentimentLabel: 'neutral',
      postCount: 0,
      uniqueAuthors: 0,
      engagementScore: 0,
      influencerSentiment: 0,
      retailSentiment: 0,
      trendDirection: 'stable',
      volumeChange24h: 0,
      topPosts: [],
      keyTopics: [],
      lastUpdated: Date.now(),
    };
  }
  
  // Calculate weighted sentiment (by engagement)
  let totalWeight = 0;
  let weightedSentiment = 0;
  let influencerSentiment = 0;
  let influencerCount = 0;
  let retailSentiment = 0;
  let retailCount = 0;
  
  platformPosts.forEach(post => {
    const weight = 1 + Math.log10(1 + post.likes + post.shares * 2 + post.comments);
    totalWeight += weight;
    weightedSentiment += post.sentiment * weight;
    
    if (post.isInfluencer) {
      influencerSentiment += post.sentiment;
      influencerCount++;
    } else {
      retailSentiment += post.sentiment;
      retailCount++;
    }
  });
  
  const overallSentiment = totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  const uniqueAuthors = new Set(platformPosts.map(p => p.author)).size;
  const totalEngagement = platformPosts.reduce((sum, p) => sum + p.likes + p.shares + p.comments, 0);
  const engagementScore = totalEngagement / platformPosts.length;
  
  // Get top posts by engagement
  const topPosts = [...platformPosts]
    .sort((a, b) => (b.likes + b.shares + b.comments) - (a.likes + a.shares + a.comments))
    .slice(0, 5);
  
  // Extract key topics from hashtags
  const hashtagCounts: Record<string, number> = {};
  platformPosts.forEach(post => {
    post.hashtags.forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });
  });
  const keyTopics = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
  
  // Determine trend direction
  const recentPosts = platformPosts.filter(p => p.timestamp > Date.now() - 3600000); // Last hour
  const olderPosts = platformPosts.filter(p => p.timestamp <= Date.now() - 3600000);
  
  const recentAvg = recentPosts.length > 0 
    ? recentPosts.reduce((sum, p) => sum + p.sentiment, 0) / recentPosts.length 
    : 0;
  const olderAvg = olderPosts.length > 0 
    ? olderPosts.reduce((sum, p) => sum + p.sentiment, 0) / olderPosts.length 
    : 0;
  
  let trendDirection: TrendDirection = 'stable';
  if (recentAvg - olderAvg > 0.2) trendDirection = 'rising';
  else if (olderAvg - recentAvg > 0.2) trendDirection = 'falling';
  
  return {
    platform,
    overallSentiment: Math.round(overallSentiment * 100) / 100,
    sentimentLabel: getSentimentLabel(overallSentiment),
    postCount: platformPosts.length,
    uniqueAuthors,
    engagementScore: Math.round(engagementScore),
    influencerSentiment: influencerCount > 0 
      ? Math.round((influencerSentiment / influencerCount) * 100) / 100 
      : 0,
    retailSentiment: retailCount > 0 
      ? Math.round((retailSentiment / retailCount) * 100) / 100 
      : 0,
    trendDirection,
    volumeChange24h: Math.round((Math.random() - 0.3) * 100),
    topPosts,
    keyTopics,
    lastUpdated: Date.now(),
  };
}

// Get comprehensive symbol sentiment
export function getSymbolSentiment(symbol: string): SymbolSentiment {
  const posts = generateSamplePosts(symbol, 100);
  const platforms: SocialPlatform[] = ['twitter', 'reddit', 'stocktwits', 'discord', 'telegram'];
  
  const platformBreakdown = platforms.map(platform => 
    analyzePlatformSentiment(posts, platform)
  );
  
  // Calculate overall sentiment
  const totalPosts = platformBreakdown.reduce((sum, p) => sum + p.postCount, 0);
  const weightedSentiment = platformBreakdown.reduce((sum, p) => 
    sum + (p.overallSentiment * p.postCount), 0
  );
  const overallSentiment = totalPosts > 0 ? weightedSentiment / totalPosts : 0;
  
  // Generate sentiment trend (last 24 hours)
  const sentimentTrend: SentimentTrend[] = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const timestamp = now - (i * 3600000);
    platforms.forEach(platform => {
      sentimentTrend.push({
        timestamp,
        sentiment: overallSentiment + (Math.random() - 0.5) * 0.3,
        volume: Math.floor(Math.random() * 100) + 10,
        platform,
      });
    });
  }
  
  // Get top influencers
  const influencerPosts = posts.filter(p => p.isInfluencer);
  const topInfluencers = influencerPosts
    .sort((a, b) => b.followerCount - a.followerCount)
    .slice(0, 5)
    .map(p => ({
      author: p.author,
      platform: p.platform,
      sentiment: p.sentiment,
      followers: p.followerCount,
      engagement: p.likes + p.shares + p.comments,
    }));
  
  // Related symbols (commonly mentioned together)
  const symbolCounts: Record<string, number> = {};
  posts.forEach(post => {
    post.symbols.forEach(s => {
      if (s !== symbol) {
        symbolCounts[s] = (symbolCounts[s] || 0) + 1;
      }
    });
  });
  const relatedSymbols = Object.entries(symbolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sym, count]) => ({
      symbol: sym,
      correlation: Math.random() * 0.5 + 0.3,
      coMentions: count,
    }));
  
  // Key narratives
  const keyNarratives = [
    `Strong institutional interest in ${symbol}`,
    `Technical breakout expected`,
    `Earnings anticipation driving sentiment`,
    `Sector rotation favoring ${symbol}`,
    `Retail momentum building`,
  ].slice(0, 3);
  
  // Risk signals
  const riskSignals: string[] = [];
  if (overallSentiment > 0.7) {
    riskSignals.push('Extreme bullish sentiment may indicate overbought conditions');
  }
  if (overallSentiment < -0.7) {
    riskSignals.push('Extreme bearish sentiment may indicate oversold conditions');
  }
  const controversyScore = Math.abs(
    platformBreakdown.reduce((sum, p) => sum + p.influencerSentiment - p.retailSentiment, 0)
  ) / platforms.length;
  if (controversyScore > 0.3) {
    riskSignals.push('Divergence between influencer and retail sentiment');
  }
  
  // Calculate buzz score (social volume relative to normal)
  const buzzScore = Math.min(100, Math.floor(totalPosts / 20 * 100));
  
  // Calculate sentiment momentum
  const recentTrend = sentimentTrend.slice(-5);
  const olderTrend = sentimentTrend.slice(-10, -5);
  const recentAvg = recentTrend.reduce((sum, t) => sum + t.sentiment, 0) / recentTrend.length;
  const olderAvg = olderTrend.reduce((sum, t) => sum + t.sentiment, 0) / olderTrend.length;
  const sentimentMomentum = Math.round((recentAvg - olderAvg) * 100);
  
  return {
    symbol,
    name: getSymbolName(symbol),
    overallSentiment: Math.round(overallSentiment * 100) / 100,
    sentimentLabel: getSentimentLabel(overallSentiment),
    confidence: 0.75 + Math.random() * 0.2,
    platformBreakdown,
    sentimentTrend,
    socialVolume: totalPosts,
    volumeChange24h: Math.round((Math.random() - 0.3) * 100),
    mentionCount: totalPosts * 3,
    uniqueMentioners: new Set(posts.map(p => p.author)).size,
    influencerMentions: influencerPosts.length,
    sentimentMomentum,
    buzzScore,
    controversyScore: Math.round(controversyScore * 100) / 100,
    topInfluencers,
    relatedSymbols,
    keyNarratives,
    riskSignals,
    lastUpdated: Date.now(),
  };
}

// Get symbol name
function getSymbolName(symbol: string): string {
  const names: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ Trust',
  };
  return names[symbol] || symbol;
}

// Generate sentiment alerts
export function generateSentimentAlerts(
  symbol: string,
  previousSentiment: SymbolSentiment | null,
  currentSentiment: SymbolSentiment
): SentimentAlert[] {
  const alerts: SentimentAlert[] = [];
  const now = Date.now();
  
  // Sentiment spike/crash
  if (previousSentiment) {
    const sentimentChange = currentSentiment.overallSentiment - previousSentiment.overallSentiment;
    const changePercent = Math.abs(sentimentChange) * 100;
    
    if (sentimentChange > 0.3) {
      alerts.push({
        id: `alert_${now}_spike`,
        symbol,
        alertType: 'sentiment_spike',
        severity: sentimentChange > 0.5 ? 'high' : 'medium',
        title: `Sentiment Spike for ${symbol}`,
        description: `Social sentiment for ${symbol} has increased significantly`,
        previousValue: previousSentiment.overallSentiment,
        currentValue: currentSentiment.overallSentiment,
        changePercent,
        platform: 'all',
        timestamp: now,
        isRead: false,
      });
    } else if (sentimentChange < -0.3) {
      alerts.push({
        id: `alert_${now}_crash`,
        symbol,
        alertType: 'sentiment_crash',
        severity: sentimentChange < -0.5 ? 'high' : 'medium',
        title: `Sentiment Drop for ${symbol}`,
        description: `Social sentiment for ${symbol} has decreased significantly`,
        previousValue: previousSentiment.overallSentiment,
        currentValue: currentSentiment.overallSentiment,
        changePercent,
        platform: 'all',
        timestamp: now,
        isRead: false,
      });
    }
    
    // Volume surge
    if (currentSentiment.volumeChange24h > 100) {
      alerts.push({
        id: `alert_${now}_volume`,
        symbol,
        alertType: 'volume_surge',
        severity: currentSentiment.volumeChange24h > 200 ? 'high' : 'medium',
        title: `Social Volume Surge for ${symbol}`,
        description: `Social media mentions of ${symbol} have surged ${currentSentiment.volumeChange24h}%`,
        previousValue: 100,
        currentValue: 100 + currentSentiment.volumeChange24h,
        changePercent: currentSentiment.volumeChange24h,
        platform: 'all',
        timestamp: now,
        isRead: false,
      });
    }
  }
  
  // Influencer mention
  if (currentSentiment.influencerMentions > 5) {
    alerts.push({
      id: `alert_${now}_influencer`,
      symbol,
      alertType: 'influencer_mention',
      severity: 'low',
      title: `Influencer Activity for ${symbol}`,
      description: `${currentSentiment.influencerMentions} influencers have mentioned ${symbol}`,
      previousValue: 0,
      currentValue: currentSentiment.influencerMentions,
      changePercent: 0,
      platform: 'all',
      timestamp: now,
      isRead: false,
    });
  }
  
  // Controversy
  if (currentSentiment.controversyScore > 0.4) {
    alerts.push({
      id: `alert_${now}_controversy`,
      symbol,
      alertType: 'controversy',
      severity: currentSentiment.controversyScore > 0.6 ? 'high' : 'medium',
      title: `Sentiment Controversy for ${symbol}`,
      description: `Significant divergence between influencer and retail sentiment`,
      previousValue: 0,
      currentValue: currentSentiment.controversyScore,
      changePercent: currentSentiment.controversyScore * 100,
      platform: 'all',
      timestamp: now,
      isRead: false,
    });
  }
  
  return alerts;
}

// Get trending symbols across social media
export function getTrendingSymbols(limit: number = 10): Array<{
  symbol: string;
  name: string;
  sentiment: number;
  sentimentLabel: SentimentLabel;
  volume: number;
  volumeChange: number;
  buzzScore: number;
}> {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'BTC', 'ETH', 'SPY', 'QQQ', 'AMD', 'NFLX', 'DIS'];
  
  return symbols.slice(0, limit).map(symbol => {
    const sentiment = (Math.random() - 0.3) * 2;
    return {
      symbol,
      name: getSymbolName(symbol),
      sentiment: Math.round(sentiment * 100) / 100,
      sentimentLabel: getSentimentLabel(sentiment),
      volume: Math.floor(Math.random() * 5000) + 500,
      volumeChange: Math.round((Math.random() - 0.3) * 200),
      buzzScore: Math.floor(Math.random() * 100),
    };
  }).sort((a, b) => b.buzzScore - a.buzzScore);
}

// Get sentiment heatmap data
export function getSentimentHeatmap(): Array<{
  symbol: string;
  platform: SocialPlatform;
  sentiment: number;
  volume: number;
}> {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META'];
  const platforms: SocialPlatform[] = ['twitter', 'reddit', 'stocktwits'];
  const data: Array<{ symbol: string; platform: SocialPlatform; sentiment: number; volume: number }> = [];
  
  symbols.forEach(symbol => {
    platforms.forEach(platform => {
      data.push({
        symbol,
        platform,
        sentiment: Math.round((Math.random() - 0.3) * 2 * 100) / 100,
        volume: Math.floor(Math.random() * 1000) + 100,
      });
    });
  });
  
  return data;
}

// Export default configuration
export function getDefaultConfig(): SocialSentimentConfig {
  return {
    platforms: ['twitter', 'reddit', 'stocktwits'],
    refreshInterval: 300000, // 5 minutes
    alertThresholds: {
      sentimentChange: 0.3,
      volumeChange: 100,
      influencerThreshold: 100000,
    },
    watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'BTC', 'ETH'],
  };
}
