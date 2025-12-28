/**
 * Prediction Alerts Service
 * 
 * Monitors tracked predictions and sends alerts when prices
 * reach target or stop-loss levels.
 */

import { getDb } from '../../db';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

// Types
export type AlertType = 'target_reached' | 'stop_loss_triggered' | 'price_breakout' | 'trend_reversal' | 'volatility_spike';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'pending' | 'triggered' | 'acknowledged' | 'expired';
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

export interface PredictionAlert {
  id: number;
  userId: string;
  predictionId: number;
  symbol: string;
  alertType: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  targetPrice?: number;
  stopLossPrice?: number;
  currentPrice?: number;
  triggerCondition: string;
  message: string;
  channels: NotificationChannel[];
  createdAt: Date;
  triggeredAt?: Date;
  acknowledgedAt?: Date;
  expiresAt?: Date;
}

export interface AlertConfig {
  userId: string;
  predictionId: number;
  symbol: string;
  targetPrice?: number;
  stopLossPrice?: number;
  trailingStopPct?: number;
  breakoutThresholdPct?: number;
  volatilityThreshold?: number;
  channels: NotificationChannel[];
  expiresInHours?: number;
}

export interface AlertSummary {
  totalAlerts: number;
  pendingAlerts: number;
  triggeredToday: number;
  acknowledgedAlerts: number;
  expiredAlerts: number;
  byType: Record<AlertType, number>;
  byPriority: Record<AlertPriority, number>;
  recentAlerts: PredictionAlert[];
}

export interface PriceCheck {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  volatility: number;
}

// In-memory storage for alerts
const alertStore: Map<number, PredictionAlert> = new Map();
const alertConfigStore: Map<string, AlertConfig[]> = new Map();
let nextAlertId = 1;

/**
 * Create a new prediction alert
 */
export async function createAlert(config: AlertConfig): Promise<PredictionAlert> {
  const id = nextAlertId++;
  
  // Determine trigger condition based on config
  let triggerCondition = '';
  let priority: AlertPriority = 'medium';
  
  if (config.targetPrice && config.stopLossPrice) {
    triggerCondition = `Price reaches $${config.targetPrice} (target) or $${config.stopLossPrice} (stop-loss)`;
    priority = 'high';
  } else if (config.targetPrice) {
    triggerCondition = `Price reaches target of $${config.targetPrice}`;
    priority = 'medium';
  } else if (config.stopLossPrice) {
    triggerCondition = `Price falls to stop-loss of $${config.stopLossPrice}`;
    priority = 'high';
  } else if (config.trailingStopPct) {
    triggerCondition = `Trailing stop of ${config.trailingStopPct}% triggered`;
    priority = 'high';
  } else if (config.breakoutThresholdPct) {
    triggerCondition = `Price breaks out by ${config.breakoutThresholdPct}%`;
    priority = 'medium';
  }
  
  const alert: PredictionAlert = {
    id,
    userId: config.userId,
    predictionId: config.predictionId,
    symbol: config.symbol,
    alertType: config.targetPrice ? 'target_reached' : 'stop_loss_triggered',
    priority,
    status: 'pending',
    targetPrice: config.targetPrice,
    stopLossPrice: config.stopLossPrice,
    triggerCondition,
    message: `Alert set for ${config.symbol}: ${triggerCondition}`,
    channels: config.channels || ['in_app'],
    createdAt: new Date(),
    expiresAt: config.expiresInHours 
      ? new Date(Date.now() + config.expiresInHours * 60 * 60 * 1000)
      : undefined,
  };
  
  alertStore.set(id, alert);
  
  // Store config for price monitoring
  const userConfigs = alertConfigStore.get(config.userId) || [];
  userConfigs.push(config);
  alertConfigStore.set(config.userId, userConfigs);
  
  return alert;
}

/**
 * Check prices and trigger alerts
 */
