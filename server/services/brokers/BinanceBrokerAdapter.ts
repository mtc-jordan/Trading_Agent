/**
 * Binance Broker Adapter
 * 
 * Implements the IBrokerAdapter interface for Binance cryptocurrency exchange.
 * Uses HMAC-SHA256 signature authentication.
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

// Binance API configuration
const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_TESTNET_URL = 'https://testnet.binance.vision';

interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
  testnet?: boolean;
}

interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
  permissions: string[];
}

interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice?: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
}

interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export class BinanceBrokerAdapter extends BaseBrokerAdapter {
  private apiKey: string = '';
  private secretKey: string = '';
  private baseUrl: string = BINANCE_API_URL;
  private accountInfo: BinanceAccountInfo | null = null;

  getBrokerType(): BrokerType {
    return BrokerType.BINANCE;
  }

  getCapabilities(): BrokerCapabilities {
    return {
      supportedAssetClasses: [AssetClass.CRYPTO],
      supportedOrderTypes: [OrderType.MARKET, OrderType.LIMIT, OrderType.STOP, OrderType.STOP_LIMIT],
      supportedTimeInForce: [TimeInForce.DAY, TimeInForce.GTC, TimeInForce.IOC, TimeInForce.FOK],
      supportsExtendedHours: true, // 24/7 crypto trading
      supportsFractionalShares: true,
      supportsShortSelling: true, // Via margin trading
      supportsMarginTrading: true,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true, // Testnet
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 600
    };
  }

  async initialize(credentials: BrokerCredentials): Promise<void> {
    const binanceCredentials = credentials as unknown as BinanceCredentials;
    this.apiKey = binanceCredentials.apiKey;
    this.secretKey = binanceCredentials.secretKey;
    this.baseUrl = binanceCredentials.testnet ? BINANCE_TESTNET_URL : BINANCE_API_URL;
    this.credentials = credentials;
    this.connected = true;
  }

  // ============================================================================
  // Signature Generation
  // ============================================================================

  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  private buildSignedUrl(endpoint: string, params: Record<string, any> = {}): string {
    const timestamp = Date.now();
    const queryParams = new URLSearchParams({
      ...params,
      timestamp: timestamp.toString()
    });
    const queryString = queryParams.toString();
    const signature = this.generateSignature(queryString);
    return `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {},
    signed: boolean = true
  ): Promise<T> {
    let url: string;
    const headers: Record<string, string> = {
      'X-MBX-APIKEY': this.apiKey,
      'Content-Type': 'application/json'
    };

    if (signed) {
      url = this.buildSignedUrl(endpoint, params);
    } else {
      const queryString = new URLSearchParams(params).toString();
      url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    }

    const response = await fetch(url, {
      method,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ msg: response.statusText }));
      throw new Error(`Binance API error: ${error.msg || response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // OAuth (Not applicable for Binance - uses API keys)
  // ============================================================================

  getAuthorizationUrl(_state: string, _isPaper?: boolean): string {
    // Binance uses API keys, not OAuth
    // Return a URL to the Binance API key management page
    return 'https://www.binance.com/en/my/settings/api-management';
  }

  async handleOAuthCallback(_code: string, _state: string, _verifier?: string): Promise<TokenResponse> {
    // Binance doesn't use OAuth - credentials are provided directly
    throw new Error('Binance uses API key authentication, not OAuth');
  }

  async refreshAccessToken(): Promise<TokenResponse> {
    // API keys don't expire in the same way as OAuth tokens
    return {
      accessToken: this.apiKey,
      refreshToken: '',
      expiresIn: 0,
      tokenType: 'apikey'
    };
  }

  // ============================================================================
  // Account Operations
  // ============================================================================

  async getAccounts(): Promise<BrokerAccount[]> {
    const accountInfo = await this.makeRequest<BinanceAccountInfo>('/api/v3/account');
    this.accountInfo = accountInfo;

    // Calculate total balance in USD (approximation using USDT values)
    let totalBalance = 0;
    for (const balance of accountInfo.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      if (free > 0 || locked > 0) {
        if (balance.asset === 'USDT' || balance.asset === 'BUSD' || balance.asset === 'USD') {
          totalBalance += free + locked;
        }
        // For other assets, we'd need to fetch their USD value
      }
    }

    return [{
      id: 'binance-spot',
      accountNumber: 'binance-spot',
      accountType: 'spot',
      currency: 'USD',
      status: accountInfo.canTrade ? 'active' : 'restricted',
      isPaper: this.baseUrl === BINANCE_TESTNET_URL,
      createdAt: new Date(accountInfo.updateTime)
    }];
  }

  async getAccountBalance(_accountId?: string): Promise<AccountBalance> {
    const accountInfo = await this.makeRequest<BinanceAccountInfo>('/api/v3/account');
    this.accountInfo = accountInfo;

    let totalEquity = 0;
    let availableCash = 0;

    for (const balance of accountInfo.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      
      if (balance.asset === 'USDT' || balance.asset === 'BUSD' || balance.asset === 'USD') {
        availableCash += free;
        totalEquity += free + locked;
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
    const accountInfo = await this.makeRequest<BinanceAccountInfo>('/api/v3/account');
    const positions: Position[] = [];

    for (const balance of accountInfo.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      const total = free + locked;

      if (total > 0 && balance.asset !== 'USDT' && balance.asset !== 'BUSD' && balance.asset !== 'USD') {
        // Get current price
        let currentPrice = 0;
        let marketValue = 0;
        
        try {
          const ticker = await this.makeRequest<{ price: string }>(
            '/api/v3/ticker/price',
            'GET',
            { symbol: `${balance.asset}USDT` },
            false
          );
          currentPrice = parseFloat(ticker.price);
          marketValue = total * currentPrice;
        } catch {
          // If no USDT pair exists, skip
          continue;
        }

        positions.push({
          symbol: balance.asset,
          quantity: total,
          side: 'long',
          avgEntryPrice: 0, // Binance doesn't provide average entry price
          currentPrice,
          marketValue,
          costBasis: 0,
          unrealizedPL: 0, // Would need historical data to calculate
          unrealizedPLPercent: 0,
          assetClass: AssetClass.CRYPTO,
          exchange: 'BINANCE'
        });
      }
    }

    return positions;
  }

  // ============================================================================
  // Order Operations
  // ============================================================================

  async placeOrder(order: UnifiedOrder, _accountId?: string): Promise<OrderResponse> {
    const binanceSymbol = this.toBrokerSymbol(order.symbol);
    
    const params: Record<string, any> = {
      symbol: binanceSymbol,
      side: order.side.toUpperCase(),
      type: this.mapOrderType(order.type),
      quantity: order.quantity.toString()
    };

    if (order.type === 'limit' || order.type === 'stop_limit') {
      params.price = order.price!.toString();
      params.timeInForce = this.mapTimeInForce(order.timeInForce || 'gtc');
    }

    if (order.type === 'stop' || order.type === 'stop_limit') {
      params.stopPrice = order.stopPrice!.toString();
    }

    if (order.clientOrderId) {
      params.newClientOrderId = order.clientOrderId;
    }

    const response = await this.makeRequest<BinanceOrder>('/api/v3/order', 'POST', params);

    return this.mapBinanceOrder(response);
  }

  async cancelOrder(orderId: string, _accountId?: string): Promise<void> {
    // orderId format: "symbol:orderId"
    const [symbol, binanceOrderId] = orderId.split(':');
    
    await this.makeRequest('/api/v3/order', 'DELETE', {
      symbol,
      orderId: binanceOrderId
    });
  }

  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    symbols?: string[];
  }, _accountId?: string): Promise<OrderResponse[]> {
    const orders: OrderResponse[] = [];

    if (params?.status === 'open' || params?.status === 'all') {
      // Get open orders
      const openOrders = await this.makeRequest<BinanceOrder[]>('/api/v3/openOrders');
      orders.push(...openOrders.map(o => this.mapBinanceOrder(o)));
    }

    if (params?.status === 'closed' || params?.status === 'all') {
      // Get all orders for each symbol
      const symbols = params?.symbols || ['BTCUSDT', 'ETHUSDT']; // Default symbols
      for (const symbol of symbols) {
        try {
          const allOrders = await this.makeRequest<BinanceOrder[]>('/api/v3/allOrders', 'GET', {
            symbol,
            limit: params?.limit || 100
          });
          const closedOrders = allOrders.filter(o => 
            o.status === 'FILLED' || o.status === 'CANCELED' || o.status === 'EXPIRED'
          );
          orders.push(...closedOrders.map(o => this.mapBinanceOrder(o)));
        } catch {
          // Skip symbols that fail
        }
      }
    }

    return orders;
  }

  async getOrder(orderId: string, _accountId?: string): Promise<OrderResponse> {
    const [symbol, binanceOrderId] = orderId.split(':');
    
    const order = await this.makeRequest<BinanceOrder>('/api/v3/order', 'GET', {
      symbol,
      orderId: binanceOrderId
    });

    return this.mapBinanceOrder(order);
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getQuote(symbol: string): Promise<Quote> {
    const binanceSymbol = this.toBrokerSymbol(symbol);
    
    const ticker = await this.makeRequest<BinanceTicker>(
      '/api/v3/ticker/24hr',
      'GET',
      { symbol: binanceSymbol },
      false
    );

    return {
      symbol: this.normalizeSymbol(ticker.symbol),
      bidPrice: parseFloat(ticker.bidPrice),
      bidSize: parseFloat(ticker.bidQty),
      askPrice: parseFloat(ticker.askPrice),
      askSize: parseFloat(ticker.askQty),
      lastPrice: parseFloat(ticker.lastPrice),
      lastSize: parseFloat(ticker.lastQty),
      volume: parseFloat(ticker.volume),
      timestamp: new Date(ticker.closeTime)
    };
  }

  async getHistoricalBars(params: HistoricalDataParams): Promise<Bar[]> {
    const binanceSymbol = this.toBrokerSymbol(params.symbol);
    const interval = this.mapTimeframe(params.timeframe);

    const requestParams: Record<string, any> = {
      symbol: binanceSymbol,
      interval,
      limit: params.limit || 500
    };

    if (params.start) {
      requestParams.startTime = params.start.getTime();
    }
    if (params.end) {
      requestParams.endTime = params.end.getTime();
    }

    const klines = await this.makeRequest<any[][]>(
      '/api/v3/klines',
      'GET',
      requestParams,
      false
    );

    return klines.map(k => ({
      symbol: params.symbol,
      timestamp: new Date(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      vwap: 0,
      tradeCount: k[8]
    }));
  }

  // ============================================================================
  // Asset Information
  // ============================================================================

  async getAsset(symbol: string): Promise<Asset> {
    const binanceSymbol = this.toBrokerSymbol(symbol);
    
    // Get exchange info for the symbol
    const exchangeInfo = await this.makeRequest<{
      symbols: Array<{
        symbol: string;
        status: string;
        baseAsset: string;
        quoteAsset: string;
        baseAssetPrecision: number;
        quoteAssetPrecision: number;
        filters: any[];
      }>;
    }>('/api/v3/exchangeInfo', 'GET', { symbol: binanceSymbol }, false);

    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === binanceSymbol);
    
    if (!symbolInfo) {
      throw new Error(`Asset not found: ${symbol}`);
    }

    // Find lot size filter for min quantity
    const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    const minQty = lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : 0;

    return {
      id: symbolInfo.symbol,
      symbol: this.normalizeSymbol(symbolInfo.symbol),
      name: `${symbolInfo.baseAsset}/${symbolInfo.quoteAsset}`,
      exchange: 'BINANCE',
      assetClass: AssetClass.CRYPTO,
      status: symbolInfo.status === 'TRADING' ? 'active' : 'inactive',
      tradable: symbolInfo.status === 'TRADING',
      shortable: true,
      marginable: true,
      easyToBorrow: false,
      fractionable: true,
      minOrderSize: minQty,
      minPriceIncrement: Math.pow(10, -symbolInfo.quoteAssetPrecision)
    };
  }

  // ============================================================================
  // Symbol Mapping
  // ============================================================================

  normalizeSymbol(brokerSymbol: string): string {
    // Binance uses pairs like BTCUSDT, normalize to BTC/USDT
    if (brokerSymbol.endsWith('USDT')) {
      return brokerSymbol.replace('USDT', '/USDT');
    }
    if (brokerSymbol.endsWith('BTC')) {
      return brokerSymbol.replace('BTC', '/BTC');
    }
    if (brokerSymbol.endsWith('ETH')) {
      return brokerSymbol.replace('ETH', '/ETH');
    }
    return brokerSymbol;
  }

  toBrokerSymbol(normalizedSymbol: string): string {
    // Convert BTC/USDT to BTCUSDT
    return normalizedSymbol.replace('/', '').toUpperCase();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      [OrderType.MARKET]: 'MARKET',
      [OrderType.LIMIT]: 'LIMIT',
      [OrderType.STOP]: 'STOP_LOSS',
      [OrderType.STOP_LIMIT]: 'STOP_LOSS_LIMIT',
      [OrderType.TRAILING_STOP]: 'TRAILING_STOP_MARKET'
    };
    return mapping[type] || 'MARKET';
  }

  private mapTimeInForce(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      [TimeInForce.DAY]: 'GTC', // Binance doesn't have DAY, use GTC
      [TimeInForce.GTC]: 'GTC',
      [TimeInForce.IOC]: 'IOC',
      [TimeInForce.FOK]: 'FOK',
      [TimeInForce.OPG]: 'GTC',
      [TimeInForce.CLS]: 'GTC'
    };
    return mapping[tif] || 'GTC';
  }

  private mapTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1Min': '1m',
      '5Min': '5m',
      '15Min': '15m',
      '30Min': '30m',
      '1Hour': '1h',
      '4Hour': '4h',
      '1Day': '1d',
      '1Week': '1w',
      '1Month': '1M'
    };
    return mapping[timeframe] || '1d';
  }

  private mapBinanceOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      NEW: OrderStatus.PENDING,
      PARTIALLY_FILLED: OrderStatus.PARTIALLY_FILLED,
      FILLED: OrderStatus.FILLED,
      CANCELED: OrderStatus.CANCELLED,
      PENDING_CANCEL: OrderStatus.PENDING,
      REJECTED: OrderStatus.REJECTED,
      EXPIRED: OrderStatus.EXPIRED
    };
    return mapping[status] || OrderStatus.PENDING;
  }

  private mapBinanceOrder(order: BinanceOrder): OrderResponse {
    return {
      id: `${order.symbol}:${order.orderId}`,
      clientOrderId: order.clientOrderId,
      symbol: this.normalizeSymbol(order.symbol),
      side: order.side.toLowerCase() as OrderSide,
      type: this.mapBinanceOrderType(order.type),
      status: this.mapBinanceOrderStatus(order.status),
      quantity: parseFloat(order.origQty),
      filledQuantity: parseFloat(order.executedQty),
      price: parseFloat(order.price),
      avgFillPrice: parseFloat(order.cummulativeQuoteQty) / parseFloat(order.executedQty) || 0,
      extendedHours: false,
      assetClass: AssetClass.CRYPTO,
      stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
      timeInForce: order.timeInForce.toLowerCase() as TimeInForce,
      createdAt: new Date(order.time),
      updatedAt: new Date(order.updateTime),
      filledAt: order.status === 'FILLED' ? new Date(order.updateTime) : undefined
    };
  }

  private mapBinanceOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      MARKET: OrderType.MARKET,
      LIMIT: OrderType.LIMIT,
      STOP_LOSS: OrderType.STOP,
      STOP_LOSS_LIMIT: OrderType.STOP_LIMIT,
      TAKE_PROFIT: OrderType.STOP,
      TAKE_PROFIT_LIMIT: OrderType.STOP_LIMIT,
      TRAILING_STOP_MARKET: OrderType.TRAILING_STOP
    };
    return mapping[type] || OrderType.MARKET;
  }
}
