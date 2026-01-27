/**
 * Cross-Asset Correlation Service
 * Calculates Pearson correlation coefficients between asset price returns
 * Supports multiple time windows (24h, 7d, 30d) and all asset types
 */

export type TimePeriod = '24h' | '7d' | '30d';

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface AssetPriceHistory {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'option';
  prices: PricePoint[];
}

export interface CorrelationPair {
  asset1: string;
  asset2: string;
  correlation: number;
  strength: 'strong_positive' | 'moderate_positive' | 'weak_positive' | 'neutral' | 'weak_negative' | 'moderate_negative' | 'strong_negative';
  sampleSize: number;
}

export interface CorrelationMatrix {
  assets: string[];
  correlations: number[][];
  pairs: CorrelationPair[];
  period: TimePeriod;
  calculatedAt: number;
  metadata: {
    totalPairs: number;
    avgCorrelation: number;
    strongestPositive: CorrelationPair | null;
    strongestNegative: CorrelationPair | null;
  };
}

// In-memory price history cache for correlation calculations
const priceHistoryCache: Map<string, AssetPriceHistory> = new Map();

/**
 * Calculate returns from price series
 */
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

/**
 * Calculate mean of an array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr: number[], meanVal?: number): number {
  if (arr.length === 0) return 0;
  const avg = meanVal !== undefined ? meanVal : mean(arr);
  const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = standardDeviation(x, meanX);
  const stdY = standardDeviation(y, meanY);

  if (stdX === 0 || stdY === 0) {
    return 0;
  }

  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= n;

  const correlation = covariance / (stdX * stdY);
  
  // Clamp to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, correlation));
}

/**
 * Determine correlation strength category
 */
export function getCorrelationStrength(correlation: number): CorrelationPair['strength'] {
  const absCorr = Math.abs(correlation);
  
  if (correlation >= 0.7) return 'strong_positive';
  if (correlation >= 0.4) return 'moderate_positive';
  if (correlation >= 0.1) return 'weak_positive';
  if (correlation > -0.1) return 'neutral';
  if (correlation > -0.4) return 'weak_negative';
  if (correlation > -0.7) return 'moderate_negative';
  return 'strong_negative';
}

/**
 * Get time window in milliseconds
 */