export async function checkPricesAndTriggerAlerts(
  priceChecks: PriceCheck[]
): Promise<PredictionAlert[]> {
  const triggeredAlerts: PredictionAlert[] = [];
  const priceMap = new Map(priceChecks.map(p => [p.symbol, p]));
  
  for (const [alertId, alert] of Array.from(alertStore.entries())) {
    if (alert.status !== 'pending') continue;
    
    // Check expiration
    if (alert.expiresAt && new Date() > alert.expiresAt) {
      alert.status = 'expired';
      continue;
    }
    
    const priceData = priceMap.get(alert.symbol);
    if (!priceData) continue;
    
    const currentPrice = priceData.currentPrice;
    alert.currentPrice = currentPrice;
    
    let shouldTrigger = false;
    let alertType: AlertType = alert.alertType;
    let message = '';
    
    // Check target price
    if (alert.targetPrice && currentPrice >= alert.targetPrice) {
      shouldTrigger = true;
      alertType = 'target_reached';
      message = `🎯 Target reached! ${alert.symbol} hit $${currentPrice.toFixed(2)} (target: $${alert.targetPrice.toFixed(2)})`;
    }
    
    // Check stop-loss
    if (alert.stopLossPrice && currentPrice <= alert.stopLossPrice) {
      shouldTrigger = true;
      alertType = 'stop_loss_triggered';
      message = `⚠️ Stop-loss triggered! ${alert.symbol} fell to $${currentPrice.toFixed(2)} (stop: $${alert.stopLossPrice.toFixed(2)})`;
    }
    
    // Check volatility spike
    if (priceData.volatility > 0.05) { // 5% volatility threshold
      const volatilityAlert = createVolatilityAlert(alert.userId, alert.symbol, priceData.volatility);
      triggeredAlerts.push(volatilityAlert);
    }
    
    if (shouldTrigger) {
      alert.status = 'triggered';
      alert.alertType = alertType;
      alert.message = message;
      alert.triggeredAt = new Date();
      triggeredAlerts.push(alert);
    }
  }
  
  return triggeredAlerts;
}

/**
 * Create a volatility spike alert
 */
function createVolatilityAlert(userId: string, symbol: string, volatility: number): PredictionAlert {
  const id = nextAlertId++;
  const alert: PredictionAlert = {
    id,
    userId,
    predictionId: 0,
    symbol,
    alertType: 'volatility_spike',
    priority: volatility > 0.1 ? 'critical' : 'high',
    status: 'triggered',
    triggerCondition: `Volatility exceeded ${(volatility * 100).toFixed(1)}%`,
    message: `📊 High volatility detected! ${symbol} showing ${(volatility * 100).toFixed(1)}% volatility`,
    channels: ['in_app'],
    createdAt: new Date(),
    triggeredAt: new Date(),
  };
  alertStore.set(id, alert);
  return alert;
}

/**
 * Get alerts for a user
 */
export async function getUserAlerts(
  userId: string,
  options: {
    status?: AlertStatus;
    type?: AlertType;
    limit?: number;
  } = {}
): Promise<PredictionAlert[]> {
  let alerts = Array.from(alertStore.values())
    .filter(a => a.userId === userId);
  
  if (options.status) {
    alerts = alerts.filter(a => a.status === options.status);
  }
  
  if (options.type) {
    alerts = alerts.filter(a => a.alertType === options.type);
  }
  
  // Sort by creation date descending
  alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  if (options.limit) {
    alerts = alerts.slice(0, options.limit);
  }
  
  return alerts;
}

/**
 * Get alert summary for a user
 */
export async function getAlertSummary(userId: string): Promise<AlertSummary> {
  const alerts = Array.from(alertStore.values())
    .filter(a => a.userId === userId);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const summary: AlertSummary = {
    totalAlerts: alerts.length,
    pendingAlerts: alerts.filter(a => a.status === 'pending').length,
    triggeredToday: alerts.filter(a => 
      a.status === 'triggered' && 
      a.triggeredAt && 
      a.triggeredAt >= today
    ).length,
    acknowledgedAlerts: alerts.filter(a => a.status === 'acknowledged').length,
    expiredAlerts: alerts.filter(a => a.status === 'expired').length,
    byType: {
      target_reached: alerts.filter(a => a.alertType === 'target_reached').length,
      stop_loss_triggered: alerts.filter(a => a.alertType === 'stop_loss_triggered').length,
      price_breakout: alerts.filter(a => a.alertType === 'price_breakout').length,
      trend_reversal: alerts.filter(a => a.alertType === 'trend_reversal').length,
      volatility_spike: alerts.filter(a => a.alertType === 'volatility_spike').length,
    },
    byPriority: {
      low: alerts.filter(a => a.priority === 'low').length,
      medium: alerts.filter(a => a.priority === 'medium').length,
      high: alerts.filter(a => a.priority === 'high').length,
      critical: alerts.filter(a => a.priority === 'critical').length,
    },
    recentAlerts: alerts
      .filter(a => a.status === 'triggered')
      .sort((a, b) => (b.triggeredAt?.getTime() || 0) - (a.triggeredAt?.getTime() || 0))
      .slice(0, 5),
  };
  
  return summary;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: number, userId: string): Promise<boolean> {
  const alert = alertStore.get(alertId);
  if (!alert || alert.userId !== userId) {
    return false;
  }
  
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date();
  return true;
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: number, userId: string): Promise<boolean> {
  const alert = alertStore.get(alertId);
  if (!alert || alert.userId !== userId) {
    return false;
  }
  
  alertStore.delete(alertId);
  return true;
}

/**
 * Update alert configuration
 */
