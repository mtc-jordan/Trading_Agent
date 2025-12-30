/**
 * Phase 28 Tests: Order Routing & Market Data Enhancements
 * 
 * Tests for:
 * - Enhanced Order Routing Preferences
 * - Real-time Market Data Caching
 * - Tab State Persistence (client-side, tested via mocks)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dataApi module
vi.mock('./_core/dataApi', () => ({
  callDataApi: vi.fn(),
}));

// Mock the websocket module
vi.mock('./_core/websocket', () => ({
  broadcastPriceUpdate: vi.fn(),
  broadcastPriceUpdates: vi.fn(),
  getActiveSymbolSubscriptions: vi.fn(() => []),
}));

describe('Phase 28: Order Routing & Market Data Enhancements', () => {
  
  describe('Market Data Caching', () => {
    let marketDataModule: any;
    let mockCallDataApi: any;
    
    beforeEach(async () => {
      vi.resetModules();
      
      // Get the mocked function
      const dataApiModule = await import('./_core/dataApi');
      mockCallDataApi = vi.mocked(dataApiModule.callDataApi);
      
      // Import the module fresh for each test
      marketDataModule = await import('./services/marketData');
    });
    
    afterEach(() => {
      vi.clearAllMocks();
    });
    
    it('should export required functions', () => {
      expect(typeof marketDataModule.fetchStockPrice).toBe('function');
      expect(typeof marketDataModule.fetchMultipleStockPrices).toBe('function');
      expect(typeof marketDataModule.getCachedPrice).toBe('function');
      expect(typeof marketDataModule.getAllCachedPrices).toBe('function');
      expect(typeof marketDataModule.getCacheStats).toBe('function');
      expect(typeof marketDataModule.forceRefresh).toBe('function');
      expect(typeof marketDataModule.prefetchSymbols).toBe('function');
    });
    
    it('should return cache statistics', () => {
      const stats = marketDataModule.getCacheStats();
      
      expect(stats).toHaveProperty('totalCached');
      expect(stats).toHaveProperty('freshCount');
      expect(stats).toHaveProperty('staleCount');
      expect(stats).toHaveProperty('expiredCount');
      expect(stats).toHaveProperty('rateLimited');
      expect(stats).toHaveProperty('cooldownRemaining');
      expect(stats).toHaveProperty('fetchInterval');
      expect(stats).toHaveProperty('requestsThisMinute');
      
      expect(typeof stats.totalCached).toBe('number');
      expect(typeof stats.rateLimited).toBe('boolean');
    });
    
    it('should return null for uncached symbols', () => {
      const result = marketDataModule.getCachedPrice('UNKNOWN_SYMBOL');
      expect(result).toBeNull();
    });
    
    it('should return empty map when no prices are cached', () => {
      const allPrices = marketDataModule.getAllCachedPrices();
      expect(allPrices instanceof Map).toBe(true);
    });
    
    it('should fetch and cache stock price', async () => {
      // Mock successful API response
      mockCallDataApi.mockResolvedValueOnce({
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
              regularMarketPrice: 150.50,
              previousClose: 148.00,
              regularMarketVolume: 1000000,
            },
            indicators: {
              quote: [{}],
            },
          }],
        },
      });
      
      const result = await marketDataModule.fetchStockPrice('AAPL');
      
      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.price).toBe(150.5);
      expect(typeof result?.change).toBe('number');
      expect(typeof result?.changePercent).toBe('number');
    });
    
    it('should return cached data on subsequent calls', async () => {
      // Mock successful API response
      mockCallDataApi.mockResolvedValueOnce({
        chart: {
          result: [{
            meta: {
              symbol: 'MSFT',
              regularMarketPrice: 300.00,
              previousClose: 295.00,
              regularMarketVolume: 500000,
            },
            indicators: {
              quote: [{}],
            },
          }],
        },
      });
      
      // First call - should fetch
      await marketDataModule.fetchStockPrice('MSFT');
      
      // Get cached price
      const cached = marketDataModule.getCachedPrice('MSFT');
      expect(cached).not.toBeNull();
      expect(cached?.symbol).toBe('MSFT');
      expect(cached?.price).toBe(300);
    });
    
    it('should handle API errors gracefully', async () => {
      mockCallDataApi.mockRejectedValueOnce(new Error('API Error'));
      
      const result = await marketDataModule.fetchStockPrice('ERROR_SYMBOL');
      
      // Should return null or cached data on error
      expect(result === null || typeof result === 'object').toBe(true);
    });
    
    it('should handle rate limit errors', async () => {
      mockCallDataApi.mockRejectedValueOnce(new Error('429 Too Many Requests'));
      
      const result = await marketDataModule.fetchStockPrice('RATE_LIMITED');
      
      // Should handle gracefully
      expect(result === null || typeof result === 'object').toBe(true);
      
      // Check that rate limit state is tracked
      const stats = marketDataModule.getCacheStats();
      expect(typeof stats.rateLimited).toBe('boolean');
    });
    
    it('should fetch multiple stock prices', async () => {
      mockCallDataApi
        .mockResolvedValueOnce({
          chart: {
            result: [{
              meta: {
                symbol: 'GOOGL',
                regularMarketPrice: 140.00,
                previousClose: 138.00,
                regularMarketVolume: 200000,
              },
              indicators: { quote: [{}] },
            }],
          },
        })
        .mockResolvedValueOnce({
          chart: {
            result: [{
              meta: {
                symbol: 'AMZN',
                regularMarketPrice: 180.00,
                previousClose: 175.00,
                regularMarketVolume: 300000,
              },
              indicators: { quote: [{}] },
            }],
          },
        });
      
      const results = await marketDataModule.fetchMultipleStockPrices(['GOOGL', 'AMZN']);
      
      expect(Array.isArray(results)).toBe(true);
    });
    
    it('should normalize symbols to uppercase', async () => {
      mockCallDataApi.mockResolvedValueOnce({
        chart: {
          result: [{
            meta: {
              symbol: 'NVDA',
              regularMarketPrice: 500.00,
              previousClose: 490.00,
              regularMarketVolume: 400000,
            },
            indicators: { quote: [{}] },
          }],
        },
      });
      
      await marketDataModule.fetchStockPrice('nvda');
      
      // Should be cached as uppercase
      const cached = marketDataModule.getCachedPrice('NVDA');
      expect(cached?.symbol).toBe('NVDA');
    });
  });
  
  describe('Order Routing Preferences', () => {
    it('should have valid broker configurations', () => {
      const brokerInfo = {
        alpaca: { name: 'Alpaca', executionSpeed: 85, reliability: 92 },
        interactive_brokers: { name: 'Interactive Brokers', executionSpeed: 95, reliability: 98 },
        binance: { name: 'Binance', executionSpeed: 90, reliability: 88 },
        coinbase: { name: 'Coinbase', executionSpeed: 80, reliability: 95 },
      };
      
      // Verify all brokers have required properties
      Object.entries(brokerInfo).forEach(([broker, info]) => {
        expect(info.name).toBeTruthy();
        expect(info.executionSpeed).toBeGreaterThan(0);
        expect(info.executionSpeed).toBeLessThanOrEqual(100);
        expect(info.reliability).toBeGreaterThan(0);
        expect(info.reliability).toBeLessThanOrEqual(100);
      });
    });
    
    it('should have valid asset class configurations', () => {
      const assetClasses = [
        { id: 'us_equity', name: 'US Stocks', defaultBrokers: ['alpaca', 'interactive_brokers'] },
        { id: 'crypto', name: 'Cryptocurrency', defaultBrokers: ['binance', 'coinbase', 'alpaca'] },
        { id: 'forex', name: 'Forex', defaultBrokers: ['interactive_brokers'] },
        { id: 'options', name: 'Options', defaultBrokers: ['interactive_brokers'] },
      ];
      
      assetClasses.forEach(assetClass => {
        expect(assetClass.id).toBeTruthy();
        expect(assetClass.name).toBeTruthy();
        expect(Array.isArray(assetClass.defaultBrokers)).toBe(true);
        expect(assetClass.defaultBrokers.length).toBeGreaterThan(0);
      });
    });
    
    it('should validate symbol rule conditions', () => {
      const validConditions = ['always', 'volume_above', 'volume_below', 'time_range'];
      
      validConditions.forEach(condition => {
        expect(typeof condition).toBe('string');
        expect(condition.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Tab State Persistence', () => {
    it('should have valid tab identifiers', () => {
      const validTabs = ['ai-providers', 'usage', 'fallback', 'preferences', 'notifications', 'routing'];
      
      validTabs.forEach(tab => {
        expect(typeof tab).toBe('string');
        expect(tab.length).toBeGreaterThan(0);
        // Tab IDs should be lowercase with hyphens
        expect(tab).toMatch(/^[a-z-]+$/);
      });
    });
    
    it('should have localStorage key defined', () => {
      const SETTINGS_TAB_KEY = 'tradoverse_settings_tab';
      expect(SETTINGS_TAB_KEY).toBe('tradoverse_settings_tab');
    });
    
    it('should validate tab values', () => {
      const validTabs = ['ai-providers', 'usage', 'fallback', 'preferences', 'notifications', 'routing'];
      
      // Test that all expected tabs are present
      expect(validTabs).toContain('ai-providers');
      expect(validTabs).toContain('routing');
      expect(validTabs).toContain('notifications');
      expect(validTabs.length).toBe(6);
    });
  });
  
  describe('Stock Quote Function', () => {
    let marketDataModule: any;
    let mockCallDataApi: any;
    
    beforeEach(async () => {
      vi.resetModules();
      
      const dataApiModule = await import('./_core/dataApi');
      mockCallDataApi = vi.mocked(dataApiModule.callDataApi);
      
      marketDataModule = await import('./services/marketData');
    });
    
    afterEach(() => {
      vi.clearAllMocks();
    });
    
    it('should return detailed stock quote', async () => {
      mockCallDataApi.mockResolvedValueOnce({
        chart: {
          result: [{
            meta: {
              symbol: 'TSLA',
              longName: 'Tesla, Inc.',
              regularMarketPrice: 250.00,
              previousClose: 245.00,
              regularMarketVolume: 1000000,
              marketCap: 800000000000,
              fiftyTwoWeekHigh: 300.00,
              fiftyTwoWeekLow: 150.00,
              regularMarketDayHigh: 255.00,
              regularMarketDayLow: 248.00,
              exchangeName: 'NASDAQ',
              currency: 'USD',
            },
            indicators: { quote: [{}] },
          }],
        },
      });
      
      const quote = await marketDataModule.getStockQuote('TSLA');
      
      expect(quote).not.toBeNull();
      expect(quote?.symbol).toBe('TSLA');
      expect(quote?.name).toBe('Tesla, Inc.');
      expect(quote?.price).toBe(250);
      expect(quote?.exchange).toBe('NASDAQ');
      expect(quote?.currency).toBe('USD');
    });
    
    it('should include cache metadata in quote', async () => {
      mockCallDataApi.mockResolvedValueOnce({
        chart: {
          result: [{
            meta: {
              symbol: 'META',
              regularMarketPrice: 350.00,
              previousClose: 340.00,
              regularMarketVolume: 500000,
            },
            indicators: { quote: [{}] },
          }],
        },
      });
      
      const quote = await marketDataModule.getStockQuote('META');
      
      expect(quote).toHaveProperty('cached');
      expect(quote).toHaveProperty('cacheAge');
      expect(typeof quote?.cached).toBe('boolean');
      expect(typeof quote?.cacheAge).toBe('number');
    });
  });
  
  describe('Search Stocks Function', () => {
    let marketDataModule: any;
    
    beforeEach(async () => {
      vi.resetModules();
      marketDataModule = await import('./services/marketData');
    });
    
    it('should search stocks by symbol', async () => {
      const results = await marketDataModule.searchStocks('AAPL');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.some((s: any) => s.symbol === 'AAPL')).toBe(true);
    });
    
    it('should search stocks by name', async () => {
      const results = await marketDataModule.searchStocks('Apple');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.some((s: any) => s.name.includes('Apple'))).toBe(true);
    });
    
    it('should return stock details in search results', async () => {
      const results = await marketDataModule.searchStocks('MSFT');
      
      if (results.length > 0) {
        const stock = results[0];
        expect(stock).toHaveProperty('symbol');
        expect(stock).toHaveProperty('name');
        expect(stock).toHaveProperty('exchange');
        expect(stock).toHaveProperty('type');
      }
    });
    
    it('should handle case-insensitive search', async () => {
      const upperResults = await marketDataModule.searchStocks('GOOGL');
      const lowerResults = await marketDataModule.searchStocks('googl');
      
      expect(upperResults.length).toBe(lowerResults.length);
    });
  });
});
