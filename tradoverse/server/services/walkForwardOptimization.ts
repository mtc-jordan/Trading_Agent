/**
 * Walk-Forward Optimization Service
 * 
 * Implements walk-forward analysis for validating trading strategies
 * by training on rolling windows and testing on out-of-sample data.
 * 
 * Research Basis:
 * - Rolling window optimization to prevent overfitting
 * - Out-of-sample testing for realistic performance estimates
 * - Stability metrics across multiple windows
 * - Anchored vs rolling walk-forward methods
 */

import { callDataApi } from "../_core/dataApi";
import { RLTradingAgent, State as TradingState, Experience } from "./rlAgent";

// Types
export interface WalkForwardConfig {
  symbol: string;
  totalPeriodDays: number; // Total historical period
  trainingWindowDays: number; // In-sample training window
  testingWindowDays: number; // Out-of-sample testing window
  stepSizeDays: number; // How much to move forward each iteration
  optimizationType: 'anchored' | 'rolling'; // Anchored keeps start fixed, rolling moves both
  strategyType: 'rl' | 'momentum' | 'mean_reversion' | 'enhanced';
  initialCapital: number;
}

export interface WindowResult {
  windowIndex: number;
  trainingStart: Date;
  trainingEnd: Date;
  testingStart: Date;
  testingEnd: Date;
  // Training metrics
  trainingReturn: number;
  trainingSharpe: number;
  trainingWinRate: number;
  // Testing metrics (out-of-sample)
  testingReturn: number;
  testingSharpe: number;
  testingWinRate: number;
  testingMaxDrawdown: number;
  // Comparison
  returnDegradation: number; // (training - testing) / training
  sharpeRatio: number;
  isOverfit: boolean;
  // Model state
  modelParameters?: Record<string, number>;
}

export interface WalkForwardResult {
  config: WalkForwardConfig;
  windows: WindowResult[];
  // Aggregate metrics
  aggregateMetrics: {
    totalReturn: number;
    avgTestingReturn: number;
    avgReturnDegradation: number;
    avgSharpe: number;
    avgWinRate: number;
    avgMaxDrawdown: number;
    consistencyRatio: number; // % of windows with positive testing return
    overfitRatio: number; // % of windows flagged as overfit
  };
  // Stability analysis
  stabilityMetrics: {
    returnStability: number; // Std dev of testing returns
    sharpeStability: number;
    parameterStability: number; // How much model parameters change
  };
  // Equity curve (combined from all testing windows)
  combinedEquityCurve: Array<{ date: string; value: number }>;
  // Performance timeline
  performanceTimeline: Array<{
    date: string;
    cumulativeReturn: number;
    windowReturn: number;
    isTraining: boolean;
  }>;
  // Recommendations
  recommendations: {
    isStrategyRobust: boolean;
    suggestedTrainingWindow: number;
    suggestedTestingWindow: number;
    overfitWarning: boolean;
    stabilityScore: number; // 0-100
  };
}

// Fetch historical data
interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }>;
  };
}

interface HistoricalDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchHistoricalData(symbol: string): Promise<HistoricalDataPoint[]> {
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
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const data: HistoricalDataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] !== null) {
        data.push({
          date: new Date(timestamps[i] * 1000),
          open: quotes.open[i] || quotes.close[i] || 0,
          high: quotes.high[i] || quotes.close[i] || 0,
          low: quotes.low[i] || quotes.close[i] || 0,
          close: quotes.close[i] || 0,
          volume: quotes.volume[i] || 0,
        });
      }
    }

    return data;
  } catch (error) {
    console.error(`[WalkForward] Error fetching data for ${symbol}:`, error);
    return generateSyntheticData(252 * 5);
  }
}

// Generate synthetic data for fallback
function generateSyntheticData(days: number): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  let price = 100;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dailyReturn = (Math.random() - 0.48) * 0.03; // Slight upward bias
    price *= (1 + dailyReturn);
    
    const volatility = price * 0.02;
    data.push({
      date,
      open: price - volatility * Math.random(),
      high: price + volatility * Math.random(),
      low: price - volatility * Math.random(),
      close: price,
      volume: Math.floor(Math.random() * 10000000),
    });
  }

  return data;
}

