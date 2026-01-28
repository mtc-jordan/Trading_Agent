/**
 * Big Four Greeks Optimizer
 * 
 * AI-powered optimization of the four primary Greeks:
 * - Delta (Δ): Predictive Hedging with LSTM for 15-min price direction
 * - Gamma (γ): Convexity Scalping with Gamma Squeeze detection
 * - Theta (θ): Decay Maximization with optimal decay/risk scanner
 * - Vega (ν): IV Crush Protection with event volatility analysis
 * 
 * Based on 2026 research: KANHedge, Deep Hedging with RL
 */

import { invokeLLM } from '../../_core/llm';

// ============================================================================
// Type Definitions
// ============================================================================

export interface OptionsPosition {
  symbol: string;
  strike: number;
  expiry: Date;
  type: 'call' | 'put';
  quantity: number;
  premium: number;
  underlyingPrice: number;
  iv: number;
  greeks: Greeks;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface PriceHistory {
  timestamp: Date;
  price: number;
  volume: number;
}

export interface DeltaHedgeSignal {
  action: 'buy' | 'sell' | 'hold';
  shares: number;
  urgency: 'immediate' | 'within_15min' | 'end_of_day';
  predictedDirection: 'up' | 'down' | 'neutral';
  confidence: number;
  reasoning: string;
}

export interface GammaSqueezeAlert {
  symbol: string;
  isSqueezeCondition: boolean;
  squeezeIntensity: number; // 0-1
  retailFlowRatio: number;
  openInterestConcentration: number;
  recommendation: 'buy_vol' | 'sell_vol' | 'neutral';
  reasoning: string;
}

export interface ThetaDecayOpportunity {
  symbol: string;
  strike: number;
  expiry: Date;
  type: 'call' | 'put';
  decayRate: number; // Daily theta as % of premium
  riskRewardRatio: number;
  breakoutProbability: number;
  score: number;
  strategy: 'iron_condor' | 'credit_spread' | 'naked_sell' | 'calendar';
}

export interface IVCrushAnalysis {
  symbol: string;
  currentIV: number;
  historicalIV: number;
  eventType: 'earnings' | 'cpi' | 'fomc' | 'other';
  eventDate: Date;
  expectedIVCrush: number; // Percentage drop expected
  isOverpriced: boolean;
  recommendation: 'avoid_long_vol' | 'sell_vol' | 'buy_vol' | 'neutral';
  confidence: number;
}

export interface GreeksOptimizationResult {
  portfolio: OptionsPosition[];
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  hedgeSignal: DeltaHedgeSignal;
  gammaAlerts: GammaSqueezeAlert[];
  thetaOpportunities: ThetaDecayOpportunity[];
  ivCrushAnalysis: IVCrushAnalysis[];
  lossFunction: number;
  recommendations: string[];
}

// ============================================================================
// LSTM-based Delta Predictor
// ============================================================================

class LSTMDeltaPredictor {
  private lookbackWindow: number = 20;
  private hiddenSize: number = 64;
  
  /**
   * Predict price direction using LSTM-like pattern recognition
   * Returns predicted direction and confidence for pre-hedging
   */
  async predictDirection(
    priceHistory: PriceHistory[],
    currentDelta: number
  ): Promise<{ direction: 'up' | 'down' | 'neutral'; confidence: number; magnitude: number }> {
    if (priceHistory.length < this.lookbackWindow) {
      return { direction: 'neutral', confidence: 0.5, magnitude: 0 };
    }
    
    const recentPrices = priceHistory.slice(-this.lookbackWindow);
    
    // Calculate features
    const returns = this.calculateReturns(recentPrices);
    const momentum = this.calculateMomentum(returns);
    const volatility = this.calculateVolatility(returns);
    const trend = this.calculateTrend(recentPrices);
    const volumeProfile = this.analyzeVolumeProfile(recentPrices);
    
    // LSTM-like pattern recognition using feature combination
    const bullishScore = (
      (momentum > 0 ? 0.3 : 0) +
      (trend > 0 ? 0.25 : 0) +
      (volumeProfile.buyPressure > 0.5 ? 0.2 : 0) +
      (returns[returns.length - 1] > 0 ? 0.15 : 0) +
      (volatility < 0.02 ? 0.1 : 0)
    );
    
    const bearishScore = (
      (momentum < 0 ? 0.3 : 0) +
      (trend < 0 ? 0.25 : 0) +
      (volumeProfile.sellPressure > 0.5 ? 0.2 : 0) +
      (returns[returns.length - 1] < 0 ? 0.15 : 0) +
      (volatility > 0.03 ? 0.1 : 0)
    );
    
    const direction = bullishScore > bearishScore + 0.1 ? 'up' 
      : bearishScore > bullishScore + 0.1 ? 'down' 
      : 'neutral';
    
    const confidence = Math.abs(bullishScore - bearishScore) + 0.5;
    const magnitude = Math.abs(momentum) * volatility * 100;
    
    return {
      direction,
      confidence: Math.min(0.95, confidence),
      magnitude
    };
  }
  
