/**
 * Sentiment & Narrative Mapping Agent (Hype Agent)
 * 
 * NLP-based social dominance monitoring for crypto narratives.
 * Identifies narrative peaks, divergences, and blow-off tops.
 * 
 * Based on 2026 Big Investor strategies for crypto AI trading.
 */

// Types for sentiment and narrative analysis
export interface NarrativeCategory {
  id: string;
  name: string;
  keywords: string[];
  tokens: string[];
  currentStrength: number;
  peakStrength: number;
  trend: 'rising' | 'peaking' | 'declining' | 'dormant';
}

export interface SocialMetrics {
  token: string;
  timestamp: Date;
  twitterMentions: number;
  redditPosts: number;
  telegramMessages: number;
  discordMessages: number;
  newsArticles: number;
  totalSocialVolume: number;
  sentimentScore: number; // -1 to 1
  socialDominance: number; // Percentage of total crypto social volume
  influencerMentions: number;
  fearGreedIndex: number; // 0-100
}

export interface DivergenceSignal {
  token: string;
  detectedAt: Date;
  type: 'bullish_divergence' | 'bearish_divergence' | 'blow_off_top' | 'capitulation';
  priceChange24h: number;
  socialChange24h: number;
  confidence: number;
  description: string;
  actionRecommendation: string;
}

export interface NarrativeStrength {
  narrative: string;
  tokens: string[];
  currentScore: number;
  weeklyChange: number;
  isOverheated: boolean;
  topMentionedTokens: Array<{ token: string; mentions: number }>;
}

export interface HypeReport {
  token: string;
  timestamp: Date;
  socialMetrics: SocialMetrics;
  activeNarratives: NarrativeStrength[];
  divergenceSignals: DivergenceSignal[];
  overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  hypeLevel: 'low' | 'moderate' | 'high' | 'extreme';
  riskOfCorrection: number;
  recommendation: string;
}

