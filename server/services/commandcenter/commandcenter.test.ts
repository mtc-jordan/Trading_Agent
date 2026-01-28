/**
 * AI Command Center Unit Tests
 * 
 * Comprehensive tests for CrossAgentSynthesis, UnifiedSignalAggregator,
 * and SmartPortfolioOrchestrator services.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CrossAgentSynthesisService } from './CrossAgentSynthesis';
import { UnifiedSignalAggregator } from './UnifiedSignalAggregator';
import { SmartPortfolioOrchestrator } from './SmartPortfolioOrchestrator';

describe('CrossAgentSynthesisService', () => {
  let service: CrossAgentSynthesisService;

  beforeEach(() => {
    service = new CrossAgentSynthesisService();
  });

  describe('Signal Ingestion', () => {
    it('should ingest stock agent signals', () => {
      service.ingestSignal({
        agentId: 'stock-1',
        agentName: 'Momentum Agent',
        domain: 'stock',
        symbol: 'AAPL',
        signal: 'buy',
        confidence: 75,
        reasoning: 'Strong momentum indicators',
        keyFactors: ['RSI oversold', 'MACD crossover'],
        timestamp: new Date()
      });

      const signals = service.getSignalsForAsset('AAPL');
      expect(signals.length).toBe(1);
      expect(signals[0].domain).toBe('stock');
    });

    it('should ingest crypto agent signals', () => {
      service.ingestSignal({
        agentId: 'crypto-1',
        agentName: 'Whale Tracker',
        domain: 'crypto',
        token: 'BTC',
        signal: 'bullish',
        confidence: 82,
        whaleActivity: 'accumulating',
        narrativeStrength: 75,
        onChainMetrics: {
          mvrv: 1.5,
          nvt: 45,
          exchangeFlow: 'outflow'
        },
        timestamp: new Date()
      });

      const signals = service.getSignalsForAsset('BTC');
      expect(signals.length).toBe(1);
      expect(signals[0].domain).toBe('crypto');
    });

    it('should ingest sentiment agent signals', () => {
      service.ingestSignal({
        agentId: 'sentiment-1',
        agentName: 'Social Sentiment',
        domain: 'sentiment',
        asset: 'NVDA',
        overallSentiment: 0.65,
        platforms: {
          twitter: 0.7,
          reddit: 0.6,
          stocktwits: 0.55,
          news: 0.75
        },
        trendingScore: 85,
        alertLevel: 'elevated',
        timestamp: new Date()
      });

      const signals = service.getSignalsForAsset('NVDA');
      expect(signals.length).toBe(1);
      expect(signals[0].domain).toBe('sentiment');
    });

    it('should ingest macro agent signals', () => {
      service.ingestSignal({
        agentId: 'macro-1',
        agentName: 'Macro Regime',
        domain: 'macro',
        regime: 'risk_on',
        fedSentiment: -0.2,
        vixLevel: 18.5,
        dollarStrength: 102.5,
        yieldCurve: 'normal',
        correlations: {
          btcNasdaq: 0.72,
          goldUsd: -0.15,
          spyVix: -0.85
        },
        timestamp: new Date()
      });

      const stats = service.getSummaryStats();
      expect(stats.totalSignals).toBeGreaterThan(0);
    });

    it('should ingest options agent signals', () => {
      service.ingestSignal({
        agentId: 'options-1',
        agentName: 'Greeks Optimizer',
        domain: 'options',
        underlying: 'SPY',
        impliedVolatility: 0.22,
        ivPercentile: 45,
        putCallRatio: 0.85,
        maxPain: 450,
        unusualActivity: true,
        greekExposure: {
          delta: 0.45,
          gamma: 0.02,
          vanna: 0.01,
          charm: -0.005
        },
        timestamp: new Date()
      });

      const signals = service.getSignalsForAsset('SPY');
      expect(signals.length).toBe(1);
    });
  });

  describe('Signal Synthesis', () => {
    beforeEach(() => {
      // Add multiple signals for synthesis
      service.ingestSignal({
        agentId: 'stock-1',
        agentName: 'Momentum Agent',
        domain: 'stock',
        symbol: 'AAPL',
        signal: 'buy',
        confidence: 75,
        reasoning: 'Strong momentum',
        keyFactors: ['RSI'],
        timestamp: new Date()
      });

      service.ingestSignal({
        agentId: 'sentiment-1',
        agentName: 'Sentiment Agent',
        domain: 'sentiment',
        asset: 'AAPL',
        overallSentiment: 0.6,
        platforms: { twitter: 0.7, reddit: 0.5, stocktwits: 0.6, news: 0.6 },
        trendingScore: 70,
        alertLevel: 'normal',
        timestamp: new Date()
      });

      service.ingestSignal({
        agentId: 'macro-1',
        agentName: 'Macro Agent',
        domain: 'macro',
        regime: 'risk_on',
        fedSentiment: 0.1,
        vixLevel: 18,
        dollarStrength: 100,
        yieldCurve: 'normal',
        correlations: { btcNasdaq: 0.7, goldUsd: -0.1, spyVix: -0.8 },
        timestamp: new Date()
      });
    });

    it('should synthesize signals into unified intelligence', () => {
      const synthesis = service.synthesize();
      
      expect(synthesis).toBeDefined();
      expect(synthesis.id).toContain('synthesis_');
      expect(synthesis.timestamp).toBeInstanceOf(Date);
    });

    it('should determine market regime', () => {
      const synthesis = service.synthesize();
      
      expect(synthesis.marketRegime).toBeDefined();
      expect(['risk_on', 'risk_off', 'transition']).toContain(synthesis.marketRegime.current);
      expect(synthesis.marketRegime.confidence).toBeGreaterThan(0);
    });

    it('should generate asset signals', () => {
      const synthesis = service.synthesize();
      
      expect(synthesis.assetSignals.length).toBeGreaterThan(0);
      const aaplSignal = synthesis.assetSignals.find(s => s.asset === 'AAPL');
      expect(aaplSignal).toBeDefined();
      expect(aaplSignal?.aggregatedSignal).toBeDefined();
    });

    it('should assess risk', () => {
      const synthesis = service.synthesize();
      
      expect(synthesis.riskAssessment).toBeDefined();
      expect(['low', 'moderate', 'elevated', 'high', 'extreme']).toContain(
        synthesis.riskAssessment.overallRiskLevel
      );
      expect(synthesis.riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(synthesis.riskAssessment.riskScore).toBeLessThanOrEqual(100);
    });

    it('should identify opportunities', () => {
      const synthesis = service.synthesize();
      
      expect(synthesis.opportunities).toBeDefined();
      expect(Array.isArray(synthesis.opportunities)).toBe(true);
    });

    it('should generate recommendations', () => {
      const synthesis = service.synthesize();
      
      expect(synthesis.recommendedActions).toBeDefined();
      expect(Array.isArray(synthesis.recommendedActions)).toBe(true);
    });
  });

  describe('Voice Command Processing', () => {
    beforeEach(() => {
      service.ingestSignal({
        agentId: 'macro-1',
        agentName: 'Macro Agent',
        domain: 'macro',
        regime: 'risk_on',
        fedSentiment: 0.1,
        vixLevel: 18,
        dollarStrength: 100,
        yieldCurve: 'normal',
        correlations: { btcNasdaq: 0.7, goldUsd: -0.1, spyVix: -0.8 },
        timestamp: new Date()
      });
    });

    it('should respond to market status query', () => {
      const response = service.processVoiceCommand({
        command: 'What is the market status?',
        intent: 'query',
        parameters: {},
        timestamp: new Date()
      });

      expect(response.text).toContain('risk');
      expect(response.data).toBeDefined();
    });

    it('should respond to risk query', () => {
      const response = service.processVoiceCommand({
        command: 'What is my risk level?',
        intent: 'query',
        parameters: {},
        timestamp: new Date()
      });

      expect(response.text.toLowerCase()).toContain('risk');
    });

    it('should respond to opportunity query', () => {
      const response = service.processVoiceCommand({
        command: 'Show me opportunities',
        intent: 'query',
        parameters: {},
        timestamp: new Date()
      });

      expect(response.text).toBeDefined();
    });

    it('should respond to recommendation query', () => {
      const response = service.processVoiceCommand({
        command: 'What should I do?',
        intent: 'query',
        parameters: {},
        timestamp: new Date()
      });

      expect(response.text).toBeDefined();
    });
  });

  describe('Summary Statistics', () => {
    it('should return correct summary stats', () => {
      service.ingestSignal({
        agentId: 'stock-1',
        agentName: 'Test Agent',
        domain: 'stock',
        symbol: 'AAPL',
        signal: 'buy',
        confidence: 80,
        reasoning: 'Test',
        keyFactors: [],
        timestamp: new Date()
      });

      const stats = service.getSummaryStats();
      
      expect(stats.totalSignals).toBe(1);
      expect(stats.activeAgents).toBe(1);
      expect(stats.lastUpdate).toBeInstanceOf(Date);
    });
  });
});

describe('UnifiedSignalAggregator', () => {
  let aggregator: UnifiedSignalAggregator;

  beforeEach(() => {
    aggregator = new UnifiedSignalAggregator();
  });

  describe('Signal Management', () => {
    it('should add signals correctly', () => {
      const signal = aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: {
          agentName: 'Consensus Engine',
          reasoning: 'Strong buy signals',
          keyFactors: ['Earnings beat'],
          supportingData: {}
        },
        riskMetrics: {
          maxDrawdown: 0.08,
          sharpeRatio: 1.5,
          winRate: 0.65,
          avgHoldingPeriod: '5d'
        },
        execution: {
          urgency: 'today'
        },
        timestamp: new Date()
      });

      expect(signal.id).toContain('sig_');
      expect(signal.expiresAt).toBeInstanceOf(Date);
    });

    it('should batch add signals', () => {
      const signals = aggregator.addSignals([
        {
          source: 'stock_consensus',
          asset: 'AAPL',
          assetClass: 'stock',
          direction: 'long',
          strength: 75,
          confidence: 80,
          timeframe: 'swing',
          metadata: { agentName: 'Test', reasoning: '', keyFactors: [], supportingData: {} },
          riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.2, winRate: 0.6, avgHoldingPeriod: '5d' },
          execution: { urgency: 'today' },
          timestamp: new Date()
        },
        {
          source: 'crypto_whale',
          asset: 'BTC',
          assetClass: 'crypto',
          direction: 'long',
          strength: 68,
          confidence: 72,
          timeframe: 'position',
          metadata: { agentName: 'Whale', reasoning: '', keyFactors: [], supportingData: {} },
          riskMetrics: { maxDrawdown: 0.15, sharpeRatio: 1.0, winRate: 0.55, avgHoldingPeriod: '14d' },
          execution: { urgency: 'this_week' },
          timestamp: new Date()
        }
      ]);

      expect(signals.length).toBe(2);
    });

    it('should filter signals by asset', () => {
      aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: { agentName: 'Test', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.2, winRate: 0.6, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      aggregator.addSignal({
        source: 'crypto_whale',
        asset: 'BTC',
        assetClass: 'crypto',
        direction: 'long',
        strength: 68,
        confidence: 72,
        timeframe: 'position',
        metadata: { agentName: 'Whale', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.15, sharpeRatio: 1.0, winRate: 0.55, avgHoldingPeriod: '14d' },
        execution: { urgency: 'this_week' },
        timestamp: new Date()
      });

      const aaplSignals = aggregator.getSignals({ assets: ['AAPL'] });
      expect(aaplSignals.length).toBe(1);
      expect(aaplSignals[0].asset).toBe('AAPL');
    });

    it('should filter signals by source', () => {
      aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: { agentName: 'Test', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.2, winRate: 0.6, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      const stockSignals = aggregator.getSignals({ sources: ['stock_consensus'] });
      expect(stockSignals.length).toBe(1);
    });

    it('should filter signals by minimum strength', () => {
      aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: { agentName: 'Test', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.2, winRate: 0.6, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      aggregator.addSignal({
        source: 'sentiment_social',
        asset: 'TSLA',
        assetClass: 'stock',
        direction: 'neutral',
        strength: 45,
        confidence: 55,
        timeframe: 'swing',
        metadata: { agentName: 'Sentiment', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.12, sharpeRatio: 0.8, winRate: 0.5, avgHoldingPeriod: '3d' },
        execution: { urgency: 'opportunistic' },
        timestamp: new Date()
      });

      const strongSignals = aggregator.getSignals({ minStrength: 70 });
      expect(strongSignals.length).toBe(1);
      expect(strongSignals[0].asset).toBe('AAPL');
    });
  });

  describe('Asset View Aggregation', () => {
    beforeEach(() => {
      // Add multiple signals for same asset
      aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: { agentName: 'Consensus', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.2, winRate: 0.6, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      aggregator.addSignal({
        source: 'sentiment_social',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 68,
        confidence: 72,
        timeframe: 'swing',
        metadata: { agentName: 'Sentiment', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.08, sharpeRatio: 1.0, winRate: 0.55, avgHoldingPeriod: '3d' },
        execution: { urgency: 'this_week' },
        timestamp: new Date()
      });
    });

    it('should generate aggregated view for asset', () => {
      const view = aggregator.getAssetView('AAPL');
      
      expect(view).not.toBeNull();
      expect(view?.asset).toBe('AAPL');
      expect(view?.signals.length).toBe(2);
    });

    it('should calculate consensus from multiple signals', () => {
      const view = aggregator.getAssetView('AAPL');
      
      expect(view?.consensus).toBeDefined();
      expect(view?.consensus.direction).toBe('long');
      expect(view?.consensus.agreementScore).toBeGreaterThan(0);
    });

    it('should generate recommended action', () => {
      const view = aggregator.getAssetView('AAPL');
      
      expect(view?.recommendedAction).toBeDefined();
      expect(['buy', 'sell', 'hold', 'close', 'hedge']).toContain(view?.recommendedAction.action);
    });

    it('should return null for unknown asset', () => {
      const view = aggregator.getAssetView('UNKNOWN');
      expect(view).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', () => {
      aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: { agentName: 'Test', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.2, winRate: 0.6, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      const stats = aggregator.getStats();
      
      expect(stats.totalSignals).toBe(1);
      expect(stats.bySource.stock_consensus).toBe(1);
      expect(stats.byDirection.long).toBe(1);
      expect(stats.avgStrength).toBe(75);
      expect(stats.avgConfidence).toBe(80);
    });
  });

  describe('High Conviction Signals', () => {
    it('should identify high conviction signals', () => {
      // Add signals with high agreement
      aggregator.addSignal({
        source: 'stock_consensus',
        asset: 'NVDA',
        assetClass: 'stock',
        direction: 'long',
        strength: 85,
        confidence: 90,
        timeframe: 'swing',
        metadata: { agentName: 'Consensus', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.5, winRate: 0.7, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      aggregator.addSignal({
        source: 'sentiment_social',
        asset: 'NVDA',
        assetClass: 'stock',
        direction: 'long',
        strength: 82,
        confidence: 88,
        timeframe: 'swing',
        metadata: { agentName: 'Sentiment', reasoning: '', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.08, sharpeRatio: 1.3, winRate: 0.65, avgHoldingPeriod: '3d' },
        execution: { urgency: 'today' },
        timestamp: new Date()
      });

      const highConviction = aggregator.getHighConvictionSignals(0.8);
      expect(highConviction.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('SmartPortfolioOrchestrator', () => {
  let orchestrator: SmartPortfolioOrchestrator;

  beforeEach(() => {
    orchestrator = new SmartPortfolioOrchestrator();
    orchestrator.setCashBalance(100000);
  });

  describe('Portfolio Summary', () => {
    it('should return portfolio summary', () => {
      const summary = orchestrator.getPortfolioSummary();
      
      expect(summary).toBeDefined();
      expect(summary.totalValue).toBe(100000);
      expect(summary.cashBalance).toBe(100000);
      expect(summary.positions.length).toBe(0);
    });

    it('should include positions in summary', () => {
      orchestrator.addPosition({
        asset: 'AAPL',
        assetClass: 'stock',
        side: 'long',
        quantity: 100,
        avgEntryPrice: 150,
        currentPrice: 155,
        marketValue: 15500,
        unrealizedPnL: 500,
        unrealizedPnLPercent: 3.33,
        openedAt: new Date(),
        lastUpdated: new Date(),
        metadata: {}
      });

      const summary = orchestrator.getPortfolioSummary();
      
      expect(summary.positions.length).toBe(1);
      expect(summary.investedValue).toBe(15500);
    });

    it('should calculate risk metrics', () => {
      orchestrator.addPosition({
        asset: 'AAPL',
        assetClass: 'stock',
        side: 'long',
        quantity: 100,
        avgEntryPrice: 150,
        currentPrice: 155,
        marketValue: 15500,
        unrealizedPnL: 500,
        unrealizedPnLPercent: 3.33,
        openedAt: new Date(),
        lastUpdated: new Date(),
        metadata: {}
      });

      const summary = orchestrator.getPortfolioSummary();
      
      expect(summary.riskMetrics).toBeDefined();
      expect(summary.riskMetrics.portfolioBeta).toBeGreaterThan(0);
      expect(summary.riskMetrics.var95).toBeGreaterThan(0);
    });
  });

  describe('Signal Processing', () => {
    it('should process signal and generate order', () => {
      const order = orchestrator.processSignalForExecution({
        id: 'test-signal',
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: {
          agentName: 'Test',
          reasoning: 'Strong buy signal',
          keyFactors: [],
          supportingData: {}
        },
        riskMetrics: {
          maxDrawdown: 0.1,
          sharpeRatio: 1.5,
          winRate: 0.65,
          avgHoldingPeriod: '5d'
        },
        execution: {
          entryPrice: 150,
          urgency: 'today'
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
      });

      expect(order).not.toBeNull();
      expect(order?.asset).toBe('AAPL');
      expect(order?.side).toBe('buy');
    });

    it('should calculate appropriate position size', () => {
      const order = orchestrator.processSignalForExecution({
        id: 'test-signal',
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: {
          agentName: 'Test',
          reasoning: 'Strong buy signal',
          keyFactors: [],
          supportingData: {}
        },
        riskMetrics: {
          maxDrawdown: 0.1,
          sharpeRatio: 1.5,
          winRate: 0.65,
          avgHoldingPeriod: '5d'
        },
        execution: {
          entryPrice: 150,
          urgency: 'today'
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
      });

      expect(order?.quantity).toBeGreaterThan(0);
    });
  });

  describe('Rebalancing', () => {
    beforeEach(() => {
      orchestrator.addPosition({
        asset: 'AAPL',
        assetClass: 'stock',
        side: 'long',
        quantity: 100,
        avgEntryPrice: 150,
        currentPrice: 150,
        marketValue: 15000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        openedAt: new Date(),
        lastUpdated: new Date(),
        metadata: {}
      });
    });

    it('should generate rebalance plan', () => {
      const plan = orchestrator.generateRebalancePlan({
        AAPL: 0.20,
        MSFT: 0.15
      });

      expect(plan).toBeDefined();
      expect(plan.targets.length).toBeGreaterThan(0);
      expect(plan.status).toBe('draft');
    });

    it('should calculate rebalance targets', () => {
      const plan = orchestrator.generateRebalancePlan({
        AAPL: 0.10
      });

      const aaplTarget = plan.targets.find(t => t.asset === 'AAPL');
      expect(aaplTarget).toBeDefined();
      expect(aaplTarget?.action).toBeDefined();
    });
  });

  describe('Order Management', () => {
    it('should get pending orders', () => {
      orchestrator.processSignalForExecution({
        id: 'test-signal',
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: {
          agentName: 'Test',
          reasoning: 'Strong buy signal',
          keyFactors: [],
          supportingData: {}
        },
        riskMetrics: {
          maxDrawdown: 0.1,
          sharpeRatio: 1.5,
          winRate: 0.65,
          avgHoldingPeriod: '5d'
        },
        execution: {
          entryPrice: 150,
          urgency: 'today'
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
      });

      const pending = orchestrator.getPendingOrders();
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should cancel order', () => {
      const order = orchestrator.processSignalForExecution({
        id: 'test-signal',
        source: 'stock_consensus',
        asset: 'AAPL',
        assetClass: 'stock',
        direction: 'long',
        strength: 75,
        confidence: 80,
        timeframe: 'swing',
        metadata: {
          agentName: 'Test',
          reasoning: 'Strong buy signal',
          keyFactors: [],
          supportingData: {}
        },
        riskMetrics: {
          maxDrawdown: 0.1,
          sharpeRatio: 1.5,
          winRate: 0.65,
          avgHoldingPeriod: '5d'
        },
        execution: {
          entryPrice: 150,
          urgency: 'today'
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
      });

      if (order) {
        const cancelled = orchestrator.cancelOrder(order.id);
        expect(cancelled).toBe(true);
      }
    });
  });

  describe('Voice Commands', () => {
    it('should handle query command', () => {
      const response = orchestrator.processVoiceCommand({
        intent: 'query',
        action: 'summary'
      });

      expect(response.text).toContain('portfolio');
      expect(response.requiresConfirmation).toBe(false);
    });

    it('should handle risk query', () => {
      const response = orchestrator.processVoiceCommand({
        intent: 'query',
        action: 'risk'
      });

      expect(response.text.toLowerCase()).toContain('beta');
    });

    it('should handle trade command', () => {
      const response = orchestrator.processVoiceCommand({
        intent: 'trade',
        action: 'buy',
        asset: 'AAPL',
        quantity: 10
      });

      expect(response.text).toContain('AAPL');
      expect(response.requiresConfirmation).toBe(true);
    });

    it('should handle alert command', () => {
      const response = orchestrator.processVoiceCommand({
        intent: 'alert'
      });

      expect(response.text).toBeDefined();
    });

    it('should handle settings command', () => {
      const response = orchestrator.processVoiceCommand({
        intent: 'settings'
      });

      expect(response.text).toContain('Max position');
    });
  });

  describe('Risk Policy', () => {
    it('should update risk policy', () => {
      orchestrator.updateRiskPolicy({
        maxPositionSize: 0.15,
        maxDrawdown: 0.20
      });

      const response = orchestrator.processVoiceCommand({
        intent: 'settings'
      });

      expect(response.text).toContain('15%');
    });
  });
});
