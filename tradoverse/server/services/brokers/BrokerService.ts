/**
 * Broker Service
 * 
 * Handles database operations for broker connections and provides
 * high-level methods for broker management.
 */

import { getDb } from '../../db';
import { 
  brokerConnections, 
  oauthStates, 
  brokerOrders, 
  brokerPositions,
  BrokerConnectionRecord,
  InsertBrokerConnection,
  OAuthStateRecord,
  InsertOAuthState,
  BrokerOrderRecord,
  InsertBrokerOrder,
  BrokerPositionRecord,
  InsertBrokerPosition
} from '../../../drizzle/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import crypto from 'crypto';
import { BrokerType, OrderSide, OrderType, TimeInForce, OrderStatus } from './types';
import { BrokerFactory, BROKER_INFO } from './BrokerFactory';
import { IBrokerAdapter } from './IBrokerAdapter';

// ============================================================================
// Encryption Utilities
// ============================================================================

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-encryption-key-change-me';
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ============================================================================
// OAuth State Management
// ============================================================================

export async function createOAuthState(
  userId: string,
  brokerType: BrokerType,
  isPaper: boolean,
  codeVerifier?: string,
  requestToken?: string,
  requestTokenSecret?: string
): Promise<OAuthStateRecord> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const state = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  const record: InsertOAuthState = {
    id: uuidv4(),
    state,
    userId,
    brokerType: brokerType as 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase',
    isPaper,
    codeVerifier,
    requestToken,
    requestTokenSecret,
    expiresAt
  };
  
  await db.insert(oauthStates).values(record);
  
  const [created] = await db.select().from(oauthStates).where(eq(oauthStates.id, record.id));
  return created;
}

export async function getOAuthState(state: string): Promise<OAuthStateRecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [record] = await db.select().from(oauthStates).where(eq(oauthStates.state, state));
  
  if (!record) return null;
  if (new Date(record.expiresAt) < new Date()) {
    await db.delete(oauthStates).where(eq(oauthStates.id, record.id));
    return null;
  }
  
  return record;
}

export async function deleteOAuthState(state: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(oauthStates).where(eq(oauthStates.state, state));
}

export async function cleanupExpiredOAuthStates(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));
}

// ============================================================================
// Broker Connection Management
// ============================================================================

export async function createBrokerConnection(
  userId: string,
  brokerType: BrokerType,
  isPaper: boolean,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    accessTokenSecret?: string;
    expiresAt?: Date;
    liveSessionToken?: string;
    liveSessionTokenExpiresAt?: Date;
  },
  accountInfo?: {
    accountId?: string;
    accountNumber?: string;
    accountType?: string;
  }
): Promise<BrokerConnectionRecord> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const record: InsertBrokerConnection = {
    id: uuidv4(),
    userId,
    brokerType: brokerType as 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase',
    isPaper,
    isActive: true,
    accessTokenEncrypted: encrypt(tokens.accessToken),
    refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    accessTokenSecretEncrypted: tokens.accessTokenSecret ? encrypt(tokens.accessTokenSecret) : null,
    tokenExpiresAt: tokens.expiresAt,
    liveSessionTokenEncrypted: tokens.liveSessionToken ? encrypt(tokens.liveSessionToken) : null,
    liveSessionTokenExpiresAt: tokens.liveSessionTokenExpiresAt,
    accountId: accountInfo?.accountId,
    accountNumber: accountInfo?.accountNumber,
    accountType: accountInfo?.accountType,
    lastConnectedAt: new Date()
  };
  
  await db.insert(brokerConnections).values(record);
  
  const [created] = await db.select().from(brokerConnections).where(eq(brokerConnections.id, record.id));
  return created;
}

export async function getBrokerConnection(connectionId: string): Promise<BrokerConnectionRecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [record] = await db.select().from(brokerConnections).where(eq(brokerConnections.id, connectionId));
  return record || null;
}

export async function getUserBrokerConnections(userId: string): Promise<BrokerConnectionRecord[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.select().from(brokerConnections)
    .where(eq(brokerConnections.userId, userId))
    .orderBy(desc(brokerConnections.createdAt));
}

export async function getUserBrokerConnectionByType(
  userId: string, 
  brokerType: BrokerType,
  isPaper: boolean
): Promise<BrokerConnectionRecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [record] = await db.select().from(brokerConnections)
    .where(and(
      eq(brokerConnections.userId, userId),
      eq(brokerConnections.brokerType, brokerType as 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase'),
      eq(brokerConnections.isPaper, isPaper),
      eq(brokerConnections.isActive, true)
    ));
  return record || null;
}

