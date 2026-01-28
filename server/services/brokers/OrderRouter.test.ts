/**
 * Unit tests for OrderRouter service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderRouter, detectAssetClass, RoutingDecision, RoutingPreferences } from './OrderRouter';
import { AssetClass } from './types';
import { IBrokerAdapter } from './IBrokerAdapter';
import { BrokerType } from './types';

// Mock broker adapter
const createMockAdapter = (brokerType: BrokerType): IBrokerAdapter => ({
  brokerType,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
  getAccounts: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue([]),
  getOrders: vi.fn().mockResolvedValue([]),
  placeOrder: vi.fn().mockResolvedValue({ id: 'test-order', status: 'new' }),
  cancelOrder: vi.fn().mockResolvedValue(true),
  getQuote: vi.fn().mockResolvedValue({ symbol: 'TEST', bid: 100, ask: 101 }),
  getOrderHistory: vi.fn().mockResolvedValue([]),
  getAssets: vi.fn().mockResolvedValue([]),
});

describe('OrderRouter', () => {
  let router: OrderRouter;
  let alpacaAdapter: IBrokerAdapter;
  let ibkrAdapter: IBrokerAdapter;
  let binanceAdapter: IBrokerAdapter;
  let coinbaseAdapter: IBrokerAdapter;

  beforeEach(() => {
    router = new OrderRouter();
    alpacaAdapter = createMockAdapter('alpaca');
    ibkrAdapter = createMockAdapter('interactive_brokers');
    binanceAdapter = createMockAdapter('binance');
    coinbaseAdapter = createMockAdapter('coinbase');
  });

  describe('Asset Class Detection', () => {
    it('should detect US stocks correctly', () => {
      expect(detectAssetClass('AAPL')).toBe(AssetClass.US_EQUITY);
      expect(detectAssetClass('MSFT')).toBe(AssetClass.US_EQUITY);
      expect(detectAssetClass('GOOGL')).toBe(AssetClass.US_EQUITY);
      expect(detectAssetClass('TSLA')).toBe(AssetClass.US_EQUITY);
    });

    it('should detect cryptocurrencies correctly', () => {
      expect(detectAssetClass('BTC')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('ETH')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('BTCUSD')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('ETHUSD')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('BTCUSDT')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('SOL')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('DOGE')).toBe(AssetClass.CRYPTO);
    });

    it('should detect forex pairs correctly', () => {
      expect(detectAssetClass('EURUSD')).toBe(AssetClass.FOREX);
      expect(detectAssetClass('GBPUSD')).toBe(AssetClass.FOREX);
      expect(detectAssetClass('USDJPY')).toBe(AssetClass.FOREX);
    });

    it('should detect options correctly', () => {
      expect(detectAssetClass('AAPL240119C00150000')).toBe(AssetClass.OPTIONS);
      expect(detectAssetClass('MSFT240315P00400000')).toBe(AssetClass.OPTIONS);
    });

    it('should detect futures correctly', () => {
      expect(detectAssetClass('ESH24')).toBe(AssetClass.FUTURES);
      expect(detectAssetClass('CLF25')).toBe(AssetClass.FUTURES);
      expect(detectAssetClass('GCG24')).toBe(AssetClass.FUTURES);
    });

    it('should handle symbols with different formats', () => {
      expect(detectAssetClass('btc')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('BTC-USD')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('BTC/USD')).toBe(AssetClass.CRYPTO);
      expect(detectAssetClass('EUR_USD')).toBe(AssetClass.FOREX);
    });
  });

  describe('Broker Registration', () => {
    it('should register brokers correctly', () => {
      router.registerBroker('alpaca', alpacaAdapter);
      expect(router.getConnectedBrokers()).toContain('alpaca');
    });

    it('should unregister brokers correctly', () => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.unregisterBroker('alpaca');
      expect(router.getConnectedBrokers()).not.toContain('alpaca');
    });

    it('should track multiple brokers', () => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.registerBroker('binance', binanceAdapter);
      router.registerBroker('coinbase', coinbaseAdapter);
      
      const brokers = router.getConnectedBrokers();
      expect(brokers).toHaveLength(3);
      expect(brokers).toContain('alpaca');
      expect(brokers).toContain('binance');
      expect(brokers).toContain('coinbase');
    });
  });

  describe('Broker Selection', () => {
    beforeEach(() => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.registerBroker('interactive_brokers', ibkrAdapter);
      router.registerBroker('binance', binanceAdapter);
      router.registerBroker('coinbase', coinbaseAdapter);
    });

    it('should select Alpaca for US stocks by default', () => {
      const decision = router.selectBroker('AAPL');
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('alpaca');
    });

    it('should select Binance for crypto by default', () => {
      const decision = router.selectBroker('BTC');
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('binance');
    });

    it('should select IBKR for forex', () => {
      const decision = router.selectBroker('EURUSD');
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('interactive_brokers');
    });

    it('should select IBKR for options', () => {
      const decision = router.selectBroker('AAPL240119C00150000');
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('interactive_brokers');
    });

    it('should provide alternatives when available', () => {
      const decision = router.selectBroker('BTC');
      expect(decision).not.toBeNull();
      expect(decision!.alternatives.length).toBeGreaterThan(0);
      // Check if coinbase is in alternatives (alternatives are BrokerType strings)
      expect(decision!.alternatives.includes('coinbase')).toBe(true);
    });

    it('should throw error when no broker supports the asset', () => {
      // Create router with only stock brokers
      const stockRouter = new OrderRouter();
      stockRouter.registerBroker('alpaca', alpacaAdapter);
      
      // Try to route forex (not supported by Alpaca)
      expect(() => stockRouter.selectBroker('EURUSD')).toThrow();
    });
  });

  describe('User Preferences', () => {
    beforeEach(() => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.registerBroker('interactive_brokers', ibkrAdapter);
      router.registerBroker('binance', binanceAdapter);
      router.registerBroker('coinbase', coinbaseAdapter);
    });

    it('should respect user preferred stock broker', () => {
      const preferences: RoutingPreferences = {
        preferredStockBroker: 'interactive_brokers',
        enableSmartRouting: true,
        allowFallback: true,
      };
      
      const decision = router.selectBroker('AAPL', preferences);
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('interactive_brokers');
    });

    it('should respect user preferred crypto broker', () => {
      const preferences: RoutingPreferences = {
        preferredCryptoBroker: 'coinbase',
        enableSmartRouting: true,
        allowFallback: true,
      };
      
      const decision = router.selectBroker('ETH', preferences);
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('coinbase');
    });

    it('should fallback to default when preferred broker not available', () => {
      // Register only Alpaca
      const limitedRouter = new OrderRouter();
      limitedRouter.registerBroker('alpaca', alpacaAdapter);
      
      const preferences: RoutingPreferences = {
        preferredStockBroker: 'interactive_brokers', // Not registered
        enableSmartRouting: true,
        allowFallback: true,
      };
      
      const decision = limitedRouter.selectBroker('AAPL', preferences);
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('alpaca'); // Falls back to available broker
    });

    it('should use available broker when preferred not available with fallback enabled', () => {
      const limitedRouter = new OrderRouter();
      limitedRouter.registerBroker('alpaca', alpacaAdapter);
      
      const preferences: RoutingPreferences = {
        preferredStockBroker: 'interactive_brokers',
        enableSmartRouting: true,
        prioritizeLowFees: false,
        prioritizeFastExecution: false,
        allowFallback: true,
      };
      
      const decision = limitedRouter.selectBroker('AAPL', preferences);
      expect(decision).not.toBeNull();
      expect(decision!.selectedBroker).toBe('alpaca');
    });
  });

  describe('Order Routing', () => {
    beforeEach(() => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.registerBroker('binance', binanceAdapter);
    });

    it('should route stock orders to Alpaca', async () => {
      const result = await router.routeOrder({
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        orderType: 'market',
      });
      
      expect(result.routingDecision.selectedBroker).toBe('alpaca');
      expect(alpacaAdapter.placeOrder).toHaveBeenCalled();
    });

    it('should route crypto orders to Binance', async () => {
      const result = await router.routeOrder({
        symbol: 'BTC',
        side: 'buy',
        quantity: 0.1,
        orderType: 'market',
      });
      
      expect(result.routingDecision.selectedBroker).toBe('binance');
      expect(binanceAdapter.placeOrder).toHaveBeenCalled();
    });

    it('should throw error when no broker available', async () => {
      const emptyRouter = new OrderRouter();
      
      await expect(emptyRouter.routeOrder({
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        orderType: 'market',
      })).rejects.toThrow();
    });
  });

  describe('Supported Asset Classes', () => {
    it('should return empty array when no brokers connected', () => {
      expect(router.getSupportedAssetClasses()).toHaveLength(0);
    });

    it('should return correct asset classes for connected brokers', () => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.registerBroker('interactive_brokers', ibkrAdapter);
      
      const supported = router.getSupportedAssetClasses();
      expect(supported).toContain('us_equity');
      expect(supported).toContain('crypto'); // Alpaca supports crypto
      expect(supported).toContain('options'); // IBKR supports options
      expect(supported).toContain('forex'); // IBKR supports forex
    });
  });

  describe('Confidence Scoring', () => {
    beforeEach(() => {
      router.registerBroker('alpaca', alpacaAdapter);
      router.registerBroker('binance', binanceAdapter);
    });

    it('should have high confidence for primary broker selection', () => {
      const decision = router.selectBroker('AAPL');
      expect(decision).not.toBeNull();
      expect(decision!.confidence).toBeGreaterThanOrEqual(85);
    });

    it('should have confidence score in valid range', () => {
      // Only register Alpaca, which supports crypto but isn't primary
      const limitedRouter = new OrderRouter();
      limitedRouter.registerBroker('alpaca', alpacaAdapter);
      
      const decision = limitedRouter.selectBroker('BTC');
      expect(decision).not.toBeNull();
      expect(decision!.confidence).toBeGreaterThan(0);
      expect(decision!.confidence).toBeLessThanOrEqual(100);
    });
  });
});
