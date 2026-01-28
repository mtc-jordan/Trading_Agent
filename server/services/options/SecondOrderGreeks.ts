/**
 * Second-Order Greeks Analyzer
 * 
 * Advanced Greeks analysis beyond Delta, Gamma, Theta, Vega:
 * - Vanna (∂Δ/∂σ): Delta sensitivity to volatility changes
 * - Charm (∂Δ/∂t): Delta decay over time (also called Delta Bleed)
 * - Vomma (∂Vega/∂σ): Vega convexity
 * - Veta (∂Vega/∂t): Vega decay over time
 * 
 * Plus: Friday Afternoon Effect prediction for Market Maker hedging flows
 * 
 * Based on 2026 research on second-order risk management
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface SecondOrderGreeks {
  vanna: number;      // ∂Δ/∂σ - Delta sensitivity to IV
  charm: number;      // ∂Δ/∂t - Delta decay over time
  vomma: number;      // ∂Vega/∂σ - Vega convexity
  veta: number;       // ∂Vega/∂t - Vega decay over time
  speed: number;      // ∂Γ/∂S - Gamma sensitivity to spot
  zomma: number;      // ∂Γ/∂σ - Gamma sensitivity to IV
  color: number;      // ∂Γ/∂t - Gamma decay over time
}

export interface OptionParameters {
  spotPrice: number;
  strike: number;
  timeToExpiry: number; // In years
  riskFreeRate: number;
  impliedVolatility: number;
  optionType: 'call' | 'put';
}

export interface FridayEffectPrediction {
  symbol: string;
  currentPrice: number;
  magnetPrices: number[];      // Price levels where MM hedging creates "magnets"
  expectedPriceRange: { low: number; high: number };
  pinningProbability: number;  // Probability of pinning to a strike
  dominantStrike: number;      // Most likely pin strike
  hedgingDirection: 'buy' | 'sell' | 'neutral';
  hedgingIntensity: number;    // 0-1 scale
  recommendation: string;
}

export interface SecondOrderAnalysis {
  position: OptionParameters;
  greeks: SecondOrderGreeks;
  riskMetrics: {
    vannaRisk: number;         // Risk from IV changes affecting delta
    charmRisk: number;         // Risk from time decay affecting delta
    totalSecondOrderRisk: number;
  };
  hedgingRecommendation: string;
}

export interface MarketMakerFlow {
  strike: number;
  openInterest: number;
  gamma: number;
  deltaHedgeRequired: number;
}

// ============================================================================
// Black-Scholes Helper Functions
// ============================================================================

class BlackScholesCalculator {
  /**
   * Standard normal CDF
   */
  private normalCDF(x: number): number {
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
  }
  
  /**
   * Standard normal PDF
   */
  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }
  
  /**
   * Calculate d1 and d2 for Black-Scholes
   */
  private calculateD1D2(params: OptionParameters): { d1: number; d2: number } {
    const { spotPrice, strike, timeToExpiry, riskFreeRate, impliedVolatility } = params;
    
    if (timeToExpiry <= 0 || impliedVolatility <= 0) {
      return { d1: 0, d2: 0 };
    }
    
    const sqrtT = Math.sqrt(timeToExpiry);
    const d1 = (Math.log(spotPrice / strike) + (riskFreeRate + 0.5 * impliedVolatility * impliedVolatility) * timeToExpiry) / (impliedVolatility * sqrtT);
    const d2 = d1 - impliedVolatility * sqrtT;
    
    return { d1, d2 };
  }
  
  /**
   * Calculate first-order Greeks
   */
  calculateFirstOrderGreeks(params: OptionParameters): { delta: number; gamma: number; vega: number; theta: number } {
    const { spotPrice, strike, timeToExpiry, riskFreeRate, impliedVolatility, optionType } = params;
    const { d1, d2 } = this.calculateD1D2(params);
    
    if (timeToExpiry <= 0) {
      // At expiry
      const intrinsic = optionType === 'call' 
        ? Math.max(spotPrice - strike, 0) 
        : Math.max(strike - spotPrice, 0);
      return {
        delta: optionType === 'call' ? (spotPrice > strike ? 1 : 0) : (spotPrice < strike ? -1 : 0),
        gamma: 0,
        vega: 0,
        theta: 0
      };
    }
    
    const sqrtT = Math.sqrt(timeToExpiry);
    const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);
    
    // Delta
    const delta = optionType === 'call' 
      ? this.normalCDF(d1) 
      : this.normalCDF(d1) - 1;
    
    // Gamma
    const gamma = this.normalPDF(d1) / (spotPrice * impliedVolatility * sqrtT);
    
    // Vega (per 1% IV change)
    const vega = spotPrice * sqrtT * this.normalPDF(d1) / 100;
    
    // Theta (per day)
    const theta1 = -(spotPrice * this.normalPDF(d1) * impliedVolatility) / (2 * sqrtT);
    const theta2 = optionType === 'call'
      ? -riskFreeRate * strike * discountFactor * this.normalCDF(d2)
      : riskFreeRate * strike * discountFactor * this.normalCDF(-d2);
    const theta = (theta1 + theta2) / 365;
    
    return { delta, gamma, vega, theta };
  }
  
  /**
   * Calculate second-order Greeks
   */
  calculateSecondOrderGreeks(params: OptionParameters): SecondOrderGreeks {
    const { spotPrice, strike, timeToExpiry, riskFreeRate, impliedVolatility, optionType } = params;
    const { d1, d2 } = this.calculateD1D2(params);
    
    if (timeToExpiry <= 0 || impliedVolatility <= 0) {
      return { vanna: 0, charm: 0, vomma: 0, veta: 0, speed: 0, zomma: 0, color: 0 };
    }
    
    const sqrtT = Math.sqrt(timeToExpiry);
    const nd1 = this.normalPDF(d1);
    const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);
    
    // Vanna: ∂Δ/∂σ = ∂Vega/∂S
    // Measures how delta changes when IV changes
    const vanna = -nd1 * d2 / impliedVolatility;
    
    // Charm: ∂Δ/∂t (Delta Bleed)
    // Measures how delta changes as time passes
    const charm = optionType === 'call'
      ? -nd1 * (2 * riskFreeRate * timeToExpiry - d2 * impliedVolatility * sqrtT) / (2 * timeToExpiry * impliedVolatility * sqrtT)
      : -nd1 * (2 * riskFreeRate * timeToExpiry - d2 * impliedVolatility * sqrtT) / (2 * timeToExpiry * impliedVolatility * sqrtT);
    
    // Vomma: ∂Vega/∂σ (Vega Convexity)
    // Measures how vega changes when IV changes
    const vomma = spotPrice * sqrtT * nd1 * d1 * d2 / impliedVolatility;
    
    // Veta: ∂Vega/∂t
    // Measures how vega changes as time passes
    const veta = -spotPrice * nd1 * sqrtT * (
      riskFreeRate * d1 / (impliedVolatility * sqrtT) - 
      (1 + d1 * d2) / (2 * timeToExpiry)
    );
    
    // Speed: ∂Γ/∂S
    // Measures how gamma changes when spot moves
    const gamma = nd1 / (spotPrice * impliedVolatility * sqrtT);
    const speed = -gamma / spotPrice * (d1 / (impliedVolatility * sqrtT) + 1);
    
    // Zomma: ∂Γ/∂σ
    // Measures how gamma changes when IV changes
    const zomma = gamma * (d1 * d2 - 1) / impliedVolatility;
    
    // Color: ∂Γ/∂t
    // Measures how gamma changes as time passes
    const color = -nd1 / (2 * spotPrice * timeToExpiry * impliedVolatility * sqrtT) * (
      2 * riskFreeRate * timeToExpiry + 1 + 
      d1 * (2 * riskFreeRate * timeToExpiry - d2 * impliedVolatility * sqrtT) / (impliedVolatility * sqrtT)
    );
    
    return { vanna, charm, vomma, veta, speed, zomma, color };
  }
}

