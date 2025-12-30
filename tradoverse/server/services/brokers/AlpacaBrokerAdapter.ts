/**
 * Alpaca Broker Adapter
 * 
 * Implements IBrokerService interface for Alpaca Markets.
 * Supports stocks, ETFs, options, and crypto trading.
 * 
 * API Documentation: https://docs.alpaca.markets/
 */

import {
  IBrokerService,
  BrokerType,
  BrokerCapabilities,
  BrokerCredentials,
  ApiKeyCredentials,
  BrokerConnection,
  BrokerAccount,
  AccountBalance,
  Position,
  UnifiedOrder,
  OrderResponse,
  OrderUpdate,
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  AssetClass,
  Quote,
  Bar,
  Trade,
  Snapshot,
  HistoricalDataParams,
  Asset,
  OptionContract,
  OptionsChainRequest,
  OptionType,
  NewsArticle,
  PortfolioHistory,
  QuoteCallback,
  BarCallback,
  OrderUpdateCallback,
  PositionUpdateCallback,
  BrokerError,
  BrokerErrorCode,
  TokenResponse,
} from './types';

// ============================================================================
// Alpaca API Configuration
// ============================================================================

const ALPACA_PAPER_BASE_URL = 'https://paper-api.alpaca.markets';
const ALPACA_LIVE_BASE_URL = 'https://api.alpaca.markets';
const ALPACA_DATA_BASE_URL = 'https://data.alpaca.markets';
const ALPACA_STREAM_URL = 'wss://stream.data.alpaca.markets';
const ALPACA_TRADE_STREAM_URL = 'wss://paper-api.alpaca.markets/stream';

// ============================================================================
// Alpaca Response Types (internal)
// ============================================================================

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  crypto_status?: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  non_marginable_buying_power: string;
  cash: string;
  accrued_fees: string;
  pending_transfer_in: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
  options_buying_power?: string;
  options_approved_level?: number;
  options_trading_level?: number;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  asset_marginable: boolean;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
  qty_available: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: string | null;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: AlpacaOrder[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

interface AlpacaQuote {
  t: string;  // timestamp
  ax: string; // ask exchange
  ap: number; // ask price
  as: number; // ask size
  bx: string; // bid exchange
  bp: number; // bid price
  bs: number; // bid size
  c: string[]; // conditions
  z: string;  // tape
}

interface AlpacaBar {
  t: string;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  n: number;  // trade count
  vw: number; // vwap
}

interface AlpacaTrade {
  t: string;  // timestamp
  x: string;  // exchange
  p: number;  // price
  s: number;  // size
  c: string[]; // conditions
  i: number;  // trade id
  z: string;  // tape
}

interface AlpacaAsset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  min_order_size?: string;
  min_trade_increment?: string;
  price_increment?: string;
}

interface AlpacaNews {
  id: number;
  headline: string;
  author: string;
  created_at: string;
  updated_at: string;
  summary: string;
  content: string;
  url: string;
  images: { size: string; url: string }[];
  symbols: string[];
  source: string;
}

// ============================================================================
// Alpaca Broker Adapter
// ============================================================================

export class AlpacaBrokerAdapter implements IBrokerService {
  readonly brokerType = BrokerType.ALPACA;
  readonly brokerName = 'Alpaca Markets';
  
