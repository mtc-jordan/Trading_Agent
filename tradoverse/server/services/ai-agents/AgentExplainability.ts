/**
 * Agent Explainability Service
 * 
 * Provides detailed explanations of how each AI agent reached its decision,
 * including specific indicators, patterns, and data points that influenced the vote.
 * 
 * Based on research from:
 * - "Explainable AI for Financial Trading" (2023)
 * - "Interpretable Machine Learning in Finance" (2024)
 * - "SHAP Values for Trading Model Interpretation" (2023)
 */

import { type OHLCV, calculateAllIndicators, detectCandlestickPatterns } from './TechnicalIndicators';

// Types for explainability
export interface IndicatorContribution {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  contribution: number; // -1 to 1, negative = bearish, positive = bullish
  explanation: string;
  threshold?: { bullish: number; bearish: number };
}

export interface PatternContribution {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: number;
  contribution: number;
  explanation: string;
}

export interface DataPointInfluence {
  category: string;
  name: string;
  value: string | number;
  impact: 'high' | 'medium' | 'low';
  direction: 'bullish' | 'bearish' | 'neutral';
  explanation: string;
}

export interface AgentDecisionExplanation {
  agentName: string;
  agentType: string;
  finalSignal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  
  // Detailed breakdown
  indicatorContributions: IndicatorContribution[];
  patternContributions: PatternContribution[];
  dataPointInfluences: DataPointInfluence[];
  
  // Summary metrics
  bullishFactors: number;
  bearishFactors: number;
  neutralFactors: number;
  dominantFactor: string;
  
  // Decision tree path
  decisionPath: DecisionNode[];
  
  // Feature importance (SHAP-like)
  featureImportance: FeatureImportance[];
  
  // Counterfactual analysis
  counterfactuals: Counterfactual[];
  
  timestamp: number;
}

export interface DecisionNode {
  level: number;
  condition: string;
  result: boolean;
  impact: 'major' | 'minor';
  nextAction: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number; // 0-1
  direction: 'positive' | 'negative';
  category: 'technical' | 'fundamental' | 'sentiment' | 'risk' | 'regime' | 'execution';
}

export interface Counterfactual {
  scenario: string;
  changedFeature: string;
  originalValue: string | number;
  newValue: string | number;
  resultingSignal: 'buy' | 'sell' | 'hold';
  explanation: string;
}

export interface ConsensusExplanation {
  symbol: string;
  assetType: 'stock' | 'crypto';
  finalDecision: 'buy' | 'sell' | 'hold';
  overallConfidence: number;
  
  // Agent breakdown
  agentExplanations: AgentDecisionExplanation[];
  
  // Voting analysis
  votingBreakdown: {
    buyVotes: number;
    sellVotes: number;
    holdVotes: number;
    consensusMethod: 'majority' | 'supermajority' | 'unanimous' | 'weighted';
    consensusReached: boolean;
    dissenterAgents: string[];
  };
  
  // Key factors
  topBullishFactors: DataPointInfluence[];
  topBearishFactors: DataPointInfluence[];
  conflictingSignals: ConflictingSignal[];
  
