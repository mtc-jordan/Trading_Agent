/**
 * Schwab Broker Adapter Tests
 * Tests for the Charles Schwab broker integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchwabAdapter } from './services/brokers/SchwabAdapter';
import { BrokerType, AssetClass, OrderType, TimeInForce, OrderSide } from './services/brokers/types';

describe('SchwabAdapter', () => {
  let adapter: SchwabAdapter;
  
  beforeEach(() => {
    adapter = new SchwabAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://tradoverse.app/api/oauth/schwab/callback'
    });
  });
  
  describe('getBrokerType', () => {
    it('should return SCHWAB broker type', () => {
      expect(adapter.getBrokerType()).toBe(BrokerType.SCHWAB);
    });
  });
  
  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      // Asset classes
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.US_EQUITY);
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.OPTIONS);
      expect(capabilities.supportedAssetClasses).not.toContain(AssetClass.CRYPTO);
      
      // Order types
      expect(capabilities.supportedOrderTypes).toContain(OrderType.MARKET);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.LIMIT);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.STOP_LIMIT);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.TRAILING_STOP);
      
      // Time in force
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.DAY);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.GTC);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.IOC);
      expect(capabilities.supportedTimeInForce).toContain(TimeInForce.FOK);
      
      // Features
      expect(capabilities.supportsExtendedHours).toBe(true);
      expect(capabilities.supportsFractionalShares).toBe(true);
      expect(capabilities.supportsShortSelling).toBe(true);
      expect(capabilities.supportsMarginTrading).toBe(true);
      expect(capabilities.supportsOptionsTrading).toBe(true);
      expect(capabilities.supportsCryptoTrading).toBe(false);
      expect(capabilities.supportsForexTrading).toBe(false);
      expect(capabilities.supportsPaperTrading).toBe(false);
      expect(capabilities.supportsWebSocket).toBe(true);
      expect(capabilities.supportsStreamingQuotes).toBe(true);
      expect(capabilities.supportsStreamingBars).toBe(true);
      expect(capabilities.supportsStreamingTrades).toBe(true);
      
      // Rate limits
      expect(capabilities.maxOrdersPerMinute).toBe(120);
      expect(capabilities.maxPositions).toBe(10000);
    });
  });
  
  describe('getAuthorizationUrl', () => {
    it('should generate correct OAuth authorization URL', () => {
      const state = 'test-state-123';
      const url = adapter.getAuthorizationUrl(state);
      
      expect(url).toContain('https://api.schwabapi.com/v1/oauth/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('scope=api');
    });
  });
  
  describe('needsTokenRefresh', () => {
    it('should return true when token is about to expire', () => {
      // Token expires in 4 minutes (less than 5 minute buffer)
      (adapter as any).tokenExpiresAt = Date.now() + 4 * 60 * 1000;
      expect(adapter.needsTokenRefresh()).toBe(true);
    });
    
    it('should return false when token is still valid', () => {
      // Token expires in 10 minutes
      (adapter as any).tokenExpiresAt = Date.now() + 10 * 60 * 1000;
      expect(adapter.needsTokenRefresh()).toBe(false);
    });
    
    it('should return true when token has expired', () => {
      // Token expired 1 minute ago
      (adapter as any).tokenExpiresAt = Date.now() - 60 * 1000;
      expect(adapter.needsTokenRefresh()).toBe(true);
    });
  });
  
  describe('normalizeSymbol', () => {
    it('should convert symbol to uppercase', () => {
      expect(adapter.normalizeSymbol('aapl')).toBe('AAPL');
      expect(adapter.normalizeSymbol('MSFT')).toBe('MSFT');
      expect(adapter.normalizeSymbol('GooGl')).toBe('GOOGL');
    });
  });
  
  describe('toBrokerSymbol', () => {
    it('should convert symbol to uppercase', () => {
      expect(adapter.toBrokerSymbol('aapl')).toBe('AAPL');
      expect(adapter.toBrokerSymbol('MSFT')).toBe('MSFT');
    });
  });
});

describe('Schwab Broker Info', () => {
  it('should have correct broker info in BrokerFactory', async () => {
    const { BROKER_INFO } = await import('./services/brokers/BrokerFactory');
    
    const schwabInfo = BROKER_INFO[BrokerType.SCHWAB];
    
    expect(schwabInfo).toBeDefined();
    expect(schwabInfo.type).toBe(BrokerType.SCHWAB);
    expect(schwabInfo.name).toBe('Charles Schwab');
    expect(schwabInfo.description).toContain('TD Ameritrade');
    expect(schwabInfo.authType).toBe('oauth2');
    expect(schwabInfo.requiresApproval).toBe(true);
    expect(schwabInfo.supportedRegions).toContain('US');
  });
});

describe('Schwab in OrderRouter', () => {
  it('should include Schwab in US equity priorities', async () => {
    const { OrderRouter } = await import('./services/brokers/OrderRouter');
    
    // Access the static BROKER_PRIORITIES through reflection
    const priorities = (OrderRouter as any).BROKER_PRIORITIES;
    
    expect(priorities[AssetClass.US_EQUITY]).toContain(BrokerType.SCHWAB);
    expect(priorities[AssetClass.OPTIONS]).toContain(BrokerType.SCHWAB);
  });
  
  it('should have Schwab capabilities in OrderRouter', async () => {
    const { OrderRouter } = await import('./services/brokers/OrderRouter');
    
    // Access the static BROKER_CAPABILITIES through reflection
    const capabilities = (OrderRouter as any).BROKER_CAPABILITIES;
    
    expect(capabilities[BrokerType.SCHWAB]).toBeDefined();
    expect(capabilities[BrokerType.SCHWAB].supportedAssetClasses).toContain(AssetClass.US_EQUITY);
    expect(capabilities[BrokerType.SCHWAB].supportedAssetClasses).toContain(AssetClass.OPTIONS);
    expect(capabilities[BrokerType.SCHWAB].supportsOptionsTrading).toBe(true);
    expect(capabilities[BrokerType.SCHWAB].supportsCryptoTrading).toBe(false);
  });
});
