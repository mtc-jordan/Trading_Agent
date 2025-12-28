/**
 * Alert System Service
 * Provides customizable alerts for price, regime changes, and sentiment shifts
 */

import { getDb } from '../db';
import { 
  priceAlerts, 
  regimeAlerts, 
  sentimentAlerts,
  alertHistory,
  type AlertHistory
} from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export type AlertType = 'price' | 'regime' | 'sentiment';
export type PriceAlertType = 'price_above' | 'price_below' | 'percent_change' | 'volume_spike';
export type RegimeType = 'bull' | 'bear' | 'sideways' | 'volatile';
export type SentimentAlertType = 'sentiment_bullish' | 'sentiment_bearish' | 'fear_greed_extreme' | 'sentiment_shift';
export type AssetType = 'stock' | 'crypto';

export interface PriceAlertConfig {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  alertType: PriceAlertType;
  targetValue: number;
  currentValue?: number;
  message?: string;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: Date;
  notifyEmail: boolean;
  notifyPush: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegimeAlertConfig {
  id: string;
  userId: string;
  symbol: string;
  fromRegime?: RegimeType;
  toRegime: RegimeType;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: Date;
  notifyEmail: boolean;
  notifyPush: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SentimentAlertConfig {
  id: string;
  userId: string;
  symbol: string;
  alertType: SentimentAlertType;
  threshold?: number;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: Date;
  notifyEmail: boolean;
  notifyPush: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertHistoryItem {
  id: number;
  uniqueId?: string;
  userId: number;
  alertId: number;
  alertIdStr?: string;
  alertType: string;
  symbol: string;
  title?: string;
  message: string;
  details?: Record<string, unknown>;
  isRead: boolean;
  emailSent: boolean;
  pushSent: boolean;
  createdAt: Date;
}

export interface AlertSummary {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  priceAlerts: number;
  regimeAlerts: number;
  sentimentAlerts: number;
}

// Helper to parse decimal strings
const toNum = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
};

/**
 * Create a price alert
 */
export async function createPriceAlert(
  userId: string,
  symbol: string,
  assetType: AssetType,
  alertType: PriceAlertType,
  targetValue: number,
  options?: {
    message?: string;
    notifyEmail?: boolean;
    notifyPush?: boolean;
  }
): Promise<PriceAlertConfig> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const id = `pa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  await db.insert(priceAlerts).values({
    id, userId, symbol, assetType, alertType,
    targetValue: String(targetValue),
    message: options?.message || null,
    isActive: true,
    isTriggered: false,
    notifyEmail: options?.notifyEmail ?? true,
    notifyPush: options?.notifyPush ?? true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id, userId, symbol, assetType, alertType, targetValue,
    message: options?.message,
    isActive: true, isTriggered: false,
    notifyEmail: options?.notifyEmail ?? true,
    notifyPush: options?.notifyPush ?? true,
    createdAt: now, updatedAt: now,
  };
}

/**
 * Create a regime change alert
 */
export async function createRegimeAlert(
  userId: string,
  symbol: string,
  toRegime: RegimeType,
  options?: {
    fromRegime?: RegimeType;
    notifyEmail?: boolean;
    notifyPush?: boolean;
  }
): Promise<RegimeAlertConfig> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const id = `ra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  await db.insert(regimeAlerts).values({
    id, userId, symbol, toRegime,
    fromRegime: options?.fromRegime || null,
    isActive: true,
    isTriggered: false,
    notifyEmail: options?.notifyEmail ?? true,
    notifyPush: options?.notifyPush ?? true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id, userId, symbol, toRegime,
    fromRegime: options?.fromRegime,
    isActive: true, isTriggered: false,
    notifyEmail: options?.notifyEmail ?? true,
    notifyPush: options?.notifyPush ?? true,
    createdAt: now, updatedAt: now,
  };
}

/**
 * Create a sentiment alert
 */
export async function createSentimentAlert(
  userId: string,
  symbol: string,
  alertType: SentimentAlertType,
  options?: {
    threshold?: number;
    notifyEmail?: boolean;
    notifyPush?: boolean;
  }
): Promise<SentimentAlertConfig> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const id = `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  await db.insert(sentimentAlerts).values({
    id, userId, symbol, alertType,
    threshold: options?.threshold ? String(options.threshold) : null,
    isActive: true,
    isTriggered: false,
    notifyEmail: options?.notifyEmail ?? true,
    notifyPush: options?.notifyPush ?? true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id, userId, symbol, alertType,
    threshold: options?.threshold,
    isActive: true, isTriggered: false,
    notifyEmail: options?.notifyEmail ?? true,
    notifyPush: options?.notifyPush ?? true,
    createdAt: now, updatedAt: now,
  };
}

/**
 * Get all price alerts for a user
 */
export async function getUserPriceAlerts(userId: string): Promise<PriceAlertConfig[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(priceAlerts)
    .where(eq(priceAlerts.userId, userId))
    .orderBy(desc(priceAlerts.createdAt));
  
  return results.map(r => ({
    id: r.id, userId: r.userId, symbol: r.symbol,
    assetType: r.assetType as AssetType,
    alertType: r.alertType as PriceAlertType,
    targetValue: toNum(r.targetValue),
    currentValue: r.currentValue ? toNum(r.currentValue) : undefined,
    message: r.message || undefined,
    isActive: r.isActive,
    isTriggered: r.isTriggered,
    triggeredAt: r.triggeredAt ? new Date(r.triggeredAt) : undefined,
    notifyEmail: r.notifyEmail,
    notifyPush: r.notifyPush,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

/**
 * Get all regime alerts for a user
 */
export async function getUserRegimeAlerts(userId: string): Promise<RegimeAlertConfig[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(regimeAlerts)
    .where(eq(regimeAlerts.userId, userId))
    .orderBy(desc(regimeAlerts.createdAt));
  
  return results.map(r => ({
    id: r.id, userId: r.userId, symbol: r.symbol,
    fromRegime: r.fromRegime as RegimeType | undefined,
    toRegime: r.toRegime as RegimeType,
    isActive: r.isActive,
    isTriggered: r.isTriggered,
    triggeredAt: r.triggeredAt ? new Date(r.triggeredAt) : undefined,
    notifyEmail: r.notifyEmail,
    notifyPush: r.notifyPush,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

/**
 * Get all sentiment alerts for a user
 */
export async function getUserSentimentAlerts(userId: string): Promise<SentimentAlertConfig[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(sentimentAlerts)
    .where(eq(sentimentAlerts.userId, userId))
    .orderBy(desc(sentimentAlerts.createdAt));
  
  return results.map(r => ({
    id: r.id, userId: r.userId, symbol: r.symbol,
    alertType: r.alertType as SentimentAlertType,
    threshold: r.threshold ? toNum(r.threshold) : undefined,
    isActive: r.isActive,
    isTriggered: r.isTriggered,
    triggeredAt: r.triggeredAt ? new Date(r.triggeredAt) : undefined,
    notifyEmail: r.notifyEmail,
    notifyPush: r.notifyPush,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

/**
 * Get alert history for a user
 */
export async function getAlertHistory(userId: string, limit: number = 50): Promise<AlertHistoryItem[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Use numeric userId for query
  const numericUserId = parseInt(userId) || 0;
  
  const results = await db.select().from(alertHistory)
    .where(eq(alertHistory.userId, numericUserId))
    .orderBy(desc(alertHistory.createdAt))
    .limit(limit);
  
  return results.map(r => ({
    id: r.id,
    uniqueId: r.uniqueId || undefined,
    userId: r.userId,
    alertId: r.alertId,
    alertIdStr: r.alertIdStr || undefined,
    alertType: r.alertType,
    symbol: r.symbol,
    title: r.title || undefined,
    message: r.message,
    details: r.details as Record<string, unknown> | undefined,
    isRead: r.isRead,
    emailSent: r.emailSent,
    pushSent: r.pushSent,
    createdAt: new Date(r.createdAt),
  }));
}

/**
 * Toggle alert active status
 */
export async function togglePriceAlert(alertId: string, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(priceAlerts)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(priceAlerts.id, alertId));
  
  return true;
}

export async function toggleRegimeAlert(alertId: string, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(regimeAlerts)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(regimeAlerts.id, alertId));
  
  return true;
}

export async function toggleSentimentAlert(alertId: string, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(sentimentAlerts)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(sentimentAlerts.id, alertId));
  
  return true;
}

/**
 * Delete alerts
 */
export async function deletePriceAlert(alertId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(priceAlerts).where(eq(priceAlerts.id, alertId));
  return true;
}

export async function deleteRegimeAlert(alertId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(regimeAlerts).where(eq(regimeAlerts.id, alertId));
  return true;
}

export async function deleteSentimentAlert(alertId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(sentimentAlerts).where(eq(sentimentAlerts.id, alertId));
  return true;
}

/**
 * Mark alert history as read
 */
export async function markAlertAsRead(alertHistoryId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const numericId = parseInt(alertHistoryId) || 0;
  await db.update(alertHistory)
    .set({ isRead: true })
    .where(eq(alertHistory.id, numericId));
  
  return true;
}

/**
 * Trigger a price alert
 */
export async function triggerPriceAlert(
  alertId: string,
  currentValue: number,
  message: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const alerts = await db.select().from(priceAlerts).where(eq(priceAlerts.id, alertId));
  if (alerts.length === 0) return;
  
  const alert = alerts[0];
  const now = new Date();
  
  // Update alert as triggered
  await db.update(priceAlerts)
    .set({
      isTriggered: true,
      triggeredAt: now,
      currentValue: String(currentValue),
      updatedAt: now,
    })
    .where(eq(priceAlerts.id, alertId));
  
  // Create alert history entry
  const numericUserId = parseInt(alert.userId) || 0;
  await db.insert(alertHistory).values({
    uniqueId: `ah_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: numericUserId,
    alertId: 0, // Use alertIdStr for string IDs
    alertIdStr: alert.id,
    alertType: 'price',
    symbol: alert.symbol,
    message,
    details: {
      alertType: alert.alertType,
      targetValue: toNum(alert.targetValue),
      currentValue,
    },
    isRead: false,
    emailSent: false,
    pushSent: false,
    createdAt: now,
  });
  
  // TODO: Send email/push notifications
}

