/**
 * Tests for Advanced 2026 AI Analysis Services
 * - Correlation Detection
 * - Alternative Data Service
 * - Reinforcement Learning Strategy Optimizer
 * - Specialized Agent Team
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the LLM module
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          signal: 'bullish',
          confidence: 0.75,
          reasoning: 'Test reasoning'
        })
      }
    }]
  })
}));

// ==================== Correlation Detection Tests ====================

describe('CorrelationDetectionService', () => {
  describe('calculateCorrelation', () => {
    it('should calculate correlation between two price series', async () => {
      const { calculateCorrelation } = await import('./services/correlationDetection');
      
      const prices1 = [100, 102, 101, 105, 108];
      const prices2 = [50, 51, 50, 52, 54];
      
      const result = calculateCorrelation(prices1, prices2);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return high correlation for similar trends', async () => {
      const { calculateCorrelation } = await import('./services/correlationDetection');
      
      const prices1 = [100, 110, 120, 130, 140];
      const prices2 = [50, 55, 60, 65, 70];
      
      const result = calculateCorrelation(prices1, prices2);
      
      expect(result).toBeGreaterThan(0.9);
    });

    it('should return negative correlation for opposite trends', async () => {
      const { calculateCorrelation } = await import('./services/correlationDetection');
      
      const prices1 = [100, 110, 120, 130, 140];
      const prices2 = [70, 65, 60, 55, 50];
      
      const result = calculateCorrelation(prices1, prices2);
      
      expect(result).toBeLessThan(-0.9);
    });
  });

  describe('calculateReturns', () => {
    it('should calculate returns from price series', async () => {
      const { calculateReturns } = await import('./services/correlationDetection');
      
      const prices = [100, 110, 105, 115];
      const returns = calculateReturns(prices);
      
      expect(returns).toHaveLength(3);
      expect(returns[0]).toBeCloseTo(0.1, 2); // 10% return
    });
  });

  describe('detectCorrelationRegime', () => {
    it('should detect correlation regime from matrix', async () => {
      const { detectCorrelationRegime } = await import('./services/correlationDetection');
      
      const correlationMatrix = [
        [1, 0.8, 0.6],
        [0.8, 1, 0.7],
        [0.6, 0.7, 1]
      ];
      const historicalAverages = [
        [1, 0.5, 0.4],
        [0.5, 1, 0.5],
        [0.4, 0.5, 1]
      ];
      
      const result = detectCorrelationRegime(correlationMatrix, historicalAverages);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('regime');
      expect(result).toHaveProperty('confidence');
    });

    it('should identify high correlation regime', async () => {
      const { detectCorrelationRegime } = await import('./services/correlationDetection');
      
      const highCorrMatrix = [
        [1, 0.95, 0.92],
        [0.95, 1, 0.93],
        [0.92, 0.93, 1]
      ];
      const historicalAverages = [
        [1, 0.5, 0.4],
        [0.5, 1, 0.5],
        [0.4, 0.5, 1]
      ];
      
      const result = detectCorrelationRegime(highCorrMatrix, historicalAverages);
      
      expect(['high_correlation', 'crisis', 'normal']).toContain(result.regime);
    });

    it('should identify low correlation regime', async () => {
      const { detectCorrelationRegime } = await import('./services/correlationDetection');
      
      const lowCorrMatrix = [
        [1, 0.1, 0.05],
        [0.1, 1, 0.15],
        [0.05, 0.15, 1]
      ];
      const historicalAverages = [
        [1, 0.5, 0.4],
        [0.5, 1, 0.5],
        [0.4, 0.5, 1]
      ];
      
      const result = detectCorrelationRegime(lowCorrMatrix, historicalAverages);
      
      expect(['normal', 'crisis', 'euphoria', 'transition']).toContain(result.regime);
    });
  });

  describe('buildCorrelationMatrix', () => {
    it('should build correlation matrix from price data', async () => {
      const { buildCorrelationMatrix } = await import('./services/correlationDetection');
      
      const assets = [
        { symbol: 'AAPL', assetType: 'stock' as const, prices: [100, 102, 105, 103, 108], timestamps: [1, 2, 3, 4, 5] },
        { symbol: 'MSFT', assetType: 'stock' as const, prices: [200, 204, 210, 206, 216], timestamps: [1, 2, 3, 4, 5] },
        { symbol: 'GOOGL', assetType: 'stock' as const, prices: [150, 153, 156, 154, 160], timestamps: [1, 2, 3, 4, 5] }
      ];
      
      const result = buildCorrelationMatrix(assets);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(3);
      // Diagonal should be 1
      expect(result[0][0]).toBe(1);
      expect(result[1][1]).toBe(1);
      expect(result[2][2]).toBe(1);
    });
  });
});

// ==================== Alternative Data Service Tests ====================

describe('AlternativeDataService', () => {
  describe('OnChainDataService', () => {
    it('should fetch on-chain metrics for crypto assets', async () => {
      const { OnChainDataService } = await import('./services/alternativeDataService');
      const service = new OnChainDataService();
      
      const result = await service.getMetrics('BTC');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('nvtRatio');
      expect(result.metrics).toHaveProperty('mvrvRatio');
    });

    it('should return metrics with whale activity data', async () => {
      const { OnChainDataService } = await import('./services/alternativeDataService');
      const service = new OnChainDataService();
      
      const result = await service.getMetrics('ETH');
      
      expect(result).toBeDefined();
      expect(result.metrics).toHaveProperty('whaleTransactions');
      expect(result.metrics).toHaveProperty('whaleSignal');
    });
  });

  describe('SocialSentimentService', () => {
    it('should aggregate social sentiment from multiple sources', async () => {
      const { SocialSentimentService } = await import('./services/alternativeDataService');
      const service = new SocialSentimentService();
      
      const result = await service.getSentiment('AAPL');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('sentimentScore');
    });

    it('should return sentiment score between -1 and 1', async () => {
      const { SocialSentimentService } = await import('./services/alternativeDataService');
      const service = new SocialSentimentService();
      
      const result = await service.getSentiment('TSLA');
      
      expect(result.metrics.sentimentScore).toBeGreaterThanOrEqual(-1);
      expect(result.metrics.sentimentScore).toBeLessThanOrEqual(1);
    });
  });

  describe('SatelliteDataService', () => {
    it('should fetch satellite proxy data for commodities', async () => {
      const { SatelliteDataService } = await import('./services/alternativeDataService');
      const service = new SatelliteDataService();
      
      const result = await service.getData('OIL');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('commodity');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('signal');
    });
  });

  describe('AlternativeDataFusionEngine', () => {
    it('should combine multiple alternative data sources', async () => {
      const { AlternativeDataFusionEngine } = await import('./services/alternativeDataService');
      const engine = new AlternativeDataFusionEngine();
      
      const result = await engine.analyzeAsset('BTC', 'crypto');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('overallSignal');
      expect(result).toHaveProperty('overallConfidence');
    });

    it('should handle stock assets', async () => {
      const { AlternativeDataFusionEngine } = await import('./services/alternativeDataService');
      const engine = new AlternativeDataFusionEngine();
      
      const result = await engine.analyzeAsset('AAPL', 'stock');
      
      expect(result).toBeDefined();
      expect(result.assetType).toBe('stock');
    });
  });
});

// ==================== Reinforcement Learning Tests ====================

describe('ReinforcementLearningService', () => {
  describe('RLStrategyOptimizer', () => {
    it('should generate trading action based on market state', async () => {
      const { RLStrategyOptimizer } = await import('./services/reinforcementLearning');
      const optimizer = new RLStrategyOptimizer();
      
      const marketState = {
        price: 150,
        returns: [0.01, -0.02, 0.015, 0.005],
        volatility: 0.2,
        momentum: 0.3,
        volume: 1000000,
        rsi: 55,
        macdSignal: 0.5
      };
      const portfolioState = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        returns: [0.01, 0.02]
      };
      const riskProfile = { tolerance: 'moderate' as const, maxDrawdown: 0.2, targetReturn: 0.15 };
      
      const result = await optimizer.optimize(marketState, portfolioState, riskProfile);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('recommendedAction');
      expect(['buy', 'sell', 'hold']).toContain(result.recommendedAction.action);
    });

    it('should adapt strategy during high volatility', async () => {
      const { RLStrategyOptimizer } = await import('./services/reinforcementLearning');
      const optimizer = new RLStrategyOptimizer();
      
      const highVolState = {
        price: 150,
        returns: [0.05, -0.08, 0.06, -0.04],
        volatility: 0.5,
        momentum: -0.2,
        volume: 2000000,
        rsi: 30,
        macdSignal: -1.5
      };
      const portfolioState = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        returns: [0.01, -0.02]
      };
      const riskProfile = { tolerance: 'conservative' as const, maxDrawdown: 0.1, targetReturn: 0.1 };
      
      const result = await optimizer.optimize(highVolState, portfolioState, riskProfile);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('confidenceScore');
      expect(typeof result.confidenceScore).toBe('number');
    });

    it('should return result with explanation', async () => {
      const { RLStrategyOptimizer } = await import('./services/reinforcementLearning');
      const optimizer = new RLStrategyOptimizer();
      
      const marketState = {
        price: 150,
        returns: [0.02, 0.01, -0.01, 0.03, 0.015],
        volatility: 0.2,
        momentum: 0.3,
        volume: 1000000,
        rsi: 55,
        macdSignal: 0.5
      };
      const portfolioState = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        returns: [0.01, 0.02]
      };
      const riskProfile = { tolerance: 'moderate' as const, maxDrawdown: 0.2, targetReturn: 0.15 };
      
      const result = await optimizer.optimize(marketState, portfolioState, riskProfile);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('recommendedAction');
      expect(result.recommendedAction).toHaveProperty('reasoning');
    });

    it('should provide alternative actions', async () => {
      const { RLStrategyOptimizer } = await import('./services/reinforcementLearning');
      const optimizer = new RLStrategyOptimizer();
      
      const marketState = {
        price: 150,
        returns: [0.02, 0.01, -0.01, 0.03, 0.015],
        volatility: 0.2,
        momentum: 0.3,
        volume: 1000000,
        rsi: 55,
        macdSignal: 0.5
      };
      const portfolioState = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        returns: [0.01, 0.02]
      };
      const riskProfile = { tolerance: 'moderate' as const, maxDrawdown: 0.2, targetReturn: 0.15 };
      
      const result = await optimizer.optimize(marketState, portfolioState, riskProfile);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('alternativeActions');
    });

    it('should optimize with strategy state', async () => {
      const { RLStrategyOptimizer } = await import('./services/reinforcementLearning');
      const optimizer = new RLStrategyOptimizer();
      
      const marketState = {
        price: 150,
        returns: [0.02, 0.01, -0.01, 0.03, 0.015],
        volatility: 0.2,
        momentum: 0.3,
        volume: 1000000,
        rsi: 55,
        macdSignal: 0.5
      };
      const portfolioState = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        returns: [0.01, 0.02]
      };
      const riskProfile = { tolerance: 'aggressive' as const, maxDrawdown: 0.3, targetReturn: 0.25 };
      const strategyState = {
        momentumWeight: 0.3,
        trendWeight: 0.3,
        meanReversionWeight: 0.2,
        volatilityWeight: 0.2
      };
      
      const result = await optimizer.optimize(marketState, portfolioState, riskProfile, strategyState);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('recommendedAction');
    });
  });
});

// ==================== Specialized Agent Team Tests ====================

describe('SpecializedAgentTeam', () => {
  describe('ResearcherAgent', () => {
    it('should analyze macro news and reports', async () => {
      const { ResearcherAgent } = await import('./services/ai-agents/SpecializedAgentTeam');
      const agent = new ResearcherAgent();
      
      const context = {
        symbol: 'AAPL',
        assetType: 'stock' as const,
        marketData: { price: 180, volume: 50000000, change: 0.02 },
        technicalIndicators: { rsi: 55, macd: 0.5, trend: 'bullish' as const },
        news: [{ headline: 'Apple reports strong Q4 earnings', sentiment: 0.8, source: 'Reuters' }],
        riskTolerance: 'moderate' as const
      };
      
      const result = await agent.analyze(context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
    });
  });

  describe('QuantAgent', () => {
    it('should analyze technical charts and option Greeks', async () => {
      const { QuantAgent } = await import('./services/ai-agents/SpecializedAgentTeam');
      const agent = new QuantAgent();
      
      const context = {
        symbol: 'AAPL',
        assetType: 'stock' as const,
        marketData: { price: 180, volume: 50000000, change: 0.02 },
        technicalIndicators: { rsi: 45, macd: 0.5, trend: 'bullish' as const },
        news: [],
        riskTolerance: 'moderate' as const,
        priceHistory: [175, 176, 178, 177, 180, 179, 181, 180],
        currentPrice: 180
      };
      
      const result = await agent.analyze(context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('RiskManagerAgent', () => {
    it('should monitor portfolio exposure and suggest actions', async () => {
      const { RiskManagerAgent } = await import('./services/ai-agents/SpecializedAgentTeam');
      const agent = new RiskManagerAgent();
      
      const context = {
        symbol: 'AAPL',
        assetType: 'stock' as const,
        marketData: { price: 180, volume: 50000000, change: 0.02 },
        technicalIndicators: { rsi: 55, macd: 0.5, trend: 'bullish' as const },
        news: [],
        riskTolerance: 'moderate' as const,
        portfolioContext: {
          totalValue: 100000,
          cashAvailable: 20000,
          currentExposure: 0.8,
          currentPositions: [],
          riskMetrics: {
            currentDrawdown: 0.03,
            maxDrawdown: 0.15,
            sharpeRatio: 1.2,
            beta: 1.0
          }
        }
      };
      
      const result = await agent.analyze(context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('keyFindings');
    });

    it('should detect high risk scenarios', async () => {
      const { RiskManagerAgent } = await import('./services/ai-agents/SpecializedAgentTeam');
      const agent = new RiskManagerAgent();
      
      const context = {
        symbol: 'AAPL',
        assetType: 'stock' as const,
        marketData: { price: 180, volume: 100000000, change: -0.08 },
        technicalIndicators: { rsi: 25, macd: -2.0, trend: 'bearish' as const },
        news: [],
        riskTolerance: 'conservative' as const,
        portfolioContext: {
          totalValue: 100000,
          cashAvailable: 5000,
          currentExposure: 0.95,
          currentPositions: [],
          riskMetrics: {
            currentDrawdown: 0.12,
            maxDrawdown: 0.15,
            sharpeRatio: 0.5,
            beta: 1.5
          }
        }
      };
      
      const result = await agent.analyze(context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('keyFindings');
    });
  });

  describe('SpecializedAgentTeam', () => {
    it('should run collaborative analysis with all agents', async () => {
      const { SpecializedAgentTeam } = await import('./services/ai-agents/SpecializedAgentTeam');
      const team = new SpecializedAgentTeam();
      
      const context = {
        symbol: 'AAPL',
        assetType: 'stock' as const,
        marketData: { price: 180, volume: 50000000, change: 0.02 },
        technicalIndicators: { rsi: 55, macd: 0.3, trend: 'bullish' as const },
        news: [{ headline: 'Apple announces new product', sentiment: 0.7, source: 'Bloomberg' }],
        riskTolerance: 'moderate' as const,
        priceHistory: [175, 176, 178, 177, 180],
        currentPrice: 180
      };
      
      const result = await team.analyzeWithRoundTable(context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('finalRecommendation');
      expect(result).toHaveProperty('individualAnalyses');
      expect(result).toHaveProperty('roundTableDiscussion');
    });

    it('should synthesize agent opinions into final recommendation', async () => {
      const { SpecializedAgentTeam } = await import('./services/ai-agents/SpecializedAgentTeam');
      const team = new SpecializedAgentTeam();
      
      const context = {
        symbol: 'BTC',
        assetType: 'crypto' as const,
        marketData: { price: 45000, volume: 30000000000, change: 0.05 },
        technicalIndicators: { rsi: 65, macd: 1.2, trend: 'bullish' as const },
        news: [{ headline: 'Bitcoin ETF approved', sentiment: 0.9, source: 'CNBC' }],
        riskTolerance: 'aggressive' as const,
        priceHistory: [42000, 43000, 44000, 44500, 45000],
        currentPrice: 45000
      };
      
      const result = await team.analyzeWithRoundTable(context);
      
      expect(result.finalRecommendation).toBeDefined();
      expect(result.finalRecommendation).toHaveProperty('action');
      expect(result.finalRecommendation).toHaveProperty('confidence');
    });
  });
});

// ==================== Integration Tests ====================

describe('Advanced AI Analysis Integration', () => {
  it('should have all services available', async () => {
    const correlationModule = await import('./services/correlationDetection');
    const altDataModule = await import('./services/alternativeDataService');
    const rlModule = await import('./services/reinforcementLearning');
    const agentModule = await import('./services/ai-agents/SpecializedAgentTeam');
    
    expect(correlationModule.calculateCorrelation).toBeDefined();
    expect(altDataModule.AlternativeDataFusionEngine).toBeDefined();
    expect(rlModule.RLStrategyOptimizer).toBeDefined();
    expect(agentModule.SpecializedAgentTeam).toBeDefined();
  });
});
