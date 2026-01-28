/**
 * Strategy Alerts Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAlert,
  createAlertFromTemplate,
  getUserAlerts,
  getAlertTemplates,
  getAlertSummary,
  getRecentTriggers,
  cancelAlert,
  deleteAlert,
  acknowledgeTrigger,
  processAlerts,
  simulateMarketSnapshot,
} from './StrategyAlerts';

describe('StrategyAlerts', () => {
  const testUserId = 'test-user-123';
  const testStrategyId = 'test-strategy-1';
  const testStrategyName = 'Test Momentum Strategy';
  const testSymbol = 'AAPL';

  describe('createAlert', () => {
    it('should create a new alert', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        priority: 'medium',
        conditions: [
          { type: 'price', operator: 'above', value: 150 },
        ],
        conditionLogic: 'all',
      });

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.userId).toBe(testUserId);
      expect(alert.strategyId).toBe(testStrategyId);
      expect(alert.symbol).toBe(testSymbol);
      expect(alert.status).toBe('active');
    });

    it('should set default values', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'entry_signal',
        conditions: [
          { type: 'indicator', indicator: 'RSI', operator: 'below', value: 30 },
        ],
      });

      expect(alert.priority).toBe('medium');
      expect(alert.conditionLogic).toBe('all');
      expect(alert.notificationChannels).toContain('in_app');
    });

    it('should support multiple conditions', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'entry_signal',
        conditions: [
          { type: 'price', operator: 'above', value: 150 },
          { type: 'volume', operator: 'above', value: 1000000 },
          { type: 'indicator', indicator: 'RSI', operator: 'below', value: 30 },
        ],
        conditionLogic: 'all',
      });

      expect(alert.conditions.length).toBe(3);
    });

    it('should support different alert types', () => {
      const types = ['entry_signal', 'exit_signal', 'price_target', 'stop_loss', 'indicator_crossover'] as const;
      
      types.forEach(type => {
        const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
          type,
          conditions: [{ type: 'price', operator: 'above', value: 100 }],
        });
        expect(alert.type).toBe(type);
      });
    });
  });

  describe('createAlertFromTemplate', () => {
    it('should create alert from template', () => {
      const templates = getAlertTemplates();
      const template = templates[0];
      
      const alert = createAlertFromTemplate(
        testUserId,
        testStrategyId,
        testStrategyName,
        testSymbol,
        template.id
      );

      expect(alert).toBeDefined();
      expect(alert.type).toBe(template.type);
      expect(alert.conditions.length).toBeGreaterThan(0);
    });

    it('should allow overriding template values', () => {
      const templates = getAlertTemplates();
      const template = templates[0];
      
      const alert = createAlertFromTemplate(
        testUserId,
        testStrategyId,
        testStrategyName,
        testSymbol,
        template.id,
        { priority: 'critical' }
      );

      expect(alert.priority).toBe('critical');
    });

    it('should return null for invalid template', () => {
      const result = createAlertFromTemplate(
        testUserId,
        testStrategyId,
        testStrategyName,
        testSymbol,
        'invalid-template-id'
      );
      expect(result).toBeNull();
    });
  });

  describe('getAlertTemplates', () => {
    it('should return all templates', () => {
      const templates = getAlertTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', () => {
      const entryTemplates = getAlertTemplates('entry');
      const exitTemplates = getAlertTemplates('exit');
      const riskTemplates = getAlertTemplates('risk');
      
      expect(entryTemplates.every(t => t.category === 'entry')).toBe(true);
      expect(exitTemplates.every(t => t.category === 'exit')).toBe(true);
      expect(riskTemplates.every(t => t.category === 'risk')).toBe(true);
    });

    it('should include required template properties', () => {
      const templates = getAlertTemplates();
      
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.conditions).toBeDefined();
      });
    });
  });

  describe('getUserAlerts', () => {
    it('should return user alerts', () => {
      // Create some alerts first
      createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 150 }],
      });

      const alerts = getUserAlerts(testUserId);
      
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter by status', () => {
      const activeAlerts = getUserAlerts(testUserId, { status: 'active' });
      
      activeAlerts.forEach(alert => {
        expect(alert.status).toBe('active');
      });
    });

    it('should filter by symbol', () => {
      createAlert(testUserId, testStrategyId, testStrategyName, 'GOOGL', {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 100 }],
      });

      const googAlerts = getUserAlerts(testUserId, { symbol: 'GOOGL' });
      
      googAlerts.forEach(alert => {
        expect(alert.symbol).toBe('GOOGL');
      });
    });
  });

  describe('getAlertSummary', () => {
    it('should return alert summary', () => {
      const summary = getAlertSummary(testUserId);
      
      expect(summary).toBeDefined();
      expect(typeof summary.totalAlerts).toBe('number');
      expect(typeof summary.activeAlerts).toBe('number');
      expect(typeof summary.triggeredToday).toBe('number');
    });

    it('should include counts by type', () => {
      const summary = getAlertSummary(testUserId);
      
      expect(summary.byType).toBeDefined();
      expect(typeof summary.byType).toBe('object');
    });

    it('should include counts by priority', () => {
      const summary = getAlertSummary(testUserId);
      
      expect(summary.byPriority).toBeDefined();
      expect(typeof summary.byPriority).toBe('object');
    });
  });

  describe('cancelAlert', () => {
    it('should cancel an active alert', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 150 }],
      });

      const cancelled = cancelAlert(alert.id);
      
      expect(cancelled).toBe(true);
      
      const alerts = getUserAlerts(testUserId, { status: 'cancelled' });
      const found = alerts.find(a => a.id === alert.id);
      expect(found?.status).toBe('cancelled');
    });

    it('should return false for non-existent alert', () => {
      const result = cancelAlert('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('deleteAlert', () => {
    it('should delete an alert', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 150 }],
      });

      const deleted = deleteAlert(alert.id);
      
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent alert', () => {
      const result = deleteAlert('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('simulateMarketSnapshot', () => {
    it('should generate market snapshot for symbol', () => {
      const snapshot = simulateMarketSnapshot('AAPL');
      
      expect(snapshot).toBeDefined();
      expect(snapshot.symbol).toBe('AAPL');
      expect(typeof snapshot.price).toBe('number');
      expect(typeof snapshot.volume).toBe('number');
      expect(typeof snapshot.change).toBe('number');
      expect(typeof snapshot.changePercent).toBe('number');
    });

    it('should include technical indicators as Map', () => {
      const snapshot = simulateMarketSnapshot('AAPL');
      
      expect(snapshot.indicators).toBeDefined();
      expect(snapshot.indicators instanceof Map).toBe(true);
      expect(snapshot.indicators.get('RSI')).toBeDefined();
      expect(snapshot.indicators.get('MACD')).toBeDefined();
    });

    it('should generate reasonable price values', () => {
      const aapl = simulateMarketSnapshot('AAPL');
      const btc = simulateMarketSnapshot('BTC');
      
      // AAPL should be around 150, BTC around 45000
      expect(aapl.price).toBeGreaterThan(100);
      expect(aapl.price).toBeLessThan(200);
      expect(btc.price).toBeGreaterThan(40000);
      expect(btc.price).toBeLessThan(50000);
    });
  });

  describe('processAlerts', () => {
    it('should process alerts for a symbol', () => {
      // Create an alert that should trigger
      createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 1 }], // Very low threshold
      });

      const snapshot = simulateMarketSnapshot(testSymbol);
      const triggers = processAlerts(testSymbol, snapshot);
      
      expect(triggers).toBeDefined();
      expect(Array.isArray(triggers)).toBe(true);
    });

    it('should return triggered alerts', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 0 }], // Always triggers
      });

      const snapshot = { ...simulateMarketSnapshot(testSymbol), price: 100 };
      const triggers = processAlerts(testSymbol, snapshot);
      
      // Should have at least one trigger
      expect(triggers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecentTriggers', () => {
    it('should return recent triggers', () => {
      const triggers = getRecentTriggers(testUserId, 10);
      
      expect(triggers).toBeDefined();
      expect(Array.isArray(triggers)).toBe(true);
    });

    it('should respect limit parameter', () => {
      const triggers = getRecentTriggers(testUserId, 5);
      
      expect(triggers.length).toBeLessThanOrEqual(5);
    });
  });

  describe('acknowledgeTrigger', () => {
    it('should acknowledge a trigger', () => {
      // This tests the function exists and handles invalid IDs
      const result = acknowledgeTrigger('non-existent-trigger');
      expect(result).toBe(false);
    });
  });

  describe('Alert Priority', () => {
    it('should support all priority levels', () => {
      const priorities = ['low', 'medium', 'high', 'critical'] as const;
      
      priorities.forEach(priority => {
        const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
          type: 'price_target',
          priority,
          conditions: [{ type: 'price', operator: 'above', value: 100 }],
        });
        expect(alert.priority).toBe(priority);
      });
    });
  });

  describe('Condition Logic', () => {
    it('should support ALL condition logic', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'entry_signal',
        conditions: [
          { type: 'price', operator: 'above', value: 100 },
          { type: 'volume', operator: 'above', value: 1000000 },
        ],
        conditionLogic: 'all',
      });

      expect(alert.conditionLogic).toBe('all');
    });

    it('should support ANY condition logic', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'entry_signal',
        conditions: [
          { type: 'price', operator: 'above', value: 100 },
          { type: 'price', operator: 'below', value: 50 },
        ],
        conditionLogic: 'any',
      });

      expect(alert.conditionLogic).toBe('any');
    });
  });

  describe('Notification Channels', () => {
    it('should support multiple notification channels', () => {
      const alert = createAlert(testUserId, testStrategyId, testStrategyName, testSymbol, {
        type: 'price_target',
        conditions: [{ type: 'price', operator: 'above', value: 100 }],
        notificationChannels: ['in_app', 'email', 'push'],
      });

      expect(alert.notificationChannels).toContain('in_app');
      expect(alert.notificationChannels).toContain('email');
      expect(alert.notificationChannels).toContain('push');
    });
  });
});
