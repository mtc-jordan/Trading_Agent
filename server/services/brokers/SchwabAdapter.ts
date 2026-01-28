/**
 * Charles Schwab Broker Adapter
 * 
 * Implements the IBrokerAdapter interface for Charles Schwab's Trader API.
 * This replaces the legacy TD Ameritrade API after the Schwab acquisition.
 * 
 * API Documentation: https://developer.schwab.com/
 * 
 * Features:
 * - OAuth 2.0 authentication with PKCE
 * - Stock, ETF, and Options trading
 * - Real-time and historical market data
 * - Account management
 */

import { BaseBrokerAdapter } from './IBrokerAdapter';
import {
  BrokerType,
  BrokerCredentials,
  OAuthCredentials,
  BrokerAccount,
  AccountBalance,
  Position,
  UnifiedOrder,
  OrderResponse,
  OrderStatus,
  Quote,
  Bar,
  HistoricalDataParams,
  Asset,
  TokenResponse,
  BrokerCapabilities,
  AssetClass,
  OrderType,
  TimeInForce,
  OrderSide,
  BrokerError,
  BrokerErrorCode
} from './types';

// ============================================================================
// Schwab API Types
// ============================================================================

interface SchwabConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  isPaper?: boolean;
}

interface SchwabAccount {
  accountNumber: string;
  hashValue: string;
  type: string;
  currentBalances: {
    availableFunds: number;
    buyingPower: number;
    cashBalance: number;
    cashAvailableForTrading: number;
    liquidationValue: number;
    longMarketValue: number;
    shortMarketValue: number;
    maintenanceRequirement: number;
  };
  securitiesAccount?: {
    type: string;
    accountNumber: string;
    roundTrips: number;
    isDayTrader: boolean;
    isClosingOnlyRestricted: boolean;
  };
}

interface SchwabPosition {
  shortQuantity: number;
  averagePrice: number;
  currentDayProfitLoss: number;
  currentDayProfitLossPercentage: number;
  longQuantity: number;
  settledLongQuantity: number;
  settledShortQuantity: number;
  instrument: {
    assetType: string;
    cusip: string;
    symbol: string;
    description: string;
    type?: string;
  };
  marketValue: number;
  maintenanceRequirement: number;
  currentDayCost: number;
  previousSessionLongQuantity: number;
}

interface SchwabOrder {
  orderId: number;
  accountNumber: string;
  status: string;
  enteredTime: string;
  closeTime?: string;
  tag?: string;
  orderLegCollection: Array<{
    orderLegType: string;
    legId: number;
    instrument: {
      assetType: string;
      cusip: string;
      symbol: string;
    };
    instruction: string;
    positionEffect: string;
    quantity: number;
  }>;
  orderType: string;
  complexOrderStrategyType: string;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  requestedDestination: string;
  destinationLinkName: string;
  price?: number;
  stopPrice?: number;
  duration: string;
  orderStrategyType: string;
}

interface SchwabQuote {
  assetMainType: string;
  assetSubType: string;
  quoteType: string;
  realtime: boolean;
  ssid: number;
  symbol: string;
  quote: {
    '52WeekHigh': number;
    '52WeekLow': number;
    askMICId: string;
    askPrice: number;
    askSize: number;
    askTime: number;
    bidMICId: string;
    bidPrice: number;
    bidSize: number;
    bidTime: number;
    closePrice: number;
    highPrice: number;
    lastMICId: string;
    lastPrice: number;
    lastSize: number;
    lowPrice: number;
    mark: number;
    markChange: number;
    markPercentChange: number;
    netChange: number;
    netPercentChange: number;
    openPrice: number;
    postMarketChange: number;
    postMarketPercentChange: number;
    quoteTime: number;
    securityStatus: string;
    totalVolume: number;
    tradeTime: number;
  };
  reference: {
    cusip: string;
    description: string;
    exchange: string;
    exchangeName: string;
  };
}

// ============================================================================
// Schwab Adapter Implementation
// ============================================================================

export class SchwabAdapter extends BaseBrokerAdapter {
  private config: SchwabConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private accountHash: string | null = null;
  
