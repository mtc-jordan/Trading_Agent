/**
 * Alpaca Options Data Service
 * Fetches live options chain data from Alpaca's Market Data API
 * Provides real-time Greeks, IV, and quote data for options analysis
 */

// Types for Alpaca Options API responses
export interface AlpacaGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface AlpacaQuote {
  ap: number;  // ask price
  as: number;  // ask size
  ax: string;  // ask exchange
  bp: number;  // bid price
  bs: number;  // bid size
  bx: string;  // bid exchange
  c: string;   // condition
  t: string;   // timestamp
}

export interface AlpacaTrade {
  c: string;   // condition
  p: number;   // price
  s: number;   // size
  t: string;   // timestamp
  x: string;   // exchange
}

export interface AlpacaOptionSnapshot {
  greeks: AlpacaGreeks;
  impliedVolatility: number;
  latestQuote: AlpacaQuote;
  latestTrade: AlpacaTrade;
}

export interface AlpacaOptionChainResponse {
  snapshots: Record<string, AlpacaOptionSnapshot>;
  next_page_token: string | null;
}

// Parsed option contract info
export interface ParsedOptionContract {
  symbol: string;           // Full contract symbol
  underlying: string;       // Underlying symbol (e.g., AAPL)
  expiration: Date;         // Expiration date
  type: 'call' | 'put';     // Option type
  strike: number;           // Strike price
  daysToExpiry: number;     // Days until expiration
}

// Enhanced option data with parsed info
export interface EnhancedOptionData extends ParsedOptionContract {
  greeks: AlpacaGreeks;
  iv: number;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  lastPrice: number;
  lastSize: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
  volume: number;
  openInterest: number;
  timestamp: Date;
}

// Options chain filter options
export interface OptionsChainFilter {
  type?: 'call' | 'put';
  minStrike?: number;
  maxStrike?: number;
  expirationDate?: string;       // Exact date YYYY-MM-DD
  minExpiration?: string;        // Min date YYYY-MM-DD
  maxExpiration?: string;        // Max date YYYY-MM-DD
  minDaysToExpiry?: number;
  maxDaysToExpiry?: number;
  minDelta?: number;
  maxDelta?: number;
  minIV?: number;
  maxIV?: number;
  limit?: number;
}

// IV Surface point for visualization
export interface IVSurfacePoint {
  strike: number;
  daysToExpiry: number;
  iv: number;
  type: 'call' | 'put';
}

// Greeks summary for portfolio
export interface GreeksSummary {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  totalRho: number;
  deltaExposure: number;  // Delta * underlying price * 100
  gammaExposure: number;  // Gamma * underlying price^2 * 0.01
  vegaExposure: number;   // Vega * 100
  thetaExposure: number;  // Theta * 100
}

// Unusual activity detection
export interface UnusualActivity {
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiration: Date;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  iv: number;
  ivPercentile: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  significance: 'low' | 'medium' | 'high';
}

// API configuration
const ALPACA_DATA_URL = 'https://data.alpaca.markets';
const ALPACA_API_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || '';

/**
 * Parse option contract symbol to extract details
 * Format: AAPL240426C00162500
 * = AAPL (underlying) + 240426 (YYMMDD) + C (call) + 00162500 (strike * 1000)
 */
export function parseOptionSymbol(symbol: string): ParsedOptionContract | null {
  try {
    // Match pattern: underlying (1-6 chars) + date (6 digits) + type (C/P) + strike (8 digits)
    const match = symbol.match(/^([A-Z]{1,6})(\d{6})([CP])(\d{8})$/);
    if (!match) return null;

    const [, underlying, dateStr, typeChar, strikeStr] = match;
    
    // Parse expiration date (YYMMDD)
    const year = 2000 + parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1; // 0-indexed
    const day = parseInt(dateStr.substring(4, 6));
    const expiration = new Date(year, month, day);
    
    // Calculate days to expiry
    const now = new Date();
    const daysToExpiry = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Parse strike (stored as strike * 1000)
    const strike = parseInt(strikeStr) / 1000;
    
    return {
      symbol,
      underlying,
      expiration,
      type: typeChar === 'C' ? 'call' : 'put',
      strike,
      daysToExpiry
    };
  } catch (error) {
    console.error(`[AlpacaOptions] Failed to parse symbol ${symbol}:`, error);
    return null;
  }
}

