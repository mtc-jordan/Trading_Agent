/**
 * Live Options Chain Analyzer
 * Real-time analysis of options data from Alpaca
 * Integrates with Neural Volatility Surface and Greeks optimization
 */

import {
  fetchOptionsChain,
  getOptionsNearMoney,
  getATMStraddle,
  buildIVSurface,
  getTermStructure,
  getSkew,
  calculateGreeksSummary,
  detectUnusualActivity,
  EnhancedOptionData,
  IVSurfacePoint,
  GreeksSummary,
  UnusualActivity,
  OptionsChainFilter
} from './alpacaOptions';

// Analysis result types
export interface OptionsAnalysisResult {
  underlying: string;
  spotPrice: number;
  timestamp: Date;
  
  // Chain data
  totalContracts: number;
  callCount: number;
  putCount: number;
  
  // IV metrics
  atmIV: number;
  avgCallIV: number;
  avgPutIV: number;
  ivSkew: number;           // Put IV - Call IV at ATM
  ivTermStructure: 'contango' | 'backwardation' | 'flat';
  
  // Greeks summary
  greeksSummary: GreeksSummary;
  
  // Expected move
  expectedMove: number;
  expectedMovePercent: number;
  
  // Unusual activity
  unusualActivity: UnusualActivity[];
  
  // Surface data
  ivSurface: IVSurfacePoint[];
  
  // Recommendations
  recommendations: OptionsRecommendation[];
}

export interface OptionsRecommendation {
  type: 'strategy' | 'hedge' | 'opportunity' | 'warning';
  title: string;
  description: string;
  confidence: number;
  details: Record<string, unknown>;
}

export interface LiveOptionsState {
  underlying: string;
  lastUpdate: Date;
  options: EnhancedOptionData[];
  analysis: OptionsAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

// Cache for options data
const optionsCache = new Map<string, {
  data: EnhancedOptionData[];
  timestamp: Date;
  analysis: OptionsAnalysisResult | null;
}>();

// Cache TTL in milliseconds (30 seconds for live data)
const CACHE_TTL = 30000;

/**
 * Get live options analysis for an underlying
 */
export async function analyzeLiveOptions(
  underlying: string,
  spotPrice: number,
  filter?: OptionsChainFilter
): Promise<OptionsAnalysisResult> {
  const startTime = Date.now();
  
  // Check cache
  const cached = optionsCache.get(underlying);
  if (cached && Date.now() - cached.timestamp.getTime() < CACHE_TTL && cached.analysis) {
    console.log(`[LiveOptionsAnalyzer] Using cached data for ${underlying}`);
    return cached.analysis;
  }
  
  console.log(`[LiveOptionsAnalyzer] Fetching fresh options data for ${underlying}`);
  
  // Fetch options chain
  const options = await fetchOptionsChain(underlying, {
    ...filter,
    minDaysToExpiry: 1,
    maxDaysToExpiry: filter?.maxDaysToExpiry || 90,
    limit: 1000
  });
  
  if (options.length === 0) {
    throw new Error(`No options data available for ${underlying}`);
  }
  
  // Separate calls and puts
  const calls = options.filter(o => o.type === 'call');
  const puts = options.filter(o => o.type === 'put');
  
  // Calculate average IVs
  const avgCallIV = calls.length > 0
    ? calls.reduce((sum, o) => sum + o.iv, 0) / calls.length
    : 0;
  const avgPutIV = puts.length > 0
    ? puts.reduce((sum, o) => sum + o.iv, 0) / puts.length
    : 0;
  
  // Find ATM options for IV skew
  const atmCalls = calls.filter(c => Math.abs(c.greeks.delta - 0.5) < 0.1);
  const atmPuts = puts.filter(p => Math.abs(p.greeks.delta + 0.5) < 0.1);
  
  const atmCallIV = atmCalls.length > 0
    ? atmCalls.reduce((sum, o) => sum + o.iv, 0) / atmCalls.length
    : avgCallIV;
  const atmPutIV = atmPuts.length > 0
    ? atmPuts.reduce((sum, o) => sum + o.iv, 0) / atmPuts.length
    : avgPutIV;
  
  const atmIV = (atmCallIV + atmPutIV) / 2;
  const ivSkew = atmPutIV - atmCallIV;
  
  // Determine term structure
  const termStructure = getTermStructure(options);
  let ivTermStructure: 'contango' | 'backwardation' | 'flat' = 'flat';
  
  if (termStructure.length >= 2) {
    const shortTermIV = termStructure[0].atmIV;
    const longTermIV = termStructure[termStructure.length - 1].atmIV;
    const diff = longTermIV - shortTermIV;
    
    if (diff > 0.02) {
      ivTermStructure = 'contango';
    } else if (diff < -0.02) {
      ivTermStructure = 'backwardation';
    }
  }
  
  // Calculate Greeks summary (empty positions for now)
  const greeksSummary = calculateGreeksSummary(options, new Map(), spotPrice);
  
  // Get ATM straddle for expected move
  const straddle = await getATMStraddle(underlying, spotPrice, 30);
  const expectedMove = straddle?.impliedMove || spotPrice * atmIV * Math.sqrt(30 / 365);
  const expectedMovePercent = straddle?.impliedMovePercent || (atmIV * Math.sqrt(30 / 365) * 100);
  
  // Detect unusual activity
  const unusualActivity = detectUnusualActivity(options, new Map());
  
  // Build IV surface
  const ivSurface = buildIVSurface(options);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    options,
    spotPrice,
    atmIV,
    ivSkew,
    ivTermStructure,
    unusualActivity
  );
  