// ============================================================================
// Friday Afternoon Effect Predictor
// ============================================================================

class FridayEffectPredictor {
  /**
   * Predict the Friday Afternoon Effect
   * 
   * Market Makers must hedge their gamma exposure as options approach expiry.
   * This creates predictable price "magnets" at high open interest strikes.
   */
  predictFridayEffect(
    symbol: string,
    currentPrice: number,
    openInterestData: { strike: number; callOI: number; putOI: number }[],
    daysToExpiry: number,
    impliedVolatility: number
  ): FridayEffectPrediction {
    // Calculate gamma exposure at each strike
    const gammaExposure: MarketMakerFlow[] = [];
    
    for (const oi of openInterestData) {
      // Simplified gamma calculation for each strike
      const moneyness = Math.abs(Math.log(currentPrice / oi.strike));
      const sqrtT = Math.sqrt(Math.max(daysToExpiry, 0.1) / 365);
      const d1 = moneyness / (impliedVolatility * sqrtT);
      const gamma = Math.exp(-0.5 * d1 * d1) / (currentPrice * impliedVolatility * sqrtT * Math.sqrt(2 * Math.PI));
      
      // Net gamma = Call OI gamma - Put OI gamma (MMs are short options)
      const netGamma = gamma * (oi.callOI - oi.putOI);
      
      // Delta hedge required = gamma * price move
      const deltaHedge = netGamma * 100; // Per $1 move
      
      gammaExposure.push({
        strike: oi.strike,
        openInterest: oi.callOI + oi.putOI,
        gamma: netGamma,
        deltaHedgeRequired: deltaHedge
      });
    }
    
    // Find "magnet" prices (high OI strikes near current price)
    const nearbyStrikes = gammaExposure
      .filter(g => Math.abs(g.strike - currentPrice) / currentPrice < 0.05)
      .sort((a, b) => b.openInterest - a.openInterest);
    
    const magnetPrices = nearbyStrikes.slice(0, 3).map(s => s.strike);
    
    // Find dominant strike (highest OI near money)
    const dominantStrike = magnetPrices[0] || currentPrice;
    
    // Calculate pinning probability based on OI concentration and time to expiry
    const totalNearbyOI = nearbyStrikes.reduce((sum, s) => sum + s.openInterest, 0);
    const totalOI = gammaExposure.reduce((sum, s) => sum + s.openInterest, 0);
    const oiConcentration = totalOI > 0 ? totalNearbyOI / totalOI : 0;
    
    // Pinning is more likely when:
    // 1. OI is concentrated near current price
    // 2. Time to expiry is short (< 3 days)
    // 3. IV is low (less expected movement)
    const timeFactor = Math.max(0, 1 - daysToExpiry / 5);
    const ivFactor = Math.max(0, 1 - impliedVolatility / 0.5);
    const pinningProbability = Math.min(0.9, oiConcentration * 0.5 + timeFactor * 0.3 + ivFactor * 0.2);
    
    // Expected price range based on IV
    const expectedMove = currentPrice * impliedVolatility * Math.sqrt(daysToExpiry / 365);
    const expectedPriceRange = {
      low: currentPrice - expectedMove,
      high: currentPrice + expectedMove
    };
    
    // Determine MM hedging direction
    const netGammaExposure = gammaExposure.reduce((sum, g) => sum + g.gamma, 0);
    let hedgingDirection: 'buy' | 'sell' | 'neutral' = 'neutral';
    let hedgingIntensity = 0;
    
    if (netGammaExposure > 0.01) {
      // MMs are short gamma, will buy on dips and sell on rallies (stabilizing)
      hedgingDirection = currentPrice < dominantStrike ? 'buy' : 'sell';
      hedgingIntensity = Math.min(1, Math.abs(netGammaExposure) * 10);
    } else if (netGammaExposure < -0.01) {
      // MMs are long gamma, will sell on dips and buy on rallies (destabilizing)
      hedgingDirection = currentPrice < dominantStrike ? 'sell' : 'buy';
      hedgingIntensity = Math.min(1, Math.abs(netGammaExposure) * 10);
    }
    
    // Generate recommendation
    let recommendation = '';
    if (daysToExpiry <= 2 && pinningProbability > 0.6) {
      recommendation = `High probability (${(pinningProbability * 100).toFixed(0)}%) of pinning to $${dominantStrike}. Consider selling premium at this strike.`;
    } else if (hedgingIntensity > 0.5) {
      recommendation = `Strong MM hedging flow expected. ${hedgingDirection === 'buy' ? 'Support' : 'Resistance'} likely near $${dominantStrike}.`;
    } else {
      recommendation = `Normal market conditions. No significant Friday effect expected.`;
    }
    
    return {
      symbol,
      currentPrice,
      magnetPrices,
      expectedPriceRange,
      pinningProbability,
      dominantStrike,
      hedgingDirection,
      hedgingIntensity,
      recommendation
    };
  }
}

