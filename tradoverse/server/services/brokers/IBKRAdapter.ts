/**
 * Interactive Brokers Broker Adapter
 * 
 * Implements the IBrokerAdapter interface for Interactive Brokers.
 * Supports BOTH authentication methods:
 * - OAuth 2.0 with JWT client assertion (recommended, simpler)
 * - OAuth 1.0A Extended with RSA-SHA256 signatures (legacy)
 * 
 * Documentation: https://www.interactivebrokers.com/campus/ibkr-api-page/
 * 
 * IMPORTANT: Requires approval from IBKR to use their API.
 * Apply at: https://www.interactivebrokers.com/en/trading/ib-api.php
 */

import { BaseBrokerAdapter } from './IBrokerAdapter';
import {
  BrokerType,
  OAuth1Credentials,
  BrokerAccount,
  AccountBalance,
  Position,
  UnifiedOrder,
  OrderResponse,
  Quote,
  Bar,
  HistoricalDataParams,
  Asset,
  TokenResponse,
  BrokerCapabilities,
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  AssetClass,
  BrokerError,
  BrokerErrorCode
} from './types';
import * as crypto from 'crypto';

// IBKR API endpoints
const IBKR_OAUTH_BASE = 'https://api.ibkr.com/v1/api';
const IBKR_PORTAL_BASE = 'https://api.ibkr.com/v1/portal';

// Authentication method type
export type IBKRAuthMethod = 'oauth2' | 'oauth1';

interface IBKRConfig {
  // OAuth 2.0 settings (recommended)
  clientId?: string;
  clientSecret?: string;
  
  // OAuth 1.0a settings (legacy)
  consumerKey?: string;
  privateKey?: string;  // RSA private key in PEM format
  realm?: string;
  
  // Common settings
  redirectUri: string;
  isPaper: boolean;
  authMethod?: IBKRAuthMethod;  // Default: 'oauth2'
}

interface OAuth1Params {
  oauth_consumer_key: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_nonce: string;
  oauth_version: string;
  oauth_signature?: string;
  oauth_token?: string;
  oauth_verifier?: string;
  oauth_callback?: string;
}

// OAuth 2.0 endpoints
const IBKR_OAUTH2_AUTHORIZE = 'https://www.interactivebrokers.com/authorize';
const IBKR_OAUTH2_TOKEN = 'https://api.ibkr.com/v1/api/oauth2/api/v1/token';

export class IBKRAdapter extends BaseBrokerAdapter {
  private config: IBKRConfig | null = null;
  private authMethod: IBKRAuthMethod = 'oauth2';
  
  // OAuth 2.0 tokens
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  
  // OAuth 1.0a tokens (legacy)
  private liveSessionToken: string | null = null;
  private liveSessionTokenExpiry: number = 0;
  
  private accountId: string | null = null;
  
  constructor(config?: IBKRConfig) {
    super();
    if (config) {
      this.config = config;
      this.authMethod = config.authMethod || 'oauth2';
    }
  }
  
  getBrokerType(): BrokerType {
    return BrokerType.INTERACTIVE_BROKERS;
  }
  
