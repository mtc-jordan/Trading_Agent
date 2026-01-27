/**
 * Reinforcement Learning Strategy Optimizer
 * 
 * Implements PPO (Proximal Policy Optimization) inspired adaptive strategy
 * optimization for real-time trading decisions:
 * - Learns from market feedback to optimize strategies
 * - Adapts to changing market conditions
 * - Minimizes drawdowns during volatile periods
 * 
 * Based on 2026 best practices for RL in trading
 */

import { invokeLLM } from '../_core/llm';

// ============================================
// Types for RL Strategy Optimizer
// ============================================

export interface MarketState {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume: number;
  volumeChange24h: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  momentum: number; // -1 to 1
  rsi: number;
  macdSignal: 'buy' | 'sell' | 'neutral';
  supportLevel: number;
  resistanceLevel: number;
  marketRegime: 'trending' | 'ranging' | 'volatile' | 'calm';
}

export interface PortfolioState {
  totalValue: number;
  cashBalance: number;
  positions: {
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    unrealizedPnL: number;
    weight: number;
  }[];
  dayPnL: number;
  weekPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  currentDrawdown: number;
}

export interface RiskProfile {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number; // % of portfolio
  maxDrawdownLimit: number; // %
  targetSharpe: number;
  preferredHoldingPeriod: 'intraday' | 'swing' | 'position';
}

export interface TradingAction {
  action: 'buy' | 'sell' | 'hold' | 'reduce' | 'increase';
  symbol: string;
  quantity?: number;
  positionSizePercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  reasoning: string;
}

export interface StrategyState {
  strategyId: string;
  name: string;
  parameters: Record<string, number>;
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    tradesCount: number;
  };
  adaptiveWeights: Record<string, number>;
  lastUpdated: number;
}

export interface RLOptimizationResult {
  recommendedAction: TradingAction;
  alternativeActions: TradingAction[];
  strategyAdjustments: {
    parameter: string;
    currentValue: number;
    suggestedValue: number;
    reason: string;
  }[];
  riskAssessment: {
    currentRisk: number;
    projectedRisk: number;
    riskFactors: string[];
    mitigationSuggestions: string[];
  };
  confidenceScore: number;
  modelExplanation: string;
  timestamp: number;
}

// ============================================
// PPO-Inspired Policy Network (Simulated)
// ============================================

class PolicyNetwork {
  private weights: Record<string, number>;
  private learningRate: number;
  private clipEpsilon: number;

  constructor() {
    // Initialize policy weights
    this.weights = {
      momentum: 0.3,
      trend: 0.25,
      volatility: -0.2,
      rsi_oversold: 0.15,
      rsi_overbought: -0.15,
      volume_surge: 0.1,
      support_proximity: 0.2,
      resistance_proximity: -0.15,
      drawdown_penalty: -0.4,
      sharpe_bonus: 0.2
    };
    this.learningRate = 0.01;
    this.clipEpsilon = 0.2;
  }

  // Calculate action probabilities based on state
  calculateActionProbabilities(
    marketState: MarketState,
    portfolioState: PortfolioState,
    riskProfile: RiskProfile
  ): Record<string, number> {
    const features = this.extractFeatures(marketState, portfolioState, riskProfile);
    
    // Calculate raw scores
    let buyScore = 0;
    let sellScore = 0;
    let holdScore = 0.3; // Base hold bias

    // Momentum factor
    buyScore += features.momentum > 0 ? features.momentum * this.weights.momentum : 0;
    sellScore += features.momentum < 0 ? Math.abs(features.momentum) * this.weights.momentum : 0;

    // Trend factor
    if (marketState.trend === 'bullish') buyScore += this.weights.trend;
    else if (marketState.trend === 'bearish') sellScore += this.weights.trend;
    else holdScore += this.weights.trend * 0.5;

    // RSI factor
    if (marketState.rsi < 30) buyScore += this.weights.rsi_oversold;
    else if (marketState.rsi > 70) sellScore += Math.abs(this.weights.rsi_overbought);

    // Volatility factor (reduce activity in high volatility)
    if (marketState.volatility > 0.3) {
      buyScore += this.weights.volatility;
      sellScore += this.weights.volatility * 0.5;
      holdScore += Math.abs(this.weights.volatility);
    }

    // Support/Resistance proximity
    const priceRange = marketState.resistanceLevel - marketState.supportLevel;
    const supportDist = (marketState.price - marketState.supportLevel) / priceRange;
    const resistanceDist = (marketState.resistanceLevel - marketState.price) / priceRange;

    if (supportDist < 0.2) buyScore += this.weights.support_proximity;
    if (resistanceDist < 0.2) sellScore += Math.abs(this.weights.resistance_proximity);

    // Drawdown penalty
    if (portfolioState.currentDrawdown > riskProfile.maxDrawdownLimit * 0.5) {
      sellScore += Math.abs(this.weights.drawdown_penalty) * (portfolioState.currentDrawdown / riskProfile.maxDrawdownLimit);
      buyScore *= 0.5;
    }

    // Risk adjustment
    const riskMultiplier = riskProfile.riskTolerance === 'conservative' ? 0.7 :
      riskProfile.riskTolerance === 'aggressive' ? 1.3 : 1.0;
    
    buyScore *= riskMultiplier;

    // Normalize to probabilities
    const total = Math.max(0.01, buyScore + sellScore + holdScore);
    return {
      buy: Math.max(0, buyScore / total),
      sell: Math.max(0, sellScore / total),
      hold: Math.max(0, holdScore / total)
    };
  }