/**
 * Build option contract symbol from components
 */
export function buildOptionSymbol(
  underlying: string,
  expiration: Date,
  type: 'call' | 'put',
  strike: number
): string {
  const year = expiration.getFullYear().toString().slice(-2);
  const month = (expiration.getMonth() + 1).toString().padStart(2, '0');
  const day = expiration.getDate().toString().padStart(2, '0');
  const typeChar = type === 'call' ? 'C' : 'P';
  const strikeStr = Math.round(strike * 1000).toString().padStart(8, '0');
  
  return `${underlying}${year}${month}${day}${typeChar}${strikeStr}`;
}

/**
 * Fetch options chain from Alpaca
 */
export async function fetchOptionsChain(
  underlying: string,
  filter?: OptionsChainFilter
): Promise<EnhancedOptionData[]> {
  if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
    console.error('[AlpacaOptions] API credentials not configured');
    return [];
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.set('feed', 'indicative'); // Use indicative for free tier, 'opra' for paid
    params.set('limit', (filter?.limit || 1000).toString());
    
    if (filter?.type) {
      params.set('type', filter.type);
    }
    if (filter?.minStrike !== undefined) {
      params.set('strike_price_gte', filter.minStrike.toString());
    }
    if (filter?.maxStrike !== undefined) {
      params.set('strike_price_lte', filter.maxStrike.toString());
    }
    if (filter?.expirationDate) {
      params.set('expiration_date', filter.expirationDate);
    }
    if (filter?.minExpiration) {
      params.set('expiration_date_gte', filter.minExpiration);
    }
    if (filter?.maxExpiration) {
      params.set('expiration_date_lte', filter.maxExpiration);
    }

    const url = `${ALPACA_DATA_URL}/v1beta1/options/snapshots/${underlying}?${params.toString()}`;
    
    console.log(`[AlpacaOptions] Fetching options chain for ${underlying}`);
    
    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AlpacaOptions] API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: AlpacaOptionChainResponse = await response.json();
    
    // Parse and enhance each option
    const enhancedOptions: EnhancedOptionData[] = [];
    
    for (const [symbol, snapshot] of Object.entries(data.snapshots)) {
      const parsed = parseOptionSymbol(symbol);
      if (!parsed) continue;
      
      // Apply additional filters
      if (filter?.minDaysToExpiry !== undefined && parsed.daysToExpiry < filter.minDaysToExpiry) continue;
      if (filter?.maxDaysToExpiry !== undefined && parsed.daysToExpiry > filter.maxDaysToExpiry) continue;
      if (filter?.minDelta !== undefined && Math.abs(snapshot.greeks.delta) < filter.minDelta) continue;
      if (filter?.maxDelta !== undefined && Math.abs(snapshot.greeks.delta) > filter.maxDelta) continue;
      if (filter?.minIV !== undefined && snapshot.impliedVolatility < filter.minIV) continue;
      if (filter?.maxIV !== undefined && snapshot.impliedVolatility > filter.maxIV) continue;
      
      const bidPrice = snapshot.latestQuote.bp || 0;
      const askPrice = snapshot.latestQuote.ap || 0;
      const midPrice = (bidPrice + askPrice) / 2;
      const spread = askPrice - bidPrice;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
      
      enhancedOptions.push({
        ...parsed,
        greeks: snapshot.greeks,
        iv: snapshot.impliedVolatility,
        bidPrice,
        askPrice,
        bidSize: snapshot.latestQuote.bs || 0,
        askSize: snapshot.latestQuote.as || 0,
        lastPrice: snapshot.latestTrade?.p || midPrice,
        lastSize: snapshot.latestTrade?.s || 0,
        spread,
        spreadPercent,
        midPrice,
        volume: 0, // Not provided in snapshot, would need separate call
        openInterest: 0, // Not provided in snapshot
        timestamp: new Date(snapshot.latestQuote.t)
      });
    }
    
    // Handle pagination if needed
    let pageToken = data.next_page_token;
    while (pageToken && enhancedOptions.length < (filter?.limit || 1000)) {
      params.set('page_token', pageToken);
      const nextUrl = `${ALPACA_DATA_URL}/v1beta1/options/snapshots/${underlying}?${params.toString()}`;
      
      const nextResponse = await fetch(nextUrl, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
          'Accept': 'application/json'
        }
      });
      
      if (!nextResponse.ok) break;
      
      const nextData: AlpacaOptionChainResponse = await nextResponse.json();
      
      for (const [symbol, snapshot] of Object.entries(nextData.snapshots)) {
        const parsed = parseOptionSymbol(symbol);
        if (!parsed) continue;
        
        const bidPrice = snapshot.latestQuote.bp || 0;
        const askPrice = snapshot.latestQuote.ap || 0;
        const midPrice = (bidPrice + askPrice) / 2;
        const spread = askPrice - bidPrice;
        const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
        
        enhancedOptions.push({
          ...parsed,
          greeks: snapshot.greeks,
          iv: snapshot.impliedVolatility,
          bidPrice,
          askPrice,
          bidSize: snapshot.latestQuote.bs || 0,
          askSize: snapshot.latestQuote.as || 0,
          lastPrice: snapshot.latestTrade?.p || midPrice,
          lastSize: snapshot.latestTrade?.s || 0,
          spread,
          spreadPercent,
          midPrice,
          volume: 0,
          openInterest: 0,
          timestamp: new Date(snapshot.latestQuote.t)
        });
      }
      
      pageToken = nextData.next_page_token;
    }
    
    console.log(`[AlpacaOptions] Fetched ${enhancedOptions.length} options for ${underlying}`);
    return enhancedOptions;
    
  } catch (error) {
    console.error('[AlpacaOptions] Error fetching options chain:', error);
    return [];
  }
}

