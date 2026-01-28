/**
 * Live Volatility Surface Integration
 * Connects Alpaca live options data with Neural Volatility Surface analysis
 * Provides real-time IV surface modeling and predictions
 */

import {
  fetchOptionsChain,
  buildIVSurface,
  getTermStructure,
  getSkew,
  EnhancedOptionData,
  IVSurfacePoint
} from './alpacaOptions';

import {
  analyzeLiveOptions,
  getLiveIVSurface,
  OptionsAnalysisResult
} from './liveOptionsAnalyzer';

// Surface analysis types
export interface VolatilitySurfaceAnalysis {
  underlying: string;
  spotPrice: number;
  timestamp: Date;
  
  // Surface metrics
  atmIV: number;
  ivRank: number;           // Current IV vs 52-week range (0-100)
  ivPercentile: number;     // % of days IV was lower
  
  // Skew analysis
  skewType: 'normal' | 'inverted' | 'smile' | 'smirk';
  skewSteepness: number;    // Slope of the skew
  putSkew25Delta: number;   // 25 delta put IV - ATM IV
  callSkew25Delta: number;  // 25 delta call IV - ATM IV
  
  // Term structure
  termStructureType: 'contango' | 'backwardation' | 'flat' | 'humped';
  frontMonthIV: number;
  backMonthIV: number;
  termSpread: number;       // Back month - Front month IV
  
  // Surface shape
  surfacePoints: IVSurfacePoint[];
  interpolatedSurface: InterpolatedSurface;
  