  private extractFeatures(
    marketState: MarketState,
    portfolioState: PortfolioState,
    riskProfile: RiskProfile
  ): Record<string, number> {
    return {
      momentum: marketState.momentum,
      volatility: marketState.volatility,
      rsi_normalized: (marketState.rsi - 50) / 50,
      volume_change: marketState.volumeChange24h / 100,
      price_change: marketState.priceChange24h / 100,
      drawdown: portfolioState.currentDrawdown,
      sharpe: portfolioState.sharpeRatio,
      position_weight: this.getPositionWeight(marketState.symbol, portfolioState),
      risk_tolerance: riskProfile.riskTolerance === 'conservative' ? 0.3 :
        riskProfile.riskTolerance === 'aggressive' ? 0.9 : 0.6
    };
  }

  private getPositionWeight(symbol: string, portfolioState: PortfolioState): number {
    const position = portfolioState.positions.find(p => p.symbol === symbol);
    return position ? position.weight : 0;
  }

  // PPO-style policy update (simplified)
  updatePolicy(
    reward: number,
    oldProbabilities: Record<string, number>,
    newProbabilities: Record<string, number>,
    action: string
  ): void {
    const oldProb = oldProbabilities[action] || 0.01;
    const newProb = newProbabilities[action] || 0.01;
    
    // Calculate probability ratio
    const ratio = newProb / oldProb;
    
    // Clip ratio for stability (PPO clipping)
    const clippedRatio = Math.max(
      1 - this.clipEpsilon,
      Math.min(1 + this.clipEpsilon, ratio)
    );
    
    // Calculate advantage (simplified)
    const advantage = reward;
    
    // Calculate surrogate loss
    const surrogateUnclipped = ratio * advantage;
    const surrogateClipped = clippedRatio * advantage;
    
    // Take minimum (pessimistic bound)
    const loss = -Math.min(surrogateUnclipped, surrogateClipped);
    
    // Update weights based on action
    this.updateWeightsFromLoss(loss, action);
  }

  private updateWeightsFromLoss(loss: number, action: string): void {
    const gradient = loss * this.learningRate;
    
    // Update relevant weights based on action
    if (action === 'buy') {
      this.weights.momentum += gradient * 0.1;
      this.weights.trend += gradient * 0.1;
      this.weights.rsi_oversold += gradient * 0.05;
    } else if (action === 'sell') {
      this.weights.drawdown_penalty -= gradient * 0.1;
      this.weights.rsi_overbought -= gradient * 0.05;
    }
    
    // Normalize weights
    this.normalizeWeights();
  }

  private normalizeWeights(): void {
    const maxWeight = 0.5;
    for (const key of Object.keys(this.weights)) {
      this.weights[key] = Math.max(-maxWeight, Math.min(maxWeight, this.weights[key]));
    }
  }

  getWeights(): Record<string, number> {
    return { ...this.weights };
  }
}

// ============================================
// Value Network (Simulated)
// ============================================

class ValueNetwork {
  // Estimate state value for advantage calculation
  estimateValue(
    marketState: MarketState,
    portfolioState: PortfolioState
  ): number {
    let value = 0;

    // Base value from portfolio performance
    value += portfolioState.sharpeRatio * 0.3;
    value -= portfolioState.currentDrawdown * 0.4;
    value += (portfolioState.weekPnL / portfolioState.totalValue) * 0.2;

    // Market condition adjustment
    if (marketState.trend === 'bullish' && marketState.momentum > 0.3) {
      value += 0.15;
    } else if (marketState.trend === 'bearish' && marketState.momentum < -0.3) {
      value -= 0.15;
    }

    // Volatility adjustment
    if (marketState.volatility > 0.4) {
      value -= 0.1; // High volatility reduces expected value
    }

    return Math.max(-1, Math.min(1, value));
  }
}

