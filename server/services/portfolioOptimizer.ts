/**
 * Portfolio Optimizer Service
 * Implements Modern Portfolio Theory (MPT) for optimal asset allocation
 * Features: Efficient Frontier, Mean-Variance Optimization, Sharpe Ratio Maximization
 */

export type RiskProfile = 'conservative' | 'moderate' | 'balanced' | 'growth' | 'aggressive';

export interface AssetData {
  symbol: string;
  name: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond';
  expectedReturn: number; // Annual expected return (decimal)
  volatility: number; // Annual standard deviation (decimal)
  currentPrice: number;
  historicalReturns?: number[]; // Daily returns for calculation
}

export interface PortfolioAllocation {
  symbol: string;
  name: string;
  assetType: string;
  weight: number; // 0-1
  amount?: number; // Dollar amount if portfolio value provided
  expectedContribution: number; // Contribution to portfolio return
}

export interface OptimizedPortfolio {
  allocations: PortfolioAllocation[];
  expectedReturn: number; // Annual
  expectedVolatility: number; // Annual
  sharpeRatio: number;
  riskProfile: RiskProfile;
  diversificationScore: number; // 0-100
  efficientFrontierPosition: 'optimal' | 'suboptimal' | 'inefficient';
  rebalancingNeeded?: RebalancingRecommendation[];
}

export interface RebalancingRecommendation {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  action: 'buy' | 'sell' | 'hold';
  percentageChange: number;
}

export interface EfficientFrontierPoint {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  allocations: { symbol: string; weight: number }[];
}

export interface MonteCarloResult {
  percentile5: number;
  percentile25: number;
  median: number;
  percentile75: number;
  percentile95: number;
  mean: number;
  bestCase: number;
  worstCase: number;
  probabilityOfLoss: number;
  probabilityOfTarget: number;
}

// Risk-free rate (approximate 10-year Treasury yield)
const RISK_FREE_RATE = 0.045;

/**
 * Calculate covariance between two return series
 */
export function calculateCovariance(returns1: number[], returns2: number[]): number {
  if (returns1.length !== returns2.length || returns1.length < 2) {
    return 0;
  }

  const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
  const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

  let covariance = 0;
  for (let i = 0; i < returns1.length; i++) {
    covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
  }

  return covariance / (returns1.length - 1);
}

/**
 * Build covariance matrix from asset data
 */
export function buildCovarianceMatrix(assets: AssetData[]): number[][] {
  const n = assets.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Variance on diagonal
        matrix[i][j] = Math.pow(assets[i].volatility, 2);
      } else if (assets[i].historicalReturns && assets[j].historicalReturns) {
        // Covariance from historical data
        matrix[i][j] = calculateCovariance(
          assets[i].historicalReturns as number[],
          assets[j].historicalReturns as number[]
        );
      } else {
        // Estimate covariance using correlation assumptions
        const correlation = estimateCorrelation(assets[i], assets[j]);
        matrix[i][j] = correlation * assets[i].volatility * assets[j].volatility;
      }
    }
  }

  return matrix;
}

/**
 * Estimate correlation between assets based on asset types
 */
function estimateCorrelation(asset1: AssetData, asset2: AssetData): number {
  const correlationMap: Record<string, Record<string, number>> = {
    stock: { stock: 0.6, crypto: 0.3, forex: 0.1, commodity: 0.2, bond: -0.2 },
    crypto: { stock: 0.3, crypto: 0.7, forex: 0.1, commodity: 0.15, bond: -0.1 },
    forex: { stock: 0.1, crypto: 0.1, forex: 0.5, commodity: 0.2, bond: 0.1 },
    commodity: { stock: 0.2, crypto: 0.15, forex: 0.2, commodity: 0.5, bond: 0.0 },
    bond: { stock: -0.2, crypto: -0.1, forex: 0.1, commodity: 0.0, bond: 0.8 },
  };

  return correlationMap[asset1.assetType]?.[asset2.assetType] ?? 0.3;
}

/**
 * Calculate portfolio return given weights
 */
export function calculatePortfolioReturn(assets: AssetData[], weights: number[]): number {
  return assets.reduce((sum, asset, i) => sum + asset.expectedReturn * weights[i], 0);
}

/**
 * Calculate portfolio volatility given weights and covariance matrix
 */
