/**
 * Coinbase Advanced Trade Broker Adapter
 * 
 * Implements the IBrokerAdapter interface for Coinbase Advanced Trade API.
 * Uses JWT authentication with Ed25519 or ECDSA signatures.
 */

import crypto from 'crypto';
import {
  BrokerType,
  BrokerCredentials,
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
  AssetClass
} from './types';
import { BaseBrokerAdapter } from './IBrokerAdapter';

// Coinbase API configuration
const COINBASE_API_URL = 'https://api.coinbase.com';
const COINBASE_SANDBOX_URL = 'https://api-sandbox.coinbase.com';

interface CoinbaseCredentials {
  apiKeyId: string;      // Key name
  apiKeySecret: string;  // Private key (PEM format)
  sandbox?: boolean;
}

interface CoinbaseAccount {
  uuid: string;
  name: string;
  currency: string;
  available_balance: {
    value: string;
    currency: string;
  };
  default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  type: string;
  ready: boolean;
  hold: {
    value: string;
    currency: string;
  };
}

interface CoinbaseOrder {
  order_id: string;
  product_id: string;
  user_id: string;
  order_configuration: {
    market_market_ioc?: {
      quote_size?: string;
      base_size?: string;
    };
    limit_limit_gtc?: {
      base_size: string;
      limit_price: string;
      post_only: boolean;
    };
    limit_limit_gtd?: {
      base_size: string;
      limit_price: string;
      end_time: string;
      post_only: boolean;
    };
    stop_limit_stop_limit_gtc?: {
      base_size: string;
      limit_price: string;
      stop_price: string;
      stop_direction: string;
    };
    stop_limit_stop_limit_gtd?: {
      base_size: string;
      limit_price: string;
      stop_price: string;
      end_time: string;
      stop_direction: string;
    };
  };
  side: string;
  client_order_id: string;
  status: string;
  time_in_force: string;
  created_time: string;
  completion_percentage: string;
  filled_size: string;
  average_filled_price: string;
  fee: string;
  number_of_fills: string;
  filled_value: string;
  pending_cancel: boolean;
  size_in_quote: boolean;
  total_fees: string;
  size_inclusive_of_fees: boolean;
  total_value_after_fees: string;
  trigger_status: string;
  order_type: string;
  reject_reason: string;
  settled: boolean;
  product_type: string;
  reject_message: string;
  cancel_message: string;
}

interface CoinbaseProduct {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  volume_percentage_change_24h: string;
  base_increment: string;
  quote_increment: string;
  quote_min_size: string;
  quote_max_size: string;
  base_min_size: string;
  base_max_size: string;
  base_name: string;
  quote_name: string;
  watched: boolean;
  is_disabled: boolean;
  new: boolean;
  status: string;
  cancel_only: boolean;
  limit_only: boolean;
  post_only: boolean;
  trading_disabled: boolean;
  auction_mode: boolean;
  product_type: string;
  quote_currency_id: string;
  base_currency_id: string;
  mid_market_price: string;
  base_display_symbol: string;
  quote_display_symbol: string;
}

interface CoinbaseTicker {
  trades: Array<{
    trade_id: string;
    product_id: string;
    price: string;
    size: string;
    time: string;
    side: string;
    bid: string;
    ask: string;
  }>;
  best_bid: string;
  best_ask: string;
}

export class CoinbaseBrokerAdapter extends BaseBrokerAdapter {
  private apiKeyId: string = '';
  private apiKeySecret: string = '';
  private baseUrl: string = COINBASE_API_URL;

  getBrokerType(): BrokerType {
    return BrokerType.COINBASE;
  }

  getCapabilities(): BrokerCapabilities {
    return {
      supportedAssetClasses: [AssetClass.CRYPTO],
      supportedOrderTypes: [OrderType.MARKET, OrderType.LIMIT, OrderType.STOP, OrderType.STOP_LIMIT],
      supportedTimeInForce: [TimeInForce.GTC, TimeInForce.IOC, TimeInForce.FOK],
      supportsExtendedHours: true, // 24/7 crypto trading
      supportsFractionalShares: true,
      supportsShortSelling: false,
      supportsMarginTrading: false,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true, // Sandbox
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 100
    };
  }

