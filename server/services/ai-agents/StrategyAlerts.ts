/**
 * Strategy Alerts Service
 * 
 * Real-time notifications when market conditions match strategy entry/exit rules,
 * alerting users to potential trading opportunities.
 */

import type { GeneratedStrategy, EntryRule, ExitRule } from './AutomatedStrategyGeneration';

// Types
export type AlertType = 'entry_signal' | 'exit_signal' | 'price_target' | 'stop_loss' | 'indicator_crossover' | 'volume_spike' | 'volatility_alert' | 'custom';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'triggered' | 'expired' | 'cancelled';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';

export interface AlertCondition {
  type: 'price' | 'indicator' | 'volume' | 'volatility' | 'time' | 'custom';
  indicator?: string;
  operator: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between' | 'change_percent';
  value: number | [number, number];
  timeframe?: string; // '1m', '5m', '1h', '1d', etc.
}

export interface StrategyAlert {
  id: string;
  userId: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  type: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  conditions: AlertCondition[];
  conditionLogic: 'all' | 'any'; // AND or OR
  message: string;
  notificationChannels: NotificationChannel[];
  cooldownMinutes: number; // Minimum time between alerts
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt?: number;
  triggerCount: number;
  maxTriggers?: number; // Maximum number of times to trigger
}

export interface AlertTrigger {
  id: string;
  alertId: string;
  triggeredAt: number;
  price: number;
  conditions: Array<{
    condition: AlertCondition;
    actualValue: number;
    met: boolean;
  }>;
  notificationsSent: NotificationChannel[];
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export interface MarketSnapshot {
  symbol: string;
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  indicators: Map<string, number>;
}

export interface AlertSummary {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  triggeredThisWeek: number;
  byType: Record<AlertType, number>;
  byPriority: Record<AlertPriority, number>;
  topSymbols: Array<{ symbol: string; count: number }>;
}

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  conditions: AlertCondition[];
  conditionLogic: 'all' | 'any';
  defaultPriority: AlertPriority;
  defaultCooldown: number;
  category: 'entry' | 'exit' | 'risk' | 'opportunity';
}

// Storage
const alertsStore = new Map<string, StrategyAlert>();
const triggersStore = new Map<string, AlertTrigger[]>();
const marketDataCache = new Map<string, MarketSnapshot>();