  const analysis: OptionsAnalysisResult = {
    underlying,
    spotPrice,
    timestamp: new Date(),
    totalContracts: options.length,
    callCount: calls.length,
    putCount: puts.length,
    atmIV,
    avgCallIV,
    avgPutIV,
    ivSkew,
    ivTermStructure,
    greeksSummary,
    expectedMove,
    expectedMovePercent,
    unusualActivity,
    ivSurface,
    recommendations
  };
  
  // Update cache
  optionsCache.set(underlying, {
    data: options,
    timestamp: new Date(),
    analysis
  });
  
  console.log(`[LiveOptionsAnalyzer] Analysis complete for ${underlying} in ${Date.now() - startTime}ms`);
  
  return analysis;
}

/**
 * Generate trading recommendations based on options analysis
 */
function generateRecommendations(
  options: EnhancedOptionData[],
  spotPrice: number,
  atmIV: number,
  ivSkew: number,
  termStructure: 'contango' | 'backwardation' | 'flat',
  unusualActivity: UnusualActivity[]
): OptionsRecommendation[] {
  const recommendations: OptionsRecommendation[] = [];
  
  // High IV recommendation
  if (atmIV > 0.4) {
    recommendations.push({
      type: 'strategy',
      title: 'High IV Environment - Consider Selling Premium',
      description: `ATM IV is ${(atmIV * 100).toFixed(1)}%, which is elevated. Consider selling options strategies like Iron Condors or Credit Spreads to collect premium.`,
      confidence: 0.75,
      details: {
        atmIV,
        suggestedStrategies: ['Iron Condor', 'Credit Spread', 'Short Strangle']
      }
    });
  } else if (atmIV < 0.15) {
    recommendations.push({
      type: 'strategy',
      title: 'Low IV Environment - Consider Buying Premium',
      description: `ATM IV is ${(atmIV * 100).toFixed(1)}%, which is low. Consider buying options strategies like Straddles or Strangles before volatility expansion.`,
      confidence: 0.7,
      details: {
        atmIV,
        suggestedStrategies: ['Long Straddle', 'Long Strangle', 'Calendar Spread']
      }
    });
  }
  
  // IV Skew recommendation
  if (ivSkew > 0.05) {
    recommendations.push({
      type: 'opportunity',
      title: 'Put Skew Elevated - Bearish Sentiment',
      description: `Put IV is ${(ivSkew * 100).toFixed(1)}% higher than call IV, indicating elevated demand for downside protection. Consider put spreads or risk reversals.`,
      confidence: 0.65,
      details: {
        ivSkew,
        sentiment: 'bearish',
        suggestedStrategies: ['Put Spread', 'Risk Reversal', 'Collar']
      }
    });
  } else if (ivSkew < -0.03) {
    recommendations.push({
      type: 'opportunity',
      title: 'Call Skew Elevated - Bullish Sentiment',
      description: `Call IV is ${(Math.abs(ivSkew) * 100).toFixed(1)}% higher than put IV, indicating elevated demand for upside exposure. Consider call spreads.`,
      confidence: 0.65,
      details: {
        ivSkew,
        sentiment: 'bullish',
        suggestedStrategies: ['Call Spread', 'Bull Call Spread']
      }
    });
  }
  
  // Term structure recommendation
  if (termStructure === 'backwardation') {
    recommendations.push({
      type: 'warning',
      title: 'IV Term Structure in Backwardation',
      description: 'Short-term IV is higher than long-term IV, often indicating near-term event risk (earnings, news). Be cautious with short-dated positions.',
      confidence: 0.8,
      details: {
        termStructure,
        suggestedAction: 'Avoid selling short-dated options'
      }
    });
  }
  
  // Unusual activity recommendations
  const highSignificanceActivity = unusualActivity.filter(a => a.significance === 'high');
  if (highSignificanceActivity.length > 0) {
    const activity = highSignificanceActivity[0];
    recommendations.push({
      type: 'opportunity',
      title: `Unusual Options Activity Detected`,
      description: `High significance ${activity.type} activity at $${activity.strike} strike with IV at ${(activity.iv * 100).toFixed(1)}% (${activity.ivPercentile.toFixed(0)}th percentile).`,
      confidence: 0.6,
      details: {
        activity,
        sentiment: activity.sentiment
      }
    });
  }
  
  // Find best risk/reward options
  const goodRiskReward = options.filter(o => 
    o.spreadPercent < 5 && // Tight spread
    Math.abs(o.greeks.delta) > 0.2 && Math.abs(o.greeks.delta) < 0.4 && // OTM but not too far
    o.daysToExpiry >= 14 && o.daysToExpiry <= 45 // Sweet spot for theta
  );
  
  if (goodRiskReward.length > 0) {
    const bestOption = goodRiskReward.sort((a, b) => a.spreadPercent - b.spreadPercent)[0];
    recommendations.push({
      type: 'opportunity',
      title: 'Favorable Risk/Reward Option Found',
      description: `${bestOption.type.toUpperCase()} at $${bestOption.strike} strike expiring in ${bestOption.daysToExpiry} days has tight spread (${bestOption.spreadPercent.toFixed(1)}%) and delta of ${bestOption.greeks.delta.toFixed(2)}.`,
      confidence: 0.55,
      details: {
        option: bestOption
      }
    });
  }
  
  return recommendations;
}