export function calculatePortfolioVolatility(
  weights: number[],
  covarianceMatrix: number[][]
): number {
  let variance = 0;
  const n = weights.length;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }

  return Math.sqrt(variance);
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(
  expectedReturn: number,
  volatility: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (volatility === 0) return 0;
  return (expectedReturn - riskFreeRate) / volatility;
}

/**
 * Get target volatility based on risk profile
 */
function getTargetVolatility(riskProfile: RiskProfile): { min: number; max: number; target: number } {
  const profiles: Record<RiskProfile, { min: number; max: number; target: number }> = {
    conservative: { min: 0.05, max: 0.10, target: 0.08 },
    moderate: { min: 0.08, max: 0.15, target: 0.12 },
    balanced: { min: 0.12, max: 0.20, target: 0.16 },
    growth: { min: 0.18, max: 0.28, target: 0.22 },
    aggressive: { min: 0.25, max: 0.40, target: 0.30 },
  };
  return profiles[riskProfile];
}

/**
 * Generate random portfolio weights that sum to 1
 */
function generateRandomWeights(n: number): number[] {
  const weights = Array.from({ length: n }, () => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Optimize portfolio using Monte Carlo simulation
 * Finds the portfolio with best Sharpe ratio within risk constraints
 */
export function optimizePortfolio(
  assets: AssetData[],
  riskProfile: RiskProfile,
  iterations: number = 10000
): OptimizedPortfolio {
  const n = assets.length;
  const covarianceMatrix = buildCovarianceMatrix(assets);
  const targetVol = getTargetVolatility(riskProfile);

  let bestSharpe = -Infinity;
  let bestWeights: number[] = Array(n).fill(1 / n);
  let bestReturn = 0;
  let bestVolatility = 0;

  // Monte Carlo optimization
  for (let i = 0; i < iterations; i++) {
    const weights = generateRandomWeights(n);
    const portfolioReturn = calculatePortfolioReturn(assets, weights);
    const portfolioVol = calculatePortfolioVolatility(weights, covarianceMatrix);
    const sharpe = calculateSharpeRatio(portfolioReturn, portfolioVol);

    // Check if within risk tolerance and better than current best
    if (portfolioVol >= targetVol.min && portfolioVol <= targetVol.max && sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = weights;
      bestReturn = portfolioReturn;
      bestVolatility = portfolioVol;
    }
  }

  // If no portfolio found within constraints, use equal weight
  if (bestSharpe === -Infinity) {
    bestWeights = Array(n).fill(1 / n);
    bestReturn = calculatePortfolioReturn(assets, bestWeights);
    bestVolatility = calculatePortfolioVolatility(bestWeights, covarianceMatrix);
    bestSharpe = calculateSharpeRatio(bestReturn, bestVolatility);
  }

  // Build allocations
  const allocations: PortfolioAllocation[] = assets.map((asset, i) => ({
    symbol: asset.symbol,
    name: asset.name,
    assetType: asset.assetType,
    weight: Math.round(bestWeights[i] * 10000) / 10000,
    expectedContribution: Math.round(bestWeights[i] * asset.expectedReturn * 10000) / 10000,
  }));

  // Sort by weight descending
  allocations.sort((a, b) => b.weight - a.weight);

  // Calculate diversification score
  const diversificationScore = calculateDiversificationScore(allocations);

  return {
    allocations,
    expectedReturn: Math.round(bestReturn * 10000) / 10000,
    expectedVolatility: Math.round(bestVolatility * 10000) / 10000,
    sharpeRatio: Math.round(bestSharpe * 100) / 100,
    riskProfile,
    diversificationScore,
    efficientFrontierPosition: bestSharpe > 0.5 ? 'optimal' : bestSharpe > 0 ? 'suboptimal' : 'inefficient',
  };
}

/**
 * Calculate diversification score (0-100)
 */
function calculateDiversificationScore(allocations: PortfolioAllocation[]): number {
  // Herfindahl-Hirschman Index (HHI) based score
  const hhi = allocations.reduce((sum, a) => sum + Math.pow(a.weight, 2), 0);
  const n = allocations.length;
  
  // Normalize: HHI ranges from 1/n (perfectly diversified) to 1 (concentrated)
  const minHHI = 1 / n;
  const normalizedHHI = (hhi - minHHI) / (1 - minHHI);
  
  // Convert to 0-100 score (higher is better)
  const concentrationPenalty = normalizedHHI * 50;
  
  // Asset type diversity bonus
  const assetTypes = new Set(allocations.map(a => a.assetType));
  const typeDiversityBonus = Math.min(assetTypes.size * 10, 30);
  
  return Math.round(Math.max(0, Math.min(100, 70 - concentrationPenalty + typeDiversityBonus)));
}

/**
 * Generate efficient frontier points
 */
export function generateEfficientFrontier(
  assets: AssetData[],
  points: number = 50
): EfficientFrontierPoint[] {
  const n = assets.length;
  const covarianceMatrix = buildCovarianceMatrix(assets);
  const frontier: EfficientFrontierPoint[] = [];

  // Find min and max possible returns
  const minReturn = Math.min(...assets.map(a => a.expectedReturn));
  const maxReturn = Math.max(...assets.map(a => a.expectedReturn));

  // For each target return, find minimum variance portfolio
  for (let i = 0; i < points; i++) {
    const targetReturn = minReturn + (maxReturn - minReturn) * (i / (points - 1));
    
    // Monte Carlo to find min variance for this return
    let minVol = Infinity;
    let bestWeights: number[] = [];
    
    for (let j = 0; j < 5000; j++) {
      const weights = generateRandomWeights(n);
      const portfolioReturn = calculatePortfolioReturn(assets, weights);
      
      // Check if close to target return
      if (Math.abs(portfolioReturn - targetReturn) < 0.02) {
        const vol = calculatePortfolioVolatility(weights, covarianceMatrix);
        if (vol < minVol) {
          minVol = vol;
          bestWeights = weights;
        }
      }
    }

    if (bestWeights.length > 0) {
      const actualReturn = calculatePortfolioReturn(assets, bestWeights);
      frontier.push({
        expectedReturn: Math.round(actualReturn * 10000) / 10000,
        volatility: Math.round(minVol * 10000) / 10000,
        sharpeRatio: Math.round(calculateSharpeRatio(actualReturn, minVol) * 100) / 100,
        allocations: assets.map((a, idx) => ({
          symbol: a.symbol,
          weight: Math.round(bestWeights[idx] * 10000) / 10000,
        })),
      });
    }
  }

  return frontier.sort((a, b) => a.volatility - b.volatility);
}

/**
 * Run Monte Carlo simulation for portfolio outcomes
 */
export function runMonteCarloSimulation(
  portfolio: OptimizedPortfolio,
  initialValue: number,
  yearsToProject: number = 5,
  simulations: number = 10000,
  targetReturn?: number
): MonteCarloResult {
  const annualReturn = portfolio.expectedReturn;
  const annualVol = portfolio.expectedVolatility;
  const results: number[] = [];

  for (let i = 0; i < simulations; i++) {
    let value = initialValue;
    
    for (let year = 0; year < yearsToProject; year++) {
      // Generate random return using normal distribution approximation
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const yearReturn = annualReturn + annualVol * z;
      value *= (1 + yearReturn);
    }
    
    results.push(value);
  }

  results.sort((a, b) => a - b);

  const targetValue = targetReturn 
    ? initialValue * Math.pow(1 + targetReturn, yearsToProject)
    : initialValue * 1.5;

  return {
    percentile5: Math.round(results[Math.floor(simulations * 0.05)]),
    percentile25: Math.round(results[Math.floor(simulations * 0.25)]),
    median: Math.round(results[Math.floor(simulations * 0.5)]),
    percentile75: Math.round(results[Math.floor(simulations * 0.75)]),
    percentile95: Math.round(results[Math.floor(simulations * 0.95)]),
    mean: Math.round(results.reduce((a, b) => a + b, 0) / simulations),
    bestCase: Math.round(results[results.length - 1]),
    worstCase: Math.round(results[0]),
    probabilityOfLoss: Math.round((results.filter(r => r < initialValue).length / simulations) * 100),
    probabilityOfTarget: Math.round((results.filter(r => r >= targetValue).length / simulations) * 100),
  };
}

/**
 * Calculate rebalancing recommendations
 */
export function calculateRebalancing(
  currentAllocations: { symbol: string; weight: number }[],
  targetAllocations: PortfolioAllocation[],
  threshold: number = 0.05
): RebalancingRecommendation[] {
  const recommendations: RebalancingRecommendation[] = [];

  for (const target of targetAllocations) {
    const current = currentAllocations.find(c => c.symbol === target.symbol);
    const currentWeight = current?.weight ?? 0;
    const diff = target.weight - currentWeight;

    if (Math.abs(diff) >= threshold) {
      recommendations.push({
        symbol: target.symbol,
        currentWeight: Math.round(currentWeight * 10000) / 10000,
        targetWeight: target.weight,
        action: diff > 0 ? 'buy' : 'sell',
        percentageChange: Math.round(diff * 10000) / 100,
      });
    }
  }

  // Check for assets to sell completely
  for (const current of currentAllocations) {
    if (!targetAllocations.find(t => t.symbol === current.symbol) && current.weight > 0) {
      recommendations.push({
        symbol: current.symbol,
        currentWeight: current.weight,
        targetWeight: 0,
        action: 'sell',
        percentageChange: -Math.round(current.weight * 10000) / 100,
      });
    }
  }

  return recommendations.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));
}

