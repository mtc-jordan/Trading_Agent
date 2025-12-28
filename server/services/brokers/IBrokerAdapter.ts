/**
 * Broker Adapter Interface
 * 
 * All broker adapters must implement this interface to ensure
 * consistent behavior across different brokers.
 */

import {
  BrokerType,
  BrokerCredentials,
  BrokerAccount,
  AccountBalance,
  Position,
  UnifiedOrder,
  OrderResponse,
  OrderUpdate,
  Quote,
  Bar,
  HistoricalDataParams,
  Asset,
  TokenResponse,
  BrokerCapabilities,
  QuoteCallback,
  OrderUpdateCallback,
  BarCallback
} from './types';

export interface IBrokerAdapter {
  // ============================================================================
  // Broker Info
  // ============================================================================
  
  /**
   * Get the broker type identifier
   */
  getBrokerType(): BrokerType;
  
  /**
   * Get broker capabilities
   */
  getCapabilities(): BrokerCapabilities;
  
  // ============================================================================
  // Connection Management
  // ============================================================================
  
  /**
   * Initialize the adapter with credentials
   */
  initialize(credentials: BrokerCredentials): Promise<void>;
  
  /**
   * Check if the adapter is connected and authenticated
   */
  isConnected(): boolean;
  
  /**
   * Disconnect and cleanup resources
   */
  disconnect(): Promise<void>;
  
  /**
   * Test the connection with current credentials
   */
  testConnection(): Promise<boolean>;
  
  // ============================================================================
  // OAuth Authentication
  // ============================================================================
  
  /**
   * Get the OAuth authorization URL for user authentication
   */
  getAuthorizationUrl(state: string, isPaper?: boolean): string;
  
  /**
   * Handle OAuth callback and exchange code for tokens
   */
  handleOAuthCallback(code: string, state: string, verifier?: string): Promise<TokenResponse>;
  
  /**
   * Refresh the access token using refresh token
   */
  refreshAccessToken(): Promise<TokenResponse>;
  
  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean;
  
  // ============================================================================
  // Account Operations
  // ============================================================================
  
  /**
   * Get all accounts associated with the connection
   */
  getAccounts(): Promise<BrokerAccount[]>;
  
  /**
   * Get account balance and buying power
   */
  getAccountBalance(accountId?: string): Promise<AccountBalance>;
  
  /**
   * Get all positions for an account
   */
  getPositions(accountId?: string): Promise<Position[]>;
  
  /**
   * Get a specific position by symbol
   */
  getPosition(symbol: string, accountId?: string): Promise<Position | null>;
  
  // ============================================================================
  // Order Operations
  // ============================================================================
  
  /**
   * Place a new order
   */
  placeOrder(order: UnifiedOrder, accountId?: string): Promise<OrderResponse>;
  
  /**
   * Cancel an existing order
   */
  cancelOrder(orderId: string, accountId?: string): Promise<void>;
  
  /**
   * Cancel all open orders
   */
  cancelAllOrders(accountId?: string): Promise<void>;
  
  /**
   * Modify an existing order
   */
  modifyOrder(orderId: string, updates: OrderUpdate, accountId?: string): Promise<OrderResponse>;
  
