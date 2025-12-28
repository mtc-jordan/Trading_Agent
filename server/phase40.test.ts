import { describe, it, expect } from 'vitest';
import {
  getTopTraders,
  getTraderById,
  getCopyPerformance,
} from './services/copyTrading';
import {
  getEmotionCorrelations,
  detectTradingPatterns,
  getJournalStats,
} from './services/tradingJournal';
import {
  getAvailableExchanges,
  getExchangeInfo,
} from './services/exchangeIntegration';

describe('Copy Trading Service', () => {
  describe('getTopTraders', () => {
    it('should return array of top traders', async () => {
      const traders = await getTopTraders();
      expect(Array.isArray(traders)).toBe(true);
    });

    it('should include trader performance metrics', async () => {
      const traders = await getTopTraders();
      if (traders.length > 0) {
        const trader = traders[0];
        expect(trader).toHaveProperty('id');
        expect(trader).toHaveProperty('totalReturn');
        expect(trader).toHaveProperty('winRate');
      }
    });
  });

  describe('getTraderById', () => {
    it('should return null for non-existent trader', async () => {
      const profile = await getTraderById('non-existent-trader');
      expect(profile).toBeNull();
    });
  });

  describe('getCopyPerformance', () => {
    it('should calculate performance metrics', async () => {
      const performance = await getCopyPerformance('test-user');
      expect(performance).toHaveProperty('totalReturn');
      expect(performance).toHaveProperty('totalCopiedTrades');
    });
  });
});

describe('Trading Journal Service', () => {
  describe('getEmotionCorrelations', () => {
    it('should return emotion correlation analysis', async () => {
      const correlations = await getEmotionCorrelations('test-user');
      expect(Array.isArray(correlations)).toBe(true);
    });

    it('should include emotion types and win rates', async () => {
      const correlations = await getEmotionCorrelations('test-user');
      if (correlations.length > 0) {
        const corr = correlations[0];
        expect(corr).toHaveProperty('emotion');
        expect(corr).toHaveProperty('winRate');
        expect(corr).toHaveProperty('avgPnL');
      }
    });
  });

  describe('detectTradingPatterns', () => {
    it('should identify trading patterns', async () => {
      const patterns = await detectTradingPatterns('test-user');
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should include pattern details', async () => {
      const patterns = await detectTradingPatterns('test-user');
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('impact');
      }
    });
  });

  describe('getJournalStats', () => {
    it('should calculate journal statistics', async () => {
      const stats = await getJournalStats('test-user');
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalTrades');
      expect(stats).toHaveProperty('winRate');
    });

    it('should include emotion breakdown', async () => {
      const stats = await getJournalStats('test-user');
      expect(stats).toHaveProperty('emotionBreakdown');
      expect(typeof stats.emotionBreakdown).toBe('object');
    });
  });
});

describe('Exchange Integration Service', () => {
  describe('getAvailableExchanges', () => {
    it('should return list of supported exchanges', () => {
      const exchanges = getAvailableExchanges();
      expect(Array.isArray(exchanges)).toBe(true);
      expect(exchanges.length).toBeGreaterThan(0);
    });

    it('should include Binance', () => {
      const exchanges = getAvailableExchanges();
      const binance = exchanges.find(e => e.type === 'binance');
      expect(binance).toBeDefined();
      expect(binance?.name).toBe('Binance');
    });

    it('should include Alpaca', () => {
      const exchanges = getAvailableExchanges();
      const alpaca = exchanges.find(e => e.type === 'alpaca');
      expect(alpaca).toBeDefined();
      expect(alpaca?.name).toBe('Alpaca');
    });

    it('should include Interactive Brokers', () => {
      const exchanges = getAvailableExchanges();
      const ibkr = exchanges.find(e => e.type === 'interactive_brokers');
      expect(ibkr).toBeDefined();
      expect(ibkr?.name).toBe('Interactive Brokers');
    });
  });

  describe('getExchangeInfo', () => {
    it('should return exchange details for Binance', () => {
      const info = getExchangeInfo('binance');
      expect(info).toBeDefined();
      expect(info?.name).toBe('Binance');
      expect(info?.type).toBe('binance');
    });

    it('should return exchange details for Alpaca', () => {
      const info = getExchangeInfo('alpaca');
      expect(info).toBeDefined();
      expect(info?.name).toBe('Alpaca');
      expect(info?.type).toBe('alpaca');
    });

    it('should return undefined for unknown exchange', () => {
      const info = getExchangeInfo('unknown' as any);
      expect(info).toBeUndefined();
    });
  });


});

describe('Integration Tests', () => {
  it('should have all services properly exported', () => {
    expect(typeof getTopTraders).toBe('function');
    expect(typeof getEmotionCorrelations).toBe('function');
    expect(typeof getAvailableExchanges).toBe('function');
  });
});
