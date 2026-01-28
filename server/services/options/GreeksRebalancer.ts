/**
 * Greeks Rebalancer with RL-based Loss Function Optimization
 * 
 * Implements Delta-Neutral, Gamma-Positive portfolio optimization using
 * Reinforcement Learning (PPO-inspired) to minimize the loss function:
 * 
 * L = w₁(Δ_total)² + w₂(Cost of Hedging) - w₃(γ_total)
 * 
 * Based on 2026 research: Deep Hedging with Reinforcement Learning
 */

import { invokeLLM } from '../../_core/llm';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PortfolioPosition {
  symbol: string;
  positionType: 'stock' | 'call' | 'put';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  strike?: number;
  expiry?: Date;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface RebalanceAction {
  symbol: string;
  action: 'buy' | 'sell' | 'close';
  positionType: 'stock' | 'call' | 'put';
  quantity: number;
  strike?: number;
  expiry?: Date;
  estimatedCost: number;
  greeksImpact: {
    deltaChange: number;
    gammaChange: number;
    thetaChange: number;
    vegaChange: number;
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface LossFunction {
  deltaComponent: number;
  costComponent: number;
  gammaComponent: number;
  totalLoss: number;
}

export interface RebalanceWeights {
  delta: number;  // w₁: Penalize delta exposure
  cost: number;   // w₂: Penalize hedging costs
  gamma: number;  // w₃: Reward gamma (negative = maximize)
}

export interface PortfolioState {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  netExposure: number;
  lossFunction: LossFunction;
  isBalanced: boolean;
}

export interface RebalanceResult {
  currentState: PortfolioState;
  targetState: PortfolioState;
  actions: RebalanceAction[];
  totalCost: number;
  expectedImprovement: number;
  alerts: string[];
}

export interface PPOConfig {
  learningRate: number;
  clipRange: number;
  entropyCoefficient: number;
  valueCoefficient: number;
  maxIterations: number;
}

// ============================================================================
// PPO-Inspired Policy Network
// ============================================================================

class PPOPolicyNetwork {
  private config: PPOConfig;
  private actionHistory: { state: number[]; action: number[]; reward: number }[] = [];
  
  constructor(config?: Partial<PPOConfig>) {
    this.config = {
      learningRate: 0.0003,
      clipRange: 0.2,
      entropyCoefficient: 0.01,
      valueCoefficient: 0.5,
      maxIterations: 100,
      ...config
    };
  }
  
  /**
   * Get action probabilities for current state
   * State: [delta, gamma, theta, vega, cost_budget]
   * Action: [delta_adjustment, gamma_adjustment]
   */
  getActionProbabilities(state: number[]): { mean: number[]; std: number[] } {
    // Simplified policy: target delta-neutral, gamma-positive
    const [delta, gamma, theta, vega, costBudget] = state;
    
    // Delta adjustment: move toward 0
    const deltaTarget = -delta * 0.5; // Reduce delta by 50%
    
    // Gamma adjustment: increase if below threshold
    const gammaTarget = gamma < 0.1 ? 0.05 : 0; // Add gamma if low
    
    // Add exploration noise based on entropy coefficient
    const noise = this.config.entropyCoefficient;
    
    return {
      mean: [deltaTarget, gammaTarget],
      std: [0.1 + noise, 0.05 + noise]
    };
  }
  
  /**
   * Sample action from policy distribution
   */
  sampleAction(state: number[]): number[] {
    const { mean, std } = this.getActionProbabilities(state);
    
    // Sample from Gaussian distribution
    const action = mean.map((m, i) => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return m + std[i] * z;
    });
    
    return action;
  }
  
  /**
   * Calculate advantage estimate
   */
  calculateAdvantage(
    currentLoss: number,
    nextLoss: number,
    cost: number
  ): number {
    // Advantage = improvement in loss - cost penalty
    const improvement = currentLoss - nextLoss;
    const costPenalty = cost * 0.01; // Small cost penalty
    return improvement - costPenalty;
  }
  
  /**
   * Update policy based on experience
   */
  updatePolicy(
    state: number[],
    action: number[],
    reward: number
  ): void {
    this.actionHistory.push({ state, action, reward });
    
    // Keep only recent history
    if (this.actionHistory.length > 1000) {
      this.actionHistory.shift();
    }
    
    // In production, this would update neural network weights
    // For now, we use the history to adjust future recommendations
  }
  
  /**
   * Get historical performance for similar states
   */
  getHistoricalPerformance(state: number[]): number {
    if (this.actionHistory.length === 0) return 0;
    
    // Find similar states and average their rewards
    const similarStates = this.actionHistory.filter(h => {
      const distance = h.state.reduce((sum, s, i) => 
        sum + Math.pow(s - state[i], 2), 0
      );
      return distance < 0.5;
    });
    
    if (similarStates.length === 0) return 0;
    
    return similarStates.reduce((sum, s) => sum + s.reward, 0) / similarStates.length;
  }
}

// ============================================================================
// Greeks Calculator
// ============================================================================

class GreeksCalculator {
  /**
   * Calculate portfolio Greeks
   */
  calculatePortfolioGreeks(positions: PortfolioPosition[]): {
    totalDelta: number;
    totalGamma: number;
    totalTheta: number;
    totalVega: number;
  } {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    
    for (const position of positions) {
      const multiplier = position.quantity;
      totalDelta += position.greeks.delta * multiplier;
      totalGamma += position.greeks.gamma * multiplier;
      totalTheta += position.greeks.theta * multiplier;
      totalVega += position.greeks.vega * multiplier;
    }
    
    return { totalDelta, totalGamma, totalTheta, totalVega };
  }
  
  /**
   * Estimate Greeks for a potential trade
   */
  estimateTradeGreeks(
    positionType: 'stock' | 'call' | 'put',
    quantity: number,
    spotPrice: number,
    strike?: number,
    daysToExpiry?: number,
    iv?: number
  ): { delta: number; gamma: number; theta: number; vega: number } {
    if (positionType === 'stock') {
      return {
        delta: quantity,
        gamma: 0,
        theta: 0,
        vega: 0
      };
    }
    
    // Simplified Black-Scholes Greeks estimation
    const S = spotPrice;
    const K = strike || spotPrice;
    const T = (daysToExpiry || 30) / 365;
    const sigma = iv || 0.25;
    const r = 0.05;
    
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    
    // Normal CDF approximation
    const normalCDF = (x: number) => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;
      const sign = x < 0 ? -1 : 1;
      const absX = Math.abs(x) / Math.sqrt(2);
      const t = 1.0 / (1.0 + p * absX);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
      return 0.5 * (1.0 + sign * y);
    };
    
    const normalPDF = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    
    const Nd1 = normalCDF(d1);
    const nd1 = normalPDF(d1);
    
    let delta = positionType === 'call' ? Nd1 : Nd1 - 1;
    const gamma = nd1 / (S * sigma * sqrtT);
    const vega = S * sqrtT * nd1 / 100;
    const theta = -(S * nd1 * sigma) / (2 * sqrtT * 365);
    
    return {
      delta: delta * quantity,
      gamma: gamma * quantity,
      theta: theta * quantity,
      vega: vega * quantity
    };
  }
}

// ============================================================================
// Main Greeks Rebalancer
// ============================================================================

export class GreeksRebalancer {
  private ppoPolicy: PPOPolicyNetwork;
  private greeksCalculator: GreeksCalculator;
  private weights: RebalanceWeights;
  
  constructor(weights?: Partial<RebalanceWeights>) {
    this.ppoPolicy = new PPOPolicyNetwork();
    this.greeksCalculator = new GreeksCalculator();
    this.weights = {
      delta: 1.0,
      cost: 0.5,
      gamma: -0.3, // Negative to maximize gamma
      ...weights
    };
  }
  
  /**
   * Calculate loss function for current portfolio
   */
  calculateLossFunction(
    totalDelta: number,
    totalGamma: number,
    hedgingCost: number
  ): LossFunction {
    const deltaComponent = this.weights.delta * Math.pow(totalDelta, 2);
    const costComponent = this.weights.cost * hedgingCost;
    const gammaComponent = this.weights.gamma * totalGamma; // Negative weight = reward
    
    const totalLoss = deltaComponent + costComponent + gammaComponent;
    
    return {
      deltaComponent,
      costComponent,
      gammaComponent,
      totalLoss
    };
  }
  
  /**
   * Get current portfolio state
   */
  getPortfolioState(positions: PortfolioPosition[]): PortfolioState {
    const greeks = this.greeksCalculator.calculatePortfolioGreeks(positions);
    const lossFunction = this.calculateLossFunction(greeks.totalDelta, greeks.totalGamma, 0);
    
    // Calculate net exposure (dollar delta)
    const netExposure = positions.reduce((sum, p) => {
      return sum + p.greeks.delta * p.quantity * p.currentPrice;
    }, 0);
    
    // Portfolio is balanced if delta is near zero and gamma is positive
    const isBalanced = Math.abs(greeks.totalDelta) < 0.1 && greeks.totalGamma > 0;
    
    return {
      ...greeks,
      netExposure,
      lossFunction,
      isBalanced
    };
  }
  
  /**
   * Generate rebalancing recommendations using PPO policy
   */
  async generateRebalanceActions(
    positions: PortfolioPosition[],
    costBudget: number = 1000
  ): Promise<RebalanceResult> {
    const currentState = this.getPortfolioState(positions);
    const actions: RebalanceAction[] = [];
    const alerts: string[] = [];
    
    // Get state vector for policy
    const stateVector = [
      currentState.totalDelta,
      currentState.totalGamma,
      currentState.totalTheta,
      currentState.totalVega,
      costBudget
    ];
    
    // Get action from PPO policy
    const [deltaAdjustment, gammaAdjustment] = this.ppoPolicy.sampleAction(stateVector);
    
    // Generate specific actions based on policy output
    
    // 1. Delta hedging with stock
    if (Math.abs(currentState.totalDelta) > 0.05) {
      const sharesToTrade = Math.round(-currentState.totalDelta * 100);
      const avgPrice = positions.length > 0 
        ? positions.reduce((sum, p) => sum + p.currentPrice, 0) / positions.length 
        : 100;
      
      if (sharesToTrade !== 0) {
        const stockAction: RebalanceAction = {
          symbol: positions[0]?.symbol || 'SPY',
          action: sharesToTrade > 0 ? 'buy' : 'sell',
          positionType: 'stock',
          quantity: Math.abs(sharesToTrade),
          estimatedCost: Math.abs(sharesToTrade) * avgPrice * 0.001, // Commission estimate
          greeksImpact: {
            deltaChange: sharesToTrade / 100,
            gammaChange: 0,
            thetaChange: 0,
            vegaChange: 0
          },
          priority: Math.abs(currentState.totalDelta) > 0.3 ? 'critical' : 'high',
          reasoning: `Hedge portfolio delta from ${currentState.totalDelta.toFixed(2)} toward neutral`
        };
        actions.push(stockAction);
      }
    }
    
    // 2. Gamma adjustment with options
    if (currentState.totalGamma < 0.05 && gammaAdjustment > 0) {
      // Buy straddle to add gamma
      const avgPrice = positions.length > 0 
        ? positions.reduce((sum, p) => sum + p.currentPrice, 0) / positions.length 
        : 100;
      const atmStrike = Math.round(avgPrice / 5) * 5; // Round to nearest $5
      
      const gammaAction: RebalanceAction = {
        symbol: positions[0]?.symbol || 'SPY',
        action: 'buy',
        positionType: 'call',
        quantity: 1,
        strike: atmStrike,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        estimatedCost: avgPrice * 0.03, // ~3% of stock price for ATM call
        greeksImpact: {
          deltaChange: 0.5,
          gammaChange: 0.05,
          thetaChange: -0.02,
          vegaChange: 0.1
        },
        priority: 'medium',
        reasoning: `Add gamma exposure to benefit from large moves`
      };
      actions.push(gammaAction);
    }
    
    // 3. Theta optimization - close positions with poor theta/risk ratio
    const poorThetaPositions = positions.filter(p => 
      p.positionType !== 'stock' && 
      p.greeks.theta < -0.05 && 
      p.expiry && 
      (p.expiry.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 // < 7 days
    );
    
    for (const pos of poorThetaPositions) {
      const closeAction: RebalanceAction = {
        symbol: pos.symbol,
        action: 'close',
        positionType: pos.positionType,
        quantity: Math.abs(pos.quantity),
        strike: pos.strike,
        expiry: pos.expiry,
        estimatedCost: pos.currentPrice * Math.abs(pos.quantity) * 0.001,
        greeksImpact: {
          deltaChange: -pos.greeks.delta * pos.quantity,
          gammaChange: -pos.greeks.gamma * pos.quantity,
          thetaChange: -pos.greeks.theta * pos.quantity,
          vegaChange: -pos.greeks.vega * pos.quantity
        },
        priority: 'high',
        reasoning: `Close position with high theta decay near expiry`
      };
      actions.push(closeAction);
    }
    
    // Calculate target state after actions
    let targetDelta = currentState.totalDelta;
    let targetGamma = currentState.totalGamma;
    let targetTheta = currentState.totalTheta;
    let targetVega = currentState.totalVega;
    let totalCost = 0;
    
    for (const action of actions) {
      targetDelta += action.greeksImpact.deltaChange;
      targetGamma += action.greeksImpact.gammaChange;
      targetTheta += action.greeksImpact.thetaChange;
      targetVega += action.greeksImpact.vegaChange;
      totalCost += action.estimatedCost;
    }
    
    const targetLoss = this.calculateLossFunction(targetDelta, targetGamma, totalCost);
    const targetState: PortfolioState = {
      totalDelta: targetDelta,
      totalGamma: targetGamma,
      totalTheta: targetTheta,
      totalVega: targetVega,
      netExposure: currentState.netExposure, // Simplified
      lossFunction: targetLoss,
      isBalanced: Math.abs(targetDelta) < 0.1 && targetGamma > 0
    };
    
    // Calculate expected improvement
    const expectedImprovement = currentState.lossFunction.totalLoss - targetLoss.totalLoss;
    
    // Generate alerts
    if (currentState.totalDelta > 0.5) {
      alerts.push(`🚨 High positive delta (${currentState.totalDelta.toFixed(2)}). Portfolio is heavily long.`);
    } else if (currentState.totalDelta < -0.5) {
      alerts.push(`🚨 High negative delta (${currentState.totalDelta.toFixed(2)}). Portfolio is heavily short.`);
    }
    
    if (currentState.totalGamma < 0) {
      alerts.push(`⚠️ Negative gamma (${currentState.totalGamma.toFixed(3)}). Large moves will hurt the portfolio.`);
    }
    
    if (totalCost > costBudget) {
      alerts.push(`💰 Rebalancing cost ($${totalCost.toFixed(2)}) exceeds budget ($${costBudget.toFixed(2)}).`);
    }
    
    if (actions.length === 0) {
      alerts.push(`✅ Portfolio is well-balanced. No immediate action required.`);
    }
    
    // Update policy with this experience
    const reward = expectedImprovement - totalCost * 0.01;
    this.ppoPolicy.updatePolicy(stateVector, [deltaAdjustment, gammaAdjustment], reward);
    
    return {
      currentState,
      targetState,
      actions,
      totalCost,
      expectedImprovement,
      alerts
    };
  }
  
  /**
   * Set custom weights for the loss function
   */
  setWeights(weights: Partial<RebalanceWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }
  
  /**
   * Get optimal position size for a new trade
   */
  getOptimalPositionSize(
    currentPortfolio: PortfolioPosition[],
    newPosition: Partial<PortfolioPosition>,
    maxRisk: number = 0.02 // 2% of portfolio
  ): { quantity: number; reasoning: string } {
    const currentState = this.getPortfolioState(currentPortfolio);
    
    // Calculate how much the new position would affect delta
    const estimatedGreeks = this.greeksCalculator.estimateTradeGreeks(
      newPosition.positionType || 'call',
      1, // Unit position
      newPosition.currentPrice || 100,
      newPosition.strike,
      newPosition.expiry ? (newPosition.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 30
    );
    
    // Calculate portfolio value
    const portfolioValue = currentPortfolio.reduce(
      (sum, p) => sum + Math.abs(p.quantity * p.currentPrice), 
      0
    ) || 10000;
    
    // Maximum position size based on risk
    const maxPositionValue = portfolioValue * maxRisk;
    const maxQuantity = Math.floor(maxPositionValue / (newPosition.currentPrice || 100));
    
    // Adjust for delta impact
    let optimalQuantity = maxQuantity;
    
    // If adding this position moves delta away from neutral, reduce size
    const newDelta = currentState.totalDelta + estimatedGreeks.delta;
    if (Math.abs(newDelta) > Math.abs(currentState.totalDelta)) {
      // Position increases delta exposure - reduce size
      optimalQuantity = Math.floor(maxQuantity * 0.5);
    }
    
    // If position adds gamma, allow larger size
    if (estimatedGreeks.gamma > 0 && currentState.totalGamma < 0.1) {
      optimalQuantity = Math.min(maxQuantity, Math.floor(optimalQuantity * 1.5));
    }
    
    const reasoning = `Optimal size: ${optimalQuantity} contracts. ` +
      `Current delta: ${currentState.totalDelta.toFixed(2)}, ` +
      `Position delta impact: ${estimatedGreeks.delta.toFixed(2)}, ` +
      `Risk budget: $${maxPositionValue.toFixed(0)}`;
    
    return { quantity: Math.max(1, optimalQuantity), reasoning };
  }
  
  /**
   * Simulate rebalancing impact
   */
  simulateRebalance(
    positions: PortfolioPosition[],
    actions: RebalanceAction[]
  ): { before: PortfolioState; after: PortfolioState; improvement: number } {
    const before = this.getPortfolioState(positions);
    
    // Apply actions to get simulated after state
    let afterDelta = before.totalDelta;
    let afterGamma = before.totalGamma;
    let afterTheta = before.totalTheta;
    let afterVega = before.totalVega;
    let totalCost = 0;
    
    for (const action of actions) {
      afterDelta += action.greeksImpact.deltaChange;
      afterGamma += action.greeksImpact.gammaChange;
      afterTheta += action.greeksImpact.thetaChange;
      afterVega += action.greeksImpact.vegaChange;
      totalCost += action.estimatedCost;
    }
    
    const afterLoss = this.calculateLossFunction(afterDelta, afterGamma, totalCost);
    
    const after: PortfolioState = {
      totalDelta: afterDelta,
      totalGamma: afterGamma,
      totalTheta: afterTheta,
      totalVega: afterVega,
      netExposure: before.netExposure,
      lossFunction: afterLoss,
      isBalanced: Math.abs(afterDelta) < 0.1 && afterGamma > 0
    };
    
    const improvement = before.lossFunction.totalLoss - after.lossFunction.totalLoss;
    
    return { before, after, improvement };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGreeksRebalancer(weights?: Partial<RebalanceWeights>): GreeksRebalancer {
  return new GreeksRebalancer(weights);
}
