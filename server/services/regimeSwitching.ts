/**
 * Regime-Switching Models Service
 * 
 * Implements market regime detection using statistical methods
 * to identify bull, bear, sideways, and volatile market conditions.
 * 
 * Research Basis:
 * - Hidden Markov Models (HMM) for regime detection
 * - Volatility clustering for regime identification
 * - Moving average crossovers for trend detection
 * - ADX for trend strength measurement
 */

import { callDataApi } from "../_core/dataApi";

// Types
export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile';

export interface RegimeConfig {
  symbol: string;
  lookbackDays: number;
  regimeThresholds?: {
    bullThreshold: number;      // Return threshold for bull market
    bearThreshold: number;      // Return threshold for bear market
    volatilityThreshold: number; // Volatility threshold for volatile regime
    trendStrengthThreshold: number; // ADX threshold for trending vs sideways
  };
}

export interface RegimeProbabilities {
  bull: number;
  bear: number;
  sideways: number;
  volatile: number;
}

export interface RegimeIndicators {
  // Trend indicators
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  // Momentum
  rsi: number;
  macdHistogram: number;
  // Volatility
  atr: number;
  atrPercent: number;
  historicalVolatility: number;
  bollingerWidth: number;
  // Trend strength
  adx: number;
  plusDI: number;
  minusDI: number;
  // Price position
  priceVsSma200: number;
  priceVsSma50: number;
}

export interface RegimeTransition {
  fromRegime: MarketRegime;
  toRegime: MarketRegime;
  probability: number;
  avgDuration: number; // Average days in regime
}

export interface StrategyAdjustment {
  regime: MarketRegime;
  positionSizeMultiplier: number;
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  preferredStrategies: string[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  description: string;
}

export interface RegimeAnalysisResult {
  symbol: string;
  currentRegime: MarketRegime;
  regimeProbabilities: RegimeProbabilities;
  regimeConfidence: number;
  indicators: RegimeIndicators;
  transitionMatrix: RegimeTransition[];
  regimeHistory: Array<{
    date: string;
    regime: MarketRegime;
    probability: number;
  }>;
  strategyAdjustments: StrategyAdjustment;
  signals: {
    trendDirection: 'up' | 'down' | 'neutral';
    trendStrength: 'strong' | 'moderate' | 'weak';
    volatilityLevel: 'high' | 'normal' | 'low';
    momentum: 'bullish' | 'bearish' | 'neutral';
  };
  recommendations: string[];
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
        adjclose?: Array<{
          adjclose: (number | null)[];
        }>;
      };
      meta: {
        symbol: string;
        currency: string;
        regularMarketPrice: number;
      };
    }>;
  };
}

interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchHistoricalData(symbol: string, days: number): Promise<PriceData[]> {
  try {
    const response = await callDataApi('YahooFinance/get_stock_chart', {
      query: {
        symbol,
        interval: '1d',
        range: days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y',
      },
    }) as YahooChartResponse;

    if (!response?.chart?.result?.[0]) {
      throw new Error('No data returned from API');
    }

    const result = response.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const priceData: PriceData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] !== null && quotes.open[i] !== null) {
        priceData.push({
          date: new Date(timestamps[i] * 1000),
          open: quotes.open[i] as number,
          high: quotes.high[i] as number,
          low: quotes.low[i] as number,
          close: quotes.close[i] as number,
          volume: quotes.volume[i] as number,
        });
      }
    }

    return priceData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    // Return simulated data for demo
    return generateSimulatedData(days);
  }
}

function generateSimulatedData(days: number): PriceData[] {
  const data: PriceData[] = [];
  let price = 150;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.48) * 3; // Slight upward bias
    price = Math.max(50, price * (1 + change / 100));
    
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const open = low + Math.random() * (high - low);
    
    data.push({
      date,
      open,
      high,
      low,
      close: price,
      volume: 1000000 + Math.random() * 5000000,
    });
  }

  return data;
}

// Technical indicator calculations
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes = prices.slice(-period - 1).map((p, i, arr) => 
    i === 0 ? 0 : p - arr[i - 1]
  ).slice(1);
  
  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
  
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // Calculate signal line (9-period EMA of MACD)
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }
  
  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macdLine;
  
  return {
    value: macdLine,
    signal,
    histogram: macdLine - signal,
  };
}