/**
 * Get options chain with real-time Greeks
 */
export async function getOptionsChainWithGreeks(
  underlying: string,
  filter?: OptionsChainFilter
): Promise<EnhancedOptionData[]> {
  // Check cache first
  const cached = optionsCache.get(underlying);
  if (cached && Date.now() - cached.timestamp.getTime() < CACHE_TTL) {
    let data = cached.data;
    
    // Apply filters
    if (filter?.type) {
      data = data.filter(o => o.type === filter.type);
    }
    if (filter?.minStrike !== undefined) {
      data = data.filter(o => o.strike >= filter.minStrike!);
    }
    if (filter?.maxStrike !== undefined) {
      data = data.filter(o => o.strike <= filter.maxStrike!);
    }
    if (filter?.minDaysToExpiry !== undefined) {
      data = data.filter(o => o.daysToExpiry >= filter.minDaysToExpiry!);
    }
    if (filter?.maxDaysToExpiry !== undefined) {
      data = data.filter(o => o.daysToExpiry <= filter.maxDaysToExpiry!);
    }
    
    return data;
  }
  
  // Fetch fresh data
  return fetchOptionsChain(underlying, filter);
}

/**
 * Get IV surface for visualization
 */
export async function getLiveIVSurface(
  underlying: string,
  spotPrice: number
): Promise<{
  surface: IVSurfacePoint[];
  skew: { strike: number; moneyness: number; callIV: number; putIV: number }[];
  termStructure: { daysToExpiry: number; avgIV: number; atmIV: number }[];
}> {
  const options = await getOptionsChainWithGreeks(underlying, {
    minDaysToExpiry: 1,
    maxDaysToExpiry: 90
  });
  
  return {
    surface: buildIVSurface(options),
    skew: getSkew(options, spotPrice),
    termStructure: getTermStructure(options)
  };
}

/**
 * Monitor options for specific conditions
 */
export interface OptionsAlert {
  id: string;
  underlying: string;
  condition: 'iv_spike' | 'iv_crush' | 'unusual_volume' | 'gamma_squeeze' | 'delta_threshold';
  threshold: number;
  triggered: boolean;
  triggeredAt?: Date;
  currentValue?: number;
}

const activeAlerts = new Map<string, OptionsAlert>();

export function createOptionsAlert(
  underlying: string,
  condition: OptionsAlert['condition'],
  threshold: number
): OptionsAlert {
  const alert: OptionsAlert = {
    id: `${underlying}-${condition}-${Date.now()}`,
    underlying,
    condition,
    threshold,
    triggered: false
  };
  
  activeAlerts.set(alert.id, alert);
  return alert;
}