/**
 * Get options near the money (ATM +/- range)
 */
export async function getOptionsNearMoney(
  underlying: string,
  spotPrice: number,
  range: number = 0.1 // 10% range
): Promise<EnhancedOptionData[]> {
  const minStrike = spotPrice * (1 - range);
  const maxStrike = spotPrice * (1 + range);
  
  return fetchOptionsChain(underlying, {
    minStrike,
    maxStrike,
    minDaysToExpiry: 1,
    maxDaysToExpiry: 60
  });
}

/**
 * Get options by expiration date
 */
export async function getOptionsByExpiration(
  underlying: string,
  expirationDate: string
): Promise<EnhancedOptionData[]> {
  return fetchOptionsChain(underlying, {
    expirationDate,
    limit: 500
  });
}

/**
 * Build IV surface from options chain
 */
export function buildIVSurface(options: EnhancedOptionData[]): IVSurfacePoint[] {
  return options.map(opt => ({
    strike: opt.strike,
    daysToExpiry: opt.daysToExpiry,
    iv: opt.iv,
    type: opt.type
  }));
}

/**
 * Calculate Greeks summary for a portfolio of options
 */
export function calculateGreeksSummary(
  options: EnhancedOptionData[],
  positions: Map<string, number>, // symbol -> quantity
  underlyingPrice: number
): GreeksSummary {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let totalRho = 0;
  
  for (const opt of options) {
    const quantity = positions.get(opt.symbol) || 0;
    if (quantity === 0) continue;
    
    const multiplier = quantity * 100; // Options are for 100 shares
    
    totalDelta += opt.greeks.delta * multiplier;
    totalGamma += opt.greeks.gamma * multiplier;
    totalTheta += opt.greeks.theta * multiplier;
    totalVega += opt.greeks.vega * multiplier;
    totalRho += opt.greeks.rho * multiplier;
  }
  
  return {
    totalDelta,
    totalGamma,
    totalTheta,
    totalVega,
    totalRho,
    deltaExposure: totalDelta * underlyingPrice,
    gammaExposure: totalGamma * underlyingPrice * underlyingPrice * 0.01,
    vegaExposure: totalVega * 100,
    thetaExposure: totalTheta * 100
  };
}

/**
 * Detect unusual options activity
 */