export async function updateAlert(
  alertId: number,
  userId: string,
  updates: Partial<Pick<PredictionAlert, 'targetPrice' | 'stopLossPrice' | 'channels' | 'expiresAt'>>
): Promise<PredictionAlert | null> {
  const alert = alertStore.get(alertId);
  if (!alert || alert.userId !== userId || alert.status !== 'pending') {
    return null;
  }
  
  if (updates.targetPrice !== undefined) {
    alert.targetPrice = updates.targetPrice;
  }
  if (updates.stopLossPrice !== undefined) {
    alert.stopLossPrice = updates.stopLossPrice;
  }
  if (updates.channels !== undefined) {
    alert.channels = updates.channels;
  }
  if (updates.expiresAt !== undefined) {
    alert.expiresAt = updates.expiresAt;
  }
  
  // Update trigger condition
  if (alert.targetPrice && alert.stopLossPrice) {
    alert.triggerCondition = `Price reaches $${alert.targetPrice} (target) or $${alert.stopLossPrice} (stop-loss)`;
  } else if (alert.targetPrice) {
    alert.triggerCondition = `Price reaches target of $${alert.targetPrice}`;
  } else if (alert.stopLossPrice) {
    alert.triggerCondition = `Price falls to stop-loss of $${alert.stopLossPrice}`;
  }
  
  return alert;
}

/**
 * Create bulk alerts for multiple predictions
 */
export async function createBulkAlerts(configs: AlertConfig[]): Promise<PredictionAlert[]> {
  const alerts: PredictionAlert[] = [];
  for (const config of configs) {
    const alert = await createAlert(config);
    alerts.push(alert);
  }
  return alerts;
}

/**
 * Get alert statistics
 */
export async function getAlertStatistics(userId: string, days: number = 30): Promise<{
  totalCreated: number;
  totalTriggered: number;
  targetHitRate: number;
  stopLossHitRate: number;
  averageTimeToTrigger: number;
  mostAlertedSymbols: { symbol: string; count: number }[];
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const alerts = Array.from(alertStore.values())
    .filter(a => a.userId === userId && a.createdAt >= cutoffDate);
  
  const triggered = alerts.filter(a => a.status === 'triggered');
  const targetHits = triggered.filter(a => a.alertType === 'target_reached');
  const stopLossHits = triggered.filter(a => a.alertType === 'stop_loss_triggered');
  
  // Calculate average time to trigger
  let totalTriggerTime = 0;
  let triggerCount = 0;
  for (const alert of triggered) {
    if (alert.triggeredAt) {
      totalTriggerTime += alert.triggeredAt.getTime() - alert.createdAt.getTime();
      triggerCount++;
    }
  }
  
  // Count alerts by symbol
  const symbolCounts = new Map<string, number>();
  for (const alert of alerts) {
    const count = symbolCounts.get(alert.symbol) || 0;
    symbolCounts.set(alert.symbol, count + 1);
  }
  
  const mostAlertedSymbols = Array.from(symbolCounts.entries())
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalCreated: alerts.length,
    totalTriggered: triggered.length,
    targetHitRate: alerts.length > 0 ? targetHits.length / alerts.length : 0,
    stopLossHitRate: alerts.length > 0 ? stopLossHits.length / alerts.length : 0,
    averageTimeToTrigger: triggerCount > 0 ? totalTriggerTime / triggerCount / (1000 * 60 * 60) : 0, // in hours
    mostAlertedSymbols,
  };
}

/**
 * Initialize sample alerts for testing
 */
export function initializeSampleAlerts(userId: string): void {
  // Create sample alerts
  const sampleConfigs: AlertConfig[] = [
    {
      userId,
      predictionId: 1,
      symbol: 'AAPL',
      targetPrice: 200,
      stopLossPrice: 170,
      channels: ['in_app', 'email'],
      expiresInHours: 168, // 1 week
    },
    {
      userId,
      predictionId: 2,
      symbol: 'GOOGL',
      targetPrice: 180,
      channels: ['in_app'],
      expiresInHours: 72,
    },
    {
      userId,
      predictionId: 3,
      symbol: 'MSFT',
      stopLossPrice: 380,
      channels: ['in_app', 'push'],
      expiresInHours: 48,
    },
  ];
  
  for (const config of sampleConfigs) {
    createAlert(config);
  }
  
  // Create a triggered alert for demo
  const triggeredAlert: PredictionAlert = {
    id: nextAlertId++,
    userId,
    predictionId: 4,
    symbol: 'NVDA',
    alertType: 'target_reached',
    priority: 'high',
    status: 'triggered',
    targetPrice: 500,
    currentPrice: 502.50,
    triggerCondition: 'Price reaches target of $500',
    message: '🎯 Target reached! NVDA hit $502.50 (target: $500.00)',
    channels: ['in_app'],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  };
  alertStore.set(triggeredAlert.id, triggeredAlert);
}
