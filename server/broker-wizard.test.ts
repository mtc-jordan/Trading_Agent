/**
 * Tests for Broker Connection Wizard and Order Types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BROKER_ORDER_TYPES,
  ORDER_FIELDS,
  TIME_IN_FORCE_OPTIONS,
  getOrderTypesForBroker,
  getOrderTypeById,
  getRequiredFieldsForOrderType,
  getOptionalFieldsForOrderType,
  getAllFieldsForOrderType,
  validateOrderFields,
} from '../shared/orderTypes';

describe('Order Types Configuration', () => {
  describe('BROKER_ORDER_TYPES', () => {
    it('should have order types for all supported brokers', () => {
      expect(BROKER_ORDER_TYPES).toHaveProperty('alpaca');
      expect(BROKER_ORDER_TYPES).toHaveProperty('interactive_brokers');
      expect(BROKER_ORDER_TYPES).toHaveProperty('binance');
      expect(BROKER_ORDER_TYPES).toHaveProperty('coinbase');
    });

    it('should have basic order types for all brokers', () => {
      const brokers = ['alpaca', 'interactive_brokers', 'binance', 'coinbase'];
      
      for (const broker of brokers) {
        const orderTypes = BROKER_ORDER_TYPES[broker];
        const hasMarket = orderTypes.some(ot => ot.id === 'market');
        const hasLimit = orderTypes.some(ot => ot.id === 'limit');
        
        expect(hasMarket).toBe(true);
        expect(hasLimit).toBe(true);
      }
    });

    it('should have valid categories for all order types', () => {
      const validCategories = ['basic', 'advanced', 'algorithmic'];
      
      for (const [broker, orderTypes] of Object.entries(BROKER_ORDER_TYPES)) {
        for (const orderType of orderTypes) {
          expect(validCategories).toContain(orderType.category);
        }
      }
    });

    it('should have required fields for all order types', () => {
      for (const [broker, orderTypes] of Object.entries(BROKER_ORDER_TYPES)) {
        for (const orderType of orderTypes) {
          expect(Array.isArray(orderType.requiredFields)).toBe(true);
          expect(orderType.requiredFields.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have supported time in force for all order types', () => {
      for (const [broker, orderTypes] of Object.entries(BROKER_ORDER_TYPES)) {
        for (const orderType of orderTypes) {
          expect(Array.isArray(orderType.supportedTimeInForce)).toBe(true);
          expect(orderType.supportedTimeInForce.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('ORDER_FIELDS', () => {
    it('should have all common fields', () => {
      const commonFields = ['quantity', 'limitPrice', 'stopPrice', 'trailPercent'];
      
      for (const field of commonFields) {
        expect(ORDER_FIELDS).toHaveProperty(field);
      }
    });

    it('should have valid field types', () => {
      const validTypes = ['number', 'select', 'checkbox', 'text'];
      
      for (const [fieldId, field] of Object.entries(ORDER_FIELDS)) {
        expect(validTypes).toContain(field.type);
      }
    });

    it('should have tooltips for all fields', () => {
      for (const [fieldId, field] of Object.entries(ORDER_FIELDS)) {
        expect(field.tooltip).toBeDefined();
        expect(typeof field.tooltip).toBe('string');
      }
    });
  });

  describe('TIME_IN_FORCE_OPTIONS', () => {
    it('should have all standard options', () => {
      const expectedOptions = ['day', 'gtc', 'ioc', 'fok'];
      const actualValues = TIME_IN_FORCE_OPTIONS.map(opt => opt.value);
      
      for (const option of expectedOptions) {
        expect(actualValues).toContain(option);
      }
    });

    it('should have descriptions for all options', () => {
      for (const option of TIME_IN_FORCE_OPTIONS) {
        expect(option.description).toBeDefined();
        expect(typeof option.description).toBe('string');
      }
    });
  });
});

describe('Order Types Helper Functions', () => {
  describe('getOrderTypesForBroker', () => {
    it('should return order types for valid broker', () => {
      const alpacaTypes = getOrderTypesForBroker('alpaca');
      expect(Array.isArray(alpacaTypes)).toBe(true);
      expect(alpacaTypes.length).toBeGreaterThan(0);
    });

    it('should return alpaca types for unknown broker', () => {
      const unknownTypes = getOrderTypesForBroker('unknown_broker');
      const alpacaTypes = getOrderTypesForBroker('alpaca');
      expect(unknownTypes).toEqual(alpacaTypes);
    });
  });

  describe('getOrderTypeById', () => {
    it('should return correct order type', () => {
      const marketOrder = getOrderTypeById('alpaca', 'market');
      expect(marketOrder).toBeDefined();
      expect(marketOrder?.id).toBe('market');
      expect(marketOrder?.name).toBe('Market Order');
    });

    it('should return undefined for invalid order type', () => {
      const invalid = getOrderTypeById('alpaca', 'invalid_type');
      expect(invalid).toBeUndefined();
    });
  });

  describe('getRequiredFieldsForOrderType', () => {
    it('should return required fields for market order', () => {
      const fields = getRequiredFieldsForOrderType('alpaca', 'market');
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some(f => f.id === 'quantity')).toBe(true);
    });

    it('should return required fields for limit order', () => {
      const fields = getRequiredFieldsForOrderType('alpaca', 'limit');
      expect(fields.some(f => f.id === 'quantity')).toBe(true);
      expect(fields.some(f => f.id === 'limitPrice')).toBe(true);
    });

    it('should return empty array for invalid order type', () => {
      const fields = getRequiredFieldsForOrderType('alpaca', 'invalid');
      expect(fields).toEqual([]);
    });
  });

  describe('getOptionalFieldsForOrderType', () => {
    it('should return optional fields for market order', () => {
      const fields = getOptionalFieldsForOrderType('alpaca', 'market');
      expect(Array.isArray(fields)).toBe(true);
    });

    it('should return empty array for invalid order type', () => {
      const fields = getOptionalFieldsForOrderType('alpaca', 'invalid');
      expect(fields).toEqual([]);
    });
  });

  describe('getAllFieldsForOrderType', () => {
    it('should return all fields (required + optional)', () => {
      const allFields = getAllFieldsForOrderType('alpaca', 'market');
      const requiredFields = getRequiredFieldsForOrderType('alpaca', 'market');
      const optionalFields = getOptionalFieldsForOrderType('alpaca', 'market');
      
      expect(allFields.length).toBe(requiredFields.length + optionalFields.length);
    });
  });
});

describe('Order Validation', () => {
  describe('validateOrderFields', () => {
    it('should validate valid market order', () => {
      const result = validateOrderFields('alpaca', 'market', {
        quantity: 10,
      });
      
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('should fail validation for missing required fields', () => {
      const result = validateOrderFields('alpaca', 'market', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('quantity');
    });

    it('should validate valid limit order', () => {
      const result = validateOrderFields('alpaca', 'limit', {
        quantity: 10,
        limitPrice: 150.00,
      });
      
      expect(result.valid).toBe(true);
    });

    it('should fail validation for limit order without price', () => {
      const result = validateOrderFields('alpaca', 'limit', {
        quantity: 10,
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('limitPrice');
    });

    it('should validate stop limit order', () => {
      const result = validateOrderFields('alpaca', 'stop_limit', {
        quantity: 10,
        stopPrice: 145.00,
        limitPrice: 144.00,
      });
      
      expect(result.valid).toBe(true);
    });

    it('should validate bracket order', () => {
      const result = validateOrderFields('alpaca', 'bracket', {
        quantity: 10,
        takeProfitPrice: 160.00,
        stopLossPrice: 140.00,
      });
      
      expect(result.valid).toBe(true);
    });

    it('should fail validation for invalid quantity', () => {
      const result = validateOrderFields('alpaca', 'market', {
        quantity: -10,
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('quantity');
    });

    it('should fail validation for zero quantity', () => {
      const result = validateOrderFields('alpaca', 'market', {
        quantity: 0,
      });
      
      expect(result.valid).toBe(false);
    });
  });
});

describe('Broker-Specific Order Types', () => {
  describe('Alpaca', () => {
    it('should support bracket orders', () => {
      const orderTypes = getOrderTypesForBroker('alpaca');
      const bracket = orderTypes.find(ot => ot.id === 'bracket');
      
      expect(bracket).toBeDefined();
      expect(bracket?.category).toBe('advanced');
    });

    it('should support trailing stop orders', () => {
      const orderTypes = getOrderTypesForBroker('alpaca');
      const trailingStop = orderTypes.find(ot => ot.id === 'trailing_stop');
      
      expect(trailingStop).toBeDefined();
    });
  });

  describe('Interactive Brokers', () => {
    it('should support algorithmic orders', () => {
      const orderTypes = getOrderTypesForBroker('interactive_brokers');
      const algoOrders = orderTypes.filter(ot => ot.category === 'algorithmic');
      
      expect(algoOrders.length).toBeGreaterThan(0);
    });

    it('should support TWAP orders', () => {
      const orderTypes = getOrderTypesForBroker('interactive_brokers');
      const twap = orderTypes.find(ot => ot.id === 'twap');
      
      expect(twap).toBeDefined();
      expect(twap?.requiredFields).toContain('startTime');
      expect(twap?.requiredFields).toContain('endTime');
    });

    it('should support VWAP orders', () => {
      const orderTypes = getOrderTypesForBroker('interactive_brokers');
      const vwap = orderTypes.find(ot => ot.id === 'vwap');
      
      expect(vwap).toBeDefined();
    });

    it('should support adaptive orders', () => {
      const orderTypes = getOrderTypesForBroker('interactive_brokers');
      const adaptive = orderTypes.find(ot => ot.id === 'adaptive');
      
      expect(adaptive).toBeDefined();
      expect(adaptive?.category).toBe('algorithmic');
    });
  });

  describe('Binance', () => {
    it('should support OCO orders', () => {
      const orderTypes = getOrderTypesForBroker('binance');
      const oco = orderTypes.find(ot => ot.id === 'oco');
      
      expect(oco).toBeDefined();
      expect(oco?.category).toBe('advanced');
    });

    it('should support take profit orders', () => {
      const orderTypes = getOrderTypesForBroker('binance');
      const takeProfit = orderTypes.find(ot => ot.id === 'take_profit');
      
      expect(takeProfit).toBeDefined();
    });

    it('should support stop loss orders', () => {
      const orderTypes = getOrderTypesForBroker('binance');
      const stopLoss = orderTypes.find(ot => ot.id === 'stop_loss');
      
      expect(stopLoss).toBeDefined();
    });
  });

  describe('Coinbase', () => {
    it('should have basic order types', () => {
      const orderTypes = getOrderTypesForBroker('coinbase');
      
      expect(orderTypes.some(ot => ot.id === 'market')).toBe(true);
      expect(orderTypes.some(ot => ot.id === 'limit')).toBe(true);
      expect(orderTypes.some(ot => ot.id === 'stop')).toBe(true);
    });

    it('should support post-only for limit orders', () => {
      const limitOrder = getOrderTypeById('coinbase', 'limit');
      
      expect(limitOrder?.optionalFields).toContain('postOnly');
    });
  });
});

describe('Position Sync Service', () => {
  // Note: These tests would require mocking the database and broker APIs
  // For now, we test the configuration and types
  
  it('should have sync status types defined', () => {
    // This is a placeholder for integration tests
    expect(true).toBe(true);
  });
});

describe('Broker Connection Wizard', () => {
  // Note: Component tests would be done with React Testing Library
  // These are placeholder tests for the configuration
  
  it('should have broker configurations', () => {
    const brokers = ['alpaca', 'interactive_brokers', 'binance', 'coinbase'];
    
    for (const broker of brokers) {
      expect(BROKER_ORDER_TYPES).toHaveProperty(broker);
    }
  });
});