  getCapabilities(): BrokerCapabilities {
    return {
      supportedAssetClasses: [
        AssetClass.US_EQUITY,
        AssetClass.OPTIONS,
        AssetClass.FUTURES,
        AssetClass.FOREX,
        AssetClass.CRYPTO
      ],
      supportedOrderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP,
        OrderType.STOP_LIMIT,
        OrderType.TRAILING_STOP
      ],
      supportedTimeInForce: [
        TimeInForce.DAY,
        TimeInForce.GTC,
        TimeInForce.IOC,
        TimeInForce.FOK,
        TimeInForce.OPG
      ],
      supportsExtendedHours: true,
      supportsFractionalShares: false,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: true,
      supportsCryptoTrading: true,
      supportsForexTrading: true,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 50
    };
  }
  
  // ============================================================================
  // OAuth 2.0 Authentication (Recommended)
  // ============================================================================
  
  /**
   * Get OAuth 2.0 authorization URL
   * Users will be redirected here to authorize the application
   */
  getOAuth2AuthorizationUrl(state: string, isPaper: boolean = true): string {
    if (!this.config?.clientId) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'IBKR OAuth 2.0 client ID not configured',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'trading',
      state: state,
    });
    
    if (isPaper) {
      params.append('paper', 'true');
    }
    
    return `${IBKR_OAUTH2_AUTHORIZE}?${params.toString()}`;
  }
  
  /**
   * Exchange OAuth 2.0 authorization code for tokens
   */
  async handleOAuth2Callback(code: string, _state: string): Promise<TokenResponse> {
    if (!this.config?.clientId) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'IBKR OAuth 2.0 not configured',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    // Create JWT client assertion for OAuth 2.0
    const clientAssertion = await this.createJWTClientAssertion();
    
    const response = await fetch(IBKR_OAUTH2_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
        redirect_uri: this.config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `IBKR OAuth 2.0 error: ${error}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }

    const data = await response.json();
    
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token || null;
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    this.connected = true;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }
  
  /**
   * Refresh OAuth 2.0 access token
   */
  async refreshOAuth2Token(): Promise<TokenResponse> {
    if (!this.refreshToken || !this.config?.clientId) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'No refresh token available',
        BrokerType.INTERACTIVE_BROKERS
      );
    }

    const clientAssertion = await this.createJWTClientAssertion();
    
    const response = await fetch(IBKR_OAUTH2_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `IBKR token refresh error: ${error}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }

    const data = await response.json();
    
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token || this.refreshToken;
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }
  
  /**
   * Create JWT client assertion for OAuth 2.0
   * IBKR requires private_key_jwt authentication method
   */
  private async createJWTClientAssertion(): Promise<string> {
    if (!this.config?.clientId) {
      throw new Error('Client ID not configured');
    }
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientId,
      sub: this.config.clientId,
      aud: IBKR_OAUTH2_TOKEN,
      exp: now + 300, // 5 minutes
      iat: now,
      jti: crypto.randomUUID(),
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const unsignedToken = `${base64Header}.${base64Payload}`;
    
    // Sign with private key if available
    if (this.config.privateKey) {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(unsignedToken);
      const signature = sign.sign(this.config.privateKey, 'base64url');
      return `${unsignedToken}.${signature}`;
    }
    
    // For development/testing without private key
    // In production, this will fail - users must provide private key
    return `${unsignedToken}.development_signature`;
  }
  
  // ============================================================================
  // OAuth 1.0A Authentication (Legacy)
  // ============================================================================
  
  /**
   * Generate OAuth 1.0A signature using RSA-SHA256
   */
  private generateSignature(
    method: string,
    url: string,
    params: OAuth1Params,
    tokenSecret: string = ''
  ): string {
    if (!this.config) throw new Error('Config not initialized');
    
    // Sort parameters alphabetically
    const sortedParams = Object.entries(params)
      .filter(([key]) => key !== 'oauth_signature')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Create signature base string
    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams)
    ].join('&');
    
    // Sign with RSA-SHA256
    if (!this.config?.privateKey) {
      throw new Error('Private key not configured for OAuth 1.0a');
    }
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureBase);
    const signature = sign.sign(this.config.privateKey, 'base64');
    
    return signature;
  }
  
  /**
   * Generate OAuth authorization header
   */
  private generateAuthHeader(params: OAuth1Params): string {
    const headerParams = Object.entries(params)
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ');
    
    return `OAuth realm="${this.config?.realm}", ${headerParams}`;
  }
  
  /**
   * Generate nonce for OAuth
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Step 1: Get Request Token
   */
  async getRequestToken(): Promise<{ token: string; tokenSecret: string }> {
    if (!this.config) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'IBKR config not initialized',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const url = `${IBKR_OAUTH_BASE}/oauth/request_token`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();
    
    const params: OAuth1Params = {
      oauth_consumer_key: this.config.consumerKey || '',
      oauth_signature_method: 'RSA-SHA256',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_callback: this.config.redirectUri
    };
    
    params.oauth_signature = this.generateSignature('POST', url, params);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.generateAuthHeader(params),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `Failed to get request token: ${error}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const body = await response.text();
    const data = new URLSearchParams(body);
    
    return {
      token: data.get('oauth_token') || '',
      tokenSecret: data.get('oauth_token_secret') || ''
    };
  }
  
  /**
   * Get authorization URL for user to approve
   * Supports both OAuth 2.0 and OAuth 1.0a based on configuration
   */
  getAuthorizationUrl(state: string, isPaper: boolean = true): string {
    if (this.authMethod === 'oauth2') {
      return this.getOAuth2AuthorizationUrl(state, isPaper);
    }
    // OAuth 1.0a: state is used to store the request token
    return `${IBKR_OAUTH_BASE}/oauth/authorize?oauth_token=${state}`;
  }
  
  /**
   * Handle OAuth callback - supports both OAuth 2.0 and OAuth 1.0a
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    verifier?: string
  ): Promise<TokenResponse> {
    // Use OAuth 2.0 if configured
    if (this.authMethod === 'oauth2') {
      return this.handleOAuth2Callback(code, state);
    }
    
    // Fall back to OAuth 1.0a
    return this.handleOAuth1Callback(code, state, verifier || '');
  }
  
  /**
   * OAuth 1.0a callback handler (legacy)
   */
  private async handleOAuth1Callback(
    _code: string,  // Not used in OAuth1
    requestToken: string,
    verifier: string
  ): Promise<TokenResponse> {
    if (!this.config) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'IBKR config not initialized',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const url = `${IBKR_OAUTH_BASE}/oauth/access_token`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();
    
    const params: OAuth1Params = {
      oauth_consumer_key: this.config.consumerKey || '',
      oauth_signature_method: 'RSA-SHA256',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_token: requestToken,
      oauth_verifier: verifier
    };
    
    params.oauth_signature = this.generateSignature('POST', url, params);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.generateAuthHeader(params),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `Failed to get access token: ${error}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const body = await response.text();
    const data = new URLSearchParams(body);
    
    return {
      accessToken: data.get('oauth_token') || '',
      refreshToken: data.get('oauth_token_secret') || ''
    };
  }
  
  /**
   * Step 4: Compute Live Session Token using Diffie-Hellman
   */
  async computeLiveSessionToken(): Promise<string> {
    if (!this.config || !this.credentials) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Not authenticated',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const oauth = this.credentials as OAuth1Credentials;
    
    // Generate DH key pair
    const dh = crypto.createDiffieHellman(256);
    const dhPublicKey = dh.generateKeys('hex');
    
    const url = `${IBKR_OAUTH_BASE}/oauth/live_session_token`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();
    
    const params: OAuth1Params = {
      oauth_consumer_key: this.config.consumerKey || '',
      oauth_signature_method: 'RSA-SHA256',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_token: oauth.accessToken
    };
    
    params.oauth_signature = this.generateSignature('POST', url, params, oauth.accessTokenSecret);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.generateAuthHeader(params),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `diffie_hellman_challenge=${encodeURIComponent(dhPublicKey)}`
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `Failed to compute LST: ${error}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const body = await response.text();
    const data = new URLSearchParams(body);
    
    const dhResponse = data.get('diffie_hellman_response') || '';
    const lstSignature = data.get('live_session_token_signature') || '';
    const lstExpiration = data.get('live_session_token_expiration') || '';
    
    // Compute shared secret
    const sharedSecret = dh.computeSecret(Buffer.from(dhResponse, 'hex'));
    
    // Derive LST from shared secret
    const lst = crypto.createHmac('sha256', sharedSecret)
      .update(oauth.accessToken)
      .digest('hex');
    
    // Verify signature
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(lst);
    // In production, verify against IBKR's public key
    
    this.liveSessionToken = lst;
    this.liveSessionTokenExpiry = parseInt(lstExpiration) * 1000;
    
    return lst;
  }
  
  async refreshAccessToken(): Promise<TokenResponse> {
    // Use OAuth 2.0 refresh if configured
    if (this.authMethod === 'oauth2' && this.refreshToken) {
      return this.refreshOAuth2Token();
    }
    
    // OAuth 1.0a: IBKR uses LST refresh instead of token refresh
    const lst = await this.computeLiveSessionToken();
    return {
      accessToken: lst,
      expiresIn: Math.floor((this.liveSessionTokenExpiry - Date.now()) / 1000)
    };
  }
  
  needsTokenRefresh(): boolean {
    if (this.authMethod === 'oauth2') {
      if (!this.accessToken) return true;
      // Refresh if less than 5 minutes until expiry
      return Date.now() > (this.tokenExpiry - 5 * 60 * 1000);
    }
    
    // OAuth 1.0a
    if (!this.liveSessionToken) return true;
    return Date.now() > (this.liveSessionTokenExpiry - 5 * 60 * 1000);
  }
  
  // ============================================================================
  // HTTP Helper with OAuth 1.0A
  // ============================================================================
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check authentication
    const isOAuth2 = this.authMethod === 'oauth2';
    
    if (isOAuth2 && !this.accessToken) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Not authenticated (OAuth 2.0)',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    if (!isOAuth2 && (!this.config || !this.credentials)) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Not authenticated (OAuth 1.0a)',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    // Refresh token if needed
    if (this.needsTokenRefresh()) {
      if (isOAuth2) {
        await this.refreshOAuth2Token();
      } else {
        await this.computeLiveSessionToken();
      }
    }
    
    const url = `${IBKR_PORTAL_BASE}${endpoint}`;
    const method = options.method || 'GET';
    
    let headers: Record<string, string>;
    
    if (isOAuth2) {
      // OAuth 2.0: Use Bearer token
      headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>)
      };
    } else {
      // OAuth 1.0a: Use signed request
      const oauth = this.credentials as OAuth1Credentials;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = this.generateNonce();
      
      const params: OAuth1Params = {
        oauth_consumer_key: this.config!.consumerKey!,
        oauth_signature_method: 'RSA-SHA256',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        oauth_token: oauth.accessToken
      };
      
      params.oauth_signature = this.generateSignature(method, url, params, oauth.accessTokenSecret);
      
      headers = {
        'Authorization': this.generateAuthHeader(params),
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>)
      };
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorCode = BrokerErrorCode.UNKNOWN_ERROR;
      
      if (response.status === 401) errorCode = BrokerErrorCode.AUTHENTICATION_FAILED;
      else if (response.status === 403) errorCode = BrokerErrorCode.INSUFFICIENT_FUNDS;
      else if (response.status === 404) errorCode = BrokerErrorCode.INVALID_SYMBOL;
      else if (response.status === 429) errorCode = BrokerErrorCode.RATE_LIMITED;
      
      throw new BrokerError(errorCode, errorText, BrokerType.INTERACTIVE_BROKERS);
    }
    
    if (response.status === 204) {
      return {} as T;
    }
    
    return response.json();
  }
  
  // ============================================================================
  // Account Operations
  // ============================================================================
  
  async getAccounts(): Promise<BrokerAccount[]> {
    const response = await this.request<any>('/portfolio/accounts');
    
    return response.map((acc: any) => ({
      id: acc.accountId,
      accountNumber: acc.accountId,
      accountType: acc.type || 'trading',
      currency: acc.currency,
      status: 'active',
      isPaper: this.config?.isPaper ?? false,
      createdAt: new Date()
    }));
  }
  
  async getAccountBalance(accountId?: string): Promise<AccountBalance> {
    const accId = accountId || this.accountId;
    if (!accId) {
      const accounts = await this.getAccounts();
      this.accountId = accounts[0]?.id;
    }
    
    const response = await this.request<any>(`/portfolio/${accId || this.accountId}/summary`);
    
    return {
      currency: response.currency || 'USD',
      cash: response.availablefunds?.amount || 0,
      cashAvailable: response.availablefunds?.amount || 0,
      cashWithdrawable: response.availablefunds?.amount || 0,
      buyingPower: response.buyingpower?.amount || 0,
      portfolioValue: response.netliquidation?.amount || 0,
      equity: response.netliquidation?.amount || 0,
      lastEquity: response.netliquidation?.amount || 0,
      longMarketValue: response.grosspositionvalue?.amount || 0,
      shortMarketValue: 0,
      initialMargin: response.initmarginreq?.amount || 0,
      maintenanceMargin: response.maintmarginreq?.amount || 0
    };
  }
  
  async getPositions(accountId?: string): Promise<Position[]> {
    const accId = accountId || this.accountId;
    if (!accId) {
      const accounts = await this.getAccounts();
      this.accountId = accounts[0]?.id;
    }
    
    const response = await this.request<any[]>(`/portfolio/${accId || this.accountId}/positions/0`);
    
    return response.map(p => ({
      symbol: p.ticker || p.contractDesc,
      quantity: Math.abs(p.position),
      side: p.position > 0 ? 'long' : 'short' as const,
      avgEntryPrice: p.avgCost,
      marketValue: p.mktValue,
      costBasis: p.avgCost * Math.abs(p.position),
      unrealizedPL: p.unrealizedPnl,
      unrealizedPLPercent: (p.unrealizedPnl / (p.avgCost * Math.abs(p.position))) * 100,
      currentPrice: p.mktPrice,
      assetClass: this.parseAssetClass(p.assetClass),
      exchange: p.listingExchange
    }));
  }
  
  // ============================================================================
  // Order Operations
  // ============================================================================
  
  async placeOrder(order: UnifiedOrder, accountId?: string): Promise<OrderResponse> {
    const accId = accountId || this.accountId;
    if (!accId) {
      const accounts = await this.getAccounts();
      this.accountId = accounts[0]?.id;
    }
    
    // First, get contract ID for the symbol
    const conid = await this.getContractId(order.symbol);
    
    const ibkrOrder: any = {
      acctId: accId || this.accountId,
      conid: conid,
      orderType: this.toIBKROrderType(order.type),
      side: order.side.toUpperCase(),
      quantity: order.quantity,
      tif: this.toIBKRTimeInForce(order.timeInForce),
      outsideRTH: order.extendedHours || false
    };
    
    if (order.price) ibkrOrder.price = order.price;
    if (order.stopPrice) ibkrOrder.auxPrice = order.stopPrice;
    if (order.clientOrderId) ibkrOrder.cOID = order.clientOrderId;
    
    const response = await this.request<any>(`/iserver/account/${accId || this.accountId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ orders: [ibkrOrder] })
    });
    
    // IBKR may require order confirmation
    if (response[0]?.id === 'confirm') {
      // Auto-confirm the order
      const confirmResponse = await this.request<any>(`/iserver/reply/${response[0].id}`, {
        method: 'POST',
        body: JSON.stringify({ confirmed: true })
      });
      return this.parseOrderResponse(confirmResponse[0]);
    }
    
    return this.parseOrderResponse(response[0]);
  }
  
  async cancelOrder(orderId: string, accountId?: string): Promise<void> {
    const accId = accountId || this.accountId;
    await this.request(`/iserver/account/${accId}/order/${orderId}`, {
      method: 'DELETE'
    });
  }
  
  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
  }, _accountId?: string): Promise<OrderResponse[]> {
    const filters = params?.status === 'open' ? 'Submitted,PreSubmitted' :
                   params?.status === 'closed' ? 'Filled,Cancelled' : '';
    
    const endpoint = filters ? `/iserver/account/orders?filters=${filters}` : '/iserver/account/orders';
    const response = await this.request<any>(endpoint);
    
    return (response.orders || []).map((o: any) => this.parseOrderResponse(o));
  }
  
  async getOrder(orderId: string, _accountId?: string): Promise<OrderResponse> {
    const response = await this.request<any>(`/iserver/account/order/status/${orderId}`);
    return this.parseOrderResponse(response);
  }
  
  // ============================================================================
  // Market Data
  // ============================================================================
  
  async getQuote(symbol: string): Promise<Quote> {
    const conid = await this.getContractId(symbol);
    const response = await this.request<any>(`/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,85,86,87,88`);
    
    const data = response[0] || {};
    return {
      symbol: symbol,
      bidPrice: data['84'] || 0,
      bidSize: data['88'] || 0,
      askPrice: data['86'] || 0,
      askSize: data['85'] || 0,
      lastPrice: data['31'] || 0,
      lastSize: data['87'] || 0,
      volume: data['87'] || 0,
      timestamp: new Date()
    };
  }
  
  async getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]> {
    const conid = await this.getContractId(params.symbol);
    const period = this.toIBKRPeriod(params.start, params.end);
    const bar = this.toIBKRBarSize(params.timeframe);
    
    const response = await this.request<any>(
      `/iserver/marketdata/history?conid=${conid}&period=${period}&bar=${bar}`
    );
    
    return (response.data || []).map((bar: any) => ({
      timestamp: new Date(bar.t * 1000),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v
    }));
  }
  
  // ============================================================================
  // Asset Information
  // ============================================================================
  
  async getAsset(symbol: string): Promise<Asset> {
    const response = await this.request<any[]>(`/iserver/secdef/search?symbol=${symbol}`);
    
    if (!response || response.length === 0) {
      throw new BrokerError(
        BrokerErrorCode.INVALID_SYMBOL,
        `Symbol not found: ${symbol}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    const asset = response[0];
    return {
      id: asset.conid.toString(),
      symbol: asset.symbol,
      name: asset.companyName || asset.description,
      exchange: asset.exchange,
      assetClass: this.parseAssetClass(asset.assetClass),
      status: 'active',
      tradable: true,
      marginable: true,
      shortable: true,
      easyToBorrow: true,
      fractionable: false
    };
  }
  
  async searchAssets(query: string, _assetClass?: string): Promise<Asset[]> {
    const response = await this.request<any[]>(`/iserver/secdef/search?symbol=${query}`);
    
    return (response || []).slice(0, 20).map(asset => ({
      id: asset.conid.toString(),
      symbol: asset.symbol,
      name: asset.companyName || asset.description,
      exchange: asset.exchange,
      assetClass: this.parseAssetClass(asset.assetClass),
      status: 'active' as const,
      tradable: true,
      marginable: true,
      shortable: true,
      easyToBorrow: true,
      fractionable: false
    }));
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private async getContractId(symbol: string): Promise<number> {
    const response = await this.request<any[]>(`/iserver/secdef/search?symbol=${symbol}`);
    
    if (!response || response.length === 0) {
      throw new BrokerError(
        BrokerErrorCode.INVALID_SYMBOL,
        `Symbol not found: ${symbol}`,
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    return response[0].conid;
  }
  
  private toIBKROrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      [OrderType.MARKET]: 'MKT',
      [OrderType.LIMIT]: 'LMT',
      [OrderType.STOP]: 'STP',
      [OrderType.STOP_LIMIT]: 'STP LMT',
      [OrderType.TRAILING_STOP]: 'TRAIL'
    };
    return mapping[type];
  }
  
  private toIBKRTimeInForce(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      [TimeInForce.DAY]: 'DAY',
      [TimeInForce.GTC]: 'GTC',
      [TimeInForce.IOC]: 'IOC',
      [TimeInForce.FOK]: 'FOK',
      [TimeInForce.OPG]: 'OPG',
      [TimeInForce.CLS]: 'DAY'
    };
    return mapping[tif];
  }
  
  private toIBKRPeriod(start: Date, end?: Date): string {
    const endDate = end || new Date();
    const diffDays = Math.ceil((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return '1d';
    if (diffDays <= 7) return '1w';
    if (diffDays <= 30) return '1m';
    if (diffDays <= 90) return '3m';
    if (diffDays <= 180) return '6m';
    if (diffDays <= 365) return '1y';
    return '5y';
  }
  
  private toIBKRBarSize(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1Min': '1min',
      '5Min': '5min',
      '15Min': '15min',
      '30Min': '30min',
      '1Hour': '1h',
      '4Hour': '4h',
      '1Day': '1d',
      '1Week': '1w',
      '1Month': '1m'
    };
    return mapping[timeframe] || '1d';
  }
  
  private parseAssetClass(assetClass: string): AssetClass {
    const mapping: Record<string, AssetClass> = {
      'STK': AssetClass.US_EQUITY,
      'OPT': AssetClass.OPTIONS,
      'FUT': AssetClass.FUTURES,
      'CASH': AssetClass.FOREX,
      'CRYPTO': AssetClass.CRYPTO
    };
    return mapping[assetClass] || AssetClass.US_EQUITY;
  }
  
  private parseOrderResponse(order: any): OrderResponse {
    return {
      id: order.orderId?.toString() || order.order_id?.toString(),
      clientOrderId: order.cOID,
      symbol: order.ticker || order.symbol,
      side: (order.side?.toLowerCase() || 'buy') as OrderSide,
      type: this.parseOrderType(order.orderType),
      quantity: order.totalSize || order.quantity || 0,
      filledQuantity: order.filledQuantity || 0,
      price: order.price,
      stopPrice: order.auxPrice,
      avgFillPrice: order.avgPrice,
      status: this.parseOrderStatus(order.status),
      timeInForce: this.parseTimeInForce(order.tif),
      extendedHours: order.outsideRTH || false,
      createdAt: new Date(order.lastExecutionTime_r || Date.now()),
      updatedAt: new Date(order.lastExecutionTime_r || Date.now()),
      assetClass: AssetClass.US_EQUITY
    };
  }
  
  private parseOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'MKT': OrderType.MARKET,
      'LMT': OrderType.LIMIT,
      'STP': OrderType.STOP,
      'STP LMT': OrderType.STOP_LIMIT,
      'TRAIL': OrderType.TRAILING_STOP
    };
    return mapping[type] || OrderType.MARKET;
  }
  
  private parseOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'Submitted': OrderStatus.ACCEPTED,
      'PreSubmitted': OrderStatus.PENDING,
      'Filled': OrderStatus.FILLED,
      'Cancelled': OrderStatus.CANCELLED,
      'Inactive': OrderStatus.REJECTED,
      'PendingSubmit': OrderStatus.PENDING,
      'PendingCancel': OrderStatus.PENDING
    };
    return mapping[status] || OrderStatus.NEW;
  }
  
  private parseTimeInForce(tif: string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
      'DAY': TimeInForce.DAY,
      'GTC': TimeInForce.GTC,
      'IOC': TimeInForce.IOC,
      'FOK': TimeInForce.FOK,
      'OPG': TimeInForce.OPG
    };
    return mapping[tif] || TimeInForce.DAY;
  }
  
  // ============================================================================
  // Symbol Mapping
  // ============================================================================
  
  normalizeSymbol(brokerSymbol: string): string {
    // IBKR uses standard symbols
    return brokerSymbol.toUpperCase();
  }
  
  toBrokerSymbol(normalizedSymbol: string): string {
    return normalizedSymbol.toUpperCase();
  }
}

// Export factory function
export function createIBKRAdapter(config: IBKRConfig): IBKRAdapter {
  return new IBKRAdapter(config);
}
