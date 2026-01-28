/**
 * Multi-Agent Coordinator
 * 
 * Central coordinator for the 5 specialized trading agents:
 * 1. MacroSentinel - Commodities & News (NLP)
 * 2. DeltaHedger - Options (Reinforcement Learning)
 * 3. AlphaChaser - Stocks & ETFs (XGBoost/Random Forest)
 * 4. ChainTracker - Crypto (Graph Neural Networks)
 * 5. Executioner - Portfolio-wide (Deep RL)
 * 
 * Plus integration with:
 * - Statistical Arbitrage (Z-Score)
 * - Kill-Switch Risk Management (VaR, IV Skew)
 */

import { AgentSignal, SignalStrength, RiskLevel, MacroSentinelAgent, DeltaHedgerAgent, AlphaChaserAgent, ChainTrackerAgent, ExecutionerAgent, createMacroSentinelAgent, createDeltaHedgerAgent, createAlphaChaserAgent, createChainTrackerAgent, createExecutionerAgent } from './SpecializedTradingAgents';
import { StatisticalArbitrageCalculator, ArbitrageOpportunity, InflationHedgePlay, createStatisticalArbitrageCalculator } from './StatisticalArbitrage';
import { KillSwitchAgent, RiskMetrics, PortfolioPosition, OptionsMarketData, createKillSwitchAgent } from './KillSwitchAgent';

export interface CoordinatorConfig {
  enableKillSwitch: boolean;
  enableArbitrage: boolean;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number;
  rebalanceThreshold: number;
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'signal' | 'request' | 'response' | 'alert';
  payload: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CoordinatedStrategy {
  id: string;
  name: string;
  agents: string[];
  signals: AgentSignal[];
  consensusSignal: SignalStrength;
  confidence: number;
  trades: { symbol: string; action: 'buy' | 'sell' | 'hold'; weight: number; reasoning: string }[];
  riskAssessment: { level: RiskLevel; killSwitchActive: boolean; varExposure: number };
  arbitrageOpportunities: ArbitrageOpportunity[];
  inflationHedgePlays: InflationHedgePlay[];
  timestamp: Date;
}

export interface MarketContext {
  stocks: { symbol: string; price: number; change: number; volume: number }[];
  crypto: { symbol: string; price: number; change: number; volume: number }[];
  commodities: { symbol: string; price: number; change: number }[];
  options: OptionsMarketData[];
  news: { headline: string; sentiment: number; source: string }[];
  vix: number;
  marketRegime: 'bull' | 'bear' | 'sideways' | 'volatile';
}

export class MultiAgentCoordinator {
  private macroSentinel: MacroSentinelAgent;
  private deltaHedger: DeltaHedgerAgent;
  private alphaChaser: AlphaChaserAgent;
  private chainTracker: ChainTrackerAgent;
  private executioner: ExecutionerAgent;
  private arbitrageCalculator: StatisticalArbitrageCalculator;
  private killSwitch: KillSwitchAgent;
  private config: CoordinatorConfig;
  private messageQueue: AgentMessage[] = [];
  private strategyHistory: CoordinatedStrategy[] = [];

  constructor(config: Partial<CoordinatorConfig> = {}) {
    this.config = {
      enableKillSwitch: true,
      enableArbitrage: true,
      riskTolerance: 'moderate',
      maxPositionSize: 0.1,
      rebalanceThreshold: 0.05,
      ...config
    };
    this.macroSentinel = createMacroSentinelAgent();
    this.deltaHedger = createDeltaHedgerAgent();
    this.alphaChaser = createAlphaChaserAgent();
    this.chainTracker = createChainTrackerAgent();
    this.executioner = createExecutionerAgent();
    this.arbitrageCalculator = createStatisticalArbitrageCalculator();
    this.killSwitch = createKillSwitchAgent();
  }

