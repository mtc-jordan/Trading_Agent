/**
 * Alpaca Broker Adapter
 * 
 * Implements the IBrokerAdapter interface for Alpaca Markets.
 * Supports OAuth2 authentication and full trading API.
 * 
 * Documentation: https://docs.alpaca.markets/
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

// Alpaca API endpoints
const ALPACA_OAUTH_URL = 'https://app.alpaca.markets/oauth/authorize';
const ALPACA_TOKEN_URL = 'https://api.alpaca.markets/oauth/token';
const ALPACA_PAPER_API = 'https://paper-api.alpaca.markets';
const ALPACA_LIVE_API = 'https://api.alpaca.markets';
const ALPACA_DATA_API = 'https://data.alpaca.markets';

interface AlpacaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isPaper: boolean;
}

export class AlpacaAdapter extends BaseBrokerAdapter {
  private config: AlpacaConfig | null = null;
  private baseUrl: string = ALPACA_PAPER_API;
  private dataUrl: string = ALPACA_DATA_API;
  
  constructor(config?: AlpacaConfig) {
    super();
    if (config) {
      this.config = config;
      this.baseUrl = config.isPaper ? ALPACA_PAPER_API : ALPACA_LIVE_API;
    }
  }
  
  getBrokerType(): BrokerType {
    return BrokerType.ALPACA;
  }
  
  getCapabilities(): BrokerCapabilities {
    return {
      supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.CRYPTO],
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
        TimeInForce.OPG,
        TimeInForce.CLS
      ],
      supportsExtendedHours: true,
      supportsFractionalShares: true,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 200
    };
  }
  
  // ============================================================================
  // OAuth2 Authentication
  // ============================================================================
  
  getAuthorizationUrl(state: string, isPaper: boolean = true): string {
    if (!this.config) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Alpaca config not initialized',
        BrokerType.ALPACA
      );
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: state,
      scope: 'account:write trading data'
    });
    
    return `${ALPACA_OAUTH_URL}?${params.toString()}`;
  }
  
  async handleOAuthCallback(code: string, _state: string): Promise<TokenResponse> {
    if (!this.config) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Alpaca config not initialized',
        BrokerType.ALPACA
      );
    }
    
    const response = await fetch(ALPACA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `Failed to exchange code for token: ${error}`,
        BrokerType.ALPACA
      );
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope
    };
  }
  
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.config || !this.credentials) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Not authenticated',
        BrokerType.ALPACA
      );
    }
    
    const oauth = this.credentials as OAuthCredentials;
    if (!oauth.refreshToken) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'No refresh token available',
        BrokerType.ALPACA
      );
    }
    
    const response = await fetch(ALPACA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: oauth.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });
    
    if (!response.ok) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Failed to refresh token',
        BrokerType.ALPACA
      );
    }
    
    const data = await response.json();
    
    // Update stored credentials
    (this.credentials as OAuthCredentials).accessToken = data.access_token;
    if (data.refresh_token) {
      (this.credentials as OAuthCredentials).refreshToken = data.refresh_token;
    }
    (this.credentials as OAuthCredentials).expiresAt = Date.now() + (data.expires_in * 1000);
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    };
  }
  
  // ============================================================================
  // HTTP Helper
  // ============================================================================
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useDataApi: boolean = false
  ): Promise<T> {
    if (!this.credentials) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'Not authenticated',
        BrokerType.ALPACA
      );
    }
    
    // Auto-refresh token if needed
    if (this.needsTokenRefresh()) {
      await this.refreshAccessToken();
    }
    
    const oauth = this.credentials as OAuthCredentials;
    const baseUrl = useDataApi ? this.dataUrl : this.baseUrl;
    const url = `${baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${oauth.accessToken}`,
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
      else if (response.status === 422) errorCode = BrokerErrorCode.INVALID_ORDER;
      else if (response.status === 429) errorCode = BrokerErrorCode.RATE_LIMITED;
      
      throw new BrokerError(errorCode, errorText, BrokerType.ALPACA);
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
    const account = await this.request<any>('/v2/account');
    
    return [{
      id: account.id,
      accountNumber: account.account_number,
      accountType: account.account_type || 'trading',
      currency: account.currency,
      status: account.status,
      isPaper: this.config?.isPaper ?? true,
      createdAt: new Date(account.created_at)
    }];
  }
  
  async getAccountBalance(_accountId?: string): Promise<AccountBalance> {
    const account = await this.request<any>('/v2/account');
    
    return {
      currency: account.currency,
      cash: parseFloat(account.cash),
      cashAvailable: parseFloat(account.cash),
      cashWithdrawable: parseFloat(account.cash_withdrawable || '0'),
      buyingPower: parseFloat(account.buying_power),
      portfolioValue: parseFloat(account.portfolio_value),
      equity: parseFloat(account.equity),
      lastEquity: parseFloat(account.last_equity),
      longMarketValue: parseFloat(account.long_market_value),
      shortMarketValue: parseFloat(account.short_market_value),
      initialMargin: parseFloat(account.initial_margin || '0'),
      maintenanceMargin: parseFloat(account.maintenance_margin || '0'),
      dayTradeCount: account.daytrade_count,
      patternDayTrader: account.pattern_day_trader
    };
  }
  
  async getPositions(_accountId?: string): Promise<Position[]> {
    const positions = await this.request<any[]>('/v2/positions');
    
    return positions.map(p => ({
      symbol: p.symbol,
      quantity: parseFloat(p.qty),
      side: parseFloat(p.qty) > 0 ? 'long' : 'short' as const,
      avgEntryPrice: parseFloat(p.avg_entry_price),
      marketValue: parseFloat(p.market_value),
      costBasis: parseFloat(p.cost_basis),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPercent: parseFloat(p.unrealized_plpc) * 100,
      currentPrice: parseFloat(p.current_price),
      lastDayPrice: parseFloat(p.lastday_price || '0'),
      changeToday: parseFloat(p.change_today || '0') * 100,
      assetClass: p.asset_class === 'crypto' ? AssetClass.CRYPTO : AssetClass.US_EQUITY,
      exchange: p.exchange
    }));
  }
  
  // ============================================================================
  // Order Operations
  // ============================================================================
  
  async placeOrder(order: UnifiedOrder, _accountId?: string): Promise<OrderResponse> {
    const alpacaOrder: any = {
      symbol: this.toBrokerSymbol(order.symbol),
      qty: order.quantity.toString(),
      side: order.side,
      type: this.toAlpacaOrderType(order.type),
      time_in_force: this.toAlpacaTimeInForce(order.timeInForce),
      extended_hours: order.extendedHours || false
    };
    
    if (order.price) alpacaOrder.limit_price = order.price.toString();
    if (order.stopPrice) alpacaOrder.stop_price = order.stopPrice.toString();
    if (order.trailPercent) alpacaOrder.trail_percent = order.trailPercent.toString();
    if (order.trailPrice) alpacaOrder.trail_price = order.trailPrice.toString();
    if (order.clientOrderId) alpacaOrder.client_order_id = order.clientOrderId;
    
    // Handle bracket orders
    if (order.orderClass && order.orderClass !== 'simple') {
      alpacaOrder.order_class = order.orderClass;
      if (order.takeProfit) {
        alpacaOrder.take_profit = { limit_price: order.takeProfit.limitPrice.toString() };
      }
      if (order.stopLoss) {
        alpacaOrder.stop_loss = {
          stop_price: order.stopLoss.stopPrice.toString(),
          ...(order.stopLoss.limitPrice && { limit_price: order.stopLoss.limitPrice.toString() })
        };
      }
    }
    
    const response = await this.request<any>('/v2/orders', {
      method: 'POST',
      body: JSON.stringify(alpacaOrder)
    });
    
    return this.parseOrderResponse(response);
  }
  
  async cancelOrder(orderId: string, _accountId?: string): Promise<void> {
    await this.request(`/v2/orders/${orderId}`, { method: 'DELETE' });
  }
  
  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    after?: Date;
    until?: Date;
    direction?: 'asc' | 'desc';
    symbols?: string[];
  }, _accountId?: string): Promise<OrderResponse[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.after) queryParams.set('after', params.after.toISOString());
    if (params?.until) queryParams.set('until', params.until.toISOString());
    if (params?.direction) queryParams.set('direction', params.direction);
    if (params?.symbols) queryParams.set('symbols', params.symbols.join(','));
    
    const query = queryParams.toString();
    const endpoint = `/v2/orders${query ? `?${query}` : ''}`;
    
    const orders = await this.request<any[]>(endpoint);
    return orders.map(o => this.parseOrderResponse(o));
  }
  
  async getOrder(orderId: string, _accountId?: string): Promise<OrderResponse> {
    const order = await this.request<any>(`/v2/orders/${orderId}`);
    return this.parseOrderResponse(order);
  }
  
  // ============================================================================
  // Market Data
  // ============================================================================
  
  async getQuote(symbol: string): Promise<Quote> {
    const brokerSymbol = this.toBrokerSymbol(symbol);
    const response = await this.request<any>(
      `/v2/stocks/${brokerSymbol}/quotes/latest`,
      {},
      true
    );
    
    const quote = response.quote;
    return {
      symbol: symbol,
      bidPrice: quote.bp,
      bidSize: quote.bs,
      askPrice: quote.ap,
      askSize: quote.as,
      lastPrice: (quote.bp + quote.ap) / 2,
      lastSize: 0,
      volume: 0,
      timestamp: new Date(quote.t)
    };
  }
  
  async getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]> {
    const brokerSymbol = this.toBrokerSymbol(params.symbol);
    const timeframe = this.toAlpacaTimeframe(params.timeframe);
    
    const queryParams = new URLSearchParams({
      start: params.start.toISOString(),
      timeframe: timeframe
    });
    
    if (params.end) queryParams.set('end', params.end.toISOString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.adjustment) queryParams.set('adjustment', params.adjustment);
    
    const response = await this.request<any>(
      `/v2/stocks/${brokerSymbol}/bars?${queryParams.toString()}`,
      {},
      true
    );
    
    return (response.bars || []).map((bar: any) => ({
      timestamp: new Date(bar.t),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
      tradeCount: bar.n
    }));
  }
  
  // ============================================================================
  // Asset Information
  // ============================================================================
  
  async getAsset(symbol: string): Promise<Asset> {
    const brokerSymbol = this.toBrokerSymbol(symbol);
    const asset = await this.request<any>(`/v2/assets/${brokerSymbol}`);
    
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      assetClass: asset.class === 'crypto' ? AssetClass.CRYPTO : AssetClass.US_EQUITY,
      status: asset.status,
      tradable: asset.tradable,
      marginable: asset.marginable,
      shortable: asset.shortable,
      easyToBorrow: asset.easy_to_borrow,
      fractionable: asset.fractionable,
      minOrderSize: asset.min_order_size ? parseFloat(asset.min_order_size) : undefined,
      minPriceIncrement: asset.min_trade_increment ? parseFloat(asset.min_trade_increment) : undefined,
      priceScale: asset.price_increment ? Math.round(-Math.log10(parseFloat(asset.price_increment))) : undefined
    };
  }
  
  async searchAssets(query: string, assetClass?: string): Promise<Asset[]> {
    const params = new URLSearchParams({ status: 'active' });
    if (assetClass) params.set('asset_class', assetClass);
    
    const assets = await this.request<any[]>(`/v2/assets?${params.toString()}`);
    
    const filtered = assets.filter(a => 
      a.symbol.toLowerCase().includes(query.toLowerCase()) ||
      a.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20);
    
    return filtered.map(asset => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      assetClass: asset.class === 'crypto' ? AssetClass.CRYPTO : AssetClass.US_EQUITY,
      status: asset.status,
      tradable: asset.tradable,
      marginable: asset.marginable,
      shortable: asset.shortable,
      easyToBorrow: asset.easy_to_borrow,
      fractionable: asset.fractionable
    }));
  }
  
  // ============================================================================
  // Symbol Mapping
  // ============================================================================
  
  normalizeSymbol(brokerSymbol: string): string {
    // Alpaca uses standard symbols, but crypto has /USD suffix
    return brokerSymbol.replace('/USD', '').toUpperCase();
  }
  
  toBrokerSymbol(normalizedSymbol: string): string {
    // For crypto, add /USD suffix
    const cryptoSymbols = ['BTC', 'ETH', 'DOGE', 'SHIB', 'LTC', 'BCH', 'LINK', 'UNI', 'AVAX', 'AAVE'];
    if (cryptoSymbols.includes(normalizedSymbol.toUpperCase())) {
      return `${normalizedSymbol.toUpperCase()}/USD`;
    }
    return normalizedSymbol.toUpperCase();
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private toAlpacaOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      [OrderType.MARKET]: 'market',
      [OrderType.LIMIT]: 'limit',
      [OrderType.STOP]: 'stop',
      [OrderType.STOP_LIMIT]: 'stop_limit',
      [OrderType.TRAILING_STOP]: 'trailing_stop'
    };
    return mapping[type];
  }
  
  private toAlpacaTimeInForce(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      [TimeInForce.DAY]: 'day',
      [TimeInForce.GTC]: 'gtc',
      [TimeInForce.IOC]: 'ioc',
      [TimeInForce.FOK]: 'fok',
      [TimeInForce.OPG]: 'opg',
      [TimeInForce.CLS]: 'cls'
    };
    return mapping[tif];
  }
  
  private toAlpacaTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1Min': '1Min',
      '5Min': '5Min',
      '15Min': '15Min',
      '30Min': '30Min',
      '1Hour': '1Hour',
      '4Hour': '4Hour',
      '1Day': '1Day',
      '1Week': '1Week',
      '1Month': '1Month'
    };
    return mapping[timeframe] || '1Day';
  }
  
  private parseOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      clientOrderId: order.client_order_id,
      symbol: this.normalizeSymbol(order.symbol),
      side: order.side as OrderSide,
      type: this.parseOrderType(order.type),
      quantity: parseFloat(order.qty),
      filledQuantity: parseFloat(order.filled_qty || '0'),
      price: order.limit_price ? parseFloat(order.limit_price) : undefined,
      stopPrice: order.stop_price ? parseFloat(order.stop_price) : undefined,
      avgFillPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
      status: this.parseOrderStatus(order.status),
      timeInForce: this.parseTimeInForce(order.time_in_force),
      extendedHours: order.extended_hours,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      filledAt: order.filled_at ? new Date(order.filled_at) : undefined,
      cancelledAt: order.canceled_at ? new Date(order.canceled_at) : undefined,
      expiredAt: order.expired_at ? new Date(order.expired_at) : undefined,
      failedAt: order.failed_at ? new Date(order.failed_at) : undefined,
      assetClass: order.asset_class === 'crypto' ? AssetClass.CRYPTO : AssetClass.US_EQUITY,
      legs: order.legs?.map((leg: any) => this.parseOrderResponse(leg))
    };
  }
  
  private parseOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'market': OrderType.MARKET,
      'limit': OrderType.LIMIT,
      'stop': OrderType.STOP,
      'stop_limit': OrderType.STOP_LIMIT,
      'trailing_stop': OrderType.TRAILING_STOP
    };
    return mapping[type] || OrderType.MARKET;
  }
  
  private parseOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'new': OrderStatus.NEW,
      'pending_new': OrderStatus.PENDING,
      'accepted': OrderStatus.ACCEPTED,
      'partially_filled': OrderStatus.PARTIALLY_FILLED,
      'filled': OrderStatus.FILLED,
      'canceled': OrderStatus.CANCELLED,
      'rejected': OrderStatus.REJECTED,
      'expired': OrderStatus.EXPIRED,
      'replaced': OrderStatus.REPLACED,
      'pending_cancel': OrderStatus.PENDING,
      'pending_replace': OrderStatus.PENDING
    };
    return mapping[status] || OrderStatus.NEW;
  }
  
  private parseTimeInForce(tif: string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
      'day': TimeInForce.DAY,
      'gtc': TimeInForce.GTC,
      'ioc': TimeInForce.IOC,
      'fok': TimeInForce.FOK,
      'opg': TimeInForce.OPG,
      'cls': TimeInForce.CLS
    };
    return mapping[tif] || TimeInForce.DAY;
  }
}

// Export factory function
export function createAlpacaAdapter(config: AlpacaConfig): AlpacaAdapter {
  return new AlpacaAdapter(config);
}
