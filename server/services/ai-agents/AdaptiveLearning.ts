/**
 * Adaptive Learning Engine
 * 
 * Adjusts agent weights based on historical prediction accuracy,
 * allowing the system to learn which agents perform best in different market conditions.
 * 
 * Based on research from:
 * - "Online Learning for Portfolio Selection" (2023)
 * - "Adaptive Ensemble Methods for Financial Forecasting" (2024)
 * - "Meta-Learning for Algorithmic Trading" (2023)
 */

import { getDb } from '../../db';

// Types
export interface AgentPerformance {
  agentType: string;
  agentName: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  profitablePredictions: number;
  profitabilityRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface MarketRegime {
  type: 'bull' | 'bear' | 'sideways' | 'volatile' | 'calm';
  confidence: number;
  indicators: {
    trendStrength: number;
    volatility: number;
    momentum: number;
    volume: number;
  };
}

export interface AgentWeight {
  agentType: string;
  baseWeight: number;
  adjustedWeight: number;
  regimeModifier: number;
  performanceModifier: number;
  recencyModifier: number;
  confidenceScore: number;
}

export interface LearningConfig {
  learningRate: number;
  decayFactor: number;
  minWeight: number;
  maxWeight: number;
  lookbackPeriod: number; // days
  regimeAdaptation: boolean;
  performanceWindow: number; // number of predictions to consider
}

export interface PredictionRecord {
  id: string;
  agentType: string;
  symbol: string;
  prediction: 'buy' | 'sell' | 'hold';
  confidence: number;
  actualOutcome: 'profit' | 'loss' | 'neutral';
  returnPercent: number;
  marketRegime: MarketRegime['type'];
  timestamp: number;
}

export interface WeightUpdateResult {
  previousWeights: Record<string, number>;
  newWeights: Record<string, number>;
  changes: Array<{
    agentType: string;
    previousWeight: number;
    newWeight: number;
    changePercent: number;
    reason: string;
  }>;
  marketRegime: MarketRegime;
  timestamp: number;
}

// Default configuration
const DEFAULT_CONFIG: LearningConfig = {
  learningRate: 0.1,
  decayFactor: 0.95,
  minWeight: 0.05,
  maxWeight: 0.35,
  lookbackPeriod: 30,
  regimeAdaptation: true,
  performanceWindow: 50,
};

// Base weights for each agent type
const BASE_WEIGHTS: Record<string, number> = {
  technical: 0.20,
  fundamental: 0.18,
  sentiment: 0.12,
  risk: 0.15,
  regime: 0.12,
  execution: 0.08,
  coordinator: 0.15,
};

// Regime-specific weight modifiers
const REGIME_MODIFIERS: Record<MarketRegime['type'], Record<string, number>> = {
  bull: {
    technical: 1.2,
    fundamental: 1.1,
    sentiment: 1.3,
    risk: 0.8,
    regime: 1.0,
    execution: 1.0,
    coordinator: 1.0,
  },
  bear: {
    technical: 1.1,
    fundamental: 1.2,
    sentiment: 0.9,
    risk: 1.4,
    regime: 1.2,
    execution: 1.0,
    coordinator: 1.1,
  },
  sideways: {
    technical: 1.3,
    fundamental: 1.0,
    sentiment: 0.8,
    risk: 1.1,
    regime: 1.0,
    execution: 1.2,
    coordinator: 1.0,
  },
  volatile: {
    technical: 0.9,
    fundamental: 0.8,
    sentiment: 0.7,
    risk: 1.5,
    regime: 1.3,
    execution: 1.1,
    coordinator: 1.2,
  },
  calm: {
    technical: 1.1,
    fundamental: 1.2,
    sentiment: 1.1,
    risk: 0.9,
    regime: 0.9,
    execution: 1.0,
    coordinator: 1.0,
  },
};

/**
 * Calculate agent performance metrics from prediction history
 */
export function calculateAgentPerformance(
  predictions: PredictionRecord[],
  agentType: string
): AgentPerformance {
  const agentPredictions = predictions.filter(p => p.agentType === agentType);
  
  if (agentPredictions.length === 0) {
    return {
      agentType,
      agentName: getAgentName(agentType),
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      profitablePredictions: 0,
      profitabilityRate: 0,
      averageReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
    };
  }
  
  const totalPredictions = agentPredictions.length;
  
  // Calculate correct predictions (prediction matched outcome direction)
  const correctPredictions = agentPredictions.filter(p => {
    if (p.prediction === 'buy' && p.actualOutcome === 'profit') return true;
    if (p.prediction === 'sell' && p.actualOutcome === 'profit') return true;
    if (p.prediction === 'hold' && p.actualOutcome === 'neutral') return true;
    return false;
  }).length;
  
  const accuracy = correctPredictions / totalPredictions;
  
  // Calculate profitability
  const profitablePredictions = agentPredictions.filter(p => p.actualOutcome === 'profit').length;
  const profitabilityRate = profitablePredictions / totalPredictions;
  
  // Calculate returns
  const returns = agentPredictions.map(p => p.returnPercent);
  const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  
  // Calculate Sharpe ratio (simplified)
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length
  );
  const sharpeRatio = returnStdDev > 0 ? (averageReturn * Math.sqrt(252)) / returnStdDev : 0;
  
  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let cumReturn = 0;
  for (const r of returns) {
    cumReturn += r;
    if (cumReturn > peak) peak = cumReturn;
    const drawdown = peak - cumReturn;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Win/loss metrics
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const winRate = wins.length / returns.length;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : avgWin > 0 ? Infinity : 0;
  
  return {
    agentType,
    agentName: getAgentName(agentType),
    totalPredictions,
    correctPredictions,
    accuracy,
    profitablePredictions,
    profitabilityRate,
    averageReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
  };
}

/**
 * Detect current market regime
 */
export function detectMarketRegime(
  priceData: { close: number; volume: number }[],
  volatilityData: number[]
): MarketRegime {
  if (priceData.length < 20) {
    return {
      type: 'sideways',
      confidence: 0.5,
      indicators: { trendStrength: 0, volatility: 0, momentum: 0, volume: 0 },
    };
  }
  
  // Calculate trend strength
  const recentPrices = priceData.slice(-20).map(p => p.close);
  const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
  const trendStrength = Math.abs(priceChange);
  
  // Calculate volatility
  const avgVolatility = volatilityData.length > 0 
    ? volatilityData.reduce((a, b) => a + b, 0) / volatilityData.length 
    : 0;
  
  // Calculate momentum
  const shortMA = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const longMA = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const momentum = (shortMA - longMA) / longMA;
  
  // Calculate volume trend
  const recentVolumes = priceData.slice(-20).map(p => p.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const recentAvgVolume = recentVolumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volumeTrend = avgVolume > 0 ? (recentAvgVolume - avgVolume) / avgVolume : 0;
  
  // Determine regime
  let regimeType: MarketRegime['type'];
  let confidence: number;
  
  if (avgVolatility > 0.03) {
    regimeType = 'volatile';
    confidence = Math.min(0.9, 0.5 + avgVolatility * 10);
  } else if (avgVolatility < 0.01) {
    regimeType = 'calm';
    confidence = Math.min(0.9, 0.5 + (0.01 - avgVolatility) * 50);
  } else if (priceChange > 0.05 && momentum > 0) {
    regimeType = 'bull';
    confidence = Math.min(0.9, 0.5 + priceChange * 5);
  } else if (priceChange < -0.05 && momentum < 0) {
    regimeType = 'bear';
    confidence = Math.min(0.9, 0.5 + Math.abs(priceChange) * 5);
  } else {
    regimeType = 'sideways';
    confidence = Math.min(0.9, 0.5 + (1 - trendStrength) * 0.5);
  }
  
  return {
    type: regimeType,
    confidence,
    indicators: {
      trendStrength,
      volatility: avgVolatility,
      momentum,
      volume: volumeTrend,
    },
  };
}

/**
 * Calculate adjusted weights based on performance and market regime
 */
export function calculateAdjustedWeights(
  performances: AgentPerformance[],
  currentRegime: MarketRegime,
  config: LearningConfig = DEFAULT_CONFIG
): AgentWeight[] {
  const weights: AgentWeight[] = [];
  
  for (const agentType of Object.keys(BASE_WEIGHTS)) {
    const baseWeight = BASE_WEIGHTS[agentType];
    const performance = performances.find(p => p.agentType === agentType);
    const regimeModifier = config.regimeAdaptation 
      ? REGIME_MODIFIERS[currentRegime.type][agentType] || 1.0
      : 1.0;
    
    // Calculate performance modifier
    let performanceModifier = 1.0;
    if (performance && performance.totalPredictions >= 10) {
      // Combine accuracy, profitability, and Sharpe ratio
      const accuracyScore = performance.accuracy * 2; // 0-2 range
      const profitScore = performance.profitabilityRate * 2; // 0-2 range
      const sharpeScore = Math.min(2, Math.max(0, performance.sharpeRatio / 2)); // 0-2 range
      
      performanceModifier = (accuracyScore + profitScore + sharpeScore) / 3;
    }
    
    // Calculate recency modifier (more weight to recent performance)
    const recencyModifier = 1.0; // Could be enhanced with time-weighted calculations
    
    // Calculate adjusted weight
    let adjustedWeight = baseWeight * regimeModifier * performanceModifier * recencyModifier;
    
    // Apply learning rate for gradual adjustment
    adjustedWeight = baseWeight + (adjustedWeight - baseWeight) * config.learningRate;
    
    // Clamp to min/max bounds
    adjustedWeight = Math.max(config.minWeight, Math.min(config.maxWeight, adjustedWeight));
    
    // Calculate confidence score
    const confidenceScore = performance 
      ? Math.min(1, performance.totalPredictions / config.performanceWindow)
      : 0;
    
    weights.push({
      agentType,
      baseWeight,
      adjustedWeight,
      regimeModifier,
      performanceModifier,
      recencyModifier,
      confidenceScore,
    });
  }
  
  // Normalize weights to sum to 1
  const totalWeight = weights.reduce((sum, w) => sum + w.adjustedWeight, 0);
  for (const weight of weights) {
    weight.adjustedWeight = weight.adjustedWeight / totalWeight;
  }
  
  return weights;
}

/**
 * Update weights based on new prediction outcomes
 */
export function updateWeights(
  currentWeights: Record<string, number>,
  newPredictions: PredictionRecord[],
  currentRegime: MarketRegime,
  config: LearningConfig = DEFAULT_CONFIG
): WeightUpdateResult {
  const previousWeights = { ...currentWeights };
  const newWeights: Record<string, number> = {};
  const changes: WeightUpdateResult['changes'] = [];
  
  // Calculate performance for each agent
  const performances: AgentPerformance[] = [];
  for (const agentType of Object.keys(BASE_WEIGHTS)) {
    const performance = calculateAgentPerformance(newPredictions, agentType);
    performances.push(performance);
  }
  
  // Calculate new adjusted weights
  const adjustedWeights = calculateAdjustedWeights(performances, currentRegime, config);
  
  // Apply decay to move towards adjusted weights
  for (const weight of adjustedWeights) {
    const currentWeight = currentWeights[weight.agentType] || weight.baseWeight;
    const targetWeight = weight.adjustedWeight;
    
    // Gradual adjustment with decay
    const newWeight = currentWeight + (targetWeight - currentWeight) * config.learningRate;
    newWeights[weight.agentType] = newWeight;
    
    const changePercent = ((newWeight - currentWeight) / currentWeight) * 100;
    
    let reason = '';
    if (changePercent > 5) {
      reason = `Strong performance in ${currentRegime.type} market`;
    } else if (changePercent < -5) {
      reason = `Underperformance in ${currentRegime.type} market`;
    } else if (Math.abs(changePercent) > 1) {
      reason = `Minor adjustment based on recent predictions`;
    } else {
      reason = 'Stable performance';
    }
    
    changes.push({
      agentType: weight.agentType,
      previousWeight: currentWeight,
      newWeight,
      changePercent,
      reason,
    });
  }
  
  // Normalize new weights
  const totalWeight = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
  for (const agentType of Object.keys(newWeights)) {
    newWeights[agentType] = newWeights[agentType] / totalWeight;
  }
  
  return {
    previousWeights,
    newWeights,
    changes,
    marketRegime: currentRegime,
    timestamp: Date.now(),
  };
}

/**
 * Get agent name from type
 */
function getAgentName(agentType: string): string {
  const names: Record<string, string> = {
    technical: 'Technical Analysis Agent',
    fundamental: 'Fundamental Analysis Agent',
    sentiment: 'Sentiment Analysis Agent',
    risk: 'Risk Management Agent',
    regime: 'Regime Detection Agent',
    execution: 'Execution Optimization Agent',
    coordinator: 'Coordinator Agent',
  };
  return names[agentType] || agentType;
}

/**
 * Get current agent weights (from database or defaults)
 */
export async function getCurrentWeights(): Promise<Record<string, number>> {
  // In a real implementation, this would fetch from database
  // For now, return base weights
  return { ...BASE_WEIGHTS };
}

/**
 * Save updated weights to database
 */
export async function saveWeights(weights: Record<string, number>): Promise<void> {
  // In a real implementation, this would save to database
  console.log('[AdaptiveLearning] Saving weights:', weights);
}

/**
 * Get learning statistics
 */
export function getLearningStatistics(
  predictions: PredictionRecord[],
  weights: AgentWeight[]
): {
  totalPredictions: number;
  overallAccuracy: number;
  bestPerformingAgent: string;
  worstPerformingAgent: string;
  regimeDistribution: Record<MarketRegime['type'], number>;
  weightHistory: Array<{ timestamp: number; weights: Record<string, number> }>;
} {
  const totalPredictions = predictions.length;
  
  // Calculate overall accuracy
  const correctPredictions = predictions.filter(p => {
    if (p.prediction === 'buy' && p.actualOutcome === 'profit') return true;
    if (p.prediction === 'sell' && p.actualOutcome === 'profit') return true;
    if (p.prediction === 'hold' && p.actualOutcome === 'neutral') return true;
    return false;
  }).length;
  const overallAccuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  
  // Find best and worst performing agents
  const sortedWeights = [...weights].sort((a, b) => b.adjustedWeight - a.adjustedWeight);
  const bestPerformingAgent = sortedWeights[0]?.agentType || 'unknown';
  const worstPerformingAgent = sortedWeights[sortedWeights.length - 1]?.agentType || 'unknown';
  
  // Calculate regime distribution
  const regimeDistribution: Record<MarketRegime['type'], number> = {
    bull: 0,
    bear: 0,
    sideways: 0,
    volatile: 0,
    calm: 0,
  };
  for (const p of predictions) {
    if (p.marketRegime in regimeDistribution) {
      regimeDistribution[p.marketRegime]++;
    }
  }
  
  return {
    totalPredictions,
    overallAccuracy,
    bestPerformingAgent,
    worstPerformingAgent,
    regimeDistribution,
    weightHistory: [], // Would be populated from database
  };
}

export default {
  calculateAgentPerformance,
  detectMarketRegime,
  calculateAdjustedWeights,
  updateWeights,
  getCurrentWeights,
  saveWeights,
  getLearningStatistics,
};