  // Anomalies and opportunities
  anomalies: SurfaceAnomaly[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  
  // Predictions
  predictions: VolatilityPrediction[];
}

export interface InterpolatedSurface {
  strikes: number[];
  expirations: number[];    // Days to expiry
  ivMatrix: number[][];     // [strike][expiry] -> IV
}

export interface SurfaceAnomaly {
  type: 'iv_spike' | 'iv_dip' | 'skew_anomaly' | 'term_anomaly' | 'butterfly_spread';
  strike: number;
  daysToExpiry: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  expectedIV: number;
  actualIV: number;
  deviation: number;
}

export interface ArbitrageOpportunity {
  type: 'calendar_spread' | 'butterfly' | 'box_spread' | 'conversion';
  legs: {
    strike: number;
    expiry: number;
    type: 'call' | 'put';
    action: 'buy' | 'sell';
    iv: number;
  }[];
  expectedProfit: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface VolatilityPrediction {
  horizon: '1d' | '1w' | '1m';
  predictedIV: number;
  confidence: number;
  direction: 'up' | 'down' | 'stable';
  catalyst?: string;
}

// Historical IV data for rank/percentile calculation
interface HistoricalIVData {
  date: Date;
  atmIV: number;
  highIV: number;
  lowIV: number;
}

// Cache for historical data
const historicalIVCache = new Map<string, HistoricalIVData[]>();

/**
 * Analyze live volatility surface for an underlying
 */
export async function analyzeLiveVolatilitySurface(
  underlying: string,
  spotPrice: number
): Promise<VolatilitySurfaceAnalysis> {
  console.log(`[LiveVolSurface] Analyzing volatility surface for ${underlying}`);
  
  // Get live options data
  const { surface, skew, termStructure } = await getLiveIVSurface(underlying, spotPrice);
  
  // Get full analysis
  const analysis = await analyzeLiveOptions(underlying, spotPrice);
  
  // Calculate IV rank and percentile
  const { ivRank, ivPercentile } = calculateIVRankPercentile(underlying, analysis.atmIV);
  
  // Analyze skew
  const skewAnalysis = analyzeSkew(skew, spotPrice);
  
  // Analyze term structure
  const termAnalysis = analyzeTermStructure(termStructure);
  
  // Build interpolated surface
  const interpolatedSurface = buildInterpolatedSurface(surface, spotPrice);
  
  // Detect anomalies
  const anomalies = detectSurfaceAnomalies(surface, interpolatedSurface, spotPrice);
  
  // Find arbitrage opportunities
  const arbitrageOpportunities = findArbitrageOpportunities(surface, spotPrice);
  
  // Generate predictions
  const predictions = generateVolatilityPredictions(
    analysis.atmIV,
    ivRank,
    skewAnalysis,
    termAnalysis
  );
  
  return {
    underlying,
    spotPrice,
    timestamp: new Date(),
    atmIV: analysis.atmIV,
    ivRank,
    ivPercentile,
    skewType: skewAnalysis.type,
    skewSteepness: skewAnalysis.steepness,
    putSkew25Delta: skewAnalysis.put25Delta,
    callSkew25Delta: skewAnalysis.call25Delta,
    termStructureType: termAnalysis.type,
    frontMonthIV: termAnalysis.frontMonth,
    backMonthIV: termAnalysis.backMonth,
    termSpread: termAnalysis.spread,
    surfacePoints: surface,
    interpolatedSurface,
    anomalies,
    arbitrageOpportunities,
    predictions
  };
}

/**
 * Calculate IV rank and percentile
 */
function calculateIVRankPercentile(
  underlying: string,
  currentIV: number
): { ivRank: number; ivPercentile: number } {
  const historical = historicalIVCache.get(underlying) || [];
  
  if (historical.length === 0) {
    // No historical data, return neutral values
    return { ivRank: 50, ivPercentile: 50 };
  }
  
  // Calculate 52-week high and low
  const last52Weeks = historical.filter(h => 
    h.date.getTime() > Date.now() - 365 * 24 * 60 * 60 * 1000
  );
  
  if (last52Weeks.length === 0) {
    return { ivRank: 50, ivPercentile: 50 };
  }
  
  const highIV = Math.max(...last52Weeks.map(h => h.highIV));
  const lowIV = Math.min(...last52Weeks.map(h => h.lowIV));
  
  // IV Rank = (Current IV - 52w Low) / (52w High - 52w Low) * 100
  const ivRank = highIV !== lowIV 
    ? ((currentIV - lowIV) / (highIV - lowIV)) * 100
    : 50;
  
  // IV Percentile = % of days where IV was lower
  const daysLower = last52Weeks.filter(h => h.atmIV < currentIV).length;
  const ivPercentile = (daysLower / last52Weeks.length) * 100;
  
  return {
    ivRank: Math.max(0, Math.min(100, ivRank)),
    ivPercentile: Math.max(0, Math.min(100, ivPercentile))
  };
}

/**
 * Analyze volatility skew
 */
function analyzeSkew(
  skew: { strike: number; moneyness: number; callIV: number; putIV: number }[],
  spotPrice: number
): {
  type: 'normal' | 'inverted' | 'smile' | 'smirk';
  steepness: number;
  put25Delta: number;
  call25Delta: number;
} {
  if (skew.length < 3) {
    return { type: 'normal', steepness: 0, put25Delta: 0, call25Delta: 0 };
  }
  
  // Find ATM and 25 delta points
  const atmPoint = skew.reduce((closest, point) => 
    Math.abs(point.moneyness - 1) < Math.abs(closest.moneyness - 1) ? point : closest
  );
  
  const atmIV = (atmPoint.callIV + atmPoint.putIV) / 2;
  
  // 25 delta put is typically around 0.90-0.95 moneyness
  const put25Delta = skew.find(s => s.moneyness >= 0.90 && s.moneyness <= 0.95);
  // 25 delta call is typically around 1.05-1.10 moneyness
  const call25Delta = skew.find(s => s.moneyness >= 1.05 && s.moneyness <= 1.10);
  
  const put25DeltaSkew = put25Delta ? put25Delta.putIV - atmIV : 0;
  const call25DeltaSkew = call25Delta ? call25Delta.callIV - atmIV : 0;
  
  // Determine skew type
  let type: 'normal' | 'inverted' | 'smile' | 'smirk' = 'normal';
  
  if (put25DeltaSkew > 0.02 && call25DeltaSkew > 0.02) {
    type = 'smile';
  } else if (put25DeltaSkew > 0.02 && call25DeltaSkew < 0.01) {
    type = 'smirk';
  } else if (put25DeltaSkew < -0.01 && call25DeltaSkew > 0.02) {
    type = 'inverted';
  }
  
  // Calculate steepness (slope of OTM puts)
  const otmPuts = skew.filter(s => s.moneyness < 1);
  let steepness = 0;
  
  if (otmPuts.length >= 2) {
    const sorted = otmPuts.sort((a, b) => a.moneyness - b.moneyness);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    steepness = (first.putIV - last.putIV) / (last.moneyness - first.moneyness);
  }
  
  return {
    type,
    steepness,
    put25Delta: put25DeltaSkew,
    call25Delta: call25DeltaSkew
  };
}

/**
 * Analyze term structure
 */
function analyzeTermStructure(
  termStructure: { daysToExpiry: number; avgIV: number; atmIV: number }[]
): {
  type: 'contango' | 'backwardation' | 'flat' | 'humped';
  frontMonth: number;
  backMonth: number;
  spread: number;
} {
  if (termStructure.length < 2) {
    return { type: 'flat', frontMonth: 0, backMonth: 0, spread: 0 };
  }
  
  const sorted = termStructure.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  const frontMonth = sorted[0].atmIV;
  const backMonth = sorted[sorted.length - 1].atmIV;
  const spread = backMonth - frontMonth;
  
  // Check for humped structure (middle higher than ends)
  let type: 'contango' | 'backwardation' | 'flat' | 'humped' = 'flat';
  
  if (sorted.length >= 3) {
    const middleIdx = Math.floor(sorted.length / 2);
    const middleIV = sorted[middleIdx].atmIV;
    
    if (middleIV > frontMonth && middleIV > backMonth) {
      type = 'humped';
    } else if (spread > 0.02) {
      type = 'contango';
    } else if (spread < -0.02) {
      type = 'backwardation';
    }
  } else {
    if (spread > 0.02) {
      type = 'contango';
    } else if (spread < -0.02) {
      type = 'backwardation';
    }
  }
  
  return { type, frontMonth, backMonth, spread };
}

/**
 * Build interpolated surface for visualization
 */
function buildInterpolatedSurface(
  points: IVSurfacePoint[],
  spotPrice: number
): InterpolatedSurface {
  // Get unique strikes and expirations
  const strikes = Array.from(new Set(points.map(p => p.strike))).sort((a, b) => a - b);
  const expirations = Array.from(new Set(points.map(p => p.daysToExpiry))).sort((a, b) => a - b);
  
  // Build IV matrix
  const ivMatrix: number[][] = [];
  
  for (let i = 0; i < strikes.length; i++) {
    ivMatrix[i] = [];
    for (let j = 0; j < expirations.length; j++) {
      // Find closest point
      const point = points.find(p => 
        p.strike === strikes[i] && p.daysToExpiry === expirations[j]
      );
      
      if (point) {
        ivMatrix[i][j] = point.iv;
      } else {
        // Interpolate from nearby points
        ivMatrix[i][j] = interpolateIV(points, strikes[i], expirations[j]);
      }
    }
  }
  
  return { strikes, expirations, ivMatrix };
}

/**
 * Simple bilinear interpolation for IV
 */
function interpolateIV(
  points: IVSurfacePoint[],
  targetStrike: number,
  targetExpiry: number
): number {
  // Find 4 nearest points
  const nearby = points
    .map(p => ({
      ...p,
      distance: Math.sqrt(
        Math.pow((p.strike - targetStrike) / targetStrike, 2) +
        Math.pow((p.daysToExpiry - targetExpiry) / Math.max(targetExpiry, 1), 2)
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);
  
  if (nearby.length === 0) return 0.3; // Default IV
  
  // Weighted average by inverse distance
  let totalWeight = 0;
  let weightedIV = 0;
  
  for (const point of nearby) {
    const weight = 1 / (point.distance + 0.0001);
    totalWeight += weight;
    weightedIV += point.iv * weight;
  }
  
  return weightedIV / totalWeight;
}

/**
 * Detect surface anomalies
 */
function detectSurfaceAnomalies(
  points: IVSurfacePoint[],
  interpolated: InterpolatedSurface,
  spotPrice: number
): SurfaceAnomaly[] {
  const anomalies: SurfaceAnomaly[] = [];
  
  for (const point of points) {
    // Get expected IV from interpolated surface
    const expectedIV = interpolateIV(
      points.filter(p => p !== point),
      point.strike,
      point.daysToExpiry
    );
    
    const deviation = (point.iv - expectedIV) / expectedIV;
    
    // Check for significant deviations
    if (Math.abs(deviation) > 0.15) {
      anomalies.push({
        type: deviation > 0 ? 'iv_spike' : 'iv_dip',
        strike: point.strike,
        daysToExpiry: point.daysToExpiry,
        severity: Math.abs(deviation) > 0.3 ? 'high' : Math.abs(deviation) > 0.2 ? 'medium' : 'low',
        description: `IV at $${point.strike} strike (${point.daysToExpiry}d) is ${(deviation * 100).toFixed(1)}% ${deviation > 0 ? 'above' : 'below'} expected`,
        expectedIV,
        actualIV: point.iv,
        deviation
      });
    }
  }
  
  // Check for butterfly spread anomalies (convexity violations)
  const byExpiry = new Map<number, IVSurfacePoint[]>();
  for (const point of points) {
    const existing = byExpiry.get(point.daysToExpiry) || [];
    existing.push(point);
    byExpiry.set(point.daysToExpiry, existing);
  }
  
  for (const [expiry, expiryPoints] of Array.from(byExpiry.entries())) {
    const sorted = expiryPoints.sort((a, b) => a.strike - b.strike);
    
    for (let i = 1; i < sorted.length - 1; i++) {
      const lower = sorted[i - 1];
      const middle = sorted[i];
      const upper = sorted[i + 1];
      
      // Butterfly should have positive value (convexity)
      const butterflyValue = (lower.iv + upper.iv) / 2 - middle.iv;
      
      if (butterflyValue < -0.02) {
        anomalies.push({
          type: 'butterfly_spread',
          strike: middle.strike,
          daysToExpiry: expiry,
          severity: butterflyValue < -0.05 ? 'high' : 'medium',
          description: `Negative butterfly at $${middle.strike} strike suggests arbitrage opportunity`,
          expectedIV: (lower.iv + upper.iv) / 2,
          actualIV: middle.iv,
          deviation: butterflyValue
        });
      }
    }
  }
  
  return anomalies;
}

/**
 * Find potential arbitrage opportunities
 */
function findArbitrageOpportunities(
  points: IVSurfacePoint[],
  spotPrice: number
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Group by expiry
  const byExpiry = new Map<number, IVSurfacePoint[]>();
  for (const point of points) {
    const existing = byExpiry.get(point.daysToExpiry) || [];
    existing.push(point);
    byExpiry.set(point.daysToExpiry, existing);
  }
  
  // Check for calendar spread opportunities
  const expiries = Array.from(byExpiry.keys()).sort((a, b) => a - b);
  
  for (let i = 0; i < expiries.length - 1; i++) {
    const frontExpiry = expiries[i];
    const backExpiry = expiries[i + 1];
    
    const frontPoints = byExpiry.get(frontExpiry) || [];
    const backPoints = byExpiry.get(backExpiry) || [];
    
    // Find ATM strikes in both
    const frontATM = frontPoints.find(p => 
      Math.abs(p.strike - spotPrice) / spotPrice < 0.05
    );
    const backATM = backPoints.find(p => 
      Math.abs(p.strike - spotPrice) / spotPrice < 0.05
    );
    
    if (frontATM && backATM) {
      const ivDiff = frontATM.iv - backATM.iv;
      
      // If front month IV is significantly higher, calendar spread opportunity
      if (ivDiff > 0.05) {
        opportunities.push({
          type: 'calendar_spread',
          legs: [
            { strike: frontATM.strike, expiry: frontExpiry, type: 'call', action: 'sell', iv: frontATM.iv },
            { strike: backATM.strike, expiry: backExpiry, type: 'call', action: 'buy', iv: backATM.iv }
          ],
          expectedProfit: ivDiff * 100, // Simplified profit estimate
          riskLevel: 'medium',
          description: `Sell front month (${frontExpiry}d) at ${(frontATM.iv * 100).toFixed(1)}% IV, buy back month (${backExpiry}d) at ${(backATM.iv * 100).toFixed(1)}% IV`
        });
      }
    }
  }
  
  // Check for butterfly opportunities
  for (const [expiry, expiryPoints] of Array.from(byExpiry.entries())) {
    const sorted = expiryPoints.sort((a, b) => a.strike - b.strike);
    
    for (let i = 1; i < sorted.length - 1; i++) {
      const lower = sorted[i - 1];
      const middle = sorted[i];
      const upper = sorted[i + 1];
      
      const butterflyValue = (lower.iv + upper.iv) / 2 - middle.iv;
      
      if (butterflyValue < -0.03) {
        opportunities.push({
          type: 'butterfly',
          legs: [
            { strike: lower.strike, expiry, type: 'call', action: 'buy', iv: lower.iv },
            { strike: middle.strike, expiry, type: 'call', action: 'sell', iv: middle.iv },
            { strike: middle.strike, expiry, type: 'call', action: 'sell', iv: middle.iv },
            { strike: upper.strike, expiry, type: 'call', action: 'buy', iv: upper.iv }
          ],
          expectedProfit: Math.abs(butterflyValue) * 100,
          riskLevel: 'low',
          description: `Butterfly spread at $${middle.strike} with ${expiry}d expiry shows IV convexity violation`
        });
      }
    }
  }
  
  return opportunities;
}

/**
 * Generate volatility predictions
 */
function generateVolatilityPredictions(
  currentIV: number,
  ivRank: number,
  skewAnalysis: { type: string; steepness: number },
  termAnalysis: { type: string; spread: number }
): VolatilityPrediction[] {
  const predictions: VolatilityPrediction[] = [];
  
  // 1-day prediction based on mean reversion
  let direction1d: 'up' | 'down' | 'stable' = 'stable';
  let predicted1d = currentIV;
  
  if (ivRank > 80) {
    direction1d = 'down';
    predicted1d = currentIV * 0.98; // Mean reversion
  } else if (ivRank < 20) {
    direction1d = 'up';
    predicted1d = currentIV * 1.02;
  }
  
  predictions.push({
    horizon: '1d',
    predictedIV: predicted1d,
    confidence: 0.6,
    direction: direction1d
  });
  
  // 1-week prediction
  let direction1w: 'up' | 'down' | 'stable' = 'stable';
  let predicted1w = currentIV;
  
  if (termAnalysis.type === 'backwardation') {
    direction1w = 'down';
    predicted1w = currentIV * 0.95;
    predictions.push({
      horizon: '1w',
      predictedIV: predicted1w,
      confidence: 0.55,
      direction: direction1w,
      catalyst: 'Term structure in backwardation suggests near-term event resolution'
    });
  } else if (ivRank > 70) {
    direction1w = 'down';
    predicted1w = currentIV * 0.92;
    predictions.push({
      horizon: '1w',
      predictedIV: predicted1w,
      confidence: 0.5,
      direction: direction1w
    });
  } else {
    predictions.push({
      horizon: '1w',
      predictedIV: currentIV,
      confidence: 0.45,
      direction: 'stable'
    });
  }
  
  // 1-month prediction
  let direction1m: 'up' | 'down' | 'stable' = 'stable';
  let predicted1m = currentIV;
  
  if (ivRank > 85) {
    direction1m = 'down';
    predicted1m = currentIV * 0.85;
  } else if (ivRank < 15) {
    direction1m = 'up';
    predicted1m = currentIV * 1.15;
  }
  
  predictions.push({
    horizon: '1m',
    predictedIV: predicted1m,
    confidence: 0.4,
    direction: direction1m
  });
  
  return predictions;
}

/**
 * Update historical IV data
 */
export function updateHistoricalIV(
  underlying: string,
  data: HistoricalIVData
): void {
  const existing = historicalIVCache.get(underlying) || [];
  existing.push(data);
  
  // Keep only last 2 years of data
  const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
  const filtered = existing.filter(d => d.date.getTime() > twoYearsAgo);
  
  historicalIVCache.set(underlying, filtered);
}

/**
 * Get IV rank for quick reference
 */
export async function getIVRank(
  underlying: string,
  spotPrice: number
): Promise<{ ivRank: number; ivPercentile: number; currentIV: number }> {
  const analysis = await analyzeLiveOptions(underlying, spotPrice);
  const { ivRank, ivPercentile } = calculateIVRankPercentile(underlying, analysis.atmIV);
  
  return {
    ivRank,
    ivPercentile,
    currentIV: analysis.atmIV
  };
}

/**
 * Get surface summary for dashboard
 */
export async function getVolatilitySurfaceSummary(
  underlying: string,
  spotPrice: number
): Promise<{
  atmIV: number;
  ivRank: number;
  skewType: string;
  termStructure: string;
  anomalyCount: number;
  opportunityCount: number;
}> {
  const analysis = await analyzeLiveVolatilitySurface(underlying, spotPrice);
  
  return {
    atmIV: analysis.atmIV,
    ivRank: analysis.ivRank,
    skewType: analysis.skewType,
    termStructure: analysis.termStructureType,
    anomalyCount: analysis.anomalies.length,
    opportunityCount: analysis.arbitrageOpportunities.length
  };
}
