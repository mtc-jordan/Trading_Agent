/**
 * TradoVerse Options Analysis Agents
 * 
 * Comprehensive options analysis including:
 * - Greeks analysis (Delta, Gamma, Theta, Vega, Rho)
 * - Implied volatility analysis
 * - Options strategy recommendations
 * - Risk/reward profiling
 */

import type { SignalStrength, AgentType } from './AgentOrchestrator';

// ==================== TYPES ====================

export type MarketOutlook = 
  | 'strongly_bullish' | 'bullish' | 'neutral'
  | 'bearish' | 'strongly_bearish' | 'volatile' | 'range_bound';

export interface OptionsGreeksInput {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  impliedVolatility: number;
  historicalVolatility: number;
  ivRank: number;
  ivPercentile: number;
  openInterest: number;
  volume: number;
  bid: number;
  ask: number;
  lastPrice: number;
  bidAskSpread: number;
  strikePrice: number;
  underlyingPrice: number;
  daysToExpiry: number;
  optionType: 'call' | 'put';
  earningsInDays?: number;
}

export interface OptionsStrategy {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  legs: { type: 'buy' | 'sell'; optionType: 'call' | 'put'; strike: number; premium: number; quantity: number; }[];
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakevens: number[];
  probabilityOfProfit: number;
  requiredCapital: number;
  greeksExposure: { netDelta: number; netGamma: number; netTheta: number; netVega: number; };
}

export interface OptionsAnalysisInput {
  symbol: string;
  underlyingPrice: number;
  greeks: OptionsGreeksInput;
  marketConditions?: { vixLevel: number; sectorIV: number; marketTrend: 'up' | 'down' | 'sideways'; };
}

export interface OptionsAgentAnalysis {
  agentName: string;
  agentType?: AgentType;
  signal: SignalStrength;
  confidence: number;
  reasoning: string;
  weight: number;
  details: Record<string, any>;
}

// ==================== AGENTS ====================

export class GreeksAnalysisAgent {
  private agentName = 'Greeks Analysis';
  private weight = 0.30;

  async analyze(input: OptionsAnalysisInput): Promise<OptionsAgentAnalysis> {
    const greeks = input.greeks;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (greeks.optionType === 'call' && greeks.delta > 0.7) {
      signal = 'buy';
      confidence += 15;
      reasons.push(`Deep ITM call (delta ${greeks.delta.toFixed(2)})`);
    }
    details.delta = greeks.delta;

    if (greeks.gamma > 0.1 && greeks.daysToExpiry < 7) {
      confidence -= 10;
      reasons.push(`High gamma risk near expiry`);
      details.gammaRisk = 'high';
    }

    const dailyDecayPercent = Math.abs(greeks.theta) / greeks.lastPrice * 100;
    if (dailyDecayPercent > 2) {
      confidence -= 15;
      reasons.push(`High theta decay (${dailyDecayPercent.toFixed(1)}%/day)`);
    }
    details.theta = greeks.theta;
    details.vega = greeks.vega;

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Greeks analysis neutral',
      weight: this.weight,
      details
    };
  }
}

export class VolatilityAnalysisAgent {
  private agentName = 'Volatility Analysis';
  private weight = 0.25;

  async analyze(input: OptionsAnalysisInput): Promise<OptionsAgentAnalysis> {
    const greeks = input.greeks;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (greeks.ivRank > 80) {
      signal = 'sell';
      confidence += 20;
      reasons.push(`IV Rank at ${greeks.ivRank}% - premium selling opportunity`);
      details.ivEnvironment = 'elevated';
    } else if (greeks.ivRank < 20) {
      signal = 'buy';
      confidence += 20;
      reasons.push(`IV Rank at ${greeks.ivRank}% - cheap options`);
      details.ivEnvironment = 'depressed';
    }
    details.ivRank = greeks.ivRank;

    const ivHvRatio = greeks.impliedVolatility / greeks.historicalVolatility;
    if (ivHvRatio > 1.3) {
      if (signal !== 'buy') signal = 'sell';
      confidence += 10;
      reasons.push(`IV premium above HV - overpriced`);
    }
    details.ivHvRatio = ivHvRatio;

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Volatility analysis neutral',
      weight: this.weight,
      details
    };
  }
}

export class StrategyRecommendationAgent {
  private agentName = 'Strategy Recommendation';
  private weight = 0.25;

  async analyze(input: OptionsAnalysisInput): Promise<OptionsAgentAnalysis & { strategies: OptionsStrategy[] }> {
    const greeks = input.greeks;
    const market = input.marketConditions;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};
    const strategies: OptionsStrategy[] = [];

    let outlook: MarketOutlook = 'neutral';
    if (market) {
      if (market.vixLevel > 30) outlook = 'volatile';
      else if (market.marketTrend === 'up' && greeks.ivRank < 50) outlook = 'bullish';
      else if (market.marketTrend === 'down') outlook = 'bearish';
    }
    details.outlook = outlook;