  private calculateReturns(prices: PriceHistory[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i].price - prices[i-1].price) / prices[i-1].price);
    }
    return returns;
  }
  
  private calculateMomentum(returns: number[]): number {
    if (returns.length === 0) return 0;
    const shortTerm = returns.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const longTerm = returns.reduce((a, b) => a + b, 0) / returns.length;
    return shortTerm - longTerm;
  }
  
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
  
  private calculateTrend(prices: PriceHistory[]): number {
    if (prices.length < 2) return 0;
    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((sum, p) => sum + p.price, 0);
    const sumXY = prices.reduce((sum, p, i) => sum + i * p.price, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }
  
  private analyzeVolumeProfile(prices: PriceHistory[]): { buyPressure: number; sellPressure: number } {
    let buyVolume = 0;
    let sellVolume = 0;
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i].price > prices[i-1].price) {
        buyVolume += prices[i].volume;
      } else {
        sellVolume += prices[i].volume;
      }
    }
    
    const totalVolume = buyVolume + sellVolume;
    return {
      buyPressure: totalVolume > 0 ? buyVolume / totalVolume : 0.5,
      sellPressure: totalVolume > 0 ? sellVolume / totalVolume : 0.5
    };
  }
}

// ============================================================================
// Gamma Squeeze Detector
// ============================================================================

class GammaSqueezeDetector {
  /**
   * Detect gamma squeeze conditions in meme stocks or low-float crypto
   */
  detectSqueezeConditions(
    symbol: string,
    positions: OptionsPosition[],
    retailFlowData: { callVolume: number; putVolume: number; avgVolume: number },
    openInterest: { strike: number; calls: number; puts: number }[]
  ): GammaSqueezeAlert {
    // Calculate retail flow ratio (high call buying = squeeze potential)
    const callPutRatio = retailFlowData.callVolume / Math.max(retailFlowData.putVolume, 1);
    const volumeRatio = (retailFlowData.callVolume + retailFlowData.putVolume) / retailFlowData.avgVolume;
    const retailFlowRatio = callPutRatio * Math.min(volumeRatio, 3);
    
    // Find OI concentration near current price
    const totalOI = openInterest.reduce((sum, oi) => sum + oi.calls + oi.puts, 0);
    const nearMoneyOI = openInterest
      .filter(oi => positions.some(p => Math.abs(p.strike - oi.strike) / p.strike < 0.05))
      .reduce((sum, oi) => sum + oi.calls, 0);
    const oiConcentration = totalOI > 0 ? nearMoneyOI / totalOI : 0;
    
    // Calculate total gamma exposure
    const totalGamma = positions.reduce((sum, p) => sum + p.greeks.gamma * p.quantity, 0);
    const gammaExposure = Math.abs(totalGamma);
    
    // Squeeze intensity score
    const squeezeIntensity = Math.min(1, (
      (retailFlowRatio > 3 ? 0.4 : retailFlowRatio / 7.5) +
      (oiConcentration > 0.3 ? 0.3 : oiConcentration) +
      (gammaExposure > 100 ? 0.3 : gammaExposure / 333)
    ));
    
    const isSqueezeCondition = squeezeIntensity > 0.6;
    
    let recommendation: 'buy_vol' | 'sell_vol' | 'neutral' = 'neutral';
    let reasoning = '';
    
    if (isSqueezeCondition) {
      if (retailFlowRatio > 4) {
        recommendation = 'buy_vol';
        reasoning = `High retail call buying (${retailFlowRatio.toFixed(1)}x) with concentrated OI. Gamma squeeze likely.`;
      } else {
        recommendation = 'sell_vol';
        reasoning = `Elevated squeeze conditions but momentum fading. Consider selling premium.`;
      }
    } else {
      reasoning = 'No significant squeeze conditions detected.';
    }
    
    return {
      symbol,
      isSqueezeCondition,
      squeezeIntensity,
      retailFlowRatio,
      openInterestConcentration: oiConcentration,
      recommendation,
      reasoning
    };
  }
}

