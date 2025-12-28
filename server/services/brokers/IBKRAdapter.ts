/**
 * Interactive Brokers Broker Adapter
 * 
 * Implements the IBrokerAdapter interface for Interactive Brokers.
 * Uses OAuth 1.0A Extended authentication with RSA-SHA256 signatures
 * and Diffie-Hellman key exchange for Live Session Tokens.
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

interface IBKRConfig {
  consumerKey: string;
  privateKey: string;  // RSA private key in PEM format
  realm: string;
  redirectUri: string;
  isPaper: boolean;
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

export class IBKRAdapter extends BaseBrokerAdapter {
  private config: IBKRConfig | null = null;
  private liveSessionToken: string | null = null;
  private liveSessionTokenExpiry: number = 0;
  private accountId: string | null = null;
  
  constructor(config?: IBKRConfig) {
    super();
    if (config) {
      this.config = config;
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
  // OAuth 1.0A Authentication
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
      oauth_consumer_key: this.config.consumerKey,
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
   */
  getAuthorizationUrl(state: string, _isPaper: boolean = true): string {
    // Note: state is used to store the request token
    return `${IBKR_OAUTH_BASE}/oauth/authorize?oauth_token=${state}`;
  }
  
  /**
   * Step 3: Exchange verifier for Access Token
   */
  async handleOAuthCallback(
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
      oauth_consumer_key: this.config.consumerKey,
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
      oauth_consumer_key: this.config.consumerKey,
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
    // IBKR uses LST refresh instead of token refresh
    const lst = await this.computeLiveSessionToken();
    return {
      accessToken: lst,
      expiresIn: Math.floor((this.liveSessionTokenExpiry - Date.now()) / 1000)
    };
  }
  
  needsTokenRefresh(): boolean {
    if (!this.liveSessionToken) return true;
    // Refresh if less than 5 minutes until expiry
    return Date.now() > (this.liveSessionTokenExpiry - 5 * 60 * 1000);
  }
  
  // ============================================================================
  // HTTP Helper with OAuth 1.0A
  // ============================================================================
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.config || !this.credentials) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Not authenticated',
        BrokerType.INTERACTIVE_BROKERS
      );
    }
    
    // Ensure we have a valid LST
    if (this.needsTokenRefresh()) {
      await this.computeLiveSessionToken();
    }
    
    const oauth = this.credentials as OAuth1Credentials;
    const url = `${IBKR_PORTAL_BASE}${endpoint}`;
    const method = options.method || 'GET';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();
    
    const params: OAuth1Params = {
      oauth_consumer_key: this.config.consumerKey,
      oauth_signature_method: 'RSA-SHA256',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_token: oauth.accessToken
    };
    
    params.oauth_signature = this.generateSignature(method, url, params, oauth.accessTokenSecret);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.generateAuthHeader(params),
        'Content-Type': 'application/json',
        ...options.headers
      }
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
