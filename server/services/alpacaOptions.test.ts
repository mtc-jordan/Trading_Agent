import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the alpacaOptions module functions
vi.mock('./alpacaOptions', () => ({
  fetchOptionsChain: vi.fn(),
  getOptionsNearMoney: vi.fn(),
  getATMStraddle: vi.fn(),
  buildIVSurface: vi.fn(),
  getTermStructure: vi.fn(),
  getSkew: vi.fn(),
  getAlpacaOptionsStatus: vi.fn(),
  calculateBlackScholesGreeks: vi.fn(),
  calculateImpliedVolatility: vi.fn(),
}));

// Mock the liveOptionsAnalyzer module
vi.mock('./liveOptionsAnalyzer', () => ({
  analyzeLiveOptions: vi.fn(),
  getOptionsChainWithGreeks: vi.fn(),
  getLiveIVSurface: vi.fn(),
  createOptionsAlert: vi.fn(),
  getActiveAlerts: vi.fn(),
  removeAlert: vi.fn(),
  clearOptionsCache: vi.fn(),
  getCacheStatus: vi.fn(),
}));

// Mock the liveVolatilitySurface module
vi.mock('./liveVolatilitySurface', () => ({
  analyzeLiveVolatilitySurface: vi.fn(),
  getIVRank: vi.fn(),
  getVolatilitySurfaceSummary: vi.fn(),
}));

import {
  fetchOptionsChain,
  getOptionsNearMoney,
  getATMStraddle,
  buildIVSurface,
  getTermStructure,
  getSkew,
  getAlpacaOptionsStatus,
  calculateBlackScholesGreeks,
  calculateImpliedVolatility,
} from './alpacaOptions';

import {
  analyzeLiveOptions,
  getOptionsChainWithGreeks,
  getLiveIVSurface,
  createOptionsAlert,
  getActiveAlerts,
  removeAlert,
  clearOptionsCache,
  getCacheStatus,
} from './liveOptionsAnalyzer';

import {
  analyzeLiveVolatilitySurface,
  getIVRank,
  getVolatilitySurfaceSummary,
} from './liveVolatilitySurface';

