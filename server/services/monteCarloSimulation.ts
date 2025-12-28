/**
 * Monte Carlo Simulation Service
 * 
 * Implements Monte Carlo simulation for stress-testing trading strategies
 * by running thousands of random market scenarios based on historical data.
 * 
 * Research Basis:
 * - Bootstrap resampling for realistic return distributions
 * - Geometric Brownian Motion for price path simulation
 * - Value at Risk (VaR) and Conditional VaR calculations
 * - Confidence interval estimation for expected returns
 */

import { callDataApi } from "../_core/dataApi";

// Types
export interface MonteCarloConfig {
  symbol: string;
  initialCapital: number;
  numSimulations: number; // Typically 1000-10000
  timeHorizonDays: number;
  confidenceLevels: number[]; // e.g., [0.95, 0.99]
  strategyType: 'buy_hold' | 'momentum' | 'mean_reversion' | 'enhanced';
  riskFreeRate?: number;
}

export interface SimulationPath {
  day: number;
  values: number[]; // Portfolio values at each simulation
  mean: number;
  median: number;
  percentile5: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
}

export interface MonteCarloResult {
  config: MonteCarloConfig;
  // Summary Statistics
  expectedReturn: number;
  medianReturn: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  // Risk Metrics
  valueAtRisk: Record<number, number>; // VaR at each confidence level
  conditionalVaR: Record<number, number>; // CVaR (Expected Shortfall)
  maxDrawdownDistribution: {
    mean: number;
    median: number;
    percentile95: number;
    percentile99: number;
  };
  // Probability Analysis
  probabilityOfProfit: number;
  probabilityOfLoss: number;
  probabilityOfRuin: number; // Probability of losing > 50%
  // Return Distribution
  returnDistribution: {
    bins: number[];
    frequencies: number[];
  };
  // Confidence Intervals
  confidenceIntervals: Record<number, { lower: number; upper: number }>;
  // Simulation Paths (sampled for visualization)
  simulationPaths: SimulationPath[];
  // Final Values Distribution
  finalValues: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
  };
  // Performance by Scenario
  scenarioAnalysis: {
    bullMarket: { probability: number; avgReturn: number };
    bearMarket: { probability: number; avgReturn: number };
    sideways: { probability: number; avgReturn: number };
  };
}

// Fetch historical data for simulation
interface YahooChartResponse {
  chart?: {
    result?: Array<{
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
      };
    }>;
  };
}

async function fetchHistoricalReturns(symbol: string, days: number = 252 * 5): Promise<number[]> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range: "5y",
        includeAdjustedClose: true,
      },
    }) as YahooChartResponse;

    if (!response?.chart?.result?.[0]) {
      throw new Error("No data returned from API");
    }

    const result = response.chart.result[0];
    const quotes = result.indicators.quote[0];
    const closes = quotes.close.filter((c: number | null) => c !== null) as number[];

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const dailyReturn = (closes[i] - closes[i - 1]) / closes[i - 1];
      returns.push(dailyReturn);
    }

    return returns;
  } catch (error) {
    console.error(`[MonteCarlo] Error fetching data for ${symbol}:`, error);
    // Return synthetic returns based on typical market behavior
    return generateSyntheticReturns(days);
  }
}

// Generate synthetic returns for fallback
function generateSyntheticReturns(days: number): number[] {
  const returns: number[] = [];
  const meanReturn = 0.0004; // ~10% annual
  const volatility = 0.015; // ~24% annual volatility
  
  for (let i = 0; i < days; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    returns.push(meanReturn + volatility * z);
  }
  
  return returns;
}

// Bootstrap resampling - randomly sample from historical returns
function bootstrapSample(returns: number[], sampleSize: number): number[] {
  const sample: number[] = [];
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * returns.length);
    sample.push(returns[idx]);
  }
  return sample;
}

// Block bootstrap - preserve autocorrelation structure
function blockBootstrapSample(returns: number[], sampleSize: number, blockSize: number = 20): number[] {
  const sample: number[] = [];
  while (sample.length < sampleSize) {
    const startIdx = Math.floor(Math.random() * (returns.length - blockSize));
    for (let i = 0; i < blockSize && sample.length < sampleSize; i++) {
      sample.push(returns[startIdx + i]);
    }
  }
  return sample;
}