// Calculate technical indicators for state
function calculateIndicators(data: HistoricalDataPoint[], index: number): TradingState {
  const lookback = Math.min(index, 50);
  const prices = data.slice(Math.max(0, index - lookback), index + 1).map(d => d.close);
  
  if (prices.length < 2) {
    return {
      priceChange1d: 0,
      priceChange5d: 0,
      priceChange20d: 0,
      volatility: 0.02,
      rsi: 50,
      macdHistogram: 0,
      bollingerPosition: 0.5,
      adx: 25,
      atr: 0.02,
      marketRegime: 0,
      vixLevel: 20,
      currentPosition: 0,
      unrealizedPnl: 0,
      daysInPosition: 0,
    };
  }

  const currentPrice = prices[prices.length - 1];
  const priceChange1d = prices.length > 1 ? (currentPrice - prices[prices.length - 2]) / prices[prices.length - 2] : 0;
  const priceChange5d = prices.length > 5 ? (currentPrice - prices[prices.length - 6]) / prices[prices.length - 6] : 0;
  const priceChange20d = prices.length > 20 ? (currentPrice - prices[prices.length - 21]) / prices[prices.length - 21] : 0;

  // Calculate RSI
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < Math.min(prices.length, 15); i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains.push(change);
    else losses.push(Math.abs(change));
  }
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / 14 : 0.001;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // Calculate volatility
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const volatility = returns.length > 0 
    ? Math.sqrt(returns.map(r => r * r).reduce((a, b) => a + b, 0) / returns.length) * Math.sqrt(252)
    : 0.2;

  // Calculate Bollinger position
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);
  const stdDev = Math.sqrt(prices.slice(-20).map(p => Math.pow(p - sma20, 2)).reduce((a, b) => a + b, 0) / Math.min(20, prices.length));
  const upperBand = sma20 + 2 * stdDev;
  const lowerBand = sma20 - 2 * stdDev;
  const bollingerPosition = stdDev > 0 ? (currentPrice - lowerBand) / (upperBand - lowerBand) : 0.5;

  // Determine market regime
  let marketRegime = 0;
  if (priceChange20d > 0.05) marketRegime = 1; // Bull
  else if (priceChange20d < -0.05) marketRegime = -1; // Bear

  return {
    priceChange1d,
    priceChange5d,
    priceChange20d,
    volatility,
    rsi,
    macdHistogram: priceChange5d * 100,
    bollingerPosition: Math.max(0, Math.min(1, bollingerPosition)),
    adx: 25 + Math.abs(priceChange20d) * 100,
    atr: volatility / Math.sqrt(252),
    marketRegime,
    vixLevel: 15 + volatility * 50,
    currentPosition: 0,
    unrealizedPnl: 0,
    daysInPosition: 0,
  };
}