export async function updateBrokerConnection(
  connectionId: string,
  updates: Partial<{
    accessToken: string;
    refreshToken: string;
    accessTokenSecret: string;
    tokenExpiresAt: Date;
    liveSessionToken: string;
    liveSessionTokenExpiresAt: Date;
    accountId: string;
    accountNumber: string;
    accountType: string;
    isActive: boolean;
    connectionError: string | null;
    lastSyncAt: Date;
  }>
): Promise<BrokerConnectionRecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: Record<string, unknown> = {};
  
  if (updates.accessToken) updateData.accessTokenEncrypted = encrypt(updates.accessToken);
  if (updates.refreshToken) updateData.refreshTokenEncrypted = encrypt(updates.refreshToken);
  if (updates.accessTokenSecret) updateData.accessTokenSecretEncrypted = encrypt(updates.accessTokenSecret);
  if (updates.liveSessionToken) updateData.liveSessionTokenEncrypted = encrypt(updates.liveSessionToken);
  if (updates.tokenExpiresAt) updateData.tokenExpiresAt = updates.tokenExpiresAt;
  if (updates.liveSessionTokenExpiresAt) updateData.liveSessionTokenExpiresAt = updates.liveSessionTokenExpiresAt;
  if (updates.accountId) updateData.accountId = updates.accountId;
  if (updates.accountNumber) updateData.accountNumber = updates.accountNumber;
  if (updates.accountType) updateData.accountType = updates.accountType;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
  if (updates.connectionError !== undefined) updateData.connectionError = updates.connectionError;
  if (updates.lastSyncAt) updateData.lastSyncAt = updates.lastSyncAt;
  
  await db.update(brokerConnections).set(updateData).where(eq(brokerConnections.id, connectionId));
  
  return getBrokerConnection(connectionId);
}

export async function deleteBrokerConnection(connectionId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Delete related orders and positions
  await db.delete(brokerOrders).where(eq(brokerOrders.connectionId, connectionId));
  await db.delete(brokerPositions).where(eq(brokerPositions.connectionId, connectionId));
  
  // Delete the connection
  await db.delete(brokerConnections).where(eq(brokerConnections.id, connectionId));
}

export function getDecryptedTokens(connection: BrokerConnectionRecord): {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenSecret: string | null;
  liveSessionToken: string | null;
} {
  return {
    accessToken: connection.accessTokenEncrypted ? decrypt(connection.accessTokenEncrypted) : null,
    refreshToken: connection.refreshTokenEncrypted ? decrypt(connection.refreshTokenEncrypted) : null,
    accessTokenSecret: connection.accessTokenSecretEncrypted ? decrypt(connection.accessTokenSecretEncrypted) : null,
    liveSessionToken: connection.liveSessionTokenEncrypted ? decrypt(connection.liveSessionTokenEncrypted) : null
  };
}

// ============================================================================
// Broker Order Management
// ============================================================================

export async function createBrokerOrder(
  connectionId: string,
  userId: string,
  order: {
    brokerOrderId?: string;
    clientOrderId?: string;
    symbol: string;
    side: OrderSide;
    orderType: OrderType;
    timeInForce?: TimeInForce;
    quantity: number;
    price?: number;
    stopPrice?: number;
    trailPercent?: number;
    extendedHours?: boolean;
  }
): Promise<BrokerOrderRecord> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const record: InsertBrokerOrder = {
    id: uuidv4(),
    connectionId,
    userId,
    brokerOrderId: order.brokerOrderId,
    clientOrderId: order.clientOrderId || uuidv4(),
    symbol: order.symbol,
    side: order.side.toLowerCase() as 'buy' | 'sell',
    orderType: order.orderType.toLowerCase() as 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop',
    timeInForce: (order.timeInForce?.toLowerCase() || 'day') as 'day' | 'gtc' | 'ioc' | 'fok' | 'opg' | 'cls',
    quantity: order.quantity.toString(),
    price: order.price?.toString(),
    stopPrice: order.stopPrice?.toString(),
    trailPercent: order.trailPercent?.toString(),
    extendedHours: order.extendedHours || false,
    status: 'new'
  };
  
  await db.insert(brokerOrders).values(record);
  
  const [created] = await db.select().from(brokerOrders).where(eq(brokerOrders.id, record.id));
  return created;
}

export async function updateBrokerOrder(
  orderId: string,
  updates: Partial<{
    brokerOrderId: string;
    status: OrderStatus;
    filledQuantity: number;
    avgFillPrice: number;
    filledAt: Date;
    cancelledAt: Date;
    expiredAt: Date;
  }>
): Promise<BrokerOrderRecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: Record<string, unknown> = {};
  
  if (updates.brokerOrderId) updateData.brokerOrderId = updates.brokerOrderId;
  if (updates.status) updateData.status = updates.status.toLowerCase();
  if (updates.filledQuantity !== undefined) updateData.filledQuantity = updates.filledQuantity.toString();
  if (updates.avgFillPrice !== undefined) updateData.avgFillPrice = updates.avgFillPrice.toString();
  if (updates.filledAt) updateData.filledAt = updates.filledAt;
  if (updates.cancelledAt) updateData.cancelledAt = updates.cancelledAt;
  if (updates.expiredAt) updateData.expiredAt = updates.expiredAt;
  
  await db.update(brokerOrders).set(updateData).where(eq(brokerOrders.id, orderId));
  
  const [updated] = await db.select().from(brokerOrders).where(eq(brokerOrders.id, orderId));
  return updated || null;
}

