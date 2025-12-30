/**
 * Multi-Asset Correlation Engine
 * 
 * Analyzes correlations across different asset classes (stocks, crypto, forex, commodities)
 * to identify diversification opportunities and risk concentrations.
 * 
 * Based on research from:
 * - "Modern Portfolio Theory" (Markowitz, 1952)
 * - "Cross-Asset Correlations in Stress and Normal Market Conditions" (Longin & Solnik, 2001)
 * - "Dynamic Conditional Correlation" (Engle, 2002)
 */

// Asset types
export type AssetClass = 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond' | 'etf';

// Asset definition
export interface Asset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector?: string;
  region?: string;
}

// Price data point
export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

// Correlation result between two assets
export interface CorrelationPair {
  asset1: Asset;
  asset2: Asset;
  correlation: number;
  pValue: number;
  sampleSize: number;
  period: string;
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
  direction: 'positive' | 'negative' | 'neutral';
}

// Correlation matrix result
export interface CorrelationMatrix {
  assets: Asset[];
  matrix: number[][];
  timestamp: number;
  period: string;
  method: 'pearson' | 'spearman' | 'kendall';
}

// Rolling correlation result
export interface RollingCorrelation {
  asset1: Asset;
  asset2: Asset;
  dataPoints: Array<{
    timestamp: number;
    correlation: number;
    window: number;
  }>;
  averageCorrelation: number;
  volatility: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Cross-asset analysis result
export interface CrossAssetAnalysis {
  assetClasses: AssetClass[];
  interClassCorrelations: Record<string, number>;
  diversificationScore: number;
  riskConcentrations: Array<{
    assets: Asset[];
    correlation: number;
    risk: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
}

// Regime-based correlation
export interface RegimeCorrelation {
  regime: 'bull' | 'bear' | 'crisis' | 'normal';
  correlations: CorrelationPair[];
  averageCorrelation: number;
  observation: string;
}

// Portfolio correlation analysis
export interface PortfolioCorrelationAnalysis {
  assets: Asset[];
  weights: number[];
  portfolioVariance: number;
  diversificationRatio: number;
  effectiveAssets: number;
  correlationContribution: Record<string, number>;
  recommendations: string[];
}

// Default asset universe
const DEFAULT_ASSETS: Asset[] = [
  // Stocks
  { symbol: 'SPY', name: 'S&P 500 ETF', assetClass: 'etf', sector: 'Index' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', assetClass: 'etf', sector: 'Tech' },
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'stock', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', assetClass: 'stock', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetClass: 'stock', sector: 'Technology' },
  { symbol: 'JPM', name: 'JPMorgan Chase', assetClass: 'stock', sector: 'Finance' },
  { symbol: 'XOM', name: 'Exxon Mobil', assetClass: 'stock', sector: 'Energy' },
  
  // Crypto
  { symbol: 'BTC', name: 'Bitcoin', assetClass: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', assetClass: 'crypto' },
  { symbol: 'SOL', name: 'Solana', assetClass: 'crypto' },
  
  // Forex
  { symbol: 'EUR/USD', name: 'Euro/US Dollar', assetClass: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound/US Dollar', assetClass: 'forex' },
  { symbol: 'USD/JPY', name: 'US Dollar/Japanese Yen', assetClass: 'forex' },
  
  // Commodities
  { symbol: 'GLD', name: 'Gold', assetClass: 'commodity' },
  { symbol: 'SLV', name: 'Silver', assetClass: 'commodity' },
  { symbol: 'USO', name: 'Oil', assetClass: 'commodity' },
  
  // Bonds
  { symbol: 'TLT', name: '20+ Year Treasury', assetClass: 'bond' },
  { symbol: 'AGG', name: 'Aggregate Bond', assetClass: 'bond' },
];

// In-memory price cache
const priceCache = new Map<string, PricePoint[]>();

/**
 * Calculate Pearson correlation coefficient
 */
function calculatePearsonCorrelation(x: number[], y: number[]): { correlation: number; pValue: number } {
  if (x.length !== y.length || x.length < 3) {
    return { correlation: 0, pValue: 1 };
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return { correlation: 0, pValue: 1 };
  }

  const correlation = numerator / denominator;

  // Calculate p-value using t-distribution approximation
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(t), n - 2));

  return { correlation, pValue };
}

/**
 * Approximate t-distribution CDF
 */
function tDistributionCDF(t: number, df: number): number {
  // Using normal approximation for large df
  if (df > 30) {
    return normalCDF(t);
  }
  
  // Simple approximation for small df
  const x = df / (df + t * t);
  return 1 - 0.5 * Math.pow(x, df / 2);
}

/**
 * Normal distribution CDF approximation
 */
function normalCDF(x: number): number {
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

/**
 * Calculate returns from prices
 */
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/**
 * Get correlation strength label
 */
function getCorrelationStrength(correlation: number): 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' {
  const absCorr = Math.abs(correlation);
  if (absCorr >= 0.8) return 'very_strong';
  if (absCorr >= 0.6) return 'strong';
  if (absCorr >= 0.4) return 'moderate';
  if (absCorr >= 0.2) return 'weak';
  return 'very_weak';
}

/**
 * Calculate correlation between two assets
 */
export function calculateCorrelation(
  asset1: Asset,
  prices1: number[],
  asset2: Asset,
  prices2: number[],
  period: string = '1Y'
): CorrelationPair {
  const returns1 = calculateReturns(prices1);
  const returns2 = calculateReturns(prices2);

  // Align lengths
  const minLength = Math.min(returns1.length, returns2.length);
  const alignedReturns1 = returns1.slice(-minLength);
  const alignedReturns2 = returns2.slice(-minLength);

  const { correlation, pValue } = calculatePearsonCorrelation(alignedReturns1, alignedReturns2);

  return {
    asset1,
    asset2,
    correlation,
    pValue,
    sampleSize: minLength,
    period,
    strength: getCorrelationStrength(correlation),
    direction: correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'neutral'
  };
}

/**
 * Calculate correlation matrix for multiple assets
 */
export function calculateCorrelationMatrix(
  assets: Asset[],
  priceData: Map<string, number[]>,
  period: string = '1Y',
  method: 'pearson' | 'spearman' | 'kendall' = 'pearson'
): CorrelationMatrix {
  const n = assets.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  // Calculate returns for all assets
  const returnsMap = new Map<string, number[]>();
  assets.forEach(asset => {
    const prices = priceData.get(asset.symbol) || [];
    returnsMap.set(asset.symbol, calculateReturns(prices));
  });

  // Calculate pairwise correlations
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1; // Self-correlation is 1
    for (let j = i + 1; j < n; j++) {
      const returns1 = returnsMap.get(assets[i].symbol) || [];
      const returns2 = returnsMap.get(assets[j].symbol) || [];

      const minLength = Math.min(returns1.length, returns2.length);
      const alignedReturns1 = returns1.slice(-minLength);
      const alignedReturns2 = returns2.slice(-minLength);

      const { correlation } = calculatePearsonCorrelation(alignedReturns1, alignedReturns2);
      matrix[i][j] = correlation;
      matrix[j][i] = correlation; // Symmetric
    }
  }

  return {
    assets,
    matrix,
    timestamp: Date.now(),
    period,
    method
  };
}

/**
 * Calculate rolling correlation over time
 */
export function calculateRollingCorrelation(
  asset1: Asset,
  prices1: number[],
  asset2: Asset,
  prices2: number[],
  windowSize: number = 30
): RollingCorrelation {
  const returns1 = calculateReturns(prices1);
  const returns2 = calculateReturns(prices2);

  const minLength = Math.min(returns1.length, returns2.length);
  const alignedReturns1 = returns1.slice(-minLength);
  const alignedReturns2 = returns2.slice(-minLength);

  const dataPoints: Array<{ timestamp: number; correlation: number; window: number }> = [];
  const correlations: number[] = [];

  for (let i = windowSize; i <= minLength; i++) {
    const window1 = alignedReturns1.slice(i - windowSize, i);
    const window2 = alignedReturns2.slice(i - windowSize, i);
    const { correlation } = calculatePearsonCorrelation(window1, window2);
    
    correlations.push(correlation);
    dataPoints.push({
      timestamp: Date.now() - (minLength - i) * 24 * 60 * 60 * 1000,
      correlation,
      window: windowSize
    });
  }

  // Calculate statistics
  const averageCorrelation = correlations.length > 0
    ? correlations.reduce((a, b) => a + b, 0) / correlations.length
    : 0;

  const volatility = correlations.length > 1
    ? Math.sqrt(correlations.reduce((sum, c) => sum + Math.pow(c - averageCorrelation, 2), 0) / (correlations.length - 1))
    : 0;

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (correlations.length >= 10) {
    const firstHalf = correlations.slice(0, Math.floor(correlations.length / 2));
    const secondHalf = correlations.slice(Math.floor(correlations.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg - firstAvg > 0.1) trend = 'increasing';
    else if (firstAvg - secondAvg > 0.1) trend = 'decreasing';
  }

  return {
    asset1,
    asset2,
    dataPoints,
    averageCorrelation,
    volatility,
    trend
  };
}

/**
 * Analyze cross-asset class correlations
 */
export function analyzeCrossAssetCorrelations(
  assets: Asset[],
  priceData: Map<string, number[]>
): CrossAssetAnalysis {
  const assetClasses = Array.from(new Set(assets.map(a => a.assetClass)));
  const interClassCorrelations: Record<string, number> = {};
  const riskConcentrations: Array<{ assets: Asset[]; correlation: number; risk: 'high' | 'medium' | 'low' }> = [];

  // Group assets by class
  const assetsByClass = new Map<AssetClass, Asset[]>();
  assets.forEach(asset => {
    const classAssets = assetsByClass.get(asset.assetClass) || [];
    classAssets.push(asset);
    assetsByClass.set(asset.assetClass, classAssets);
  });

  // Calculate inter-class correlations
  const classKeys = Array.from(assetsByClass.keys());
  for (let i = 0; i < classKeys.length; i++) {
    for (let j = i + 1; j < classKeys.length; j++) {
      const class1 = classKeys[i];
      const class2 = classKeys[j];
      const assets1 = assetsByClass.get(class1) || [];
      const assets2 = assetsByClass.get(class2) || [];

      // Calculate average correlation between classes
      let totalCorr = 0;
      let count = 0;

      for (const a1 of assets1) {
        for (const a2 of assets2) {
          const prices1 = priceData.get(a1.symbol) || [];
          const prices2 = priceData.get(a2.symbol) || [];
          
          if (prices1.length > 10 && prices2.length > 10) {
            const result = calculateCorrelation(a1, prices1, a2, prices2);
            totalCorr += result.correlation;
            count++;

            // Check for high correlation risk
            if (Math.abs(result.correlation) > 0.7) {
              riskConcentrations.push({
                assets: [a1, a2],
                correlation: result.correlation,
                risk: Math.abs(result.correlation) > 0.85 ? 'high' : 'medium'
              });
            }
          }
        }
      }

      if (count > 0) {
        interClassCorrelations[`${class1}-${class2}`] = totalCorr / count;
      }
    }
  }

  // Calculate diversification score (0-100)
  const avgInterClassCorr = Object.values(interClassCorrelations).length > 0
    ? Object.values(interClassCorrelations).reduce((a, b) => a + Math.abs(b), 0) / Object.values(interClassCorrelations).length
    : 0;
  const diversificationScore = Math.round((1 - avgInterClassCorr) * 100);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (diversificationScore < 40) {
    recommendations.push('Portfolio shows high correlation across asset classes. Consider adding uncorrelated assets.');
  }
  
  if (riskConcentrations.filter(r => r.risk === 'high').length > 0) {
    recommendations.push('High correlation detected between some assets. Review position sizing to manage concentration risk.');
  }

  const cryptoAssets = assets.filter(a => a.assetClass === 'crypto');
  const bondAssets = assets.filter(a => a.assetClass === 'bond');
  
  if (cryptoAssets.length > 0 && bondAssets.length === 0) {
    recommendations.push('Consider adding bonds for better diversification against crypto volatility.');
  }

  if (assetClasses.length < 3) {
    recommendations.push('Portfolio is concentrated in few asset classes. Consider expanding to more asset types.');
  }

  return {
    assetClasses,
    interClassCorrelations,
    diversificationScore,
    riskConcentrations,
    recommendations
  };
}

/**
 * Analyze correlations by market regime
 */
export function analyzeRegimeCorrelations(
  assets: Asset[],
  priceData: Map<string, number[]>,
  regimeData: Array<{ timestamp: number; regime: 'bull' | 'bear' | 'crisis' | 'normal' }>
): RegimeCorrelation[] {
  const regimes: ('bull' | 'bear' | 'crisis' | 'normal')[] = ['bull', 'bear', 'crisis', 'normal'];
  const results: RegimeCorrelation[] = [];

  for (const regime of regimes) {
    const regimePeriods = regimeData.filter(r => r.regime === regime);
    
    if (regimePeriods.length < 10) {
      continue;
    }

    const correlations: CorrelationPair[] = [];
    
    // Calculate correlations for this regime
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const prices1 = priceData.get(assets[i].symbol) || [];
        const prices2 = priceData.get(assets[j].symbol) || [];
        
        if (prices1.length > 10 && prices2.length > 10) {
          const result = calculateCorrelation(assets[i], prices1, assets[j], prices2, regime);
          correlations.push(result);
        }
      }
    }

    const avgCorrelation = correlations.length > 0
      ? correlations.reduce((sum, c) => sum + c.correlation, 0) / correlations.length
      : 0;

    let observation = '';
    if (regime === 'crisis' && avgCorrelation > 0.6) {
      observation = 'Correlations spike during crisis periods, reducing diversification benefits when needed most.';
    } else if (regime === 'bull' && avgCorrelation > 0.5) {
      observation = 'Assets tend to move together in bull markets.';
    } else if (regime === 'bear' && avgCorrelation > 0.7) {
      observation = 'High correlation in bear markets suggests limited downside protection.';
    } else {
      observation = `Average correlation of ${avgCorrelation.toFixed(2)} observed during ${regime} regime.`;
    }

    results.push({
      regime,
      correlations,
      averageCorrelation: avgCorrelation,
      observation
    });
  }