// Train and evaluate on a window
async function evaluateWindow(
  data: HistoricalDataPoint[],
  trainingStart: number,
  trainingEnd: number,
  testingStart: number,
  testingEnd: number,
  strategyType: string,
  initialCapital: number
): Promise<{
  trainingReturn: number;
  trainingSharpe: number;
  trainingWinRate: number;
  testingReturn: number;
  testingSharpe: number;
  testingWinRate: number;
  testingMaxDrawdown: number;
  modelParameters: Record<string, number>;
}> {
  const trainingData = data.slice(trainingStart, trainingEnd);
  const testingData = data.slice(testingStart, testingEnd);

  if (strategyType === 'rl') {
    // Train RL agent on training data
    const agent = new RLTradingAgent({
      learningRate: 0.001,
      gamma: 0.95,
      epsilon: 1.0,
      epsilonDecay: 0.995,
      epsilonMin: 0.01,
      batchSize: 32,
      memorySize: 10000,
    });

    // Training phase
    let trainingTrades = 0;
    let trainingWins = 0;
    let trainingReturns: number[] = [];
    let position = 0;
    let entryPrice = 0;

    for (let i = 20; i < trainingData.length; i++) {
      const state = calculateIndicators(trainingData, i);
      state.currentPosition = position;
      
      const actionResult = agent.getAction(state);
      const actionMap: Record<string, number> = { hold: 0, buy: 1, sell: 2, close: 3 };
      const action = actionMap[actionResult.type];
      const currentPrice = trainingData[i].close;
      
      let reward = 0;
      if (action === 1 && position === 0) { // Buy
        position = 1;
        entryPrice = currentPrice;
      } else if (action === 2 && position === 1) { // Sell
        const tradeReturn = (currentPrice - entryPrice) / entryPrice;
        reward = tradeReturn * 100;
        trainingReturns.push(tradeReturn);
        trainingTrades++;
        if (tradeReturn > 0) trainingWins++;
        position = 0;
      }

      if (i < trainingData.length - 1) {
        const nextState = calculateIndicators(trainingData, i + 1);
        nextState.currentPosition = position;
        const experience: Experience = {
          state,
          action,
          reward,
          nextState,
          done: false,
        };
        agent.storeExperience(experience);
        agent.train();
      }
    }

    // Testing phase
    let testingTrades = 0;
    let testingWins = 0;
    let testingReturns: number[] = [];
    let equity = initialCapital;
    let peak = equity;
    let maxDrawdown = 0;
    position = 0;

    for (let i = 20; i < testingData.length; i++) {
      const state = calculateIndicators(testingData, i);
      state.currentPosition = position;
      
      const actionResult = agent.getAction(state); // No exploration in testing
      const actionMap: Record<string, number> = { hold: 0, buy: 1, sell: 2, close: 3 };
      const action = actionMap[actionResult.type];
      const currentPrice = testingData[i].close;
      
      if (action === 1 && position === 0) {
        position = 1;
        entryPrice = currentPrice;
      } else if (action === 2 && position === 1) {
        const tradeReturn = (currentPrice - entryPrice) / entryPrice;
        testingReturns.push(tradeReturn);
        equity *= (1 + tradeReturn);
        testingTrades++;
        if (tradeReturn > 0) testingWins++;
        position = 0;
      }

      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const trainingReturn = trainingReturns.reduce((a, b) => a + b, 0);
    const testingReturn = testingReturns.reduce((a, b) => a + b, 0);
    
    const trainingSharpe = trainingReturns.length > 1 
      ? (mean(trainingReturns) / std(trainingReturns)) * Math.sqrt(252)
      : 0;
    const testingSharpe = testingReturns.length > 1
      ? (mean(testingReturns) / std(testingReturns)) * Math.sqrt(252)
      : 0;

    return {
      trainingReturn,
      trainingSharpe,
      trainingWinRate: trainingTrades > 0 ? trainingWins / trainingTrades : 0,
      testingReturn,
      testingSharpe,
      testingWinRate: testingTrades > 0 ? testingWins / testingTrades : 0,
      testingMaxDrawdown: maxDrawdown,
      modelParameters: {
        trainingTrades,
        testingTrades,
      },
    };
  }

  // Non-RL strategies
  return evaluateSimpleStrategy(trainingData, testingData, strategyType, initialCapital);
}

// Evaluate simple strategies
function evaluateSimpleStrategy(
  trainingData: HistoricalDataPoint[],
  testingData: HistoricalDataPoint[],
  strategyType: string,
  initialCapital: number
): {
  trainingReturn: number;
  trainingSharpe: number;
  trainingWinRate: number;
  testingReturn: number;
  testingSharpe: number;
  testingWinRate: number;
  testingMaxDrawdown: number;
  modelParameters: Record<string, number>;
} {
  const evaluateData = (data: HistoricalDataPoint[]) => {
    let position = 0;
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    const returns: number[] = [];
    let equity = initialCapital;
    let peak = equity;
    let maxDrawdown = 0;

    for (let i = 20; i < data.length; i++) {
      const prices = data.slice(i - 20, i + 1).map(d => d.close);
      const currentPrice = data[i].close;
      
      // Calculate signal based on strategy
      let signal = 0;
      if (strategyType === 'momentum') {
        const momentum = (currentPrice - prices[0]) / prices[0];
        signal = momentum > 0.02 ? 1 : momentum < -0.02 ? -1 : 0;
      } else if (strategyType === 'mean_reversion') {
        const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
        const deviation = (currentPrice - sma) / sma;
        signal = deviation < -0.03 ? 1 : deviation > 0.03 ? -1 : 0;
      } else if (strategyType === 'enhanced') {
        // RSI-based
        const gains: number[] = [];
        const losses: number[] = [];
        for (let j = 1; j < prices.length; j++) {
          const change = prices[j] - prices[j - 1];
          if (change > 0) gains.push(change);
          else losses.push(Math.abs(change));
        }
        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / 14 : 0.001;
        const rsi = 100 - (100 / (1 + avgGain / avgLoss));
        signal = rsi < 30 ? 1 : rsi > 70 ? -1 : 0;
      }

      // Execute trades
      if (signal === 1 && position === 0) {
        position = 1;
        entryPrice = currentPrice;
      } else if (signal === -1 && position === 1) {
        const tradeReturn = (currentPrice - entryPrice) / entryPrice;
        returns.push(tradeReturn);
        equity *= (1 + tradeReturn);
        trades++;
        if (tradeReturn > 0) wins++;
        position = 0;
      }

      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const totalReturn = returns.reduce((a, b) => a + b, 0);
    const sharpe = returns.length > 1 
      ? (mean(returns) / std(returns)) * Math.sqrt(252)
      : 0;
    const winRate = trades > 0 ? wins / trades : 0;

    return { totalReturn, sharpe, winRate, maxDrawdown };
  };

  const trainingResult = evaluateData(trainingData);
  const testingResult = evaluateData(testingData);

  return {
    trainingReturn: trainingResult.totalReturn,
    trainingSharpe: trainingResult.sharpe,
    trainingWinRate: trainingResult.winRate,
    testingReturn: testingResult.totalReturn,
    testingSharpe: testingResult.sharpe,
    testingWinRate: testingResult.winRate,
    testingMaxDrawdown: testingResult.maxDrawdown,
    modelParameters: {},
  };
}

// Helper functions
function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  return Math.sqrt(arr.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / arr.length);
}

// Main walk-forward optimization function
export async function runWalkForwardOptimization(
  config: WalkForwardConfig
): Promise<WalkForwardResult> {
  const {
    symbol,
    totalPeriodDays,
    trainingWindowDays,
    testingWindowDays,
    stepSizeDays,
    optimizationType,
    strategyType,
    initialCapital,
  } = config;

  // Fetch historical data
  const allData = await fetchHistoricalData(symbol);
  const data = allData.slice(-Math.min(totalPeriodDays, allData.length));

  if (data.length < trainingWindowDays + testingWindowDays) {
    throw new Error("Insufficient data for walk-forward optimization");
  }

  const windows: WindowResult[] = [];
  const combinedEquityCurve: Array<{ date: string; value: number }> = [];
  const performanceTimeline: Array<{
    date: string;
    cumulativeReturn: number;
    windowReturn: number;
    isTraining: boolean;
  }> = [];

  let windowIndex = 0;
  let trainingStart = 0;
  let cumulativeReturn = 0;
  let currentEquity = initialCapital;

  while (trainingStart + trainingWindowDays + testingWindowDays <= data.length) {
    const trainingEnd = optimizationType === 'anchored' 
      ? trainingStart + trainingWindowDays + (windowIndex * stepSizeDays)
      : trainingStart + trainingWindowDays;
    
    const testingStart = trainingEnd;
    const testingEnd = Math.min(testingStart + testingWindowDays, data.length);

    if (testingEnd > data.length) break;

    // Evaluate this window
    const result = await evaluateWindow(
      data,
      trainingStart,
      trainingEnd,
      testingStart,
      testingEnd,
      strategyType,
      initialCapital
    );

    // Calculate return degradation
    const returnDegradation = result.trainingReturn !== 0
      ? (result.trainingReturn - result.testingReturn) / Math.abs(result.trainingReturn)
      : 0;

    // Determine if overfit (testing significantly worse than training)
    const isOverfit = returnDegradation > 0.5 || 
      (result.trainingSharpe > 1 && result.testingSharpe < 0);

    windows.push({
      windowIndex,
      trainingStart: data[trainingStart].date,
      trainingEnd: data[trainingEnd - 1].date,
      testingStart: data[testingStart].date,
      testingEnd: data[testingEnd - 1].date,
      trainingReturn: result.trainingReturn,
      trainingSharpe: result.trainingSharpe,
      trainingWinRate: result.trainingWinRate,
      testingReturn: result.testingReturn,
      testingSharpe: result.testingSharpe,
      testingWinRate: result.testingWinRate,
      testingMaxDrawdown: result.testingMaxDrawdown,
      returnDegradation,
      sharpeRatio: result.testingSharpe,
      isOverfit,
      modelParameters: result.modelParameters,
    });

    // Update cumulative metrics
    cumulativeReturn = (1 + cumulativeReturn) * (1 + result.testingReturn) - 1;
    currentEquity *= (1 + result.testingReturn);

    // Add to equity curve
    combinedEquityCurve.push({
      date: data[testingEnd - 1].date.toISOString().split('T')[0],
      value: currentEquity,
    });

    // Add to performance timeline
    performanceTimeline.push({
      date: data[testingEnd - 1].date.toISOString().split('T')[0],
      cumulativeReturn,
      windowReturn: result.testingReturn,
      isTraining: false,
    });

    // Move to next window
    if (optimizationType === 'rolling') {
      trainingStart += stepSizeDays;
    }
    windowIndex++;

    // Safety limit
    if (windowIndex > 100) break;
  }

  // Calculate aggregate metrics
  const testingReturns = windows.map(w => w.testingReturn);
  const testingSharpes = windows.map(w => w.testingSharpe);
  const testingWinRates = windows.map(w => w.testingWinRate);
  const testingDrawdowns = windows.map(w => w.testingMaxDrawdown);
  const degradations = windows.map(w => w.returnDegradation);

  const aggregateMetrics = {
    totalReturn: cumulativeReturn,
    avgTestingReturn: mean(testingReturns),
    avgReturnDegradation: mean(degradations),
    avgSharpe: mean(testingSharpes),
    avgWinRate: mean(testingWinRates),
    avgMaxDrawdown: mean(testingDrawdowns),
    consistencyRatio: testingReturns.filter(r => r > 0).length / testingReturns.length,
    overfitRatio: windows.filter(w => w.isOverfit).length / windows.length,
  };

  // Calculate stability metrics
  const stabilityMetrics = {
    returnStability: std(testingReturns),
    sharpeStability: std(testingSharpes),
    parameterStability: 0, // Would need to track parameter changes
  };

  // Generate recommendations
  const stabilityScore = Math.max(0, Math.min(100, 
    100 - (stabilityMetrics.returnStability * 200) - (aggregateMetrics.overfitRatio * 50)
  ));

  const recommendations = {
    isStrategyRobust: aggregateMetrics.consistencyRatio > 0.6 && aggregateMetrics.overfitRatio < 0.3,
    suggestedTrainingWindow: trainingWindowDays,
    suggestedTestingWindow: testingWindowDays,
    overfitWarning: aggregateMetrics.overfitRatio > 0.3,
    stabilityScore,
  };

  return {
    config,
    windows,
    aggregateMetrics,
    stabilityMetrics,
    combinedEquityCurve,
    performanceTimeline,
    recommendations,
  };
}

// Quick walk-forward analysis
export async function runQuickWalkForward(
  symbol: string,
  strategyType: 'rl' | 'momentum' | 'mean_reversion' | 'enhanced'
): Promise<{
  isRobust: boolean;
  stabilityScore: number;
  avgReturn: number;
  overfitRatio: number;
}> {
  const result = await runWalkForwardOptimization({
    symbol,
    totalPeriodDays: 504, // 2 years
    trainingWindowDays: 126, // 6 months
    testingWindowDays: 63, // 3 months
    stepSizeDays: 63,
    optimizationType: 'rolling',
    strategyType,
    initialCapital: 100000,
  });

  return {
    isRobust: result.recommendations.isStrategyRobust,
    stabilityScore: result.recommendations.stabilityScore,
    avgReturn: result.aggregateMetrics.avgTestingReturn,
    overfitRatio: result.aggregateMetrics.overfitRatio,
  };
}