/**
 * Trigger a regime alert
 */
export async function triggerRegimeAlert(
  alertId: string,
  fromRegime: RegimeType,
  toRegime: RegimeType,
  message: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const alerts = await db.select().from(regimeAlerts).where(eq(regimeAlerts.id, alertId));
  if (alerts.length === 0) return;
  
  const alert = alerts[0];
  const now = new Date();
  
  await db.update(regimeAlerts)
    .set({
      isTriggered: true,
      triggeredAt: now,
      updatedAt: now,
    })
    .where(eq(regimeAlerts.id, alertId));
  
  const numericUserId = parseInt(alert.userId) || 0;
  await db.insert(alertHistory).values({
    uniqueId: `ah_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: numericUserId,
    alertId: 0,
    alertIdStr: alert.id,
    alertType: 'regime',
    symbol: alert.symbol,
    message,
    details: { fromRegime, toRegime },
    isRead: false,
    emailSent: false,
    pushSent: false,
    createdAt: now,
  });
}

/**
 * Trigger a sentiment alert
 */
export async function triggerSentimentAlert(
  alertId: string,
  sentimentScore: number,
  message: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const alerts = await db.select().from(sentimentAlerts).where(eq(sentimentAlerts.id, alertId));
  if (alerts.length === 0) return;
  
  const alert = alerts[0];
  const now = new Date();
  
  await db.update(sentimentAlerts)
    .set({
      isTriggered: true,
      triggeredAt: now,
      updatedAt: now,
    })
    .where(eq(sentimentAlerts.id, alertId));
  
  const numericUserId = parseInt(alert.userId) || 0;
  await db.insert(alertHistory).values({
    uniqueId: `ah_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: numericUserId,
    alertId: 0,
    alertIdStr: alert.id,
    alertType: 'sentiment',
    symbol: alert.symbol,
    message,
    details: {
      alertType: alert.alertType,
      threshold: alert.threshold ? toNum(alert.threshold) : null,
      sentimentScore,
    },
    isRead: false,
    emailSent: false,
    pushSent: false,
    createdAt: now,
  });
}

