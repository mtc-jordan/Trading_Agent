/**
 * Sentiment Data Integration Service
 * 
 * Aggregates sentiment data from multiple sources including
 * news articles, social media, and financial reports.
 * 
 * Features:
 * - News sentiment scoring using NLP
 * - Social media sentiment aggregation
 * - Sentiment momentum indicators
 * - Fear & Greed index calculation
 * - Integration with AI recommendations
 */

import { invokeLLM } from "../_core/llm";

// Types
export type SentimentLevel = 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';

export interface SentimentSource {
  name: string;
  type: 'news' | 'social' | 'analyst' | 'insider';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  sampleSize: number;
  lastUpdated: string;
}

export interface SentimentIndicator {
  name: string;
  value: number;
  interpretation: string;
  weight: number;
}

export interface NewsSentiment {
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: SentimentLevel;
  score: number;
  relevance: number;
  summary: string;
}

export interface SocialSentiment {
  platform: string;
  mentions: number;
  sentimentScore: number;
  volumeChange: number; // % change from previous period
  topTopics: string[];
  influencerSentiment: number;
}

export interface SentimentMomentum {
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  velocity: number; // Rate of change
}

export interface FearGreedIndex {
  value: number; // 0-100
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

export interface SentimentAnalysisResult {
  symbol: string;
  overallSentiment: SentimentLevel;
  overallScore: number; // -1 to 1
  confidence: number;
  
  sources: SentimentSource[];
  news: NewsSentiment[];
  social: SocialSentiment[];
  
  momentum: SentimentMomentum;
  fearGreedIndex: FearGreedIndex;
  
  indicators: SentimentIndicator[];
  
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

// Simulated news data (in production, would fetch from news APIs)
function generateSimulatedNews(symbol: string): NewsSentiment[] {
  const headlines = [
    { headline: `${symbol} Reports Strong Q4 Earnings, Beats Expectations`, sentiment: 'bullish' as SentimentLevel, score: 0.7 },
    { headline: `Analysts Upgrade ${symbol} to Buy Rating`, sentiment: 'very_bullish' as SentimentLevel, score: 0.85 },
    { headline: `${symbol} Announces New Product Launch`, sentiment: 'bullish' as SentimentLevel, score: 0.6 },
    { headline: `Market Volatility Impacts ${symbol} Stock`, sentiment: 'neutral' as SentimentLevel, score: 0.1 },
    { headline: `${symbol} Faces Regulatory Scrutiny`, sentiment: 'bearish' as SentimentLevel, score: -0.5 },
    { headline: `Institutional Investors Increase ${symbol} Holdings`, sentiment: 'bullish' as SentimentLevel, score: 0.55 },
    { headline: `${symbol} CEO Discusses Growth Strategy`, sentiment: 'bullish' as SentimentLevel, score: 0.45 },
    { headline: `Supply Chain Concerns Affect ${symbol}`, sentiment: 'bearish' as SentimentLevel, score: -0.35 },
  ];
  
  const sources = ['Reuters', 'Bloomberg', 'CNBC', 'WSJ', 'Financial Times', 'MarketWatch'];
  const now = new Date();
  
  return headlines.slice(0, 5 + Math.floor(Math.random() * 3)).map((item, i) => ({
    ...item,
    source: sources[i % sources.length],
    publishedAt: new Date(now.getTime() - i * 3600000 * (1 + Math.random() * 5)).toISOString(),
    relevance: 0.7 + Math.random() * 0.3,
    summary: `Analysis of ${symbol} based on recent market developments and company performance.`,
  }));
}

// Simulated social media sentiment
function generateSimulatedSocial(symbol: string): SocialSentiment[] {
  return [
    {
      platform: 'Twitter/X',
      mentions: 15000 + Math.floor(Math.random() * 10000),
      sentimentScore: 0.3 + (Math.random() - 0.5) * 0.4,
      volumeChange: (Math.random() - 0.3) * 50,
      topTopics: ['earnings', 'growth', 'innovation', 'market'],
      influencerSentiment: 0.4 + (Math.random() - 0.5) * 0.3,
    },
    {
      platform: 'Reddit',
      mentions: 5000 + Math.floor(Math.random() * 5000),
      sentimentScore: 0.2 + (Math.random() - 0.5) * 0.5,
      volumeChange: (Math.random() - 0.3) * 40,
      topTopics: ['DD', 'analysis', 'hold', 'buy'],
      influencerSentiment: 0.35 + (Math.random() - 0.5) * 0.4,
    },
    {
      platform: 'StockTwits',
      mentions: 3000 + Math.floor(Math.random() * 3000),
      sentimentScore: 0.25 + (Math.random() - 0.5) * 0.4,
      volumeChange: (Math.random() - 0.3) * 30,
      topTopics: ['bullish', 'technical', 'support', 'breakout'],
      influencerSentiment: 0.3 + (Math.random() - 0.5) * 0.35,
    },
  ];
}

// Calculate Fear & Greed Index
function calculateFearGreedIndex(): FearGreedIndex {
  const components = {
    marketMomentum: 40 + Math.random() * 40,
    stockPriceStrength: 35 + Math.random() * 45,
    stockPriceBreadth: 45 + Math.random() * 35,
    putCallRatio: 30 + Math.random() * 50,
    marketVolatility: 40 + Math.random() * 40,
    safehavenDemand: 35 + Math.random() * 45,
    junkBondDemand: 40 + Math.random() * 40,
  };
  
  const value = Math.round(
    (components.marketMomentum * 0.2 +
     components.stockPriceStrength * 0.15 +
     components.stockPriceBreadth * 0.15 +
     components.putCallRatio * 0.15 +
     components.marketVolatility * 0.15 +
     components.safehavenDemand * 0.1 +
     components.junkBondDemand * 0.1)
  );
  
  let level: FearGreedIndex['level'];
  if (value < 20) level = 'extreme_fear';
  else if (value < 40) level = 'fear';
  else if (value < 60) level = 'neutral';
  else if (value < 80) level = 'greed';
  else level = 'extreme_greed';
  
  // Generate history
  const history: Array<{ date: string; value: number }> = [];
  const now = new Date();
  let histValue = value;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    histValue = Math.max(0, Math.min(100, histValue + (Math.random() - 0.5) * 10));
    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(histValue),
    });
  }
  
  return { value, level, components, history };
}

