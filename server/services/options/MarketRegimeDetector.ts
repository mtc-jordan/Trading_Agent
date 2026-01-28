/**
 * HMM-based Market Regime Detector
 * 
 * Uses Hidden Markov Models to detect market regimes:
 * - Trending (Bull/Bear)
 * - Mean-Reverting (Range-bound)
 * - High Volatility (Crisis)
 * 
 * Provides regime-specific options strategy recommendations
 * Based on 2026 research on regime-switching models in derivatives trading
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type MarketRegime = 'bull_trending' | 'bear_trending' | 'mean_reverting' | 'high_volatility' | 'low_volatility';

export interface RegimeState {
  regime: MarketRegime;
  probability: number;
  duration: number; // Days in current regime
  characteristics: {
    avgReturn: number;
    volatility: number;
    autocorrelation: number;
    trendStrength: number;
  };
}

export interface RegimeTransition {
  fromRegime: MarketRegime;
  toRegime: MarketRegime;
  probability: number;
  expectedDuration: number; // Expected days until transition
}

export interface OptionsStrategyRecommendation {
  strategy: string;
  description: string;
  suitability: number; // 0-1
  expectedReturn: number;
  maxRisk: number;
  greeksProfile: {
    deltaTarget: string;
    gammaTarget: string;
    thetaTarget: string;
    vegaTarget: string;
  };
}

export interface RegimeAnalysis {
  currentRegime: RegimeState;
  regimeProbabilities: Map<MarketRegime, number>;
  transitionMatrix: RegimeTransition[];
  recommendedStrategies: OptionsStrategyRecommendation[];
  alerts: string[];
}

export interface PriceData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// Hidden Markov Model Implementation
// ============================================================================

class HiddenMarkovModel {
  private numStates: number = 5; // 5 regimes
  private states: MarketRegime[] = ['bull_trending', 'bear_trending', 'mean_reverting', 'high_volatility', 'low_volatility'];
  
  // Transition probability matrix (learned from historical data)
  private transitionMatrix: number[][] = [
    // From: bull_trending
    [0.85, 0.05, 0.05, 0.03, 0.02],
    // From: bear_trending
    [0.05, 0.80, 0.05, 0.08, 0.02],
    // From: mean_reverting
    [0.10, 0.10, 0.70, 0.05, 0.05],
    // From: high_volatility
    [0.10, 0.15, 0.15, 0.55, 0.05],
    // From: low_volatility
    [0.15, 0.05, 0.20, 0.02, 0.58]
  ];
  
  // Emission parameters (mean, std) for each state
  private emissionParams: { mean: number; std: number }[] = [
    { mean: 0.001, std: 0.01 },   // bull_trending: positive returns, low vol
    { mean: -0.001, std: 0.015 }, // bear_trending: negative returns, higher vol
    { mean: 0.0, std: 0.008 },    // mean_reverting: near-zero returns, low vol
    { mean: 0.0, std: 0.03 },     // high_volatility: any returns, high vol
    { mean: 0.0002, std: 0.005 }  // low_volatility: slight positive, very low vol
  ];
  
  /**
   * Calculate emission probability (Gaussian)
   */
  private emissionProbability(observation: number, stateIndex: number): number {
    const { mean, std } = this.emissionParams[stateIndex];
    const exponent = -0.5 * Math.pow((observation - mean) / std, 2);
    return Math.exp(exponent) / (std * Math.sqrt(2 * Math.PI));
  }
  
  /**
   * Forward algorithm to calculate state probabilities
   */
  forward(observations: number[]): number[][] {
    const T = observations.length;
    const alpha: number[][] = [];
    
    // Initialize
    const initialProbs = [0.2, 0.2, 0.3, 0.15, 0.15]; // Prior probabilities
    alpha[0] = initialProbs.map((p, i) => p * this.emissionProbability(observations[0], i));
    
    // Normalize
    const sum0 = alpha[0].reduce((a, b) => a + b, 0);
    if (sum0 > 0) {
      alpha[0] = alpha[0].map(a => a / sum0);
    }
    
    // Forward pass
    for (let t = 1; t < T; t++) {
      alpha[t] = [];
      for (let j = 0; j < this.numStates; j++) {
        let sum = 0;
        for (let i = 0; i < this.numStates; i++) {
          sum += alpha[t-1][i] * this.transitionMatrix[i][j];
        }
        alpha[t][j] = sum * this.emissionProbability(observations[t], j);
      }
      
      // Normalize to prevent underflow
      const sumT = alpha[t].reduce((a, b) => a + b, 0);
      if (sumT > 0) {
        alpha[t] = alpha[t].map(a => a / sumT);
      }
    }
    
    return alpha;
  }
  
  /**
   * Viterbi algorithm to find most likely state sequence
   */
  viterbi(observations: number[]): { path: number[]; probability: number } {
    const T = observations.length;
    const delta: number[][] = [];
    const psi: number[][] = [];
    
    // Initialize
    const initialProbs = [0.2, 0.2, 0.3, 0.15, 0.15];
    delta[0] = initialProbs.map((p, i) => 
      Math.log(p + 1e-10) + Math.log(this.emissionProbability(observations[0], i) + 1e-10)
    );
    psi[0] = new Array(this.numStates).fill(0);
    
    // Forward pass
    for (let t = 1; t < T; t++) {
      delta[t] = [];
      psi[t] = [];
      
      for (let j = 0; j < this.numStates; j++) {
        let maxVal = -Infinity;
        let maxIdx = 0;
        
        for (let i = 0; i < this.numStates; i++) {
          const val = delta[t-1][i] + Math.log(this.transitionMatrix[i][j] + 1e-10);
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
        }
        
        delta[t][j] = maxVal + Math.log(this.emissionProbability(observations[t], j) + 1e-10);
        psi[t][j] = maxIdx;
      }
    }
    
    // Backtrack
    const path: number[] = new Array(T);
    let maxFinal = -Infinity;
    path[T-1] = 0;
    
    for (let i = 0; i < this.numStates; i++) {
      if (delta[T-1][i] > maxFinal) {
        maxFinal = delta[T-1][i];
        path[T-1] = i;
      }
    }
    
    for (let t = T - 2; t >= 0; t--) {
      path[t] = psi[t+1][path[t+1]];
    }
    
    return { path, probability: Math.exp(maxFinal) };
  }
  
  /**
   * Get current regime probabilities
   */
  getCurrentProbabilities(observations: number[]): Map<MarketRegime, number> {
    const alpha = this.forward(observations);
    const lastProbs = alpha[alpha.length - 1];
    
    const probMap = new Map<MarketRegime, number>();
    for (let i = 0; i < this.numStates; i++) {
      probMap.set(this.states[i], lastProbs[i]);
    }
    
    return probMap;
  }
  
  /**
   * Get most likely current regime
   */
  getMostLikelyRegime(observations: number[]): { regime: MarketRegime; probability: number } {
    const probs = this.getCurrentProbabilities(observations);
    let maxRegime: MarketRegime = 'mean_reverting';
    let maxProb = 0;
    
    for (const [regime, prob] of Array.from(probs.entries())) {
      if (prob > maxProb) {
        maxProb = prob;
        maxRegime = regime;
      }
    }
    
    return { regime: maxRegime, probability: maxProb };
  }
  
  /**
   * Get transition probabilities from current regime
   */
  getTransitionProbabilities(currentRegime: MarketRegime): RegimeTransition[] {
    const currentIndex = this.states.indexOf(currentRegime);
    const transitions: RegimeTransition[] = [];
    
    for (let j = 0; j < this.numStates; j++) {
      const prob = this.transitionMatrix[currentIndex][j];
      // Expected duration = 1 / (1 - self-transition probability)
      const expectedDuration = j === currentIndex ? 1 / (1 - prob + 0.01) : 1 / (prob + 0.01);
      
      transitions.push({
        fromRegime: currentRegime,
        toRegime: this.states[j],
        probability: prob,
        expectedDuration: Math.min(expectedDuration, 100)
      });
    }
    
    return transitions;
  }
}

