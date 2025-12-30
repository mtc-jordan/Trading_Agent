/**
 * Tests for Agent Explainability, Adaptive Learning, and Strategy Backtester
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(() => null),
}));

// Mock LLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn(() => Promise.resolve({
    choices: [{ message: { content: 'Test response' } }]
  })),
}));

describe('Agent Explainability Service', () => {
  describe('explainTechnicalAgent', () => {
    it('should generate explanation for technical agent', async () => {
      const { explainTechnicalAgent } = await import('./services/ai-agents/AgentExplainability');
      
      // Need at least 50 data points for proper indicator calculation
      const mockPriceData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: (Date.now() - 86400000 * (50 - i)),
        open: 100 + i * 0.5,
        high: 105 + i * 0.5,
        low: 98 + i * 0.5,
        close: 103 + i * 0.5,
        volume: 1000000 + i * 10000,
      }));
      
      const explanation = explainTechnicalAgent(mockPriceData, 127);
      
      expect(explanation).toBeDefined();
      expect(explanation.finalSignal).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(explanation.finalSignal);
      expect(explanation.confidence).toBeGreaterThanOrEqual(0);
      expect(explanation.confidence).toBeLessThanOrEqual(100);
    });
    
    it('should include indicator contributions', async () => {
      const { explainTechnicalAgent } = await import('./services/ai-agents/AgentExplainability');
      
      const mockPriceData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: (Date.now() - 86400000 * (50 - i)),
        open: 100 + i * 0.5,
        high: 102 + i * 0.5,
        low: 98 + i * 0.5,
        close: 101 + i * 0.5,
        volume: 1000000 + i * 10000,
      }));
      
      const explanation = explainTechnicalAgent(mockPriceData, 125);
      
      expect(explanation.indicatorContributions).toBeDefined();
      expect(Array.isArray(explanation.indicatorContributions)).toBe(true);
    });
    
    it('should include pattern contributions', async () => {
      const { explainTechnicalAgent } = await import('./services/ai-agents/AgentExplainability');
      
      const mockPriceData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: (Date.now() - 86400000 * (50 - i)),
        open: 100 + Math.sin(i * 0.3) * 5,
        high: 105 + Math.sin(i * 0.3) * 5,
        low: 95 + Math.sin(i * 0.3) * 5,
        close: 102 + Math.sin(i * 0.3) * 5,
        volume: 1000000,
      }));
      
      const explanation = explainTechnicalAgent(mockPriceData, 102);
      
      expect(explanation.patternContributions).toBeDefined();
      expect(Array.isArray(explanation.patternContributions)).toBe(true);
    });
  });
  
  describe('generateConsensusExplanation', () => {
    it('should generate consensus from agent explanations', async () => {
      const { generateConsensusExplanation, explainTechnicalAgent } = await import('./services/ai-agents/AgentExplainability');
      
      const mockCandles = Array.from({ length: 50 }, (_, i) => ({
        timestamp: (Date.now() - 86400000 * (50 - i)),
        open: 100 + i * 0.5,
        high: 102 + i * 0.5,
        low: 98 + i * 0.5,
        close: 101 + i * 0.5,
        volume: 1000000 + i * 10000,
      }));
      
      const technicalExplanation = explainTechnicalAgent(mockCandles, 125);
      const agentExplanations = [technicalExplanation];
      
      const fullExplanation = generateConsensusExplanation('AAPL', 'stock', agentExplanations, 'majority');
      
      expect(fullExplanation).toBeDefined();
      expect(fullExplanation.symbol).toBe('AAPL');
      expect(fullExplanation.agentExplanations).toBeDefined();
      expect(Array.isArray(fullExplanation.agentExplanations)).toBe(true);
    });
    
    it('should include voting breakdown', async () => {
      const { generateConsensusExplanation, explainTechnicalAgent } = await import('./services/ai-agents/AgentExplainability');
      
      const mockCandles = Array.from({ length: 50 }, (_, i) => ({
        timestamp: (Date.now() - 86400000 * (50 - i)),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000,
      }));
      
      const technicalExplanation = explainTechnicalAgent(mockCandles, 102);
      const agentExplanations = [technicalExplanation];
      
      const fullExplanation = generateConsensusExplanation('TSLA', 'stock', agentExplanations, 'majority');
      
      expect(fullExplanation.votingBreakdown).toBeDefined();
      expect(fullExplanation.votingBreakdown.buyVotes).toBeDefined();
      expect(fullExplanation.votingBreakdown.sellVotes).toBeDefined();
    });
  });
});

describe('Adaptive Learning Engine', () => {
  describe('calculateAgentPerformance', () => {
    it('should calculate performance metrics', async () => {
      const { calculateAgentPerformance } = await import('./services/ai-agents/AdaptiveLearning');
      
      const predictions = [
        { agentType: 'technical', prediction: 'buy', actualOutcome: 'profit', timestamp: Date.now() - 86400000, returnPct: 0.05 },
        { agentType: 'technical', prediction: 'buy', actualOutcome: 'profit', timestamp: Date.now() - 86400000 * 2, returnPct: 0.03 },
        { agentType: 'technical', prediction: 'sell', actualOutcome: 'loss', timestamp: Date.now() - 86400000 * 3, returnPct: -0.02 },
      ];
      
      const performance = calculateAgentPerformance(predictions, 'technical');
      
      expect(performance).toBeDefined();
      expect(performance.accuracy).toBeDefined();
      expect(performance.totalPredictions).toBe(3);
    });
    
    it('should calculate adjusted weights based on performance', async () => {
      const { calculateAdjustedWeights } = await import('./services/ai-agents/AdaptiveLearning');
      
      const agentPerformances = [
        { agentType: 'technical', accuracy: 0.8, profitabilityRate: 0.7, sharpeRatio: 1.5 },
        { agentType: 'fundamental', accuracy: 0.5, profitabilityRate: 0.4, sharpeRatio: 0.5 },
      ];
      
      const weights = calculateAdjustedWeights(agentPerformances as any, { type: 'bull', confidence: 0.8, indicators: { trendStrength: 0.7, volatility: 0.3, momentum: 0.6, volume: 0.5 } });
      
      expect(weights).toBeDefined();
      expect(Array.isArray(weights)).toBe(true);
    });
    
    it('should detect market regime', async () => {
      const { detectMarketRegime } = await import('./services/ai-agents/AdaptiveLearning');
      
      const priceData = Array.from({ length: 50 }, (_, i) => ({
        close: 101 + i * 0.5,
        volume: 1000000,
      }));
      
      const volatilityData = Array.from({ length: 50 }, () => 0.02);
      
      const regime = detectMarketRegime(priceData, volatilityData);
      
      expect(regime).toBeDefined();
      expect(['bull', 'bear', 'sideways', 'volatile', 'calm']).toContain(regime.type);
      expect(regime.confidence).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('updateWeights', () => {
    it('should update weights based on performance', async () => {
      const { updateWeights } = await import('./services/ai-agents/AdaptiveLearning');
      
      const currentWeights = {
        technical: 0.2,
        fundamental: 0.2,
        sentiment: 0.2,
        risk: 0.2,
        regime: 0.1,
        execution: 0.1,
      };
      
      const predictions = [
        { agentType: 'technical', prediction: 'buy', actualOutcome: 'profit', timestamp: Date.now(), returnPct: 0.05 },
        { agentType: 'fundamental', prediction: 'sell', actualOutcome: 'loss', timestamp: Date.now(), returnPct: -0.02 },
      ];
      
      const regime = { type: 'bull' as const, confidence: 0.8, indicators: { trendStrength: 0.7, volatility: 0.3, momentum: 0.6, volume: 0.5 } };
      
      const result = updateWeights(currentWeights, predictions, regime);
      
      expect(result).toBeDefined();
      expect(result.newWeights).toBeDefined();
    });
  });
});

describe('Strategy Backtester', () => {
  describe('runAgentBacktest', () => {
    it('should run backtest with valid configuration', async () => {
      const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const config = {
        symbol: 'AAPL',
        startDate: '2024-01-01',
        endDate: '2024-06-01',
        initialCapital: 100000,
        positionSizing: 'percent' as const,
        positionSize: 50,
        maxPositionSize: 100000,
        stopLoss: 5,
        takeProfit: 10,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: true,
        rebalanceFrequency: 'daily' as const,
        benchmark: 'SPY',
      };
      
      const result = await runAgentBacktest(config);
      
      expect(result).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.trades).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
    });
    
    it('should calculate performance metrics', async () => {
      const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const config = {
        symbol: 'MSFT',
        startDate: '2024-01-01',
        endDate: '2024-03-01',
        initialCapital: 50000,
        positionSizing: 'fixed' as const,
        positionSize: 10000,
        maxPositionSize: 50000,
        stopLoss: 3,
        takeProfit: 8,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: false,
        rebalanceFrequency: 'weekly' as const,
        benchmark: 'SPY',
      };
      
      const result = await runAgentBacktest(config);
      
      expect(result.summary.totalReturn).toBeDefined();
      expect(result.summary.annualizedReturn).toBeDefined();
      expect(result.summary.sharpeRatio).toBeDefined();
      expect(result.summary.maxDrawdown).toBeDefined();
      expect(result.summary.winRate).toBeDefined();
      expect(result.summary.totalTrades).toBeDefined();
    });
    
    it('should include agent performance analysis', async () => {
      const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const config = {
        symbol: 'GOOGL',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        initialCapital: 100000,
        positionSizing: 'percent' as const,
        positionSize: 25,
        maxPositionSize: 100000,
        stopLoss: 5,
        takeProfit: 10,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: true,
        rebalanceFrequency: 'daily' as const,
        benchmark: 'SPY',
      };
      
      const result = await runAgentBacktest(config);
      
      expect(result.agentPerformance).toBeDefined();
      expect(Array.isArray(result.agentPerformance)).toBe(true);
      
      for (const agent of result.agentPerformance) {
        expect(agent.agentType).toBeDefined();
        expect(agent.accuracy).toBeDefined();
        expect(agent.totalSignals).toBeDefined();
      }
    });
    
    it('should include benchmark comparison', async () => {
      const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const config = {
        symbol: 'NVDA',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        initialCapital: 100000,
        positionSizing: 'percent' as const,
        positionSize: 50,
        maxPositionSize: 100000,
        stopLoss: 5,
        takeProfit: 10,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: true,
        rebalanceFrequency: 'daily' as const,
        benchmark: 'SPY',
      };
      
      const result = await runAgentBacktest(config);
      
      expect(result.benchmarkComparison).toBeDefined();
      expect(result.benchmarkComparison.benchmarkReturn).toBeDefined();
      expect(result.benchmarkComparison.excessReturn).toBeDefined();
      expect(result.benchmarkComparison.informationRatio).toBeDefined();
    });
    
    it('should include monthly returns', async () => {
      const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const config = {
        symbol: 'AMZN',
        startDate: '2024-01-01',
        endDate: '2024-06-01',
        initialCapital: 100000,
        positionSizing: 'percent' as const,
        positionSize: 50,
        maxPositionSize: 100000,
        stopLoss: 5,
        takeProfit: 10,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: true,
        rebalanceFrequency: 'daily' as const,
        benchmark: 'SPY',
      };
      
      const result = await runAgentBacktest(config);
      
      expect(result.monthlyReturns).toBeDefined();
      expect(Array.isArray(result.monthlyReturns)).toBe(true);
    });
    
    it('should include drawdown periods', async () => {
      const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const config = {
        symbol: 'META',
        startDate: '2024-01-01',
        endDate: '2024-03-01',
        initialCapital: 100000,
        positionSizing: 'percent' as const,
        positionSize: 50,
        maxPositionSize: 100000,
        stopLoss: 5,
        takeProfit: 10,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: true,
        rebalanceFrequency: 'daily' as const,
        benchmark: 'SPY',
      };
      
      const result = await runAgentBacktest(config);
      
      expect(result.drawdownPeriods).toBeDefined();
      expect(Array.isArray(result.drawdownPeriods)).toBe(true);
    });
  });
  
  describe('runQuickBacktest', () => {
    it('should run quick backtest', async () => {
      const { runQuickBacktest } = await import('./services/ai-agents/StrategyBacktester');
      
      const result = await runQuickBacktest('AAPL', 30);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should run backtest and get results', async () => {
    const { runAgentBacktest } = await import('./services/ai-agents/StrategyBacktester');
    
    const backtestConfig = {
      symbol: 'AAPL',
      startDate: '2024-01-01',
      endDate: '2024-02-01',
      initialCapital: 100000,
      positionSizing: 'percent' as const,
      positionSize: 50,
      maxPositionSize: 100000,
      stopLoss: 5,
      takeProfit: 10,
      transactionCost: 0.1,
      slippage: 0.05,
      useAgentWeights: true,
      rebalanceFrequency: 'daily' as const,
      benchmark: 'SPY',
    };
    
    const backtestResult = await runAgentBacktest(backtestConfig);
    
    expect(backtestResult).toBeDefined();
    expect(backtestResult.summary).toBeDefined();
    expect(backtestResult.agentPerformance.length).toBeGreaterThan(0);
  });
  
  it('should explain technical agent decisions', async () => {
    const { explainTechnicalAgent } = await import('./services/ai-agents/AgentExplainability');
    
    // Create candles in the correct format
    const mockCandles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: (Date.now() - 86400000 * (50 - i)),
      open: 100 + i * 0.5,
      high: 102 + i * 0.5,
      low: 98 + i * 0.5,
      close: 101 + i * 0.5,
      volume: 1000000,
    }));
    
    const explanation = explainTechnicalAgent(mockCandles, 125);
    
    expect(explanation).toBeDefined();
    expect(explanation.finalSignal).toBeDefined();
    expect(explanation.confidence).toBeDefined();
  });
  
  it('should calculate agent performance metrics', async () => {
    const { calculateAgentPerformance } = await import('./services/ai-agents/AdaptiveLearning');
    
    const predictions = [
      { agentType: 'technical', prediction: 'buy', actual: 'buy', timestamp: Date.now(), returnPct: 0.05 },
      { agentType: 'technical', prediction: 'sell', actual: 'sell', timestamp: Date.now(), returnPct: 0.03 },
    ];
    
    const performance = calculateAgentPerformance(predictions);
    
    expect(performance).toBeDefined();
    expect(performance.accuracy).toBeDefined();
  });
});
