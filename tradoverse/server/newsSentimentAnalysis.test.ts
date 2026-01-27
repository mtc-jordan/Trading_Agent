import { describe, it, expect, beforeEach } from 'vitest';
import { 
  analyzeKeywordSentiment, 
  clearNewsSentimentCache,
  getNewsSentimentCacheStats 
} from './services/newsSentimentAnalysis';

describe('News Sentiment Analysis', () => {
  beforeEach(() => {
    clearNewsSentimentCache();
  });

  describe('analyzeKeywordSentiment', () => {
    it('should detect bullish sentiment from positive keywords', () => {
      const result = analyzeKeywordSentiment('Apple stock surges 10% after strong earnings beat expectations');
      expect(result.sentiment).toBe('bullish');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reasoning).toContain('bullish');
    });

    it('should detect bearish sentiment from negative keywords', () => {
      const result = analyzeKeywordSentiment('Tech company announces major layoffs amid declining revenue');
      expect(result.sentiment).toBe('bearish');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reasoning).toContain('bearish');
    });

    it('should detect neutral sentiment when no clear indicators', () => {
      const result = analyzeKeywordSentiment('Company announces quarterly earnings report scheduled for next week');
      expect(result.sentiment).toBe('neutral');
      expect(result.reasoning).toContain('No clear sentiment');
    });

    it('should detect neutral sentiment with mixed signals', () => {
      const result = analyzeKeywordSentiment('Stock rises on growth news but also drops on concerns');
      expect(result.sentiment).toBe('neutral');
      expect(result.reasoning).toContain('Mixed');
    });

    it('should handle multiple bullish keywords', () => {
      const result = analyzeKeywordSentiment('Stock soars to record high after breakthrough innovation boosts growth');
      expect(result.sentiment).toBe('bullish');
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should handle multiple bearish keywords', () => {
      const result = analyzeKeywordSentiment('Company faces lawsuit as stock plunges amid bankruptcy concerns');
      expect(result.sentiment).toBe('bearish');
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should be case insensitive', () => {
      const result1 = analyzeKeywordSentiment('STOCK SURGES ON POSITIVE NEWS');
      const result2 = analyzeKeywordSentiment('stock surges on positive news');
      expect(result1.sentiment).toBe(result2.sentiment);
    });

    it('should handle empty headline', () => {
      const result = analyzeKeywordSentiment('');
      expect(result.sentiment).toBe('neutral');
    });

    it('should handle headline with only symbols', () => {
      const result = analyzeKeywordSentiment('AAPL MSFT GOOGL');
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('Cache functionality', () => {
    it('should start with empty cache', () => {
      const stats = getNewsSentimentCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear cache properly', () => {
      // Note: Cache is only populated by AI analysis, not keyword analysis
      // This test verifies the clear function works
      clearNewsSentimentCache();
      const stats = getNewsSentimentCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Sentiment result structure', () => {
    it('should return valid sentiment result structure', () => {
      const result = analyzeKeywordSentiment('Test headline');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(['bullish', 'bearish', 'neutral']).toContain(result.sentiment);
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(typeof result.reasoning).toBe('string');
    });
  });

  describe('Real-world headlines', () => {
    it('should analyze earnings beat headline as bullish', () => {
      const result = analyzeKeywordSentiment('Tesla beats Q4 earnings expectations, stock jumps 8%');
      expect(result.sentiment).toBe('bullish');
    });

    it('should analyze layoff headline as bearish', () => {
      const result = analyzeKeywordSentiment('Meta announces 10,000 layoffs in cost-cutting move');
      expect(result.sentiment).toBe('bearish');
    });

    it('should analyze acquisition headline as bullish', () => {
      const result = analyzeKeywordSentiment('Microsoft completes $69B acquisition of Activision');
      expect(result.sentiment).toBe('bullish');
    });

    it('should analyze investigation headline as bearish', () => {
      const result = analyzeKeywordSentiment('SEC launches investigation into company accounting practices');
      expect(result.sentiment).toBe('bearish');
    });

    it('should analyze dividend announcement as bullish', () => {
      const result = analyzeKeywordSentiment('Company announces increased dividend payout to shareholders');
      expect(result.sentiment).toBe('bullish');
    });

    it('should analyze FDA approval as bullish', () => {
      const result = analyzeKeywordSentiment('Biotech company receives FDA approval for new drug');
      expect(result.sentiment).toBe('bullish');
    });
  });
});