  async analyzeMarket(context: MarketContext): Promise<CoordinatedStrategy> {
    const signals: AgentSignal[] = [];
    
    // Get signals from all 5 specialized agents
    // Convert news to MacroEvent format and commodities to target assets
    const macroEvents = context.news.map(n => ({
      type: 'economic_data' as const,
      headline: n.headline,
      sentiment: n.sentiment,
      impactedAssets: context.commodities.map(c => c.symbol),
      severity: Math.abs(n.sentiment) > 0.7 ? 'high' as const : 'medium' as const,
      source: n.source,
      timestamp: new Date()
    }));
    const commoditySymbols = context.commodities.map(c => c.symbol);
    const macroSignal = await this.macroSentinel.analyze(macroEvents, commoditySymbols);
    signals.push(macroSignal);
    
    // Convert options data to OptionsPosition format
    const optionsPositions = context.options.map(o => ({
      symbol: o.symbol,
      strike: 100,
      expiry: new Date(),
      type: 'call' as const,
      quantity: 1,
      greeks: { delta: 0.5, gamma: 0.05, theta: -0.02, vega: 0.1, rho: 0 },
      iv: o.atmIV || 0.2,
      underlyingPrice: 100
    }));
    const optionsSignal = await this.deltaHedger.analyze(optionsPositions, 0.05);
    signals.push(optionsSignal);
    
    // Convert simple stock data to StockFactors format
    const stockFactors = context.stocks.map(s => ({
      symbol: s.symbol,
      peRatio: 20, pbRatio: 3, debtToEquity: 0.5, revenueGrowth: 0.1, earningsGrowth: 0.15,
      roe: 0.15, rsi: 50, macdSignal: 0, priceToSMA50: 1.02, priceToSMA200: 1.05, volumeRatio: 1.0, atr: s.price * 0.02
    }));
    const stockSignal = await this.alphaChaser.analyze(stockFactors);
    signals.push(stockSignal);
    
    // Convert simple crypto data to OnChainMetrics format
    const cryptoMetrics = context.crypto.map(c => ({
      symbol: c.symbol,
      whaleMovements: { inflows: 0, outflows: 0, netFlow: 0, largeTransactions: 0 },
      exchangeFlows: { exchangeInflow: 0, exchangeOutflow: 0, exchangeReserves: 0 },
      networkActivity: { activeAddresses: 0, transactionCount: 0, avgTransactionValue: 0 },
      holderDistribution: { whalePercentage: 0.3, retailPercentage: 0.5, institutionalPercentage: 0.2 }
    }));
    const cryptoSignal = await this.chainTracker.analyze(cryptoMetrics);
    signals.push(cryptoSignal);
    
    // Create execution contexts from market data
    const executionContexts: any[] = context.stocks.slice(0, 3).map(stock => ({
      symbol: stock.symbol,
      orderSize: 100,
      urgency: context.vix > 25 ? 'high' : 'medium' as const,
      marketConditions: {
        spread: 0.01,
        depth: 1000000,
        volatility: Math.abs(stock.change) / 100,
        volume: stock.volume
      },
      timeZone: 'America/New_York',
      marketHours: {
        isOpen: true,
        nextOpen: new Date(),
        nextClose: new Date()
      }
    }));
    
    const executionSignal = await this.executioner.analyze(executionContexts);
    signals.push(executionSignal);

    // Calculate consensus
    const consensusSignal = this.calculateConsensus(signals);
    const confidence = this.calculateConfidence(signals);

    // Check Kill-Switch
    const positions = this.convertToPositions(context);
    const returns = new Map<string, number[]>();
    const killSwitchResult = await this.killSwitch.analyze(positions, context.options, returns);

    // Find arbitrage opportunities
    let arbitrageOpportunities: ArbitrageOpportunity[] = [];
    let inflationHedgePlays: InflationHedgePlay[] = [];
    
    if (this.config.enableArbitrage) {
      const priceHistory = this.convertToPriceHistory(context);
      const pairs = this.arbitrageCalculator.findCorrelationPairs(priceHistory);
      arbitrageOpportunities = this.arbitrageCalculator.findArbitrageOpportunities(pairs);
      
      if (macroSignal.signal === 'strong_buy' || macroSignal.signal === 'strong_sell') {
        const relatedAssets = this.findRelatedAssets(macroSignal);
        const hedgePlay = this.arbitrageCalculator.detectInflationHedgePlay(macroSignal, relatedAssets);
        if (hedgePlay) inflationHedgePlays.push(hedgePlay);
      }
    }

    // Generate coordinated trades
    const trades = this.generateTrades(signals, killSwitchResult.metrics, arbitrageOpportunities);

    // Determine risk level
    let riskLevel: RiskLevel = 'low';
    if (killSwitchResult.metrics.overallRiskScore > 0.7) riskLevel = 'extreme';
    else if (killSwitchResult.metrics.overallRiskScore > 0.5) riskLevel = 'high';
    else if (killSwitchResult.metrics.overallRiskScore > 0.3) riskLevel = 'medium';

    const strategy: CoordinatedStrategy = {
      id: 'strategy_' + Date.now(),
      name: this.generateStrategyName(consensusSignal, context.marketRegime),
      agents: ['MacroSentinel', 'DeltaHedger', 'AlphaChaser', 'ChainTracker', 'Executioner'],
      signals,
      consensusSignal,
      confidence,
      trades,
      riskAssessment: {
        level: riskLevel,
        killSwitchActive: killSwitchResult.metrics.killSwitchStatus.isTriggered,
        varExposure: killSwitchResult.metrics.portfolioVaR.var95
      },
      arbitrageOpportunities,
      inflationHedgePlays,
      timestamp: new Date()
    };

    this.strategyHistory.push(strategy);
    return strategy;
  }

