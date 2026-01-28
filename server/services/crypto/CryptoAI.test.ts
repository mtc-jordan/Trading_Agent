import { describe, it, expect, beforeEach } from 'vitest';
import { WhaleAgent, createWhaleAgent } from './agents/WhaleAgent';
import { HypeAgent, createHypeAgent } from './agents/HypeAgent';
import { MacroAgent, createMacroAgent } from './agents/MacroAgent';
import { DeltaNeutralEngine, createDeltaNeutralEngine } from './yield/DeltaNeutralEngine';
import { ExecutionAlgorithms, createExecutionAlgorithms } from './execution/ExecutionAlgorithms';
import { InstitutionalFilter, createInstitutionalFilter } from './risk/InstitutionalFilter';

describe('Crypto AI Services', () => {
  // ==================== WHALE AGENT TESTS ====================
  describe('WhaleAgent', () => {
    let whaleAgent: WhaleAgent;

    beforeEach(() => {
      whaleAgent = createWhaleAgent();
    });

    it('should create a whale agent instance', () => {
      expect(whaleAgent).toBeDefined();
      expect(whaleAgent).toBeInstanceOf(WhaleAgent);
    });

    it('should track smart money movements', async () => {
      const movements = await whaleAgent.trackSmartMoneyMovements('ETH');
      expect(movements).toBeDefined();
      expect(Array.isArray(movements.recentFlows)).toBe(true);
      expect(movements.smartMoneyActivity).toMatch(/accumulating|distributing|neutral/);
    });

    it('should detect wash trading', async () => {
      const washTrading = await whaleAgent.detectWashTrading('ETH');
      // Can be null if no wash trading detected
      if (washTrading) {
        expect(washTrading.token).toBe('ETH');
        expect(typeof washTrading.confidence).toBe('number');
      }
    });

    it('should analyze whale concentration', async () => {
      const concentration = await whaleAgent.analyzeWhaleConcentration('BTC');
      expect(concentration).toBeDefined();
      expect(concentration.token).toBe('BTC');
      expect(Array.isArray(concentration.topHolders)).toBe(true);
      expect(concentration.riskLevel).toMatch(/low|medium|high|critical/);
    });

    it('should get on-chain metrics', async () => {
      const metrics = await whaleAgent.getOnChainMetrics('ETH');
      expect(metrics).toBeDefined();
      expect(metrics.token).toBe('ETH');
      expect(metrics.activeAddresses24h).toBeGreaterThanOrEqual(0);
    });

    it('should generate whale report', async () => {
      const report = await whaleAgent.generateWhaleReport('BTC');
      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.overallSignal).toMatch(/strong_buy|buy|neutral|sell|strong_sell/);
      expect(Array.isArray(report.reasoning)).toBe(true);
    });
  });

  // ==================== HYPE AGENT TESTS ====================
  describe('HypeAgent', () => {
    let hypeAgent: HypeAgent;

    beforeEach(() => {
      hypeAgent = createHypeAgent();
    });

    it('should create a hype agent instance', () => {
      expect(hypeAgent).toBeDefined();
      expect(hypeAgent).toBeInstanceOf(HypeAgent);
    });

    it('should analyze social metrics', async () => {
      const metrics = await hypeAgent.analyzeSocialMetrics('BTC');
      expect(metrics).toBeDefined();
      expect(metrics.token).toBe('BTC');
      expect(metrics.totalSocialVolume).toBeGreaterThanOrEqual(0);
      expect(metrics.sentimentScore).toBeGreaterThanOrEqual(-1);
      expect(metrics.sentimentScore).toBeLessThanOrEqual(1);
    });

    it('should analyze narratives', async () => {
      const narratives = await hypeAgent.analyzeNarratives();
      expect(Array.isArray(narratives)).toBe(true);
      expect(narratives.length).toBeGreaterThan(0);
      narratives.forEach(n => {
        expect(n.narrative).toBeDefined();
        expect(n.currentScore).toBeGreaterThanOrEqual(0);
        expect(n.currentScore).toBeLessThanOrEqual(100);
      });
    });

    it('should get token narratives', () => {
      const narratives = hypeAgent.getTokenNarratives('FET');
      expect(Array.isArray(narratives)).toBe(true);
    });

    it('should generate hype report', async () => {
      const report = await hypeAgent.generateHypeReport('ETH', 2500, 5);
      expect(report).toBeDefined();
      expect(report.token).toBe('ETH');
      expect(report.hypeLevel).toMatch(/low|moderate|high|extreme/);
      expect(report.overallSentiment).toMatch(/extreme_fear|fear|neutral|greed|extreme_greed/);
    });
  });

  // ==================== MACRO AGENT TESTS ====================
  describe('MacroAgent', () => {
    let macroAgent: MacroAgent;

    beforeEach(() => {
      macroAgent = createMacroAgent();
    });

    it('should create a macro agent instance', () => {
      expect(macroAgent).toBeDefined();
      expect(macroAgent).toBeInstanceOf(MacroAgent);
    });

    it('should calculate correlation between assets', async () => {
      const correlation = await macroAgent.calculateCorrelation('BTC', 'NASDAQ', '1d');
      expect(correlation).toBeDefined();
      expect(correlation.asset1).toBe('BTC');
      expect(correlation.asset2).toBe('NASDAQ');
      expect(correlation.correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation.correlation).toBeLessThanOrEqual(1);
    });

    it('should analyze lag between assets', async () => {
      const lag = await macroAgent.analyzeLag('NASDAQ', 'BTC');
      expect(lag).toBeDefined();
      expect(lag.leadingAsset).toBe('NASDAQ');
      expect(lag.laggingAsset).toBe('BTC');
      expect(lag.optimalLag).toBeGreaterThanOrEqual(0);
    });

    it('should detect macro regime', async () => {
      const regime = await macroAgent.detectMacroRegime();
      expect(regime).toBeDefined();
      expect(regime.regime).toMatch(/risk_on|risk_off|transition|decorrelated/);
      expect(regime.confidence).toBeGreaterThanOrEqual(0);
      expect(regime.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate signals', async () => {
      const signals = await macroAgent.generateSignals();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should calculate BTC beta', async () => {
      const beta = await macroAgent.calculateBTCBeta();
      expect(typeof beta).toBe('number');
    });

    it('should generate macro report', async () => {
      const report = await macroAgent.generateMacroReport();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.currentRegime).toBeDefined();
      expect(Array.isArray(report.correlations)).toBe(true);
      expect(report.marketRiskLevel).toMatch(/low|moderate|high|extreme/);
    });
  });

  // ==================== DELTA NEUTRAL ENGINE TESTS ====================
  describe('DeltaNeutralEngine', () => {
    let engine: DeltaNeutralEngine;

    beforeEach(() => {
      engine = createDeltaNeutralEngine(1000000);
    });

    it('should create a delta neutral engine instance', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(DeltaNeutralEngine);
    });

    it('should get funding rates', async () => {
      const rates = await engine.getFundingRates('BTC');
      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBeGreaterThan(0);
      rates.forEach(r => {
        expect(r.exchange).toBeDefined();
        expect(r.symbol).toBe('BTC');
        expect(typeof r.rate).toBe('number');
        expect(typeof r.annualizedRate).toBe('number');
      });
    });

    it('should calculate basis spread', async () => {
      const spreads = await engine.calculateBasisSpread('BTC');
      expect(Array.isArray(spreads)).toBe(true);
      expect(spreads.length).toBeGreaterThan(0);
      spreads.forEach(s => {
        expect(s.spotPrice).toBeGreaterThan(0);
        expect(s.futuresPrice).toBeGreaterThan(0);
        expect(s.daysToExpiry).toBeGreaterThan(0);
      });
    });

    it('should open a position', async () => {
      const position = await engine.openPosition('BTC', 100000, 'funding');
      expect(position).toBeDefined();
      expect(position.symbol).toBe('BTC');
      expect(position.notionalValue).toBe(100000);
      expect(position.status).toBe('active');
    });

    it('should update a position', async () => {
      const position = await engine.openPosition('ETH', 50000, 'basis');
      const updated = await engine.updatePosition(position.id);
      expect(updated).toBeDefined();
      expect(updated!.currentSpotPrice).toBeGreaterThan(0);
    });

    it('should close a position', async () => {
      const position = await engine.openPosition('SOL', 25000, 'funding');
      const closed = await engine.closePosition(position.id);
      expect(closed).toBeDefined();
      expect(closed!.status).toBe('closed');
    });

    it('should find yield opportunities', async () => {
      const opportunities = await engine.findYieldOpportunities(5);
      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should calculate risk metrics', () => {
      const metrics = engine.calculateRiskMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.maxDrawdown).toBe('number');
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(typeof metrics.liquidationRisk).toBe('number');
    });

    it('should generate yield report', async () => {
      const report = await engine.generateYieldReport();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(report.activePositions)).toBe(true);
      expect(Array.isArray(report.topOpportunities)).toBe(true);
    });
  });

  // ==================== EXECUTION ALGORITHMS TESTS ====================
  describe('ExecutionAlgorithms', () => {
    let execAlgo: ExecutionAlgorithms;

    beforeEach(() => {
      execAlgo = createExecutionAlgorithms();
    });

    it('should create an execution algorithms instance', () => {
      expect(execAlgo).toBeDefined();
      expect(execAlgo).toBeInstanceOf(ExecutionAlgorithms);
    });

    it('should create VWAP plan', async () => {
      const plan = await execAlgo.createVWAPPlan('BTC', 'buy', 10, 4, 0.1);
      expect(plan).toBeDefined();
      expect(plan.algorithm).toBe('vwap');
      expect(plan.symbol).toBe('BTC');
      expect(plan.side).toBe('buy');
      expect(plan.totalQuantity).toBe(10);
      expect(Array.isArray(plan.slices)).toBe(true);
    });

    it('should create implementation shortage plan', async () => {
      const plan = await execAlgo.createImplementationShortagePlan('ETH', 'sell', 100, 'medium');
      expect(plan).toBeDefined();
      expect(plan.algorithm).toBe('implementation_shortage');
      expect(plan.symbol).toBe('ETH');
      expect(plan.side).toBe('sell');
    });

    it('should create liquidity sniping plan', async () => {
      const { plan, route } = await execAlgo.createLiquiditySnipingPlan('SOL', 'buy', 1000, 0.01);
      expect(plan).toBeDefined();
      expect(plan.algorithm).toBe('liquidity_sniping');
      expect(route).toBeDefined();
      expect(Array.isArray(route.path)).toBe(true);
    });

    it('should detect predatory bots', async () => {
      const alert = await execAlgo.detectPredatoryBots('BTC');
      expect(alert).toBeDefined();
      expect(typeof alert.detected).toBe('boolean');
      expect(typeof alert.confidence).toBe('number');
      expect(alert.recommendation).toBeDefined();
    });

    it('should scan liquidity', async () => {
      const liquidity = await execAlgo.scanLiquidity('BTC');
      expect(Array.isArray(liquidity)).toBe(true);
      expect(liquidity.length).toBeGreaterThan(0);
      liquidity.forEach(l => {
        expect(l.exchange).toBeDefined();
        expect(l.type).toMatch(/cex|dex/);
        expect(l.bestBid).toBeGreaterThan(0);
        expect(l.bestAsk).toBeGreaterThan(0);
      });
    });

    it('should find optimal route', async () => {
      const liquidity = await execAlgo.scanLiquidity('ETH');
      const route = await execAlgo.findOptimalRoute('ETH', 'buy', 100, liquidity);
      expect(route).toBeDefined();
      expect(Array.isArray(route.path)).toBe(true);
      expect(route.effectivePrice).toBeGreaterThan(0);
    });

    it('should execute plan', async () => {
      const plan = await execAlgo.createVWAPPlan('BTC', 'buy', 5, 2, 0.05);
      const executed = await execAlgo.executePlan(plan.id);
      expect(executed).toBeDefined();
      expect(executed!.status).toBe('completed');
      expect(executed!.metrics.fillRate).toBeGreaterThan(0);
    });

    it('should predict volume profile', async () => {
      const profile = await execAlgo.predictVolumeProfile('BTC', 8);
      expect(Array.isArray(profile)).toBe(true);
      expect(profile.length).toBe(8);
      profile.forEach(p => {
        expect(p.hour).toBeGreaterThanOrEqual(0);
        expect(p.hour).toBeLessThanOrEqual(23);
        expect(p.expectedVolume).toBeGreaterThan(0);
      });
    });
  });

  // ==================== INSTITUTIONAL FILTER TESTS ====================
  describe('InstitutionalFilter', () => {
    let filter: InstitutionalFilter;

    beforeEach(() => {
      filter = createInstitutionalFilter();
    });

    it('should create an institutional filter instance', () => {
      expect(filter).toBeDefined();
      expect(filter).toBeInstanceOf(InstitutionalFilter);
    });

    it('should evaluate token', async () => {
      const listing = await filter.evaluateToken('ETH', '0x0000000000000000000000000000000000000000', 'ethereum');
      expect(listing).toBeDefined();
      expect(listing.symbol).toBe('ETH');
      expect(listing.chain).toBe('ethereum');
      expect(typeof listing.passesFilter).toBe('boolean');
      expect(Array.isArray(listing.filterResults)).toBe(true);
    });

    it('should check audit status', async () => {
      const audit = await filter.checkAuditStatus('0x1234', 'ethereum');
      expect(audit).toBeDefined();
      expect(typeof audit.isAudited).toBe('boolean');
      expect(audit.rating).toMatch(/pass|warning|fail|unaudited/);
      expect(typeof audit.score).toBe('number');
    });

    it('should analyze whale concentration', async () => {
      const concentration = await filter.analyzeWhaleConcentration('0x1234', 'ethereum');
      expect(concentration).toBeDefined();
      expect(concentration.topHolderPercentage).toBeGreaterThanOrEqual(0);
      expect(concentration.holderCount).toBeGreaterThan(0);
      expect(concentration.distributionScore).toBeGreaterThanOrEqual(0);
      expect(concentration.distributionScore).toBeLessThanOrEqual(100);
    });

    it('should check blacklist', () => {
      const isBlacklisted = filter.isBlacklisted('0xknownscam');
      expect(typeof isBlacklisted).toBe('boolean');
    });

    it('should initiate multi-sig transaction', async () => {
      const result = await filter.initiateTransaction('tx_001', 50000, 'signer_1');
      expect(result).toBeDefined();
      expect(result.status).toMatch(/pending|approved|rejected/);
      expect(result.requiredSignatures).toBeGreaterThan(0);
    });

    it('should sign transaction', async () => {
      await filter.initiateTransaction('tx_002', 50000, 'signer_1');
      const result = await filter.signTransaction('tx_002', 'signer_2');
      expect(result).toBeDefined();
      expect(result.currentSignatures).toBeGreaterThanOrEqual(1);
    });

    it('should check profit taking', () => {
      const result = filter.checkProfitTaking(120000, 100000);
      expect(result).toBeDefined();
      expect(typeof result.shouldTake).toBe('boolean');
      expect(Array.isArray(result.allocation)).toBe(true);
    });

    it('should generate risk report', async () => {
      const portfolio = [
        { asset: 'ETH', value: 100000, contractAddress: '0x0000' },
        { asset: 'BTC', value: 200000 }
      ];
      const report = await filter.generateRiskReport(portfolio);
      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.portfolioValue).toBe(300000);
      expect(report.riskScore).toBeGreaterThanOrEqual(0);
      expect(report.riskScore).toBeLessThanOrEqual(100);
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Tests', () => {
    it('should combine whale and hype signals for analysis', async () => {
      const whaleAgent = createWhaleAgent();
      const hypeAgent = createHypeAgent();

      const whaleReport = await whaleAgent.generateWhaleReport('ETH');
      const hypeReport = await hypeAgent.generateHypeReport('ETH', 2500, 3);

      // Combined analysis
      const combinedSignal = {
        token: 'ETH',
        whaleActivity: whaleReport.overallSignal,
        socialHype: hypeReport.hypeLevel,
        riskOfCorrection: hypeReport.riskOfCorrection,
        recommendation: hypeReport.recommendation
      };

      expect(combinedSignal.token).toBe('ETH');
      expect(combinedSignal.whaleActivity).toBeDefined();
      expect(combinedSignal.socialHype).toBeDefined();
    });

    it('should use macro signals for yield strategy selection', async () => {
      const macroAgent = createMacroAgent();
      const yieldEngine = createDeltaNeutralEngine();

      const regime = await macroAgent.detectMacroRegime();
      const opportunities = await yieldEngine.findYieldOpportunities(10);

      // Filter opportunities based on regime
      const filteredOpps = opportunities.filter(opp => {
        if (regime.regime === 'risk_off') {
          return opp.riskLevel === 'low';
        }
        return true;
      });

      expect(Array.isArray(filteredOpps)).toBe(true);
    });

    it('should apply institutional filter before execution', async () => {
      const filter = createInstitutionalFilter();
      const execAlgo = createExecutionAlgorithms();

      // Check token first
      const listing = await filter.evaluateToken('SOL', '0xsol', 'solana');

      if (listing.passesFilter) {
        const plan = await execAlgo.createVWAPPlan('SOL', 'buy', 100, 4, 0.1);
        expect(plan).toBeDefined();
        expect(plan.status).toBe('planning');
      } else {
        // Should not execute
        expect(listing.filterResults.some(r => !r.passed)).toBe(true);
      }
    });
  });
});