// ============================================================================
// Main Second-Order Greeks Analyzer
// ============================================================================

export class SecondOrderGreeksAnalyzer {
  private bsCalculator: BlackScholesCalculator;
  private fridayPredictor: FridayEffectPredictor;
  
  constructor() {
    this.bsCalculator = new BlackScholesCalculator();
    this.fridayPredictor = new FridayEffectPredictor();
  }
  
  /**
   * Analyze second-order Greeks for a single option position
   */
  analyzePosition(params: OptionParameters): SecondOrderAnalysis {
    const greeks = this.bsCalculator.calculateSecondOrderGreeks(params);
    const firstOrder = this.bsCalculator.calculateFirstOrderGreeks(params);
    
    // Calculate risk metrics
    const vannaRisk = Math.abs(greeks.vanna * params.impliedVolatility * 0.1); // Risk from 10% IV move
    const charmRisk = Math.abs(greeks.charm * (1/365)); // Risk from 1 day passing
    const totalSecondOrderRisk = vannaRisk + charmRisk + Math.abs(greeks.vomma * 0.01);
    
    // Generate hedging recommendation
    let hedgingRecommendation = '';
    
    if (Math.abs(greeks.vanna) > 0.1) {
      hedgingRecommendation += `High Vanna (${greeks.vanna.toFixed(3)}): Delta will shift ${greeks.vanna > 0 ? 'up' : 'down'} if IV rises. `;
    }
    
    if (Math.abs(greeks.charm) > 0.01) {
      hedgingRecommendation += `Significant Charm (${greeks.charm.toFixed(4)}): Delta will decay ${greeks.charm > 0 ? 'toward 0' : 'away from 0'} daily. `;
    }
    
    if (params.timeToExpiry < 7/365 && Math.abs(firstOrder.gamma) > 0.05) {
      hedgingRecommendation += `Near expiry with high gamma: Expect rapid delta changes. Consider closing or rolling. `;
    }
    
    if (!hedgingRecommendation) {
      hedgingRecommendation = 'Second-order risks are within normal bounds. No immediate hedging action required.';
    }
    
    return {
      position: params,
      greeks,
      riskMetrics: {
        vannaRisk,
        charmRisk,
        totalSecondOrderRisk
      },
      hedgingRecommendation
    };
  }
  
