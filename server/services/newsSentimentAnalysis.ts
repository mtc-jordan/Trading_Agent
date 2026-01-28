/**
 * News Headline Sentiment Analysis Service
 * 
 * Uses AI to analyze the sentiment of news headlines
 * and provide bullish/bearish/neutral indicators with confidence scores.
 */

import { invokeLLM } from '../_core/llm';

export interface NewsSentimentResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  reasoning: string;
}

export interface NewsArticleSentimentResult {
  articleId: string;
  headline: string;
  sentiment: NewsSentimentResult;
}

// In-memory cache for sentiment results (TTL: 1 hour)
const sentimentCache = new Map<string, { result: NewsSentimentResult; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(headline: string): string {
  return headline.toLowerCase().trim();
}

function getCachedSentiment(headline: string): NewsSentimentResult | null {
  const key = getCacheKey(headline);
  const cached = sentimentCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }
  
  // Clean up expired entry
  if (cached) {
    sentimentCache.delete(key);
  }
  
  return null;
}

function cacheSentiment(headline: string, result: NewsSentimentResult): void {
  const key = getCacheKey(headline);
  sentimentCache.set(key, { result, timestamp: Date.now() });
  
  // Cleanup old entries if cache gets too large
  if (sentimentCache.size > 1000) {
    const now = Date.now();
    const entries = Array.from(sentimentCache.entries());
    for (const [k, v] of entries) {
      if (now - v.timestamp > CACHE_TTL_MS) {
        sentimentCache.delete(k);
      }
    }
  }
}

/**
 * Analyze sentiment of a single news headline using AI
 */
export async function analyzeHeadlineSentiment(headline: string): Promise<NewsSentimentResult> {
  // Check cache first
  const cached = getCachedSentiment(headline);
  if (cached) {
    return cached;
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a financial sentiment analysis expert. Analyze the given news headline and determine its market sentiment.

Your response must be valid JSON with exactly these fields:
- sentiment: "bullish", "bearish", or "neutral"
- confidence: a number from 0 to 100 representing how confident you are
- reasoning: a brief 1-2 sentence explanation

Consider these factors:
- Bullish indicators: positive earnings, growth, upgrades, acquisitions, new products, market expansion, partnerships, innovation
- Bearish indicators: losses, layoffs, downgrades, lawsuits, regulatory issues, market decline, debt concerns, executive departures
- Neutral indicators: routine announcements, mixed signals, unclear impact, general market commentary

Be decisive - only use "neutral" when the headline truly has no clear market direction.`
        },
        {
          role: 'user',
          content: `Analyze this headline: "${headline}"`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              sentiment: {
                type: 'string',
                enum: ['bullish', 'bearish', 'neutral'],
                description: 'The market sentiment of the headline'
              },
              confidence: {
                type: 'integer',
                description: 'Confidence level from 0 to 100'
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation for the sentiment classification'
              }
            },
            required: ['sentiment', 'confidence', 'reasoning'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      const result = JSON.parse(content) as NewsSentimentResult;
      
      // Validate and normalize
      const normalizedResult: NewsSentimentResult = {
        sentiment: ['bullish', 'bearish', 'neutral'].includes(result.sentiment) 
          ? result.sentiment 
          : 'neutral',
        confidence: Math.min(100, Math.max(0, Math.round(result.confidence))),
        reasoning: result.reasoning || 'No reasoning provided'
      };
      
      // Cache the result
      cacheSentiment(headline, normalizedResult);
      
      return normalizedResult;
    }
    
    throw new Error('Invalid LLM response format');
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    // Fall back to keyword-based analysis on error
    return analyzeKeywordSentiment(headline);
  }
}

/**
 * Analyze sentiment of multiple news headlines in batch
 * Uses parallel processing for efficiency with rate limiting
 */
export async function analyzeNewsBatchSentiment(
  articles: Array<{ id: string; headline: string }>
): Promise<NewsArticleSentimentResult[]> {
  // Separate cached and uncached headlines
  const results: NewsArticleSentimentResult[] = [];
  const uncachedArticles: Array<{ id: string; headline: string }> = [];
  
  for (const article of articles) {
    const cached = getCachedSentiment(article.headline);
    if (cached) {
      results.push({
        articleId: article.id,
        headline: article.headline,
        sentiment: cached
      });
    } else {
      uncachedArticles.push(article);
    }
  }
  
  // Process uncached headlines in parallel (limit concurrency to 5)
  const BATCH_SIZE = 5;
  for (let i = 0; i < uncachedArticles.length; i += BATCH_SIZE) {
    const batch = uncachedArticles.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (article) => {
        const sentiment = await analyzeHeadlineSentiment(article.headline);
        return {
          articleId: article.id,
          headline: article.headline,
          sentiment
        };
      })
    );
    results.push(...batchResults);
  }
  
  // Return results in original order
  const resultMap = new Map(results.map(r => [r.articleId, r]));
  return articles.map(a => resultMap.get(a.id)!);
}

/**
 * Quick keyword-based sentiment analysis (fallback when LLM is unavailable)
 */
export function analyzeKeywordSentiment(headline: string): NewsSentimentResult {
  const bullishKeywords = [
    'surge', 'soar', 'jump', 'rally', 'gain', 'rise', 'up', 'high', 'record', 
    'beat', 'exceed', 'growth', 'profit', 'positive', 'upgrade', 'buy', 
    'outperform', 'strong', 'boost', 'breakthrough', 'win', 'success', 'expand',
    'bullish', 'optimistic', 'boom', 'skyrocket', 'milestone', 'innovation',
    'partnership', 'acquisition', 'dividend', 'buyback', 'approval'
  ];
  
  const bearishKeywords = [
    'fall', 'drop', 'plunge', 'crash', 'decline', 'down', 'low', 'miss', 
    'loss', 'negative', 'downgrade', 'sell', 'underperform', 'weak', 'cut', 
    'layoff', 'warning', 'concern', 'fear', 'risk', 'lawsuit', 'investigation',
    'bearish', 'pessimistic', 'slump', 'tumble', 'crisis', 'bankruptcy',
    'recall', 'fraud', 'scandal', 'debt', 'default', 'fine'
  ];
  
  const lowerHeadline = headline.toLowerCase();
  const bullishCount = bullishKeywords.filter(kw => lowerHeadline.includes(kw)).length;
  const bearishCount = bearishKeywords.filter(kw => lowerHeadline.includes(kw)).length;
  
  const totalMatches = bullishCount + bearishCount;
  
  if (bullishCount > bearishCount) {
    return {
      sentiment: 'bullish',
      confidence: Math.min(85, 50 + bullishCount * 10),
      reasoning: `Detected ${bullishCount} bullish keyword(s) in headline`
    };
  }
  
  if (bearishCount > bullishCount) {
    return {
      sentiment: 'bearish',
      confidence: Math.min(85, 50 + bearishCount * 10),
      reasoning: `Detected ${bearishCount} bearish keyword(s) in headline`
    };
  }
  
  return {
    sentiment: 'neutral',
    confidence: totalMatches === 0 ? 40 : 50,
    reasoning: totalMatches === 0 
      ? 'No clear sentiment indicators found' 
      : 'Mixed sentiment signals detected'
  };
}

/**
 * Clear the sentiment cache (useful for testing)
 */
export function clearNewsSentimentCache(): void {
  sentimentCache.clear();
}

/**
 * Get cache statistics
 */
export function getNewsSentimentCacheStats(): { size: number } {
  return {
    size: sentimentCache.size
  };
}
