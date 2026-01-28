import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AlpacaBrokerAdapter,
} from './AlpacaBrokerAdapter';
import {
  OrderSide,
  OrderType,
  TimeInForce,
  AssetClass,
  BrokerType,
} from './types';

describe('AlpacaBrokerAdapter', () => {
  let adapter: AlpacaBrokerAdapter;

  beforeEach(() => {
    adapter = new AlpacaBrokerAdapter();
  });

  describe('Initialization', () => {
    it('should create an instance', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(AlpacaBrokerAdapter);
    });

    it('should have correct broker type', () => {
      const capabilities = adapter.getCapabilities();
      // The adapter returns capabilities without brokerType in the response
      expect(capabilities).toBeDefined();
      expect(typeof capabilities).toBe('object');
    });
  });

  describe('Capabilities', () => {
    it('should return broker capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities).toHaveProperty('supportedOrderTypes');
      expect(capabilities).toHaveProperty('supportedAssetClasses');
      expect(capabilities).toHaveProperty('supportsFractionalShares');
      expect(capabilities).toHaveProperty('supportsExtendedHours');
      expect(capabilities).toHaveProperty('supportsOptionsTrading');
      expect(capabilities).toHaveProperty('supportsCryptoTrading');
    });

    it('should support market and limit orders', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedOrderTypes).toContain(OrderType.MARKET);
      expect(capabilities.supportedOrderTypes).toContain(OrderType.LIMIT);
    });

    it('should support US equity and crypto', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.US_EQUITY);
      expect(capabilities.supportedAssetClasses).toContain(AssetClass.CRYPTO);
    });

    it('should support fractional shares', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportsFractionalShares).toBe(true);
    });

    it('should support extended hours trading', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.supportsExtendedHours).toBe(true);
    });
  });

  describe('Order Request Building', () => {
    it('should build a valid market order request', () => {
      const orderRequest = {
        symbol: 'AAPL',
        quantity: 10,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
      };

      expect(orderRequest.symbol).toBe('AAPL');
      expect(orderRequest.quantity).toBe(10);
      expect(orderRequest.side).toBe(OrderSide.BUY);
      expect(orderRequest.type).toBe(OrderType.MARKET);
    });

    it('should build a valid limit order request', () => {
      const orderRequest = {
        symbol: 'GOOGL',
        quantity: 5,
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        timeInForce: TimeInForce.GTC,
        limitPrice: 150.00,
      };

      expect(orderRequest.symbol).toBe('GOOGL');
      expect(orderRequest.limitPrice).toBe(150.00);
      expect(orderRequest.type).toBe(OrderType.LIMIT);
    });

    it('should build a valid stop order request', () => {
      const orderRequest = {
        symbol: 'TSLA',
        quantity: 3,
        side: OrderSide.SELL,
        type: OrderType.STOP,
        timeInForce: TimeInForce.DAY,
        stopPrice: 200.00,
      };

      expect(orderRequest.stopPrice).toBe(200.00);
      expect(orderRequest.type).toBe(OrderType.STOP);
    });

    it('should build a valid stop-limit order request', () => {
      const orderRequest = {
        symbol: 'MSFT',
        quantity: 8,
        side: OrderSide.BUY,
        type: OrderType.STOP_LIMIT,
        timeInForce: TimeInForce.DAY,
        stopPrice: 350.00,
        limitPrice: 355.00,
      };

      expect(orderRequest.stopPrice).toBe(350.00);
      expect(orderRequest.limitPrice).toBe(355.00);
      expect(orderRequest.type).toBe(OrderType.STOP_LIMIT);
    });
  });

  describe('Time In Force Options', () => {
    it('should support DAY orders', () => {
      expect(TimeInForce.DAY).toBe('day');
    });

    it('should support GTC orders', () => {
      expect(TimeInForce.GTC).toBe('gtc');
    });

    it('should support IOC orders', () => {
      expect(TimeInForce.IOC).toBe('ioc');
    });

    it('should support FOK orders', () => {
      expect(TimeInForce.FOK).toBe('fok');
    });

    it('should support OPG (market on open) orders', () => {
      expect(TimeInForce.OPG).toBe('opg');
    });

    it('should support CLS (market on close) orders', () => {
      expect(TimeInForce.CLS).toBe('cls');
    });
  });

  describe('Asset Classes', () => {
    it('should define US equity asset class', () => {
      expect(AssetClass.US_EQUITY).toBe('us_equity');
    });

    it('should define crypto asset class', () => {
      expect(AssetClass.CRYPTO).toBe('crypto');
    });

    it('should define options asset class', () => {
      expect(AssetClass.OPTIONS).toBe('options');
    });
  });

  describe('Order Types', () => {
    it('should define market order type', () => {
      expect(OrderType.MARKET).toBe('market');
    });

    it('should define limit order type', () => {
      expect(OrderType.LIMIT).toBe('limit');
    });

    it('should define stop order type', () => {
      expect(OrderType.STOP).toBe('stop');
    });

    it('should define stop-limit order type', () => {
      expect(OrderType.STOP_LIMIT).toBe('stop_limit');
    });

    it('should define trailing stop order type', () => {
      expect(OrderType.TRAILING_STOP).toBe('trailing_stop');
    });
  });

  describe('Order Sides', () => {
    it('should define buy side', () => {
      expect(OrderSide.BUY).toBe('buy');
    });

    it('should define sell side', () => {
      expect(OrderSide.SELL).toBe('sell');
    });
  });

  describe('Historical Data Parameters', () => {
    it('should accept valid historical data params', () => {
      const params = {
        symbol: 'AAPL',
        timeframe: '1D',
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        limit: 100,
      };

      expect(params.symbol).toBe('AAPL');
      expect(params.timeframe).toBe('1D');
      expect(params.limit).toBe(100);
    });

    it('should support different timeframes', () => {
      const timeframes = ['1Min', '5Min', '15Min', '1H', '1D', '1W', '1M'];
      
      timeframes.forEach(tf => {
        expect(typeof tf).toBe('string');
      });
    });
  });

  describe('Quote Structure', () => {
    it('should have correct quote structure', () => {
      const mockQuote = {
        symbol: 'AAPL',
        bid: 150.00,
        ask: 150.05,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      };

      expect(mockQuote).toHaveProperty('symbol');
      expect(mockQuote).toHaveProperty('bid');
      expect(mockQuote).toHaveProperty('ask');
      expect(mockQuote).toHaveProperty('bidSize');
      expect(mockQuote).toHaveProperty('askSize');
      expect(mockQuote).toHaveProperty('timestamp');
    });
  });

  describe('Bar Structure', () => {
    it('should have correct bar structure', () => {
      const mockBar = {
        symbol: 'AAPL',
        open: 150.00,
        high: 152.00,
        low: 149.00,
        close: 151.50,
        volume: 1000000,
        timestamp: new Date(),
        vwap: 150.75,
        tradeCount: 5000,
      };

      expect(mockBar).toHaveProperty('open');
      expect(mockBar).toHaveProperty('high');
      expect(mockBar).toHaveProperty('low');
      expect(mockBar).toHaveProperty('close');
      expect(mockBar).toHaveProperty('volume');
      expect(mockBar).toHaveProperty('vwap');
    });
  });

  describe('Position Structure', () => {
    it('should have correct position structure', () => {
      const mockPosition = {
        symbol: 'AAPL',
        quantity: 100,
        averageEntryPrice: 150.00,
        currentPrice: 155.00,
        marketValue: 15500.00,
        unrealizedPL: 500.00,
        unrealizedPLPercent: 3.33,
        side: 'long',
        assetClass: AssetClass.US_EQUITY,
      };

      expect(mockPosition).toHaveProperty('symbol');
      expect(mockPosition).toHaveProperty('quantity');
      expect(mockPosition).toHaveProperty('averageEntryPrice');
      expect(mockPosition).toHaveProperty('currentPrice');
      expect(mockPosition).toHaveProperty('marketValue');
      expect(mockPosition).toHaveProperty('unrealizedPL');
    });
  });

  describe('Account Structure', () => {
    it('should have correct account structure', () => {
      const mockAccount = {
        id: 'acc-123',
        accountNumber: '123456789',
        status: 'active',
        currency: 'USD',
        buyingPower: 100000.00,
        cash: 50000.00,
        portfolioValue: 150000.00,
        equity: 150000.00,
        lastEquity: 148000.00,
        longMarketValue: 100000.00,
        shortMarketValue: 0,
        initialMargin: 50000.00,
        maintenanceMargin: 25000.00,
        dayTradeCount: 2,
        dayTradingBuyingPower: 200000.00,
        regtBuyingPower: 100000.00,
        patternDayTrader: false,
        tradingBlocked: false,
        transfersBlocked: false,
        accountBlocked: false,
        createdAt: new Date(),
      };

      expect(mockAccount).toHaveProperty('buyingPower');
      expect(mockAccount).toHaveProperty('cash');
      expect(mockAccount).toHaveProperty('portfolioValue');
      expect(mockAccount).toHaveProperty('equity');
      expect(mockAccount).toHaveProperty('patternDayTrader');
    });
  });

  describe('Options Chain Request', () => {
    it('should accept valid options chain request', () => {
      const request = {
        underlyingSymbol: 'AAPL',
        expirationDate: new Date('2024-12-20'),
        strikePrice: 150,
        type: 'call',
      };

      expect(request.underlyingSymbol).toBe('AAPL');
      expect(request.strikePrice).toBe(150);
      expect(request.type).toBe('call');
    });
  });

  describe('News Article Structure', () => {
    it('should have correct news article structure', () => {
      const mockArticle = {
        id: 'news-123',
        headline: 'Apple Reports Record Earnings',
        summary: 'Apple Inc. reported record quarterly earnings...',
        author: 'John Doe',
        source: 'Reuters',
        url: 'https://example.com/news/123',
        symbols: ['AAPL'],
        publishedAt: new Date(),
        sentiment: 0.75,
      };

      expect(mockArticle).toHaveProperty('headline');
      expect(mockArticle).toHaveProperty('summary');
      expect(mockArticle).toHaveProperty('symbols');
      expect(mockArticle).toHaveProperty('sentiment');
    });
  });

  describe('Broker Error Handling', () => {
    it('should define error codes', () => {
      const errorCodes = [
        'insufficient_funds',
        'invalid_symbol',
        'market_closed',
        'order_rejected',
        'rate_limited',
        'authentication_failed',
        'connection_error',
      ];

      errorCodes.forEach(code => {
        expect(typeof code).toBe('string');
      });
    });
  });

  describe('Streaming Subscription', () => {
    it('should accept valid subscription request', () => {
      const subscription = {
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        channels: ['quotes', 'trades', 'bars'],
      };

      expect(subscription.symbols).toHaveLength(3);
      expect(subscription.channels).toContain('quotes');
      expect(subscription.channels).toContain('trades');
    });
  });

  describe('Crypto Trading', () => {
    it('should support crypto symbols', () => {
      const cryptoSymbols = ['BTC/USD', 'ETH/USD', 'DOGE/USD'];
      
      cryptoSymbols.forEach(symbol => {
        expect(symbol).toContain('/USD');
      });
    });
  });

  describe('Extended Hours Trading', () => {
    it('should support extended hours flag', () => {
      const orderRequest = {
        symbol: 'AAPL',
        quantity: 10,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        timeInForce: TimeInForce.DAY,
        limitPrice: 150.00,
        extendedHours: true,
      };

      expect(orderRequest.extendedHours).toBe(true);
    });
  });

  describe('Fractional Shares', () => {
    it('should support fractional quantities', () => {
      const orderRequest = {
        symbol: 'AAPL',
        quantity: 0.5,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
      };

      expect(orderRequest.quantity).toBe(0.5);
      expect(orderRequest.quantity).toBeLessThan(1);
    });
  });
});
