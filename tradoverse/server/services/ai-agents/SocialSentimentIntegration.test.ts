import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeSentimentText,
  getSymbolSentiment,
  getTrendingSymbols,
  getSentimentHeatmap,
  generateSentimentAlerts,
  getSentimentLabel,
  extractSymbols,
} from './SocialSentimentIntegration';

describe('SocialSentimentIntegration', () => {
  describe('analyzeSentimentText', () => {
    it('should detect bullish sentiment', () => {
      const result = analyzeSentimentText('AAPL is going to the moon! Great earnings, buy now!');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect bearish sentiment', () => {
      const result = analyzeSentimentText('TSLA is crashing, terrible news, sell everything');
      expect(result.score).toBeLessThan(0);
    });

    it('should detect neutral sentiment', () => {
      const result = analyzeSentimentText('The market opened today');
      expect(Math.abs(result.score)).toBeLessThanOrEqual(0.5);
    });

    it('should calculate confidence score', () => {
      const result = analyzeSentimentText('Strong buy signal on NVDA');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getSymbolSentiment', () => {
    it('should return sentiment data for a symbol', () => {
      const result = getSymbolSentiment('AAPL');
      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.overallSentiment).toBeDefined();
      expect(typeof result.overallSentiment).toBe('number');
    });

    it('should include platform breakdown', () => {
      const result = getSymbolSentiment('MSFT');
      expect(result.platformBreakdown).toBeDefined();
      expect(Array.isArray(result.platformBreakdown)).toBe(true);
      expect(result.platformBreakdown.length).toBeGreaterThan(0);
    });

    it('should include sentiment trend', () => {
      const result = getSymbolSentiment('GOOGL');
      expect(result.sentimentTrend).toBeDefined();
      expect(Array.isArray(result.sentimentTrend)).toBe(true);
    });

    it('should include social volume metrics', () => {
      const result = getSymbolSentiment('TSLA');
      expect(result.socialVolume).toBeDefined();
      expect(typeof result.socialVolume).toBe('number');
      expect(result.socialVolume).toBeGreaterThanOrEqual(0);
    });

    it('should include buzz score', () => {
      const result = getSymbolSentiment('NVDA');
      expect(result.buzzScore).toBeDefined();
      expect(result.buzzScore).toBeGreaterThanOrEqual(0);
      expect(result.buzzScore).toBeLessThanOrEqual(100);
    });

    it('should include top influencers', () => {
      const result = getSymbolSentiment('META');
      expect(result.topInfluencers).toBeDefined();
      expect(Array.isArray(result.topInfluencers)).toBe(true);
    });

    it('should include key narratives', () => {
      const result = getSymbolSentiment('AMZN');
      expect(result.keyNarratives).toBeDefined();
      expect(Array.isArray(result.keyNarratives)).toBe(true);
    });
  });

  describe('getTrendingSymbols', () => {
    it('should return trending symbols', () => {
      const result = getTrendingSymbols(10);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should include symbol and sentiment', () => {
      const result = getTrendingSymbols(5);
      result.forEach(item => {
        expect(item.symbol).toBeDefined();
        expect(item.sentiment).toBeDefined();
        expect(item.volume).toBeDefined();
      });
    });

    it('should sort by buzz score', () => {
      const result = getTrendingSymbols(10);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].buzzScore).toBeGreaterThanOrEqual(result[i].buzzScore);
      }
    });
  });

  describe('getSentimentHeatmap', () => {
    it('should return heatmap data', () => {
      const result = getSentimentHeatmap();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include symbol and platform data', () => {
      const result = getSentimentHeatmap();
      result.forEach(item => {
        expect(item.symbol).toBeDefined();
        expect(item.platform).toBeDefined();
        expect(item.sentiment).toBeDefined();
        expect(item.volume).toBeDefined();
      });
    });
  });

  describe('generateSentimentAlerts', () => {
    it('should generate alerts for significant sentiment changes', () => {
      const currentSentiment = getSymbolSentiment('AAPL');
      const previousSentiment = { ...currentSentiment, overallSentiment: currentSentiment.overallSentiment - 0.5 };
      const alerts = generateSentimentAlerts('AAPL', previousSentiment, currentSentiment);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should include alert severity', () => {
      const currentSentiment = getSymbolSentiment('TSLA');
      const alerts = generateSentimentAlerts('TSLA', null, currentSentiment);
      alerts.forEach(alert => {
        expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity);
      });
    });

    it('should include alert timestamp', () => {
      const currentSentiment = getSymbolSentiment('MSFT');
      const alerts = generateSentimentAlerts('MSFT', null, currentSentiment);
      alerts.forEach(alert => {
        expect(alert.timestamp).toBeDefined();
        expect(typeof alert.timestamp).toBe('number');
      });
    });
  });

  describe('getSentimentLabel', () => {
    it('should return very_bullish for high scores', () => {
      const result = getSentimentLabel(0.8);
      expect(result).toBe('very_bullish');
    });

    it('should return bullish for positive scores', () => {
      const result = getSentimentLabel(0.3);
      expect(result).toBe('bullish');
    });

    it('should return neutral for scores near zero', () => {
      const result = getSentimentLabel(0.05);
      expect(result).toBe('neutral');
    });

    it('should return bearish for negative scores', () => {
      const result = getSentimentLabel(-0.3);
      expect(result).toBe('bearish');
    });

    it('should return very_bearish for very negative scores', () => {
      const result = getSentimentLabel(-0.8);
      expect(result).toBe('very_bearish');
    });
  });

  describe('extractSymbols', () => {
    it('should extract stock symbols from text', () => {
      const result = extractSymbols('Looking at $AAPL and $MSFT today');
      expect(result).toContain('AAPL');
      expect(result).toContain('MSFT');
    });

    it('should handle text with no symbols', () => {
      const result = extractSymbols('No stock symbols here');
      expect(result.length).toBe(0);
    });

    it('should extract multiple symbols', () => {
      const result = extractSymbols('$AAPL $GOOGL $MSFT $TSLA $NVDA');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('sentiment data structure', () => {
    it('should have valid platform breakdown structure', () => {
      const result = getSymbolSentiment('AAPL');
      result.platformBreakdown.forEach(platform => {
        expect(platform.platform).toBeDefined();
        expect(platform.overallSentiment).toBeDefined();
        expect(platform.postCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid sentiment trend structure', () => {
      const result = getSymbolSentiment('MSFT');
      result.sentimentTrend.forEach(point => {
        expect(point.timestamp).toBeDefined();
        expect(point.sentiment).toBeDefined();
        expect(point.platform).toBeDefined();
      });
    });

    it('should have valid related symbols structure', () => {
      const result = getSymbolSentiment('GOOGL');
      result.relatedSymbols.forEach(related => {
        expect(related.symbol).toBeDefined();
        expect(related.correlation).toBeDefined();
        expect(related.coMentions).toBeDefined();
      });
    });
  });
});
