/**
 * Unified Broker Types for TradoVerse
 * 
 * This module defines the core types and interfaces for the broker abstraction layer.
 * All broker adapters must implement these interfaces to ensure consistency.
 */

// ============================================================================
// Enums
// ============================================================================

export enum BrokerType {
  ALPACA = 'alpaca',
  INTERACTIVE_BROKERS = 'interactive_brokers',
  BINANCE = 'binance',
  COINBASE = 'coinbase'
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit',
  TRAILING_STOP = 'trailing_stop'
}

export enum TimeInForce {
  DAY = 'day',
  GTC = 'gtc',      // Good Till Cancelled
  IOC = 'ioc',      // Immediate Or Cancel
  FOK = 'fok',      // Fill Or Kill
  OPG = 'opg',      // Market On Open
  CLS = 'cls'       // Market On Close
}

export enum OrderStatus {
  NEW = 'new',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REPLACED = 'replaced'
}

export enum AssetClass {
  US_EQUITY = 'us_equity',
  CRYPTO = 'crypto',
  FOREX = 'forex',
  OPTIONS = 'options',
  FUTURES = 'futures'
}

export enum BrokerErrorCode {
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_SYMBOL = 'invalid_symbol',
  MARKET_CLOSED = 'market_closed',
  ORDER_REJECTED = 'order_rejected',
  RATE_LIMITED = 'rate_limited',
  AUTHENTICATION_FAILED = 'authentication_failed',
  CONNECTION_ERROR = 'connection_error',
  INVALID_ORDER = 'invalid_order',
  POSITION_NOT_FOUND = 'position_not_found',
  UNKNOWN_ERROR = 'unknown_error'
}

// ============================================================================
// Credential Types
// ============================================================================

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

export interface OAuth1Credentials extends OAuthCredentials {
  consumerKey: string;
  consumerSecret?: string;
  accessTokenSecret?: string;
  liveSessionToken?: string;
  liveSessionTokenExpiry?: number;
  dhChallenge?: string;
}

export interface ApiKeyCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;  // For Coinbase
}

export type BrokerCredentials = OAuthCredentials | OAuth1Credentials | ApiKeyCredentials;

export interface BrokerConnection {
  id: string;
  userId: string;
  brokerType: BrokerType;
  credentials: BrokerCredentials;
  isPaper: boolean;
  isActive: boolean;
  lastConnected?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Account Types
// ============================================================================

export interface BrokerAccount {
  id: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  status: string;
  isPaper: boolean;
  createdAt?: Date;
}

export interface AccountBalance {
  currency: string;
  cash: number;
  cashAvailable: number;
  cashWithdrawable: number;
  buyingPower: number;
  portfolioValue: number;
  equity: number;
  lastEquity: number;
  longMarketValue: number;
  shortMarketValue: number;
  initialMargin: number;
  maintenanceMargin: number;
  dayTradeCount?: number;
  patternDayTrader?: boolean;
}

export interface Position {
  symbol: string;
  quantity: number;
  side: 'long' | 'short';
  avgEntryPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  currentPrice: number;
  lastDayPrice?: number;
  changeToday?: number;
  assetClass: AssetClass;
  exchange?: string;
}

// ============================================================================
// Order Types
// ============================================================================

export interface UnifiedOrder {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;           // For limit orders
  stopPrice?: number;       // For stop orders
  trailPercent?: number;    // For trailing stop
  trailPrice?: number;      // For trailing stop
  timeInForce: TimeInForce;
  extendedHours?: boolean;
  clientOrderId?: string;
  orderClass?: 'simple' | 'bracket' | 'oco' | 'oto';
  takeProfit?: {
    limitPrice: number;
  };
  stopLoss?: {
    stopPrice: number;
    limitPrice?: number;
  };
}

export interface OrderResponse {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  avgFillPrice?: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  extendedHours: boolean;
  createdAt: Date;
  updatedAt: Date;
  filledAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;
  failedAt?: Date;
  assetClass: AssetClass;
  legs?: OrderResponse[];
}

export interface OrderUpdate {
  orderId: string;
  quantity?: number;
  price?: number;
  stopPrice?: number;
  trailPercent?: number;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

// ============================================================================
// Market Data Types
// ============================================================================

export interface Quote {
  symbol: string;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
  lastPrice: number;
  lastSize: number;
  volume: number;
  timestamp: Date;
}

export interface Bar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  tradeCount?: number;
}

export interface HistoricalDataParams {
  symbol: string;
  start: Date;
  end?: Date;
  timeframe: '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | '4Hour' | '1Day' | '1Week' | '1Month';
  limit?: number;
  adjustment?: 'raw' | 'split' | 'dividend' | 'all';
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  assetClass: AssetClass;
  status: 'active' | 'inactive';
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easyToBorrow: boolean;
  fractionable: boolean;
  minOrderSize?: number;
  minPriceIncrement?: number;
  priceScale?: number;
}

// ============================================================================
// OAuth Types
// ============================================================================

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  isPaper?: boolean;
}

export interface OAuth1Config extends OAuthConfig {
  consumerKey: string;
  privateKey: string;
  realm: string;
  requestTokenUrl: string;
  accessTokenUrl: string;
  liveSessionTokenUrl: string;
}

export interface OAuthState {
  state: string;
  codeVerifier?: string;  // For PKCE
  brokerType: BrokerType;
  userId: string;
  isPaper: boolean;
  createdAt: Date;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
  isPaper?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class BrokerError extends Error {
  constructor(
    public code: BrokerErrorCode,
    message: string,
    public brokerType: BrokerType,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BrokerError';
  }
}

// ============================================================================
// Callback Types
// ============================================================================

export type QuoteCallback = (quote: Quote) => void;
export type OrderUpdateCallback = (order: OrderResponse) => void;
export type PositionUpdateCallback = (position: Position) => void;
export type BarCallback = (bar: Bar) => void;

// ============================================================================
// Broker Capabilities
// ============================================================================

export interface BrokerCapabilities {
  supportedAssetClasses: AssetClass[];
  supportedOrderTypes: OrderType[];
  supportedTimeInForce: TimeInForce[];
  supportsExtendedHours: boolean;
  supportsFractionalShares: boolean;
  supportsShortSelling: boolean;
  supportsMarginTrading: boolean;
  supportsOptionsTrading: boolean;
  supportsCryptoTrading: boolean;
  supportsForexTrading: boolean;
  supportsPaperTrading: boolean;
  supportsWebSocket: boolean;
  supportsStreamingQuotes: boolean;
  supportsStreamingBars: boolean;
  supportsStreamingTrades: boolean;
  maxOrdersPerMinute?: number;
  maxPositions?: number;
}

// ============================================================================
// Broker Info
// ============================================================================

export interface BrokerInfo {
  type: BrokerType;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  documentationUrl: string;
  capabilities: BrokerCapabilities;
  authType: 'oauth2' | 'oauth1' | 'api_key';
  requiresApproval: boolean;
  approvalUrl?: string;
  supportedRegions: string[];
}
