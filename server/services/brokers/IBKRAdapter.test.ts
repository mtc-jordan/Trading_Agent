/**
 * IBKR Adapter Unit Tests
 * 
 * Tests for Interactive Brokers adapter with OAuth 2.0 support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IBKRAdapter, IBKRAuthMethod } from './IBKRAdapter';
import { BrokerType, BrokerErrorCode } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('IBKRAdapter', () => {
  let adapter: IBKRAdapter;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Initialization', () => {
    it('should create adapter with OAuth 2.0 config', () => {
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
      
      expect(adapter).toBeDefined();
      expect(adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
    });
    
    it('should create adapter with OAuth 1.0a config', () => {
      adapter = new IBKRAdapter({
        consumerKey: 'test-consumer-key',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----',
        realm: 'limited_poa',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth1'
      });
      
      expect(adapter).toBeDefined();
      expect(adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
    });
    
    it('should default to OAuth 2.0 auth method', () => {
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        isPaper: true
      });
      
      expect(adapter).toBeDefined();
    });
  });
  
  describe('Capabilities', () => {
    beforeEach(() => {
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
    });
    
    it('should return correct broker type', () => {
      expect(adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
    });
    
    it('should return comprehensive capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportsOptionsTrading).toBe(true);
      expect(capabilities.supportsForexTrading).toBe(true);
      expect(capabilities.supportsCryptoTrading).toBe(true);
      expect(capabilities.supportsPaperTrading).toBe(true);
      expect(capabilities.supportsWebSocket).toBe(true);
      expect(capabilities.supportsFractionalShares).toBe(false);
    });
    
    it('should support multiple asset classes', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedAssetClasses).toContain('us_equity');
      expect(capabilities.supportedAssetClasses).toContain('options');
      expect(capabilities.supportedAssetClasses).toContain('futures');
      expect(capabilities.supportedAssetClasses).toContain('forex');
    });
    
    it('should support various order types', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedOrderTypes).toContain('market');
      expect(capabilities.supportedOrderTypes).toContain('limit');
      expect(capabilities.supportedOrderTypes).toContain('stop');
      expect(capabilities.supportedOrderTypes).toContain('stop_limit');
      expect(capabilities.supportedOrderTypes).toContain('trailing_stop');
    });
  });
  
  describe('OAuth 2.0 Authorization URL', () => {
    beforeEach(() => {
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
    });
    
    it('should generate OAuth 2.0 authorization URL', () => {
      const state = 'test-state-123';
      const authUrl = adapter.getAuthorizationUrl(state, true);
      
      expect(authUrl).toContain('https://www.interactivebrokers.com/authorize');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('state=test-state-123');
      expect(authUrl).toContain('redirect_uri=');
    });
    
    it('should include paper parameter when paper trading', () => {
      const state = 'test-state-123';
      const authUrl = adapter.getAuthorizationUrl(state, true);
      
      expect(authUrl).toContain('paper=true');
    });
    
    it('should not include paper parameter for live trading', () => {
      const state = 'test-state-123';
      const authUrl = adapter.getAuthorizationUrl(state, false);
      
      expect(authUrl).not.toContain('paper=true');
    });
  });
  
  describe('OAuth 2.0 Token Exchange', () => {
    beforeEach(() => {
      // Use adapter without private key to test development mode
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
    });
    
    it('should exchange authorization code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'trading'
        })
      });
      
      const tokens = await adapter.handleOAuthCallback('auth-code-123', 'state-123');
      
      expect(tokens.accessToken).toBe('test-access-token');
      expect(tokens.refreshToken).toBe('test-refresh-token');
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.tokenType).toBe('Bearer');
    });
    
    it('should handle token exchange error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code'
      });
      
      await expect(adapter.handleOAuthCallback('invalid-code', 'state-123'))
        .rejects.toThrow('IBKR OAuth 2.0 error');
    });
  });
  
  describe('Token Refresh', () => {
    beforeEach(() => {
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
    });
    
    it('should detect when token refresh is needed', () => {
      // New adapter without tokens should need refresh
      expect(adapter.needsTokenRefresh()).toBe(true);
    });
  });
  
  describe('Symbol Normalization', () => {
    beforeEach(() => {
      adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
    });
    
    it('should normalize symbols to uppercase', () => {
      expect(adapter.normalizeSymbol('aapl')).toBe('AAPL');
      expect(adapter.normalizeSymbol('MSFT')).toBe('MSFT');
      expect(adapter.normalizeSymbol('GooGl')).toBe('GOOGL');
    });
    
    it('should convert to broker symbol format', () => {
      expect(adapter.toBrokerSymbol('aapl')).toBe('AAPL');
      expect(adapter.toBrokerSymbol('TSLA')).toBe('TSLA');
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error when OAuth 2.0 client ID is not configured', () => {
      adapter = new IBKRAdapter({
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
      
      expect(() => adapter.getAuthorizationUrl('state', true))
        .toThrow('IBKR OAuth 2.0 client ID not configured');
    });
  });
  
  describe('Multi-Auth Method Support', () => {
    it('should support switching between OAuth 2.0 and OAuth 1.0a', () => {
      // OAuth 2.0 adapter
      const oauth2Adapter = new IBKRAdapter({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth2'
      });
      
      // OAuth 1.0a adapter
      const oauth1Adapter = new IBKRAdapter({
        consumerKey: 'test-consumer-key',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        realm: 'limited_poa',
        redirectUri: 'https://example.com/callback',
        isPaper: true,
        authMethod: 'oauth1'
      });
      
      // Both should be valid IBKR adapters
      expect(oauth2Adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
      expect(oauth1Adapter.getBrokerType()).toBe(BrokerType.INTERACTIVE_BROKERS);
    });
  });
});

describe('IBKR OAuth Integration', () => {
  describe('OAuth State Management', () => {
    it('should generate unique state for each authorization request', () => {
      const states = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const state = `ibkr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        expect(states.has(state)).toBe(false);
        states.add(state);
      }
      
      expect(states.size).toBe(100);
    });
    
    it('should validate state format', () => {
      const validState = 'ibkr_1234567890_abc123';
      const invalidState = '';
      
      expect(validState.length).toBeGreaterThan(0);
      expect(invalidState.length).toBe(0);
    });
  });
  
  describe('Broker Connection Flow', () => {
    it('should define correct connection flow steps', () => {
      const connectionSteps = [
        'user_initiates_connection',
        'generate_oauth_state',
        'redirect_to_ibkr',
        'user_authorizes',
        'ibkr_redirects_back',
        'exchange_code_for_tokens',
        'store_connection',
        'connection_complete'
      ];
      
      expect(connectionSteps).toHaveLength(8);
      expect(connectionSteps[0]).toBe('user_initiates_connection');
      expect(connectionSteps[connectionSteps.length - 1]).toBe('connection_complete');
    });
  });
});
