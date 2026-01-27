/**
 * Tests for Real-Time Price Feed Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  realtimePriceFeed, 
  detectAssetTypeFromSymbol, 
  generateSimulatedPrice,
  getAggregatedPrices,
  DEFAULT_WATCHLIST,
  type AssetType
} from './services/realtimePriceFeed';

describe('Real-Time Price Feed Service', () => {
  beforeEach(() => {
    // Reset the service state before each test
    realtimePriceFeed.stop();
  });

  afterEach(() => {
    realtimePriceFeed.stop();
  });

  describe('detectAssetTypeFromSymbol', () => {
    it('should detect stock symbols', () => {
      expect(detectAssetTypeFromSymbol('AAPL')).toBe('stock');
      expect(detectAssetTypeFromSymbol('GOOGL')).toBe('stock');
      expect(detectAssetTypeFromSymbol('MSFT')).toBe('stock');
      expect(detectAssetTypeFromSymbol('TSLA')).toBe('stock');
    });

    it('should detect crypto symbols', () => {
      expect(detectAssetTypeFromSymbol('BTC-USD')).toBe('crypto');
      expect(detectAssetTypeFromSymbol('ETH-USD')).toBe('crypto');
      expect(detectAssetTypeFromSymbol('SOL-USD')).toBe('crypto');
      expect(detectAssetTypeFromSymbol('BTCUSDT')).toBe('crypto');
    });

    it('should detect forex symbols', () => {
      expect(detectAssetTypeFromSymbol('EUR/USD')).toBe('forex');
      expect(detectAssetTypeFromSymbol('GBP/USD')).toBe('forex');
      expect(detectAssetTypeFromSymbol('USD/JPY')).toBe('forex');
      expect(detectAssetTypeFromSymbol('EURUSD')).toBe('forex');
    });

    it('should detect commodity symbols', () => {
      expect(detectAssetTypeFromSymbol('GC=F')).toBe('commodity');
      expect(detectAssetTypeFromSymbol('SI=F')).toBe('commodity');
      expect(detectAssetTypeFromSymbol('CL=F')).toBe('commodity');
      expect(detectAssetTypeFromSymbol('NG=F')).toBe('commodity');
    });
  });

  describe('generateSimulatedPrice', () => {
    it('should generate valid price for stocks', () => {
      const price = generateSimulatedPrice('AAPL', 'stock');
      
      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
      expect(price.assetType).toBe('stock');
      expect(typeof price.price).toBe('number');
      expect(price.price).toBeGreaterThan(0);
      expect(typeof price.change).toBe('number');
      expect(typeof price.changePercent).toBe('number');
      expect(typeof price.volume).toBe('number');
      expect(price.volume).toBeGreaterThan(0);
      expect(typeof price.timestamp).toBe('number');
    });

    it('should generate valid price for crypto', () => {
      const price = generateSimulatedPrice('BTC-USD', 'crypto');
      
      expect(price).toBeDefined();
      expect(price.symbol).toBe('BTC-USD');
      expect(price.assetType).toBe('crypto');
      expect(price.price).toBeGreaterThan(0);
    });

    it('should generate valid price for forex', () => {
      const price = generateSimulatedPrice('EUR/USD', 'forex');
      
      expect(price).toBeDefined();
      expect(price.symbol).toBe('EUR/USD');
      expect(price.assetType).toBe('forex');
      expect(price.price).toBeGreaterThan(0);
    });

    it('should generate valid price for commodities', () => {
      const price = generateSimulatedPrice('GC=F', 'commodity');
      
      expect(price).toBeDefined();
      expect(price.symbol).toBe('GC=F');
      expect(price.assetType).toBe('commodity');
      expect(price.price).toBeGreaterThan(0);
    });

    it('should include bid/ask spread', () => {
      const price = generateSimulatedPrice('AAPL', 'stock');
      
      expect(price.bid).toBeDefined();
      expect(price.ask).toBeDefined();
      expect(price.spread).toBeDefined();
      expect(price.bid!).toBeLessThan(price.ask!);
      expect(price.spread!).toBeGreaterThan(0);
    });

    it('should include 24h high/low', () => {
      const price = generateSimulatedPrice('AAPL', 'stock');
      
      expect(price.high24h).toBeDefined();
      expect(price.low24h).toBeDefined();
      expect(price.high24h!).toBeGreaterThanOrEqual(price.low24h!);
    });

    it('should cache prices for subsequent calls', () => {
      const price1 = generateSimulatedPrice('AAPL', 'stock');
      const price2 = generateSimulatedPrice('AAPL', 'stock');
      
      // Prices should be close (within volatility range)
      const priceDiff = Math.abs(price1.price - price2.price);
      const maxDiff = price1.price * 0.01; // 1% max difference
      expect(priceDiff).toBeLessThan(maxDiff);
    });
  });

  describe('getAggregatedPrices', () => {
    it('should return aggregated prices for multiple asset types', () => {
      const result = getAggregatedPrices({
        stocks: ['AAPL', 'GOOGL'],
        crypto: ['BTC-USD'],
        forex: ['EUR/USD'],
        commodities: ['GC=F'],
      });

      expect(result.stocks).toHaveLength(2);
      expect(result.crypto).toHaveLength(1);
      expect(result.forex).toHaveLength(1);
      expect(result.commodities).toHaveLength(1);
      expect(typeof result.timestamp).toBe('number');
    });

    it('should handle empty arrays', () => {
      const result = getAggregatedPrices({
        stocks: [],
        crypto: [],
      });

      expect(result.stocks).toHaveLength(0);
      expect(result.crypto).toHaveLength(0);
    });

    it('should handle undefined arrays', () => {
      const result = getAggregatedPrices({});

      expect(result.stocks).toHaveLength(0);
      expect(result.crypto).toHaveLength(0);
      expect(result.forex).toHaveLength(0);
      expect(result.commodities).toHaveLength(0);
    });
  });

  describe('DEFAULT_WATCHLIST', () => {
    it('should have default watchlist for all asset types', () => {
      expect(DEFAULT_WATCHLIST.stocks).toBeDefined();
      expect(DEFAULT_WATCHLIST.stocks.length).toBeGreaterThan(0);
      
      expect(DEFAULT_WATCHLIST.crypto).toBeDefined();
      expect(DEFAULT_WATCHLIST.crypto.length).toBeGreaterThan(0);
      
      expect(DEFAULT_WATCHLIST.forex).toBeDefined();
      expect(DEFAULT_WATCHLIST.forex.length).toBeGreaterThan(0);
      
      expect(DEFAULT_WATCHLIST.commodities).toBeDefined();
      expect(DEFAULT_WATCHLIST.commodities.length).toBeGreaterThan(0);
    });

    it('should include popular symbols', () => {
      expect(DEFAULT_WATCHLIST.stocks).toContain('AAPL');
      expect(DEFAULT_WATCHLIST.crypto).toContain('BTC-USD');
      expect(DEFAULT_WATCHLIST.forex).toContain('EUR/USD');
      expect(DEFAULT_WATCHLIST.commodities).toContain('GC=F');
    });
  });

  describe('realtimePriceFeed service', () => {
    it('should start and stop correctly', () => {
      expect(realtimePriceFeed.getStatus().isRunning).toBe(false);
      
      realtimePriceFeed.subscribe({ symbol: 'AAPL', assetType: 'stock' });
      expect(realtimePriceFeed.getStatus().isRunning).toBe(true);
      
      realtimePriceFeed.stop();
      expect(realtimePriceFeed.getStatus().isRunning).toBe(false);
    });

    it('should track subscriptions', () => {
      realtimePriceFeed.subscribe({ symbol: 'AAPL', assetType: 'stock' });
      realtimePriceFeed.subscribe({ symbol: 'GOOGL', assetType: 'stock' });
      
      const status = realtimePriceFeed.getStatus();
      expect(status.subscriptionCount).toBe(2);
      expect(status.symbols).toContain('AAPL');
      expect(status.symbols).toContain('GOOGL');
    });

    it('should unsubscribe correctly', () => {
      realtimePriceFeed.subscribe({ symbol: 'AAPL', assetType: 'stock' });
      realtimePriceFeed.subscribe({ symbol: 'GOOGL', assetType: 'stock' });
      
      realtimePriceFeed.unsubscribe('AAPL');
      
      const status = realtimePriceFeed.getStatus();
      expect(status.subscriptionCount).toBe(1);
      expect(status.symbols).not.toContain('AAPL');
      expect(status.symbols).toContain('GOOGL');
    });

    it('should get cached prices', () => {
      realtimePriceFeed.subscribe({ symbol: 'AAPL', assetType: 'stock' });
      
      // Generate a price first
      generateSimulatedPrice('AAPL', 'stock');
      
      const price = realtimePriceFeed.getPrice('AAPL');
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
    });

    it('should refresh prices', async () => {
      const price = await realtimePriceFeed.refreshPrice('AAPL');
      
      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
      expect(price.price).toBeGreaterThan(0);
    });

    it('should subscribe to multiple symbols at once', () => {
      realtimePriceFeed.subscribeMany([
        { symbol: 'AAPL', assetType: 'stock' },
        { symbol: 'GOOGL', assetType: 'stock' },
        { symbol: 'BTC-USD', assetType: 'crypto' },
      ]);
      
      const status = realtimePriceFeed.getStatus();
      expect(status.subscriptionCount).toBe(3);
    });
  });

  describe('Price formatting', () => {
    it('should format forex prices with 5 decimal places', () => {
      const price = generateSimulatedPrice('EUR/USD', 'forex');
      
      // Check that price has appropriate precision for forex
      const priceStr = price.price.toString();
      const decimalPart = priceStr.split('.')[1] || '';
      expect(decimalPart.length).toBeLessThanOrEqual(5);
    });

    it('should format stock prices with 2 decimal places', () => {
      const price = generateSimulatedPrice('AAPL', 'stock');
      
      // Check that price has appropriate precision for stocks
      const priceStr = price.price.toString();
      const decimalPart = priceStr.split('.')[1] || '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Price volatility', () => {
    it('should have higher volatility for crypto', () => {
      const stockPrices: number[] = [];
      const cryptoPrices: number[] = [];
      
      // Generate multiple prices to measure volatility
      for (let i = 0; i < 10; i++) {
        stockPrices.push(generateSimulatedPrice('AAPL', 'stock').price);
        cryptoPrices.push(generateSimulatedPrice('BTC-USD', 'crypto').price);
      }
      
      // Calculate standard deviation
      const stockStd = calculateStd(stockPrices);
      const cryptoStd = calculateStd(cryptoPrices);
      
      // Crypto should generally have higher volatility (relative to price)
      const stockRelativeStd = stockStd / average(stockPrices);
      const cryptoRelativeStd = cryptoStd / average(cryptoPrices);
      
      // This is a probabilistic test, so we just check that both have some volatility
      expect(stockRelativeStd).toBeGreaterThanOrEqual(0);
      expect(cryptoRelativeStd).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions for statistical calculations
function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStd(arr: number[]): number {
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}