// Apply strategy to returns
function applyStrategy(
  returns: number[],
  strategyType: string,
  lookback: number = 20
): number[] {
  if (strategyType === 'buy_hold') {
    return returns;
  }

  const strategyReturns: number[] = [];
  let position = 1; // 1 = long, 0 = flat, -1 = short

  for (let i = 0; i < returns.length; i++) {
    if (i < lookback) {
      strategyReturns.push(returns[i] * position);
      continue;
    }

    // Calculate momentum signal
    const recentReturns = returns.slice(i - lookback, i);
    const momentum = recentReturns.reduce((a, b) => a + b, 0);

    if (strategyType === 'momentum') {
      position = momentum > 0 ? 1 : 0;
    } else if (strategyType === 'mean_reversion') {
      position = momentum < -0.05 ? 1 : momentum > 0.05 ? 0 : position;
    } else if (strategyType === 'enhanced') {
      // Enhanced strategy with RSI-like logic
      const avgGain = recentReturns.filter(r => r > 0).reduce((a, b) => a + b, 0) / lookback;
      const avgLoss = Math.abs(recentReturns.filter(r => r < 0).reduce((a, b) => a + b, 0)) / lookback;
      const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
      const rsi = 100 - (100 / (1 + rs));
      
      if (rsi < 30) position = 1;
      else if (rsi > 70) position = 0;
    }

    strategyReturns.push(returns[i] * position);
  }

  return strategyReturns;
}

// Calculate portfolio path from returns
function calculatePortfolioPath(initialCapital: number, returns: number[]): number[] {
  const path = [initialCapital];
  let value = initialCapital;
  
  for (const ret of returns) {
    value *= (1 + ret);
    path.push(value);
  }
  
  return path;
}

// Calculate max drawdown from portfolio path
function calculateMaxDrawdown(path: number[]): number {
  let maxDrawdown = 0;
  let peak = path[0];
  
  for (const value of path) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  return maxDrawdown;
}

// Calculate percentile
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