export function detectUnusualActivity(
  options: EnhancedOptionData[],
  historicalIV: Map<string, number[]> // symbol -> historical IV values
): UnusualActivity[] {
  const unusual: UnusualActivity[] = [];
  
  for (const opt of options) {
    // Calculate IV percentile
    const ivHistory = historicalIV.get(opt.underlying) || [];
    const ivPercentile = ivHistory.length > 0
      ? ivHistory.filter(iv => iv < opt.iv).length / ivHistory.length * 100
      : 50;
    
    // Determine sentiment based on option type and delta
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (opt.type === 'call' && opt.greeks.delta > 0.3) {
      sentiment = 'bullish';
    } else if (opt.type === 'put' && Math.abs(opt.greeks.delta) > 0.3) {
      sentiment = 'bearish';
    }
    
    // Check for high IV (above 80th percentile)
    if (ivPercentile > 80) {
      unusual.push({
        symbol: opt.symbol,
        type: opt.type,
        strike: opt.strike,
        expiration: opt.expiration,
        volume: opt.volume,
        avgVolume: 0, // Would need historical data
        volumeRatio: 0,
        iv: opt.iv,
        ivPercentile,
        sentiment,
        significance: ivPercentile > 95 ? 'high' : ivPercentile > 85 ? 'medium' : 'low'
      });
    }
  }
  
  return unusual;
}

/**
 * Find options with specific characteristics
 */
export async function findOptions(
  underlying: string,
  criteria: {
    targetDelta?: number;
    targetDTE?: number;
    type?: 'call' | 'put';
    maxSpread?: number; // Max spread as percentage
  }
): Promise<EnhancedOptionData[]> {
  const options = await fetchOptionsChain(underlying, {
    type: criteria.type,
    minDaysToExpiry: criteria.targetDTE ? criteria.targetDTE - 7 : undefined,
    maxDaysToExpiry: criteria.targetDTE ? criteria.targetDTE + 7 : undefined
  });
  
  // Filter by criteria
  let filtered = options;
  
  if (criteria.targetDelta !== undefined) {
    // Sort by distance from target delta
    filtered = filtered.sort((a, b) => {
      const distA = Math.abs(Math.abs(a.greeks.delta) - criteria.targetDelta!);
      const distB = Math.abs(Math.abs(b.greeks.delta) - criteria.targetDelta!);
      return distA - distB;
    });
  }
  
  if (criteria.maxSpread !== undefined) {
    filtered = filtered.filter(opt => opt.spreadPercent <= criteria.maxSpread!);
  }
  
  return filtered;
}

/**
 * Get ATM straddle pricing
 */
export async function getATMStraddle(
  underlying: string,
  spotPrice: number,
  targetDTE: number = 30
): Promise<{
  call: EnhancedOptionData | null;
  put: EnhancedOptionData | null;
  totalPremium: number;
  breakEvenUp: number;
  breakEvenDown: number;
  impliedMove: number;
  impliedMovePercent: number;
} | null> {
  const options = await fetchOptionsChain(underlying, {
    minStrike: spotPrice * 0.95,
    maxStrike: spotPrice * 1.05,
    minDaysToExpiry: targetDTE - 7,
    maxDaysToExpiry: targetDTE + 7
  });
  
  if (options.length === 0) return null;
  
  // Find ATM strike (closest to spot)
  const strikes = Array.from(new Set(options.map(o => o.strike)));
  const atmStrike = strikes.reduce((closest, strike) => 
    Math.abs(strike - spotPrice) < Math.abs(closest - spotPrice) ? strike : closest
  );
  
  // Find call and put at ATM strike
  const atmOptions = options.filter(o => o.strike === atmStrike);
  const call = atmOptions.find(o => o.type === 'call') || null;
  const put = atmOptions.find(o => o.type === 'put') || null;
  
  if (!call || !put) return null;
  
  const totalPremium = call.midPrice + put.midPrice;
  const breakEvenUp = atmStrike + totalPremium;
  const breakEvenDown = atmStrike - totalPremium;
  const impliedMove = totalPremium;
  const impliedMovePercent = (totalPremium / spotPrice) * 100;
  
  return {
    call,
    put,
    totalPremium,
    breakEvenUp,
    breakEvenDown,
    impliedMove,
    impliedMovePercent
  };
}

/**
 * Calculate expected move from options pricing
 */