  /**
   * Analyze portfolio-level second-order Greeks
   */
  analyzePortfolio(positions: OptionParameters[]): {
    totalVanna: number;
    totalCharm: number;
    totalVomma: number;
    totalVeta: number;
    portfolioRisk: number;
    recommendations: string[];
  } {
    let totalVanna = 0;
    let totalCharm = 0;
    let totalVomma = 0;
    let totalVeta = 0;
    let portfolioRisk = 0;
    
    for (const position of positions) {
      const analysis = this.analyzePosition(position);
      totalVanna += analysis.greeks.vanna;
      totalCharm += analysis.greeks.charm;
      totalVomma += analysis.greeks.vomma;
      totalVeta += analysis.greeks.veta;
      portfolioRisk += analysis.riskMetrics.totalSecondOrderRisk;
    }
    
    const recommendations: string[] = [];
    
    if (Math.abs(totalVanna) > 0.5) {
      recommendations.push(
        `⚠️ High portfolio Vanna (${totalVanna.toFixed(2)}): ${totalVanna > 0 ? 'Long' : 'Short'} vanna exposure. ` +
        `Delta will ${totalVanna > 0 ? 'increase' : 'decrease'} significantly if IV rises.`
      );
    }
    
    if (Math.abs(totalCharm) > 0.05) {
      recommendations.push(
        `⏰ Significant Charm exposure (${totalCharm.toFixed(3)}): Portfolio delta will shift ${Math.abs(totalCharm * 7).toFixed(2)} over the next week.`
      );
    }
    
    if (Math.abs(totalVomma) > 1) {
      recommendations.push(
        `📊 High Vomma (${totalVomma.toFixed(2)}): Vega exposure will ${totalVomma > 0 ? 'increase' : 'decrease'} as IV rises.`
      );
    }
    
    if (portfolioRisk > 0.5) {
      recommendations.push(
        `🚨 Elevated second-order risk (${portfolioRisk.toFixed(2)}). Consider reducing position sizes or hedging.`
      );
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Second-order Greeks are balanced. Portfolio is well-hedged against higher-order risks.');
    }
    
    return {
      totalVanna,
      totalCharm,
      totalVomma,
      totalVeta,
      portfolioRisk,
      recommendations
    };
  }
  