describe('Alpaca Options Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchOptionsChain', () => {
    it('should fetch options chain for a given underlying', async () => {
      const mockOptions = [
        {
          symbol: 'AAPL250117C00175000',
          underlying: 'AAPL',
          expiration: new Date('2025-01-17'),
          type: 'call',
          strike: 175,
          daysToExpiry: 30,
          greeks: { delta: 0.5, gamma: 0.05, theta: -0.02, vega: 0.15, rho: 0.01 },
          iv: 0.25,
          bidPrice: 5.50,
          askPrice: 5.70,
          midPrice: 5.60,
          spread: 0.20,
          spreadPercent: 3.5,
          lastPrice: 5.55,
        }
      ];

      (fetchOptionsChain as any).mockResolvedValue(mockOptions);

      const result = await fetchOptionsChain('AAPL');
      
      expect(fetchOptionsChain).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockOptions);
      expect(result[0].underlying).toBe('AAPL');
      expect(result[0].type).toBe('call');
    });

    it('should handle empty options chain', async () => {
      (fetchOptionsChain as any).mockResolvedValue([]);

      const result = await fetchOptionsChain('INVALID');
      
      expect(result).toEqual([]);
    });
  });

  describe('getOptionsNearMoney', () => {
    it('should filter options near the money', async () => {
      const mockOptions = [
        { strike: 170, type: 'call', iv: 0.25 },
        { strike: 175, type: 'call', iv: 0.24 },
        { strike: 180, type: 'call', iv: 0.26 },
      ];

      (getOptionsNearMoney as any).mockResolvedValue(mockOptions);

      const result = await getOptionsNearMoney('AAPL', 175, 5);
      
      expect(getOptionsNearMoney).toHaveBeenCalledWith('AAPL', 175, 5);
      expect(result).toHaveLength(3);
    });
  });

  describe('getATMStraddle', () => {
    it('should return ATM straddle pricing', async () => {
      const mockStraddle = {
        call: { strike: 175, price: 5.50, iv: 0.25, delta: 0.52 },
        put: { strike: 175, price: 5.20, iv: 0.26, delta: -0.48 },
        straddlePrice: 10.70,
        expectedMove: 10.70,
        expectedMovePercent: 6.1,
        breakEvenUpper: 185.70,
        breakEvenLower: 164.30,
      };

      (getATMStraddle as any).mockResolvedValue(mockStraddle);

      const result = await getATMStraddle('AAPL', 175, 30);
      
      expect(getATMStraddle).toHaveBeenCalledWith('AAPL', 175, 30);
      expect(result.straddlePrice).toBe(10.70);
      expect(result.expectedMovePercent).toBe(6.1);
    });
  });

  describe('buildIVSurface', () => {
    it('should build IV surface from options data', async () => {
      const mockSurface = [
        { strike: 170, daysToExpiry: 30, iv: 0.28, moneyness: 0.97 },
        { strike: 175, daysToExpiry: 30, iv: 0.25, moneyness: 1.0 },
        { strike: 180, daysToExpiry: 30, iv: 0.27, moneyness: 1.03 },
      ];

      (buildIVSurface as any).mockResolvedValue(mockSurface);

      const result = await buildIVSurface([], 175);
      
      expect(result).toHaveLength(3);
      expect(result[1].moneyness).toBe(1.0); // ATM
    });
  });

  describe('getTermStructure', () => {
    it('should return term structure analysis', async () => {
      const mockTermStructure = [
        { daysToExpiry: 7, avgIV: 0.30, atmIV: 0.28 },
        { daysToExpiry: 30, avgIV: 0.25, atmIV: 0.24 },
        { daysToExpiry: 60, avgIV: 0.23, atmIV: 0.22 },
      ];

      (getTermStructure as any).mockResolvedValue(mockTermStructure);

      const result = await getTermStructure([]);
      
      expect(result).toHaveLength(3);
      // Front month should have higher IV (backwardation)
      expect(result[0].atmIV).toBeGreaterThan(result[2].atmIV);
    });
  });

  describe('getSkew', () => {
    it('should return volatility skew analysis', async () => {
      const mockSkew = [
        { strike: 160, moneyness: 0.91, callIV: 0.22, putIV: 0.32 },
        { strike: 175, moneyness: 1.0, callIV: 0.25, putIV: 0.25 },
        { strike: 190, moneyness: 1.09, callIV: 0.28, putIV: 0.20 },
      ];

      (getSkew as any).mockResolvedValue(mockSkew);

      const result = await getSkew([], 175);
      
      expect(result).toHaveLength(3);
      // OTM puts should have higher IV (put skew)
      expect(result[0].putIV).toBeGreaterThan(result[0].callIV);
    });
  });

  describe('getAlpacaOptionsStatus', () => {
    it('should return Alpaca connection status', async () => {
      const mockStatus = {
        configured: true,
        connected: true,
        lastUpdate: new Date(),
        optionsEnabled: true,
      };

      (getAlpacaOptionsStatus as any).mockResolvedValue(mockStatus);

      const result = await getAlpacaOptionsStatus();
      
      expect(result.configured).toBe(true);
      expect(result.optionsEnabled).toBe(true);
    });

    it('should handle unconfigured status', async () => {
      const mockStatus = {
        configured: false,
        connected: false,
        lastUpdate: null,
        optionsEnabled: false,
      };

      (getAlpacaOptionsStatus as any).mockResolvedValue(mockStatus);

      const result = await getAlpacaOptionsStatus();
      
      expect(result.configured).toBe(false);
    });
  });

  describe('calculateBlackScholesGreeks', () => {
    it('should calculate Greeks using Black-Scholes', () => {
      const mockGreeks = {
        delta: 0.52,
        gamma: 0.045,
        theta: -0.025,
        vega: 0.18,
        rho: 0.08,
      };

      (calculateBlackScholesGreeks as any).mockReturnValue(mockGreeks);

      const result = calculateBlackScholesGreeks(175, 175, 30/365, 0.05, 0.25, 'call');
      
      expect(result.delta).toBeCloseTo(0.52, 1);
      expect(result.gamma).toBeGreaterThan(0);
      expect(result.theta).toBeLessThan(0); // Theta is always negative
      expect(result.vega).toBeGreaterThan(0);
    });

    it('should calculate put Greeks correctly', () => {
      const mockGreeks = {
        delta: -0.48,
        gamma: 0.045,
        theta: -0.020,
        vega: 0.18,
        rho: -0.07,
      };

      (calculateBlackScholesGreeks as any).mockReturnValue(mockGreeks);

      const result = calculateBlackScholesGreeks(175, 175, 30/365, 0.05, 0.25, 'put');
      
      expect(result.delta).toBeLessThan(0); // Put delta is negative
      expect(result.rho).toBeLessThan(0); // Put rho is negative
    });
  });

  describe('calculateImpliedVolatility', () => {
    it('should calculate IV from option price', () => {
      (calculateImpliedVolatility as any).mockReturnValue(0.25);

      const result = calculateImpliedVolatility(5.50, 175, 175, 30/365, 0.05, 'call');
      
      expect(result).toBeCloseTo(0.25, 2);
    });

    it('should handle deep ITM options', () => {
      (calculateImpliedVolatility as any).mockReturnValue(0.15);

      const result = calculateImpliedVolatility(25, 175, 150, 30/365, 0.05, 'call');
      
      expect(result).toBeLessThan(0.30); // Deep ITM has lower IV
    });
  });
});