  readonly capabilities: BrokerCapabilities = {
    supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.CRYPTO, AssetClass.OPTIONS],
    supportedOrderTypes: [
      OrderType.MARKET,
      OrderType.LIMIT,
      OrderType.STOP,
      OrderType.STOP_LIMIT,
      OrderType.TRAILING_STOP,
    ],
    supportedTimeInForce: [
      TimeInForce.DAY,
      TimeInForce.GTC,
      TimeInForce.IOC,
      TimeInForce.FOK,
      TimeInForce.OPG,
      TimeInForce.CLS,
    ],
    supportsExtendedHours: true,
    supportsFractionalShares: true,
    supportsShortSelling: true,
    supportsMarginTrading: true,
    supportsOptionsTrading: true,
    supportsCryptoTrading: true,
    supportsForexTrading: false,
    supportsPaperTrading: true,
    supportsWebSocket: true,
    supportsStreamingQuotes: true,
    supportsStreamingBars: true,
    supportsStreamingTrades: true,
    maxOrdersPerMinute: 200,
  };

  private apiKey: string = '';
  private apiSecret: string = '';
  private isPaper: boolean = true;
  private connected: boolean = false;
  private baseUrl: string = ALPACA_PAPER_BASE_URL;
  private dataUrl: string = ALPACA_DATA_BASE_URL;
  private connection: BrokerConnection | null = null;
  
  // WebSocket connections
  private dataWs: WebSocket | null = null;
  private tradeWs: WebSocket | null = null;
  private quoteCallbacks: Map<string, QuoteCallback[]> = new Map();
  private barCallbacks: Map<string, BarCallback[]> = new Map();
  private orderCallbacks: OrderUpdateCallback[] = [];
  private positionCallbacks: PositionUpdateCallback[] = [];

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(credentials: BrokerCredentials): Promise<BrokerConnection> {
    const apiCreds = credentials as ApiKeyCredentials;
    
    if (!apiCreds.apiKey || !apiCreds.apiSecret) {
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        'API key and secret are required',
        this.brokerType
      );
    }

    this.apiKey = apiCreds.apiKey;
    this.apiSecret = apiCreds.apiSecret;
    this.isPaper = apiCreds.apiKey.startsWith('PK') || apiCreds.apiKey.includes('paper');
    this.baseUrl = this.isPaper ? ALPACA_PAPER_BASE_URL : ALPACA_LIVE_BASE_URL;

    // Verify connection by fetching account
    try {
      const account = await this.getAccount();
      this.connected = true;
      
      this.connection = {
        id: `alpaca_${account.id}`,
        userId: '', // Set by caller
        brokerType: this.brokerType,
        credentials: apiCreds,
        isPaper: this.isPaper,
        isActive: true,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return this.connection;
    } catch (error) {
      this.connected = false;
      throw new BrokerError(
        BrokerErrorCode.AUTHENTICATION_FAILED,
        `Failed to connect to Alpaca: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.brokerType,
        error instanceof Error ? error : undefined
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connection = null;
    this.apiKey = '';
    this.apiSecret = '';
    
    // Close WebSocket connections
    if (this.dataWs) {
      this.dataWs.close();
      this.dataWs = null;
    }
    if (this.tradeWs) {
      this.tradeWs.close();
      this.tradeWs = null;
    }
    
    this.quoteCallbacks.clear();
    this.barCallbacks.clear();
    this.orderCallbacks = [];
    this.positionCallbacks = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ============================================================================
  // HTTP Request Helper
  // ============================================================================

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      baseUrl?: string;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, baseUrl = this.baseUrl } = options;
    
    const url = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorCode = BrokerErrorCode.UNKNOWN_ERROR;
      
      if (response.status === 401 || response.status === 403) {
        errorCode = BrokerErrorCode.AUTHENTICATION_FAILED;
      } else if (response.status === 429) {
        errorCode = BrokerErrorCode.RATE_LIMITED;
      } else if (response.status === 422) {
        errorCode = BrokerErrorCode.INVALID_ORDER;
      }
      
      throw new BrokerError(
        errorCode,
        `Alpaca API error: ${errorText}`,
        this.brokerType
      );
    }

    return response.json();
  }

  // ============================================================================
  // Account Operations
  // ============================================================================

  async getAccount(): Promise<BrokerAccount> {
    const account = await this.request<AlpacaAccount>('/v2/account');
    
    return {
      id: account.id,
      accountNumber: account.account_number,
      accountType: account.pattern_day_trader ? 'day_trader' : 'standard',
      currency: account.currency,
      status: account.status,
      isPaper: this.isPaper,
      createdAt: new Date(account.created_at),
    };
  }

  async getAccountBalance(): Promise<AccountBalance> {
    const account = await this.request<AlpacaAccount>('/v2/account');
    
    return {
      currency: account.currency,
      cash: parseFloat(account.cash),
      cashAvailable: parseFloat(account.cash),
      cashWithdrawable: parseFloat(account.cash),
      buyingPower: parseFloat(account.buying_power),
      portfolioValue: parseFloat(account.portfolio_value),
      equity: parseFloat(account.equity),
      lastEquity: parseFloat(account.last_equity),
      longMarketValue: parseFloat(account.long_market_value),
      shortMarketValue: parseFloat(account.short_market_value),
      initialMargin: parseFloat(account.initial_margin),
      maintenanceMargin: parseFloat(account.maintenance_margin),
      dayTradeCount: account.daytrade_count,
      patternDayTrader: account.pattern_day_trader,
    };
  }

  async getPortfolioHistory(
    period: string = '1M',
    timeframe: string = '1D'
  ): Promise<PortfolioHistory> {
    const params = new URLSearchParams({
      period,
      timeframe,
      extended_hours: 'true',
    });
    
    const response = await this.request<{
      timestamp: number[];
      equity: number[];
      profit_loss: number[];
      profit_loss_pct: number[];
      base_value: number;
      timeframe: string;
    }>(`/v2/account/portfolio/history?${params}`);
    
    return {
      timestamps: response.timestamp.map(t => new Date(t * 1000)),
      equity: response.equity,
      profitLoss: response.profit_loss,
      profitLossPct: response.profit_loss_pct,
      baseValue: response.base_value,
      timeframe: response.timeframe,
    };
  }

  // ============================================================================
  // Order Operations
  // ============================================================================

  async placeOrder(order: UnifiedOrder): Promise<OrderResponse> {
    const alpacaOrder: Record<string, unknown> = {
      symbol: order.symbol,
      qty: order.quantity.toString(),
      side: order.side,
      type: this.mapOrderType(order.type),
      time_in_force: order.timeInForce,
    };

    if (order.price) alpacaOrder.limit_price = order.price.toString();
    if (order.stopPrice) alpacaOrder.stop_price = order.stopPrice.toString();
    if (order.trailPercent) alpacaOrder.trail_percent = order.trailPercent.toString();
    if (order.trailPrice) alpacaOrder.trail_price = order.trailPrice.toString();
    if (order.extendedHours) alpacaOrder.extended_hours = order.extendedHours;
    if (order.clientOrderId) alpacaOrder.client_order_id = order.clientOrderId;
    if (order.orderClass) alpacaOrder.order_class = order.orderClass;
    
    // Bracket order legs
    if (order.takeProfit) {
      alpacaOrder.take_profit = { limit_price: order.takeProfit.limitPrice.toString() };
    }
    if (order.stopLoss) {
      alpacaOrder.stop_loss = {
        stop_price: order.stopLoss.stopPrice.toString(),
        ...(order.stopLoss.limitPrice && { limit_price: order.stopLoss.limitPrice.toString() }),
      };
    }

    const response = await this.request<AlpacaOrder>('/v2/orders', {
      method: 'POST',
      body: alpacaOrder,
    });

    return this.mapOrder(response);
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    const order = await this.request<AlpacaOrder>(`/v2/orders/${orderId}`);
    return this.mapOrder(order);
  }

  async getOrders(
    status?: OrderStatus,
    limit: number = 100,
    after?: Date
  ): Promise<OrderResponse[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      direction: 'desc',
    });
    
    if (status) {
      params.set('status', this.mapOrderStatusToAlpaca(status));
    }
    if (after) {
      params.set('after', after.toISOString());
    }

    const orders = await this.request<AlpacaOrder[]>(`/v2/orders?${params}`);
    return orders.map(o => this.mapOrder(o));
  }

  async modifyOrder(update: OrderUpdate): Promise<OrderResponse> {
    const body: Record<string, unknown> = {};
    
    if (update.quantity) body.qty = update.quantity.toString();
    if (update.price) body.limit_price = update.price.toString();
    if (update.stopPrice) body.stop_price = update.stopPrice.toString();
    if (update.trailPercent) body.trail = update.trailPercent.toString();
    if (update.timeInForce) body.time_in_force = update.timeInForce;
    if (update.clientOrderId) body.client_order_id = update.clientOrderId;

    const order = await this.request<AlpacaOrder>(`/v2/orders/${update.orderId}`, {
      method: 'PATCH',
      body,
    });

    return this.mapOrder(order);
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.request(`/v2/orders/${orderId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  async cancelAllOrders(): Promise<boolean> {
    try {
      await this.request('/v2/orders', { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Position Operations
  // ============================================================================

  async getPositions(): Promise<Position[]> {
    const positions = await this.request<AlpacaPosition[]>('/v2/positions');
    return positions.map(p => this.mapPosition(p));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const position = await this.request<AlpacaPosition>(`/v2/positions/${symbol}`);
      return this.mapPosition(position);
    } catch {
      return null;
    }
  }

  async closePosition(
    symbol: string,
    qty?: number,
    percentQty?: number
  ): Promise<OrderResponse> {
    const params = new URLSearchParams();
    if (qty) params.set('qty', qty.toString());
    if (percentQty) params.set('percentage', percentQty.toString());

    const order = await this.request<AlpacaOrder>(
      `/v2/positions/${symbol}?${params}`,
      { method: 'DELETE' }
    );
    return this.mapOrder(order);
  }

  async closeAllPositions(): Promise<OrderResponse[]> {
    const response = await this.request<AlpacaOrder[]>('/v2/positions', {
      method: 'DELETE',
    });
    return response.map(o => this.mapOrder(o));
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getQuote(symbol: string): Promise<Quote> {
    const response = await this.request<{ quotes: Record<string, AlpacaQuote> }>(
      `/v2/stocks/${symbol}/quotes/latest`,
      { baseUrl: this.dataUrl }
    );
    
    const quote = response.quotes[symbol];
    return this.mapQuote(symbol, quote);
  }

  async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
    });
    
    const response = await this.request<{ quotes: Record<string, AlpacaQuote> }>(
      `/v2/stocks/quotes/latest?${params}`,
      { baseUrl: this.dataUrl }
    );
    
    const quotes = new Map<string, Quote>();
    for (const [symbol, quote] of Object.entries(response.quotes)) {
      quotes.set(symbol, this.mapQuote(symbol, quote));
    }
    return quotes;
  }

  async getBars(params: HistoricalDataParams): Promise<Bar[]> {
    const queryParams = new URLSearchParams({
      timeframe: params.timeframe,
      start: params.start.toISOString(),
      limit: (params.limit || 1000).toString(),
    });
    
    if (params.end) queryParams.set('end', params.end.toISOString());
    if (params.adjustment) queryParams.set('adjustment', params.adjustment);

    const response = await this.request<{ bars: AlpacaBar[] }>(
      `/v2/stocks/${params.symbol}/bars?${queryParams}`,
      { baseUrl: this.dataUrl }
    );
    
    return response.bars.map(b => this.mapBar(b));
  }

  async getSnapshot(symbol: string): Promise<Snapshot> {
    const response = await this.request<{
      latestTrade: AlpacaTrade;
      latestQuote: AlpacaQuote;
      minuteBar: AlpacaBar;
      dailyBar: AlpacaBar;
      prevDailyBar: AlpacaBar;
    }>(`/v2/stocks/${symbol}/snapshot`, { baseUrl: this.dataUrl });
    
    return {
      symbol,
      latestTrade: response.latestTrade ? this.mapTrade(symbol, response.latestTrade) : undefined,
      latestQuote: response.latestQuote ? this.mapQuote(symbol, response.latestQuote) : undefined,
      minuteBar: response.minuteBar ? this.mapBar(response.minuteBar) : undefined,
      dailyBar: response.dailyBar ? this.mapBar(response.dailyBar) : undefined,
      prevDailyBar: response.prevDailyBar ? this.mapBar(response.prevDailyBar) : undefined,
    };
  }

  async getSnapshots(symbols: string[]): Promise<Map<string, Snapshot>> {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
    });
    
    const response = await this.request<Record<string, {
      latestTrade: AlpacaTrade;
      latestQuote: AlpacaQuote;
      minuteBar: AlpacaBar;
      dailyBar: AlpacaBar;
      prevDailyBar: AlpacaBar;
    }>>(`/v2/stocks/snapshots?${params}`, { baseUrl: this.dataUrl });
    
    const snapshots = new Map<string, Snapshot>();
    for (const [symbol, data] of Object.entries(response)) {
      snapshots.set(symbol, {
        symbol,
        latestTrade: data.latestTrade ? this.mapTrade(symbol, data.latestTrade) : undefined,
        latestQuote: data.latestQuote ? this.mapQuote(symbol, data.latestQuote) : undefined,
        minuteBar: data.minuteBar ? this.mapBar(data.minuteBar) : undefined,
        dailyBar: data.dailyBar ? this.mapBar(data.dailyBar) : undefined,
        prevDailyBar: data.prevDailyBar ? this.mapBar(data.prevDailyBar) : undefined,
      });
    }
    return snapshots;
  }

  async getTrades(
    symbol: string,
    start: Date,
    end?: Date,
    limit: number = 1000
  ): Promise<Trade[]> {
    const params = new URLSearchParams({
      start: start.toISOString(),
      limit: limit.toString(),
    });
    if (end) params.set('end', end.toISOString());

    const response = await this.request<{ trades: AlpacaTrade[] }>(
      `/v2/stocks/${symbol}/trades?${params}`,
      { baseUrl: this.dataUrl }
    );
    
    return response.trades.map(t => this.mapTrade(symbol, t));
  }

  // ============================================================================
  // Asset Information
  // ============================================================================

  async getAsset(symbol: string): Promise<Asset> {
    const asset = await this.request<AlpacaAsset>(`/v2/assets/${symbol}`);
    return this.mapAsset(asset);
  }

  async getAssets(assetClass?: AssetClass): Promise<Asset[]> {
    const params = new URLSearchParams({ status: 'active' });
    if (assetClass) {
      params.set('asset_class', this.mapAssetClassToAlpaca(assetClass));
    }

    const assets = await this.request<AlpacaAsset[]>(`/v2/assets?${params}`);
    return assets.map(a => this.mapAsset(a));
  }

  // ============================================================================
  // Options (Alpaca Options API)
  // ============================================================================

  async getOptionsChain(request: OptionsChainRequest): Promise<OptionContract[]> {
    const params = new URLSearchParams({
      underlying_symbols: request.underlyingSymbol,
    });
    
    if (request.expirationDate) {
      params.set('expiration_date', request.expirationDate.toISOString().split('T')[0]);
    }
    if (request.strikePrice) {
      params.set('strike_price_gte', (request.strikePrice * 0.9).toString());
      params.set('strike_price_lte', (request.strikePrice * 1.1).toString());
    }
    if (request.type) {
      params.set('type', request.type);
    }

    const response = await this.request<{
      option_contracts: Array<{
        id: string;
        symbol: string;
        underlying_symbol: string;
        type: string;
        strike_price: string;
        expiration_date: string;
        open_interest?: number;
        close_price?: string;
      }>;
    }>(`/v2/options/contracts?${params}`);
    
    return response.option_contracts.map(c => ({
      id: c.id,
      symbol: c.symbol,
      underlyingSymbol: c.underlying_symbol,
      type: c.type === 'call' ? OptionType.CALL : OptionType.PUT,
      strikePrice: parseFloat(c.strike_price),
      expirationDate: new Date(c.expiration_date),
      openInterest: c.open_interest,
      lastPrice: c.close_price ? parseFloat(c.close_price) : undefined,
    }));
  }

  async getOptionContract(contractId: string): Promise<OptionContract> {
    const contract = await this.request<{
      id: string;
      symbol: string;
      underlying_symbol: string;
      type: string;
      strike_price: string;
      expiration_date: string;
      open_interest?: number;
      close_price?: string;
    }>(`/v2/options/contracts/${contractId}`);
    
    return {
      id: contract.id,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlying_symbol,
      type: contract.type === 'call' ? OptionType.CALL : OptionType.PUT,
      strikePrice: parseFloat(contract.strike_price),
      expirationDate: new Date(contract.expiration_date),
      openInterest: contract.open_interest,
      lastPrice: contract.close_price ? parseFloat(contract.close_price) : undefined,
    };
  }

  // ============================================================================
  // News
  // ============================================================================

  async getNews(symbols?: string[], limit: number = 50): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    if (symbols && symbols.length > 0) {
      params.set('symbols', symbols.join(','));
    }

    const response = await this.request<{ news: AlpacaNews[] }>(
      `/v1beta1/news?${params}`,
      { baseUrl: this.dataUrl }
    );
    
    return response.news.map(n => ({
      id: n.id.toString(),
      headline: n.headline,
      summary: n.summary,
      author: n.author,
      source: n.source,
      url: n.url,
      symbols: n.symbols,
      images: n.images,
      createdAt: new Date(n.created_at),
      updatedAt: n.updated_at ? new Date(n.updated_at) : undefined,
    }));
  }

  // ============================================================================
  // WebSocket Streaming
  // ============================================================================

  subscribeToQuotes(symbols: string[], callback: QuoteCallback): void {
    for (const symbol of symbols) {
      const callbacks = this.quoteCallbacks.get(symbol) || [];
      callbacks.push(callback);
      this.quoteCallbacks.set(symbol, callbacks);
    }
    this.ensureDataWebSocket();
    this.sendDataSubscription('quotes', symbols);
  }

  subscribeToBars(symbols: string[], callback: BarCallback): void {
    for (const symbol of symbols) {
      const callbacks = this.barCallbacks.get(symbol) || [];
      callbacks.push(callback);
      this.barCallbacks.set(symbol, callbacks);
    }
    this.ensureDataWebSocket();
    this.sendDataSubscription('bars', symbols);
  }

  subscribeToOrderUpdates(callback: OrderUpdateCallback): void {
    this.orderCallbacks.push(callback);
    this.ensureTradeWebSocket();
  }

  subscribeToPositionUpdates(callback: PositionUpdateCallback): void {
    this.positionCallbacks.push(callback);
    this.ensureTradeWebSocket();
  }

  unsubscribe(symbols: string[]): void {
    for (const symbol of symbols) {
      this.quoteCallbacks.delete(symbol);
      this.barCallbacks.delete(symbol);
    }
    // Send unsubscribe message to WebSocket
    if (this.dataWs && this.dataWs.readyState === WebSocket.OPEN) {
      this.dataWs.send(JSON.stringify({
        action: 'unsubscribe',
        quotes: symbols,
        bars: symbols,
      }));
    }
  }

  unsubscribeAll(): void {
    this.quoteCallbacks.clear();
    this.barCallbacks.clear();
    this.orderCallbacks = [];
    this.positionCallbacks = [];
    
    if (this.dataWs) {
      this.dataWs.close();
      this.dataWs = null;
    }
    if (this.tradeWs) {
      this.tradeWs.close();
      this.tradeWs = null;
    }
  }

  private ensureDataWebSocket(): void {
    if (this.dataWs && this.dataWs.readyState === WebSocket.OPEN) return;
    
    this.dataWs = new WebSocket(`${ALPACA_STREAM_URL}/v2/iex`);
    
    this.dataWs.onopen = () => {
      this.dataWs?.send(JSON.stringify({
        action: 'auth',
        key: this.apiKey,
        secret: this.apiSecret,
      }));
    };
    
    this.dataWs.onmessage = (event) => {
      const messages = JSON.parse(event.data);
      for (const msg of messages) {
        if (msg.T === 'q') {
          // Quote update
          const callbacks = this.quoteCallbacks.get(msg.S);
          if (callbacks) {
            const quote = this.mapQuote(msg.S, msg);
            callbacks.forEach(cb => cb(quote));
          }
        } else if (msg.T === 'b') {
          // Bar update
          const callbacks = this.barCallbacks.get(msg.S);
          if (callbacks) {
            const bar = this.mapBar(msg);
            callbacks.forEach(cb => cb(bar));
          }
        }
      }
    };
  }

  private ensureTradeWebSocket(): void {
    if (this.tradeWs && this.tradeWs.readyState === WebSocket.OPEN) return;
    
    const streamUrl = this.isPaper 
      ? 'wss://paper-api.alpaca.markets/stream'
      : 'wss://api.alpaca.markets/stream';
    
    this.tradeWs = new WebSocket(streamUrl);
    
    this.tradeWs.onopen = () => {
      this.tradeWs?.send(JSON.stringify({
        action: 'auth',
        key: this.apiKey,
        secret: this.apiSecret,
      }));
      
      // Subscribe to trade updates
      this.tradeWs?.send(JSON.stringify({
        action: 'listen',
        data: { streams: ['trade_updates'] },
      }));
    };
    
    this.tradeWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.stream === 'trade_updates') {
        const order = this.mapOrder(msg.data.order);
        this.orderCallbacks.forEach(cb => cb(order));
      }
    };
  }

  private sendDataSubscription(type: 'quotes' | 'bars', symbols: string[]): void {
    if (this.dataWs && this.dataWs.readyState === WebSocket.OPEN) {
      this.dataWs.send(JSON.stringify({
        action: 'subscribe',
        [type]: symbols,
      }));
    }
  }

  // ============================================================================
  // Mapping Helpers
  // ============================================================================

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      [OrderType.MARKET]: 'market',
      [OrderType.LIMIT]: 'limit',
      [OrderType.STOP]: 'stop',
      [OrderType.STOP_LIMIT]: 'stop_limit',
      [OrderType.TRAILING_STOP]: 'trailing_stop',
    };
    return mapping[type];
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'new': OrderStatus.NEW,
      'pending_new': OrderStatus.PENDING,
      'accepted': OrderStatus.ACCEPTED,
      'partially_filled': OrderStatus.PARTIALLY_FILLED,
      'filled': OrderStatus.FILLED,
      'canceled': OrderStatus.CANCELLED,
      'cancelled': OrderStatus.CANCELLED,
      'rejected': OrderStatus.REJECTED,
      'expired': OrderStatus.EXPIRED,
      'replaced': OrderStatus.REPLACED,
      'pending_cancel': OrderStatus.PENDING,
      'pending_replace': OrderStatus.PENDING,
    };
    return mapping[status] || OrderStatus.NEW;
  }

  private mapOrderStatusToAlpaca(status: OrderStatus): string {
    const mapping: Record<OrderStatus, string> = {
      [OrderStatus.NEW]: 'new',
      [OrderStatus.PENDING]: 'pending_new',
      [OrderStatus.ACCEPTED]: 'accepted',
      [OrderStatus.PARTIALLY_FILLED]: 'partially_filled',
      [OrderStatus.FILLED]: 'filled',
      [OrderStatus.CANCELLED]: 'canceled',
      [OrderStatus.REJECTED]: 'rejected',
      [OrderStatus.EXPIRED]: 'expired',
      [OrderStatus.REPLACED]: 'replaced',
    };
    return mapping[status];
  }

  private mapAssetClass(assetClass: string): AssetClass {
    const mapping: Record<string, AssetClass> = {
      'us_equity': AssetClass.US_EQUITY,
      'crypto': AssetClass.CRYPTO,
      'option': AssetClass.OPTIONS,
    };
    return mapping[assetClass] || AssetClass.US_EQUITY;
  }

  private mapAssetClassToAlpaca(assetClass: AssetClass): string {
    const mapping: Record<AssetClass, string> = {
      [AssetClass.US_EQUITY]: 'us_equity',
      [AssetClass.CRYPTO]: 'crypto',
      [AssetClass.OPTIONS]: 'option',
      [AssetClass.FOREX]: 'forex',
      [AssetClass.FUTURES]: 'futures',
    };
    return mapping[assetClass];
  }

  private mapOrder(order: AlpacaOrder): OrderResponse {
    return {
      id: order.id,
      clientOrderId: order.client_order_id,
      symbol: order.symbol,
      side: order.side as OrderSide,
      type: order.type as OrderType,
      quantity: parseFloat(order.qty),
      filledQuantity: parseFloat(order.filled_qty),
      price: order.limit_price ? parseFloat(order.limit_price) : undefined,
      stopPrice: order.stop_price ? parseFloat(order.stop_price) : undefined,
      avgFillPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
      status: this.mapOrderStatus(order.status),
      timeInForce: order.time_in_force as TimeInForce,
      extendedHours: order.extended_hours,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      filledAt: order.filled_at ? new Date(order.filled_at) : undefined,
      cancelledAt: order.canceled_at ? new Date(order.canceled_at) : undefined,
      expiredAt: order.expired_at ? new Date(order.expired_at) : undefined,
      failedAt: order.failed_at ? new Date(order.failed_at) : undefined,
      assetClass: this.mapAssetClass(order.asset_class),
      legs: order.legs ? order.legs.map(l => this.mapOrder(l)) : undefined,
    };
  }

  private mapPosition(position: AlpacaPosition): Position {
    return {
      symbol: position.symbol,
      quantity: parseFloat(position.qty),
      side: position.side as 'long' | 'short',
      avgEntryPrice: parseFloat(position.avg_entry_price),
      marketValue: parseFloat(position.market_value),
      costBasis: parseFloat(position.cost_basis),
      unrealizedPL: parseFloat(position.unrealized_pl),
      unrealizedPLPercent: parseFloat(position.unrealized_plpc),
      currentPrice: parseFloat(position.current_price),
      lastDayPrice: parseFloat(position.lastday_price),
      changeToday: parseFloat(position.change_today),
      assetClass: this.mapAssetClass(position.asset_class),
      exchange: position.exchange,
    };
  }

  private mapQuote(symbol: string, quote: AlpacaQuote): Quote {
    return {
      symbol,
      bidPrice: quote.bp,
      bidSize: quote.bs,
      askPrice: quote.ap,
      askSize: quote.as,
      lastPrice: (quote.bp + quote.ap) / 2, // Mid price
      lastSize: 0,
      volume: 0,
      timestamp: new Date(quote.t),
    };
  }

  private mapBar(bar: AlpacaBar): Bar {
    return {
      timestamp: new Date(bar.t),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
      tradeCount: bar.n,
    };
  }

  private mapTrade(symbol: string, trade: AlpacaTrade): Trade {
    return {
      symbol,
      price: trade.p,
      size: trade.s,
      timestamp: new Date(trade.t),
      exchange: trade.x,
      conditions: trade.c,
    };
  }

  private mapAsset(asset: AlpacaAsset): Asset {
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      assetClass: this.mapAssetClass(asset.class),
      status: asset.status as 'active' | 'inactive',
      tradable: asset.tradable,
      marginable: asset.marginable,
      shortable: asset.shortable,
      easyToBorrow: asset.easy_to_borrow,
      fractionable: asset.fractionable,
      minOrderSize: asset.min_order_size ? parseFloat(asset.min_order_size) : undefined,
      minPriceIncrement: asset.price_increment ? parseFloat(asset.price_increment) : undefined,
    };
  }

  // ============================================================================
  // Watchlist Methods
  // ============================================================================

  async getWatchlists(): Promise<any[]> {
    const response = await this.request('/v2/watchlists') as any[];
    return response;
  }

  async createWatchlist(name: string, symbols?: string[]): Promise<any> {
    const response = await this.request('/v2/watchlists', {
      method: 'POST',
      body: JSON.stringify({ name, symbols: symbols || [] }),
    });
    return response;
  }

  async updateWatchlist(watchlistId: string, name?: string, symbols?: string[]): Promise<any> {
    const body: any = {};
    if (name) body.name = name;
    if (symbols) body.symbols = symbols;
    const response = await this.request(`/v2/watchlists/${watchlistId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return response;
  }

  async deleteWatchlist(watchlistId: string): Promise<boolean> {
    await this.request(`/v2/watchlists/${watchlistId}`, { method: 'DELETE' });
    return true;
  }

  // ============================================================================
  // Calendar & Clock Methods
  // ============================================================================

  async getClock(): Promise<any> {
    const response = await this.request('/v2/clock') as {
      timestamp: string;
      is_open: boolean;
      next_open: string;
      next_close: string;
    };
    return {
      timestamp: new Date(response.timestamp),
      isOpen: response.is_open,
      nextOpen: new Date(response.next_open),
      nextClose: new Date(response.next_close),
    };
  }

  async getCalendar(start?: string, end?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request(`/v2/calendar${query}`) as any[];
    return response.map((day: any) => ({
      date: day.date,
      open: day.open,
      close: day.close,
      sessionOpen: day.session_open,
      sessionClose: day.session_close,
    }));
  }

  // ============================================================================
  // Crypto Methods
  // ============================================================================

  async getCryptoQuote(symbol: string): Promise<Quote> {
    const response = await this.request(`/v1beta3/crypto/us/latest/quotes?symbols=${symbol}`, {
      baseUrl: ALPACA_DATA_BASE_URL,
    }) as { quotes: Record<string, AlpacaQuote> };
    const quote = response.quotes[symbol];
    return this.mapQuote(symbol, quote);
  }

  async getCryptoBars(symbol: string, timeframe: string, options?: { start?: string; end?: string; limit?: number }): Promise<Bar[]> {
    const params = new URLSearchParams();
    params.set('symbols', symbol);
    params.set('timeframe', timeframe);
    if (options?.start) params.set('start', options.start);
    if (options?.end) params.set('end', options.end);
    if (options?.limit) params.set('limit', options.limit.toString());
    
    const response = await this.request(`/v1beta3/crypto/us/bars?${params.toString()}`, {
      baseUrl: ALPACA_DATA_BASE_URL,
    }) as { bars: Record<string, AlpacaBar[]> };
    return (response.bars[symbol] || []).map((bar: AlpacaBar) => this.mapBar(bar));
  }

  async getCryptoTrades(symbol: string, options?: { start?: string; end?: string; limit?: number }): Promise<Trade[]> {
    const params = new URLSearchParams();
    params.set('symbols', symbol);
    if (options?.start) params.set('start', options.start);
    if (options?.end) params.set('end', options.end);
    if (options?.limit) params.set('limit', options.limit.toString());
    
    const response = await this.request(`/v1beta3/crypto/us/trades?${params.toString()}`, {
      baseUrl: ALPACA_DATA_BASE_URL,
    }) as { trades: Record<string, AlpacaTrade[]> };
    return (response.trades[symbol] || []).map((trade: AlpacaTrade) => this.mapTrade(symbol, trade));
  }

  async getCryptoSnapshot(symbol: string): Promise<Snapshot> {
    const response = await this.request(`/v1beta3/crypto/us/snapshots?symbols=${symbol}`, {
      baseUrl: ALPACA_DATA_BASE_URL,
    }) as { snapshots: Record<string, any> };
    const data = response.snapshots[symbol];
    return {
      symbol,
      latestTrade: data.latestTrade ? this.mapTrade(symbol, data.latestTrade) : undefined,
      latestQuote: data.latestQuote ? this.mapQuote(symbol, data.latestQuote) : undefined,
      minuteBar: data.minuteBar ? this.mapBar(data.minuteBar) : undefined,
      dailyBar: data.dailyBar ? this.mapBar(data.dailyBar) : undefined,
      prevDailyBar: data.prevDailyBar ? this.mapBar(data.prevDailyBar) : undefined,
    };
  }

  // ============================================================================
  // Capability & Connection Methods
  // ============================================================================

  getCapabilities(): BrokerCapabilities {
    return this.capabilities;
  }

  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    const start = Date.now();
    try {
      await this.getAccount();
      const latency = Date.now() - start;
      return { success: true, message: 'Connection successful', latency };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  // ============================================================================
  // Bracket & OCO Order Methods
  // ============================================================================

  async placeBracketOrder(params: {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    timeInForce: 'day' | 'gtc';
    limitPrice?: number;
    takeProfitLimitPrice: number;
    stopLossStopPrice: number;
    stopLossLimitPrice?: number;
  }): Promise<OrderResponse> {
    const order: UnifiedOrder = {
      symbol: params.symbol,
      quantity: params.quantity,
      side: params.side as OrderSide,
      type: params.type as OrderType,
      timeInForce: params.timeInForce as TimeInForce,
      price: params.limitPrice,
      orderClass: 'bracket',
      takeProfit: { limitPrice: params.takeProfitLimitPrice },
      stopLoss: {
        stopPrice: params.stopLossStopPrice,
        limitPrice: params.stopLossLimitPrice,
      },
    };
    return this.placeOrder(order);
  }

  async placeOCOOrder(params: {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    takeProfitLimitPrice: number;
    stopLossStopPrice: number;
    stopLossLimitPrice?: number;
  }): Promise<OrderResponse> {
    const order: UnifiedOrder = {
      symbol: params.symbol,
      quantity: params.quantity,
      side: params.side as OrderSide,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      orderClass: 'oco',
      takeProfit: { limitPrice: params.takeProfitLimitPrice },
      stopLoss: {
        stopPrice: params.stopLossStopPrice,
        limitPrice: params.stopLossLimitPrice,
      },
    };
    return this.placeOrder(order);
  }
}

// ============================================================================
// Export singleton factory function
// ============================================================================

export function createAlpacaBroker(): AlpacaBrokerAdapter {
  return new AlpacaBrokerAdapter();
}