/**
 * Generate sample asset data for demo purposes
 */
export function generateSampleAssets(): AssetData[] {
  return [
    // Stocks
    { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', expectedReturn: 0.12, volatility: 0.25, currentPrice: 185 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', assetType: 'stock', expectedReturn: 0.11, volatility: 0.22, currentPrice: 378 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'stock', expectedReturn: 0.10, volatility: 0.28, currentPrice: 142 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'stock', expectedReturn: 0.13, volatility: 0.30, currentPrice: 178 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', assetType: 'stock', expectedReturn: 0.18, volatility: 0.45, currentPrice: 495 },
    
    // Crypto
    { symbol: 'BTC', name: 'Bitcoin', assetType: 'crypto', expectedReturn: 0.25, volatility: 0.65, currentPrice: 43000 },
    { symbol: 'ETH', name: 'Ethereum', assetType: 'crypto', expectedReturn: 0.22, volatility: 0.70, currentPrice: 2300 },
    
    // Commodities
    { symbol: 'GOLD', name: 'Gold', assetType: 'commodity', expectedReturn: 0.05, volatility: 0.15, currentPrice: 2050 },
    { symbol: 'SILVER', name: 'Silver', assetType: 'commodity', expectedReturn: 0.06, volatility: 0.22, currentPrice: 24 },
    
    // Bonds (represented as ETFs)
    { symbol: 'BND', name: 'Total Bond Market', assetType: 'bond', expectedReturn: 0.04, volatility: 0.05, currentPrice: 72 },
    { symbol: 'TLT', name: '20+ Year Treasury', assetType: 'bond', expectedReturn: 0.035, volatility: 0.12, currentPrice: 92 },
    
    // Forex
    { symbol: 'EUR/USD', name: 'Euro/US Dollar', assetType: 'forex', expectedReturn: 0.02, volatility: 0.08, currentPrice: 1.08 },
  ];
}

/**
 * Get risk profile description
 */
export function getRiskProfileDescription(profile: RiskProfile): {
  name: string;
  description: string;
  targetReturn: string;
  targetVolatility: string;
  suitableFor: string;
} {
  const descriptions: Record<RiskProfile, ReturnType<typeof getRiskProfileDescription>> = {
    conservative: {
      name: 'Conservative',
      description: 'Focuses on capital preservation with minimal risk exposure',
      targetReturn: '4-6%',
      targetVolatility: '5-10%',
      suitableFor: 'Retirees, short-term goals, risk-averse investors',
    },
    moderate: {
      name: 'Moderate',
      description: 'Balanced approach with emphasis on stability',
      targetReturn: '6-9%',
      targetVolatility: '8-15%',
      suitableFor: 'Near-retirement, moderate risk tolerance',
    },
    balanced: {
      name: 'Balanced',
      description: 'Equal focus on growth and income with moderate risk',
      targetReturn: '8-12%',
      targetVolatility: '12-20%',
      suitableFor: 'Mid-career investors, medium-term goals',
    },
    growth: {
      name: 'Growth',
      description: 'Prioritizes capital appreciation over income',
      targetReturn: '12-18%',
      targetVolatility: '18-28%',
      suitableFor: 'Young investors, long-term goals',
    },
    aggressive: {
      name: 'Aggressive',
      description: 'Maximum growth potential with high risk tolerance',
      targetReturn: '18-30%',
      targetVolatility: '25-40%',
      suitableFor: 'Experienced investors, very long time horizon',
    },
  };

  return descriptions[profile];
}