export async function getBrokerOrder(orderId: string): Promise<BrokerOrderRecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [record] = await db.select().from(brokerOrders).where(eq(brokerOrders.id, orderId));
  return record || null;
}

export async function getUserBrokerOrders(
  userId: string, 
  connectionId?: string,
  limit: number = 50
): Promise<BrokerOrderRecord[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  if (connectionId) {
    return db.select().from(brokerOrders)
      .where(and(
        eq(brokerOrders.userId, userId),
        eq(brokerOrders.connectionId, connectionId)
      ))
      .orderBy(desc(brokerOrders.createdAt))
      .limit(limit);
  }
  
  return db.select().from(brokerOrders)
    .where(eq(brokerOrders.userId, userId))
    .orderBy(desc(brokerOrders.createdAt))
    .limit(limit);
}

// ============================================================================
// Broker Position Management
// ============================================================================

export async function syncBrokerPositions(
  connectionId: string,
  userId: string,
  positions: Array<{
    symbol: string;
    quantity: number;
    side: 'long' | 'short';
    avgEntryPrice: number;
    marketValue?: number;
    costBasis?: number;
    unrealizedPL?: number;
    unrealizedPLPercent?: number;
    currentPrice?: number;
  }>
): Promise<BrokerPositionRecord[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Delete existing positions for this connection
  await db.delete(brokerPositions).where(eq(brokerPositions.connectionId, connectionId));
  
  // Insert new positions
  const records: InsertBrokerPosition[] = positions.map(pos => ({
    id: uuidv4(),
    connectionId,
    userId,
    symbol: pos.symbol,
    quantity: pos.quantity.toString(),
    side: pos.side,
    avgEntryPrice: pos.avgEntryPrice.toString(),
    marketValue: pos.marketValue?.toString(),
    costBasis: pos.costBasis?.toString(),
    unrealizedPL: pos.unrealizedPL?.toString(),
    unrealizedPLPercent: pos.unrealizedPLPercent?.toString(),
    currentPrice: pos.currentPrice?.toString(),
    lastSyncAt: new Date()
  }));
  
  if (records.length > 0) {
    await db.insert(brokerPositions).values(records);
  }
  
  return db.select().from(brokerPositions).where(eq(brokerPositions.connectionId, connectionId));
}

export async function getUserBrokerPositions(
  userId: string,
  connectionId?: string
): Promise<BrokerPositionRecord[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  if (connectionId) {
    return db.select().from(brokerPositions)
      .where(and(
        eq(brokerPositions.userId, userId),
        eq(brokerPositions.connectionId, connectionId)
      ));
  }
  
  return db.select().from(brokerPositions).where(eq(brokerPositions.userId, userId));
}

// ============================================================================
// High-Level Broker Operations
// ============================================================================

export async function initializeBrokerAdapter(
  connection: BrokerConnectionRecord,
  config: {
    alpaca?: { clientId: string; clientSecret: string; redirectUri: string };
    ibkr?: { consumerKey: string; privateKey: string; realm: string; redirectUri: string };
  }
): Promise<IBrokerAdapter> {
  const factory = new BrokerFactory(config);
  const adapter = factory.createAdapter(connection.brokerType as BrokerType, connection.isPaper);
  
  const tokens = getDecryptedTokens(connection);
  
  if (!tokens.accessToken) {
    throw new Error('No access token found for broker connection');
  }
  
  await adapter.initialize({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? undefined,
    accessTokenSecret: tokens.accessTokenSecret ?? undefined,
    liveSessionToken: tokens.liveSessionToken ?? undefined
  });
  
  return adapter;
}

export function getAvailableBrokers(): Array<{
  type: BrokerType;
  name: string;
  description: string;
  logoUrl: string;
  authType: string;
  requiresApproval: boolean;
  approvalUrl?: string;
  capabilities: {
    supportsStocks: boolean;
    supportsCrypto: boolean;
    supportsOptions: boolean;
    supportsFractional: boolean;
    supportsPaperTrading: boolean;
  };
}> {
  return Object.values(BROKER_INFO)
    .filter(info => info.type === BrokerType.ALPACA || info.type === BrokerType.INTERACTIVE_BROKERS)
    .map(info => ({
      type: info.type,
      name: info.name,
      description: info.description,
      logoUrl: info.logoUrl,
      authType: info.authType,
      requiresApproval: info.requiresApproval,
      approvalUrl: info.approvalUrl,
      capabilities: {
        supportsStocks: info.capabilities.supportedAssetClasses.includes('us_equity' as any),
        supportsCrypto: info.capabilities.supportsCryptoTrading,
        supportsOptions: info.capabilities.supportsOptionsTrading,
        supportsFractional: info.capabilities.supportsFractionalShares,
        supportsPaperTrading: info.capabilities.supportsPaperTrading
      }
    }));
}