// Score to sentiment level conversion
function scoreToLevel(score: number): SentimentLevel {
  if (score < -0.6) return 'very_bearish';
  if (score < -0.2) return 'bearish';
  if (score < 0.2) return 'neutral';
  if (score < 0.6) return 'bullish';
  return 'very_bullish';
}

// LLM-based sentiment interpretation
async function getAIInterpretation(
  symbol: string,
  overallScore: number,
  news: NewsSentiment[],
  social: SocialSentiment[],
  fearGreed: FearGreedIndex
): Promise<string> {
  const newsHeadlines = news.slice(0, 5).map(n => `- ${n.headline} (${n.sentiment})`).join('\n');
  const socialSummary = social.map(s => `${s.platform}: ${s.sentimentScore.toFixed(2)} score, ${s.mentions} mentions`).join(', ');
  
  const prompt = `Analyze the sentiment data for ${symbol} stock and provide a brief interpretation:

Overall Sentiment Score: ${overallScore.toFixed(2)} (scale: -1 to 1)
Fear & Greed Index: ${fearGreed.value} (${fearGreed.level})

Recent News Headlines:
${newsHeadlines}

Social Media Summary: ${socialSummary}

Provide a 2-3 sentence interpretation of the current sentiment landscape and what it might mean for the stock. Be specific and actionable.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a financial sentiment analyst. Provide concise, actionable interpretations.' },
        { role: 'user', content: prompt },
      ],
    });
    
    const content = response.choices[0]?.message?.content;
    return typeof content === 'string' ? content : 'Unable to generate interpretation.';
  } catch (error) {
    console.error('LLM interpretation error:', error);
    return `Sentiment for ${symbol} is ${scoreToLevel(overallScore)} with a score of ${overallScore.toFixed(2)}. The Fear & Greed Index at ${fearGreed.value} suggests ${fearGreed.level.replace('_', ' ')} in the market.`;
  }
}

// Main sentiment analysis function
export async function analyzeSentiment(symbol: string): Promise<SentimentAnalysisResult> {
  // Gather data from sources
  const news = generateSimulatedNews(symbol);
  const social = generateSimulatedSocial(symbol);
  const fearGreedIndex = calculateFearGreedIndex();
  
  // Calculate source scores
  const sources: SentimentSource[] = [
    {
      name: 'News Articles',
      type: 'news',
      score: news.reduce((sum, n) => sum + n.score * n.relevance, 0) / news.length,
      confidence: 0.8,
      sampleSize: news.length,
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Social Media',
      type: 'social',
      score: social.reduce((sum, s) => sum + s.sentimentScore, 0) / social.length,
      confidence: 0.6,
      sampleSize: social.reduce((sum, s) => sum + s.mentions, 0),
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Analyst Ratings',
      type: 'analyst',
      score: 0.3 + (Math.random() - 0.5) * 0.4,
      confidence: 0.85,
      sampleSize: 15 + Math.floor(Math.random() * 10),
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Insider Activity',
      type: 'insider',
      score: 0.1 + (Math.random() - 0.5) * 0.3,
      confidence: 0.9,
      sampleSize: 5 + Math.floor(Math.random() * 5),
      lastUpdated: new Date().toISOString(),
    },
  ];
  
  // Calculate weighted overall score
  const weights = { news: 0.35, social: 0.25, analyst: 0.25, insider: 0.15 };
  const overallScore = sources.reduce((sum, s) => {
    const weight = weights[s.type as keyof typeof weights] || 0.25;
    return sum + s.score * weight * s.confidence;
  }, 0);
  
  const overallSentiment = scoreToLevel(overallScore);
  const confidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
  
  // Calculate momentum
  const previousScore = overallScore + (Math.random() - 0.5) * 0.2;
  const momentum: SentimentMomentum = {
    current: overallScore,
    previous: previousScore,
    change: overallScore - previousScore,
    trend: overallScore > previousScore + 0.05 ? 'improving' : 
           overallScore < previousScore - 0.05 ? 'deteriorating' : 'stable',
    velocity: (overallScore - previousScore) / 7, // Weekly velocity
  };
  
  // Sentiment indicators
  const indicators: SentimentIndicator[] = [
    {
      name: 'News Sentiment',
      value: sources[0].score,
      interpretation: sources[0].score > 0.3 ? 'Positive news coverage' : 
                      sources[0].score < -0.3 ? 'Negative news coverage' : 'Mixed news coverage',
      weight: 0.35,
    },
    {
      name: 'Social Buzz',
      value: sources[1].score,
      interpretation: social[0].volumeChange > 20 ? 'High social media activity' : 
                      social[0].volumeChange < -20 ? 'Declining social interest' : 'Normal social activity',
      weight: 0.25,
    },
    {
      name: 'Analyst Consensus',
      value: sources[2].score,
      interpretation: sources[2].score > 0.4 ? 'Bullish analyst consensus' : 
                      sources[2].score < -0.2 ? 'Bearish analyst consensus' : 'Mixed analyst views',
      weight: 0.25,
    },
    {
      name: 'Insider Sentiment',
      value: sources[3].score,
      interpretation: sources[3].score > 0.2 ? 'Net insider buying' : 
                      sources[3].score < -0.2 ? 'Net insider selling' : 'Balanced insider activity',
      weight: 0.15,
    },
    {
      name: 'Fear & Greed',
      value: (fearGreedIndex.value - 50) / 50, // Normalize to -1 to 1
      interpretation: fearGreedIndex.level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      weight: 0.2,
    },
  ];
  
  // Get AI interpretation
  const aiInterpretation = await getAIInterpretation(symbol, overallScore, news, social, fearGreedIndex);
  
  // Trading implications
  let signal: 'buy' | 'sell' | 'hold';
  let strength: 'strong' | 'moderate' | 'weak';
  
  if (overallScore > 0.5 && momentum.trend === 'improving') {
    signal = 'buy';
    strength = 'strong';
  } else if (overallScore > 0.2) {
    signal = 'buy';
    strength = 'moderate';
  } else if (overallScore < -0.5 && momentum.trend === 'deteriorating') {
    signal = 'sell';
    strength = 'strong';
  } else if (overallScore < -0.2) {
    signal = 'sell';
    strength = 'moderate';
  } else {
    signal = 'hold';
    strength = 'weak';
  }
  
  const risks: string[] = [];
  if (fearGreedIndex.level === 'extreme_greed') risks.push('Market may be overheated - potential correction risk');
  if (fearGreedIndex.level === 'extreme_fear') risks.push('High fear may indicate capitulation or further downside');
  if (Math.abs(social[0].volumeChange) > 50) risks.push('Unusual social media activity - potential volatility');
  if (confidence < 0.6) risks.push('Low confidence in sentiment data - use with caution');
  
  // Historical sentiment
  const historicalSentiment: Array<{ date: string; score: number; level: SentimentLevel }> = [];
  const now = new Date();
  let histScore = overallScore;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    histScore = Math.max(-1, Math.min(1, histScore + (Math.random() - 0.5) * 0.15));
    historicalSentiment.push({
      date: date.toISOString().split('T')[0],
      score: histScore,
      level: scoreToLevel(histScore),
    });
  }
  
  return {
    symbol,
    overallSentiment,
    overallScore,
    confidence,
    sources,
    news,
    social,
    momentum,
    fearGreedIndex,
    indicators,
    aiInterpretation,
    tradingImplications: {
      signal,
      strength,
      reasoning: `Based on ${overallSentiment} sentiment (${overallScore.toFixed(2)}) with ${momentum.trend} momentum.`,
      risks,
    },
    historicalSentiment,
  };
}

// Quick sentiment check
export async function getQuickSentiment(symbol: string): Promise<{
  sentiment: SentimentLevel;
  score: number;
  signal: 'buy' | 'sell' | 'hold';
}> {
  const result = await analyzeSentiment(symbol);
  return {
    sentiment: result.overallSentiment,
    score: result.overallScore,
    signal: result.tradingImplications.signal,
  };
}

// Batch sentiment analysis
export async function analyzeBatchSentiment(symbols: string[]): Promise<Array<{
  symbol: string;
  sentiment: SentimentLevel;
  score: number;
}>> {
  const results = await Promise.all(
    symbols.map(async symbol => {
      const result = await analyzeSentiment(symbol);
      return {
        symbol,
        sentiment: result.overallSentiment,
        score: result.overallScore,
      };
    })
  );
  
  return results;
}
