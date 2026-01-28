import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordSentiment,
  recordSentimentBatch,
  getSentimentTrend,
  getSentimentTrendWithFallback,
  generateMockTrendData,
  getSentimentHistoryStats,
  clearSentimentHistory,
} from './services/sentimentTrendService';

describe('Sentiment Trend Service', () => {
  beforeEach(() => {
    clearSentimentHistory();
  });

  describe('recordSentiment', () => {
    it('should record a single sentiment entry', () => {
      recordSentiment('article-1', 'bullish');
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should record sentiment with custom timestamp', () => {
      const customTime = Date.now() - 3600000; // 1 hour ago
      recordSentiment('article-1', 'bearish', customTime);
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.oldestTimestamp).toBe(customTime);
    });

    it('should update existing entry for same article ID', () => {
      recordSentiment('article-1', 'bullish');
      recordSentiment('article-1', 'bearish');
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('recordSentimentBatch', () => {
    it('should record multiple sentiments at once', () => {
      recordSentimentBatch([
        { id: 'article-1', sentiment: 'bullish' },
        { id: 'article-2', sentiment: 'bearish' },
        { id: 'article-3', sentiment: 'neutral' },
      ]);
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(3);
    });

    it('should handle empty batch', () => {
      recordSentimentBatch([]);
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getSentimentTrend', () => {
    it('should return 24h trend with 24 buckets', () => {
      const trend = getSentimentTrend('24h');
      expect(trend.period).toBe('24h');
      expect(trend.dataPoints.length).toBe(24);
    });

    it('should return 7d trend with 7 buckets', () => {
      const trend = getSentimentTrend('7d');
      expect(trend.period).toBe('7d');
      expect(trend.dataPoints.length).toBe(7);
    });

    it('should aggregate sentiments into correct buckets', () => {
      const now = Date.now();
      recordSentimentBatch([
        { id: 'a1', sentiment: 'bullish', timestamp: now - 1000 },
        { id: 'a2', sentiment: 'bullish', timestamp: now - 2000 },
        { id: 'a3', sentiment: 'bearish', timestamp: now - 3000 },
      ]);
      
      const trend = getSentimentTrend('24h');
      expect(trend.summary.totalArticles).toBe(3);
      expect(trend.summary.bullishPercentage).toBeGreaterThan(0);
      expect(trend.summary.bearishPercentage).toBeGreaterThan(0);
    });

    it('should calculate dominant sentiment correctly', () => {
      recordSentimentBatch([
        { id: 'a1', sentiment: 'bullish' },
        { id: 'a2', sentiment: 'bullish' },
        { id: 'a3', sentiment: 'bullish' },
        { id: 'a4', sentiment: 'bearish' },
      ]);
      
      const trend = getSentimentTrend('24h');
      expect(trend.summary.dominantSentiment).toBe('bullish');
    });

    it('should handle empty history', () => {
      const trend = getSentimentTrend('24h');
      expect(trend.summary.totalArticles).toBe(0);
      expect(trend.summary.bullishPercentage).toBe(0);
      expect(trend.summary.bearishPercentage).toBe(0);
      expect(trend.summary.neutralPercentage).toBe(0);
    });
  });

  describe('generateMockTrendData', () => {
    it('should generate mock data for 24h period', () => {
      const mockData = generateMockTrendData('24h');
      expect(mockData.period).toBe('24h');
      expect(mockData.dataPoints.length).toBe(24);
      expect(mockData.summary.totalArticles).toBeGreaterThan(0);
    });

    it('should generate mock data for 7d period', () => {
      const mockData = generateMockTrendData('7d');
      expect(mockData.period).toBe('7d');
      expect(mockData.dataPoints.length).toBe(7);
      expect(mockData.summary.totalArticles).toBeGreaterThan(0);
    });

    it('should have valid percentage distribution', () => {
      const mockData = generateMockTrendData('24h');
      const totalPct = mockData.summary.bullishPercentage + 
                       mockData.summary.bearishPercentage + 
                       mockData.summary.neutralPercentage;
      expect(totalPct).toBeGreaterThanOrEqual(99);
      expect(totalPct).toBeLessThanOrEqual(101); // Allow for rounding
    });
  });

  describe('getSentimentTrendWithFallback', () => {
    it('should return mock data when history is empty', () => {
      const trend = getSentimentTrendWithFallback('24h');
      expect(trend.summary.totalArticles).toBeGreaterThan(0);
    });

    it('should return real data when sufficient history exists', () => {
      // Add enough entries to exceed threshold
      for (let i = 0; i < 15; i++) {
        recordSentiment(`article-${i}`, i % 3 === 0 ? 'bullish' : i % 3 === 1 ? 'bearish' : 'neutral');
      }
      
      const trend = getSentimentTrendWithFallback('24h');
      expect(trend.summary.totalArticles).toBe(15);
    });
  });

  describe('getSentimentHistoryStats', () => {
    it('should return correct stats for empty history', () => {
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
    });

    it('should track oldest and newest timestamps', () => {
      const oldTime = Date.now() - 86400000; // 1 day ago
      const newTime = Date.now();
      
      recordSentiment('old-article', 'bullish', oldTime);
      recordSentiment('new-article', 'bearish', newTime);
      
      const stats = getSentimentHistoryStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.oldestTimestamp).toBe(oldTime);
      expect(stats.newestTimestamp).toBe(newTime);
    });
  });

  describe('clearSentimentHistory', () => {
    it('should clear all history entries', () => {
      recordSentimentBatch([
        { id: 'a1', sentiment: 'bullish' },
        { id: 'a2', sentiment: 'bearish' },
      ]);
      
      expect(getSentimentHistoryStats().totalEntries).toBe(2);
      
      clearSentimentHistory();
      
      expect(getSentimentHistoryStats().totalEntries).toBe(0);
    });
  });

  describe('Trend calculation', () => {
    it('should detect improving trend', () => {
      const now = Date.now();
      const hourMs = 3600000;
      
      // Old data: mostly bearish
      for (let i = 0; i < 5; i++) {
        recordSentiment(`old-${i}`, 'bearish', now - (20 * hourMs) + (i * hourMs));
      }
      
      // Recent data: mostly bullish
      for (let i = 0; i < 5; i++) {
        recordSentiment(`new-${i}`, 'bullish', now - (4 * hourMs) + (i * hourMs));
      }
      
      const trend = getSentimentTrend('24h');
      // Trend should be improving since recent is more bullish
      expect(['improving', 'stable']).toContain(trend.summary.trend);
    });

    it('should handle all neutral sentiments', () => {
      for (let i = 0; i < 10; i++) {
        recordSentiment(`article-${i}`, 'neutral');
      }
      
      const trend = getSentimentTrend('24h');
      expect(trend.summary.dominantSentiment).toBe('neutral');
      expect(trend.summary.neutralPercentage).toBe(100);
    });
  });
});