function getTimeWindowMs(period: TimePeriod): number {
  switch (period) {
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Filter prices to time window
 */
function filterPricesToWindow(prices: PricePoint[], period: TimePeriod): PricePoint[] {
  const windowMs = getTimeWindowMs(period);
  const cutoff = Date.now() - windowMs;
  return prices.filter(p => p.timestamp >= cutoff);
}

/**
 * Align two price series to common timestamps
 */
function alignPriceSeries(
  prices1: PricePoint[],
  prices2: PricePoint[]
): { aligned1: number[]; aligned2: number[] } {
  // Create maps for quick lookup
  const map1 = new Map<number, number>();
  const map2 = new Map<number, number>();
  
  // Round timestamps to nearest minute for alignment
  const roundToMinute = (ts: number) => Math.floor(ts / 60000) * 60000;
  
  for (const p of prices1) {
    map1.set(roundToMinute(p.timestamp), p.price);
  }
  for (const p of prices2) {
    map2.set(roundToMinute(p.timestamp), p.price);
  }
  
  // Find common timestamps
  const commonTimestamps: number[] = [];
  const timestamps1 = Array.from(map1.keys());
  for (const ts of timestamps1) {
    if (map2.has(ts)) {
      commonTimestamps.push(ts);
    }
  }
  
  // Sort by timestamp
  commonTimestamps.sort((a, b) => a - b);
  
  // Extract aligned prices
  const aligned1 = commonTimestamps.map(ts => map1.get(ts)!);
  const aligned2 = commonTimestamps.map(ts => map2.get(ts)!);
  
  return { aligned1, aligned2 };
}

/**
 * Add or update price history for an asset
 */
export function updatePriceHistory(
  symbol: string,
  assetType: AssetPriceHistory['assetType'],
  price: number,
  timestamp?: number
): void {
  const ts = timestamp || Date.now();
  const key = `${assetType}:${symbol}`;
  
  let history = priceHistoryCache.get(key);
  if (!history) {
    history = { symbol, assetType, prices: [] };
    priceHistoryCache.set(key, history);
  }
  
  history.prices.push({ timestamp: ts, price });
  
  // Keep only last 30 days of data
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  history.prices = history.prices.filter(p => p.timestamp >= cutoff);
}

/**
 * Get price history for an asset
 */
export function getPriceHistory(symbol: string, assetType: string): AssetPriceHistory | null {
  const key = `${assetType}:${symbol}`;
  return priceHistoryCache.get(key) || null;
}

/**
 * Calculate correlation between two assets
 */
export function calculateAssetCorrelation(
  asset1: AssetPriceHistory,
  asset2: AssetPriceHistory,
  period: TimePeriod
): CorrelationPair {
  // Filter to time window
  const prices1 = filterPricesToWindow(asset1.prices, period);
  const prices2 = filterPricesToWindow(asset2.prices, period);
  
  // Align price series
  const { aligned1, aligned2 } = alignPriceSeries(prices1, prices2);
  
  // Calculate returns
  const returns1 = calculateReturns(aligned1);
  const returns2 = calculateReturns(aligned2);
  
  // Calculate correlation
  const correlation = pearsonCorrelation(returns1, returns2);
  
  return {
    asset1: asset1.symbol,
    asset2: asset2.symbol,
    correlation: Math.round(correlation * 1000) / 1000, // Round to 3 decimal places
    strength: getCorrelationStrength(correlation),
    sampleSize: returns1.length
  };
}

/**
 * Calculate full correlation matrix for multiple assets
 */
export function calculateCorrelationMatrix(
  assets: AssetPriceHistory[],
  period: TimePeriod
): CorrelationMatrix {
  const n = assets.length;
  const symbols = assets.map(a => a.symbol);
  const correlations: number[][] = [];
  const pairs: CorrelationPair[] = [];
  
  // Initialize correlation matrix
  for (let i = 0; i < n; i++) {
    correlations.push(new Array(n).fill(0));
  }
  
  // Calculate pairwise correlations
  for (let i = 0; i < n; i++) {
    correlations[i][i] = 1; // Self-correlation is always 1
    
    for (let j = i + 1; j < n; j++) {
      const pair = calculateAssetCorrelation(assets[i], assets[j], period);
      correlations[i][j] = pair.correlation;
      correlations[j][i] = pair.correlation; // Symmetric matrix
      pairs.push(pair);
    }
  }
  
  // Calculate metadata
  const allCorrelations = pairs.map(p => p.correlation);
  const avgCorrelation = allCorrelations.length > 0 ? mean(allCorrelations) : 0;
  
  let strongestPositive: CorrelationPair | null = null;
  let strongestNegative: CorrelationPair | null = null;
  
  for (const pair of pairs) {
    if (!strongestPositive || pair.correlation > strongestPositive.correlation) {
      strongestPositive = pair;
    }
    if (!strongestNegative || pair.correlation < strongestNegative.correlation) {
      strongestNegative = pair;
    }
  }
  
  return {
    assets: symbols,
    correlations,
    pairs,
    period,
    calculatedAt: Date.now(),
    metadata: {
      totalPairs: pairs.length,
      avgCorrelation: Math.round(avgCorrelation * 1000) / 1000,
      strongestPositive,
      strongestNegative
    }
  };
}

/**
 * Generate simulated price history for testing/demo
 */
export function generateSimulatedPriceHistory(
  symbol: string,
  assetType: AssetPriceHistory['assetType'],
  basePrice: number,
  volatility: number,
  correlationFactor: number = 0, // -1 to 1, for creating correlated assets
  referencePrices?: number[]
): AssetPriceHistory {
  const now = Date.now();
  const prices: PricePoint[] = [];
  const dataPoints = 720; // 30 days of hourly data
  const hourMs = 60 * 60 * 1000;
  
  let price = basePrice;
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i) * hourMs;
    
    // Generate price movement
    let randomComponent = (Math.random() - 0.5) * 2 * volatility;
    
    // Add correlation component if reference prices provided
    if (referencePrices && referencePrices[i] !== undefined && i > 0) {
      const refReturn = (referencePrices[i] - referencePrices[i - 1]) / referencePrices[i - 1];
      randomComponent = correlationFactor * refReturn + (1 - Math.abs(correlationFactor)) * randomComponent;
    }
    
    price = price * (1 + randomComponent);
    price = Math.max(price * 0.1, price); // Prevent negative prices
    
    prices.push({ timestamp, price });
  }
  
  return { symbol, assetType, prices };
}