export function calculateExpectedMove(
  atmStraddle: number,
  spotPrice: number,
  daysToExpiry: number
): {
  expectedMove: number;
  expectedMovePercent: number;
  annualizedVol: number;
  dailyVol: number;
  weeklyVol: number;
} {
  const expectedMove = atmStraddle * 0.85; // Straddle typically overestimates by ~15%
  const expectedMovePercent = (expectedMove / spotPrice) * 100;
  
  // Annualize the implied volatility
  const annualizedVol = (expectedMovePercent / 100) * Math.sqrt(365 / daysToExpiry);
  const dailyVol = annualizedVol / Math.sqrt(252);
  const weeklyVol = dailyVol * Math.sqrt(5);
  
  return {
    expectedMove,
    expectedMovePercent,
    annualizedVol,
    dailyVol,
    weeklyVol
  };
}

/**
 * Get option chain grouped by expiration
 */
export async function getOptionsGroupedByExpiration(
  underlying: string
): Promise<Map<string, EnhancedOptionData[]>> {
  const options = await fetchOptionsChain(underlying, {
    minDaysToExpiry: 1,
    maxDaysToExpiry: 90,
    limit: 1000
  });
  
  const grouped = new Map<string, EnhancedOptionData[]>();
  
  for (const opt of options) {
    const expKey = opt.expiration.toISOString().split('T')[0];
    const existing = grouped.get(expKey) || [];
    existing.push(opt);
    grouped.set(expKey, existing);
  }
  
  return grouped;
}

/**
 * Get term structure (IV by expiration)
 */
export function getTermStructure(
  options: EnhancedOptionData[]
): { daysToExpiry: number; avgIV: number; atmIV: number }[] {
  // Group by DTE
  const byDTE = new Map<number, EnhancedOptionData[]>();
  
  for (const opt of options) {
    const existing = byDTE.get(opt.daysToExpiry) || [];
    existing.push(opt);
    byDTE.set(opt.daysToExpiry, existing);
  }
  
  // Calculate average and ATM IV for each expiry
  const termStructure: { daysToExpiry: number; avgIV: number; atmIV: number }[] = [];
  
  for (const [dte, opts] of Array.from(byDTE.entries())) {
    const avgIV = opts.reduce((sum, o) => sum + o.iv, 0) / opts.length;
    
    // Find ATM option (delta closest to 0.5 for calls)
    const atmOpt = opts
      .filter((o: EnhancedOptionData) => o.type === 'call')
      .sort((a: EnhancedOptionData, b: EnhancedOptionData) => Math.abs(a.greeks.delta - 0.5) - Math.abs(b.greeks.delta - 0.5))[0];
    
    termStructure.push({
      daysToExpiry: dte,
      avgIV,
      atmIV: atmOpt?.iv || avgIV
    });
  }
  
  return termStructure.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

/**
 * Get skew (IV by strike for a given expiration)
 */
export function getSkew(
  options: EnhancedOptionData[],
  spotPrice: number
): { strike: number; moneyness: number; callIV: number; putIV: number }[] {
  // Group by strike
  const byStrike = new Map<number, { call?: EnhancedOptionData; put?: EnhancedOptionData }>();
  
  for (const opt of options) {
    const existing = byStrike.get(opt.strike) || {};
    if (opt.type === 'call') {
      existing.call = opt;
    } else {
      existing.put = opt;
    }
    byStrike.set(opt.strike, existing);
  }
  
  // Build skew data
  const skew: { strike: number; moneyness: number; callIV: number; putIV: number }[] = [];
  
  for (const [strike, opts] of Array.from(byStrike.entries())) {
    skew.push({
      strike,
      moneyness: strike / spotPrice,
      callIV: opts.call?.iv || 0,
      putIV: opts.put?.iv || 0
    });
  }
  
  return skew.sort((a, b) => a.strike - b.strike);
}

// Export service status check
export function getAlpacaOptionsStatus(): {
  configured: boolean;
  apiKey: string;
} {
  return {
    configured: !!(ALPACA_API_KEY && ALPACA_API_SECRET),
    apiKey: ALPACA_API_KEY ? `${ALPACA_API_KEY.substring(0, 4)}...` : 'Not configured'
  };
}