// Calculate mean
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate standard deviation
function std(arr: number[]): number {
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

// Calculate skewness
function skewness(arr: number[]): number {
  const n = arr.length;
  const avg = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  
  const sum = arr.reduce((acc, val) => acc + Math.pow((val - avg) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

// Calculate kurtosis
function kurtosis(arr: number[]): number {
  const n = arr.length;
  const avg = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  
  const sum = arr.reduce((acc, val) => acc + Math.pow((val - avg) / s, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
         (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

// Create histogram bins
function createHistogram(arr: number[], numBins: number = 50): { bins: number[]; frequencies: number[] } {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const binWidth = (max - min) / numBins;
  
  const bins: number[] = [];
  const frequencies: number[] = new Array(numBins).fill(0);
  
  for (let i = 0; i < numBins; i++) {
    bins.push(min + (i + 0.5) * binWidth);
  }
  
  for (const val of arr) {
    const binIdx = Math.min(Math.floor((val - min) / binWidth), numBins - 1);
    frequencies[binIdx]++;
  }
  
  // Normalize to percentages
  const total = arr.length;
  for (let i = 0; i < frequencies.length; i++) {
    frequencies[i] = (frequencies[i] / total) * 100;
  }
  
  return { bins, frequencies };
}

// Main Monte Carlo simulation function
export async function runMonteCarloSimulation(
  config: MonteCarloConfig
): Promise<MonteCarloResult> {
  const {
    symbol,
    initialCapital,
    numSimulations,
    timeHorizonDays,
    confidenceLevels,
    strategyType,
    riskFreeRate = 0.05,
  } = config;

  // Fetch historical returns
  const historicalReturns = await fetchHistoricalReturns(symbol);
  
  // Run simulations
  const finalValues: number[] = [];
  const finalReturns: number[] = [];
  const maxDrawdowns: number[] = [];
  const allPaths: number[][] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    // Bootstrap sample returns
    const sampledReturns = blockBootstrapSample(historicalReturns, timeHorizonDays);
    
    // Apply strategy
    const strategyReturns = applyStrategy(sampledReturns, strategyType);
    
    // Calculate portfolio path
    const path = calculatePortfolioPath(initialCapital, strategyReturns);
    
    // Store results
    finalValues.push(path[path.length - 1]);
    finalReturns.push((path[path.length - 1] - initialCapital) / initialCapital);
    maxDrawdowns.push(calculateMaxDrawdown(path));
    
    // Store sampled paths for visualization (every 100th simulation)
    if (sim % Math.max(1, Math.floor(numSimulations / 100)) === 0) {
      allPaths.push(path);
    }
  }
  
  // Calculate summary statistics
  const expectedReturn = mean(finalReturns);
  const medianReturn = percentile(finalReturns, 0.5);
  const standardDeviation = std(finalReturns);
  const returnSkewness = skewness(finalReturns);
  const returnKurtosis = kurtosis(finalReturns);
  
  // Calculate VaR and CVaR
  const valueAtRisk: Record<number, number> = {};
  const conditionalVaR: Record<number, number> = {};
  
  for (const level of confidenceLevels) {
    const varThreshold = percentile(finalReturns, 1 - level);
    valueAtRisk[level] = -varThreshold; // VaR is typically expressed as positive
    
    // CVaR = average of returns below VaR threshold
    const tailReturns = finalReturns.filter(r => r <= varThreshold);
    conditionalVaR[level] = tailReturns.length > 0 ? -mean(tailReturns) : -varThreshold;
  }
  
  // Max drawdown distribution
  const maxDrawdownDistribution = {
    mean: mean(maxDrawdowns),
    median: percentile(maxDrawdowns, 0.5),
    percentile95: percentile(maxDrawdowns, 0.95),
    percentile99: percentile(maxDrawdowns, 0.99),
  };
  
  // Probability analysis
  const probabilityOfProfit = finalReturns.filter(r => r > 0).length / numSimulations;
  const probabilityOfLoss = finalReturns.filter(r => r < 0).length / numSimulations;
  const probabilityOfRuin = finalReturns.filter(r => r < -0.5).length / numSimulations;
  
  // Return distribution histogram
  const returnDistribution = createHistogram(finalReturns.map(r => r * 100), 50);
  
  // Confidence intervals
  const confidenceIntervals: Record<number, { lower: number; upper: number }> = {};
  for (const level of confidenceLevels) {
    const alpha = (1 - level) / 2;
    confidenceIntervals[level] = {
      lower: percentile(finalReturns, alpha),
      upper: percentile(finalReturns, 1 - alpha),
    };
  }
  
  // Create simulation paths for visualization
  const simulationPaths: SimulationPath[] = [];
  const maxPathLength = Math.max(...allPaths.map(p => p.length));
  
  for (let day = 0; day < maxPathLength; day++) {
    const dayValues = allPaths.map(path => path[Math.min(day, path.length - 1)]);
    simulationPaths.push({
      day,
      values: dayValues.slice(0, 10), // Store first 10 paths for visualization
      mean: mean(dayValues),
      median: percentile(dayValues, 0.5),
      percentile5: percentile(dayValues, 0.05),
      percentile25: percentile(dayValues, 0.25),
      percentile75: percentile(dayValues, 0.75),
      percentile95: percentile(dayValues, 0.95),
    });
  }
  
  // Scenario analysis
  const bullThreshold = 0.15; // 15% return
  const bearThreshold = -0.1; // -10% return
  
  const bullReturns = finalReturns.filter(r => r > bullThreshold);
  const bearReturns = finalReturns.filter(r => r < bearThreshold);
  const sidewaysReturns = finalReturns.filter(r => r >= bearThreshold && r <= bullThreshold);
  
  const scenarioAnalysis = {
    bullMarket: {
      probability: bullReturns.length / numSimulations,
      avgReturn: bullReturns.length > 0 ? mean(bullReturns) : 0,
    },
    bearMarket: {
      probability: bearReturns.length / numSimulations,
      avgReturn: bearReturns.length > 0 ? mean(bearReturns) : 0,
    },
    sideways: {
      probability: sidewaysReturns.length / numSimulations,
      avgReturn: sidewaysReturns.length > 0 ? mean(sidewaysReturns) : 0,
    },
  };
  
  // Final values statistics
  const finalValuesStats = {
    min: Math.min(...finalValues),
    max: Math.max(...finalValues),
    mean: mean(finalValues),
    median: percentile(finalValues, 0.5),
    std: std(finalValues),
  };
  
  return {
    config,
    expectedReturn,
    medianReturn,
    standardDeviation,
    skewness: returnSkewness,
    kurtosis: returnKurtosis,
    valueAtRisk,
    conditionalVaR,
    maxDrawdownDistribution,
    probabilityOfProfit,
    probabilityOfLoss,
    probabilityOfRuin,
    returnDistribution,
    confidenceIntervals,
    simulationPaths,
    finalValues: finalValuesStats,
    scenarioAnalysis,
  };
}

// Quick simulation for real-time preview
export async function runQuickSimulation(
  symbol: string,
  initialCapital: number,
  timeHorizonDays: number
): Promise<{
  expectedReturn: number;
  probabilityOfProfit: number;
  var95: number;
  maxDrawdown: number;
}> {
  const result = await runMonteCarloSimulation({
    symbol,
    initialCapital,
    numSimulations: 500, // Fewer simulations for speed
    timeHorizonDays,
    confidenceLevels: [0.95],
    strategyType: 'buy_hold',
  });
  
  return {
    expectedReturn: result.expectedReturn,
    probabilityOfProfit: result.probabilityOfProfit,
    var95: result.valueAtRisk[0.95] || 0,
    maxDrawdown: result.maxDrawdownDistribution.median,
  };
}