/**
 * Get correlation color for heatmap visualization
 */
export function getCorrelationColor(correlation: number): string {
  // Red for negative, green for positive, white for neutral
  if (correlation >= 0.7) return '#22c55e'; // Strong positive - green
  if (correlation >= 0.4) return '#86efac'; // Moderate positive - light green
  if (correlation >= 0.1) return '#dcfce7'; // Weak positive - very light green
  if (correlation > -0.1) return '#f5f5f5'; // Neutral - gray
  if (correlation > -0.4) return '#fecaca'; // Weak negative - light red
  if (correlation > -0.7) return '#f87171'; // Moderate negative - red
  return '#dc2626'; // Strong negative - dark red
}

/**
 * Get all cached assets
 */
export function getCachedAssets(): AssetPriceHistory[] {
  return Array.from(priceHistoryCache.values());
}

/**
 * Clear price history cache
 */
export function clearPriceHistoryCache(): void {
  priceHistoryCache.clear();
}

/**
 * Seed demo data for correlation matrix
 */
export function seedDemoCorrelationData(): void {
  // Generate base reference for creating correlated assets
  const baseHistory = generateSimulatedPriceHistory('SPY', 'stock', 450, 0.01);
  const basePrices = baseHistory.prices.map(p => p.price);
  
  // Stocks - generally correlated with market
  const stockAssets = [
    { symbol: 'AAPL', base: 180, vol: 0.015, corr: 0.85 },
    { symbol: 'MSFT', base: 380, vol: 0.012, corr: 0.82 },
    { symbol: 'GOOGL', base: 140, vol: 0.018, corr: 0.78 },
    { symbol: 'AMZN', base: 175, vol: 0.02, corr: 0.75 },
    { symbol: 'NVDA', base: 480, vol: 0.025, corr: 0.7 },
  ];
  
  // Crypto - lower correlation with stocks
  const cryptoAssets = [
    { symbol: 'BTC', base: 42000, vol: 0.03, corr: 0.3 },
    { symbol: 'ETH', base: 2500, vol: 0.035, corr: 0.25 },
    { symbol: 'SOL', base: 100, vol: 0.045, corr: 0.2 },
  ];
  
  // Forex - often inverse correlation
  const forexAssets = [
    { symbol: 'EUR/USD', base: 1.08, vol: 0.005, corr: -0.2 },
    { symbol: 'GBP/USD', base: 1.27, vol: 0.006, corr: -0.15 },
  ];
  
  // Commodities - mixed correlations
  const commodityAssets = [
    { symbol: 'GOLD', base: 2000, vol: 0.008, corr: -0.1 },
    { symbol: 'OIL', base: 75, vol: 0.02, corr: 0.4 },
  ];
  
  // Generate and cache all assets
  for (const asset of stockAssets) {
    const history = generateSimulatedPriceHistory(
      asset.symbol, 'stock', asset.base, asset.vol, asset.corr, basePrices
    );
    priceHistoryCache.set(`stock:${asset.symbol}`, history);
  }
  
  for (const asset of cryptoAssets) {
    const history = generateSimulatedPriceHistory(
      asset.symbol, 'crypto', asset.base, asset.vol, asset.corr, basePrices
    );
    priceHistoryCache.set(`crypto:${asset.symbol}`, history);
  }
  
  for (const asset of forexAssets) {
    const history = generateSimulatedPriceHistory(
      asset.symbol, 'forex', asset.base, asset.vol, asset.corr, basePrices
    );
    priceHistoryCache.set(`forex:${asset.symbol}`, history);
  }
  
  for (const asset of commodityAssets) {
    const history = generateSimulatedPriceHistory(
      asset.symbol, 'commodity', asset.base, asset.vol, asset.corr, basePrices
    );
    priceHistoryCache.set(`commodity:${asset.symbol}`, history);
  }
  
  // Also cache SPY as reference
  priceHistoryCache.set('stock:SPY', baseHistory);
}

export default {
  pearsonCorrelation,
  getCorrelationStrength,
  calculateAssetCorrelation,
  calculateCorrelationMatrix,
  updatePriceHistory,
  getPriceHistory,
  getCachedAssets,
  clearPriceHistoryCache,
  seedDemoCorrelationData,
  getCorrelationColor,
  generateSimulatedPriceHistory
};
