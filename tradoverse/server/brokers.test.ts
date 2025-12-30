/**
 * Tests for Broker Integration Services
 * 
 * Tests the broker abstraction layer, Alpaca adapter, and IBKR adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  BrokerType, 
  OrderType, 
  OrderSide, 
  TimeInForce,
  AssetClass,
  BrokerErrorCode
} from './services/brokers/types';
import { AlpacaAdapter } from './services/brokers/AlpacaAdapter';
import { IBKRAdapter } from './services/brokers/IBKRAdapter';
import { BrokerFactory, BrokerManager } from './services/brokers/BrokerFactory';

describe('Broker Integration', () => {
  describe('BrokerFactory', () => {
    const factory = new BrokerFactory({
      alpaca: {
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'https://example.com/callback'
      },
      ibkr: {
        consumerKey: 'test-key',
        privateKey: 'test-private',
        realm: 'test-realm',
        redirectUri: 'https://example.com/callback'
      }
    });
    
    it('should create Alpaca adapter', () => {
      const adapter = factory.createAdapter(BrokerType.ALPACA);
      expect(adapter).toBeInstanceOf(AlpacaAdapter);
      expect(adapter.getBrokerType()).toBe(BrokerType.ALPACA);
    });
    
    it('should create IBKR adapter', () => {
      const adapter = factory.createAdapter(BrokerType.INTERACTIVE_BROKERS);
      expect(adapter).toBeInstanceOf(IBKRAdapter);
      expect(adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
    });
    
    it('should throw for unknown broker type', () => {
      expect(() => {
        factory.createAdapter('unknown' as BrokerType);
      }).toThrow();
    });
    
    it('should return available brokers', () => {
      const brokers = factory.getAvailableBrokers();
      expect(brokers.length).toBeGreaterThan(0);
      expect(brokers.some(b => b.type === BrokerType.ALPACA)).toBe(true);
      expect(brokers.some(b => b.type === BrokerType.INTERACTIVE_BROKERS)).toBe(true);
    });
    
    it('should check if broker is configured', () => {
      expect(factory.isBrokerConfigured(BrokerType.ALPACA)).toBe(true);
      expect(factory.isBrokerConfigured(BrokerType.INTERACTIVE_BROKERS)).toBe(true);
      expect(factory.isBrokerConfigured(BrokerType.BINANCE)).toBe(false);
    });
  });
  
  describe('BrokerManager', () => {
    it('should create manager instance', () => {
      const manager = new BrokerManager();
      expect(manager).toBeDefined();
    });
    
    it('should get adapter after connection', async () => {
      const manager = new BrokerManager();
      // Note: actual connection would require real credentials
      const adapter = manager.getAdapter('non-existent');
      expect(adapter).toBeUndefined();
    });
    
    it('should disconnect and remove adapter', async () => {
      const manager = new BrokerManager();
      // Disconnect non-existent should not throw
      await expect(manager.disconnect('non-existent')).resolves.not.toThrow();
    });
    
    it('should list active connections as empty initially', () => {
      const manager = new BrokerManager();
      const connections = manager.getActiveConnections();
      expect(connections).toEqual([]);
    });
  });
  
  describe('AlpacaAdapter', () => {
    let adapter: AlpacaAdapter;
    
    beforeEach(() => {
      adapter = new AlpacaAdapter();
    });
    
    it('should return correct broker type', () => {
      expect(adapter.getBrokerType()).toBe(BrokerType.ALPACA);
    });
    
    it('should have correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.US_EQUITY);
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.CRYPTO);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.MARKET);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.LIMIT);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP_LIMIT);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.DAY);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.GTC);
      expect(capabilities.supportsExtendedHours).toBe(true);
      expect(capabilities.supportsFractionalShares).toBe(true);
      expect(capabilities.supportsPaperTrading).toBe(true);
      expect(capabilities.supportsCryptoTrading).toBe(true);
    });
    
    it('should generate authorization URL', () => {
      const adapterWithConfig = new AlpacaAdapter({
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        redirectUri: 'https://example.com/callback',
        isPaper: true
      });
      
      const authUrl = adapterWithConfig.getAuthorizationUrl('test-state', true);
      
      expect(authUrl).toContain('https://app.alpaca.markets/oauth/authorize');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('response_type=code');
    });
    
    it('should be initialized as not connected', () => {
      expect(adapter.isConnected()).toBe(false);
    });
    
    it('should normalize symbols to uppercase', () => {
      expect(adapter.normalizeSymbol('aapl')).toBe('AAPL');
      expect(adapter.normalizeSymbol('MSFT')).toBe('MSFT');
    });
    
    it('should convert to broker symbol format', () => {
      expect(adapter.toBrokerSymbol('aapl')).toBe('AAPL');
    });
  });
  
  describe('IBKRAdapter', () => {
    let adapter: IBKRAdapter;
    
    beforeEach(() => {
      adapter = new IBKRAdapter();
    });
    
    it('should return correct broker type', () => {
      expect(adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
    });
    
    it('should have correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.US_EQUITY);
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.OPTIONS);
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.FUTURES);
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.FOREX);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.MARKET);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.LIMIT);
      expect(capabilities.supportsOptionsTrading).toBe(true);
      expect(capabilities.supportsForexTrading).toBe(true);
      expect(capabilities.supportsPaperTrading).toBe(true);
    });
    
    it('should be initialized as not connected', () => {
      expect(adapter.isConnected()).toBe(false);
    });
    
    it('should normalize symbols to uppercase', () => {
      expect(adapter.normalizeSymbol('aapl')).toBe('AAPL');
    });
  });
  
  describe('Order Types', () => {
    it('should support market orders on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportedOrderTypes).toContain(OrderType.MARKET);
    });
    
    it('should support limit orders on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportedOrderTypes).toContain(OrderType.LIMIT);
    });
    
    it('should support stop orders on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportedOrderTypes).toContain(OrderType.STOP);
    });
    
    it('should support stop-limit orders on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportedOrderTypes).toContain(OrderType.STOP_LIMIT);
    });
    
    it('should support trailing stop orders on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportedOrderTypes).toContain(OrderType.TRAILING_STOP);
    });
  });
  
  describe('Asset Class Support', () => {
    it('should support US equities on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.US_EQUITY);
    });
    
    it('should support crypto on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.CRYPTO);
    });
    
    it('should support options on IBKR', () => {
      const adapter = new IBKRAdapter();
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.OPTIONS);
      expect(capabilities.supportsOptionsTrading).toBe(true);
    });
    
    it('should support futures on IBKR', () => {
      const adapter = new IBKRAdapter();
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.FUTURES);
    });
    
    it('should support forex on IBKR', () => {
      const adapter = new IBKRAdapter();
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.FOREX);
      expect(capabilities.supportsForexTrading).toBe(true);
    });
  });
  
  describe('Time In Force Support', () => {
    it('should support DAY orders on both brokers', () => {
      const alpaca = new AlpacaAdapter();
      const ibkr = new IBKRAdapter();
      
      expect(alpaca.getCapabilities().supportedTimeInForce).toContain(TimeInForce.DAY);
      expect(ibkr.getCapabilities().supportedTimeInForce).toContain(TimeInForce.DAY);
    });
    
    it('should support GTC orders on both brokers', () => {
      const alpaca = new AlpacaAdapter();
      const ibkr = new IBKRAdapter();
      
      expect(alpaca.getCapabilities().supportedTimeInForce).toContain(TimeInForce.GTC);
      expect(ibkr.getCapabilities().supportedTimeInForce).toContain(TimeInForce.GTC);
    });
    
    it('should support IOC orders on both brokers', () => {
      const alpaca = new AlpacaAdapter();
      const ibkr = new IBKRAdapter();
      
      expect(alpaca.getCapabilities().supportedTimeInForce).toContain(TimeInForce.IOC);
      expect(ibkr.getCapabilities().supportedTimeInForce).toContain(TimeInForce.IOC);
    });
  });
  
  describe('Extended Hours Trading', () => {
    it('should support extended hours on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportsExtendedHours).toBe(true);
    });
    
    it('should support extended hours on IBKR', () => {
      const adapter = new IBKRAdapter();
      expect(adapter.getCapabilities().supportsExtendedHours).toBe(true);
    });
  });
  
  describe('Fractional Shares', () => {
    it('should support fractional shares on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportsFractionalShares).toBe(true);
    });
    
    it('should not support fractional shares on IBKR', () => {
      const adapter = new IBKRAdapter();
      expect(adapter.getCapabilities().supportsFractionalShares).toBe(false);
    });
  });
  
  describe('Paper Trading', () => {
    it('should support paper trading on Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().supportsPaperTrading).toBe(true);
    });
    
    it('should support paper trading on IBKR', () => {
      const adapter = new IBKRAdapter();
      expect(adapter.getCapabilities().supportsPaperTrading).toBe(true);
    });
  });
  
  describe('Rate Limits', () => {
    it('should have rate limit for Alpaca', () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.getCapabilities().maxOrdersPerMinute).toBe(200);
    });
    
    it('should have rate limit for IBKR', () => {
      const adapter = new IBKRAdapter();
      expect(adapter.getCapabilities().maxOrdersPerMinute).toBe(50);
    });
  });
});
