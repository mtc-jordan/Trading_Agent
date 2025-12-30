/**
 * Multi-Exchange Integration Service
 * Connect to Binance, Coinbase, Alpaca, and Interactive Brokers
 */

// Types
export type ExchangeType = 'binance' | 'coinbase' | 'alpaca' | 'interactive_brokers';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For Coinbase
  accountId?: string; // For IBKR
}

export interface ExchangeConnection {
  id: string;
  userId: string;
  exchange: ExchangeType;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  error?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
}

export interface ExchangePosition {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  marketValue: number;
}

export interface ExchangeOrder {
  id: string;
  exchangeOrderId: string;
  exchange: ExchangeType;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  filledQuantity: number;
  avgFillPrice?: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExchangeInfo {
  name: string;
  type: ExchangeType;
  description: string;
  supportedFeatures: string[];
  authMethod: 'api_key' | 'oauth';
  oauthUrl?: string;
  apiDocsUrl: string;
  logoUrl?: string;
  tradingFees: {
    maker: number;
    taker: number;
  };
  minimumOrderSize: number;
  supportedAssets: 'crypto' | 'stocks' | 'both';
}

// Exchange information
export const EXCHANGE_INFO: Record<ExchangeType, ExchangeInfo> = {
  binance: {
    name: 'Binance',
    type: 'binance',
    description: 'World\'s largest cryptocurrency exchange by trading volume',
    supportedFeatures: ['spot', 'futures', 'margin', 'staking'],
    authMethod: 'api_key',
    apiDocsUrl: 'https://binance-docs.github.io/apidocs/',
    tradingFees: { maker: 0.1, taker: 0.1 },
    minimumOrderSize: 10,
    supportedAssets: 'crypto',
  },
  coinbase: {
    name: 'Coinbase',
    type: 'coinbase',
    description: 'US-based cryptocurrency exchange with strong regulatory compliance',
    supportedFeatures: ['spot', 'staking', 'earn'],
    authMethod: 'oauth',
    oauthUrl: 'https://www.coinbase.com/oauth/authorize',
    apiDocsUrl: 'https://docs.cloud.coinbase.com/',
    tradingFees: { maker: 0.4, taker: 0.6 },
    minimumOrderSize: 1,
    supportedAssets: 'crypto',
  },
  alpaca: {
    name: 'Alpaca',
    type: 'alpaca',
    description: 'Commission-free stock and crypto trading API',
    supportedFeatures: ['stocks', 'crypto', 'fractional', 'paper_trading'],
    authMethod: 'api_key',
    apiDocsUrl: 'https://alpaca.markets/docs/api-documentation/',
    tradingFees: { maker: 0, taker: 0 },
    minimumOrderSize: 1,
    supportedAssets: 'both',
  },
  interactive_brokers: {
    name: 'Interactive Brokers',
    type: 'interactive_brokers',
    description: 'Professional-grade trading platform with global market access',
    supportedFeatures: ['stocks', 'options', 'futures', 'forex', 'bonds'],
    authMethod: 'oauth',
    oauthUrl: 'https://www.interactivebrokers.com/oauth',
    apiDocsUrl: 'https://www.interactivebrokers.com/api',
    tradingFees: { maker: 0.005, taker: 0.005 },
    minimumOrderSize: 1,
    supportedAssets: 'stocks',
  },
};

// In-memory storage for connections
const connectionsStore: Map<string, ExchangeConnection[]> = new Map();
const credentialsStore: Map<string, ExchangeCredentials> = new Map(); // connectionId -> credentials

/**
 * Get available exchanges
 */
export function getAvailableExchanges(): ExchangeInfo[] {
  return Object.values(EXCHANGE_INFO);
}

/**
 * Get exchange info by type
 */
export function getExchangeInfo(exchange: ExchangeType): ExchangeInfo {
  return EXCHANGE_INFO[exchange];
}

/**
 * Connect to an exchange with API credentials
 */
export async function connectExchange(
  userId: string,
  exchange: ExchangeType,
  credentials: ExchangeCredentials
): Promise<ExchangeConnection> {
  // Validate credentials format
  if (!credentials.apiKey || !credentials.apiSecret) {
    throw new Error('API key and secret are required');
  }
  
  // Validate based on exchange
  if (exchange === 'coinbase' && !credentials.passphrase) {
    throw new Error('Passphrase is required for Coinbase');
  }
  
  const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Simulate API validation
  const isValid = await validateCredentials(exchange, credentials);
  
  const connection: ExchangeConnection = {
    id,
    userId,
    exchange,
    status: isValid ? 'connected' : 'error',
    error: isValid ? undefined : 'Invalid API credentials',
    permissions: isValid ? getDefaultPermissions(exchange) : [],
    lastSyncAt: isValid ? new Date() : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Store connection
  const userConnections = connectionsStore.get(userId) || [];
  userConnections.push(connection);
  connectionsStore.set(userId, userConnections);
  
  // Store credentials (encrypted in production)
  if (isValid) {
    credentialsStore.set(id, credentials);
  }
  
  return connection;
}

/**
 * Validate API credentials
 */
async function validateCredentials(
  exchange: ExchangeType,
  credentials: ExchangeCredentials
): Promise<boolean> {
  // In production, this would make actual API calls to validate
  // For now, simulate validation with basic checks
  
  switch (exchange) {
    case 'binance':
      // Binance API keys are 64 characters
      return credentials.apiKey.length >= 32 && credentials.apiSecret.length >= 32;
    case 'coinbase':
      // Coinbase requires passphrase
      return credentials.apiKey.length >= 16 && 
             credentials.apiSecret.length >= 16 && 
             !!credentials.passphrase;
    case 'alpaca':
      // Alpaca API keys start with specific prefixes
      return credentials.apiKey.length >= 16 && credentials.apiSecret.length >= 16;
    case 'interactive_brokers':
      // IBKR requires account ID
      return credentials.apiKey.length >= 8 && !!credentials.accountId;
    default:
      return false;
  }
}

/**
 * Get default permissions based on exchange
 */
function getDefaultPermissions(exchange: ExchangeType): string[] {
  switch (exchange) {
    case 'binance':
      return ['read', 'spot_trade', 'margin_trade', 'futures_trade'];
    case 'coinbase':
      return ['read', 'trade', 'transfer'];
    case 'alpaca':
      return ['read', 'trade', 'data'];
    case 'interactive_brokers':
      return ['read', 'trade', 'account_info'];
    default:
      return ['read'];
  }
}

/**
 * Disconnect from an exchange
 */
export async function disconnectExchange(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const userConnections = connectionsStore.get(userId) || [];
  const index = userConnections.findIndex(c => c.id === connectionId);
  
  if (index === -1) return false;
  
  userConnections.splice(index, 1);
  credentialsStore.delete(connectionId);
  
  return true;
}

/**
 * Get user's exchange connections
 */
export async function getUserConnections(userId: string): Promise<ExchangeConnection[]> {
  return connectionsStore.get(userId) || [];
}

/**
 * Get connection by ID
 */
export async function getConnectionById(
  userId: string,
  connectionId: string
): Promise<ExchangeConnection | null> {
  const userConnections = connectionsStore.get(userId) || [];
  return userConnections.find(c => c.id === connectionId) || null;
}

/**
 * Get exchange balances
 */
export async function getExchangeBalances(
  connectionId: string
): Promise<ExchangeBalance[]> {
  const credentials = credentialsStore.get(connectionId);
  if (!credentials) {
    throw new Error('Connection not found or not authenticated');
  }
  
  // Simulate balance data
  // In production, this would call the actual exchange API
  return [
    { asset: 'USD', free: 10000, locked: 0, total: 10000, usdValue: 10000 },
    { asset: 'BTC', free: 0.5, locked: 0.1, total: 0.6, usdValue: 25000 },
    { asset: 'ETH', free: 5.0, locked: 0, total: 5.0, usdValue: 12500 },
    { asset: 'AAPL', free: 50, locked: 0, total: 50, usdValue: 9500 },
  ];
}

/**
 * Get exchange positions
 */
export async function getExchangePositions(
  connectionId: string
): Promise<ExchangePosition[]> {
  const credentials = credentialsStore.get(connectionId);
  if (!credentials) {
    throw new Error('Connection not found or not authenticated');
  }
  
  // Simulate position data
  return [
    {
      symbol: 'AAPL',
      side: 'long',
      quantity: 50,
      entryPrice: 175.50,
      currentPrice: 190.25,
      unrealizedPnL: 737.50,
      unrealizedPnLPercent: 8.4,
      marketValue: 9512.50,
    },
    {
      symbol: 'BTC',
      side: 'long',
      quantity: 0.5,
      entryPrice: 42000,
      currentPrice: 45000,
      unrealizedPnL: 1500,
      unrealizedPnLPercent: 7.14,
      marketValue: 22500,
    },
  ];
}

/**
 * Place an order on exchange
 */
export async function placeExchangeOrder(
  connectionId: string,
  order: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
  }
): Promise<ExchangeOrder> {
  const credentials = credentialsStore.get(connectionId);
  if (!credentials) {
    throw new Error('Connection not found or not authenticated');
  }
  
  // Find the connection to get exchange type
  let exchange: ExchangeType = 'alpaca';
  connectionsStore.forEach(connections => {
    const conn = connections.find(c => c.id === connectionId);
    if (conn) exchange = conn.exchange;
  });
  
  // Simulate order placement
  const exchangeOrder: ExchangeOrder = {
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    exchangeOrderId: `${exchange}_${Date.now()}`,
    exchange,
    symbol: order.symbol,
    side: order.side,
    type: order.type,
    quantity: order.quantity,
    price: order.price,
    stopPrice: order.stopPrice,
    filledQuantity: order.type === 'market' ? order.quantity : 0,
    avgFillPrice: order.type === 'market' ? (order.price || 100) : undefined,
    status: order.type === 'market' ? 'filled' : 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return exchangeOrder;
}

/**
 * Cancel an order
 */
export async function cancelExchangeOrder(
  connectionId: string,
  orderId: string
): Promise<boolean> {
  const credentials = credentialsStore.get(connectionId);
  if (!credentials) {
    throw new Error('Connection not found or not authenticated');
  }
  
  // Simulate order cancellation
  return true;
}

/**
 * Get order history
 */
export async function getOrderHistory(
  connectionId: string,
  limit: number = 50
): Promise<ExchangeOrder[]> {
  const credentials = credentialsStore.get(connectionId);
  if (!credentials) {
    throw new Error('Connection not found or not authenticated');
  }
  
  // Find the connection to get exchange type
  let exchange: ExchangeType = 'alpaca';
  connectionsStore.forEach(connections => {
    const conn = connections.find(c => c.id === connectionId);
    if (conn) exchange = conn.exchange;
  });
  
  // Simulate order history
  const orders: ExchangeOrder[] = [];
  const symbols = ['AAPL', 'GOOGL', 'BTC', 'ETH', 'MSFT'];
  
  for (let i = 0; i < Math.min(limit, 10); i++) {
    orders.push({
      id: `order_${i}`,
      exchangeOrderId: `${exchange}_${Date.now() - i * 86400000}`,
      exchange,
      symbol: symbols[i % symbols.length],
      side: i % 2 === 0 ? 'buy' : 'sell',
      type: 'market',
      quantity: Math.floor(Math.random() * 100) + 1,
      filledQuantity: Math.floor(Math.random() * 100) + 1,
      avgFillPrice: 100 + Math.random() * 100,
      status: 'filled',
      createdAt: new Date(Date.now() - i * 86400000),
      updatedAt: new Date(Date.now() - i * 86400000),
    });
  }
  
  return orders;
}

/**
 * Sync exchange data
 */
export async function syncExchangeData(
  userId: string,
  connectionId: string
): Promise<{
  balances: ExchangeBalance[];
  positions: ExchangePosition[];
  orders: ExchangeOrder[];
}> {
  const connection = await getConnectionById(userId, connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }
  
  const balances = await getExchangeBalances(connectionId);
  const positions = await getExchangePositions(connectionId);
  const orders = await getOrderHistory(connectionId, 20);
  
  // Update last sync time
  connection.lastSyncAt = new Date();
  connection.updatedAt = new Date();
  
  return { balances, positions, orders };
}

/**
 * Get OAuth URL for exchanges that support it
 */
export function getOAuthUrl(
  exchange: ExchangeType,
  redirectUri: string,
  state: string
): string | null {
  const info = EXCHANGE_INFO[exchange];
  
  if (info.authMethod !== 'oauth' || !info.oauthUrl) {
    return null;
  }
  
  const params = new URLSearchParams({
    client_id: `tradoverse_${exchange}`, // Would be actual client ID in production
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: 'read,trade',
  });
  
  return `${info.oauthUrl}?${params.toString()}`;
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
  userId: string,
  exchange: ExchangeType,
  code: string
): Promise<ExchangeConnection> {
  // In production, this would exchange the code for tokens
  // For now, simulate successful OAuth
  
  const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const connection: ExchangeConnection = {
    id,
    userId,
    exchange,
    status: 'connected',
    permissions: getDefaultPermissions(exchange),
    lastSyncAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const userConnections = connectionsStore.get(userId) || [];
  userConnections.push(connection);
  connectionsStore.set(userId, userConnections);
  
  // Store simulated credentials
  credentialsStore.set(id, {
    apiKey: `oauth_${code}`,
    apiSecret: `oauth_secret_${Date.now()}`,
  });
  
  return connection;
}

/**
 * Test connection health
 */
export async function testConnection(connectionId: string): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const credentials = credentialsStore.get(connectionId);
  if (!credentials) {
    return { healthy: false, latency: 0, error: 'Connection not found' };
  }
  
  // Simulate connection test
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  const latency = Date.now() - startTime;
  
  return {
    healthy: true,
    latency,
  };
}

export default {
  getAvailableExchanges,
  getExchangeInfo,
  connectExchange,
  disconnectExchange,
  getUserConnections,
  getConnectionById,
  getExchangeBalances,
  getExchangePositions,
  placeExchangeOrder,
  cancelExchangeOrder,
  getOrderHistory,
  syncExchangeData,
  getOAuthUrl,
  handleOAuthCallback,
  testConnection,
};