// ============================================================================
// Strategy Recommender
// ============================================================================

class OptionsStrategyRecommender {
  private strategies: Map<MarketRegime, OptionsStrategyRecommendation[]> = new Map();
  
  constructor() {
    this.initializeStrategies();
  }
  
  private initializeStrategies(): void {
    // Bull Trending strategies
    this.strategies.set('bull_trending', [
      {
        strategy: 'Long Call',
        description: 'Buy ATM or slightly OTM calls to capture upside with limited risk',
        suitability: 0.9,
        expectedReturn: 0.5,
        maxRisk: 1.0, // Premium paid
        greeksProfile: { deltaTarget: 'Positive', gammaTarget: 'Positive', thetaTarget: 'Negative', vegaTarget: 'Positive' }
      },
      {
        strategy: 'Bull Call Spread',
        description: 'Buy lower strike call, sell higher strike call to reduce cost',
        suitability: 0.85,
        expectedReturn: 0.3,
        maxRisk: 0.5,
        greeksProfile: { deltaTarget: 'Positive', gammaTarget: 'Low', thetaTarget: 'Neutral', vegaTarget: 'Low' }
      },
      {
        strategy: 'Cash-Secured Put',
        description: 'Sell OTM puts to collect premium while waiting to buy at lower prices',
        suitability: 0.75,
        expectedReturn: 0.15,
        maxRisk: 0.8,
        greeksProfile: { deltaTarget: 'Positive', gammaTarget: 'Negative', thetaTarget: 'Positive', vegaTarget: 'Negative' }
      }
    ]);
    
    // Bear Trending strategies
    this.strategies.set('bear_trending', [
      {
        strategy: 'Long Put',
        description: 'Buy ATM or slightly OTM puts to profit from downside',
        suitability: 0.9,
        expectedReturn: 0.5,
        maxRisk: 1.0,
        greeksProfile: { deltaTarget: 'Negative', gammaTarget: 'Positive', thetaTarget: 'Negative', vegaTarget: 'Positive' }
      },
      {
        strategy: 'Bear Put Spread',
        description: 'Buy higher strike put, sell lower strike put to reduce cost',
        suitability: 0.85,
        expectedReturn: 0.3,
        maxRisk: 0.5,
        greeksProfile: { deltaTarget: 'Negative', gammaTarget: 'Low', thetaTarget: 'Neutral', vegaTarget: 'Low' }
      },
      {
        strategy: 'Protective Collar',
        description: 'Buy puts and sell calls to protect existing long positions',
        suitability: 0.8,
        expectedReturn: 0.1,
        maxRisk: 0.3,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Low', thetaTarget: 'Neutral', vegaTarget: 'Low' }
      }
    ]);
    
    // Mean Reverting strategies
    this.strategies.set('mean_reverting', [
      {
        strategy: 'Iron Condor',
        description: 'Sell OTM put spread and call spread to collect premium in range-bound market',
        suitability: 0.95,
        expectedReturn: 0.2,
        maxRisk: 0.8,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Negative', thetaTarget: 'Positive', vegaTarget: 'Negative' }
      },
      {
        strategy: 'Short Straddle',
        description: 'Sell ATM call and put for maximum premium collection',
        suitability: 0.7,
        expectedReturn: 0.25,
        maxRisk: 2.0,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Negative', thetaTarget: 'Positive', vegaTarget: 'Negative' }
      },
      {
        strategy: 'Calendar Spread',
        description: 'Sell near-term, buy far-term options at same strike',
        suitability: 0.8,
        expectedReturn: 0.15,
        maxRisk: 0.5,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Neutral', thetaTarget: 'Positive', vegaTarget: 'Positive' }
      }
    ]);
    
    // High Volatility strategies
    this.strategies.set('high_volatility', [
      {
        strategy: 'Long Straddle',
        description: 'Buy ATM call and put to profit from large moves in either direction',
        suitability: 0.85,
        expectedReturn: 0.4,
        maxRisk: 1.0,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Positive', thetaTarget: 'Negative', vegaTarget: 'Positive' }
      },
      {
        strategy: 'Long Strangle',
        description: 'Buy OTM call and put for cheaper directional bet',
        suitability: 0.8,
        expectedReturn: 0.5,
        maxRisk: 1.0,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Positive', thetaTarget: 'Negative', vegaTarget: 'Positive' }
      },
      {
        strategy: 'Ratio Backspread',
        description: 'Sell 1 ATM, buy 2 OTM options for unlimited upside potential',
        suitability: 0.75,
        expectedReturn: 0.6,
        maxRisk: 0.5,
        greeksProfile: { deltaTarget: 'Directional', gammaTarget: 'Positive', thetaTarget: 'Negative', vegaTarget: 'Positive' }
      }
    ]);
    
    // Low Volatility strategies
    this.strategies.set('low_volatility', [
      {
        strategy: 'Covered Call',
        description: 'Sell calls against long stock to enhance yield',
        suitability: 0.9,
        expectedReturn: 0.1,
        maxRisk: 0.3,
        greeksProfile: { deltaTarget: 'Positive', gammaTarget: 'Negative', thetaTarget: 'Positive', vegaTarget: 'Negative' }
      },
      {
        strategy: 'Iron Butterfly',
        description: 'Sell ATM straddle, buy OTM strangle for defined risk',
        suitability: 0.85,
        expectedReturn: 0.15,
        maxRisk: 0.5,
        greeksProfile: { deltaTarget: 'Neutral', gammaTarget: 'Negative', thetaTarget: 'Positive', vegaTarget: 'Negative' }
      },
      {
        strategy: 'Diagonal Spread',
        description: 'Sell near-term, buy far-term at different strikes',
        suitability: 0.8,
        expectedReturn: 0.12,
        maxRisk: 0.4,
        greeksProfile: { deltaTarget: 'Directional', gammaTarget: 'Neutral', thetaTarget: 'Positive', vegaTarget: 'Positive' }
      }
    ]);
  }
  
