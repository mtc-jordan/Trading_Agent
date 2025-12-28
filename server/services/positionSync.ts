/**
 * Position Sync Service
 * Handles real-time position synchronization from connected brokers
 */

import { getDb } from '../db';
import { brokerConnections, brokerPositions } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { 
  getBrokerConnection, 
  getUserBrokerConnections,
  initializeBrokerAdapter,
  syncBrokerPositions
} from './brokers/BrokerService';

// Sync status tracking
interface SyncStatus {
  connectionId: string;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
  positionsCount: number;
}

// In-memory sync status cache
const syncStatusCache = new Map<string, SyncStatus>();

// Sync intervals by connection (in milliseconds)
const syncIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Get broker adapter configuration
 */
function getBrokerConfig() {
  return {
    alpaca: process.env.ALPACA_CLIENT_ID ? {
      clientId: process.env.ALPACA_CLIENT_ID,
      clientSecret: process.env.ALPACA_CLIENT_SECRET!,
      redirectUri: process.env.ALPACA_REDIRECT_URI || ''
    } : undefined,
    ibkr: process.env.IBKR_CONSUMER_KEY ? {
      consumerKey: process.env.IBKR_CONSUMER_KEY,
      privateKey: process.env.IBKR_PRIVATE_KEY!,
      realm: process.env.IBKR_REALM || 'limited_poa',
      redirectUri: process.env.IBKR_REDIRECT_URI || ''
    } : undefined
  };
}

/**
 * Sync positions for a single broker connection
 */
export async function syncConnectionPositions(connectionId: string): Promise<{
  success: boolean;
  positionsCount: number;
  error?: string;
}> {
  const connection = await getBrokerConnection(connectionId);
  
  if (!connection) {
    return { success: false, positionsCount: 0, error: 'Connection not found' };
  }
  
  // Update sync status
  syncStatusCache.set(connectionId, {
    connectionId,
    lastSyncAt: syncStatusCache.get(connectionId)?.lastSyncAt || null,
    nextSyncAt: null,
    status: 'syncing',
    positionsCount: syncStatusCache.get(connectionId)?.positionsCount || 0,
  });
  
  try {
    const config = getBrokerConfig();
    const adapter = await initializeBrokerAdapter(connection, config);
    const positions = await adapter.getPositions();
    
    // Sync positions to database
    await syncBrokerPositions(
      connectionId,
      connection.userId,
      positions.map(pos => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        side: pos.side as 'long' | 'short',
        avgEntryPrice: pos.avgEntryPrice,
        marketValue: pos.marketValue,
        costBasis: pos.costBasis,
        unrealizedPL: pos.unrealizedPL,
        unrealizedPLPercent: pos.unrealizedPLPercent,
        currentPrice: pos.currentPrice
      }))
    );
    
    // Update sync status
    const now = new Date();
    syncStatusCache.set(connectionId, {
      connectionId,
      lastSyncAt: now,
      nextSyncAt: null, // Will be set by scheduler
      status: 'idle',
      positionsCount: positions.length,
    });
    
    // Update connection last sync time in database
    const db = await getDb();
    if (db) {
      await db.update(brokerConnections)
        .set({ lastSyncAt: now })
        .where(eq(brokerConnections.id, connectionId));
    }
    
    return { success: true, positionsCount: positions.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    syncStatusCache.set(connectionId, {
      connectionId,
      lastSyncAt: syncStatusCache.get(connectionId)?.lastSyncAt || null,
      nextSyncAt: null,
      status: 'error',
      error: errorMessage,
      positionsCount: syncStatusCache.get(connectionId)?.positionsCount || 0,
    });
    
    return { success: false, positionsCount: 0, error: errorMessage };
  }
}

/**
 * Sync positions for all connections of a user
 */
export async function syncUserPositions(userId: string): Promise<{
  synced: number;
  failed: number;
  results: Array<{ connectionId: string; success: boolean; positionsCount: number; error?: string }>;
}> {
  const connections = await getUserBrokerConnections(userId);
  const results: Array<{ connectionId: string; success: boolean; positionsCount: number; error?: string }> = [];
  
  let synced = 0;
  let failed = 0;
  
  for (const connection of connections) {
    if (!connection.isActive) continue;
    
    const result = await syncConnectionPositions(connection.id);
    results.push({ connectionId: connection.id, ...result });
    
    if (result.success) {
      synced++;
    } else {
      failed++;
    }
  }
  
  return { synced, failed, results };
}

/**
 * Get sync status for a connection
 */
export function getSyncStatus(connectionId: string): SyncStatus | null {
  return syncStatusCache.get(connectionId) || null;
}

/**
 * Get sync status for all connections of a user
 */
export async function getUserSyncStatus(userId: string): Promise<SyncStatus[]> {
  const connections = await getUserBrokerConnections(userId);
  return connections.map(conn => 
    syncStatusCache.get(conn.id) || {
      connectionId: conn.id,
      lastSyncAt: conn.lastSyncAt,
      nextSyncAt: null,
      status: 'idle' as const,
      positionsCount: 0,
    }
  );
}

