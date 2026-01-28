/**
 * Exchange Service
 * 
 * Unified interface for interacting with multiple crypto exchanges
 * including Binance, Bybit, and dYdX for funding rates, market data,
 * and order execution.
 */

import crypto from 'crypto';

export type ExchangeId = 'binance' | 'bybit' | 'dydx' | 'okx' | 'hyperliquid';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For some exchanges like OKX
  testnet?: boolean;
}

export interface FundingRate {
  exchange: ExchangeId;
  symbol: string;
  fundingRate: number;
  fundingRateAnnualized: number;
  nextFundingTime: number;
  markPrice: number;
  indexPrice: number;
  timestamp: number;
}

export interface PerpetualMarket {
  exchange: ExchangeId;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  contractType: 'perpetual' | 'quarterly' | 'bi-quarterly';
  tickSize: number;
  lotSize: number;
  maxLeverage: number;
  fundingInterval: number; // hours
  isActive: boolean;
}

export interface OrderBook {
  exchange: ExchangeId;
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

export interface Position {
  exchange: ExchangeId;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number;
  marginType: 'cross' | 'isolated';
}

export interface Order {
  exchange: ExchangeId;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_market' | 'stop_limit';
  status: 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected';
  price?: number;
  stopPrice?: number;
  quantity: number;
  filledQuantity: number;
  avgPrice: number;
  timestamp: number;
}

export interface ExchangeBalance {
  exchange: ExchangeId;
  asset: string;
  available: number;
  locked: number;
  total: number;
  unrealizedPnl: number;
}

abstract class BaseExchangeClient {
  protected credentials?: ExchangeCredentials;
  protected baseUrl: string;
  protected testnetUrl?: string;
  
  constructor(credentials?: ExchangeCredentials) {
    this.credentials = credentials;
    this.baseUrl = '';
  }

  protected getUrl(): string {
    return this.credentials?.testnet && this.testnetUrl 
      ? this.testnetUrl 
      : this.baseUrl;
  }

  abstract get exchangeId(): ExchangeId;
  abstract getFundingRate(symbol: string): Promise<FundingRate | null>;
  abstract getAllFundingRates(): Promise<FundingRate[]>;
  abstract getMarkets(): Promise<PerpetualMarket[]>;
  abstract getOrderBook(symbol: string, limit?: number): Promise<OrderBook | null>;
  
  // Authenticated endpoints
  abstract getPositions(): Promise<Position[]>;
  abstract getBalances(): Promise<ExchangeBalance[]>;
  abstract placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    price?: number;
    reduceOnly?: boolean;
  }): Promise<Order | null>;
  abstract cancelOrder(symbol: string, orderId: string): Promise<boolean>;
}

/**
 * Binance Futures Client
 */
class BinanceClient extends BaseExchangeClient {
  constructor(credentials?: ExchangeCredentials) {
    super(credentials);
    this.baseUrl = 'https://fapi.binance.com';
    this.testnetUrl = 'https://testnet.binancefuture.com';
  }

  get exchangeId(): ExchangeId {
    return 'binance';
  }