  /**
   * Get all orders (open and closed)
   */
  getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    after?: Date;
    until?: Date;
    direction?: 'asc' | 'desc';
    symbols?: string[];
  }, accountId?: string): Promise<OrderResponse[]>;
  
  /**
   * Get a specific order by ID
   */
  getOrder(orderId: string, accountId?: string): Promise<OrderResponse>;
  
  // ============================================================================
  // Market Data
  // ============================================================================
  
  /**
   * Get current quote for a symbol
   */
  getQuote(symbol: string): Promise<Quote>;
  
  /**
   * Get quotes for multiple symbols
   */
  getQuotes(symbols: string[]): Promise<Map<string, Quote>>;
  
  /**
   * Get historical bars/candles
   */
  getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]>;
  
  /**
   * Get latest bar for a symbol
   */
  getLatestBar(symbol: string): Promise<Bar>;
  
  // ============================================================================
  // Asset Information
  // ============================================================================
  
  /**
   * Get asset information by symbol
   */
  getAsset(symbol: string): Promise<Asset>;
  
  /**
   * Search for assets
   */
  searchAssets(query: string, assetClass?: string): Promise<Asset[]>;
  
  /**
   * Check if a symbol is tradable
   */
  isTradable(symbol: string): Promise<boolean>;
  
  // ============================================================================
  // Symbol Mapping
  // ============================================================================
  
  /**
   * Convert broker-specific symbol to normalized format
   */
  normalizeSymbol(brokerSymbol: string): string;
  
  /**
   * Convert normalized symbol to broker-specific format
   */
  toBrokerSymbol(normalizedSymbol: string): string;
  
  // ============================================================================
  // Streaming (Optional)
  // ============================================================================
  
  /**
   * Subscribe to real-time quotes
   */
  subscribeQuotes?(symbols: string[], callback: QuoteCallback): Promise<void>;
  
  /**
   * Unsubscribe from quotes
   */
  unsubscribeQuotes?(symbols: string[]): Promise<void>;
  
  /**
   * Subscribe to real-time bars
   */
  subscribeBars?(symbols: string[], callback: BarCallback): Promise<void>;
  
  /**
   * Unsubscribe from bars
   */
  unsubscribeBars?(symbols: string[]): Promise<void>;
  
  /**
   * Subscribe to order updates
   */
  subscribeOrderUpdates?(callback: OrderUpdateCallback): Promise<void>;
  
  /**
   * Unsubscribe from order updates
   */
  unsubscribeOrderUpdates?(): Promise<void>;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseBrokerAdapter implements IBrokerAdapter {
  protected credentials: BrokerCredentials | null = null;
  protected connected: boolean = false;
  
  abstract getBrokerType(): BrokerType;
  abstract getCapabilities(): BrokerCapabilities;
  abstract getAuthorizationUrl(state: string, isPaper?: boolean): string;
  abstract handleOAuthCallback(code: string, state: string, verifier?: string): Promise<TokenResponse>;
  abstract refreshAccessToken(): Promise<TokenResponse>;
  abstract getAccounts(): Promise<BrokerAccount[]>;
  abstract getAccountBalance(accountId?: string): Promise<AccountBalance>;
  abstract getPositions(accountId?: string): Promise<Position[]>;
  abstract placeOrder(order: UnifiedOrder, accountId?: string): Promise<OrderResponse>;
  abstract cancelOrder(orderId: string, accountId?: string): Promise<void>;
  abstract getOrders(params?: any, accountId?: string): Promise<OrderResponse[]>;
  abstract getOrder(orderId: string, accountId?: string): Promise<OrderResponse>;
  abstract getQuote(symbol: string): Promise<Quote>;
  abstract getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]>;
  abstract getAsset(symbol: string): Promise<Asset>;
  
  async initialize(credentials: BrokerCredentials): Promise<void> {
    this.credentials = credentials;
    this.connected = true;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async disconnect(): Promise<void> {
    this.credentials = null;
    this.connected = false;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch {
      return false;
    }
  }
  
  needsTokenRefresh(): boolean {
    if (!this.credentials) return true;
    const oauth = this.credentials as any;
    if (!oauth.expiresAt) return false;
    // Refresh if less than 5 minutes until expiry
    return Date.now() > (oauth.expiresAt - 5 * 60 * 1000);
  }
  
  async getPosition(symbol: string, accountId?: string): Promise<Position | null> {
    const positions = await this.getPositions(accountId);
    return positions.find(p => p.symbol === symbol) || null;
  }
  
  async cancelAllOrders(accountId?: string): Promise<void> {
    const orders = await this.getOrders({ status: 'open' }, accountId);
    await Promise.all(orders.map(o => this.cancelOrder(o.id, accountId)));
  }
  
  async modifyOrder(orderId: string, updates: OrderUpdate, accountId?: string): Promise<OrderResponse> {
    // Default implementation: cancel and replace
    await this.cancelOrder(orderId, accountId);
    const originalOrder = await this.getOrder(orderId, accountId);
    return this.placeOrder({
      symbol: originalOrder.symbol,
      side: originalOrder.side,
      type: originalOrder.type,
      quantity: updates.quantity || originalOrder.quantity,
      price: updates.price || originalOrder.price,
      stopPrice: updates.stopPrice || originalOrder.stopPrice,
      timeInForce: updates.timeInForce || originalOrder.timeInForce,
      clientOrderId: updates.clientOrderId
    }, accountId);
  }
  
  async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const quotes = new Map<string, Quote>();
    const results = await Promise.all(symbols.map(s => this.getQuote(s).catch(() => null)));
    symbols.forEach((symbol, i) => {
      if (results[i]) quotes.set(symbol, results[i]!);
    });
    return quotes;
  }
  
  async getLatestBar(symbol: string): Promise<Bar> {
    const bars = await this.getHistoricalBars({
      symbol,
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      timeframe: '1Day',
      limit: 1
    });
    if (bars.length === 0) throw new Error(`No bars found for ${symbol}`);
    return bars[bars.length - 1];
  }
  
  async searchAssets(query: string, _assetClass?: string): Promise<Asset[]> {
    // Default implementation - override in specific adapters
    const asset = await this.getAsset(query).catch(() => null);
    return asset ? [asset] : [];
  }
  
  async isTradable(symbol: string): Promise<boolean> {
    try {
      const asset = await this.getAsset(symbol);
      return asset.tradable;
    } catch {
      return false;
    }
  }
  
  normalizeSymbol(brokerSymbol: string): string {
    // Default: return as-is, override in specific adapters
    return brokerSymbol.toUpperCase();
  }
  
  toBrokerSymbol(normalizedSymbol: string): string {
    // Default: return as-is, override in specific adapters
    return normalizedSymbol.toUpperCase();
  }
}