  return results;
}

/**
 * Analyze portfolio correlation and diversification
 */
export function analyzePortfolioCorrelation(
  assets: Asset[],
  weights: number[],
  priceData: Map<string, number[]>
): PortfolioCorrelationAnalysis {
  if (assets.length !== weights.length) {
    throw new Error('Assets and weights must have the same length');
  }

  // Calculate correlation matrix
  const correlationMatrix = calculateCorrelationMatrix(assets, priceData);

  // Calculate portfolio variance
  let portfolioVariance = 0;
  const correlationContribution: Record<string, number> = {};

  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      const contribution = weights[i] * weights[j] * correlationMatrix.matrix[i][j];
      portfolioVariance += contribution;
      
      if (i !== j) {
        const key = `${assets[i].symbol}-${assets[j].symbol}`;
        correlationContribution[key] = contribution;
      }
    }
  }

  // Calculate diversification ratio
  // DR = weighted average volatility / portfolio volatility
  const weightedAvgVol = weights.reduce((sum, w) => sum + w, 0);
  const portfolioVol = Math.sqrt(portfolioVariance);
  const diversificationRatio = portfolioVol > 0 ? weightedAvgVol / portfolioVol : 1;

  // Calculate effective number of assets
  // Using Herfindahl-Hirschman Index
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const effectiveAssets = hhi > 0 ? 1 / hhi : assets.length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (diversificationRatio < 1.2) {
    recommendations.push('Low diversification ratio suggests high correlation between holdings.');
  }

  if (effectiveAssets < assets.length * 0.5) {
    recommendations.push('Portfolio is concentrated in few positions. Consider rebalancing for better diversification.');
  }

  // Find highest correlation contributors
  const sortedContributions = Object.entries(correlationContribution)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3);

  if (sortedContributions.length > 0 && Math.abs(sortedContributions[0][1]) > 0.1) {
    recommendations.push(`Highest correlation impact: ${sortedContributions[0][0]} contributing ${(sortedContributions[0][1] * 100).toFixed(1)}% to portfolio variance.`);
  }

  return {
    assets,
    weights,
    portfolioVariance,
    diversificationRatio,
    effectiveAssets,
    correlationContribution,
    recommendations
  };
}