export function checkAlerts(analysis: OptionsAnalysisResult): OptionsAlert[] {
  const triggeredAlerts: OptionsAlert[] = [];
  
  for (const [id, alert] of Array.from(activeAlerts.entries())) {
    if (alert.underlying !== analysis.underlying) continue;
    if (alert.triggered) continue;
    
    let currentValue: number | undefined;
    let shouldTrigger = false;
    
    switch (alert.condition) {
      case 'iv_spike':
        currentValue = analysis.atmIV;
        shouldTrigger = currentValue > alert.threshold;
        break;
      case 'iv_crush':
        currentValue = analysis.atmIV;
        shouldTrigger = currentValue < alert.threshold;
        break;
      case 'gamma_squeeze':
        currentValue = Math.abs(analysis.greeksSummary.totalGamma);
        shouldTrigger = currentValue > alert.threshold;
        break;
      case 'delta_threshold':
        currentValue = Math.abs(analysis.greeksSummary.totalDelta);
        shouldTrigger = currentValue > alert.threshold;
        break;
    }
    
    if (shouldTrigger) {
      alert.triggered = true;
      alert.triggeredAt = new Date();
      alert.currentValue = currentValue;
      triggeredAlerts.push(alert);
    }
  }
  
  return triggeredAlerts;
}

export function removeAlert(alertId: string): boolean {
  return activeAlerts.delete(alertId);
}

export function getActiveAlerts(): OptionsAlert[] {
  return Array.from(activeAlerts.values());
}

/**
 * Calculate portfolio Greeks from positions
 */
export async function calculatePortfolioGreeks(
  positions: { underlying: string; symbol: string; quantity: number }[],
  underlyingPrices: Map<string, number>
): Promise<{
  byUnderlying: Map<string, GreeksSummary>;
  total: GreeksSummary;
}> {
  const byUnderlying = new Map<string, GreeksSummary>();
  
  // Group positions by underlying
  const positionsByUnderlying = new Map<string, { symbol: string; quantity: number }[]>();
  for (const pos of positions) {
    const existing = positionsByUnderlying.get(pos.underlying) || [];
    existing.push({ symbol: pos.symbol, quantity: pos.quantity });
    positionsByUnderlying.set(pos.underlying, existing);
  }
  
  // Calculate Greeks for each underlying
  for (const [underlying, underlyingPositions] of Array.from(positionsByUnderlying.entries())) {
    const options = await getOptionsChainWithGreeks(underlying);
    const positionMap = new Map<string, number>();
    
    for (const pos of underlyingPositions) {
      positionMap.set(pos.symbol, pos.quantity);
    }
    
    const spotPrice = underlyingPrices.get(underlying) || 0;
    const summary = calculateGreeksSummary(options, positionMap, spotPrice);
    byUnderlying.set(underlying, summary);
  }
  
  // Calculate total Greeks
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let totalRho = 0;
  let deltaExposure = 0;
  let gammaExposure = 0;
  let vegaExposure = 0;
  let thetaExposure = 0;
  
  for (const summary of Array.from(byUnderlying.values())) {
    totalDelta += summary.totalDelta;
    totalGamma += summary.totalGamma;
    totalTheta += summary.totalTheta;
    totalVega += summary.totalVega;
    totalRho += summary.totalRho;
    deltaExposure += summary.deltaExposure;
    gammaExposure += summary.gammaExposure;
    vegaExposure += summary.vegaExposure;
    thetaExposure += summary.thetaExposure;
  }
  
  return {
    byUnderlying,
    total: {
      totalDelta,
      totalGamma,
      totalTheta,
      totalVega,
      totalRho,
      deltaExposure,
      gammaExposure,
      vegaExposure,
      thetaExposure
    }
  };
}

/**
 * Clear cache for an underlying
 */
export function clearOptionsCache(underlying?: string): void {
  if (underlying) {
    optionsCache.delete(underlying);
  } else {
    optionsCache.clear();
  }
}

/**
 * Get cache status
 */
export function getCacheStatus(): {
  entries: number;
  underlyings: string[];
  oldestEntry: Date | null;
} {
  const underlyings = Array.from(optionsCache.keys());
  let oldestEntry: Date | null = null;
  
  for (const cached of Array.from(optionsCache.values())) {
    if (!oldestEntry || cached.timestamp < oldestEntry) {
      oldestEntry = cached.timestamp;
    }
  }
  
  return {
    entries: optionsCache.size,
    underlyings,
    oldestEntry
  };
}