// Helper Functions
function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTriggerId(): string {
  return `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Predefined Alert Templates
export const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: 'template_rsi_oversold',
    name: 'RSI Oversold Entry',
    description: 'Alert when RSI drops below 30, indicating potential buying opportunity',
    type: 'entry_signal',
    conditions: [
      { type: 'indicator', indicator: 'RSI', operator: 'below', value: 30 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'high',
    defaultCooldown: 60,
    category: 'entry',
  },
  {
    id: 'template_rsi_overbought',
    name: 'RSI Overbought Exit',
    description: 'Alert when RSI rises above 70, indicating potential selling opportunity',
    type: 'exit_signal',
    conditions: [
      { type: 'indicator', indicator: 'RSI', operator: 'above', value: 70 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'high',
    defaultCooldown: 60,
    category: 'exit',
  },
  {
    id: 'template_macd_bullish',
    name: 'MACD Bullish Crossover',
    description: 'Alert when MACD crosses above signal line',
    type: 'indicator_crossover',
    conditions: [
      { type: 'indicator', indicator: 'MACD_Histogram', operator: 'crosses_above', value: 0 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'medium',
    defaultCooldown: 240,
    category: 'entry',
  },
  {
    id: 'template_macd_bearish',
    name: 'MACD Bearish Crossover',
    description: 'Alert when MACD crosses below signal line',
    type: 'indicator_crossover',
    conditions: [
      { type: 'indicator', indicator: 'MACD_Histogram', operator: 'crosses_below', value: 0 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'medium',
    defaultCooldown: 240,
    category: 'exit',
  },
  {
    id: 'template_golden_cross',
    name: 'Golden Cross',
    description: 'Alert when 50-day SMA crosses above 200-day SMA',
    type: 'indicator_crossover',
    conditions: [
      { type: 'indicator', indicator: 'SMA_50_200_RATIO', operator: 'crosses_above', value: 1 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'high',
    defaultCooldown: 1440,
    category: 'entry',
  },
  {
    id: 'template_death_cross',
    name: 'Death Cross',
    description: 'Alert when 50-day SMA crosses below 200-day SMA',
    type: 'indicator_crossover',
    conditions: [
      { type: 'indicator', indicator: 'SMA_50_200_RATIO', operator: 'crosses_below', value: 1 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'critical',
    defaultCooldown: 1440,
    category: 'exit',
  },
  {
    id: 'template_bollinger_squeeze',
    name: 'Bollinger Band Squeeze',
    description: 'Alert when Bollinger Bands narrow significantly, indicating potential breakout',
    type: 'volatility_alert',
    conditions: [
      { type: 'indicator', indicator: 'BB_WIDTH', operator: 'below', value: 0.1 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'medium',
    defaultCooldown: 480,
    category: 'opportunity',
  },
  {
    id: 'template_volume_spike',
    name: 'Volume Spike',
    description: 'Alert when volume exceeds 200% of average',
    type: 'volume_spike',
    conditions: [
      { type: 'volume', operator: 'above', value: 200 },
    ],
    conditionLogic: 'all',
    defaultPriority: 'medium',
    defaultCooldown: 120,
    category: 'opportunity',
  },
  {
    id: 'template_price_breakout',
    name: 'Price Breakout',
    description: 'Alert when price breaks above recent high',
    type: 'entry_signal',
    conditions: [
      { type: 'price', operator: 'above', value: 0 }, // Value set dynamically
    ],
    conditionLogic: 'all',
    defaultPriority: 'high',
    defaultCooldown: 60,
    category: 'entry',
  },
  {
    id: 'template_stop_loss',
    name: 'Stop Loss Warning',
    description: 'Alert when price approaches stop loss level',
    type: 'stop_loss',
    conditions: [
      { type: 'price', operator: 'below', value: 0 }, // Value set dynamically
    ],
    conditionLogic: 'all',
    defaultPriority: 'critical',
    defaultCooldown: 5,
    category: 'risk',
  },
];

// Main Functions

/**
 * Create a new strategy alert
 */
export function createAlert(
  userId: string,
  strategyId: string,
  strategyName: string,
  symbol: string,
  config: {
    type: AlertType;
    priority?: AlertPriority;
    conditions: AlertCondition[];
    conditionLogic?: 'all' | 'any';
    message?: string;
    notificationChannels?: NotificationChannel[];
    cooldownMinutes?: number;
    expiresAt?: number;
    maxTriggers?: number;
  }
): StrategyAlert {
  const alert: StrategyAlert = {
    id: generateId(),
    userId,
    strategyId,
    strategyName,
    symbol: symbol.toUpperCase(),
    type: config.type,
    priority: config.priority || 'medium',
    status: 'active',
    conditions: config.conditions,
    conditionLogic: config.conditionLogic || 'all',
    message: config.message || `Alert for ${symbol} - ${config.type}`,
    notificationChannels: config.notificationChannels || ['in_app'],
    cooldownMinutes: config.cooldownMinutes || 30,
    expiresAt: config.expiresAt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    triggerCount: 0,
    maxTriggers: config.maxTriggers,
  };
  
  alertsStore.set(alert.id, alert);
  triggersStore.set(alert.id, []);
  
  return alert;
}

/**
 * Create alert from strategy entry/exit rules
 */
export function createAlertFromStrategy(
  userId: string,
  strategy: GeneratedStrategy,
  symbol: string,
  ruleType: 'entry' | 'exit'
): StrategyAlert[] {
  const alerts: StrategyAlert[] = [];
  const rules = ruleType === 'entry' ? strategy.entryRules : strategy.exitRules;
  
  for (const rule of rules) {
    if (ruleType === 'entry') {
      const entryRule = rule as EntryRule;
      const conditions: AlertCondition[] = [{
        type: entryRule.indicator.toLowerCase().includes('price') ? 'price' : 'indicator',
        indicator: entryRule.indicator,
        operator: entryRule.condition as AlertCondition['operator'],
        value: entryRule.value as number,
      }];
      
      const alert = createAlert(userId, strategy.id, strategy.name, symbol, {
        type: 'entry_signal',
        priority: entryRule.isRequired ? 'high' : 'medium',
        conditions,
        message: `Entry signal: ${entryRule.name} - ${entryRule.description}`,
        cooldownMinutes: 60,
      });
      
      alerts.push(alert);
    } else {
      const exitRule = rule as ExitRule;
      let alertType: AlertType = 'exit_signal';
      
      if (exitRule.type === 'stop_loss') alertType = 'stop_loss';
      if (exitRule.type === 'take_profit') alertType = 'price_target';
      
      const conditions: AlertCondition[] = [{
        type: 'price',
        operator: exitRule.type === 'stop_loss' ? 'below' : 'above',
        value: exitRule.value,
      }];
      
      const alert = createAlert(userId, strategy.id, strategy.name, symbol, {
        type: alertType,
        priority: exitRule.type === 'stop_loss' ? 'critical' : 'high',
        conditions,
        message: `Exit signal: ${exitRule.name}`,
        cooldownMinutes: exitRule.type === 'stop_loss' ? 5 : 30,
      });
      
      alerts.push(alert);
    }
  }
  
  return alerts;
}

/**
 * Create alert from template
 */
export function createAlertFromTemplate(
  userId: string,
  strategyId: string,
  strategyName: string,
  symbol: string,
  templateId: string,
  overrides?: Partial<{
    conditions: AlertCondition[];
    priority: AlertPriority;
    cooldownMinutes: number;
    notificationChannels: NotificationChannel[];
  }>
): StrategyAlert | null {
  const template = ALERT_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;
  
  return createAlert(userId, strategyId, strategyName, symbol, {
    type: template.type,
    priority: overrides?.priority || template.defaultPriority,
    conditions: overrides?.conditions || template.conditions,
    conditionLogic: template.conditionLogic,
    message: `${template.name} alert for ${symbol}`,
    notificationChannels: overrides?.notificationChannels || ['in_app', 'email'],
    cooldownMinutes: overrides?.cooldownMinutes || template.defaultCooldown,
  });
}

/**
 * Get alert by ID
 */
export function getAlert(alertId: string): StrategyAlert | null {
  return alertsStore.get(alertId) || null;
}

/**
 * Get all alerts for a user
 */
export function getUserAlerts(userId: string, filters?: {
  status?: AlertStatus;
  type?: AlertType;
  symbol?: string;
  strategyId?: string;
}): StrategyAlert[] {
  let alerts = Array.from(alertsStore.values()).filter(a => a.userId === userId);
  
  if (filters?.status) {
    alerts = alerts.filter(a => a.status === filters.status);
  }
  if (filters?.type) {
    alerts = alerts.filter(a => a.type === filters.type);
  }
  if (filters?.symbol) {
    const symbolUpper = filters.symbol.toUpperCase();
    alerts = alerts.filter(a => a.symbol === symbolUpper);
  }
  if (filters?.strategyId) {
    alerts = alerts.filter(a => a.strategyId === filters.strategyId);
  }
  
  return alerts.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Update alert
 */
export function updateAlert(
  alertId: string,
  updates: Partial<Pick<StrategyAlert, 'priority' | 'conditions' | 'conditionLogic' | 'message' | 'notificationChannels' | 'cooldownMinutes' | 'expiresAt' | 'maxTriggers'>>
): StrategyAlert | null {
  const alert = alertsStore.get(alertId);
  if (!alert) return null;
  
  const updated = {
    ...alert,
    ...updates,
    updatedAt: Date.now(),
  };
  
  alertsStore.set(alertId, updated);
  return updated;
}

/**
 * Cancel/deactivate alert
 */
export function cancelAlert(alertId: string): boolean {
  const alert = alertsStore.get(alertId);
  if (!alert) return false;
  
  alert.status = 'cancelled';
  alert.updatedAt = Date.now();
  alertsStore.set(alertId, alert);
  
  return true;
}

/**
 * Delete alert
 */
export function deleteAlert(alertId: string): boolean {
  const deleted = alertsStore.delete(alertId);
  triggersStore.delete(alertId);
  return deleted;
}

/**
 * Check if alert conditions are met
 */
export function checkAlertConditions(
  alert: StrategyAlert,
  snapshot: MarketSnapshot,
  previousSnapshot?: MarketSnapshot
): { triggered: boolean; conditionResults: Array<{ condition: AlertCondition; actualValue: number; met: boolean }> } {
  const conditionResults: Array<{ condition: AlertCondition; actualValue: number; met: boolean }> = [];
  
  for (const condition of alert.conditions) {
    let actualValue = 0;
    let met = false;
    
    switch (condition.type) {
      case 'price':
        actualValue = snapshot.price;
        met = evaluateCondition(actualValue, condition.operator, condition.value, previousSnapshot?.price);
        break;
        
      case 'indicator':
        actualValue = snapshot.indicators.get(condition.indicator || '') || 0;
        const prevIndicatorValue = previousSnapshot?.indicators.get(condition.indicator || '');
        met = evaluateCondition(actualValue, condition.operator, condition.value, prevIndicatorValue);
        break;
        
      case 'volume':
        // Volume as percentage of average
        actualValue = snapshot.volume;
        met = evaluateCondition(actualValue, condition.operator, condition.value);
        break;
        
      case 'volatility':
        actualValue = Math.abs(snapshot.changePercent);
        met = evaluateCondition(actualValue, condition.operator, condition.value);
        break;
        
      default:
        met = false;
    }
    
    conditionResults.push({ condition, actualValue, met });
  }
  
  const triggered = alert.conditionLogic === 'all'
    ? conditionResults.every(r => r.met)
    : conditionResults.some(r => r.met);
  
  return { triggered, conditionResults };
}

function evaluateCondition(
  value: number,
  operator: AlertCondition['operator'],
  target: number | [number, number],
  previousValue?: number
): boolean {
  switch (operator) {
    case 'above':
      return value > (target as number);
    case 'below':
      return value < (target as number);
    case 'equals':
      return Math.abs(value - (target as number)) < 0.001;
    case 'between':
      const [min, max] = target as [number, number];
      return value >= min && value <= max;
    case 'crosses_above':
      return previousValue !== undefined && previousValue <= (target as number) && value > (target as number);
    case 'crosses_below':
      return previousValue !== undefined && previousValue >= (target as number) && value < (target as number);
    case 'change_percent':
      return previousValue !== undefined && Math.abs((value - previousValue) / previousValue * 100) >= (target as number);
    default:
      return false;
  }
}

/**
 * Process alerts for a symbol
 */
export function processAlerts(
  symbol: string,
  snapshot: MarketSnapshot
): AlertTrigger[] {
  const triggers: AlertTrigger[] = [];
  const previousSnapshot = marketDataCache.get(symbol);
  
  // Update cache
  marketDataCache.set(symbol, snapshot);
  
  // Get active alerts for this symbol
  const alerts = Array.from(alertsStore.values()).filter(
    a => a.symbol === symbol.toUpperCase() && a.status === 'active'
  );
  
  for (const alert of alerts) {
    // Check expiration
    if (alert.expiresAt && Date.now() > alert.expiresAt) {
      alert.status = 'expired';
      alertsStore.set(alert.id, alert);
      continue;
    }
    
    // Check max triggers
    if (alert.maxTriggers && alert.triggerCount >= alert.maxTriggers) {
      alert.status = 'triggered';
      alertsStore.set(alert.id, alert);
      continue;
    }
    
    // Check cooldown
    if (alert.lastTriggeredAt) {
      const cooldownMs = alert.cooldownMinutes * 60 * 1000;
      if (Date.now() - alert.lastTriggeredAt < cooldownMs) {
        continue;
      }
    }
    
    // Check conditions
    const { triggered, conditionResults } = checkAlertConditions(alert, snapshot, previousSnapshot);
    
    if (triggered) {
      const trigger: AlertTrigger = {
        id: generateTriggerId(),
        alertId: alert.id,
        triggeredAt: Date.now(),
        price: snapshot.price,
        conditions: conditionResults,
        notificationsSent: alert.notificationChannels,
        acknowledged: false,
      };
      
      // Update alert
      alert.lastTriggeredAt = Date.now();
      alert.triggerCount++;
      alert.updatedAt = Date.now();
      alertsStore.set(alert.id, alert);
      
      // Store trigger
      const alertTriggers = triggersStore.get(alert.id) || [];
      alertTriggers.push(trigger);
      triggersStore.set(alert.id, alertTriggers);
      
      triggers.push(trigger);
    }
  }
  
  return triggers;
}

/**
 * Get alert triggers
 */
export function getAlertTriggers(alertId: string): AlertTrigger[] {
  return triggersStore.get(alertId) || [];
}

/**
 * Acknowledge a trigger
 */
export function acknowledgeTrigger(triggerId: string): boolean {
  for (const triggers of Array.from(triggersStore.values())) {
    const trigger = triggers.find((t: AlertTrigger) => t.id === triggerId);
    if (trigger) {
      trigger.acknowledged = true;
      trigger.acknowledgedAt = Date.now();
      return true;
    }
  }
  return false;
}

/**
 * Get alert summary for user
 */
export function getAlertSummary(userId: string): AlertSummary {
  const alerts = getUserAlerts(userId);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  const activeAlerts = alerts.filter(a => a.status === 'active');
  
  let triggeredToday = 0;
  let triggeredThisWeek = 0;
  
  for (const alert of alerts) {
    const triggers = triggersStore.get(alert.id) || [];
    for (const trigger of triggers) {
      if (now - trigger.triggeredAt < dayMs) triggeredToday++;
      if (now - trigger.triggeredAt < weekMs) triggeredThisWeek++;
    }
  }
  
  const byType: Record<AlertType, number> = {
    entry_signal: 0,
    exit_signal: 0,
    price_target: 0,
    stop_loss: 0,
    indicator_crossover: 0,
    volume_spike: 0,
    volatility_alert: 0,
    custom: 0,
  };
  
  const byPriority: Record<AlertPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  
  const symbolCounts = new Map<string, number>();
  
  for (const alert of activeAlerts) {
    byType[alert.type]++;
    byPriority[alert.priority]++;
    symbolCounts.set(alert.symbol, (symbolCounts.get(alert.symbol) || 0) + 1);
  }
  
  const topSymbols = Array.from(symbolCounts.entries())
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalAlerts: alerts.length,
    activeAlerts: activeAlerts.length,
    triggeredToday,
    triggeredThisWeek,
    byType,
    byPriority,
    topSymbols,
  };
}

/**
 * Get alert templates
 */
export function getAlertTemplates(category?: 'entry' | 'exit' | 'risk' | 'opportunity'): AlertTemplate[] {
  if (category) {
    return ALERT_TEMPLATES.filter(t => t.category === category);
  }
  return ALERT_TEMPLATES;
}

/**
 * Simulate market data for testing
 */
export function simulateMarketSnapshot(symbol: string): MarketSnapshot {
  const basePrice = symbol === 'BTC' ? 45000 : symbol === 'ETH' ? 2500 : 150;
  const price = basePrice * (1 + (Math.random() - 0.5) * 0.02);
  const change = price - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  const indicators = new Map<string, number>();
  indicators.set('RSI', 30 + Math.random() * 40);
  indicators.set('MACD', (Math.random() - 0.5) * 2);
  indicators.set('MACD_Histogram', (Math.random() - 0.5) * 0.5);
  indicators.set('SMA_50', price * (1 + (Math.random() - 0.5) * 0.05));
  indicators.set('SMA_200', price * (1 + (Math.random() - 0.5) * 0.1));
  indicators.set('BB_WIDTH', 0.05 + Math.random() * 0.15);
  
  return {
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    price,
    open: price * (1 - Math.random() * 0.01),
    high: price * (1 + Math.random() * 0.02),
    low: price * (1 - Math.random() * 0.02),
    volume: Math.floor(1000000 + Math.random() * 5000000),
    change,
    changePercent,
    indicators,
  };
}

/**
 * Bulk create alerts for multiple symbols
 */
export function createBulkAlerts(
  userId: string,
  strategyId: string,
  strategyName: string,
  symbols: string[],
  config: {
    type: AlertType;
    priority?: AlertPriority;
    conditions: AlertCondition[];
    conditionLogic?: 'all' | 'any';
    cooldownMinutes?: number;
  }
): StrategyAlert[] {
  return symbols.map(symbol => 
    createAlert(userId, strategyId, strategyName, symbol, config)
  );
}

/**
 * Get recent triggers across all alerts
 */
export function getRecentTriggers(userId: string, limit: number = 20): Array<AlertTrigger & { alert: StrategyAlert }> {
  const userAlerts = getUserAlerts(userId);
  const allTriggers: Array<AlertTrigger & { alert: StrategyAlert }> = [];
  
  for (const alert of userAlerts) {
    const triggers = triggersStore.get(alert.id) || [];
    for (const trigger of triggers) {
      allTriggers.push({ ...trigger, alert });
    }
  }
  
  return allTriggers
    .sort((a, b) => b.triggeredAt - a.triggeredAt)
    .slice(0, limit);
}

/**
 * Export alerts configuration
 */
export function exportAlerts(userId: string): string {
  const alerts = getUserAlerts(userId);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    alerts: alerts.map(a => ({
      ...a,
      // Don't export triggers
    })),
  }, null, 2);
}

/**
 * Import alerts configuration
 */
export function importAlerts(userId: string, jsonData: string): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;
  
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.alerts || !Array.isArray(data.alerts)) {
      errors.push('Invalid format: missing alerts array');
      return { imported, errors };
    }
    
    for (const alertData of data.alerts) {
      try {
        createAlert(userId, alertData.strategyId, alertData.strategyName, alertData.symbol, {
          type: alertData.type,
          priority: alertData.priority,
          conditions: alertData.conditions,
          conditionLogic: alertData.conditionLogic,
          message: alertData.message,
          notificationChannels: alertData.notificationChannels,
          cooldownMinutes: alertData.cooldownMinutes,
        });
        imported++;
      } catch (e) {
        errors.push(`Failed to import alert for ${alertData.symbol}: ${e}`);
      }
    }
  } catch (e) {
    errors.push(`Failed to parse JSON: ${e}`);
  }
  
  return { imported, errors };
}