  /**
   * Predict Friday Afternoon Effect for a symbol
   */
  predictFridayEffect(
    symbol: string,
    currentPrice: number,
    openInterestData: { strike: number; callOI: number; putOI: number }[],
    daysToExpiry: number,
    impliedVolatility: number
  ): FridayEffectPrediction {
    return this.fridayPredictor.predictFridayEffect(
      symbol, currentPrice, openInterestData, daysToExpiry, impliedVolatility
    );
  }
  
  /**
   * Get visualization data for second-order Greeks surface
   */
  generateGreeksSurface(
    spotPrice: number,
    strike: number,
    riskFreeRate: number,
    optionType: 'call' | 'put'
  ): {
    timeRange: number[];
    ivRange: number[];
    vannaSurface: number[][];
    charmSurface: number[][];
  } {
    const timeRange = [1, 7, 14, 30, 60, 90, 180, 365].map(d => d / 365);
    const ivRange = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0];
    
    const vannaSurface: number[][] = [];
    const charmSurface: number[][] = [];
    
    for (const t of timeRange) {
      const vannaRow: number[] = [];
      const charmRow: number[] = [];
      
      for (const iv of ivRange) {
        const params: OptionParameters = {
          spotPrice,
          strike,
          timeToExpiry: t,
          riskFreeRate,
          impliedVolatility: iv,
          optionType
        };
        
        const greeks = this.bsCalculator.calculateSecondOrderGreeks(params);
        vannaRow.push(greeks.vanna);
        charmRow.push(greeks.charm);
      }
      
      vannaSurface.push(vannaRow);
      charmSurface.push(charmRow);
    }
    
    return { timeRange, ivRange, vannaSurface, charmSurface };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSecondOrderGreeksAnalyzer(): SecondOrderGreeksAnalyzer {
  return new SecondOrderGreeksAnalyzer();
}