/**
 * Find uncorrelated assets for diversification
 */
export function findUncorrelatedAssets(
  currentAssets: Asset[],
  candidateAssets: Asset[],
  priceData: Map<string, number[]>,
  maxCorrelation: number = 0.3
): Asset[] {
  const uncorrelated: Asset[] = [];

  for (const candidate of candidateAssets) {
    const candidatePrices = priceData.get(candidate.symbol) || [];
    if (candidatePrices.length < 30) continue;

    let isUncorrelated = true;

    for (const current of currentAssets) {
      const currentPrices = priceData.get(current.symbol) || [];
      if (currentPrices.length < 30) continue;

      const result = calculateCorrelation(current, currentPrices, candidate, candidatePrices);
      
      if (Math.abs(result.correlation) > maxCorrelation) {
        isUncorrelated = false;
        break;
      }
    }

    if (isUncorrelated) {
      uncorrelated.push(candidate);
    }
  }

  return uncorrelated;
}

/**
 * Get default asset universe
 */
export function getDefaultAssets(): Asset[] {
  return [...DEFAULT_ASSETS];
}

/**
 * Generate sample price data for testing
 */
export function generateSamplePriceData(
  symbols: string[],
  days: number = 252
): Map<string, number[]> {
  const priceData = new Map<string, number[]>();

  symbols.forEach(symbol => {
    const prices: number[] = [];
    let price = 100 + Math.random() * 100;
    
    for (let i = 0; i < days; i++) {
      price = price * (1 + (Math.random() - 0.5) * 0.04);
      prices.push(price);
    }
    
    priceData.set(symbol, prices);
  });

  return priceData;
}