/**
 * Get alert summary for a user
 */
export async function getAlertSummary(userId: string): Promise<AlertSummary> {
  const priceAlertsList = await getUserPriceAlerts(userId);
  const regimeAlertsList = await getUserRegimeAlerts(userId);
  const sentimentAlertsList = await getUserSentimentAlerts(userId);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const allAlerts = [
    ...priceAlertsList.map(a => ({ ...a, type: 'price' })),
    ...regimeAlertsList.map(a => ({ ...a, type: 'regime' })),
    ...sentimentAlertsList.map(a => ({ ...a, type: 'sentiment' })),
  ];
  
  const triggeredToday = allAlerts.filter(a => 
    a.triggeredAt && new Date(a.triggeredAt) >= today
  ).length;
  
  return {
    totalAlerts: allAlerts.length,
    activeAlerts: allAlerts.filter(a => a.isActive).length,
    triggeredToday,
    priceAlerts: priceAlertsList.length,
    regimeAlerts: regimeAlertsList.length,
    sentimentAlerts: sentimentAlertsList.length,
  };
}

/**
 * Check price alerts against current prices
 */
export async function checkPriceAlerts(
  symbol: string,
  currentPrice: number,
  previousPrice: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const alerts = await db.select().from(priceAlerts)
    .where(and(
      eq(priceAlerts.symbol, symbol),
      eq(priceAlerts.isActive, true),
      eq(priceAlerts.isTriggered, false)
    ));
  
  for (const alert of alerts) {
    const targetValue = toNum(alert.targetValue);
    let shouldTrigger = false;
    let message = '';
    
    switch (alert.alertType) {
      case 'price_above':
        if (currentPrice >= targetValue && previousPrice < targetValue) {
          shouldTrigger = true;
          message = `${symbol} price crossed above $${targetValue.toFixed(2)} (current: $${currentPrice.toFixed(2)})`;
        }
        break;
      
      case 'price_below':
        if (currentPrice <= targetValue && previousPrice > targetValue) {
          shouldTrigger = true;
          message = `${symbol} price crossed below $${targetValue.toFixed(2)} (current: $${currentPrice.toFixed(2)})`;
        }
        break;
      
      case 'percent_change':
        const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        if (Math.abs(percentChange) >= targetValue) {
          shouldTrigger = true;
          message = `${symbol} price changed by ${percentChange.toFixed(2)}% (threshold: ${targetValue}%)`;
        }
        break;
    }
    
    if (shouldTrigger) {
      await triggerPriceAlert(alert.id, currentPrice, message);
    }
  }
}