  async initialize(credentials: BrokerCredentials): Promise<void> {
    const coinbaseCredentials = credentials as unknown as CoinbaseCredentials;
    this.apiKeyId = coinbaseCredentials.apiKeyId;
    this.apiKeySecret = coinbaseCredentials.apiKeySecret;
    this.baseUrl = coinbaseCredentials.sandbox ? COINBASE_SANDBOX_URL : COINBASE_API_URL;
    this.credentials = credentials;
    this.connected = true;
  }

  // ============================================================================
  // JWT Generation
  // ============================================================================

  private generateJWT(method: string, path: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const uri = `${method} ${new URL(path, this.baseUrl).host}${path}`;
    
    // JWT Header
    const header = {
      alg: 'ES256',
      typ: 'JWT',
      kid: this.apiKeyId,
      nonce: crypto.randomBytes(16).toString('hex')
    };

    // JWT Payload
    const payload = {
      sub: this.apiKeyId,
      iss: 'cdp',
      nbf: timestamp,
      exp: timestamp + 120, // 2 minutes expiry
      uri
    };

    // Encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const message = `${encodedHeader}.${encodedPayload}`;

    // Sign with ECDSA
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    const signature = sign.sign(this.apiKeySecret, 'base64url');

    return `${message}.${signature}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const jwt = this.generateJWT(method, endpoint);
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Coinbase API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // OAuth (Coinbase supports OAuth 2.0)
  // ============================================================================

  getAuthorizationUrl(state: string, _isPaper?: boolean): string {
    // Coinbase OAuth 2.0 authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.apiKeyId,
      redirect_uri: process.env.COINBASE_REDIRECT_URI || '',
      state,
      scope: 'wallet:accounts:read wallet:orders:create wallet:orders:read wallet:trades:read'
    });
    return `https://www.coinbase.com/oauth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, _state: string, _verifier?: string): Promise<TokenResponse> {
    // Exchange authorization code for tokens
    const response = await fetch('https://api.coinbase.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.apiKeyId,
        client_secret: this.apiKeySecret,
        redirect_uri: process.env.COINBASE_REDIRECT_URI || ''
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
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
    const oauth = this.credentials as any;
    if (!oauth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://api.coinbase.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: oauth.refreshToken,
        client_id: this.apiKeyId,
        client_secret: this.apiKeySecret
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    };
  }

  // ============================================================================
  // Account Operations
  // ============================================================================

  async getAccounts(): Promise<BrokerAccount[]> {
    const response = await this.makeRequest<{ accounts: CoinbaseAccount[] }>(
      '/api/v3/brokerage/accounts'
    );

    return response.accounts.map(account => ({
      id: account.uuid,
      accountNumber: account.uuid,
      accountType: account.type,
      currency: account.currency,
      status: account.active ? 'active' : 'inactive',
      isPaper: this.baseUrl === COINBASE_SANDBOX_URL,
      createdAt: new Date(account.created_at)
    }));
  }

  async getAccountBalance(_accountId?: string): Promise<AccountBalance> {
    const response = await this.makeRequest<{ accounts: CoinbaseAccount[] }>(
      '/api/v3/brokerage/accounts'
    );

    let totalEquity = 0;
    let availableCash = 0;

    for (const account of response.accounts) {
      const available = parseFloat(account.available_balance.value);
      const held = parseFloat(account.hold.value);
      
      if (account.currency === 'USD' || account.currency === 'USDC') {
        availableCash += available;
        totalEquity += available + held;
      }
    }

    return {
      currency: 'USD',
      cash: availableCash,
      cashAvailable: availableCash,
      cashWithdrawable: availableCash,
      buyingPower: availableCash,
      portfolioValue: totalEquity,
      equity: totalEquity,
      lastEquity: totalEquity,
      longMarketValue: totalEquity,
      shortMarketValue: 0,
      initialMargin: 0,
      maintenanceMargin: 0,
      dayTradeCount: 0,
      patternDayTrader: false
    };
  }

  async getPositions(_accountId?: string): Promise<Position[]> {
    const response = await this.makeRequest<{ accounts: CoinbaseAccount[] }>(
      '/api/v3/brokerage/accounts'
    );

    const positions: Position[] = [];

    for (const account of response.accounts) {
      const available = parseFloat(account.available_balance.value);
      const held = parseFloat(account.hold.value);
      const total = available + held;

      if (total > 0 && account.currency !== 'USD' && account.currency !== 'USDC') {
        // Get current price
        let currentPrice = 0;
        let marketValue = 0;

        try {
          const product = await this.makeRequest<{ products: CoinbaseProduct[] }>(
            `/api/v3/brokerage/products/${account.currency}-USD`
          );
          if (product.products && product.products[0]) {
            currentPrice = parseFloat(product.products[0].price);
            marketValue = total * currentPrice;
          }
        } catch {
          // If no USD pair exists, try USDC
          try {
            const product = await this.makeRequest<{ products: CoinbaseProduct[] }>(
              `/api/v3/brokerage/products/${account.currency}-USDC`
            );
            if (product.products && product.products[0]) {
              currentPrice = parseFloat(product.products[0].price);
              marketValue = total * currentPrice;
            }
          } catch {
            continue;
          }
        }

        positions.push({
          symbol: account.currency,
          quantity: total,
          side: 'long',
          avgEntryPrice: 0, // Coinbase doesn't provide average entry price
          currentPrice,
          marketValue,
          costBasis: 0,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          assetClass: AssetClass.CRYPTO,
          exchange: 'COINBASE'
        });
      }
    }

    return positions;
  }

  // ============================================================================
  // Order Operations
  // ============================================================================

  async placeOrder(order: UnifiedOrder, _accountId?: string): Promise<OrderResponse> {
    const productId = this.toBrokerSymbol(order.symbol);
    
    const orderConfig: any = {};
    
    if (order.type === OrderType.MARKET) {
      orderConfig.market_market_ioc = {
        base_size: order.quantity.toString()
      };
    } else if (order.type === OrderType.LIMIT) {
      if (order.timeInForce === TimeInForce.GTC) {
        orderConfig.limit_limit_gtc = {
          base_size: order.quantity.toString(),
          limit_price: order.price!.toString(),
          post_only: false
        };
      } else {
        orderConfig.limit_limit_gtd = {
          base_size: order.quantity.toString(),
          limit_price: order.price!.toString(),
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          post_only: false
        };
      }
    } else if (order.type === OrderType.STOP_LIMIT) {
      orderConfig.stop_limit_stop_limit_gtc = {
        base_size: order.quantity.toString(),
        limit_price: order.price!.toString(),
        stop_price: order.stopPrice!.toString(),
        stop_direction: order.side === OrderSide.BUY ? 'STOP_DIRECTION_STOP_UP' : 'STOP_DIRECTION_STOP_DOWN'
      };
    }

    const body = {
      client_order_id: order.clientOrderId || crypto.randomUUID(),
      product_id: productId,
      side: order.side === OrderSide.BUY ? 'BUY' : 'SELL',
      order_configuration: orderConfig
    };

    const response = await this.makeRequest<{ success: boolean; order: CoinbaseOrder }>(
      '/api/v3/brokerage/orders',
      'POST',
      body
    );

    return this.mapCoinbaseOrder(response.order);
  }

  async cancelOrder(orderId: string, _accountId?: string): Promise<void> {
    await this.makeRequest(
      '/api/v3/brokerage/orders/batch_cancel',
      'POST',
      { order_ids: [orderId] }
    );
  }

  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    symbols?: string[];
  }, _accountId?: string): Promise<OrderResponse[]> {
    const queryParams: Record<string, string> = {};
    
    if (params?.status === 'open') {
      queryParams.order_status = 'OPEN';
    } else if (params?.status === 'closed') {
      queryParams.order_status = 'FILLED,CANCELLED,EXPIRED,FAILED';
    }
    
    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.symbols && params.symbols.length > 0) {
      queryParams.product_ids = params.symbols.map(s => this.toBrokerSymbol(s)).join(',');
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const endpoint = `/api/v3/brokerage/orders/historical/batch${queryString ? '?' + queryString : ''}`;
    
    const response = await this.makeRequest<{ orders: CoinbaseOrder[] }>(endpoint);

    return response.orders.map(o => this.mapCoinbaseOrder(o));
  }

  async getOrder(orderId: string, _accountId?: string): Promise<OrderResponse> {
    const response = await this.makeRequest<{ order: CoinbaseOrder }>(
      `/api/v3/brokerage/orders/historical/${orderId}`
    );

    return this.mapCoinbaseOrder(response.order);
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getQuote(symbol: string): Promise<Quote> {
    const productId = this.toBrokerSymbol(symbol);
    
    const response = await this.makeRequest<CoinbaseTicker>(
      `/api/v3/brokerage/products/${productId}/ticker`
    );

    const latestTrade = response.trades[0];
    
    return {
      symbol: this.normalizeSymbol(productId),
      bidPrice: parseFloat(response.best_bid),
      bidSize: 0,
      askPrice: parseFloat(response.best_ask),
      askSize: 0,
      lastPrice: latestTrade ? parseFloat(latestTrade.price) : 0,
      lastSize: latestTrade ? parseFloat(latestTrade.size) : 0,
      volume: 0,
      timestamp: latestTrade ? new Date(latestTrade.time) : new Date()
    };
  }

  async getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]> {
    const productId = this.toBrokerSymbol(params.symbol);
    const granularity = this.mapTimeframe(params.timeframe);

    const queryParams: Record<string, string> = {
      granularity
    };

    if (params.start) {
      queryParams.start = Math.floor(params.start.getTime() / 1000).toString();
    }
    if (params.end) {
      queryParams.end = Math.floor(params.end.getTime() / 1000).toString();
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const response = await this.makeRequest<{ candles: Array<{
      start: string;
      low: string;
      high: string;
      open: string;
      close: string;
      volume: string;
    }> }>(
      `/api/v3/brokerage/products/${productId}/candles?${queryString}`
    );

    return response.candles.map(candle => ({
      timestamp: new Date(parseInt(candle.start) * 1000),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume)
    }));
  }

  // ============================================================================
  // Asset Information
  // ============================================================================

  async getAsset(symbol: string): Promise<Asset> {
    const productId = this.toBrokerSymbol(symbol);
    
    const response = await this.makeRequest<CoinbaseProduct>(
      `/api/v3/brokerage/products/${productId}`
    );

    return {
      id: response.product_id,
      symbol: this.normalizeSymbol(response.product_id),
      name: `${response.base_name}/${response.quote_name}`,
      exchange: 'COINBASE',
      assetClass: AssetClass.CRYPTO,
      status: response.status === 'online' ? 'active' : 'inactive',
      tradable: !response.trading_disabled && !response.is_disabled,
      shortable: false,
      marginable: false,
      easyToBorrow: false,
      fractionable: true,
      minOrderSize: parseFloat(response.base_min_size),
      minPriceIncrement: parseFloat(response.quote_increment)
    };
  }

  // ============================================================================
  // Symbol Mapping
  // ============================================================================

  normalizeSymbol(brokerSymbol: string): string {
    // Coinbase uses BTC-USD format, normalize to BTC/USD
    return brokerSymbol.replace('-', '/');
  }

  toBrokerSymbol(normalizedSymbol: string): string {
    // Convert BTC/USD to BTC-USD
    return normalizedSymbol.replace('/', '-').toUpperCase();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1Min': 'ONE_MINUTE',
      '5Min': 'FIVE_MINUTE',
      '15Min': 'FIFTEEN_MINUTE',
      '30Min': 'THIRTY_MINUTE',
      '1Hour': 'ONE_HOUR',
      '2Hour': 'TWO_HOUR',
      '6Hour': 'SIX_HOUR',
      '1Day': 'ONE_DAY'
    };
    return mapping[timeframe] || 'ONE_DAY';
  }

  private mapCoinbaseOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      PENDING: OrderStatus.PENDING,
      OPEN: OrderStatus.ACCEPTED,
      FILLED: OrderStatus.FILLED,
      CANCELLED: OrderStatus.CANCELLED,
      EXPIRED: OrderStatus.EXPIRED,
      FAILED: OrderStatus.REJECTED
    };
    return mapping[status] || OrderStatus.PENDING;
  }

  private mapCoinbaseOrder(order: CoinbaseOrder): OrderResponse {
    // Determine order type and extract details
    let orderType = OrderType.MARKET;
    let price: number | undefined;
    let stopPrice: number | undefined;
    let quantity = 0;
    let timeInForce = TimeInForce.GTC;

    if (order.order_configuration.market_market_ioc) {
      orderType = OrderType.MARKET;
      quantity = parseFloat(order.order_configuration.market_market_ioc.base_size || '0');
      timeInForce = TimeInForce.IOC;
    } else if (order.order_configuration.limit_limit_gtc) {
      orderType = OrderType.LIMIT;
      quantity = parseFloat(order.order_configuration.limit_limit_gtc.base_size);
      price = parseFloat(order.order_configuration.limit_limit_gtc.limit_price);
      timeInForce = TimeInForce.GTC;
    } else if (order.order_configuration.limit_limit_gtd) {
      orderType = OrderType.LIMIT;
      quantity = parseFloat(order.order_configuration.limit_limit_gtd.base_size);
      price = parseFloat(order.order_configuration.limit_limit_gtd.limit_price);
      timeInForce = TimeInForce.DAY;
    } else if (order.order_configuration.stop_limit_stop_limit_gtc) {
      orderType = OrderType.STOP_LIMIT;
      quantity = parseFloat(order.order_configuration.stop_limit_stop_limit_gtc.base_size);
      price = parseFloat(order.order_configuration.stop_limit_stop_limit_gtc.limit_price);
      stopPrice = parseFloat(order.order_configuration.stop_limit_stop_limit_gtc.stop_price);
      timeInForce = TimeInForce.GTC;
    } else if (order.order_configuration.stop_limit_stop_limit_gtd) {
      orderType = OrderType.STOP_LIMIT;
      quantity = parseFloat(order.order_configuration.stop_limit_stop_limit_gtd.base_size);
      price = parseFloat(order.order_configuration.stop_limit_stop_limit_gtd.limit_price);
      stopPrice = parseFloat(order.order_configuration.stop_limit_stop_limit_gtd.stop_price);
      timeInForce = TimeInForce.DAY;
    }

    return {
      id: order.order_id,
      clientOrderId: order.client_order_id,
      symbol: this.normalizeSymbol(order.product_id),
      side: order.side.toLowerCase() === 'buy' ? OrderSide.BUY : OrderSide.SELL,
      type: orderType,
      status: this.mapCoinbaseOrderStatus(order.status),
      quantity,
      filledQuantity: parseFloat(order.filled_size),
      price,
      stopPrice,
      avgFillPrice: parseFloat(order.average_filled_price) || undefined,
      timeInForce,
      extendedHours: false,
      assetClass: AssetClass.CRYPTO,
      createdAt: new Date(order.created_time),
      updatedAt: new Date(order.created_time),
      filledAt: order.status === 'FILLED' ? new Date(order.created_time) : undefined
    };
  }
}
