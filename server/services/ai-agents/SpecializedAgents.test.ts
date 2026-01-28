/**
 * Tests for Phase 45: 2026 Multi-Agent Architecture
 * 
 * Tests for:
 * - 5 Specialized Trading Agents (MacroSentinel, DeltaHedger, AlphaChaser, ChainTracker, Executioner)
 * - Statistical Arbitrage with Z-Score
 * - Kill-Switch Risk Management
 * - Multi-Agent Coordinator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          sentiment: 0.5,
          keyThemes: ['supply chain', 'inflation'],
          reasoning: 'Positive macro outlook based on supply chain improvements'
        })
      }
    }]
  })
}));

import {
  MacroSentinelAgent,
  DeltaHedgerAgent,
  AlphaChaserAgent,
  ChainTrackerAgent,
  ExecutionerAgent,
  createMacroSentinelAgent,
  createDeltaHedgerAgent,
  createAlphaChaserAgent,
  createChainTrackerAgent,
  createExecutionerAgent,
  MacroEvent,
  OptionsPosition,
  StockFactors,
  OnChainMetrics,
  ExecutionContext
} from './SpecializedTradingAgents';

import {
  StatisticalArbitrageCalculator,
  createStatisticalArbitrageCalculator
} from './StatisticalArbitrage';

import {
  KillSwitchAgent,
  createKillSwitchAgent,
  PortfolioPosition,
  OptionsMarketData
} from './KillSwitchAgent';

import {
  MultiAgentCoordinator,
  createMultiAgentCoordinator
} from './MultiAgentCoordinator';

describe('MacroSentinelAgent', () => {
  let agent: MacroSentinelAgent;

  beforeEach(() => {
    agent = createMacroSentinelAgent();
  });

  it('should create agent instance', () => {
    expect(agent).toBeInstanceOf(MacroSentinelAgent);
  });

  it('should analyze macro events and return signal', async () => {
    const events: MacroEvent[] = [
      {
        type: 'opec',
        headline: 'OPEC cuts production by 1M barrels',
        sentiment: 0.7,
        impactedAssets: ['CL', 'XLE'],
        severity: 'high',
        source: 'Reuters',
        timestamp: new Date()
      }
    ];

    const signal = await agent.analyze(events, ['CL', 'GC', 'SI']);

    expect(signal).toBeDefined();
    expect(signal.agent).toBe('MacroSentinel');
    expect(signal.assetClass).toBe('commodities');
    expect(['strong_buy', 'buy', 'hold', 'sell', 'strong_sell']).toContain(signal.signal);
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(1);
  });

  it('should handle empty events array', async () => {
    const signal = await agent.analyze([], ['CL', 'GC']);
    expect(signal).toBeDefined();
    expect(signal.signal).toBe('hold');
  });
});

describe('DeltaHedgerAgent', () => {
  let agent: DeltaHedgerAgent;

  beforeEach(() => {
    agent = createDeltaHedgerAgent();
  });

  it('should create agent instance', () => {
    expect(agent).toBeInstanceOf(DeltaHedgerAgent);
  });

  it('should analyze options positions and return signal', async () => {
    const positions: OptionsPosition[] = [
      {
        symbol: 'AAPL',
        strike: 180,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        type: 'call',
        quantity: 10,
        greeks: { delta: 0.6, gamma: 0.05, theta: -0.02, vega: 0.15, rho: 0.01 },
        iv: 0.25,
        underlyingPrice: 185
      }
    ];

    const signal = await agent.analyze(positions, 0.05);

    expect(signal).toBeDefined();
    expect(signal.agent).toBe('DeltaHedger');
    expect(signal.assetClass).toBe('options');
    expect(signal.indicators.portfolioDelta).toBeDefined();
  });

  it('should handle empty positions array', async () => {
    const signal = await agent.analyze([], 0.05);
    expect(signal).toBeDefined();
    expect(signal.signal).toBe('hold');
  });
});

describe('AlphaChaserAgent', () => {
  let agent: AlphaChaserAgent;

  beforeEach(() => {
    agent = createAlphaChaserAgent();
  });

  it('should create agent instance', () => {
    expect(agent).toBeInstanceOf(AlphaChaserAgent);
  });

  it('should analyze stock factors and return signal', async () => {
    const factors: StockFactors[] = [
      {
        symbol: 'AAPL',
        peRatio: 25, pbRatio: 35, debtToEquity: 1.5, revenueGrowth: 0.08,
        earningsGrowth: 0.12, roe: 0.45, rsi: 55, macdSignal: 0.5,
        priceToSMA50: 1.02, priceToSMA200: 1.15, volumeRatio: 1.2, atr: 3.5
      }
    ];

    const signal = await agent.analyze(factors);

    expect(signal).toBeDefined();
    expect(signal.agent).toBe('AlphaChaser');
    expect(signal.assetClass).toBe('stocks');
  });
});

describe('ChainTrackerAgent', () => {
  let agent: ChainTrackerAgent;

  beforeEach(() => {
    agent = createChainTrackerAgent();
  });

  it('should create agent instance', () => {
    expect(agent).toBeInstanceOf(ChainTrackerAgent);
  });

  it('should analyze on-chain metrics and return signal', async () => {
    const metrics: OnChainMetrics[] = [
      {
        symbol: 'BTC',
        whaleMovements: { inflows: 5000, outflows: 3000, netFlow: 2000, largeTransactions: 150 },
        exchangeFlows: { exchangeInflow: 10000, exchangeOutflow: 15000, exchangeReserves: 2000000 },
        networkActivity: { activeAddresses: 1000000, transactionCount: 350000, avgTransactionValue: 25000 },
        holderDistribution: { whalePercentage: 0.4, retailPercentage: 0.35, institutionalPercentage: 0.25 }
      }
    ];

    const signal = await agent.analyze(metrics);

    expect(signal).toBeDefined();
    expect(signal.agent).toBe('ChainTracker');
    expect(signal.assetClass).toBe('crypto');
  });
});

describe('ExecutionerAgent', () => {
  let agent: ExecutionerAgent;

  beforeEach(() => {
    agent = createExecutionerAgent();
  });

  it('should create agent instance', () => {
    expect(agent).toBeInstanceOf(ExecutionerAgent);
  });

  it('should analyze execution contexts and return signal', async () => {
    const contexts: ExecutionContext[] = [
      {
        symbol: 'AAPL',
        orderSize: 1000,
        urgency: 'medium',
        marketConditions: { spread: 0.01, depth: 500000, volatility: 0.02, volume: 50000000 },
        timeZone: 'America/New_York',
        marketHours: { isOpen: true, nextOpen: new Date(), nextClose: new Date() }
      }
    ];

    const signal = await agent.analyze(contexts);

    expect(signal).toBeDefined();
    expect(signal.agent).toBe('Executioner');
    expect(signal.assetClass).toBe('portfolio');
  });
});

describe('StatisticalArbitrageCalculator', () => {
  let calculator: StatisticalArbitrageCalculator;

  beforeEach(() => {
    calculator = createStatisticalArbitrageCalculator();
  });

  it('should create calculator instance', () => {
    expect(calculator).toBeInstanceOf(StatisticalArbitrageCalculator);
  });

  it('should calculate Z-Score correctly', () => {
    const prices = [100, 102, 98, 101, 103, 99, 100, 102, 101, 100];
    const zScore = calculator.calculateZScore(prices);

    expect(zScore).toBeDefined();
    expect(typeof zScore).toBe('number');
  });

  it('should find correlation pairs', () => {
    const priceHistory = new Map<string, number[]>();
    priceHistory.set('SPY', [400, 402, 398, 405, 410, 408, 412, 415, 413, 418]);
    priceHistory.set('QQQ', [350, 352, 348, 355, 360, 358, 362, 365, 363, 368]);

    const pairs = calculator.findCorrelationPairs(priceHistory);

    expect(pairs).toBeDefined();
    expect(Array.isArray(pairs)).toBe(true);
  });
});

describe('KillSwitchAgent', () => {
  let agent: KillSwitchAgent;

  beforeEach(() => {
    agent = createKillSwitchAgent();
  });

  it('should create agent instance', () => {
    expect(agent).toBeInstanceOf(KillSwitchAgent);
  });

  it('should calculate VaR correctly', () => {
    const positions: PortfolioPosition[] = [
      { symbol: 'AAPL', assetClass: 'stock', quantity: 100, currentPrice: 185, avgCost: 170, weight: 0.5, volatility: 0.25, beta: 1.2 },
      { symbol: 'BTC', assetClass: 'crypto', quantity: 2, currentPrice: 45000, avgCost: 40000, weight: 0.5, volatility: 0.60, beta: 1.5 }
    ];

    const varResult = agent.calculateVaR(positions, 0.95, 1);

    expect(varResult).toBeDefined();
    expect(varResult.var95).toBeGreaterThan(0);
    expect(varResult.var99).toBeGreaterThan(varResult.var95);
  });

  it('should analyze IV skew', () => {
    const optionsData: OptionsMarketData[] = [
      { symbol: 'SPY', atmIV: 0.18, otmPutIV: 0.25, otmCallIV: 0.15, ivSkew: 0.10, putCallRatio: 1.2, vix: 22 }
    ];

    const skewAnalysis = agent.analyzeIVSkew(optionsData);

    expect(skewAnalysis).toBeDefined();
    expect(typeof skewAnalysis.skewAlert).toBe('boolean');
    expect(skewAnalysis.avgSkew).toBeGreaterThan(0);
  });

  it('should return risk metrics and signal', async () => {
    const positions: PortfolioPosition[] = [
      { symbol: 'AAPL', assetClass: 'stock', quantity: 100, currentPrice: 185, avgCost: 170, weight: 0.5, volatility: 0.25, beta: 1.2 }
    ];

    const optionsData: OptionsMarketData[] = [
      { symbol: 'SPY', atmIV: 0.18, otmPutIV: 0.25, otmCallIV: 0.15, ivSkew: 0.10, putCallRatio: 1.2, vix: 22 }
    ];

    const returns = new Map<string, number[]>();

    const result = await agent.analyze(positions, optionsData, returns);

    expect(result).toBeDefined();
    expect(result.signal).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.portfolioVaR).toBeDefined();
    expect(result.metrics.killSwitchStatus).toBeDefined();
  });
});

describe('MultiAgentCoordinator', () => {
  let coordinator: MultiAgentCoordinator;

  beforeEach(() => {
    coordinator = createMultiAgentCoordinator();
  });

  it('should create coordinator instance', () => {
    expect(coordinator).toBeInstanceOf(MultiAgentCoordinator);
  });

  it('should analyze market context and return coordinated strategy', async () => {
    const context = {
      commodities: [{ symbol: 'CL', price: 75, change: 2.5 }],
      news: [{ headline: 'Fed signals rate pause', sentiment: 0.6, source: 'Bloomberg' }],
      options: [{ symbol: 'SPY', atmIV: 0.18, otmPutIV: 0.22, otmCallIV: 0.16, ivSkew: 0.06, putCallRatio: 1.1, vix: 18 }],
      stocks: [{ symbol: 'AAPL', price: 185, change: 1.2, volume: 50000000 }],
      crypto: [{ symbol: 'BTC', price: 45000, change: 3.5, volume: 25000000000 }],
      marketRegime: 'bullish' as const,
      vix: 18
    };

    const strategy = await coordinator.analyzeMarket(context);

    expect(strategy).toBeDefined();
    expect(strategy.signals).toBeDefined();
    expect(Array.isArray(strategy.signals)).toBe(true);
    expect(strategy.consensusSignal).toBeDefined();
    expect(strategy.confidence).toBeGreaterThanOrEqual(0);
    expect(strategy.confidence).toBeLessThanOrEqual(1);
  });
});

describe('Agent Factory Functions', () => {
  it('should create all agents via factory functions', () => {
    expect(createMacroSentinelAgent()).toBeInstanceOf(MacroSentinelAgent);
    expect(createDeltaHedgerAgent()).toBeInstanceOf(DeltaHedgerAgent);
    expect(createAlphaChaserAgent()).toBeInstanceOf(AlphaChaserAgent);
    expect(createChainTrackerAgent()).toBeInstanceOf(ChainTrackerAgent);
    expect(createExecutionerAgent()).toBeInstanceOf(ExecutionerAgent);
    expect(createStatisticalArbitrageCalculator()).toBeInstanceOf(StatisticalArbitrageCalculator);
    expect(createKillSwitchAgent()).toBeInstanceOf(KillSwitchAgent);
    expect(createMultiAgentCoordinator()).toBeInstanceOf(MultiAgentCoordinator);
  });
});