/**
 * Get correlation interpretation
 */
export function interpretCorrelation(correlation: number): string {
  const absCorr = Math.abs(correlation);
  const direction = correlation >= 0 ? 'positive' : 'negative';

  if (absCorr >= 0.8) {
    return `Very strong ${direction} correlation. Assets move almost in lockstep${direction === 'negative' ? ' but in opposite directions' : ''}.`;
  }
  if (absCorr >= 0.6) {
    return `Strong ${direction} correlation. Assets show significant co-movement.`;
  }
  if (absCorr >= 0.4) {
    return `Moderate ${direction} correlation. Some relationship exists but not dominant.`;
  }
  if (absCorr >= 0.2) {
    return `Weak ${direction} correlation. Limited relationship between assets.`;
  }
  return 'Very weak or no correlation. Assets move independently.';
}

/**
 * Calculate correlation stability score
 */
export function calculateCorrelationStability(
  rollingCorrelation: RollingCorrelation
): { score: number; interpretation: string } {
  const { volatility, trend, averageCorrelation } = rollingCorrelation;

  // Lower volatility = higher stability
  let score = Math.max(0, 100 - volatility * 200);

  // Penalize trending correlations
  if (trend !== 'stable') {
    score *= 0.8;
  }

  let interpretation = '';
  if (score >= 80) {
    interpretation = 'Highly stable correlation. Reliable for portfolio construction.';
  } else if (score >= 60) {
    interpretation = 'Moderately stable correlation. Monitor for changes.';
  } else if (score >= 40) {
    interpretation = 'Unstable correlation. Use with caution in portfolio decisions.';
  } else {
    interpretation = 'Very unstable correlation. Not reliable for diversification planning.';
  }

  return { score: Math.round(score), interpretation };
}