/**
 * Start auto-sync for a connection
 */
export function startAutoSync(connectionId: string, intervalMinutes: number = 5): void {
  // Clear existing interval if any
  stopAutoSync(connectionId);
  
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Set up recurring sync
  const interval = setInterval(async () => {
    await syncConnectionPositions(connectionId);
    
    // Update next sync time
    const status = syncStatusCache.get(connectionId);
    if (status) {
      status.nextSyncAt = new Date(Date.now() + intervalMs);
      syncStatusCache.set(connectionId, status);
    }
  }, intervalMs);
  
  syncIntervals.set(connectionId, interval);
  
  // Update next sync time
  const status = syncStatusCache.get(connectionId) || {
    connectionId,
    lastSyncAt: null,
    nextSyncAt: new Date(Date.now() + intervalMs),
    status: 'idle' as const,
    positionsCount: 0,
  };
  status.nextSyncAt = new Date(Date.now() + intervalMs);
  syncStatusCache.set(connectionId, status);
  
  // Do an immediate sync
  syncConnectionPositions(connectionId);
}

/**
 * Stop auto-sync for a connection
 */
export function stopAutoSync(connectionId: string): void {
  const interval = syncIntervals.get(connectionId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(connectionId);
  }
  
  const status = syncStatusCache.get(connectionId);
  if (status) {
    status.nextSyncAt = null;
    syncStatusCache.set(connectionId, status);
  }
}

/**
 * Get aggregated positions across all connections for a user
 */
export async function getAggregatedPositions(userId: string): Promise<{
  positions: Array<{
    symbol: string;
    quantity: number;
    side: string;
    avgEntryPrice: number;
    marketValue: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
    currentPrice: number;
    connectionId: string;
    brokerType: string;
  }>;
  totalValue: number;
  totalPL: number;
  lastSyncAt: Date | null;
}> {
  const db = await getDb();
  if (!db) {
    return { positions: [], totalValue: 0, totalPL: 0, lastSyncAt: null };
  }
  
  // Get all positions for user's connections
  const connections = await getUserBrokerConnections(userId);
  const connectionIds = connections.map(c => c.id);
  
  if (connectionIds.length === 0) {
    return { positions: [], totalValue: 0, totalPL: 0, lastSyncAt: null };
  }
  
  const allPositions: Array<{
    symbol: string;
    quantity: number;
    side: string;
    avgEntryPrice: number;
    marketValue: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
    currentPrice: number;
    connectionId: string;
    brokerType: string;
  }> = [];
  
  let totalValue = 0;
  let totalPL = 0;
  let lastSyncAt: Date | null = null;
  
  for (const connection of connections) {
    const positions = await db.select()
      .from(brokerPositions)
      .where(eq(brokerPositions.connectionId, connection.id));
    
    for (const pos of positions) {
      const marketValue = Number(pos.marketValue) || 0;
      const unrealizedPL = Number(pos.unrealizedPL) || 0;
      
      allPositions.push({
        symbol: pos.symbol,
        quantity: Number(pos.quantity) || 0,
        side: pos.side,
        avgEntryPrice: Number(pos.avgEntryPrice) || 0,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent: Number(pos.unrealizedPLPercent) || 0,
        currentPrice: Number(pos.currentPrice) || 0,
        connectionId: connection.id,
        brokerType: connection.brokerType,
      });
      
      totalValue += marketValue;
      totalPL += unrealizedPL;
    }
    
    if (connection.lastSyncAt && (!lastSyncAt || connection.lastSyncAt > lastSyncAt)) {
      lastSyncAt = connection.lastSyncAt;
    }
  }
  
  return { positions: allPositions, totalValue, totalPL, lastSyncAt };
}

/**
 * Get position sync history for a connection
 */
export async function getSyncHistory(connectionId: string, limit: number = 10): Promise<Array<{
  syncedAt: Date;
  positionsCount: number;
  status: string;
}>> {
  // For now, return from cache
  // In production, this would query a sync_history table
  const status = syncStatusCache.get(connectionId);
  if (!status || !status.lastSyncAt) {
    return [];
  }
  
  return [{
    syncedAt: status.lastSyncAt,
    positionsCount: status.positionsCount,
    status: status.status,
  }];
}

/**
 * Initialize sync for all active connections on server start
 */
export async function initializeAllSyncs(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const activeConnections = await db.select()
    .from(brokerConnections)
    .where(eq(brokerConnections.isActive, true));
  
  for (const connection of activeConnections) {
    // Start auto-sync with default 5 minute interval
    startAutoSync(connection.id, 5);
  }
  
  console.log(`[PositionSync] Initialized sync for ${activeConnections.length} connections`);
}

export default {
  syncConnectionPositions,
  syncUserPositions,
  getSyncStatus,
  getUserSyncStatus,
  startAutoSync,
  stopAutoSync,
  getAggregatedPositions,
  getSyncHistory,
  initializeAllSyncs,
};