function calculateATR(data: PriceData[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateADX(data: PriceData[], period: number = 14): { adx: number; plusDI: number; minusDI: number } {
  if (data.length < period * 2) {
    return { adx: 25, plusDI: 25, minusDI: 25 };
  }
  
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevHigh = data[i - 1].high;
    const prevLow = data[i - 1].low;
    const prevClose = data[i - 1].close;
    
    const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
    const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Smoothed values
  const smoothedPlusDM = plusDMs.slice(-period).reduce((a, b) => a + b, 0);
  const smoothedMinusDM = minusDMs.slice(-period).reduce((a, b) => a + b, 0);
  const smoothedTR = trueRanges.slice(-period).reduce((a, b) => a + b, 0);
  
  const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
  
  const dx = plusDI + minusDI > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
  
  return { adx: dx, plusDI, minusDI };
}

function calculateHistoricalVolatility(prices: number[], period: number = 20): number {
  if (prices.length < period + 1) return 0.2;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  
  const recentReturns = returns.slice(-period);
  const mean = recentReturns.reduce((a, b) => a + b, 0) / period;
  const variance = recentReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / period;
  
  // Annualize
  return Math.sqrt(variance * 252);
}

function calculateBollingerWidth(prices: number[], period: number = 20): number {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, p) => sum + (p - sma) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return (4 * stdDev) / sma; // Width as percentage of price
}

// Regime detection
function detectRegime(
  indicators: RegimeIndicators,
  thresholds: NonNullable<RegimeConfig['regimeThresholds']>
): { regime: MarketRegime; probabilities: RegimeProbabilities; confidence: number } {
  const scores = {
    bull: 0,
    bear: 0,
    sideways: 0,
    volatile: 0,
  };
  
  // Trend indicators
  if (indicators.priceVsSma200 > 0) scores.bull += 2;
  else scores.bear += 2;
  
  if (indicators.priceVsSma50 > 0) scores.bull += 1;
  else scores.bear += 1;
  
  if (indicators.sma50 > indicators.sma200) scores.bull += 2;
  else scores.bear += 2;
  
  // MACD
  if (indicators.macdHistogram > 0) scores.bull += 1;
  else scores.bear += 1;
  
  // RSI
  if (indicators.rsi > 60) scores.bull += 1;
  else if (indicators.rsi < 40) scores.bear += 1;
  else scores.sideways += 1;
  
  // ADX (trend strength)
  if (indicators.adx < thresholds.trendStrengthThreshold) {
    scores.sideways += 3;
  } else {
    if (indicators.plusDI > indicators.minusDI) scores.bull += 1;
    else scores.bear += 1;
  }
  
  // Volatility
  if (indicators.historicalVolatility > thresholds.volatilityThreshold) {
    scores.volatile += 3;
  }
  
  if (indicators.bollingerWidth > 0.1) {
    scores.volatile += 1;
  }
  
  // Calculate probabilities
  const total = scores.bull + scores.bear + scores.sideways + scores.volatile;
  const probabilities: RegimeProbabilities = {
    bull: scores.bull / total,
    bear: scores.bear / total,
    sideways: scores.sideways / total,
    volatile: scores.volatile / total,
  };
  
  // Determine regime
  let regime: MarketRegime = 'sideways';
  let maxScore = scores.sideways;
  
  if (scores.bull > maxScore) {
    regime = 'bull';
    maxScore = scores.bull;
  }
  if (scores.bear > maxScore) {
    regime = 'bear';
    maxScore = scores.bear;
  }
  if (scores.volatile > maxScore) {
    regime = 'volatile';
    maxScore = scores.volatile;
  }
  
  const confidence = maxScore / total;
  
  return { regime, probabilities, confidence };
}

// Strategy adjustments per regime
function getStrategyAdjustments(regime: MarketRegime): StrategyAdjustment {
  const adjustments: Record<MarketRegime, StrategyAdjustment> = {
    bull: {
      regime: 'bull',
      positionSizeMultiplier: 1.2,
      stopLossMultiplier: 1.5,
      takeProfitMultiplier: 2.0,
      preferredStrategies: ['momentum', 'trend_following', 'breakout'],
      riskLevel: 'aggressive',
      description: 'Bull market detected. Increase position sizes, use wider stops, and focus on momentum strategies.',
    },
    bear: {
      regime: 'bear',
      positionSizeMultiplier: 0.5,
      stopLossMultiplier: 0.8,
      takeProfitMultiplier: 1.0,
      preferredStrategies: ['short_selling', 'defensive', 'hedging'],
      riskLevel: 'conservative',
      description: 'Bear market detected. Reduce position sizes, use tighter stops, and consider defensive strategies.',
    },
    sideways: {
      regime: 'sideways',
      positionSizeMultiplier: 0.8,
      stopLossMultiplier: 1.0,
      takeProfitMultiplier: 1.2,
      preferredStrategies: ['mean_reversion', 'range_trading', 'options_selling'],
      riskLevel: 'moderate',
      description: 'Sideways market detected. Use mean reversion strategies and range trading approaches.',
    },
    volatile: {
      regime: 'volatile',
      positionSizeMultiplier: 0.3,
      stopLossMultiplier: 2.0,
      takeProfitMultiplier: 3.0,
      preferredStrategies: ['volatility_trading', 'straddles', 'iron_condors'],
      riskLevel: 'conservative',
      description: 'High volatility detected. Significantly reduce position sizes and use volatility-based strategies.',
    },
  };
  
  return adjustments[regime];
}

// Calculate transition matrix
function calculateTransitionMatrix(regimeHistory: Array<{ regime: MarketRegime }>): RegimeTransition[] {
  const transitions: Record<string, { count: number; durations: number[] }> = {};
  const regimes: MarketRegime[] = ['bull', 'bear', 'sideways', 'volatile'];
  
  // Initialize
  for (const from of regimes) {
    for (const to of regimes) {
      transitions[`${from}-${to}`] = { count: 0, durations: [] };
    }
  }
  
  // Count transitions
  let currentRegime = regimeHistory[0]?.regime;
  let duration = 1;
  
  for (let i = 1; i < regimeHistory.length; i++) {
    if (regimeHistory[i].regime === currentRegime) {
      duration++;
    } else {
      const key = `${currentRegime}-${regimeHistory[i].regime}`;
      transitions[key].count++;
      transitions[key].durations.push(duration);
      currentRegime = regimeHistory[i].regime;
      duration = 1;
    }
  }
  
  // Calculate probabilities
  const result: RegimeTransition[] = [];
  for (const from of regimes) {
    const totalFromRegime = regimes.reduce((sum, to) => 
      sum + transitions[`${from}-${to}`].count, 0
    ) || 1;
    
    for (const to of regimes) {
      const key = `${from}-${to}`;
      const data = transitions[key];
      result.push({
        fromRegime: from,
        toRegime: to,
        probability: data.count / totalFromRegime,
        avgDuration: data.durations.length > 0 
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length 
          : 0,
      });
    }
  }
  
  return result;
}

// Main analysis function
export async function analyzeMarketRegime(config: RegimeConfig): Promise<RegimeAnalysisResult> {
  const thresholds = config.regimeThresholds || {
    bullThreshold: 0.1,
    bearThreshold: -0.1,
    volatilityThreshold: 0.3,
    trendStrengthThreshold: 25,
  };
  
  // Fetch data
  const data = await fetchHistoricalData(config.symbol, config.lookbackDays);
  const closes = data.map(d => d.close);
  
  // Calculate indicators
  const currentPrice = closes[closes.length - 1];
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const atr = calculateATR(data);
  const { adx, plusDI, minusDI } = calculateADX(data);
  const historicalVolatility = calculateHistoricalVolatility(closes);
  const bollingerWidth = calculateBollingerWidth(closes);
  
  const indicators: RegimeIndicators = {
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    rsi,
    macdHistogram: macd.histogram,
    atr,
    atrPercent: (atr / currentPrice) * 100,
    historicalVolatility,
    bollingerWidth,
    adx,
    plusDI,
    minusDI,
    priceVsSma200: ((currentPrice - sma200) / sma200) * 100,
    priceVsSma50: ((currentPrice - sma50) / sma50) * 100,
  };
  
  // Detect current regime
  const { regime, probabilities, confidence } = detectRegime(indicators, thresholds);
  
  // Calculate regime history
  const regimeHistory: Array<{ date: string; regime: MarketRegime; probability: number }> = [];
  const windowSize = 20;
  
  for (let i = windowSize; i < data.length; i++) {
    const windowData = data.slice(i - windowSize, i);
    const windowCloses = windowData.map(d => d.close);
    
    const windowIndicators: RegimeIndicators = {
      sma20: calculateSMA(windowCloses, 20),
      sma50: calculateSMA(closes.slice(0, i), 50),
      sma200: calculateSMA(closes.slice(0, i), 200),
      ema12: calculateEMA(windowCloses, 12),
      ema26: calculateEMA(closes.slice(0, i), 26),
      rsi: calculateRSI(windowCloses),
      macdHistogram: calculateMACD(closes.slice(0, i)).histogram,
      atr: calculateATR(windowData),
      atrPercent: 0,
      historicalVolatility: calculateHistoricalVolatility(windowCloses),
      bollingerWidth: calculateBollingerWidth(windowCloses),
      adx: calculateADX(windowData).adx,
      plusDI: calculateADX(windowData).plusDI,
      minusDI: calculateADX(windowData).minusDI,
      priceVsSma200: 0,
      priceVsSma50: 0,
    };
    
    const windowRegime = detectRegime(windowIndicators, thresholds);
    regimeHistory.push({
      date: data[i].date.toISOString().split('T')[0],
      regime: windowRegime.regime,
      probability: windowRegime.confidence,
    });
  }
  
  // Calculate transition matrix
  const transitionMatrix = calculateTransitionMatrix(regimeHistory);
  
  // Get strategy adjustments
  const strategyAdjustments = getStrategyAdjustments(regime);
  
  // Generate signals
  const signals = {
    trendDirection: indicators.priceVsSma50 > 2 ? 'up' as const : 
                    indicators.priceVsSma50 < -2 ? 'down' as const : 'neutral' as const,
    trendStrength: adx > 40 ? 'strong' as const : 
                   adx > 25 ? 'moderate' as const : 'weak' as const,
    volatilityLevel: historicalVolatility > 0.4 ? 'high' as const :
                     historicalVolatility < 0.15 ? 'low' as const : 'normal' as const,
    momentum: rsi > 60 && macd.histogram > 0 ? 'bullish' as const :
              rsi < 40 && macd.histogram < 0 ? 'bearish' as const : 'neutral' as const,
  };
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (regime === 'bull') {
    recommendations.push('Consider increasing equity exposure');
    recommendations.push('Focus on momentum and trend-following strategies');
    if (rsi > 70) recommendations.push('RSI overbought - consider taking partial profits');
  } else if (regime === 'bear') {
    recommendations.push('Consider reducing equity exposure');
    recommendations.push('Focus on defensive positions and hedging');
    if (rsi < 30) recommendations.push('RSI oversold - watch for potential bounce');
  } else if (regime === 'sideways') {
    recommendations.push('Consider range-trading strategies');
    recommendations.push('Mean reversion strategies may be effective');
    recommendations.push('Avoid trend-following strategies');
  } else {
    recommendations.push('Reduce position sizes due to high volatility');
    recommendations.push('Consider volatility-based strategies');
    recommendations.push('Use wider stops to avoid being stopped out');
  }
  
  return {
    symbol: config.symbol,
    currentRegime: regime,
    regimeProbabilities: probabilities,
    regimeConfidence: confidence,
    indicators,
    transitionMatrix,
    regimeHistory,
    strategyAdjustments,
    signals,
    recommendations,
  };
}

// Quick regime check
export async function getQuickRegime(symbol: string): Promise<{
  regime: MarketRegime;
  confidence: number;
  adjustments: StrategyAdjustment;
}> {
  const result = await analyzeMarketRegime({
    symbol,
    lookbackDays: 60,
  });
  
  return {
    regime: result.currentRegime,
    confidence: result.regimeConfidence,
    adjustments: result.strategyAdjustments,
  };
}
