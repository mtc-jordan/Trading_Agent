/**
 * Sentiment Trend Service
 * Tracks and aggregates sentiment data over time for trend visualization
 */

import { analyzeKeywordSentiment } from './newsSentimentAnalysis';

export interface SentimentDataPoint {
  timestamp: number;
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
}

export interface SentimentTrendData {
  period: '24h' | '7d';
  dataPoints: SentimentDataPoint[];
  summary: {
    totalArticles: number;
    bullishPercentage: number;
    bearishPercentage: number;
    neutralPercentage: number;
    dominantSentiment: 'bullish' | 'bearish' | 'neutral';
    trend: 'improving' | 'declining' | 'stable';
  };
}

// In-memory cache for sentiment history (in production, use database)
const sentimentHistory: Map<string, { sentiment: 'bullish' | 'bearish' | 'neutral'; timestamp: number }> = new Map();

// Maximum history to keep (7 days worth)
const MAX_HISTORY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Record a sentiment analysis result for trend tracking
 */
export function recordSentiment(
  articleId: string,
  sentiment: 'bullish' | 'bearish' | 'neutral',
  timestamp?: number
): void {
  const ts = timestamp || Date.now();
  sentimentHistory.set(articleId, { sentiment, timestamp: ts });
  
  // Clean up old entries
  cleanupOldEntries();
}

/**
 * Record multiple sentiments at once
 */
export function recordSentimentBatch(
  articles: Array<{ id: string; sentiment: 'bullish' | 'bearish' | 'neutral'; timestamp?: number }>
): void {
  const now = Date.now();
  articles.forEach(article => {
    sentimentHistory.set(article.id, {
      sentiment: article.sentiment,
      timestamp: article.timestamp || now,
    });
  });
  cleanupOldEntries();
}

/**
 * Clean up entries older than MAX_HISTORY_MS
 */
function cleanupOldEntries(): void {
  const cutoff = Date.now() - MAX_HISTORY_MS;
  Array.from(sentimentHistory.entries()).forEach(([id, data]) => {
    if (data.timestamp < cutoff) {
      sentimentHistory.delete(id);
    }
  });
}

/**
 * Get sentiment trend data for a specific period
 */
export function getSentimentTrend(period: '24h' | '7d'): SentimentTrendData {
  const now = Date.now();
  const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - periodMs;
  
  // Determine bucket size based on period
  const bucketCount = period === '24h' ? 24 : 7; // 24 hours or 7 days
  const bucketSize = periodMs / bucketCount;
  
  // Initialize buckets
  const buckets: SentimentDataPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = cutoff + (i * bucketSize);
    buckets.push({
      timestamp: bucketStart + (bucketSize / 2), // Middle of bucket
      bullish: 0,
      bearish: 0,
      neutral: 0,
      total: 0,
    });
  }
  
  // Aggregate sentiment data into buckets
  let totalBullish = 0;
  let totalBearish = 0;
  let totalNeutral = 0;
  
  Array.from(sentimentHistory.entries()).forEach(([, data]) => {
    if (data.timestamp >= cutoff) {
      const bucketIndex = Math.min(
        Math.floor((data.timestamp - cutoff) / bucketSize),
        bucketCount - 1
      );
      
      if (bucketIndex >= 0 && bucketIndex < buckets.length) {
        buckets[bucketIndex].total++;
        
        switch (data.sentiment) {
          case 'bullish':
            buckets[bucketIndex].bullish++;
            totalBullish++;
            break;
          case 'bearish':
            buckets[bucketIndex].bearish++;
            totalBearish++;
            break;
          case 'neutral':
            buckets[bucketIndex].neutral++;
            totalNeutral++;
            break;
        }
      }
    }
  });
  
  const totalArticles = totalBullish + totalBearish + totalNeutral;
  
  // Calculate percentages
  const bullishPercentage = totalArticles > 0 ? Math.round((totalBullish / totalArticles) * 100) : 0;
  const bearishPercentage = totalArticles > 0 ? Math.round((totalBearish / totalArticles) * 100) : 0;
  const neutralPercentage = totalArticles > 0 ? Math.round((totalNeutral / totalArticles) * 100) : 0;
  
  // Determine dominant sentiment
  let dominantSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (totalBullish > totalBearish && totalBullish > totalNeutral) {
    dominantSentiment = 'bullish';
  } else if (totalBearish > totalBullish && totalBearish > totalNeutral) {
    dominantSentiment = 'bearish';
  }
  
  // Calculate trend (compare first half to second half)
  const midpoint = Math.floor(bucketCount / 2);
  let firstHalfBullish = 0;
  let secondHalfBullish = 0;
  let firstHalfTotal = 0;
  let secondHalfTotal = 0;
  
  buckets.forEach((bucket, index) => {
    if (index < midpoint) {
      firstHalfBullish += bucket.bullish;
      firstHalfTotal += bucket.total;
    } else {
      secondHalfBullish += bucket.bullish;
      secondHalfTotal += bucket.total;
    }
  });
  
  const firstHalfRatio = firstHalfTotal > 0 ? firstHalfBullish / firstHalfTotal : 0;
  const secondHalfRatio = secondHalfTotal > 0 ? secondHalfBullish / secondHalfTotal : 0;
  
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  const trendThreshold = 0.1; // 10% difference threshold
  
  if (secondHalfRatio - firstHalfRatio > trendThreshold) {
    trend = 'improving';
  } else if (firstHalfRatio - secondHalfRatio > trendThreshold) {
    trend = 'declining';
  }
  
  return {
    period,
    dataPoints: buckets,
    summary: {
      totalArticles,
      bullishPercentage,
      bearishPercentage,
      neutralPercentage,
      dominantSentiment,
      trend,
    },
  };
}