// ============================================
// Reinforcement Learning Strategy Optimizer
// ============================================

export class RLStrategyOptimizer {
  private policyNetwork: PolicyNetwork;
  private valueNetwork: ValueNetwork;
  private experienceBuffer: Array<{
    state: { market: MarketState; portfolio: PortfolioState };
    action: string;
    reward: number;
    timestamp: number;
  }>;
  private maxBufferSize: number;

  constructor() {
    this.policyNetwork = new PolicyNetwork();
    this.valueNetwork = new ValueNetwork();
    this.experienceBuffer = [];
    this.maxBufferSize = 1000;
  }

  async optimize(
    marketState: MarketState,
    portfolioState: PortfolioState,
    riskProfile: RiskProfile,
    currentStrategy?: StrategyState
  ): Promise<RLOptimizationResult> {
    // Get action probabilities from policy network
    const actionProbs = this.policyNetwork.calculateActionProbabilities(
      marketState,
      portfolioState,
      riskProfile
    );

    // Estimate state value
    const stateValue = this.valueNetwork.estimateValue(marketState, portfolioState);

    // Determine best action
    const bestAction = this.selectAction(actionProbs);

    // Generate trading action details
    const recommendedAction = await this.generateTradingAction(
      bestAction,
      marketState,
      portfolioState,
      riskProfile,
      actionProbs[bestAction]
    );

    // Generate alternative actions
    const alternativeActions = await this.generateAlternativeActions(
      bestAction,
      actionProbs,
      marketState,
      portfolioState,
      riskProfile
    );

    // Generate strategy adjustments
    const strategyAdjustments = this.generateStrategyAdjustments(
      marketState,
      portfolioState,
      currentStrategy
    );

    // Assess risk
    const riskAssessment = this.assessRisk(
      recommendedAction,
      marketState,
      portfolioState,
      riskProfile
    );

    // Generate model explanation
    const modelExplanation = await this.generateExplanation(
      recommendedAction,
      actionProbs,
      stateValue,
      marketState
    );

    return {
      recommendedAction,
      alternativeActions,
      strategyAdjustments,
      riskAssessment,
      confidenceScore: actionProbs[bestAction] * 100,
      modelExplanation,
      timestamp: Date.now()
    };
  }

  private selectAction(probabilities: Record<string, number>): string {
    // Select action with highest probability (greedy)
    let maxProb = 0;
    let bestAction = 'hold';

    for (const [action, prob] of Object.entries(probabilities)) {
      if (prob > maxProb) {
        maxProb = prob;
        bestAction = action;
      }
    }

    return bestAction;
  }

  private async generateTradingAction(
    action: string,
    marketState: MarketState,
    portfolioState: PortfolioState,
    riskProfile: RiskProfile,
    confidence: number
  ): Promise<TradingAction> {
    // Calculate position size based on Kelly Criterion and risk profile
    const positionSize = this.calculatePositionSize(
      confidence,
      marketState.volatility,
      riskProfile
    );

    // Calculate stop loss and take profit levels
    const { stopLoss, takeProfit } = this.calculateExitLevels(
      marketState,
      action,
      riskProfile
    );

    // Generate reasoning
    const reasoning = await this.generateActionReasoning(
      action,
      marketState,
      portfolioState,
      confidence
    );

    return {
      action: action as TradingAction['action'],
      symbol: marketState.symbol,
      positionSizePercent: positionSize,
      stopLoss,
      takeProfit,
      confidence: confidence * 100,
      reasoning
    };
  }

  private calculatePositionSize(
    confidence: number,
    volatility: number,
    riskProfile: RiskProfile
  ): number {
    // Kelly Criterion inspired position sizing
    const kellyFraction = confidence - (1 - confidence);
    
    // Adjust for volatility
    const volatilityAdjustment = 1 - Math.min(0.5, volatility);
    
    // Adjust for risk tolerance
    const riskMultiplier = riskProfile.riskTolerance === 'conservative' ? 0.5 :
      riskProfile.riskTolerance === 'aggressive' ? 1.5 : 1.0;
    
    // Calculate final position size
    let positionSize = kellyFraction * volatilityAdjustment * riskMultiplier * 100;
    
    // Cap at max position size
    positionSize = Math.min(positionSize, riskProfile.maxPositionSize);
    positionSize = Math.max(0, positionSize);
    
    return Math.round(positionSize * 10) / 10;
  }