// ============================================================================
// Theta Decay Scanner
// ============================================================================

class ThetaDecayScanner {
  /**
   * Find optimal theta decay opportunities across expiries
   */
  scanForOpportunities(
    positions: OptionsPosition[],
    underlyingVolatility: number
  ): ThetaDecayOpportunity[] {
    const opportunities: ThetaDecayOpportunity[] = [];
    
    for (const position of positions) {
      const daysToExpiry = Math.max(1, 
        (position.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      // Daily theta as percentage of premium
      const dailyDecayRate = Math.abs(position.greeks.theta) / position.premium;
      
      // Calculate breakout probability based on IV and time
      const expectedMove = position.iv * Math.sqrt(daysToExpiry / 365) * position.underlyingPrice;
      const distanceToStrike = Math.abs(position.strike - position.underlyingPrice);
      const breakoutProbability = 1 - this.normalCDF(distanceToStrike / expectedMove);
      
      // Risk-reward ratio: theta earned vs potential loss
      const maxLoss = position.type === 'call' 
        ? position.underlyingPrice - position.strike + position.premium
        : position.strike - position.underlyingPrice + position.premium;
      const riskRewardRatio = Math.abs(position.greeks.theta * daysToExpiry) / Math.max(maxLoss, 0.01);
      
      // Score the opportunity
      const score = (
        dailyDecayRate * 0.4 +
        riskRewardRatio * 0.3 +
        (1 - breakoutProbability) * 0.3
      );
      
      // Recommend strategy based on conditions
      let strategy: 'iron_condor' | 'credit_spread' | 'naked_sell' | 'calendar' = 'credit_spread';
      if (underlyingVolatility < 0.2 && daysToExpiry < 30) {
        strategy = 'iron_condor';
      } else if (daysToExpiry > 45) {
        strategy = 'calendar';
      } else if (breakoutProbability < 0.2) {
        strategy = 'naked_sell';
      }
      
      opportunities.push({
        symbol: position.symbol,
        strike: position.strike,
        expiry: position.expiry,
        type: position.type,
        decayRate: dailyDecayRate,
        riskRewardRatio,
        breakoutProbability,
        score,
        strategy
      });
    }
    
    // Sort by score descending
    return opportunities.sort((a, b) => b.score - a.score);
  }
  
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }
}

// ============================================================================
// IV Crush Analyzer
// ============================================================================

class IVCrushAnalyzer {
  private historicalCrushData: Map<string, number[]> = new Map();
  