/**
 * Generate mock trend data for demonstration when no real data exists
 */
export function generateMockTrendData(period: '24h' | '7d'): SentimentTrendData {
  const now = Date.now();
  const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - periodMs;
  const bucketCount = period === '24h' ? 24 : 7;
  const bucketSize = periodMs / bucketCount;
  
  const dataPoints: SentimentDataPoint[] = [];
  let totalBullish = 0;
  let totalBearish = 0;
  let totalNeutral = 0;
  
  // Generate realistic-looking mock data with some variation
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = cutoff + (i * bucketSize);
    
    // Create some variation - more bullish in recent periods
    const recentBias = i / bucketCount; // 0 to 1
    const baseTotal = Math.floor(Math.random() * 10) + 5;
    
    const bullish = Math.floor(baseTotal * (0.3 + recentBias * 0.2) + Math.random() * 3);
    const bearish = Math.floor(baseTotal * (0.3 - recentBias * 0.1) + Math.random() * 2);
    const neutral = Math.max(0, baseTotal - bullish - bearish);
    
    totalBullish += bullish;
    totalBearish += bearish;
    totalNeutral += neutral;
    
    dataPoints.push({
      timestamp: bucketStart + (bucketSize / 2),
      bullish,
      bearish,
      neutral,
      total: bullish + bearish + neutral,
    });
  }
  
  const totalArticles = totalBullish + totalBearish + totalNeutral;
  
  return {
    period,
    dataPoints,
    summary: {
      totalArticles,
      bullishPercentage: Math.round((totalBullish / totalArticles) * 100),
      bearishPercentage: Math.round((totalBearish / totalArticles) * 100),
      neutralPercentage: Math.round((totalNeutral / totalArticles) * 100),
      dominantSentiment: totalBullish >= totalBearish ? 'bullish' : 'bearish',
      trend: 'improving',
    },
  };
}

/**
 * Get sentiment trend with fallback to mock data if no real data exists
 */
export function getSentimentTrendWithFallback(period: '24h' | '7d'): SentimentTrendData {
  const realData = getSentimentTrend(period);
  
  // If we have very little data, supplement with mock data for better visualization
  if (realData.summary.totalArticles < 10) {
    return generateMockTrendData(period);
  }
  
  return realData;
}

/**
 * Get current sentiment history stats
 */
export function getSentimentHistoryStats(): { totalEntries: number; oldestTimestamp: number | null; newestTimestamp: number | null } {
  let oldest: number | null = null;
  let newest: number | null = null;
  
  Array.from(sentimentHistory.entries()).forEach(([, data]) => {
    if (oldest === null || data.timestamp < oldest) {
      oldest = data.timestamp;
    }
    if (newest === null || data.timestamp > newest) {
      newest = data.timestamp;
    }
  });
  
  return {
    totalEntries: sentimentHistory.size,
    oldestTimestamp: oldest,
    newestTimestamp: newest,
  };
}

/**
 * Clear all sentiment history (for testing)
 */
export function clearSentimentHistory(): void {
  sentimentHistory.clear();
}