/**
 * Check regime alerts against current regime
 */
export async function checkRegimeAlerts(
  symbol: string,
  currentRegime: RegimeType,
  previousRegime: RegimeType
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  if (currentRegime === previousRegime) return;
  
  const alerts = await db.select().from(regimeAlerts)
    .where(and(
      eq(regimeAlerts.symbol, symbol),
      eq(regimeAlerts.isActive, true),
      eq(regimeAlerts.isTriggered, false),
      eq(regimeAlerts.toRegime, currentRegime)
    ));
  
  for (const alert of alerts) {
    // Check if fromRegime matches (if specified)
    if (alert.fromRegime && alert.fromRegime !== previousRegime) continue;
    
    const message = `${symbol} market regime changed from ${previousRegime} to ${currentRegime}`;
    await triggerRegimeAlert(alert.id, previousRegime, currentRegime, message);
  }
}

/**
 * Check sentiment alerts against current sentiment
 */
export async function checkSentimentAlerts(
  symbol: string,
  sentimentScore: number,
  fearGreedIndex: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const alerts = await db.select().from(sentimentAlerts)
    .where(and(
      eq(sentimentAlerts.symbol, symbol),
      eq(sentimentAlerts.isActive, true),
      eq(sentimentAlerts.isTriggered, false)
    ));
  
  for (const alert of alerts) {
    let shouldTrigger = false;
    let message = '';
    
    switch (alert.alertType) {
      case 'sentiment_bullish':
        if (sentimentScore >= (alert.threshold ? toNum(alert.threshold) : 0.5)) {
          shouldTrigger = true;
          message = `${symbol} sentiment turned bullish (score: ${sentimentScore.toFixed(2)})`;
        }
        break;
      
      case 'sentiment_bearish':
        if (sentimentScore <= (alert.threshold ? -toNum(alert.threshold) : -0.5)) {
          shouldTrigger = true;
          message = `${symbol} sentiment turned bearish (score: ${sentimentScore.toFixed(2)})`;
        }
        break;
      
      case 'fear_greed_extreme':
        if (fearGreedIndex <= 20 || fearGreedIndex >= 80) {
          shouldTrigger = true;
          const level = fearGreedIndex <= 20 ? 'Extreme Fear' : 'Extreme Greed';
          message = `${symbol} Fear & Greed Index at ${level} (${fearGreedIndex})`;
        }
        break;
    }
    
    if (shouldTrigger) {
      await triggerSentimentAlert(alert.id, sentimentScore, message);
    }
  }
}

export default {
  createPriceAlert,
  createRegimeAlert,
  createSentimentAlert,
  getUserPriceAlerts,
  getUserRegimeAlerts,
  getUserSentimentAlerts,
  getAlertHistory,
  togglePriceAlert,
  toggleRegimeAlert,
  toggleSentimentAlert,
  deletePriceAlert,
  deleteRegimeAlert,
  deleteSentimentAlert,
  markAlertAsRead,
  triggerPriceAlert,
  triggerRegimeAlert,
  triggerSentimentAlert,
  getAlertSummary,
  checkPriceAlerts,
  checkRegimeAlerts,
  checkSentimentAlerts,
};
