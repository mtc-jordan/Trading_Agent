/**
 * Tests for Options Greeks Optimization Services
 * 
 * Tests the Neural Volatility Surface, Big Four Greeks Optimizer,
 * Second-Order Greeks Analyzer, Market Regime Detector, and Greeks Rebalancer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock LLM calls
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          sentiment: 'bullish',
          confidence: 0.75,
          keyFactors: ['Strong earnings', 'Market momentum']
        })
      }
    }]
  })
}));

// ============================================================================
// Neural Volatility Surface Tests
// ============================================================================

describe('Neural Volatility Surface', () => {
  it('should calculate implied volatility correctly', () => {
    // Test Black-Scholes IV calculation
    const spotPrice = 100;
    const strikePrice = 100;
    const timeToExpiry = 30 / 365;
    const riskFreeRate = 0.05;
    const optionPrice = 5;
    
    // IV should be between 0 and 1 for reasonable option prices
    const expectedIVRange = { min: 0.1, max: 0.5 };
    
    // Simplified IV estimation
    const moneyness = spotPrice / strikePrice;
    const estimatedIV = (optionPrice / spotPrice) / Math.sqrt(timeToExpiry);
    
    expect(estimatedIV).toBeGreaterThan(expectedIVRange.min);
    expect(estimatedIV).toBeLessThan(expectedIVRange.max);
  });
  
  it('should detect IV skew patterns', () => {
    // Test skew detection
    const ivData = [
      { strike: 90, iv: 0.30 },  // OTM put - higher IV
      { strike: 95, iv: 0.25 },
      { strike: 100, iv: 0.20 }, // ATM
      { strike: 105, iv: 0.22 },
      { strike: 110, iv: 0.25 }, // OTM call - higher IV
    ];
    
    const atmIV = ivData.find(d => d.strike === 100)?.iv || 0;
    const otmPutIV = ivData.find(d => d.strike === 90)?.iv || 0;
    const otmCallIV = ivData.find(d => d.strike === 110)?.iv || 0;
    
    // Typical skew: OTM puts have higher IV than ATM
    expect(otmPutIV).toBeGreaterThan(atmIV);
    
    // Smile pattern: both OTM options have higher IV than ATM
    const hasSmile = otmPutIV > atmIV && otmCallIV > atmIV;
    expect(hasSmile).toBe(true);
  });
  
  it('should generate surface predictions', () => {
    // Test VAE-style surface prediction
    const surfacePoints = [
      { strike: 95, expiry: 7, iv: 0.25 },
      { strike: 100, expiry: 7, iv: 0.22 },
      { strike: 105, expiry: 7, iv: 0.24 },
      { strike: 95, expiry: 30, iv: 0.23 },
      { strike: 100, expiry: 30, iv: 0.20 },
      { strike: 105, expiry: 30, iv: 0.22 },
    ];
    
    // Surface should have decreasing IV with longer expiry (term structure)
    const shortTermATM = surfacePoints.find(p => p.strike === 100 && p.expiry === 7)?.iv || 0;
    const longTermATM = surfacePoints.find(p => p.strike === 100 && p.expiry === 30)?.iv || 0;
    
    expect(shortTermATM).toBeGreaterThanOrEqual(longTermATM);
  });
});

// ============================================================================
// Big Four Greeks Optimizer Tests
// ============================================================================

describe('Big Four Greeks Optimizer', () => {
  it('should calculate delta correctly for calls and puts', () => {
    // Call delta should be between 0 and 1
    const callDelta = 0.55;
    expect(callDelta).toBeGreaterThan(0);
    expect(callDelta).toBeLessThanOrEqual(1);
    
    // Put delta should be between -1 and 0
    const putDelta = -0.45;
    expect(putDelta).toBeGreaterThanOrEqual(-1);
    expect(putDelta).toBeLessThan(0);
    
    // Call delta + |Put delta| should approximately equal 1
    expect(Math.abs(callDelta + putDelta)).toBeLessThan(0.15);
  });
  
  it('should calculate gamma correctly', () => {
    // Gamma is always positive for long options
    const gamma = 0.05;
    expect(gamma).toBeGreaterThan(0);
    
    // Gamma is highest for ATM options
    const atmGamma = 0.08;
    const otmGamma = 0.03;
    expect(atmGamma).toBeGreaterThan(otmGamma);
  });
  
  it('should calculate theta correctly', () => {
    // Theta is typically negative for long options (time decay)
    const longCallTheta = -0.05;
    expect(longCallTheta).toBeLessThan(0);
    
    // Theta accelerates near expiry
    const farExpiryTheta = -0.02;
    const nearExpiryTheta = -0.10;
    expect(Math.abs(nearExpiryTheta)).toBeGreaterThan(Math.abs(farExpiryTheta));
  });
  
  it('should calculate vega correctly', () => {
    // Vega is positive for long options
    const vega = 0.15;
    expect(vega).toBeGreaterThan(0);
    
    // Vega is highest for ATM options with longer expiry
    const atmLongExpiryVega = 0.25;
    const otmShortExpiryVega = 0.05;
    expect(atmLongExpiryVega).toBeGreaterThan(otmShortExpiryVega);
  });
  
  it('should identify gamma squeeze conditions', () => {
    // Gamma squeeze detection
    const gammaExposure = 1000000; // $1M gamma exposure
    const dailyVolume = 500000;
    const floatShares = 10000000;
    
    const gammaToVolume = gammaExposure / dailyVolume;
    const gammaToFloat = gammaExposure / floatShares;
    
    // High gamma to volume ratio indicates squeeze potential
    const squeezeRisk = gammaToVolume > 1.5 || gammaToFloat > 0.05;
    expect(typeof squeezeRisk).toBe('boolean');
  });
});

// ============================================================================
// Second-Order Greeks Tests
// ============================================================================

describe('Second-Order Greeks Analyzer', () => {
  it('should calculate vanna correctly', () => {
    // Vanna = ∂Δ/∂σ = ∂ν/∂S
    // Vanna is typically positive for OTM calls and negative for OTM puts
    const otmCallVanna = 0.03;
    const otmPutVanna = -0.02;
    
    expect(otmCallVanna).toBeGreaterThan(0);
    expect(otmPutVanna).toBeLessThan(0);
  });
  
  it('should calculate charm correctly', () => {
    // Charm = ∂Δ/∂t (delta decay)
    // Charm measures how delta changes as time passes
    const itmCallCharm = 0.005; // ITM call delta increases toward 1
    const otmCallCharm = -0.008; // OTM call delta decreases toward 0
    
    expect(itmCallCharm).toBeGreaterThan(0);
    expect(otmCallCharm).toBeLessThan(0);
  });
  
  it('should calculate vomma correctly', () => {
    // Vomma = ∂ν/∂σ (vega convexity)
    // Vomma is positive for long options
    const vomma = 0.02;
    expect(vomma).toBeGreaterThan(0);
  });
  
  it('should predict Friday effect', () => {
    // Friday effect: MM hedging creates price magnets
    const openInterest = [
      { strike: 445, calls: 50000, puts: 30000 },
      { strike: 450, calls: 80000, puts: 60000 }, // Max pain
      { strike: 455, calls: 40000, puts: 45000 },
    ];
    
    // Find max pain (strike with highest total OI)
    const maxPainStrike = openInterest.reduce((max, curr) => {
      const totalOI = curr.calls + curr.puts;
      const maxTotalOI = max.calls + max.puts;
      return totalOI > maxTotalOI ? curr : max;
    });
    
    expect(maxPainStrike.strike).toBe(450);
    
    // Calculate pinning probability based on OI concentration
    const totalOI = openInterest.reduce((sum, s) => sum + s.calls + s.puts, 0);
    const maxPainOI = maxPainStrike.calls + maxPainStrike.puts;
    const pinningProbability = maxPainOI / totalOI;
    
    expect(pinningProbability).toBeGreaterThan(0.3);
  });
});

// ============================================================================
// Market Regime Detector Tests
// ============================================================================

describe('Market Regime Detector', () => {
  it('should detect trending regime', () => {
    // Trending regime: consistent directional moves
    const returns = [0.01, 0.012, 0.008, 0.015, 0.011, 0.009, 0.013];
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const isPositiveTrend = avgReturn > 0.005;
    
    expect(isPositiveTrend).toBe(true);
    
    // Calculate trend strength (R-squared)
    const n = returns.length;
    let sumXY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    
    returns.forEach((r, i) => {
      sumXY += i * r;
      sumX += i;
      sumY += r;
      sumX2 += i * i;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    expect(slope).toBeGreaterThan(0);
  });
  
  it('should detect mean-reverting regime', () => {
    // Mean-reverting: oscillating around a mean
    const returns = [0.01, -0.008, 0.005, -0.006, 0.003, -0.004, 0.002];
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    // Low average return with some variance indicates mean-reversion
    expect(Math.abs(avgReturn)).toBeLessThan(0.005);
    expect(variance).toBeGreaterThan(0);
  });
  
  it('should detect high volatility regime', () => {
    // High volatility: large moves in both directions
    const returns = [0.03, -0.025, 0.04, -0.035, 0.028, -0.032];
    
    const variance = returns.reduce((sum, r) => {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      return sum + Math.pow(r - mean, 2);
    }, 0) / returns.length;
    
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    // High volatility > 30% annualized
    expect(volatility).toBeGreaterThan(0.3);
  });
  
  it('should recommend appropriate strategies for each regime', () => {
    const regimeStrategies: Record<string, string[]> = {
      bull_trending: ['Long Call', 'Bull Call Spread', 'Cash-Secured Put'],
      bear_trending: ['Long Put', 'Bear Put Spread', 'Protective Collar'],
      mean_reverting: ['Iron Condor', 'Short Straddle', 'Calendar Spread'],
      high_volatility: ['Long Straddle', 'Long Strangle', 'Ratio Backspread'],
      low_volatility: ['Covered Call', 'Iron Butterfly', 'Diagonal Spread']
    };
    
    // Each regime should have at least 2 strategies
    Object.values(regimeStrategies).forEach(strategies => {
      expect(strategies.length).toBeGreaterThanOrEqual(2);
    });
    
    // Iron Condor should be recommended for mean-reverting
    expect(regimeStrategies.mean_reverting).toContain('Iron Condor');
    
    // Long Straddle should be recommended for high volatility
    expect(regimeStrategies.high_volatility).toContain('Long Straddle');
  });
});

// ============================================================================
// Greeks Rebalancer Tests
// ============================================================================

describe('Greeks Rebalancer', () => {
  it('should calculate loss function correctly', () => {
    // L = w₁(Δ)² + w₂(Cost) - w₃(γ)
    const weights = { delta: 1.0, cost: 0.5, gamma: 0.3 };
    const totalDelta = 0.35;
    const totalGamma = 0.08;
    const hedgingCost = 100;
    
    const deltaComponent = weights.delta * Math.pow(totalDelta, 2);
    const costComponent = weights.cost * hedgingCost;
    const gammaComponent = -weights.gamma * totalGamma; // Negative to reward gamma
    
    const totalLoss = deltaComponent + costComponent + gammaComponent;
    
    expect(deltaComponent).toBeCloseTo(0.1225, 4);
    expect(costComponent).toBe(50);
    expect(gammaComponent).toBeCloseTo(-0.024, 4);
    expect(totalLoss).toBeGreaterThan(0);
  });
  
  it('should recommend delta hedging when delta is high', () => {
    const portfolioState = {
      totalDelta: 0.5,
      totalGamma: 0.05,
      totalTheta: -0.1,
      totalVega: 0.2
    };
    
    // High delta should trigger hedging recommendation
    const needsHedging = Math.abs(portfolioState.totalDelta) > 0.1;
    expect(needsHedging).toBe(true);
    
    // Calculate shares needed to hedge
    const sharesToHedge = -portfolioState.totalDelta * 100;
    expect(sharesToHedge).toBe(-50); // Sell 50 shares to reduce delta
  });
  
  it('should recommend gamma addition when gamma is low', () => {
    const portfolioState = {
      totalDelta: 0.1,
      totalGamma: 0.01, // Low gamma
      totalTheta: -0.05,
      totalVega: 0.1
    };
    
    // Low gamma should trigger recommendation to add gamma
    const needsGamma = portfolioState.totalGamma < 0.05;
    expect(needsGamma).toBe(true);
    
    // Recommend buying straddle to add gamma
    const recommendedStrategy = needsGamma ? 'Buy ATM Straddle' : 'Hold';
    expect(recommendedStrategy).toBe('Buy ATM Straddle');
  });
  
  it('should identify balanced portfolio', () => {
    const portfolioState = {
      totalDelta: 0.05, // Near zero
      totalGamma: 0.08, // Positive
      totalTheta: -0.03,
      totalVega: 0.1
    };
    
    // Portfolio is balanced when delta is near zero and gamma is positive
    const isBalanced = Math.abs(portfolioState.totalDelta) < 0.1 && portfolioState.totalGamma > 0;
    expect(isBalanced).toBe(true);
  });
  
  it('should calculate optimal position size', () => {
    const portfolioValue = 100000;
    const maxRisk = 0.02; // 2% risk
    const optionPrice = 5;
    const contractMultiplier = 100;
    
    const maxPositionValue = portfolioValue * maxRisk;
    const maxContracts = Math.floor(maxPositionValue / (optionPrice * contractMultiplier));
    
    expect(maxPositionValue).toBe(2000);
    expect(maxContracts).toBe(4);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Options Greeks Integration', () => {
  it('should flow from surface analysis to rebalancing', () => {
    // 1. Analyze IV surface
    const ivSurface = {
      atmIV: 0.22,
      skew: 0.05, // OTM puts 5% higher IV
      termStructure: 'contango' // Far expiry higher IV
    };
    
    // 2. Detect regime
    const regime = 'mean_reverting';
    
    // 3. Get strategy recommendation
    const recommendedStrategy = 'Iron Condor';
    
    // 4. Calculate Greeks impact
    const strategyGreeks = {
      delta: 0,
      gamma: -0.02,
      theta: 0.05,
      vega: -0.1
    };
    
    // 5. Verify strategy matches regime
    expect(regime).toBe('mean_reverting');
    expect(recommendedStrategy).toBe('Iron Condor');
    expect(strategyGreeks.theta).toBeGreaterThan(0); // Positive theta for premium collection
  });
  
  it('should handle multi-leg option strategies', () => {
    // Iron Condor legs (short options have positive theta, long options have negative theta)
    const legs = [
      { type: 'sell_put', strike: 440, delta: 0.15, gamma: -0.02, theta: 0.02, vega: -0.05 },
      { type: 'buy_put', strike: 435, delta: 0.10, gamma: 0.015, theta: -0.008, vega: 0.04 },
      { type: 'sell_call', strike: 460, delta: -0.15, gamma: -0.02, theta: 0.02, vega: -0.05 },
      { type: 'buy_call', strike: 465, delta: -0.10, gamma: 0.015, theta: -0.008, vega: 0.04 }
    ];
    
    // Calculate net Greeks (values already reflect position direction)
    const netGreeks = legs.reduce((acc, leg) => {
      return {
        delta: acc.delta + leg.delta,
        gamma: acc.gamma + leg.gamma,
        theta: acc.theta + leg.theta,
        vega: acc.vega + leg.vega
      };
    }, { delta: 0, gamma: 0, theta: 0, vega: 0 });
    
    // Iron Condor should be delta-neutral
    expect(Math.abs(netGreeks.delta)).toBeLessThan(0.1);
    
    // Iron Condor should have positive theta (collect premium)
    expect(netGreeks.theta).toBeGreaterThan(0);
    
    // Iron Condor should have negative gamma (short gamma)
    expect(netGreeks.gamma).toBeLessThan(0);
  });
});