  private calculateExitLevels(
    marketState: MarketState,
    action: string,
    riskProfile: RiskProfile
  ): { stopLoss: number; takeProfit: number } {
    const atr = marketState.volatility * marketState.price; // Simplified ATR
    
    // Risk multiplier based on profile
    const riskMult = riskProfile.riskTolerance === 'conservative' ? 1.5 :
      riskProfile.riskTolerance === 'aggressive' ? 2.5 : 2.0;
    
    if (action === 'buy') {
      return {
        stopLoss: marketState.price - (atr * riskMult),
        takeProfit: marketState.price + (atr * riskMult * 2)
      };
    } else if (action === 'sell') {
      return {
        stopLoss: marketState.price + (atr * riskMult),
        takeProfit: marketState.price - (atr * riskMult * 2)
      };
    }
    
    return { stopLoss: 0, takeProfit: 0 };
  }

  private async generateActionReasoning(
    action: string,
    marketState: MarketState,
    portfolioState: PortfolioState,
    confidence: number
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'You are a quantitative trading analyst. Provide a concise 1-2 sentence reasoning for the trading action.'
          },
          {
            role: 'user',
            content: `Action: ${action.toUpperCase()} ${marketState.symbol}
Confidence: ${(confidence * 100).toFixed(0)}%
Market: ${marketState.trend} trend, RSI ${marketState.rsi.toFixed(0)}, Momentum ${(marketState.momentum * 100).toFixed(0)}%
Portfolio: ${portfolioState.currentDrawdown.toFixed(1)}% drawdown, Sharpe ${portfolioState.sharpeRatio.toFixed(2)}`
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        return content;
      }
    } catch (error) {
      // Fallback reasoning
    }

    // Default reasoning
    if (action === 'buy') {
      return `${marketState.trend} trend with ${marketState.momentum > 0 ? 'positive' : 'recovering'} momentum and RSI at ${marketState.rsi.toFixed(0)} suggests buying opportunity.`;
    } else if (action === 'sell') {
      return `${marketState.trend} conditions with RSI at ${marketState.rsi.toFixed(0)} and ${portfolioState.currentDrawdown.toFixed(1)}% drawdown suggests reducing exposure.`;
    }
    return `Current market conditions favor holding. Waiting for clearer signals.`;
  }

  private async generateAlternativeActions(
    primaryAction: string,
    probabilities: Record<string, number>,
    marketState: MarketState,
    portfolioState: PortfolioState,
    riskProfile: RiskProfile
  ): Promise<TradingAction[]> {
    const alternatives: TradingAction[] = [];
    
    for (const [action, prob] of Object.entries(probabilities)) {
      if (action !== primaryAction && prob > 0.15) {
        const altAction = await this.generateTradingAction(
          action,
          marketState,
          portfolioState,
          riskProfile,
          prob
        );
        alternatives.push(altAction);
      }
    }
    
    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  private generateStrategyAdjustments(
    marketState: MarketState,
    portfolioState: PortfolioState,
    currentStrategy?: StrategyState
  ): RLOptimizationResult['strategyAdjustments'] {
    const adjustments: RLOptimizationResult['strategyAdjustments'] = [];
    const weights = this.policyNetwork.getWeights();

    // Suggest momentum weight adjustment
    if (marketState.marketRegime === 'trending') {
      adjustments.push({
        parameter: 'momentum_weight',
        currentValue: weights.momentum,
        suggestedValue: Math.min(0.5, weights.momentum * 1.2),
        reason: 'Trending market regime favors momentum strategies'
      });
    } else if (marketState.marketRegime === 'ranging') {
      adjustments.push({
        parameter: 'momentum_weight',
        currentValue: weights.momentum,
        suggestedValue: Math.max(0.1, weights.momentum * 0.8),
        reason: 'Ranging market reduces momentum effectiveness'
      });
    }

    // Suggest volatility adjustment
    if (marketState.volatility > 0.3) {
      adjustments.push({
        parameter: 'position_size_multiplier',
        currentValue: 1.0,
        suggestedValue: 0.7,
        reason: 'High volatility warrants reduced position sizes'
      });
    }

    // Suggest drawdown protection
    if (portfolioState.currentDrawdown > portfolioState.maxDrawdown * 0.5) {
      adjustments.push({
        parameter: 'risk_reduction_factor',
        currentValue: 1.0,
        suggestedValue: 0.5,
        reason: 'Approaching max drawdown limit, reducing risk exposure'
      });
    }

    return adjustments;
  }

  private assessRisk(
    action: TradingAction,
    marketState: MarketState,
    portfolioState: PortfolioState,
    riskProfile: RiskProfile
  ): RLOptimizationResult['riskAssessment'] {
    const riskFactors: string[] = [];
    const mitigationSuggestions: string[] = [];
    
    // Calculate current risk score
    let currentRisk = 30; // Base risk
    
    // Volatility risk
    if (marketState.volatility > 0.3) {
      currentRisk += 20;
      riskFactors.push(`High volatility (${(marketState.volatility * 100).toFixed(0)}%)`);
      mitigationSuggestions.push('Reduce position size or use tighter stops');
    }
    
    // Drawdown risk
    if (portfolioState.currentDrawdown > riskProfile.maxDrawdownLimit * 0.5) {
      currentRisk += 25;
      riskFactors.push(`Elevated drawdown (${portfolioState.currentDrawdown.toFixed(1)}%)`);
      mitigationSuggestions.push('Consider reducing overall exposure');
    }
    
    // Concentration risk
    const maxPositionWeight = Math.max(...portfolioState.positions.map(p => p.weight), 0);
    if (maxPositionWeight > 30) {
      currentRisk += 15;
      riskFactors.push(`Position concentration (${maxPositionWeight.toFixed(0)}% in single asset)`);
      mitigationSuggestions.push('Diversify holdings to reduce concentration risk');
    }
    
    // Market regime risk
    if (marketState.marketRegime === 'volatile') {
      currentRisk += 15;
      riskFactors.push('Volatile market regime');
      mitigationSuggestions.push('Wait for clearer market direction');
    }
    
    // Calculate projected risk after action
    let projectedRisk = currentRisk;
    if (action.action === 'buy' && marketState.trend === 'bearish') {
      projectedRisk += 10;
    } else if (action.action === 'sell' && portfolioState.currentDrawdown > 0) {
      projectedRisk -= 5;
    }
    
    return {
      currentRisk: Math.min(100, currentRisk),
      projectedRisk: Math.min(100, Math.max(0, projectedRisk)),
      riskFactors,
      mitigationSuggestions
    };
  }

  private async generateExplanation(
    action: TradingAction,
    probabilities: Record<string, number>,
    stateValue: number,
    marketState: MarketState
  ): Promise<string> {
    const weights = this.policyNetwork.getWeights();
    
    return `RL model recommends ${action.action.toUpperCase()} with ${action.confidence.toFixed(0)}% confidence. ` +
      `Policy weights: momentum (${(weights.momentum * 100).toFixed(0)}%), trend (${(weights.trend * 100).toFixed(0)}%), ` +
      `volatility penalty (${(weights.volatility * 100).toFixed(0)}%). ` +
      `State value estimate: ${(stateValue * 100).toFixed(0)}%. ` +
      `Market regime: ${marketState.marketRegime}, RSI: ${marketState.rsi.toFixed(0)}.`;
  }

  // Record experience for learning
  recordExperience(
    marketState: MarketState,
    portfolioState: PortfolioState,
    action: string,
    reward: number
  ): void {
    this.experienceBuffer.push({
      state: { market: marketState, portfolio: portfolioState },
      action,
      reward,
      timestamp: Date.now()
    });
    
    // Trim buffer if too large
    if (this.experienceBuffer.length > this.maxBufferSize) {
      this.experienceBuffer.shift();
    }
  }

  // Train on recent experiences
  train(): void {
    if (this.experienceBuffer.length < 10) return;
    
    // Get recent experiences
    const recentExperiences = this.experienceBuffer.slice(-50);
    
    for (const exp of recentExperiences) {
      const oldProbs = this.policyNetwork.calculateActionProbabilities(
        exp.state.market,
        exp.state.portfolio,
        { riskTolerance: 'moderate', maxPositionSize: 20, maxDrawdownLimit: 15, targetSharpe: 1.5, preferredHoldingPeriod: 'swing' }
      );
      
      // Simulate new probabilities after update
      const newProbs = { ...oldProbs };
      
      this.policyNetwork.updatePolicy(exp.reward, oldProbs, newProbs, exp.action);
    }
  }

  getModelState(): {
    weights: Record<string, number>;
    experienceCount: number;
    lastTrainingTime: number;
  } {
    return {
      weights: this.policyNetwork.getWeights(),
      experienceCount: this.experienceBuffer.length,
      lastTrainingTime: this.experienceBuffer.length > 0 
        ? this.experienceBuffer[this.experienceBuffer.length - 1].timestamp 
        : 0
    };
  }
}

// Export singleton instance
export const rlOptimizer = new RLStrategyOptimizer();