  getStrategiesForRegime(regime: MarketRegime): OptionsStrategyRecommendation[] {
    return this.strategies.get(regime) || [];
  }
}

// ============================================================================
// Main Market Regime Detector
// ============================================================================

export class MarketRegimeDetector {
  private hmm: HiddenMarkovModel;
  private strategyRecommender: OptionsStrategyRecommender;
  private regimeHistory: { timestamp: Date; regime: MarketRegime }[] = [];
  
  constructor() {
    this.hmm = new HiddenMarkovModel();
    this.strategyRecommender = new OptionsStrategyRecommender();
  }
  
  /**
   * Analyze market regime from price data
   */
  analyzeRegime(priceData: PriceData[]): RegimeAnalysis {
    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < priceData.length; i++) {
      returns.push((priceData[i].close - priceData[i-1].close) / priceData[i-1].close);
    }
    
    if (returns.length < 10) {
      // Not enough data
      return this.getDefaultAnalysis();
    }
    
    // Get current regime probabilities
    const regimeProbabilities = this.hmm.getCurrentProbabilities(returns);
    
    // Get most likely regime
    const { regime, probability } = this.hmm.getMostLikelyRegime(returns);
    
    // Calculate regime characteristics
    const characteristics = this.calculateCharacteristics(returns, regime);
    
