/**
 * Tests for Simulation Templates and Trade Execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByRiskLevel,
  searchTemplates,
  generateTradesFromTemplate,
  createCustomTemplate,
} from './services/simulationTemplates';
import {
  validateTrades,
} from './services/tradeExecution';

describe('Simulation Templates Service', () => {
  describe('getAllTemplates', () => {
    it('should return all built-in templates', () => {
      const templates = getAllTemplates();
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have required fields on each template', () => {
      const templates = getAllTemplates();
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.riskLevel).toBeDefined();
        expect(template.targetAllocation).toBeDefined();
        expect(Array.isArray(template.targetAllocation)).toBe(true);
        expect(template.estimatedVolatility).toBeGreaterThan(0);
        expect(template.estimatedReturn).toBeDefined();
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return template by valid ID', () => {
      const templates = getAllTemplates();
      const firstTemplate = templates[0];
      const result = getTemplateById(firstTemplate.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(firstTemplate.id);
    });

    it('should return undefined for invalid ID', () => {
      const result = getTemplateById('invalid-id-12345');
      expect(result).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for sector_rotation category', () => {
      const templates = getTemplatesByCategory('sector_rotation');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.category).toBe('sector_rotation');
      });
    });

    it('should return templates for dividend_growth category', () => {
      const templates = getTemplatesByCategory('dividend_growth');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.category).toBe('dividend_growth');
      });
    });

    it('should return templates for momentum category', () => {
      const templates = getTemplatesByCategory('momentum');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.category).toBe('momentum');
      });
    });

    it('should return templates for balanced category', () => {
      const templates = getTemplatesByCategory('balanced');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.category).toBe('balanced');
      });
    });
  });

  describe('getTemplatesByRiskLevel', () => {
    it('should return conservative templates', () => {
      const templates = getTemplatesByRiskLevel('conservative');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.riskLevel).toBe('conservative');
      });
    });

    it('should return moderate templates', () => {
      const templates = getTemplatesByRiskLevel('moderate');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.riskLevel).toBe('moderate');
      });
    });

    it('should return aggressive templates', () => {
      const templates = getTemplatesByRiskLevel('aggressive');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.riskLevel).toBe('aggressive');
      });
    });
  });

  describe('searchTemplates', () => {
    it('should find templates by name', () => {
      const results = searchTemplates('dividend');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(
          t.name.toLowerCase().includes('dividend') ||
          t.description.toLowerCase().includes('dividend') ||
          t.tags.some(tag => tag.includes('dividend'))
        ).toBe(true);
      });
    });

    it('should find templates by tag', () => {
      const results = searchTemplates('growth');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = searchTemplates('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });

  describe('generateTradesFromTemplate', () => {
    it('should generate buy trades for empty portfolio', () => {
      const template = getTemplateById('classic-60-40');
      expect(template).toBeDefined();
      
      const trades = generateTradesFromTemplate(
        template!,
        100000,
        [],
        100000
      );
      
      expect(trades.length).toBeGreaterThan(0);
      trades.forEach(trade => {
        expect(trade.side).toBe('buy');
        expect(trade.quantity).toBeGreaterThan(0);
        expect(trade.estimatedPrice).toBeGreaterThan(0);
      });
    });

    it('should generate sell trades for positions not in template', () => {
      const template = getTemplateById('classic-60-40');
      expect(template).toBeDefined();
      
      const currentPositions = [
        { symbol: 'AAPL', quantity: 100, currentPrice: 175 },
        { symbol: 'TSLA', quantity: 50, currentPrice: 250 },
      ];
      
      const trades = generateTradesFromTemplate(
        template!,
        100000,
        currentPositions,
        50000
      );
      
      // Should have sell trades for AAPL and TSLA since they're not in 60/40
      const sellTrades = trades.filter(t => t.side === 'sell');
      expect(sellTrades.length).toBeGreaterThan(0);
    });

    it('should respect target allocations', () => {
      const template = getTemplateById('classic-60-40');
      expect(template).toBeDefined();
      
      const trades = generateTradesFromTemplate(
        template!,
        100000,
        [],
        100000
      );
      
      // Check that trades are generated for template allocations
      const tradeSymbols = trades.map(t => t.symbol);
      template!.targetAllocation.forEach(alloc => {
        // Most allocations should have corresponding trades
        if (alloc.targetPercent >= 10) {
          expect(tradeSymbols).toContain(alloc.symbol);
        }
      });
    });
  });

  describe('createCustomTemplate', () => {
    it('should create a custom template with correct fields', () => {
      const allocations = [
        { symbol: 'AAPL', name: 'Apple Inc.', targetPercent: 50, sector: 'Technology', assetClass: 'stock' as const },
        { symbol: 'MSFT', name: 'Microsoft', targetPercent: 50, sector: 'Technology', assetClass: 'stock' as const },
      ];
      
      const template = createCustomTemplate(
        'My Custom Template',
        'A custom template for testing',
        allocations,
        'moderate',
        'quarterly'
      );
      
      expect(template.id).toBeDefined();
      expect(template.name).toBe('My Custom Template');
      expect(template.description).toBe('A custom template for testing');
      expect(template.category).toBe('custom');
      expect(template.riskLevel).toBe('moderate');
      expect(template.rebalanceFrequency).toBe('quarterly');
      expect(template.targetAllocation).toEqual(allocations);
      expect(template.isBuiltIn).toBe(false);
    });

    it('should calculate estimated volatility based on asset classes', () => {
      const stockAllocations = [
        { symbol: 'AAPL', name: 'Apple', targetPercent: 100, sector: 'Tech', assetClass: 'stock' as const },
      ];
      
      const bondAllocations = [
        { symbol: 'BND', name: 'Bond ETF', targetPercent: 100, sector: 'Fixed Income', assetClass: 'bond' as const },
      ];
      
      const stockTemplate = createCustomTemplate('Stock', 'Stocks', stockAllocations, 'aggressive', 'monthly');
      const bondTemplate = createCustomTemplate('Bond', 'Bonds', bondAllocations, 'conservative', 'annually');
      
      // Stock template should have higher volatility than bond template
      expect(stockTemplate.estimatedVolatility).toBeGreaterThan(bondTemplate.estimatedVolatility);
    });
  });
});

describe('Trade Execution Service', () => {
  describe('validateTrades', () => {
    it('should validate correct trades', () => {
      const trades = [
        { symbol: 'AAPL', side: 'buy' as const, quantity: 10, estimatedPrice: 175 },
        { symbol: 'MSFT', side: 'sell' as const, quantity: 5, estimatedPrice: 375 },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject trades with empty symbol', () => {
      const trades = [
        { symbol: '', side: 'buy' as const, quantity: 10, estimatedPrice: 175 },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject trades with invalid quantity', () => {
      const trades = [
        { symbol: 'AAPL', side: 'buy' as const, quantity: 0, estimatedPrice: 175 },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('quantity'))).toBe(true);
    });

    it('should reject trades with negative quantity', () => {
      const trades = [
        { symbol: 'AAPL', side: 'buy' as const, quantity: -5, estimatedPrice: 175 },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(false);
    });

    it('should require limit price for limit orders', () => {
      const trades = [
        { symbol: 'AAPL', side: 'buy' as const, quantity: 10, estimatedPrice: 175, orderType: 'limit' as const },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('limit') || e.includes('Limit'))).toBe(true);
    });

    it('should require stop price for stop orders', () => {
      const trades = [
        { symbol: 'AAPL', side: 'sell' as const, quantity: 10, estimatedPrice: 175, orderType: 'stop' as const },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('stop') || e.includes('Stop'))).toBe(true);
    });

    it('should require both prices for stop-limit orders', () => {
      const trades = [
        { symbol: 'AAPL', side: 'sell' as const, quantity: 10, estimatedPrice: 175, orderType: 'stop_limit' as const, limitPrice: 170 },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(false);
    });

    it('should accept valid limit order with limit price', () => {
      const trades = [
        { symbol: 'AAPL', side: 'buy' as const, quantity: 10, estimatedPrice: 175, orderType: 'limit' as const, limitPrice: 170 },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(true);
    });

    it('should accept valid stop-limit order with both prices', () => {
      const trades = [
        { 
          symbol: 'AAPL', 
          side: 'sell' as const, 
          quantity: 10, 
          estimatedPrice: 175, 
          orderType: 'stop_limit' as const, 
          limitPrice: 165, 
          stopPrice: 170 
        },
      ];
      
      const result = validateTrades(trades);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Template Categories', () => {
  it('should have templates in all major categories', () => {
    const categories = ['sector_rotation', 'dividend_growth', 'momentum', 'value', 'defensive', 'growth', 'balanced'] as const;
    
    categories.forEach(category => {
      const templates = getTemplatesByCategory(category);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  it('should have templates at all risk levels', () => {
    const riskLevels = ['conservative', 'moderate', 'aggressive'] as const;
    
    riskLevels.forEach(level => {
      const templates = getTemplatesByRiskLevel(level);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  it('should have valid allocation percentages that sum to 100', () => {
    const templates = getAllTemplates();
    
    templates.forEach(template => {
      const totalPercent = template.targetAllocation.reduce((sum, a) => sum + a.targetPercent, 0);
      expect(totalPercent).toBe(100);
    });
  });
});
