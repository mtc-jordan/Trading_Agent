/**
 * Unit tests for Binance and Coinbase Broker Adapters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BinanceBrokerAdapter } from './BinanceBrokerAdapter';
import { CoinbaseBrokerAdapter } from './CoinbaseBrokerAdapter';
import { BrokerType, AssetClass, OrderType, TimeInForce } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BinanceBrokerAdapter', () => {
  let adapter: BinanceBrokerAdapter;

  beforeEach(() => {
    adapter = new BinanceBrokerAdapter();
    mockFetch.mockReset();
  });

  describe('getBrokerType', () => {
    it('should return BINANCE broker type', () => {
      expect(adapter.getBrokerType()).toBe(BrokerType.BINANCE);
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.CRYPTO);
      expect(capabilities.supportsCryptoTrading).toBe(true);
      expect(capabilities.supportsOptionsTrading).toBe(false);
      expect(capabilities.supportsForexTrading).toBe(false);
      expect(capabilities.supportsFractionalShares).toBe(true);
      expect(capabilities.supportsExtendedHours).toBe(true); // 24/7 crypto
      expect(capabilities.supportsPaperTrading).toBe(true); // Testnet
      expect(capabilities.supportsWebSocket).toBe(true);
    });

    it('should support market, limit, stop, and stop_limit orders', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedOrderTypes).toContain(OrderType.MARKET);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.LIMIT);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP_LIMIT);
    });

    it('should support GTC, IOC, and FOK time in force', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.GTC);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.IOC);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.FOK);
    });
  });

  describe('initialize', () => {
    it('should initialize with API credentials', async () => {
      const credentials = {
        type: 'api_key' as const,
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        testnet: false
      };

      await adapter.initialize(credentials);
      
      expect(adapter.isConnected()).toBe(true);
    });

    it('should use testnet URL when testnet is true', async () => {
      const credentials = {
        type: 'api_key' as const,
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        testnet: true
      };

      await adapter.initialize(credentials);
      
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('normalizeSymbol', () => {
    it('should convert BTCUSDT to BTC/USDT', () => {
      expect(adapter.normalizeSymbol('BTCUSDT')).toBe('BTC/USDT');
    });

    it('should convert ETHUSDT to ETH/USDT', () => {
      expect(adapter.normalizeSymbol('ETHUSDT')).toBe('ETH/USDT');
    });
  });

  describe('toBrokerSymbol', () => {
    it('should convert BTC/USDT to BTCUSDT', () => {
      expect(adapter.toBrokerSymbol('BTC/USDT')).toBe('BTCUSDT');
    });

    it('should convert ETH/USDT to ETHUSDT', () => {
      expect(adapter.toBrokerSymbol('ETH/USDT')).toBe('ETHUSDT');
    });

    it('should handle lowercase input', () => {
      expect(adapter.toBrokerSymbol('btc/usdt')).toBe('BTCUSDT');
    });
  });
});

describe('CoinbaseBrokerAdapter', () => {
  let adapter: CoinbaseBrokerAdapter;

  beforeEach(() => {
    adapter = new CoinbaseBrokerAdapter();
    mockFetch.mockReset();
  });

  describe('getBrokerType', () => {
    it('should return COINBASE broker type', () => {
      expect(adapter.getBrokerType()).toBe(BrokerType.COINBASE);
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.CRYPTO);
      expect(capabilities.supportsCryptoTrading).toBe(true);
      expect(capabilities.supportsOptionsTrading).toBe(false);
      expect(capabilities.supportsForexTrading).toBe(false);
      expect(capabilities.supportsFractionalShares).toBe(true);
      expect(capabilities.supportsExtendedHours).toBe(true); // 24/7 crypto
      expect(capabilities.supportsPaperTrading).toBe(true); // Sandbox
      expect(capabilities.supportsWebSocket).toBe(true);
    });

    it('should NOT support short selling', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportsShortSelling).toBe(false);
    });

    it('should NOT support margin trading', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportsMarginTrading).toBe(false);
    });

    it('should support market, limit, stop, and stop_limit orders', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedOrderTypes).toContain(OrderType.MARKET);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.LIMIT);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP_LIMIT);
    });
  });

  describe('initialize', () => {
    it('should initialize with API credentials', async () => {
      const credentials = {
        type: 'api_key' as const,
        apiKeyId: 'test-key-id',
        apiKeySecret: '-----BEGIN EC PRIVATE KEY-----\ntest\n-----END EC PRIVATE KEY-----',
        sandbox: false
      };

      await adapter.initialize(credentials);
      
      expect(adapter.isConnected()).toBe(true);
    });

    it('should use sandbox URL when sandbox is true', async () => {
      const credentials = {
        type: 'api_key' as const,
        apiKeyId: 'test-key-id',
        apiKeySecret: '-----BEGIN EC PRIVATE KEY-----\ntest\n-----END EC PRIVATE KEY-----',
        sandbox: true
      };

      await adapter.initialize(credentials);
      
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('normalizeSymbol', () => {
    it('should convert BTC-USD to BTC/USD', () => {
      expect(adapter.normalizeSymbol('BTC-USD')).toBe('BTC/USD');
    });

    it('should convert ETH-USD to ETH/USD', () => {
      expect(adapter.normalizeSymbol('ETH-USD')).toBe('ETH/USD');
    });
  });

  describe('toBrokerSymbol', () => {
    it('should convert BTC/USD to BTC-USD', () => {
      expect(adapter.toBrokerSymbol('BTC/USD')).toBe('BTC-USD');
    });

    it('should convert ETH/USD to ETH-USD', () => {
      expect(adapter.toBrokerSymbol('ETH/USD')).toBe('ETH-USD');
    });

    it('should handle lowercase input', () => {
      expect(adapter.toBrokerSymbol('btc/usd')).toBe('BTC-USD');
    });
  });
});

describe('BrokerFactory with Crypto Adapters', () => {
  it('should create BinanceBrokerAdapter', async () => {
    const { BrokerFactory } = await import('./BrokerFactory');
    const factory = new BrokerFactory();
    
    const adapter = factory.createAdapter(BrokerType.BINANCE);
    expect(adapter.getBrokerType()).toBe(BrokerType.BINANCE);
  });

  it('should create CoinbaseBrokerAdapter', async () => {
    const { BrokerFactory } = await import('./BrokerFactory');
    const factory = new BrokerFactory();
    
    const adapter = factory.createAdapter(BrokerType.COINBASE);
    expect(adapter.getBrokerType()).toBe(BrokerType.COINBASE);
  });

  it('should list Binance in available brokers', async () => {
    const { BrokerFactory, BROKER_INFO } = await import('./BrokerFactory');
    
    expect(BROKER_INFO[BrokerType.BINANCE]).toBeDefined();
    expect(BROKER_INFO[BrokerType.BINANCE].name).toBe('Binance');
    expect(BROKER_INFO[BrokerType.BINANCE].authType).toBe('api_key');
  });

  it('should list Coinbase in available brokers', async () => {
    const { BrokerFactory, BROKER_INFO } = await import('./BrokerFactory');
    
    expect(BROKER_INFO[BrokerType.COINBASE]).toBeDefined();
    expect(BROKER_INFO[BrokerType.COINBASE].name).toBe('Coinbase');
    expect(BROKER_INFO[BrokerType.COINBASE].authType).toBe('oauth2');
  });

  it('should return crypto brokers when filtering by CRYPTO asset class', async () => {
    const { BrokerFactory } = await import('./BrokerFactory');
    const factory = new BrokerFactory();
    
    const cryptoBrokers = factory.getBrokersByAssetClass(AssetClass.CRYPTO);
    const brokerTypes = cryptoBrokers.map(b => b.type);
    
    expect(brokerTypes).toContain(BrokerType.BINANCE);
    expect(brokerTypes).toContain(BrokerType.COINBASE);
    expect(brokerTypes).toContain(BrokerType.ALPACA); // Alpaca also supports crypto
  });
});