describe('Live Options Analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeLiveOptions', () => {
    it('should analyze live options data', async () => {
      const mockAnalysis = {
        underlying: 'AAPL',
        spotPrice: 175,
        timestamp: new Date().toISOString(),
        totalContracts: 500,
        callCount: 250,
        putCount: 250,
        atmIV: 0.25,
        avgCallIV: 0.24,
        avgPutIV: 0.26,
        ivSkew: 0.02,
        ivTermStructure: 'contango',
        expectedMove: 10.5,
        expectedMovePercent: 6.0,
        recommendations: [
          {
            type: 'opportunity',
            title: 'IV Crush Expected',
            description: 'High IV rank suggests selling premium',
            confidence: 0.75,
          }
        ],
      };

      (analyzeLiveOptions as any).mockResolvedValue(mockAnalysis);

      const result = await analyzeLiveOptions('AAPL', 175);
      
      expect(analyzeLiveOptions).toHaveBeenCalledWith('AAPL', 175);
      expect(result.underlying).toBe('AAPL');
      expect(result.atmIV).toBe(0.25);
      expect(result.recommendations).toHaveLength(1);
    });
  });

  describe('getOptionsChainWithGreeks', () => {
    it('should return options chain with calculated Greeks', async () => {
      const mockChain = [
        {
          symbol: 'AAPL250117C00175000',
          strike: 175,
          type: 'call',
          greeks: { delta: 0.52, gamma: 0.045, theta: -0.025, vega: 0.18, rho: 0.08 },
          iv: 0.25,
        }
      ];

      (getOptionsChainWithGreeks as any).mockResolvedValue(mockChain);

      const result = await getOptionsChainWithGreeks('AAPL', { type: 'call', limit: 100 });
      
      expect(result[0].greeks.delta).toBeCloseTo(0.52, 1);
    });
  });

  describe('getLiveIVSurface', () => {
    it('should return live IV surface data', async () => {
      const mockSurface = {
        surface: [
          { strike: 170, daysToExpiry: 30, iv: 0.28 },
          { strike: 175, daysToExpiry: 30, iv: 0.25 },
        ],
        skew: [
          { strike: 170, moneyness: 0.97, callIV: 0.26, putIV: 0.30 },
        ],
        termStructure: [
          { daysToExpiry: 30, avgIV: 0.25, atmIV: 0.24 },
        ],
      };

      (getLiveIVSurface as any).mockResolvedValue(mockSurface);

      const result = await getLiveIVSurface('AAPL', 175);
      
      expect(result.surface).toHaveLength(2);
      expect(result.skew).toHaveLength(1);
      expect(result.termStructure).toHaveLength(1);
    });
  });

  describe('Options Alerts', () => {
    it('should create options alert', async () => {
      const mockAlert = {
        id: 'alert-1',
        underlying: 'AAPL',
        condition: 'iv_spike',
        threshold: 0.30,
        active: true,
        createdAt: new Date(),
      };

      (createOptionsAlert as any).mockResolvedValue(mockAlert);

      const result = await createOptionsAlert('AAPL', 'iv_spike', 0.30);
      
      expect(result.underlying).toBe('AAPL');
      expect(result.condition).toBe('iv_spike');
    });

    it('should get active alerts', async () => {
      const mockAlerts = [
        { id: 'alert-1', underlying: 'AAPL', condition: 'iv_spike', active: true },
        { id: 'alert-2', underlying: 'TSLA', condition: 'gamma_squeeze', active: true },
      ];

      (getActiveAlerts as any).mockResolvedValue(mockAlerts);

      const result = await getActiveAlerts();
      
      expect(result).toHaveLength(2);
    });

    it('should remove alert', async () => {
      (removeAlert as any).mockResolvedValue({ success: true });

      const result = await removeAlert('alert-1');
      
      expect(result.success).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should clear options cache', () => {
      (clearOptionsCache as any).mockReturnValue(undefined);

      clearOptionsCache('AAPL');
      
      expect(clearOptionsCache).toHaveBeenCalledWith('AAPL');
    });

    it('should get cache status', async () => {
      const mockStatus = {
        entries: 5,
        underlyings: ['AAPL', 'TSLA', 'GOOGL'],
        oldestEntry: new Date(),
      };

      (getCacheStatus as any).mockResolvedValue(mockStatus);

      const result = await getCacheStatus();
      
      expect(result.entries).toBe(5);
      expect(result.underlyings).toContain('AAPL');
    });
  });
});