// Predefined crypto narratives for 2026
const CRYPTO_NARRATIVES: NarrativeCategory[] = [
  {
    id: 'ai_tokens',
    name: 'AI & Machine Learning',
    keywords: ['AI', 'artificial intelligence', 'machine learning', 'GPT', 'neural', 'AGI', 'compute'],
    tokens: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO', 'AKT', 'NMR'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'rwa',
    name: 'Real World Assets',
    keywords: ['RWA', 'tokenization', 'real estate', 'treasury', 'bonds', 'commodities', 'gold'],
    tokens: ['ONDO', 'PAXG', 'MKR', 'CPOOL', 'CFG', 'MPL'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'memecoins',
    name: 'Meme Coins',
    keywords: ['meme', 'doge', 'shiba', 'pepe', 'wojak', 'moon', 'wen', 'gm'],
    tokens: ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'BRETT'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'defi_2',
    name: 'DeFi 2.0',
    keywords: ['DeFi', 'yield', 'liquidity', 'AMM', 'lending', 'borrowing', 'staking'],
    tokens: ['AAVE', 'UNI', 'CRV', 'GMX', 'PENDLE', 'RDNT', 'JOE'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'layer2',
    name: 'Layer 2 Scaling',
    keywords: ['L2', 'rollup', 'scaling', 'zk', 'optimistic', 'arbitrum', 'optimism'],
    tokens: ['ARB', 'OP', 'MATIC', 'IMX', 'STRK', 'ZK', 'MANTA'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'gaming',
    name: 'Gaming & Metaverse',
    keywords: ['gaming', 'metaverse', 'NFT', 'play to earn', 'virtual', 'avatar'],
    tokens: ['AXS', 'SAND', 'MANA', 'GALA', 'IMX', 'PRIME', 'PIXEL'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'depin',
    name: 'Decentralized Physical Infrastructure',
    keywords: ['DePIN', 'IoT', 'wireless', 'storage', 'compute', 'infrastructure'],
    tokens: ['FIL', 'AR', 'HNT', 'RNDR', 'MOBILE', 'DIMO', 'HONEY'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  },
  {
    id: 'btc_ecosystem',
    name: 'Bitcoin Ecosystem',
    keywords: ['BRC-20', 'ordinals', 'inscriptions', 'bitcoin L2', 'runes'],
    tokens: ['ORDI', 'SATS', 'STX', 'ALEX', 'RUNE'],
    currentStrength: 0,
    peakStrength: 0,
    trend: 'dormant'
  }
];

export class HypeAgent {
  private narratives: Map<string, NarrativeCategory> = new Map();
  private socialMetricsCache: Map<string, SocialMetrics[]> = new Map();
  private divergenceHistory: DivergenceSignal[] = [];
  private priceHistory: Map<string, Array<{ timestamp: Date; price: number }>> = new Map();

  constructor() {
    // Initialize narratives
    CRYPTO_NARRATIVES.forEach(narrative => {
      this.narratives.set(narrative.id, { ...narrative });
    });
  }

  /**
   * Analyze social metrics for a token
   */
  async analyzeSocialMetrics(token: string): Promise<SocialMetrics> {
    // Simulate social data fetching (in production, use LunarCrush, Santiment APIs)
    const baseVolume = this.getBaselineVolume(token);
    const volatility = 0.3 + Math.random() * 0.4;

    const metrics: SocialMetrics = {
      token,
      timestamp: new Date(),
      twitterMentions: Math.floor(baseVolume * (0.5 + Math.random() * volatility)),
      redditPosts: Math.floor(baseVolume * 0.1 * (0.5 + Math.random() * volatility)),
      telegramMessages: Math.floor(baseVolume * 0.3 * (0.5 + Math.random() * volatility)),
      discordMessages: Math.floor(baseVolume * 0.2 * (0.5 + Math.random() * volatility)),
      newsArticles: Math.floor(baseVolume * 0.02 * (0.5 + Math.random() * volatility)),
      totalSocialVolume: 0,
      sentimentScore: (Math.random() * 2 - 1) * 0.8, // -0.8 to 0.8
      socialDominance: Math.random() * 5, // 0-5%
      influencerMentions: Math.floor(Math.random() * 50),
      fearGreedIndex: Math.floor(20 + Math.random() * 60) // 20-80
    };

    metrics.totalSocialVolume = 
      metrics.twitterMentions + 
      metrics.redditPosts * 5 + 
      metrics.telegramMessages + 
      metrics.discordMessages + 
      metrics.newsArticles * 20;

    // Store in cache
    const history = this.socialMetricsCache.get(token) || [];
    history.push(metrics);
    if (history.length > 168) history.shift(); // Keep 7 days of hourly data
    this.socialMetricsCache.set(token, history);

    return metrics;
  }

  /**
   * Detect price-social divergence
   */
  async detectDivergence(token: string, currentPrice: number, priceChange24h: number): Promise<DivergenceSignal | null> {
    const metrics = await this.analyzeSocialMetrics(token);
    const history = this.socialMetricsCache.get(token) || [];

    if (history.length < 24) return null; // Need at least 24 hours of data

    // Calculate social change
    const oldMetrics = history[history.length - 24];
    const socialChange24h = ((metrics.totalSocialVolume - oldMetrics.totalSocialVolume) / oldMetrics.totalSocialVolume) * 100;

    // Detect divergence patterns
    let signal: DivergenceSignal | null = null;

    // Blow-off Top: Price rising but social mentions falling
    if (priceChange24h > 10 && socialChange24h < -20) {
      signal = {
        token,
        detectedAt: new Date(),
        type: 'blow_off_top',
        priceChange24h,
        socialChange24h,
        confidence: Math.min(0.9, 0.5 + Math.abs(socialChange24h) / 100),
        description: `Price up ${priceChange24h.toFixed(1)}% but social volume down ${Math.abs(socialChange24h).toFixed(1)}%`,
        actionRecommendation: 'Consider taking profits - smart money may be exiting'
      };
    }
    // Bullish Divergence: Price falling but social mentions rising (accumulation)
    else if (priceChange24h < -10 && socialChange24h > 20) {
      signal = {
        token,
        detectedAt: new Date(),
        type: 'bullish_divergence',
        priceChange24h,
        socialChange24h,
        confidence: Math.min(0.85, 0.4 + socialChange24h / 100),
        description: `Price down ${Math.abs(priceChange24h).toFixed(1)}% but social volume up ${socialChange24h.toFixed(1)}%`,
        actionRecommendation: 'Potential accumulation opportunity - monitor for reversal'
      };
    }
    // Bearish Divergence: Price stable but social mentions crashing
    else if (Math.abs(priceChange24h) < 5 && socialChange24h < -30) {
      signal = {
        token,
        detectedAt: new Date(),
        type: 'bearish_divergence',
        priceChange24h,
        socialChange24h,
        confidence: Math.min(0.8, 0.4 + Math.abs(socialChange24h) / 100),
        description: `Price stable but social volume crashed ${Math.abs(socialChange24h).toFixed(1)}%`,
        actionRecommendation: 'Narrative losing steam - consider reducing position'
      };
    }
    // Capitulation: Both price and social crashing
    else if (priceChange24h < -20 && socialChange24h < -30) {
      signal = {
        token,
        detectedAt: new Date(),
        type: 'capitulation',
        priceChange24h,
        socialChange24h,
        confidence: Math.min(0.85, 0.5 + (Math.abs(priceChange24h) + Math.abs(socialChange24h)) / 200),
        description: `Capitulation event: Price down ${Math.abs(priceChange24h).toFixed(1)}%, social down ${Math.abs(socialChange24h).toFixed(1)}%`,
        actionRecommendation: 'Wait for stabilization before entering - potential bottom forming'
      };
    }

    if (signal) {
      this.divergenceHistory.push(signal);
    }

    return signal;
  }

  /**
   * Analyze narrative strength
   */
  async analyzeNarratives(): Promise<NarrativeStrength[]> {
    const strengths: NarrativeStrength[] = [];

    for (const [id, narrative] of Array.from(this.narratives.entries())) {
      // Simulate narrative strength calculation
      const baseStrength = 30 + Math.random() * 50;
      const weeklyChange = (Math.random() - 0.5) * 40;
      
      // Update narrative state
      narrative.currentStrength = baseStrength;
      if (baseStrength > narrative.peakStrength) {
        narrative.peakStrength = baseStrength;
      }

      // Determine trend
      if (baseStrength > 70 && weeklyChange > 10) {
        narrative.trend = 'peaking';
      } else if (weeklyChange > 5) {
        narrative.trend = 'rising';
      } else if (weeklyChange < -10) {
        narrative.trend = 'declining';
      } else {
        narrative.trend = 'dormant';
      }

      const strength: NarrativeStrength = {
        narrative: narrative.name,
        tokens: narrative.tokens,
        currentScore: baseStrength,
        weeklyChange,
        isOverheated: baseStrength > 80 && narrative.trend === 'peaking',
        topMentionedTokens: narrative.tokens.slice(0, 3).map((token: string) => ({
          token,
          mentions: Math.floor(1000 + Math.random() * 10000)
        }))
      };

      strengths.push(strength);
    }

    return strengths.sort((a, b) => b.currentScore - a.currentScore);
  }

  /**
   * Get narratives for a specific token
   */
  getTokenNarratives(token: string): NarrativeCategory[] {
    const tokenNarratives: NarrativeCategory[] = [];
    
    for (const narrative of Array.from(this.narratives.values())) {
      if (narrative.tokens.includes(token.toUpperCase())) {
        tokenNarratives.push(narrative);
      }
    }

    return tokenNarratives;
  }

  /**
   * Calculate Fear & Greed Index for crypto market
   */
  calculateFearGreedIndex(metrics: SocialMetrics[]): {
    index: number;
    label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    components: {
      volatility: number;
      momentum: number;
      socialVolume: number;
      dominance: number;
      sentiment: number;
    };
  } {
    // Calculate component scores
    const avgSentiment = metrics.reduce((sum, m) => sum + m.sentimentScore, 0) / metrics.length;
    const avgSocialVolume = metrics.reduce((sum, m) => sum + m.totalSocialVolume, 0) / metrics.length;
    const avgDominance = metrics.reduce((sum, m) => sum + m.socialDominance, 0) / metrics.length;

    const components = {
      volatility: 50 + Math.random() * 30, // Would be calculated from actual volatility
      momentum: 50 + avgSentiment * 30,
      socialVolume: Math.min(100, avgSocialVolume / 1000),
      dominance: avgDominance * 10,
      sentiment: 50 + avgSentiment * 50
    };

    // Weighted average
    const index = Math.floor(
      components.volatility * 0.25 +
      components.momentum * 0.25 +
      components.socialVolume * 0.15 +
      components.dominance * 0.15 +
      components.sentiment * 0.20
    );

    let label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' = 'neutral';
    if (index < 20) label = 'extreme_fear';
    else if (index < 40) label = 'fear';
    else if (index < 60) label = 'neutral';
    else if (index < 80) label = 'greed';
    else label = 'extreme_greed';

    return { index, label, components };
  }

  /**
   * Generate comprehensive hype report
   */
  async generateHypeReport(token: string, currentPrice: number, priceChange24h: number): Promise<HypeReport> {
    const socialMetrics = await this.analyzeSocialMetrics(token);
    const narratives = await this.analyzeNarratives();
    const divergence = await this.detectDivergence(token, currentPrice, priceChange24h);

    // Get token-specific narratives
    const tokenNarratives = this.getTokenNarratives(token);
    const activeNarratives = narratives.filter(n => 
      tokenNarratives.some(tn => tn.name === n.narrative)
    );

    // Calculate hype level
    let hypeScore = 0;
    hypeScore += socialMetrics.socialDominance * 10;
    hypeScore += socialMetrics.influencerMentions * 0.5;
    hypeScore += (socialMetrics.sentimentScore + 1) * 20;
    activeNarratives.forEach(n => {
      if (n.currentScore > 70) hypeScore += 20;
      else if (n.currentScore > 50) hypeScore += 10;
    });

    let hypeLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
    if (hypeScore > 80) hypeLevel = 'extreme';
    else if (hypeScore > 60) hypeLevel = 'high';
    else if (hypeScore > 40) hypeLevel = 'moderate';

    // Calculate risk of correction
    let riskOfCorrection = 0;
    if (hypeLevel === 'extreme') riskOfCorrection += 0.3;
    if (hypeLevel === 'high') riskOfCorrection += 0.2;
    if (divergence?.type === 'blow_off_top') riskOfCorrection += 0.3;
    if (activeNarratives.some(n => n.isOverheated)) riskOfCorrection += 0.2;
    riskOfCorrection = Math.min(0.95, riskOfCorrection);

    // Determine overall sentiment
    const fearGreed = this.calculateFearGreedIndex([socialMetrics]);

    // Generate recommendation
    let recommendation = '';
    if (divergence?.type === 'blow_off_top') {
      recommendation = 'HIGH RISK: Blow-off top detected. Consider taking profits immediately.';
    } else if (divergence?.type === 'capitulation') {
      recommendation = 'OPPORTUNITY: Capitulation may signal bottom. Monitor for reversal before entering.';
    } else if (hypeLevel === 'extreme' && riskOfCorrection > 0.5) {
      recommendation = 'CAUTION: Extreme hype levels with high correction risk. Reduce exposure.';
    } else if (hypeLevel === 'low' && activeNarratives.some(n => n.weeklyChange > 20)) {
      recommendation = 'WATCH: Narrative gaining momentum. Consider early entry if fundamentals support.';
    } else {
      recommendation = 'NEUTRAL: No significant signals. Maintain current strategy.';
    }

    return {
      token,
      timestamp: new Date(),
      socialMetrics,
      activeNarratives,
      divergenceSignals: divergence ? [divergence] : [],
      overallSentiment: fearGreed.label,
      hypeLevel,
      riskOfCorrection,
      recommendation
    };
  }

  // Private helper methods

  private getBaselineVolume(token: string): number {
    // Major tokens have higher baseline social volume
    const majorTokens: Record<string, number> = {
      'BTC': 100000,
      'ETH': 80000,
      'SOL': 50000,
      'DOGE': 40000,
      'XRP': 30000,
      'ADA': 25000,
      'AVAX': 20000,
      'MATIC': 18000,
      'LINK': 15000,
      'UNI': 12000
    };

    return majorTokens[token.toUpperCase()] || 5000 + Math.random() * 10000;
  }
}

// Factory function
export function createHypeAgent(): HypeAgent {
  return new HypeAgent();
}