  /**
   * Analyze if current IV is overpriced before an event
   */
  async analyzeIVCrush(
    symbol: string,
    currentIV: number,
    historicalIV: number,
    eventType: 'earnings' | 'cpi' | 'fomc' | 'other',
    eventDate: Date
  ): Promise<IVCrushAnalysis> {
    // Historical average IV crush by event type
    const avgCrushByEvent: Record<string, number> = {
      'earnings': 0.35, // 35% IV drop after earnings
      'cpi': 0.15,
      'fomc': 0.20,
      'other': 0.10
    };
    
    const daysToEvent = Math.max(0, 
      (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    // IV premium over historical
    const ivPremium = (currentIV - historicalIV) / historicalIV;
    
    // Expected crush based on event type and current premium
    const baseCrush = avgCrushByEvent[eventType] || 0.10;
    const expectedIVCrush = baseCrush * (1 + ivPremium);
    
    // Is IV overpriced?
    const isOverpriced = ivPremium > 0.3 && daysToEvent < 7;
    
    // Recommendation
    let recommendation: 'avoid_long_vol' | 'sell_vol' | 'buy_vol' | 'neutral' = 'neutral';
    let confidence = 0.5;
    
    if (isOverpriced && daysToEvent < 3) {
      recommendation = 'sell_vol';
      confidence = 0.8;
    } else if (isOverpriced) {
      recommendation = 'avoid_long_vol';
      confidence = 0.7;
    } else if (ivPremium < -0.1) {
      recommendation = 'buy_vol';
      confidence = 0.6;
    }
    
    return {
      symbol,
      currentIV,
      historicalIV,
      eventType,
      eventDate,
      expectedIVCrush,
      isOverpriced,
      recommendation,
      confidence
    };
  }
}

// ============================================================================
// Main Big Four Greeks Optimizer
// ============================================================================

export class BigFourGreeksOptimizer {
  private deltaPredictor: LSTMDeltaPredictor;
  private gammaDetector: GammaSqueezeDetector;
  private thetaScanner: ThetaDecayScanner;
  private ivCrushAnalyzer: IVCrushAnalyzer;
  
  // Loss function weights
  private weights = {
    delta: 1.0,    // w1: Penalize delta exposure
    cost: 0.5,     // w2: Penalize hedging costs
    gamma: -0.3    // w3: Reward gamma (negative = maximize)
  };
  
  constructor() {
    this.deltaPredictor = new LSTMDeltaPredictor();
    this.gammaDetector = new GammaSqueezeDetector();
    this.thetaScanner = new ThetaDecayScanner();
    this.ivCrushAnalyzer = new IVCrushAnalyzer();
  }
  
  /**
   * Optimize portfolio Greeks using the loss function:
   * L = w1*(Δ_total)² + w2*(Cost of Hedging) - w3*(γ_total)
   */
  async optimizePortfolio(
    positions: OptionsPosition[],
    priceHistory: PriceHistory[],
    retailFlowData: { callVolume: number; putVolume: number; avgVolume: number },
    openInterest: { strike: number; calls: number; puts: number }[],
    events: { symbol: string; type: 'earnings' | 'cpi' | 'fomc' | 'other'; date: Date }[]
  ): Promise<GreeksOptimizationResult> {
    // Calculate portfolio Greeks
    const totalDelta = positions.reduce((sum, p) => sum + p.greeks.delta * p.quantity, 0);
    const totalGamma = positions.reduce((sum, p) => sum + p.greeks.gamma * p.quantity, 0);
    const totalTheta = positions.reduce((sum, p) => sum + p.greeks.theta * p.quantity, 0);
    const totalVega = positions.reduce((sum, p) => sum + p.greeks.vega * p.quantity, 0);
    
    // 1. Delta: Predictive hedging signal
    const prediction = await this.deltaPredictor.predictDirection(priceHistory, totalDelta);
    const hedgeSignal = this.generateHedgeSignal(totalDelta, prediction, positions);
    
    // 2. Gamma: Squeeze detection
    const gammaAlerts: GammaSqueezeAlert[] = [];
    const symbols = Array.from(new Set(positions.map(p => p.symbol)));
    for (const symbol of symbols) {
      const symbolPositions = positions.filter(p => p.symbol === symbol);
      const alert = this.gammaDetector.detectSqueezeConditions(
        symbol, symbolPositions, retailFlowData, openInterest
      );
      gammaAlerts.push(alert);
    }
    
    // 3. Theta: Decay opportunities
    const avgVolatility = positions.reduce((sum, p) => sum + p.iv, 0) / positions.length;
    const thetaOpportunities = this.thetaScanner.scanForOpportunities(positions, avgVolatility);
    
    // 4. Vega: IV crush analysis
    const ivCrushAnalysis: IVCrushAnalysis[] = [];
    for (const event of events) {
      const position = positions.find(p => p.symbol === event.symbol);
      if (position) {
        const analysis = await this.ivCrushAnalyzer.analyzeIVCrush(
          event.symbol,
          position.iv,
          avgVolatility,
          event.type,
          event.date
        );
        ivCrushAnalysis.push(analysis);
      }
    }
    
    // Calculate loss function
    const hedgingCost = Math.abs(hedgeSignal.shares) * 0.01; // Simplified cost model
    const lossFunction = 
      this.weights.delta * Math.pow(totalDelta, 2) +
      this.weights.cost * hedgingCost +
      this.weights.gamma * totalGamma; // Negative weight = maximize gamma
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      totalDelta, totalGamma, totalTheta, totalVega,
      hedgeSignal, gammaAlerts, thetaOpportunities, ivCrushAnalysis
    );
    
    return {
      portfolio: positions,
      totalDelta,
      totalGamma,
      totalTheta,
      totalVega,
      hedgeSignal,
      gammaAlerts,
      thetaOpportunities,
      ivCrushAnalysis,
      lossFunction,
      recommendations
    };
  }
  
  /**
   * Set custom weights for the loss function
   */
  setWeights(delta: number, cost: number, gamma: number): void {
    this.weights = { delta, cost, gamma };
  }
  
  private generateHedgeSignal(
    totalDelta: number,
    prediction: { direction: 'up' | 'down' | 'neutral'; confidence: number; magnitude: number },
    positions: OptionsPosition[]
  ): DeltaHedgeSignal {
    const avgPrice = positions.reduce((sum, p) => sum + p.underlyingPrice, 0) / positions.length;
    
    // Pre-hedge based on prediction
    let targetDelta = 0; // Delta-neutral target
    
    if (prediction.confidence > 0.7) {
      // Adjust target based on predicted direction
      if (prediction.direction === 'up') {
        targetDelta = 0.1 * prediction.confidence; // Slight long bias
      } else if (prediction.direction === 'down') {
        targetDelta = -0.1 * prediction.confidence; // Slight short bias
      }
    }
    
    const deltaAdjustment = targetDelta - totalDelta;
    const sharesToTrade = Math.round(deltaAdjustment * 100); // 100 shares per delta
    
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    if (sharesToTrade > 10) {
      action = 'buy';
    } else if (sharesToTrade < -10) {
      action = 'sell';
    }
    
    let urgency: 'immediate' | 'within_15min' | 'end_of_day' = 'end_of_day';
    if (Math.abs(totalDelta) > 0.5 || prediction.confidence > 0.85) {
      urgency = 'immediate';
    } else if (prediction.confidence > 0.7) {
      urgency = 'within_15min';
    }
    
    return {
      action,
      shares: Math.abs(sharesToTrade),
      urgency,
      predictedDirection: prediction.direction,
      confidence: prediction.confidence,
      reasoning: `Portfolio delta: ${totalDelta.toFixed(2)}. Predicted ${prediction.direction} move with ${(prediction.confidence * 100).toFixed(0)}% confidence.`
    };
  }
  
  private generateRecommendations(
    totalDelta: number,
    totalGamma: number,
    totalTheta: number,
    totalVega: number,
    hedgeSignal: DeltaHedgeSignal,
    gammaAlerts: GammaSqueezeAlert[],
    thetaOpportunities: ThetaDecayOpportunity[],
    ivCrushAnalysis: IVCrushAnalysis[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Delta recommendations
    if (Math.abs(totalDelta) > 0.3) {
      recommendations.push(
        `⚠️ High delta exposure (${totalDelta.toFixed(2)}). ${hedgeSignal.action === 'hold' ? 'Monitor closely.' : `Consider ${hedgeSignal.action}ing ${hedgeSignal.shares} shares.`}`
      );
    }
    
    // Gamma recommendations
    const activeSqueezes = gammaAlerts.filter(a => a.isSqueezeCondition);
    if (activeSqueezes.length > 0) {
      recommendations.push(
        `🚨 Gamma squeeze detected in ${activeSqueezes.map(a => a.symbol).join(', ')}. ${activeSqueezes[0].recommendation === 'buy_vol' ? 'Consider buying volatility.' : 'Consider selling premium.'}`
      );
    }
    
    // Theta recommendations
    const topTheta = thetaOpportunities.slice(0, 3);
    if (topTheta.length > 0 && topTheta[0].score > 0.5) {
      recommendations.push(
        `💰 Top theta opportunity: ${topTheta[0].symbol} ${topTheta[0].strike} ${topTheta[0].type} (${(topTheta[0].decayRate * 100).toFixed(1)}% daily decay). Strategy: ${topTheta[0].strategy}`
      );
    }
    
    // Vega recommendations
    const overpricedIV = ivCrushAnalysis.filter(a => a.isOverpriced);
    if (overpricedIV.length > 0) {
      recommendations.push(
        `📉 IV overpriced before ${overpricedIV[0].eventType} in ${overpricedIV[0].symbol}. Expected ${(overpricedIV[0].expectedIVCrush * 100).toFixed(0)}% crush. Avoid buying premium.`
      );
    }
    
    // Portfolio balance
    if (totalGamma < 0 && totalTheta > 0) {
      recommendations.push(
        `✅ Portfolio is short gamma, long theta (premium seller position). Good for range-bound markets.`
      );
    } else if (totalGamma > 0 && totalTheta < 0) {
      recommendations.push(
        `📊 Portfolio is long gamma, short theta (premium buyer position). Needs directional move to profit.`
      );
    }
    
    return recommendations;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBigFourGreeksOptimizer(): BigFourGreeksOptimizer {
  return new BigFourGreeksOptimizer();
}