  private sign(queryString: string): string {
    if (!this.credentials) throw new Error('Credentials required');
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params?: Record<string, any>,
    signed: boolean = false
  ): Promise<T | null> {
    try {
      let url = `${this.getUrl()}${endpoint}`;
      const headers: Record<string, string> = {};

      if (this.credentials?.apiKey) {
        headers['X-MBX-APIKEY'] = this.credentials.apiKey;
      }

      let queryString = params 
        ? Object.entries(params)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&')
        : '';

      if (signed && this.credentials) {
        const timestamp = Date.now();
        queryString += queryString ? `&timestamp=${timestamp}` : `timestamp=${timestamp}`;
        const signature = this.sign(queryString);
        queryString += `&signature=${signature}`;
      }

      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetch(url, { method, headers });
      if (!response.ok) {
        const error = await response.text();
        console.error(`[Binance] API error: ${error}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[Binance] Request error:`, error);
      return null;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate | null> {
    const data = await this.request<any>('/fapi/v1/premiumIndex', 'GET', { symbol });
    if (!data) return null;

    const rate = parseFloat(data.lastFundingRate);
    return {
      exchange: 'binance',
      symbol: data.symbol,
      fundingRate: rate,
      fundingRateAnnualized: rate * 3 * 365 * 100, // 8-hour funding, annualized %
      nextFundingTime: data.nextFundingTime,
      markPrice: parseFloat(data.markPrice),
      indexPrice: parseFloat(data.indexPrice),
      timestamp: data.time
    };
  }

  async getAllFundingRates(): Promise<FundingRate[]> {
    const data = await this.request<any[]>('/fapi/v1/premiumIndex');
    if (!data) return [];

    return data.map(d => {
      const rate = parseFloat(d.lastFundingRate);
      return {
        exchange: 'binance' as ExchangeId,
        symbol: d.symbol,
        fundingRate: rate,
        fundingRateAnnualized: rate * 3 * 365 * 100,
        nextFundingTime: d.nextFundingTime,
        markPrice: parseFloat(d.markPrice),
        indexPrice: parseFloat(d.indexPrice),
        timestamp: d.time
      };
    });
  }

  async getMarkets(): Promise<PerpetualMarket[]> {
    const data = await this.request<any>('/fapi/v1/exchangeInfo');
    if (!data?.symbols) return [];

    return data.symbols
      .filter((s: any) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
      .map((s: any) => ({
        exchange: 'binance' as ExchangeId,
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        contractType: 'perpetual' as const,
        tickSize: parseFloat(s.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.tickSize || '0.01'),
        lotSize: parseFloat(s.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.stepSize || '0.001'),
        maxLeverage: 125, // Binance max
        fundingInterval: 8,
        isActive: true
      }));
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook | null> {
    const data = await this.request<any>('/fapi/v1/depth', 'GET', { symbol, limit });
    if (!data) return null;

    return {
      exchange: 'binance',
      symbol,
      bids: data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: Date.now()
    };
  }

  async getPositions(): Promise<Position[]> {
    const data = await this.request<any[]>('/fapi/v2/positionRisk', 'GET', {}, true);
    if (!data) return [];

    return data
      .filter(p => parseFloat(p.positionAmt) !== 0)
      .map(p => ({
        exchange: 'binance' as ExchangeId,
        symbol: p.symbol,
        side: parseFloat(p.positionAmt) > 0 ? 'long' as const : 'short' as const,
        size: Math.abs(parseFloat(p.positionAmt)),
        entryPrice: parseFloat(p.entryPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unRealizedProfit),
        leverage: parseFloat(p.leverage),
        liquidationPrice: parseFloat(p.liquidationPrice),
        marginType: p.marginType.toLowerCase() as 'cross' | 'isolated'
      }));
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    const data = await this.request<any>('/fapi/v2/account', 'GET', {}, true);
    if (!data?.assets) return [];

    return data.assets
      .filter((a: any) => parseFloat(a.walletBalance) > 0)
      .map((a: any) => ({
        exchange: 'binance' as ExchangeId,
        asset: a.asset,
        available: parseFloat(a.availableBalance),
        locked: parseFloat(a.walletBalance) - parseFloat(a.availableBalance),
        total: parseFloat(a.walletBalance),
        unrealizedPnl: parseFloat(a.unrealizedProfit)
      }));
  }

  async placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    price?: number;
    reduceOnly?: boolean;
  }): Promise<Order | null> {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side.toUpperCase(),
      type: params.type.toUpperCase(),
      quantity: params.quantity.toString()
    };

    if (params.type === 'limit' && params.price) {
      orderParams.price = params.price.toString();
      orderParams.timeInForce = 'GTC';
    }

    if (params.reduceOnly) {
      orderParams.reduceOnly = 'true';
    }

    const data = await this.request<any>('/fapi/v1/order', 'POST', orderParams, true);
    if (!data) return null;

    return {
      exchange: 'binance',
      orderId: data.orderId.toString(),
      symbol: data.symbol,
      side: data.side.toLowerCase() as 'buy' | 'sell',
      type: data.type.toLowerCase() as Order['type'],
      status: data.status.toLowerCase() as Order['status'],
      price: parseFloat(data.price),
      quantity: parseFloat(data.origQty),
      filledQuantity: parseFloat(data.executedQty),
      avgPrice: parseFloat(data.avgPrice),
      timestamp: data.updateTime
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    const data = await this.request<any>('/fapi/v1/order', 'DELETE', { symbol, orderId }, true);
    return data !== null;
  }
}

/**
 * Bybit Client
 */
class BybitClient extends BaseExchangeClient {
  constructor(credentials?: ExchangeCredentials) {
    super(credentials);
    this.baseUrl = 'https://api.bybit.com';
    this.testnetUrl = 'https://api-testnet.bybit.com';
  }

  get exchangeId(): ExchangeId {
    return 'bybit';
  }

  private sign(timestamp: string, params: string): string {
    if (!this.credentials) throw new Error('Credentials required');
    const signString = `${timestamp}${this.credentials.apiKey}5000${params}`;
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(signString)
      .digest('hex');
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params?: Record<string, any>,
    signed: boolean = false
  ): Promise<T | null> {
    try {
      let url = `${this.getUrl()}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      let queryString = params
        ? Object.entries(params)
            .filter(([_, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';

      if (signed && this.credentials) {
        const timestamp = Date.now().toString();
        headers['X-BAPI-API-KEY'] = this.credentials.apiKey;
        headers['X-BAPI-TIMESTAMP'] = timestamp;
        headers['X-BAPI-RECV-WINDOW'] = '5000';
        headers['X-BAPI-SIGN'] = this.sign(timestamp, queryString);
      }

      if (method === 'GET' && queryString) {
        url += `?${queryString}`;
      }

      const options: RequestInit = { method, headers };
      if (method === 'POST' && params) {
        options.body = JSON.stringify(params);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (data.retCode !== 0) {
        console.error(`[Bybit] API error: ${data.retMsg}`);
        return null;
      }

      return data.result;
    } catch (error) {
      console.error(`[Bybit] Request error:`, error);
      return null;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate | null> {
    const data = await this.request<any>('/v5/market/tickers', 'GET', {
      category: 'linear',
      symbol
    });

    if (!data?.list?.[0]) return null;

    const ticker = data.list[0];
    const rate = parseFloat(ticker.fundingRate);

    return {
      exchange: 'bybit',
      symbol: ticker.symbol,
      fundingRate: rate,
      fundingRateAnnualized: rate * 3 * 365 * 100,
      nextFundingTime: parseInt(ticker.nextFundingTime),
      markPrice: parseFloat(ticker.markPrice),
      indexPrice: parseFloat(ticker.indexPrice),
      timestamp: Date.now()
    };
  }

  async getAllFundingRates(): Promise<FundingRate[]> {
    const data = await this.request<any>('/v5/market/tickers', 'GET', {
      category: 'linear'
    });

    if (!data?.list) return [];

    return data.list
      .filter((t: any) => t.fundingRate)
      .map((t: any) => {
        const rate = parseFloat(t.fundingRate);
        return {
          exchange: 'bybit' as ExchangeId,
          symbol: t.symbol,
          fundingRate: rate,
          fundingRateAnnualized: rate * 3 * 365 * 100,
          nextFundingTime: parseInt(t.nextFundingTime),
          markPrice: parseFloat(t.markPrice),
          indexPrice: parseFloat(t.indexPrice),
          timestamp: Date.now()
        };
      });
  }

  async getMarkets(): Promise<PerpetualMarket[]> {
    const data = await this.request<any>('/v5/market/instruments-info', 'GET', {
      category: 'linear'
    });

    if (!data?.list) return [];

    return data.list
      .filter((s: any) => s.status === 'Trading')
      .map((s: any) => ({
        exchange: 'bybit' as ExchangeId,
        symbol: s.symbol,
        baseAsset: s.baseCoin,
        quoteAsset: s.quoteCoin,
        contractType: 'perpetual' as const,
        tickSize: parseFloat(s.priceFilter?.tickSize || '0.01'),
        lotSize: parseFloat(s.lotSizeFilter?.qtyStep || '0.001'),
        maxLeverage: parseFloat(s.leverageFilter?.maxLeverage || '100'),
        fundingInterval: 8,
        isActive: true
      }));
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook | null> {
    const data = await this.request<any>('/v5/market/orderbook', 'GET', {
      category: 'linear',
      symbol,
      limit
    });

    if (!data) return null;

    return {
      exchange: 'bybit',
      symbol,
      bids: data.b.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: data.a.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: parseInt(data.ts)
    };
  }

  async getPositions(): Promise<Position[]> {
    const data = await this.request<any>('/v5/position/list', 'GET', {
      category: 'linear',
      settleCoin: 'USDT'
    }, true);

    if (!data?.list) return [];

    return data.list
      .filter((p: any) => parseFloat(p.size) > 0)
      .map((p: any) => ({
        exchange: 'bybit' as ExchangeId,
        symbol: p.symbol,
        side: p.side.toLowerCase() as 'long' | 'short',
        size: parseFloat(p.size),
        entryPrice: parseFloat(p.avgPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealisedPnl),
        leverage: parseFloat(p.leverage),
        liquidationPrice: parseFloat(p.liqPrice),
        marginType: p.tradeMode === 0 ? 'cross' as const : 'isolated' as const
      }));
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    const data = await this.request<any>('/v5/account/wallet-balance', 'GET', {
      accountType: 'UNIFIED'
    }, true);

    if (!data?.list?.[0]?.coin) return [];

    return data.list[0].coin
      .filter((c: any) => parseFloat(c.walletBalance) > 0)
      .map((c: any) => ({
        exchange: 'bybit' as ExchangeId,
        asset: c.coin,
        available: parseFloat(c.availableToWithdraw),
        locked: parseFloat(c.walletBalance) - parseFloat(c.availableToWithdraw),
        total: parseFloat(c.walletBalance),
        unrealizedPnl: parseFloat(c.unrealisedPnl)
      }));
  }

  async placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    price?: number;
    reduceOnly?: boolean;
  }): Promise<Order | null> {
    const orderParams: Record<string, any> = {
      category: 'linear',
      symbol: params.symbol,
      side: params.side.charAt(0).toUpperCase() + params.side.slice(1),
      orderType: params.type.charAt(0).toUpperCase() + params.type.slice(1),
      qty: params.quantity.toString()
    };

    if (params.type === 'limit' && params.price) {
      orderParams.price = params.price.toString();
      orderParams.timeInForce = 'GTC';
    }

    if (params.reduceOnly) {
      orderParams.reduceOnly = true;
    }

    const data = await this.request<any>('/v5/order/create', 'POST', orderParams, true);
    if (!data) return null;

    return {
      exchange: 'bybit',
      orderId: data.orderId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: 'new',
      price: params.price,
      quantity: params.quantity,
      filledQuantity: 0,
      avgPrice: 0,
      timestamp: Date.now()
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    const data = await this.request<any>('/v5/order/cancel', 'POST', {
      category: 'linear',
      symbol,
      orderId
    }, true);
    return data !== null;
  }
}

/**
 * dYdX Client (V4 - Decentralized)
 */
class DydxClient extends BaseExchangeClient {
  constructor(credentials?: ExchangeCredentials) {
    super(credentials);
    this.baseUrl = 'https://indexer.dydx.trade/v4';
    this.testnetUrl = 'https://indexer.v4testnet.dydx.exchange/v4';
  }

  get exchangeId(): ExchangeId {
    return 'dydx';
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T | null> {
    try {
      let url = `${this.getUrl()}${endpoint}`;
      
      if (params) {
        const queryString = Object.entries(params)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join('&');
        if (queryString) url += `?${queryString}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[dYdX] API error: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[dYdX] Request error:`, error);
      return null;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate | null> {
    // dYdX uses different symbol format (e.g., BTC-USD instead of BTCUSDT)
    const dydxSymbol = symbol.replace('USDT', '-USD').replace('USD', '-USD');
    
    const data = await this.request<any>(`/perpetualMarkets/${dydxSymbol}`);
    if (!data?.market) return null;

    const market = data.market;
    const rate = parseFloat(market.nextFundingRate || '0');

    return {
      exchange: 'dydx',
      symbol: market.ticker,
      fundingRate: rate,
      fundingRateAnnualized: rate * 24 * 365 * 100, // 1-hour funding on dYdX
      nextFundingTime: Date.now() + 3600000, // Approximate
      markPrice: parseFloat(market.oraclePrice),
      indexPrice: parseFloat(market.oraclePrice),
      timestamp: Date.now()
    };
  }

  async getAllFundingRates(): Promise<FundingRate[]> {
    const data = await this.request<any>('/perpetualMarkets');
    if (!data?.markets) return [];

    return Object.values(data.markets).map((market: any) => {
      const rate = parseFloat(market.nextFundingRate || '0');
      return {
        exchange: 'dydx' as ExchangeId,
        symbol: market.ticker,
        fundingRate: rate,
        fundingRateAnnualized: rate * 24 * 365 * 100,
        nextFundingTime: Date.now() + 3600000,
        markPrice: parseFloat(market.oraclePrice),
        indexPrice: parseFloat(market.oraclePrice),
        timestamp: Date.now()
      };
    });
  }

  async getMarkets(): Promise<PerpetualMarket[]> {
    const data = await this.request<any>('/perpetualMarkets');
    if (!data?.markets) return [];

    return Object.values(data.markets).map((m: any) => ({
      exchange: 'dydx' as ExchangeId,
      symbol: m.ticker,
      baseAsset: m.baseAsset,
      quoteAsset: 'USD',
      contractType: 'perpetual' as const,
      tickSize: parseFloat(m.tickSize),
      lotSize: parseFloat(m.stepSize),
      maxLeverage: 20, // dYdX max
      fundingInterval: 1, // 1-hour funding
      isActive: m.status === 'ACTIVE'
    }));
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook | null> {
    const dydxSymbol = symbol.replace('USDT', '-USD').replace('USD', '-USD');
    const data = await this.request<any>(`/orderbooks/perpetualMarket/${dydxSymbol}`);
    if (!data) return null;

    return {
      exchange: 'dydx',
      symbol,
      bids: (data.bids || []).slice(0, limit).map((b: any) => [parseFloat(b.price), parseFloat(b.size)]),
      asks: (data.asks || []).slice(0, limit).map((a: any) => [parseFloat(a.price), parseFloat(a.size)]),
      timestamp: Date.now()
    };
  }

  // dYdX V4 requires on-chain transactions for trading
  // These methods return empty/null as they require wallet integration
  async getPositions(): Promise<Position[]> {
    // Requires wallet address and subaccount
    return [];
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    // Requires wallet address
    return [];
  }

  async placeOrder(): Promise<Order | null> {
    // Requires on-chain transaction
    console.warn('[dYdX] Order placement requires wallet integration');
    return null;
  }

  async cancelOrder(): Promise<boolean> {
    // Requires on-chain transaction
    console.warn('[dYdX] Order cancellation requires wallet integration');
    return false;
  }
}

/**
 * Unified Exchange Service
 */
export class ExchangeService {
  private clients: Map<ExchangeId, BaseExchangeClient> = new Map();
  private credentials: Map<ExchangeId, ExchangeCredentials> = new Map();

  constructor() {
    // Initialize clients without credentials (public endpoints only)
    this.clients.set('binance', new BinanceClient());
    this.clients.set('bybit', new BybitClient());
    this.clients.set('dydx', new DydxClient());
  }

  /**
   * Set credentials for an exchange
   */
  setCredentials(exchange: ExchangeId, credentials: ExchangeCredentials): void {
    this.credentials.set(exchange, credentials);
    
    // Reinitialize client with credentials
    switch (exchange) {
      case 'binance':
        this.clients.set('binance', new BinanceClient(credentials));
        break;
      case 'bybit':
        this.clients.set('bybit', new BybitClient(credentials));
        break;
      case 'dydx':
        this.clients.set('dydx', new DydxClient(credentials));
        break;
    }
  }

  /**
   * Check if exchange has credentials
   */
  hasCredentials(exchange: ExchangeId): boolean {
    return this.credentials.has(exchange);
  }

  /**
   * Get client for exchange
   */
  getClient(exchange: ExchangeId): BaseExchangeClient | undefined {
    return this.clients.get(exchange);
  }

  /**
   * Get funding rate from specific exchange
   */
  async getFundingRate(exchange: ExchangeId, symbol: string): Promise<FundingRate | null> {
    const client = this.clients.get(exchange);
    if (!client) return null;
    return client.getFundingRate(symbol);
  }

  /**
   * Get all funding rates from specific exchange
   */
  async getAllFundingRates(exchange: ExchangeId): Promise<FundingRate[]> {
    const client = this.clients.get(exchange);
    if (!client) return [];
    return client.getAllFundingRates();
  }

  /**
   * Get funding rates from all exchanges for a symbol
   */
  async getAggregatedFundingRates(symbol: string): Promise<FundingRate[]> {
    const results = await Promise.all(
      Array.from(this.clients.entries()).map(async ([_, client]) => {
        try {
          return await client.getFundingRate(symbol);
        } catch {
          return null;
        }
      })
    );

    return results.filter((r): r is FundingRate => r !== null);
  }

  /**
   * Get all funding rates from all exchanges
   */
  async getAllAggregatedFundingRates(): Promise<Map<ExchangeId, FundingRate[]>> {
    const results = new Map<ExchangeId, FundingRate[]>();

    await Promise.all(
      Array.from(this.clients.entries()).map(async ([id, client]) => {
        try {
          const rates = await client.getAllFundingRates();
          results.set(id, rates);
        } catch {
          results.set(id, []);
        }
      })
    );

    return results;
  }

  /**
   * Get markets from all exchanges
   */
  async getAllMarkets(): Promise<Map<ExchangeId, PerpetualMarket[]>> {
    const results = new Map<ExchangeId, PerpetualMarket[]>();

    await Promise.all(
      Array.from(this.clients.entries()).map(async ([id, client]) => {
        try {
          const markets = await client.getMarkets();
          results.set(id, markets);
        } catch {
          results.set(id, []);
        }
      })
    );

    return results;
  }

  /**
   * Get order book from specific exchange
   */
  async getOrderBook(exchange: ExchangeId, symbol: string, limit?: number): Promise<OrderBook | null> {
    const client = this.clients.get(exchange);
    if (!client) return null;
    return client.getOrderBook(symbol, limit);
  }

  /**
   * Get positions from specific exchange (requires credentials)
   */
  async getPositions(exchange: ExchangeId): Promise<Position[]> {
    const client = this.clients.get(exchange);
    if (!client || !this.hasCredentials(exchange)) return [];
    return client.getPositions();
  }

  /**
   * Get balances from specific exchange (requires credentials)
   */
  async getBalances(exchange: ExchangeId): Promise<ExchangeBalance[]> {
    const client = this.clients.get(exchange);
    if (!client || !this.hasCredentials(exchange)) return [];
    return client.getBalances();
  }

  /**
   * Place order on specific exchange (requires credentials)
   */
  async placeOrder(
    exchange: ExchangeId,
    params: {
      symbol: string;
      side: 'buy' | 'sell';
      type: 'market' | 'limit';
      quantity: number;
      price?: number;
      reduceOnly?: boolean;
    }
  ): Promise<Order | null> {
    const client = this.clients.get(exchange);
    if (!client || !this.hasCredentials(exchange)) {
      console.error(`[ExchangeService] No credentials for ${exchange}`);
      return null;
    }
    return client.placeOrder(params);
  }

  /**
   * Cancel order on specific exchange (requires credentials)
   */
  async cancelOrder(exchange: ExchangeId, symbol: string, orderId: string): Promise<boolean> {
    const client = this.clients.get(exchange);
    if (!client || !this.hasCredentials(exchange)) return false;
    return client.cancelOrder(symbol, orderId);
  }

  /**
   * Get list of supported exchanges
   */
  getSupportedExchanges(): ExchangeId[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Test connection to exchange
   */
  async testConnection(exchange: ExchangeId): Promise<boolean> {
    try {
      const client = this.clients.get(exchange);
      if (!client) return false;

      const markets = await client.getMarkets();
      return markets.length > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const exchangeService = new ExchangeService();