  // Risk assessment
  riskFactors: RiskFactor[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
  
  // Confidence breakdown
  confidenceFactors: ConfidenceFactor[];
  
  timestamp: number;
}

export interface ConflictingSignal {
  agent1: string;
  agent1Signal: 'buy' | 'sell' | 'hold';
  agent2: string;
  agent2Signal: 'buy' | 'sell' | 'hold';
  conflictReason: string;
  resolution: string;
}

export interface RiskFactor {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'increases' | 'decreases';
  magnitude: number; // percentage points
  explanation: string;
}

/**
 * Technical Agent Explainer
 */
export function explainTechnicalAgent(
  candles: OHLCV[],
  currentPrice: number
): AgentDecisionExplanation {
  const indicators = calculateAllIndicators(candles);
  const patterns = detectCandlestickPatterns(candles);
  
  const indicatorContributions: IndicatorContribution[] = [];
  const patternContributions: PatternContribution[] = [];
  const dataPointInfluences: DataPointInfluence[] = [];
  const decisionPath: DecisionNode[] = [];
  const featureImportance: FeatureImportance[] = [];
  
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;
  
  // RSI Analysis
  if (indicators.rsi.length > 0) {
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    const rsiSignal = rsi < 30 ? 'bullish' : rsi > 70 ? 'bearish' : 'neutral';
    const rsiContribution = rsi < 30 ? 0.8 : rsi > 70 ? -0.8 : (50 - rsi) / 50;
    const rsiWeight = 0.15;
    
    indicatorContributions.push({
      name: 'RSI (14)',
      value: rsi,
      signal: rsiSignal,
      weight: rsiWeight,
      contribution: rsiContribution,
      explanation: rsi < 30 
        ? `RSI at ${rsi.toFixed(1)} indicates oversold conditions - potential buying opportunity`
        : rsi > 70 
        ? `RSI at ${rsi.toFixed(1)} indicates overbought conditions - potential selling pressure`
        : `RSI at ${rsi.toFixed(1)} is in neutral territory`,
      threshold: { bullish: 30, bearish: 70 }
    });
    
    if (rsiContribution > 0) bullishScore += rsiContribution * rsiWeight;
    else bearishScore += Math.abs(rsiContribution) * rsiWeight;
    totalWeight += rsiWeight;
    
    decisionPath.push({
      level: 1,
      condition: `RSI ${rsi < 30 ? '< 30' : rsi > 70 ? '> 70' : 'between 30-70'}`,
      result: rsi < 30 || rsi > 70,
      impact: rsi < 30 || rsi > 70 ? 'major' : 'minor',
      nextAction: rsiSignal === 'bullish' ? 'Consider buy' : rsiSignal === 'bearish' ? 'Consider sell' : 'Check other indicators'
    });
    
    featureImportance.push({
      feature: 'RSI',
      importance: 0.15,
      direction: rsiContribution > 0 ? 'positive' : 'negative',
      category: 'technical'
    });
  }
  
  // MACD Analysis
  if (indicators.macd.histogram.length > 0) {
    const histogram = indicators.macd.histogram[indicators.macd.histogram.length - 1];
    const prevHistogram = indicators.macd.histogram.length > 1 
      ? indicators.macd.histogram[indicators.macd.histogram.length - 2] 
      : 0;
    
    const macdSignal = histogram > 0 && histogram > prevHistogram ? 'bullish' 
      : histogram < 0 && histogram < prevHistogram ? 'bearish' 
      : 'neutral';
    const macdContribution = histogram > 0 ? Math.min(histogram / 5, 1) : Math.max(histogram / 5, -1);
    const macdWeight = 0.12;
    
    indicatorContributions.push({
      name: 'MACD Histogram',
      value: histogram,
      signal: macdSignal,
      weight: macdWeight,
      contribution: macdContribution,
      explanation: histogram > 0 && histogram > prevHistogram
        ? `MACD histogram positive and increasing - bullish momentum building`
        : histogram < 0 && histogram < prevHistogram
        ? `MACD histogram negative and decreasing - bearish momentum building`
        : `MACD histogram showing mixed signals`
    });
    
    if (macdContribution > 0) bullishScore += macdContribution * macdWeight;
    else bearishScore += Math.abs(macdContribution) * macdWeight;
    totalWeight += macdWeight;
    
    featureImportance.push({
      feature: 'MACD',
      importance: 0.12,
      direction: macdContribution > 0 ? 'positive' : 'negative',
      category: 'technical'
    });
  }
  
  // Bollinger Bands Analysis
  if (indicators.bollinger.upper.length > 0) {
    const upper = indicators.bollinger.upper[indicators.bollinger.upper.length - 1];
    const lower = indicators.bollinger.lower[indicators.bollinger.lower.length - 1];
    const middle = indicators.bollinger.middle[indicators.bollinger.middle.length - 1];
    
    const bbPosition = (currentPrice - lower) / (upper - lower);
    const bbSignal = bbPosition < 0.2 ? 'bullish' : bbPosition > 0.8 ? 'bearish' : 'neutral';
    const bbContribution = bbPosition < 0.2 ? 0.7 : bbPosition > 0.8 ? -0.7 : 0;
    const bbWeight = 0.10;
    
    indicatorContributions.push({
      name: 'Bollinger Bands',
      value: bbPosition,
      signal: bbSignal,
      weight: bbWeight,
      contribution: bbContribution,
      explanation: bbPosition < 0.2
        ? `Price near lower Bollinger Band - potential bounce opportunity`
        : bbPosition > 0.8
        ? `Price near upper Bollinger Band - potential resistance`
        : `Price within normal Bollinger Band range`
    });
    
    if (bbContribution > 0) bullishScore += bbContribution * bbWeight;
    else bearishScore += Math.abs(bbContribution) * bbWeight;
    totalWeight += bbWeight;
    
    featureImportance.push({
      feature: 'Bollinger Bands',
      importance: 0.10,
      direction: bbContribution > 0 ? 'positive' : 'negative',
      category: 'technical'
    });
  }
  
  // Stochastic Analysis
  if (indicators.stochastic.k.length > 0) {
    const k = indicators.stochastic.k[indicators.stochastic.k.length - 1];
    const d = indicators.stochastic.d[indicators.stochastic.d.length - 1];
    
    const stochSignal = k < 20 && k > d ? 'bullish' : k > 80 && k < d ? 'bearish' : 'neutral';
    const stochContribution = k < 20 ? 0.6 : k > 80 ? -0.6 : 0;
    const stochWeight = 0.08;
    
    indicatorContributions.push({
      name: 'Stochastic %K/%D',
      value: k,
      signal: stochSignal,
      weight: stochWeight,
      contribution: stochContribution,
      explanation: k < 20 && k > d
        ? `Stochastic oversold with bullish crossover - buy signal`
        : k > 80 && k < d
        ? `Stochastic overbought with bearish crossover - sell signal`
        : `Stochastic in neutral zone`
    });
    
    if (stochContribution > 0) bullishScore += stochContribution * stochWeight;
    else bearishScore += Math.abs(stochContribution) * stochWeight;
    totalWeight += stochWeight;
  }
  
  // EMA Trend Analysis
  if (indicators.ema.ema8 && indicators.ema.ema21) {
    const ema8 = indicators.ema.ema8[indicators.ema.ema8.length - 1];
    const ema21 = indicators.ema.ema21[indicators.ema.ema21.length - 1];
    
    const emaSignal = ema8 > ema21 ? 'bullish' : ema8 < ema21 ? 'bearish' : 'neutral';
    const emaContribution = (ema8 - ema21) / ema21 * 10; // Normalize
    const emaWeight = 0.15;
    
    indicatorContributions.push({
      name: 'EMA 8/21 Crossover',
      value: ema8 - ema21,
      signal: emaSignal,
      weight: emaWeight,
      contribution: Math.max(-1, Math.min(1, emaContribution)),
      explanation: ema8 > ema21
        ? `EMA 8 above EMA 21 - uptrend confirmed`
        : `EMA 8 below EMA 21 - downtrend confirmed`
    });
    
    if (emaContribution > 0) bullishScore += Math.min(1, emaContribution) * emaWeight;
    else bearishScore += Math.min(1, Math.abs(emaContribution)) * emaWeight;
    totalWeight += emaWeight;
    
    featureImportance.push({
      feature: 'EMA Crossover',
      importance: 0.15,
      direction: emaContribution > 0 ? 'positive' : 'negative',
      category: 'technical'
    });
  }
  
  // ATR Volatility Analysis
  if (indicators.atr.length > 0) {
    const atr = indicators.atr[indicators.atr.length - 1];
    const atrPercent = (atr / currentPrice) * 100;
    
    dataPointInfluences.push({
      category: 'Volatility',
      name: 'ATR',
      value: `${atrPercent.toFixed(2)}%`,
      impact: atrPercent > 5 ? 'high' : atrPercent > 2 ? 'medium' : 'low',
      direction: 'neutral',
      explanation: `Average True Range is ${atrPercent.toFixed(2)}% of price - ${atrPercent > 5 ? 'high volatility, use wider stops' : 'normal volatility'}`
    });
  }
  
  // Pattern Analysis
  for (const pattern of patterns) {
    // Convert reliability string to number
    const reliabilityValue = pattern.reliability === 'high' ? 0.9 
      : pattern.reliability === 'medium' ? 0.7 
      : 0.5;
    
    const patternContribution = pattern.type === 'bullish' 
      ? reliabilityValue 
      : pattern.type === 'bearish' 
      ? -reliabilityValue 
      : 0;
    
    patternContributions.push({
      name: pattern.name,
      type: pattern.type,
      reliability: reliabilityValue,
      contribution: patternContribution,
      explanation: `${pattern.name} pattern detected - ${pattern.type} signal with ${pattern.reliability} reliability`
    });
    
    if (patternContribution > 0) bullishScore += patternContribution * 0.05;
    else bearishScore += Math.abs(patternContribution) * 0.05;
  }
  
  // Calculate final signal
  const netScore = bullishScore - bearishScore;
  const normalizedScore = totalWeight > 0 ? netScore / totalWeight : 0;
  
  const finalSignal: 'buy' | 'sell' | 'hold' = 
    normalizedScore > 0.3 ? 'buy' : 
    normalizedScore < -0.3 ? 'sell' : 
    'hold';
  
  const confidence = Math.min(100, Math.abs(normalizedScore) * 100 + 50);
  
  // Generate counterfactuals
  const counterfactuals: Counterfactual[] = [];
  
  if (indicators.rsi.length > 0) {
    const currentRsi = indicators.rsi[indicators.rsi.length - 1];
    if (currentRsi > 30 && currentRsi < 70) {
      counterfactuals.push({
        scenario: 'If RSI were oversold',
        changedFeature: 'RSI',
        originalValue: currentRsi.toFixed(1),
        newValue: '25',
        resultingSignal: 'buy',
        explanation: 'A drop in RSI to oversold levels would trigger a stronger buy signal'
      });
    }
  }
  
  // Determine dominant factor
  const sortedIndicators = [...indicatorContributions].sort((a, b) => 
    Math.abs(b.contribution * b.weight) - Math.abs(a.contribution * a.weight)
  );
  const dominantFactor = sortedIndicators[0]?.name || 'None';
  
  return {
    agentName: 'Technical Analysis Agent',
    agentType: 'technical',
    finalSignal,
    confidence,
    reasoning: `Based on ${indicatorContributions.length} technical indicators and ${patternContributions.length} chart patterns, the technical outlook is ${finalSignal}. The dominant factor is ${dominantFactor}.`,
    indicatorContributions,
    patternContributions,
    dataPointInfluences,
    bullishFactors: indicatorContributions.filter(i => i.signal === 'bullish').length + patternContributions.filter(p => p.type === 'bullish').length,
    bearishFactors: indicatorContributions.filter(i => i.signal === 'bearish').length + patternContributions.filter(p => p.type === 'bearish').length,
    neutralFactors: indicatorContributions.filter(i => i.signal === 'neutral').length + patternContributions.filter(p => p.type === 'neutral').length,
    dominantFactor,
    decisionPath,
    featureImportance: featureImportance.sort((a, b) => b.importance - a.importance),
    counterfactuals,
    timestamp: Date.now()
  };
}

/**
 * Fundamental Agent Explainer
 */
export function explainFundamentalAgent(
  fundamentals: {
    pe?: number;
    forwardPe?: number;
    peg?: number;
    priceToBook?: number;
    priceToSales?: number;
    debtToEquity?: number;
    currentRatio?: number;
    roe?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    dividendYield?: number;
    freeCashFlow?: number;
    marketCap?: number;
  }
): AgentDecisionExplanation {
  const indicatorContributions: IndicatorContribution[] = [];
  const dataPointInfluences: DataPointInfluence[] = [];
  const decisionPath: DecisionNode[] = [];
  const featureImportance: FeatureImportance[] = [];
  
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;
  
  // P/E Ratio Analysis
  if (fundamentals.pe !== undefined) {
    const pe = fundamentals.pe;
    const peSignal = pe < 15 ? 'bullish' : pe > 30 ? 'bearish' : 'neutral';
    const peContribution = pe < 15 ? 0.7 : pe > 30 ? -0.5 : 0;
    const peWeight = 0.15;
    
    indicatorContributions.push({
      name: 'P/E Ratio',
      value: pe,
      signal: peSignal,
      weight: peWeight,
      contribution: peContribution,
      explanation: pe < 15
        ? `P/E of ${pe.toFixed(1)} suggests undervaluation relative to earnings`
        : pe > 30
        ? `P/E of ${pe.toFixed(1)} suggests premium valuation - may be overpriced`
        : `P/E of ${pe.toFixed(1)} is within normal range`,
      threshold: { bullish: 15, bearish: 30 }
    });
    
    if (peContribution > 0) bullishScore += peContribution * peWeight;
    else bearishScore += Math.abs(peContribution) * peWeight;
    totalWeight += peWeight;
    
    featureImportance.push({
      feature: 'P/E Ratio',
      importance: 0.15,
      direction: peContribution > 0 ? 'positive' : 'negative',
      category: 'fundamental'
    });
  }
  
  // PEG Ratio Analysis
  if (fundamentals.peg !== undefined) {
    const peg = fundamentals.peg;
    const pegSignal = peg < 1 ? 'bullish' : peg > 2 ? 'bearish' : 'neutral';
    const pegContribution = peg < 1 ? 0.8 : peg > 2 ? -0.6 : 0;
    const pegWeight = 0.12;
    
    indicatorContributions.push({
      name: 'PEG Ratio',
      value: peg,
      signal: pegSignal,
      weight: pegWeight,
      contribution: pegContribution,
      explanation: peg < 1
        ? `PEG of ${peg.toFixed(2)} indicates undervaluation relative to growth`
        : peg > 2
        ? `PEG of ${peg.toFixed(2)} suggests overvaluation relative to growth`
        : `PEG of ${peg.toFixed(2)} is fairly valued`,
      threshold: { bullish: 1, bearish: 2 }
    });
    
    if (pegContribution > 0) bullishScore += pegContribution * pegWeight;
    else bearishScore += Math.abs(pegContribution) * pegWeight;
    totalWeight += pegWeight;
  }
  
  // ROE Analysis
  if (fundamentals.roe !== undefined) {
    const roe = fundamentals.roe;
    const roeSignal = roe > 20 ? 'bullish' : roe < 10 ? 'bearish' : 'neutral';
    const roeContribution = roe > 20 ? 0.7 : roe < 10 ? -0.4 : 0;
    const roeWeight = 0.10;
    
    indicatorContributions.push({
      name: 'Return on Equity',
      value: roe,
      signal: roeSignal,
      weight: roeWeight,
      contribution: roeContribution,
      explanation: roe > 20
        ? `ROE of ${roe.toFixed(1)}% indicates excellent profitability`
        : roe < 10
        ? `ROE of ${roe.toFixed(1)}% suggests weak profitability`
        : `ROE of ${roe.toFixed(1)}% is average`,
      threshold: { bullish: 20, bearish: 10 }
    });
    
    if (roeContribution > 0) bullishScore += roeContribution * roeWeight;
    else bearishScore += Math.abs(roeContribution) * roeWeight;
    totalWeight += roeWeight;
    
    featureImportance.push({
      feature: 'ROE',
      importance: 0.10,
      direction: roeContribution > 0 ? 'positive' : 'negative',
      category: 'fundamental'
    });
  }
  
  // Revenue Growth Analysis
  if (fundamentals.revenueGrowth !== undefined) {
    const growth = fundamentals.revenueGrowth * 100;
    const growthSignal = growth > 20 ? 'bullish' : growth < 0 ? 'bearish' : 'neutral';
    const growthContribution = growth > 20 ? 0.8 : growth < 0 ? -0.6 : growth / 40;
    const growthWeight = 0.12;
    
    indicatorContributions.push({
      name: 'Revenue Growth',
      value: growth,
      signal: growthSignal,
      weight: growthWeight,
      contribution: Math.max(-1, Math.min(1, growthContribution)),
      explanation: growth > 20
        ? `Revenue growth of ${growth.toFixed(1)}% indicates strong business momentum`
        : growth < 0
        ? `Revenue decline of ${growth.toFixed(1)}% is concerning`
        : `Revenue growth of ${growth.toFixed(1)}% is moderate`,
      threshold: { bullish: 20, bearish: 0 }
    });
    
    if (growthContribution > 0) bullishScore += Math.min(1, growthContribution) * growthWeight;
    else bearishScore += Math.min(1, Math.abs(growthContribution)) * growthWeight;
    totalWeight += growthWeight;
  }
  
  // Debt Analysis
  if (fundamentals.debtToEquity !== undefined) {
    const dte = fundamentals.debtToEquity;
    
    dataPointInfluences.push({
      category: 'Financial Health',
      name: 'Debt to Equity',
      value: dte.toFixed(2),
      impact: dte > 2 ? 'high' : dte > 1 ? 'medium' : 'low',
      direction: dte > 2 ? 'bearish' : dte < 0.5 ? 'bullish' : 'neutral',
      explanation: dte > 2
        ? `High debt levels (D/E: ${dte.toFixed(2)}) increase financial risk`
        : dte < 0.5
        ? `Low debt (D/E: ${dte.toFixed(2)}) provides financial flexibility`
        : `Moderate debt levels (D/E: ${dte.toFixed(2)})`
    });
    
    if (dte > 2) bearishScore += 0.3 * 0.08;
    else if (dte < 0.5) bullishScore += 0.3 * 0.08;
    totalWeight += 0.08;
  }
  
  // Calculate final signal
  const netScore = bullishScore - bearishScore;
  const normalizedScore = totalWeight > 0 ? netScore / totalWeight : 0;
  
  const finalSignal: 'buy' | 'sell' | 'hold' = 
    normalizedScore > 0.25 ? 'buy' : 
    normalizedScore < -0.25 ? 'sell' : 
    'hold';
  
  const confidence = Math.min(100, Math.abs(normalizedScore) * 100 + 50);
  
  // Determine dominant factor
  const sortedIndicators = [...indicatorContributions].sort((a, b) => 
    Math.abs(b.contribution * b.weight) - Math.abs(a.contribution * a.weight)
  );
  const dominantFactor = sortedIndicators[0]?.name || 'None';
  
  return {
    agentName: 'Fundamental Analysis Agent',
    agentType: 'fundamental',
    finalSignal,
    confidence,
    reasoning: `Based on ${indicatorContributions.length} fundamental metrics, the valuation outlook is ${finalSignal}. Key driver: ${dominantFactor}.`,
    indicatorContributions,
    patternContributions: [],
    dataPointInfluences,
    bullishFactors: indicatorContributions.filter(i => i.signal === 'bullish').length,
    bearishFactors: indicatorContributions.filter(i => i.signal === 'bearish').length,
    neutralFactors: indicatorContributions.filter(i => i.signal === 'neutral').length,
    dominantFactor,
    decisionPath,
    featureImportance: featureImportance.sort((a, b) => b.importance - a.importance),
    counterfactuals: [],
    timestamp: Date.now()
  };
}

/**
 * Generate full consensus explanation
 */
export function generateConsensusExplanation(
  symbol: string,
  assetType: 'stock' | 'crypto',
  agentExplanations: AgentDecisionExplanation[],
  consensusMethod: 'majority' | 'supermajority' | 'unanimous' | 'weighted'
): ConsensusExplanation {
  // Count votes
  let buyVotes = 0;
  let sellVotes = 0;
  let holdVotes = 0;
  const dissenterAgents: string[] = [];
  
  for (const agent of agentExplanations) {
    if (agent.finalSignal === 'buy') buyVotes++;
    else if (agent.finalSignal === 'sell') sellVotes++;
    else holdVotes++;
  }
  
  // Determine final decision
  const totalVotes = agentExplanations.length;
  let finalDecision: 'buy' | 'sell' | 'hold' = 'hold';
  let consensusReached = false;
  
  switch (consensusMethod) {
    case 'majority':
      if (buyVotes > totalVotes / 2) {
        finalDecision = 'buy';
        consensusReached = true;
      } else if (sellVotes > totalVotes / 2) {
        finalDecision = 'sell';
        consensusReached = true;
      }
      break;
    case 'supermajority':
      if (buyVotes >= totalVotes * 0.67) {
        finalDecision = 'buy';
        consensusReached = true;
      } else if (sellVotes >= totalVotes * 0.67) {
        finalDecision = 'sell';
        consensusReached = true;
      }
      break;
    case 'unanimous':
      if (buyVotes === totalVotes) {
        finalDecision = 'buy';
        consensusReached = true;
      } else if (sellVotes === totalVotes) {
        finalDecision = 'sell';
        consensusReached = true;
      }
      break;
    case 'weighted':
      const weightedBuy = agentExplanations
        .filter(a => a.finalSignal === 'buy')
        .reduce((sum, a) => sum + a.confidence, 0);
      const weightedSell = agentExplanations
        .filter(a => a.finalSignal === 'sell')
        .reduce((sum, a) => sum + a.confidence, 0);
      
      if (weightedBuy > weightedSell * 1.2) {
        finalDecision = 'buy';
        consensusReached = true;
      } else if (weightedSell > weightedBuy * 1.2) {
        finalDecision = 'sell';
        consensusReached = true;
      }
      break;
  }
  
  // Find dissenters
  for (const agent of agentExplanations) {
    if (agent.finalSignal !== finalDecision && finalDecision !== 'hold') {
      dissenterAgents.push(agent.agentName);
    }
  }
  
  // Calculate overall confidence
  const overallConfidence = agentExplanations.reduce((sum, a) => sum + a.confidence, 0) / agentExplanations.length;
  
  // Collect top factors
  const allBullishInfluences: DataPointInfluence[] = [];
  const allBearishInfluences: DataPointInfluence[] = [];
  
  for (const agent of agentExplanations) {
    for (const influence of agent.dataPointInfluences) {
      if (influence.direction === 'bullish') allBullishInfluences.push(influence);
      else if (influence.direction === 'bearish') allBearishInfluences.push(influence);
    }
  }
  
  // Find conflicting signals
  const conflictingSignals: ConflictingSignal[] = [];
  for (let i = 0; i < agentExplanations.length; i++) {
    for (let j = i + 1; j < agentExplanations.length; j++) {
      const agent1 = agentExplanations[i];
      const agent2 = agentExplanations[j];
      
      if ((agent1.finalSignal === 'buy' && agent2.finalSignal === 'sell') ||
          (agent1.finalSignal === 'sell' && agent2.finalSignal === 'buy')) {
        conflictingSignals.push({
          agent1: agent1.agentName,
          agent1Signal: agent1.finalSignal,
          agent2: agent2.agentName,
          agent2Signal: agent2.finalSignal,
          conflictReason: `${agent1.agentName} sees ${agent1.dominantFactor} while ${agent2.agentName} focuses on ${agent2.dominantFactor}`,
          resolution: `Resolved by ${consensusMethod} voting - ${finalDecision}`
        });
      }
    }
  }
  
  // Risk assessment
  const riskFactors: RiskFactor[] = [];
  if (conflictingSignals.length > 2) {
    riskFactors.push({
      name: 'High Agent Disagreement',
      severity: 'high',
      description: `${conflictingSignals.length} conflicting signals among agents`,
      mitigation: 'Consider smaller position size or wait for clearer consensus'
    });
  }
  
  if (overallConfidence < 60) {
    riskFactors.push({
      name: 'Low Confidence',
      severity: 'medium',
      description: `Overall confidence is only ${overallConfidence.toFixed(0)}%`,
      mitigation: 'Wait for stronger signals or use paper trading first'
    });
  }
  
  const overallRiskLevel = riskFactors.filter(r => r.severity === 'critical').length > 0 ? 'extreme'
    : riskFactors.filter(r => r.severity === 'high').length > 0 ? 'high'
    : riskFactors.filter(r => r.severity === 'medium').length > 0 ? 'medium'
    : 'low';
  
  // Confidence factors
  const confidenceFactors: ConfidenceFactor[] = [];
  if (consensusReached) {
    confidenceFactors.push({
      factor: 'Consensus Reached',
      impact: 'increases',
      magnitude: 10,
      explanation: `All agents reached ${consensusMethod} consensus`
    });
  }
  
  if (dissenterAgents.length === 0) {
    confidenceFactors.push({
      factor: 'No Dissenters',
      impact: 'increases',
      magnitude: 15,
      explanation: 'All agents agree on the direction'
    });
  }
  
  return {
    symbol,
    assetType,
    finalDecision,
    overallConfidence,
    agentExplanations,
    votingBreakdown: {
      buyVotes,
      sellVotes,
      holdVotes,
      consensusMethod,
      consensusReached,
      dissenterAgents
    },
    topBullishFactors: allBullishInfluences.slice(0, 5),
    topBearishFactors: allBearishInfluences.slice(0, 5),
    conflictingSignals,
    riskFactors,
    overallRiskLevel,
    confidenceFactors,
    timestamp: Date.now()
  };
}

export default {
  explainTechnicalAgent,
  explainFundamentalAgent,
  generateConsensusExplanation
};