    if (outlook === 'neutral' && greeks.ivRank > 60) {
      strategies.push({
        name: 'Iron Condor',
        type: 'neutral',
        legs: [
          { type: 'sell', optionType: 'put', strike: greeks.underlyingPrice * 0.95, premium: 1.5, quantity: 1 },
          { type: 'buy', optionType: 'put', strike: greeks.underlyingPrice * 0.90, premium: 0.5, quantity: 1 },
          { type: 'sell', optionType: 'call', strike: greeks.underlyingPrice * 1.05, premium: 1.5, quantity: 1 },
          { type: 'buy', optionType: 'call', strike: greeks.underlyingPrice * 1.10, premium: 0.5, quantity: 1 }
        ],
        maxProfit: 200,
        maxLoss: 300,
        breakevens: [greeks.underlyingPrice * 0.93, greeks.underlyingPrice * 1.07],
        probabilityOfProfit: 68,
        requiredCapital: 500,
        greeksExposure: { netDelta: 0, netGamma: -0.04, netTheta: 0.10, netVega: -0.20 }
      });
      confidence += 20;
      reasons.push('Neutral outlook with high IV - iron condor recommended');
    }

    details.recommendedStrategies = strategies.map(s => s.name);

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'No clear strategy recommendation',
      weight: this.weight,
      details,
      strategies
    };
  }
}

export class OptionsRiskAgent {
  private agentName = 'Options Risk';
  private weight = 0.20;

  async analyze(input: OptionsAnalysisInput): Promise<OptionsAgentAnalysis> {
    const greeks = input.greeks;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    const spreadPercent = greeks.bidAskSpread / greeks.lastPrice * 100;
    if (spreadPercent > 5) {
      confidence -= 20;
      reasons.push(`Wide bid-ask spread (${spreadPercent.toFixed(1)}%)`);
      details.liquidityRisk = 'high';
    }

    if (greeks.openInterest < 100) {
      confidence -= 15;
      reasons.push(`Low open interest (${greeks.openInterest})`);
      details.oiRisk = 'high';
    }

    if (greeks.daysToExpiry < 7) {
      confidence -= 15;
      reasons.push(`Near expiry (${greeks.daysToExpiry} days)`);
      details.expiryRisk = 'high';
    }

    const riskScore = (spreadPercent > 3 ? 2 : 0) + (greeks.openInterest < 500 ? 2 : 0) + (greeks.daysToExpiry < 14 ? 2 : 0);
    if (riskScore >= 5) {
      signal = 'strong_sell';
      details.overallRisk = 'extreme';
    } else if (riskScore >= 3) {
      signal = 'sell';
      details.overallRisk = 'high';
    } else {
      details.overallRisk = 'medium';
    }

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Risk metrics acceptable',
      weight: this.weight,
      details
    };
  }
}

// ==================== ORCHESTRATOR ====================

export class OptionsAnalysisOrchestrator {
  private greeksAgent = new GreeksAnalysisAgent();
  private volatilityAgent = new VolatilityAnalysisAgent();
  private strategyAgent = new StrategyRecommendationAgent();
  private riskAgent = new OptionsRiskAgent();

  async analyze(input: OptionsAnalysisInput): Promise<{
    symbol: string;
    underlyingPrice: number;
    overallSignal: SignalStrength;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    marketOutlook: MarketOutlook;
    analyses: OptionsAgentAnalysis[];
    recommendedStrategies: OptionsStrategy[];
    keyInsights: string[];
    summary: string;
  }> {
    const [greeks, volatility, strategy, risk] = await Promise.all([
      this.greeksAgent.analyze(input),
      this.volatilityAgent.analyze(input),
      this.strategyAgent.analyze(input),
      this.riskAgent.analyze(input)
    ]);

    const analyses: OptionsAgentAnalysis[] = [greeks, volatility, strategy, risk];

    const signalScores: Record<SignalStrength, number> = { strong_buy: 0, buy: 0, hold: 0, sell: 0, strong_sell: 0 };
    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const analysis of analyses) {
      signalScores[analysis.signal] += analysis.weight * analysis.confidence;
      totalWeight += analysis.weight;
      weightedConfidence += analysis.weight * analysis.confidence;
    }

    let overallSignal: SignalStrength = 'hold';
    let maxScore = 0;
    for (const [signal, score] of Object.entries(signalScores)) {
      if (score > maxScore) {
        maxScore = score;
        overallSignal = signal as SignalStrength;
      }
    }

    const confidence = Math.round(weightedConfidence / totalWeight);
    const riskLevel = risk.details.overallRisk || 'medium';
    const marketOutlook: MarketOutlook = strategy.details.outlook || 'neutral';
    const recommendedStrategies = (strategy as any).strategies || [];

    const keyInsights: string[] = [];
    if (greeks.details.gammaRisk === 'high') keyInsights.push('High gamma risk near expiry');
    if (volatility.details.ivEnvironment === 'elevated') keyInsights.push('Elevated IV - premium selling favored');
    if (risk.details.liquidityRisk === 'high') keyInsights.push('Poor liquidity');

    const summary = `Options analysis for ${input.symbol}: ${overallSignal} signal with ${confidence}% confidence. IV Rank: ${input.greeks.ivRank}%, ${input.greeks.daysToExpiry} DTE.`;

    return {
      symbol: input.symbol,
      underlyingPrice: input.underlyingPrice,
      overallSignal,
      confidence,
      riskLevel,
      marketOutlook,
      analyses,
      recommendedStrategies,
      keyInsights,
      summary
    };
  }
}