  private calculateConsensus(signals: AgentSignal[]): SignalStrength {
    const signalScores: Record<SignalStrength, number> = { strong_buy: 2, buy: 1, hold: 0, sell: -1, strong_sell: -2 };
    const weights: Record<string, number> = { MacroSentinel: 0.2, DeltaHedger: 0.15, AlphaChaser: 0.25, ChainTracker: 0.2, Executioner: 0.2 };
    
    let weightedScore = 0;
    let totalWeight = 0;
    
    for (const signal of signals) {
      const weight = weights[signal.agent] || 0.1;
      weightedScore += signalScores[signal.signal] * weight * signal.confidence;
      totalWeight += weight;
    }
    
    const avgScore = weightedScore / totalWeight;
    
    if (avgScore >= 1.5) return 'strong_buy';
    if (avgScore >= 0.5) return 'buy';
    if (avgScore <= -1.5) return 'strong_sell';
    if (avgScore <= -0.5) return 'sell';
    return 'hold';
  }

  private calculateConfidence(signals: AgentSignal[]): number {
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const signalAgreement = this.calculateSignalAgreement(signals);
    return avgConfidence * 0.6 + signalAgreement * 0.4;
  }

  private calculateSignalAgreement(signals: AgentSignal[]): number {
    const signalCounts: Record<string, number> = {};
    for (const signal of signals) {
      const direction = signal.signal.includes('buy') ? 'bullish' : signal.signal.includes('sell') ? 'bearish' : 'neutral';
      signalCounts[direction] = (signalCounts[direction] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(signalCounts));
    return maxCount / signals.length;
  }

  private generateTrades(signals: AgentSignal[], riskMetrics: RiskMetrics, arbitrage: ArbitrageOpportunity[]): { symbol: string; action: 'buy' | 'sell' | 'hold'; weight: number; reasoning: string }[] {
    const trades: { symbol: string; action: 'buy' | 'sell' | 'hold'; weight: number; reasoning: string }[] = [];
    
    // If kill-switch is active, reduce exposure
    if (riskMetrics.killSwitchStatus.isTriggered) {
      trades.push({ symbol: 'PORTFOLIO', action: 'sell', weight: riskMetrics.killSwitchStatus.exposureReduction, reasoning: 'Kill-switch triggered: ' + riskMetrics.killSwitchStatus.triggerReason });
      return trades;
    }

    // Add trades from agent signals
    for (const signal of signals) {
      for (const asset of signal.targetAssets) {
        const action = signal.signal.includes('buy') ? 'buy' : signal.signal.includes('sell') ? 'sell' : 'hold';
        trades.push({ symbol: asset, action, weight: this.config.maxPositionSize * signal.confidence, reasoning: signal.reasoning });
      }
    }

    // Add arbitrage trades
    for (const opp of arbitrage.slice(0, 3)) {
      for (const trade of opp.trades) {
        trades.push({ symbol: trade.symbol, action: trade.action, weight: trade.weight * opp.confidence, reasoning: trade.reasoning });
      }
    }

    return trades;
  }

  private convertToPositions(context: MarketContext): PortfolioPosition[] {
    const positions: PortfolioPosition[] = [];
    for (const stock of context.stocks.slice(0, 5)) {
      positions.push({ symbol: stock.symbol, assetClass: 'stock', quantity: 100, currentPrice: stock.price, avgCost: stock.price * 0.95, weight: 0.1, volatility: 0.2, beta: 1.0 });
    }
    for (const crypto of context.crypto.slice(0, 3)) {
      positions.push({ symbol: crypto.symbol, assetClass: 'crypto', quantity: 10, currentPrice: crypto.price, avgCost: crypto.price * 0.9, weight: 0.1, volatility: 0.5, beta: 1.5 });
    }
    return positions;
  }

  private convertToPriceHistory(context: MarketContext): any[] {
    return context.stocks.map(s => ({ symbol: s.symbol, assetClass: 'stock', prices: [s.price * 0.95, s.price * 0.97, s.price * 0.99, s.price], timestamps: [new Date(), new Date(), new Date(), new Date()], returns: [0.02, 0.02, 0.01] }));
  }

  private findRelatedAssets(signal: AgentSignal): { symbol: string; assetClass: string; correlation: number }[] {
    const assets = [
      { symbol: 'FCX', assetClass: 'stock', correlation: 0.8 },
      { symbol: 'BTC', assetClass: 'crypto', correlation: 0.5 },
      { symbol: 'GLD', assetClass: 'etf', correlation: 0.6 }
    ];
    return assets;
  }

  private generateStrategyName(signal: SignalStrength, regime: string): string {
    const signalNames: Record<SignalStrength, string> = { strong_buy: 'Aggressive Long', buy: 'Bullish', hold: 'Neutral', sell: 'Bearish', strong_sell: 'Defensive' };
    return signalNames[signal] + ' ' + regime.charAt(0).toUpperCase() + regime.slice(1) + ' Strategy';
  }

  getStrategyHistory(): CoordinatedStrategy[] {
    return this.strategyHistory;
  }

  sendMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
  }

  getMessages(agentName: string): AgentMessage[] {
    return this.messageQueue.filter(m => m.to === agentName);
  }
}

export const createMultiAgentCoordinator = (config?: Partial<CoordinatorConfig>) => new MultiAgentCoordinator(config);
