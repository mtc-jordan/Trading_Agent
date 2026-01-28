/**
 * Unit tests for CommandCenterDataService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commandCenterDataService } from './CommandCenterDataService';

describe('CommandCenterDataService', () => {
  describe('getAgentStatuses', () => {
    it('should return an array of agent statuses', async () => {
      const agents = await commandCenterDataService.getAgentStatuses();
      
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should include all required agent types', async () => {
      const agents = await commandCenterDataService.getAgentStatuses();
      const types = new Set(agents.map(a => a.type));
      
      expect(types.has('stock')).toBe(true);
      expect(types.has('crypto')).toBe(true);
      expect(types.has('sentiment')).toBe(true);
      expect(types.has('macro')).toBe(true);
      expect(types.has('options')).toBe(true);
      expect(types.has('swarm')).toBe(true);
    });

    it('should have valid status values for each agent', async () => {
      const agents = await commandCenterDataService.getAgentStatuses();
      const validStatuses = ['active', 'idle', 'error', 'processing'];
      
      for (const agent of agents) {
        expect(validStatuses).toContain(agent.status);
        expect(typeof agent.accuracy).toBe('number');
        expect(agent.accuracy).toBeGreaterThanOrEqual(0);
        expect(agent.accuracy).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('getAggregatedSignals', () => {
    it('should return an array of signals', async () => {
      const signals = await commandCenterDataService.getAggregatedSignals();
      
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should filter signals by direction', async () => {
      const bullishSignals = await commandCenterDataService.getAggregatedSignals({ direction: 'bullish' });
      
      for (const signal of bullishSignals) {
        expect(signal.direction).toBe('bullish');
      }
    });

    it('should filter signals by minimum confidence', async () => {
      const highConfidenceSignals = await commandCenterDataService.getAggregatedSignals({ minConfidence: 70 });
      
      for (const signal of highConfidenceSignals) {
        expect(signal.confidence).toBeGreaterThanOrEqual(70);
      }
    });

    it('should return signals sorted by confidence descending', async () => {
      const signals = await commandCenterDataService.getAggregatedSignals();
      
      for (let i = 1; i < signals.length; i++) {
        expect(signals[i - 1].confidence).toBeGreaterThanOrEqual(signals[i].confidence);
      }
    });

    it('should include valid signal properties', async () => {
      const signals = await commandCenterDataService.getAggregatedSignals();
      
      for (const signal of signals) {
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('asset');
        expect(signal).toHaveProperty('direction');
        expect(signal).toHaveProperty('strength');
        expect(signal).toHaveProperty('confidence');
        expect(signal).toHaveProperty('source');
        expect(signal).toHaveProperty('timestamp');
        expect(['bullish', 'bearish', 'neutral']).toContain(signal.direction);
        expect(['strong', 'moderate', 'weak']).toContain(signal.strength);
      }
    });
  });

  describe('getPortfolioMetrics', () => {
    it('should return portfolio metrics', async () => {
      const portfolio = await commandCenterDataService.getPortfolioMetrics();
      
      expect(portfolio).toHaveProperty('totalValue');
      expect(portfolio).toHaveProperty('dayPnL');
      expect(portfolio).toHaveProperty('dayPnLPercent');
      expect(portfolio).toHaveProperty('cashAvailable');
      expect(portfolio).toHaveProperty('buyingPower');
      expect(portfolio).toHaveProperty('positions');
      expect(portfolio).toHaveProperty('riskMetrics');
    });

    it('should have valid numeric values', async () => {
      const portfolio = await commandCenterDataService.getPortfolioMetrics();
      
      expect(typeof portfolio.totalValue).toBe('number');
      expect(portfolio.totalValue).toBeGreaterThan(0);
      expect(typeof portfolio.cashAvailable).toBe('number');
      expect(typeof portfolio.buyingPower).toBe('number');
    });

    it('should include positions array', async () => {
      const portfolio = await commandCenterDataService.getPortfolioMetrics();
      
      expect(Array.isArray(portfolio.positions)).toBe(true);
      
      for (const position of portfolio.positions) {
        expect(position).toHaveProperty('symbol');
        expect(position).toHaveProperty('quantity');
        expect(position).toHaveProperty('avgCost');
        expect(position).toHaveProperty('currentPrice');
        expect(position).toHaveProperty('marketValue');
        expect(position).toHaveProperty('unrealizedPnL');
      }
    });

    it('should include risk metrics', async () => {
      const portfolio = await commandCenterDataService.getPortfolioMetrics();
      
      expect(portfolio.riskMetrics).toHaveProperty('sharpeRatio');
      expect(portfolio.riskMetrics).toHaveProperty('maxDrawdown');
      expect(portfolio.riskMetrics).toHaveProperty('volatility');
      expect(portfolio.riskMetrics).toHaveProperty('beta');
      expect(portfolio.riskMetrics).toHaveProperty('var95');
    });
  });

  describe('getPendingActions', () => {
    it('should return an array of pending actions', async () => {
      const actions = await commandCenterDataService.getPendingActions();
      
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should return actions sorted by priority', async () => {
      const actions = await commandCenterDataService.getPendingActions();
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      
      for (let i = 1; i < actions.length; i++) {
        expect(priorityOrder[actions[i - 1].priority]).toBeLessThanOrEqual(priorityOrder[actions[i].priority]);
      }
    });

    it('should include valid action properties', async () => {
      const actions = await commandCenterDataService.getPendingActions();
      
      for (const action of actions) {
        expect(action).toHaveProperty('id');
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('asset');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('confidence');
        expect(action).toHaveProperty('requiresApproval');
        expect(['high', 'medium', 'low']).toContain(action.priority);
      }
    });
  });

  describe('getSummary', () => {
    it('should return a complete summary', async () => {
      const summary = await commandCenterDataService.getSummary();
      
      expect(summary).toHaveProperty('marketRegime');
      expect(summary).toHaveProperty('signalSummary');
      expect(summary).toHaveProperty('agentSummary');
      expect(summary).toHaveProperty('portfolioSummary');
      expect(summary).toHaveProperty('alertCount');
      expect(summary).toHaveProperty('pendingActions');
      expect(summary).toHaveProperty('lastUpdate');
    });

    it('should have valid market regime', async () => {
      const summary = await commandCenterDataService.getSummary();
      
      expect(['risk_on', 'risk_off', 'transition']).toContain(summary.marketRegime.current);
      expect(summary.marketRegime.confidence).toBeGreaterThanOrEqual(0);
      expect(summary.marketRegime.confidence).toBeLessThanOrEqual(100);
    });

    it('should have valid signal summary', async () => {
      const summary = await commandCenterDataService.getSummary();
      
      expect(typeof summary.signalSummary.total).toBe('number');
      expect(typeof summary.signalSummary.bullish).toBe('number');
      expect(typeof summary.signalSummary.bearish).toBe('number');
      expect(typeof summary.signalSummary.neutral).toBe('number');
      expect(summary.signalSummary.total).toBe(
        summary.signalSummary.bullish + 
        summary.signalSummary.bearish + 
        summary.signalSummary.neutral
      );
    });

    it('should have valid agent summary', async () => {
      const summary = await commandCenterDataService.getSummary();
      
      expect(typeof summary.agentSummary.total).toBe('number');
      expect(typeof summary.agentSummary.active).toBe('number');
      expect(summary.agentSummary.active).toBeLessThanOrEqual(summary.agentSummary.total);
      expect(typeof summary.agentSummary.avgAccuracy).toBe('number');
    });
  });

  describe('executeSignal', () => {
    it('should return success result', async () => {
      const result = await commandCenterDataService.executeSignal('test_signal_1');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });

    it('should include order ID on success', async () => {
      const result = await commandCenterDataService.executeSignal('test_signal_1');
      
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toMatch(/^order_/);
    });

    it('should accept execution options', async () => {
      const result = await commandCenterDataService.executeSignal('test_signal_1', {
        size: 'medium',
        orderType: 'limit',
        limitPrice: 150.00
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('limit');
    });
  });

  describe('processVoiceCommand', () => {
    it('should return a valid response', async () => {
      const result = await commandCenterDataService.processVoiceCommand('What is the market status?');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('response');
      expect(result.success).toBe(true);
      expect(typeof result.response).toBe('string');
    });

    it('should handle market status queries', async () => {
      const result = await commandCenterDataService.processVoiceCommand('market status');
      
      expect(result.success).toBe(true);
      expect(result.response.length).toBeGreaterThan(0);
    });

    it('should handle risk queries', async () => {
      const result = await commandCenterDataService.processVoiceCommand('What is the risk level?');
      
      expect(result.success).toBe(true);
      expect(result.response.length).toBeGreaterThan(0);
    });

    it('should handle opportunity queries', async () => {
      const result = await commandCenterDataService.processVoiceCommand('Show me opportunities');
      
      expect(result.success).toBe(true);
      expect(result.response.length).toBeGreaterThan(0);
    });

    it('should include suggested actions', async () => {
      const result = await commandCenterDataService.processVoiceCommand('What should I do?');
      
      expect(result.success).toBe(true);
      if (result.suggestedActions) {
        expect(Array.isArray(result.suggestedActions)).toBe(true);
      }
    });
  });

  describe('approveAction', () => {
    it('should return success result', async () => {
      const result = await commandCenterDataService.approveAction('test_action_1');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });

    it('should include action ID in message', async () => {
      const result = await commandCenterDataService.approveAction('test_action_123');
      
      expect(result.message).toContain('test_action_123');
    });
  });

  describe('rejectAction', () => {
    it('should return success result', async () => {
      const result = await commandCenterDataService.rejectAction('test_action_1');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });

    it('should include reason in message when provided', async () => {
      const result = await commandCenterDataService.rejectAction('test_action_1', 'Too risky');
      
      expect(result.message).toContain('Too risky');
    });

    it('should work without reason', async () => {
      const result = await commandCenterDataService.rejectAction('test_action_1');
      
      expect(result.success).toBe(true);
    });
  });
});