    // Calculate duration in current regime
    const duration = this.calculateRegimeDuration(returns);
    
    const currentRegime: RegimeState = {
      regime,
      probability,
      duration,
      characteristics
    };
    
    // Get transition probabilities
    const transitionMatrix = this.hmm.getTransitionProbabilities(regime);
    
    // Get recommended strategies
    const recommendedStrategies = this.strategyRecommender.getStrategiesForRegime(regime);
    
    // Generate alerts
    const alerts = this.generateAlerts(currentRegime, transitionMatrix);
    
    // Record regime history
    this.regimeHistory.push({ timestamp: new Date(), regime });
    if (this.regimeHistory.length > 100) {
      this.regimeHistory.shift();
    }
    
    return {
      currentRegime,
      regimeProbabilities,
      transitionMatrix,
      recommendedStrategies,
      alerts
    };
  }
  
  /**
   * Get regime transition alerts
   */
  getTransitionAlerts(currentRegime: MarketRegime): string[] {
    const transitions = this.hmm.getTransitionProbabilities(currentRegime);
    const alerts: string[] = [];
    
    for (const t of transitions) {
      if (t.fromRegime !== t.toRegime && t.probability > 0.15) {
        alerts.push(
          `${(t.probability * 100).toFixed(0)}% chance of transitioning from ${t.fromRegime} to ${t.toRegime} ` +
          `(expected in ${t.expectedDuration.toFixed(0)} days)`
        );
      }
    }
    
    return alerts;
  }
  
  /**
   * Get optimal strategy for current conditions
   */
  getOptimalStrategy(
    regime: MarketRegime,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): OptionsStrategyRecommendation | null {
    const strategies = this.strategyRecommender.getStrategiesForRegime(regime);
    
    if (strategies.length === 0) return null;
    
    // Filter by risk tolerance
    let maxRiskThreshold: number;
    switch (riskTolerance) {
      case 'conservative': maxRiskThreshold = 0.5; break;
      case 'moderate': maxRiskThreshold = 1.0; break;
      case 'aggressive': maxRiskThreshold = 2.0; break;
    }
    
    const suitableStrategies = strategies.filter(s => s.maxRisk <= maxRiskThreshold);
    
    if (suitableStrategies.length === 0) {
      return strategies[0]; // Return best available if none match risk tolerance
    }
    
    // Return highest suitability strategy
    return suitableStrategies.reduce((best, current) => 
      current.suitability > best.suitability ? current : best
    );
  }
  
  /**
   * Predict regime for next N days
   */
  predictFutureRegime(
    currentRegime: MarketRegime,
    daysAhead: number
  ): Map<MarketRegime, number> {
    const transitions = this.hmm.getTransitionProbabilities(currentRegime);
    const futureProbs = new Map<MarketRegime, number>();
    
    // Initialize with current regime
    futureProbs.set(currentRegime, 1.0);
    
    // Simulate transitions
    for (let day = 0; day < daysAhead; day++) {
      const newProbs = new Map<MarketRegime, number>();
      
      for (const t of transitions) {
        const currentProb = futureProbs.get(t.fromRegime) || 0;
        const existingProb = newProbs.get(t.toRegime) || 0;
        newProbs.set(t.toRegime, existingProb + currentProb * t.probability);
      }
      
      // Update future probs
      for (const [regime, prob] of Array.from(newProbs.entries())) {
        futureProbs.set(regime, prob);
      }
    }
    
    return futureProbs;
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private calculateCharacteristics(returns: number[], regime: MarketRegime): RegimeState['characteristics'] {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    // Calculate autocorrelation (lag 1)
    let autocorrelation = 0;
    if (returns.length > 1) {
      const mean = avgReturn;
      let numerator = 0;
      let denominator = 0;
      
      for (let i = 1; i < returns.length; i++) {
        numerator += (returns[i] - mean) * (returns[i-1] - mean);
        denominator += Math.pow(returns[i] - mean, 2);
      }
      
      autocorrelation = denominator > 0 ? numerator / denominator : 0;
    }
    
    // Calculate trend strength (R-squared of linear regression)
    const n = returns.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = returns.reduce((a, b) => a + b, 0);
    const sumXY = returns.reduce((sum, r, i) => sum + i * r, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const sumY2 = returns.reduce((sum, r) => sum + r * r, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * i;
      ssRes += Math.pow(returns[i] - predicted, 2);
      ssTot += Math.pow(returns[i] - avgReturn, 2);
    }
    
    const trendStrength = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    
    return {
      avgReturn: avgReturn * 252, // Annualized
      volatility,
      autocorrelation,
      trendStrength: Math.max(0, trendStrength)
    };
  }
  
  private calculateRegimeDuration(returns: number[]): number {
    // Use Viterbi to find state sequence
    const { path } = this.hmm.viterbi(returns);
    
    if (path.length === 0) return 0;
    
    // Count consecutive days in current regime
    const currentState = path[path.length - 1];
    let duration = 1;
    
    for (let i = path.length - 2; i >= 0; i--) {
      if (path[i] === currentState) {
        duration++;
      } else {
        break;
      }
    }
    
    return duration;
  }
  
  private generateAlerts(
    currentRegime: RegimeState,
    transitions: RegimeTransition[]
  ): string[] {
    const alerts: string[] = [];
    
    // Alert for regime uncertainty
    if (currentRegime.probability < 0.5) {
      alerts.push(
        `⚠️ Regime uncertainty: Only ${(currentRegime.probability * 100).toFixed(0)}% confidence in ${currentRegime.regime}. Consider reducing position sizes.`
      );
    }
    
    // Alert for potential regime change
    const highProbTransitions = transitions.filter(t => 
      t.fromRegime !== t.toRegime && t.probability > 0.2
    );
    
    if (highProbTransitions.length > 0) {
      const mostLikely = highProbTransitions.reduce((a, b) => 
        a.probability > b.probability ? a : b
      );
      alerts.push(
        `🔄 Potential regime shift: ${(mostLikely.probability * 100).toFixed(0)}% chance of moving to ${mostLikely.toRegime}.`
      );
    }
    
    // Alert for high volatility regime
    if (currentRegime.regime === 'high_volatility') {
      alerts.push(
        `🚨 High volatility regime detected. Consider protective strategies and reduced leverage.`
      );
    }
    
    // Alert for extended regime duration
    if (currentRegime.duration > 20) {
      alerts.push(
        `⏰ Extended ${currentRegime.regime} regime (${currentRegime.duration} days). Mean reversion may be approaching.`
      );
    }
    
    return alerts;
  }
  
  private getDefaultAnalysis(): RegimeAnalysis {
    const defaultRegime: RegimeState = {
      regime: 'mean_reverting',
      probability: 0.5,
      duration: 0,
      characteristics: {
        avgReturn: 0,
        volatility: 0.2,
        autocorrelation: 0,
        trendStrength: 0
      }
    };
    
    return {
      currentRegime: defaultRegime,
      regimeProbabilities: new Map([
        ['bull_trending', 0.2],
        ['bear_trending', 0.2],
        ['mean_reverting', 0.3],
        ['high_volatility', 0.15],
        ['low_volatility', 0.15]
      ]),
      transitionMatrix: [],
      recommendedStrategies: this.strategyRecommender.getStrategiesForRegime('mean_reverting'),
      alerts: ['⚠️ Insufficient data for regime detection. Using default analysis.']
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMarketRegimeDetector(): MarketRegimeDetector {
  return new MarketRegimeDetector();
}