  // API endpoints
  private readonly AUTH_URL = 'https://api.schwabapi.com/v1/oauth/authorize';
  private readonly TOKEN_URL = 'https://api.schwabapi.com/v1/oauth/token';
  private readonly API_BASE = 'https://api.schwabapi.com';
  
  constructor(config: SchwabConfig) {
    super();
    this.config = config;
  }
  
  // ============================================================================
  // Broker Info
  // ============================================================================
  
  getBrokerType(): BrokerType {
    return BrokerType.SCHWAB;
  }
  
  getCapabilities(): BrokerCapabilities {
    return {
      supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.OPTIONS],
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
        TimeInForce.FOK
      ],
      supportsExtendedHours: true,
      supportsFractionalShares: true,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: true,
      supportsCryptoTrading: false,
      supportsForexTrading: false,
      supportsPaperTrading: false,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 120,
      maxPositions: 10000
    };
  }
  
  // ============================================================================
  // OAuth Authentication
  // ============================================================================
  
  getAuthorizationUrl(state: string, _isPaper?: boolean): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'api',
      state: state
    });
    
    return `${this.AUTH_URL}?${params.toString()}`;
  }
  
  async handleOAuthCallback(code: string, _state: string): Promise<TokenResponse> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');
    
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.config.redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `Failed to exchange code for tokens: ${error}`,
        BrokerType.SCHWAB
      );
    }
    
    const data = await response.json();
    
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope
    };
  }
  
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'No refresh token available',
        BrokerType.SCHWAB
      );
    }
    
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');
    
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      })
    });
    
    if (!response.ok) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Failed to refresh access token',
        BrokerType.SCHWAB
      );
    }
    
    const data = await response.json();
    
    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    };
  }
  
  needsTokenRefresh(): boolean {
    return Date.now() > (this.tokenExpiresAt - 5 * 60 * 1000);
  }
  
  // ============================================================================
  // Connection Management
  // ============================================================================
  
  async initialize(credentials: BrokerCredentials): Promise<void> {
    const oauth = credentials as OAuthCredentials;
    this.accessToken = oauth.accessToken;
    this.refreshToken = oauth.refreshToken || null;
    this.tokenExpiresAt = oauth.expiresAt || 0;
    this.connected = true;
    
    // Get account hash for API calls
    const accounts = await this.getAccounts();
    if (accounts.length > 0) {
      this.accountHash = accounts[0].id;
    }
  }
  
  // ============================================================================
  // API Helper
  // ============================================================================
  
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.needsTokenRefresh() && this.refreshToken) {
      await this.refreshAccessToken();
    }
    
    const url = `${this.API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 401) {
        throw new BrokerError(
          BrokerErrorCode.AUTHENTICATION_FAILED,
          'Authentication failed',
          BrokerType.SCHWAB
        );
      }
      
      if (response.status === 429) {
        throw new BrokerError(
          BrokerErrorCode.RATE_LIMITED,
          'Rate limit exceeded',
          BrokerType.SCHWAB
        );
      }
      
      throw new BrokerError(
        BrokerErrorCode.UNKNOWN_ERROR,
        `API request failed: ${errorText}`,
        BrokerType.SCHWAB
      );
    }
    
    return response.json();
  }
  
  // ============================================================================
  // Account Operations
  // ============================================================================
  
  async getAccounts(): Promise<BrokerAccount[]> {
    const data = await this.apiRequest<SchwabAccount[]>(
      '/trader/v1/accounts'
    );
    
    return data.map(account => ({
      id: account.hashValue,
      accountNumber: account.accountNumber,
      accountType: account.type,
      currency: 'USD',
      status: 'active',
      isPaper: false,
      createdAt: new Date()
    }));
  }
  
  async getAccountBalance(accountId?: string): Promise<AccountBalance> {
    const hash = accountId || this.accountHash;
    const data = await this.apiRequest<SchwabAccount>(
      `/trader/v1/accounts/${hash}`
    );
    
    const balances = data.currentBalances;
    const securities = data.securitiesAccount;
    
    return {
      currency: 'USD',
      cash: balances.cashBalance,
      cashAvailable: balances.cashAvailableForTrading,
      cashWithdrawable: balances.availableFunds,
      buyingPower: balances.buyingPower,
      portfolioValue: balances.liquidationValue,
      equity: balances.liquidationValue,
      lastEquity: balances.liquidationValue,
      longMarketValue: balances.longMarketValue,
      shortMarketValue: balances.shortMarketValue,
      initialMargin: 0,
      maintenanceMargin: balances.maintenanceRequirement,
      dayTradeCount: securities?.roundTrips || 0,
      patternDayTrader: securities?.isDayTrader || false
    };
  }
  
  async getPositions(accountId?: string): Promise<Position[]> {
    const hash = accountId || this.accountHash;
    const data = await this.apiRequest<{ securitiesAccount: { positions: SchwabPosition[] } }>(
      `/trader/v1/accounts/${hash}?fields=positions`
    );
    
    const positions = data.securitiesAccount?.positions || [];
    
    return positions.map(pos => ({
      symbol: pos.instrument.symbol,
      quantity: pos.longQuantity - pos.shortQuantity,
      side: pos.longQuantity > pos.shortQuantity ? 'long' as const : 'short' as const,
      avgEntryPrice: pos.averagePrice,
      currentPrice: pos.marketValue / (pos.longQuantity || pos.shortQuantity || 1),
      marketValue: pos.marketValue,
      unrealizedPL: pos.currentDayProfitLoss,
      unrealizedPLPercent: pos.currentDayProfitLossPercentage,
      costBasis: pos.averagePrice * (pos.longQuantity || pos.shortQuantity),
      assetClass: this.mapAssetClass(pos.instrument.assetType)
    }));
  }
  
  // ============================================================================
  // Order Operations
  // ============================================================================
  
  async placeOrder(order: UnifiedOrder, accountId?: string): Promise<OrderResponse> {
    const hash = accountId || this.accountHash;
    
    const schwabOrder = {
      orderType: this.mapOrderType(order.type),
      session: 'NORMAL',
      duration: this.mapTimeInForce(order.timeInForce || TimeInForce.DAY),
      orderStrategyType: 'SINGLE',
      orderLegCollection: [{
        instruction: order.side === OrderSide.BUY ? 'BUY' : 'SELL',
        quantity: order.quantity,
        instrument: {
          symbol: order.symbol,
          assetType: 'EQUITY'
        }
      }],
      ...(order.price && { price: order.price }),
      ...(order.stopPrice && { stopPrice: order.stopPrice })
    };
    
    const response = await fetch(
      `${this.API_BASE}/trader/v1/accounts/${hash}/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schwabOrder)
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.ORDER_REJECTED,
        `Order rejected: ${error}`,
        BrokerType.SCHWAB
      );
    }
    
    // Get order ID from Location header
    const location = response.headers.get('Location');
    const orderId = location?.split('/').pop() || '';
    
    return {
      id: orderId,
      clientOrderId: order.clientOrderId || orderId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stopPrice,
      timeInForce: order.timeInForce || TimeInForce.DAY,
      status: OrderStatus.NEW,
      filledQuantity: 0,
      avgFillPrice: 0,
      extendedHours: false,
      assetClass: AssetClass.US_EQUITY,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async cancelOrder(orderId: string, accountId?: string): Promise<void> {
    const hash = accountId || this.accountHash;
    
    const response = await fetch(
      `${this.API_BASE}/trader/v1/accounts/${hash}/orders/${orderId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );
    
    if (!response.ok) {
      throw new BrokerError(
        BrokerErrorCode.UNKNOWN_ERROR,
        'Failed to cancel order',
        BrokerType.SCHWAB
      );
    }
  }
  
  async getOrders(
    params?: {
      status?: 'open' | 'closed' | 'all';
      limit?: number;
      after?: Date;
      until?: Date;
    },
    accountId?: string
  ): Promise<OrderResponse[]> {
    const hash = accountId || this.accountHash;
    
    const queryParams = new URLSearchParams();
    if (params?.after) {
      queryParams.set('fromEnteredTime', params.after.toISOString());
    }
    if (params?.until) {
      queryParams.set('toEnteredTime', params.until.toISOString());
    }
    if (params?.status) {
      queryParams.set('status', this.mapOrderStatusFilter(params.status));
    }
    
    const data = await this.apiRequest<SchwabOrder[]>(
      `/trader/v1/accounts/${hash}/orders?${queryParams.toString()}`
    );
    
    return data.map(order => this.mapOrder(order));
  }
  
  async getOrder(orderId: string, accountId?: string): Promise<OrderResponse> {
    const hash = accountId || this.accountHash;
    
    const data = await this.apiRequest<SchwabOrder>(
      `/trader/v1/accounts/${hash}/orders/${orderId}`
    );
    
    return this.mapOrder(data);
  }
  
  // ============================================================================
  // Market Data
  // ============================================================================
  
  async getQuote(symbol: string): Promise<Quote> {
    const data = await this.apiRequest<Record<string, SchwabQuote>>(
      `/marketdata/v1/quotes?symbols=${encodeURIComponent(symbol)}`
    );
    
    const quote = data[symbol];
    if (!quote) {
      throw new BrokerError(
        BrokerErrorCode.INVALID_SYMBOL,
        `Quote not found for ${symbol}`,
        BrokerType.SCHWAB
      );
    }
    
    return {
      symbol: quote.symbol,
      bidPrice: quote.quote.bidPrice,
      askPrice: quote.quote.askPrice,
      bidSize: quote.quote.bidSize,
      askSize: quote.quote.askSize,
      lastPrice: quote.quote.lastPrice,
      lastSize: quote.quote.lastSize,
      volume: quote.quote.totalVolume,
      timestamp: new Date(quote.quote.quoteTime)
    };
  }
  
  async getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]> {
    const periodType = this.mapPeriodType(params.timeframe);
    const frequencyType = this.mapFrequencyType(params.timeframe);
    
    const queryParams = new URLSearchParams({
      symbol: params.symbol,
      periodType: periodType,
      frequencyType: frequencyType,
      ...(params.start && { startDate: params.start.getTime().toString() }),
      ...(params.end && { endDate: params.end.getTime().toString() })
    });
    
    const data = await this.apiRequest<{
      candles: Array<{
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        datetime: number;
      }>;
    }>(`/marketdata/v1/pricehistory?${queryParams.toString()}`);
    
    return data.candles.map(candle => ({
      symbol: params.symbol,
      timestamp: new Date(candle.datetime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      vwap: (candle.high + candle.low + candle.close) / 3
    }));
  }
  
  // ============================================================================
  // Asset Information
  // ============================================================================
  
  async getAsset(symbol: string): Promise<Asset> {
    const data = await this.apiRequest<Record<string, SchwabQuote>>(
      `/marketdata/v1/quotes?symbols=${encodeURIComponent(symbol)}`
    );
    
    const quote = data[symbol];
    if (!quote) {
      throw new BrokerError(
        BrokerErrorCode.INVALID_SYMBOL,
        `Asset not found: ${symbol}`,
        BrokerType.SCHWAB
      );
    }
    
    return {
      id: quote.reference.cusip || quote.symbol,
      symbol: quote.symbol,
      name: quote.reference.description,
      exchange: quote.reference.exchange,
      assetClass: this.mapAssetClass(quote.assetMainType),
      status: 'active' as const,
      tradable: quote.quote.securityStatus === 'Normal',
      marginable: true,
      shortable: true,
      easyToBorrow: true,
      fractionable: true
    };
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      [OrderType.MARKET]: 'MARKET',
      [OrderType.LIMIT]: 'LIMIT',
      [OrderType.STOP]: 'STOP',
      [OrderType.STOP_LIMIT]: 'STOP_LIMIT',
      [OrderType.TRAILING_STOP]: 'TRAILING_STOP'
    };
    return mapping[type] || 'MARKET';
  }
  
  private mapTimeInForce(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      [TimeInForce.DAY]: 'DAY',
      [TimeInForce.GTC]: 'GOOD_TILL_CANCEL',
      [TimeInForce.IOC]: 'IMMEDIATE_OR_CANCEL',
      [TimeInForce.FOK]: 'FILL_OR_KILL',
      [TimeInForce.OPG]: 'DAY',
      [TimeInForce.CLS]: 'DAY'
    };
    return mapping[tif] || 'DAY';
  }
  
  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'AWAITING_PARENT_ORDER': OrderStatus.PENDING,
      'AWAITING_CONDITION': OrderStatus.PENDING,
      'AWAITING_STOP_CONDITION': OrderStatus.PENDING,
      'AWAITING_MANUAL_REVIEW': OrderStatus.PENDING,
      'ACCEPTED': OrderStatus.ACCEPTED,
      'PENDING_ACTIVATION': OrderStatus.PENDING,
      'QUEUED': OrderStatus.NEW,
      'WORKING': OrderStatus.ACCEPTED,
      'REJECTED': OrderStatus.REJECTED,
      'PENDING_CANCEL': OrderStatus.PENDING,
      'CANCELED': OrderStatus.CANCELLED,
      'PENDING_REPLACE': OrderStatus.PENDING,
      'REPLACED': OrderStatus.REPLACED,
      'FILLED': OrderStatus.FILLED,
      'EXPIRED': OrderStatus.EXPIRED
    };
    return mapping[status] || OrderStatus.NEW;
  }
  
  private mapOrderStatusFilter(status: 'open' | 'closed' | 'all'): string {
    if (status === 'open') return 'WORKING';
    if (status === 'closed') return 'FILLED';
    return '';
  }
  
  private mapAssetClass(assetType: string): AssetClass {
    const mapping: Record<string, AssetClass> = {
      'EQUITY': AssetClass.US_EQUITY,
      'OPTION': AssetClass.OPTIONS,
      'FUTURE': AssetClass.FUTURES,
      'FOREX': AssetClass.FOREX
    };
    return mapping[assetType] || AssetClass.US_EQUITY;
  }
  
  private mapPeriodType(timeframe: string): string {
    if (timeframe.includes('Min') || timeframe.includes('Hour')) return 'day';
    if (timeframe.includes('Day')) return 'month';
    if (timeframe.includes('Week')) return 'year';
    return 'day';
  }
  
  private mapFrequencyType(timeframe: string): string {
    if (timeframe.includes('Min')) return 'minute';
    if (timeframe.includes('Hour')) return 'minute';
    if (timeframe.includes('Day')) return 'daily';
    if (timeframe.includes('Week')) return 'weekly';
    return 'daily';
  }
  
  private mapOrder(order: SchwabOrder): OrderResponse {
    const leg = order.orderLegCollection[0];
    
    return {
      id: order.orderId.toString(),
      clientOrderId: order.tag || order.orderId.toString(),
      symbol: leg.instrument.symbol,
      side: leg.instruction === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
      type: this.reverseMapOrderType(order.orderType),
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stopPrice,
      timeInForce: this.reverseMapTimeInForce(order.duration),
      status: this.mapOrderStatus(order.status),
      filledQuantity: order.filledQuantity,
      avgFillPrice: 0,
      extendedHours: false,
      assetClass: AssetClass.US_EQUITY,
      createdAt: new Date(order.enteredTime),
      updatedAt: order.closeTime ? new Date(order.closeTime) : new Date(order.enteredTime)
    };
  }
  
  private reverseMapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'MARKET': OrderType.MARKET,
      'LIMIT': OrderType.LIMIT,
      'STOP': OrderType.STOP,
      'STOP_LIMIT': OrderType.STOP_LIMIT,
      'TRAILING_STOP': OrderType.TRAILING_STOP
    };
    return mapping[type] || OrderType.MARKET;
  }
  
  private reverseMapTimeInForce(duration: string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
      'DAY': TimeInForce.DAY,
      'GOOD_TILL_CANCEL': TimeInForce.GTC,
      'IMMEDIATE_OR_CANCEL': TimeInForce.IOC,
      'FILL_OR_KILL': TimeInForce.FOK
    };
    return mapping[duration] || TimeInForce.DAY;
  }
  
  // ============================================================================
  // Symbol Mapping
  // ============================================================================
  
  normalizeSymbol(brokerSymbol: string): string {
    // Schwab uses standard symbols
    return brokerSymbol.toUpperCase();
  }
  
  toBrokerSymbol(normalizedSymbol: string): string {
    return normalizedSymbol.toUpperCase();
  }
}