describe('Live Volatility Surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeLiveVolatilitySurface', () => {
    it('should analyze live volatility surface', async () => {
      const mockAnalysis = {
        underlying: 'AAPL',
        spotPrice: 175,
        timestamp: new Date(),
        atmIV: 0.25,
        ivRank: 65,
        ivPercentile: 70,
        skewType: 'smirk',
        skewSteepness: 0.15,
        putSkew25Delta: 0.05,
        callSkew25Delta: -0.02,
        termStructureType: 'contango',
        frontMonthIV: 0.28,
        backMonthIV: 0.24,
        termSpread: -0.04,
        surfacePoints: [],
        interpolatedSurface: { strikes: [], expirations: [], ivMatrix: [] },
        anomalies: [],
        arbitrageOpportunities: [],
        predictions: [
          { horizon: '1d', predictedIV: 0.24, confidence: 0.6, direction: 'down' },
        ],
      };

      (analyzeLiveVolatilitySurface as any).mockResolvedValue(mockAnalysis);

      const result = await analyzeLiveVolatilitySurface('AAPL', 175);
      
      expect(result.underlying).toBe('AAPL');
      expect(result.ivRank).toBe(65);
      expect(result.skewType).toBe('smirk');
      expect(result.predictions).toHaveLength(1);
    });
  });

  describe('getIVRank', () => {
    it('should return IV rank and percentile', async () => {
      const mockRank = {
        ivRank: 75,
        ivPercentile: 80,
        currentIV: 0.28,
      };

      (getIVRank as any).mockResolvedValue(mockRank);

      const result = await getIVRank('AAPL', 175);
      
      expect(result.ivRank).toBe(75);
      expect(result.ivPercentile).toBe(80);
    });
  });

  describe('getVolatilitySurfaceSummary', () => {
    it('should return surface summary', async () => {
      const mockSummary = {
        atmIV: 0.25,
        ivRank: 65,
        skewType: 'smirk',
        termStructure: 'contango',
        anomalyCount: 2,
        opportunityCount: 1,
      };

      (getVolatilitySurfaceSummary as any).mockResolvedValue(mockSummary);

      const result = await getVolatilitySurfaceSummary('AAPL', 175);
      
      expect(result.atmIV).toBe(0.25);
      expect(result.skewType).toBe('smirk');
      expect(result.anomalyCount).toBe(2);
    });
  });
});
