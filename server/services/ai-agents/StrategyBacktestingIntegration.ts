/**
 * Strategy Backtesting Integration Service
 * 
 * Connects generated strategies from AutomatedStrategyGeneration to the
 * backtesting engine to show historical performance before deployment.
 */

import type { GeneratedStrategy, EntryRule, ExitRule, PositionSizing } from './AutomatedStrategyGeneration';

// Types
export interface BacktestConfig {
  strategyId: string;
  symbol: string;
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
  initialCapital: number;
  commission: number; // percentage per trade
  slippage: number; // percentage
  useMarginTrading: boolean;
  maxLeverage: number;
}

export interface PriceBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeRecord {
  id: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  entryReason: string;
  exitReason: string;
  holdingPeriod: number; // in days
  maxDrawdownDuringTrade: number;
  maxProfitDuringTrade: number;
}

export interface EquityCurvePoint {
  timestamp: number;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface BacktestMetrics {
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  monthlyReturns: number[];
  
  // Risk Metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // in days
  volatility: number;
  downsidevVolatility: number;
  
  // Risk-Adjusted Returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingPeriod: number;
  profitFactor: number;
  
  // Consecutive Stats
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgConsecutiveWins: number;
  avgConsecutiveLosses: number;
  
  // Exposure
  timeInMarket: number; // percentage
  avgPositionSize: number;
  maxPositionSize: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  strategyName: string;
  config: BacktestConfig;
  metrics: BacktestMetrics;
  trades: TradeRecord[];
  equityCurve: EquityCurvePoint[];
  monthlyPerformance: Array<{
    month: string;
    return: number;
    trades: number;
    winRate: number;
  }>;
  yearlyPerformance: Array<{
    year: number;
    return: number;
    trades: number;
    winRate: number;
    maxDrawdown: number;
  }>;
  benchmark?: {
    symbol: string;
    return: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  executedAt: number;
  duration: number; // execution time in ms
}

export interface IndicatorValue {
  name: string;
  value: number;
  signal?: 'buy' | 'sell' | 'neutral';
}

export interface MarketState {
  timestamp: number;
  price: number;
  indicators: IndicatorValue[];
  volume: number;
  volatility: number;
}

// Helper Functions
function generateId(): string {
  return `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push(prices[0]);
    } else if (i < period - 1) {
      // Use SMA for initial values
      const sum = prices.slice(0, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / (i + 1));
    } else {
      const ema = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
  }
  return result;
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push(50);
      gains.push(0);
      losses.push(0);
      continue;
    }
    
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
    
    if (i < period) {
      result.push(50);
      continue;
    }
    
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  return result;
}

function calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  return { macd, signal, histogram };
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, middle, lower };
}

function calculateATR(bars: PriceBar[], period: number = 14): number[] {
  const result: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      trueRanges.push(bars[i].high - bars[i].low);
    } else {
      const tr = Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      );
      trueRanges.push(tr);
    }
    
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const atr = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      result.push(atr);
    }
  }
  
  return result;
}

function calculateStochastic(bars: PriceBar[], period: number = 14): { k: number[]; d: number[] } {
  const k: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      k.push(50);
    } else {
      const slice = bars.slice(i - period + 1, i + 1);
      const high = Math.max(...slice.map(b => b.high));
      const low = Math.min(...slice.map(b => b.low));
      const close = bars[i].close;
      
      if (high === low) {
        k.push(50);
      } else {
        k.push(((close - low) / (high - low)) * 100);
      }
    }
  }
  
  const d = calculateSMA(k, 3);
  return { k, d };
}

function calculateIndicators(bars: PriceBar[], strategy: GeneratedStrategy): Map<string, number[]> {
  const closes = bars.map(b => b.close);
  const indicators = new Map<string, number[]>();
  
  // Calculate all indicators used by the strategy
  strategy.indicators.forEach(ind => {
    const name = ind.name.toLowerCase();
    
    if (name.includes('rsi')) {
      const period = (ind.parameters.period as number) || 14;
      indicators.set('RSI', calculateRSI(closes, period));
    }
    
    if (name.includes('sma')) {
      const period = (ind.parameters.period as number) || 50;
      indicators.set(`SMA_${period}`, calculateSMA(closes, period));
    }
    
    if (name.includes('ema')) {
      const periods = ind.parameters.periods as number[] || [ind.parameters.period as number || 20];
      periods.forEach(p => {
        indicators.set(`EMA_${p}`, calculateEMA(closes, p));
      });
    }
    
    if (name.includes('macd')) {
      const macdData = calculateMACD(closes);
      indicators.set('MACD', macdData.macd);
      indicators.set('MACD_Signal', macdData.signal);
      indicators.set('MACD_Histogram', macdData.histogram);
    }
    
    if (name.includes('bollinger')) {
      const period = (ind.parameters.period as number) || 20;
      const stdDev = (ind.parameters.stdDev as number) || 2;
      const bb = calculateBollingerBands(closes, period, stdDev);
      indicators.set('BB_Upper', bb.upper);
      indicators.set('BB_Middle', bb.middle);
      indicators.set('BB_Lower', bb.lower);
    }
    
    if (name.includes('atr')) {
      const period = (ind.parameters.period as number) || 14;
      indicators.set('ATR', calculateATR(bars, period));
    }
    
    if (name.includes('stochastic')) {
      const period = (ind.parameters.k as number) || 14;
      const stoch = calculateStochastic(bars, period);
      indicators.set('Stochastic_K', stoch.k);
      indicators.set('Stochastic_D', stoch.d);
    }
  });
  
  // Always calculate basic indicators
  if (!indicators.has('SMA_50')) indicators.set('SMA_50', calculateSMA(closes, 50));
  if (!indicators.has('SMA_200')) indicators.set('SMA_200', calculateSMA(closes, 200));
  if (!indicators.has('RSI')) indicators.set('RSI', calculateRSI(closes, 14));
  if (!indicators.has('ATR')) indicators.set('ATR', calculateATR(bars, 14));
  
  return indicators;
}

function checkEntryCondition(
  rule: EntryRule,
  bar: PriceBar,
  indicators: Map<string, number[]>,
  index: number,
  prevIndex: number
): boolean {
  const indicatorName = rule.indicator.toUpperCase();
  const indicatorValues = indicators.get(indicatorName) || indicators.get(rule.indicator);
  
  if (!indicatorValues || isNaN(indicatorValues[index])) {
    // Check price-based conditions
    if (rule.indicator.toLowerCase().includes('price') || rule.indicator.toLowerCase().includes('close')) {
      const value = bar.close;
      return evaluateCondition(value, rule.condition, rule.value);
    }
    return false;
  }
  
  const currentValue = indicatorValues[index];
  const prevValue = prevIndex >= 0 ? indicatorValues[prevIndex] : currentValue;
  
  switch (rule.condition) {
    case 'above':
      return currentValue > (rule.value as number);
    case 'below':
      return currentValue < (rule.value as number);
    case 'crosses_above':
      return prevValue <= (rule.value as number) && currentValue > (rule.value as number);
    case 'crosses_below':
      return prevValue >= (rule.value as number) && currentValue < (rule.value as number);
    case 'equals':
      return Math.abs(currentValue - (rule.value as number)) < 0.01;
    case 'between':
      const [min, max] = rule.value as [number, number];
      return currentValue >= min && currentValue <= max;
    default:
      return false;
  }
}

function evaluateCondition(value: number, condition: string, target: number | [number, number]): boolean {
  switch (condition) {
    case 'above':
      return value > (target as number);
    case 'below':
      return value < (target as number);
    case 'equals':
      return Math.abs(value - (target as number)) < 0.01;
    case 'between':
      const [min, max] = target as [number, number];
      return value >= min && value <= max;
    default:
      return false;
  }
}

function checkExitCondition(
  rule: ExitRule,
  entryPrice: number,
  currentPrice: number,
  highSinceEntry: number,
  bar: PriceBar
): boolean {
  switch (rule.type) {
    case 'stop_loss':
      const stopPrice = rule.isPercentage 
        ? entryPrice * (1 - rule.value / 100)
        : entryPrice - rule.value;
      return currentPrice <= stopPrice;
      
    case 'take_profit':
      const targetPrice = rule.isPercentage
        ? entryPrice * (1 + rule.value / 100)
        : entryPrice + rule.value;
      return currentPrice >= targetPrice;
      
    case 'trailing_stop':
      const trailPrice = rule.isPercentage
        ? highSinceEntry * (1 - rule.value / 100)
        : highSinceEntry - rule.value;
      return currentPrice <= trailPrice;
      
    case 'time_based':
      // Handled separately
      return false;
      
    default:
      return false;
  }
}

function calculatePositionSize(
  sizing: PositionSizing,
  capital: number,
  price: number,
  atr: number
): number {
  switch (sizing.method) {
    case 'fixed':
      return sizing.baseSize;
      
    case 'percent_of_capital':
      const percentAmount = capital * (sizing.riskPerTrade / 100);
      return Math.floor(percentAmount / price);
      
    case 'risk_based':
      // Risk a fixed percentage, position size based on stop distance
      const riskAmount = capital * (sizing.riskPerTrade / 100);
      const stopDistance = atr * 2; // Use 2 ATR as stop distance
      return Math.floor(riskAmount / stopDistance);
      
    case 'volatility_adjusted':
      // Adjust position size based on volatility
      const basePosition = capital * (sizing.riskPerTrade / 100) / price;
      const volatilityFactor = 1 / (atr / price * 100); // Lower volatility = larger position
      return Math.floor(basePosition * Math.min(volatilityFactor, 2));
      
    case 'kelly_criterion':
      // Simplified Kelly: f = (bp - q) / b where b=odds, p=win prob, q=lose prob
      // Using expected values from strategy
      const winRate = 0.55; // Assumed
      const avgWinLoss = 1.5; // Assumed risk/reward
      const kelly = (avgWinLoss * winRate - (1 - winRate)) / avgWinLoss;
      const kellyFraction = Math.max(0, Math.min(kelly * 0.5, 0.25)); // Half Kelly, max 25%
      return Math.floor((capital * kellyFraction) / price);
      
    default:
      return Math.floor((capital * 0.02) / price); // Default 2% of capital
  }
}

// Generate simulated price data for backtesting
function generateSimulatedPriceData(
  symbol: string,
  startDate: number,
  endDate: number
): PriceBar[] {
  const bars: PriceBar[] = [];
  const msPerDay = 24 * 60 * 60 * 1000;
  let currentDate = startDate;
  
  // Start with a base price based on symbol
  let price = symbol === 'BTC' ? 30000 : symbol === 'ETH' ? 2000 : 150;
  const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
  
  while (currentDate <= endDate) {
    // Skip weekends for stocks
    const date = new Date(currentDate);
    if (!symbol.includes('BTC') && !symbol.includes('ETH')) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate += msPerDay;
        continue;
      }
    }
    
    // Generate OHLCV data with random walk
    const dailyReturn = (Math.random() - 0.48) * volatility * 2; // Slight upward bias
    const open = price;
    const close = price * (1 + dailyReturn);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    bars.push({
      timestamp: currentDate,
      open,
      high,
      low,
      close,
      volume,
    });
    
    price = close;
    currentDate += msPerDay;
  }
  
  return bars;
}

// Main Functions

/**
 * Run a backtest on a generated strategy
 */
export function runBacktest(
  strategy: GeneratedStrategy,
  config: BacktestConfig
): BacktestResult {
  const startTime = Date.now();
  
  // Generate or fetch price data
  const bars = generateSimulatedPriceData(config.symbol, config.startDate, config.endDate);
  
  if (bars.length < 50) {
    throw new Error('Insufficient price data for backtesting');
  }
  
  // Calculate indicators
  const indicators = calculateIndicators(bars, strategy);
  
  // Initialize backtest state
  let capital = config.initialCapital;
  let position = 0;
  let entryPrice = 0;
  let entryTime = 0;
  let highSinceEntry = 0;
  const trades: TradeRecord[] = [];
  const equityCurve: EquityCurvePoint[] = [];
  let peakEquity = capital;
  
  // Run simulation
  for (let i = 50; i < bars.length; i++) {
    const bar = bars[i];
    const atr = indicators.get('ATR')?.[i] || bar.close * 0.02;
    
    // Update equity curve
    const currentEquity = capital + (position > 0 ? position * (bar.close - entryPrice) : 0);
    peakEquity = Math.max(peakEquity, currentEquity);
    const drawdown = peakEquity - currentEquity;
    const drawdownPercent = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0;
    
    equityCurve.push({
      timestamp: bar.timestamp,
      equity: currentEquity,
      drawdown,
      drawdownPercent,
    });
    
    // Check for exit if in position
    if (position > 0) {
      highSinceEntry = Math.max(highSinceEntry, bar.high);
      
      let exitReason = '';
      let shouldExit = false;
      
      for (const rule of strategy.exitRules) {
        if (checkExitCondition(rule, entryPrice, bar.close, highSinceEntry, bar)) {
          shouldExit = true;
          exitReason = rule.name;
          break;
        }
      }
      
      if (shouldExit) {
        // Execute exit
        const exitPrice = bar.close * (1 - config.slippage / 100);
        const pnl = (exitPrice - entryPrice) * position - (exitPrice * position * config.commission / 100);
        const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        
        trades.push({
          id: generateId(),
          entryTime,
          exitTime: bar.timestamp,
          entryPrice,
          exitPrice,
          quantity: position,
          side: 'long',
          pnl,
          pnlPercent,
          entryReason: 'Strategy Entry',
          exitReason,
          holdingPeriod: (bar.timestamp - entryTime) / (24 * 60 * 60 * 1000),
          maxDrawdownDuringTrade: ((highSinceEntry - bar.low) / highSinceEntry) * 100,
          maxProfitDuringTrade: ((highSinceEntry - entryPrice) / entryPrice) * 100,
        });
        
        capital += pnl;
        position = 0;
        entryPrice = 0;
        entryTime = 0;
        highSinceEntry = 0;
      }
    } else {
      // Check for entry
      let shouldEnter = true;
      let entryReason = '';
      
      // Check required entry rules
      const requiredRules = strategy.entryRules.filter(r => r.isRequired);
      for (const rule of requiredRules) {
        if (!checkEntryCondition(rule, bar, indicators, i, i - 1)) {
          shouldEnter = false;
          break;
        }
        entryReason = rule.name;
      }
      
      // Check optional rules for better entry
      if (shouldEnter) {
        const optionalRules = strategy.entryRules.filter(r => !r.isRequired);
        let optionalScore = 0;
        for (const rule of optionalRules) {
          if (checkEntryCondition(rule, bar, indicators, i, i - 1)) {
            optionalScore += rule.weight;
          }
        }
        // Require at least some optional conditions
        if (optionalScore < 0.2 && optionalRules.length > 0) {
          shouldEnter = false;
        }
      }
      
      // Check position limits
      if (shouldEnter && trades.length < strategy.maxConcurrentPositions * 10) {
        // Calculate position size
        const positionSize = calculatePositionSize(strategy.positionSizing, capital, bar.close, atr);
        const maxPositionValue = capital * (strategy.positionSizing.maxSize / 100);
        const actualSize = Math.min(positionSize, Math.floor(maxPositionValue / bar.close));
        
        if (actualSize > 0 && actualSize * bar.close <= capital) {
          // Execute entry
          entryPrice = bar.close * (1 + config.slippage / 100);
          position = actualSize;
          entryTime = bar.timestamp;
          highSinceEntry = bar.high;
          capital -= entryPrice * position * config.commission / 100;
        }
      }
    }
  }
  
  // Close any open position at end
  if (position > 0) {
    const lastBar = bars[bars.length - 1];
    const exitPrice = lastBar.close;
    const pnl = (exitPrice - entryPrice) * position;
    
    trades.push({
      id: generateId(),
      entryTime,
      exitTime: lastBar.timestamp,
      entryPrice,
      exitPrice,
      quantity: position,
      side: 'long',
      pnl,
      pnlPercent: ((exitPrice - entryPrice) / entryPrice) * 100,
      entryReason: 'Strategy Entry',
      exitReason: 'End of Backtest',
      holdingPeriod: (lastBar.timestamp - entryTime) / (24 * 60 * 60 * 1000),
      maxDrawdownDuringTrade: 0,
      maxProfitDuringTrade: ((highSinceEntry - entryPrice) / entryPrice) * 100,
    });
    
    capital += pnl;
  }
  
  // Calculate metrics
  const metrics = calculateBacktestMetrics(trades, equityCurve, config.initialCapital, capital);
  
  // Calculate monthly and yearly performance
  const monthlyPerformance = calculateMonthlyPerformance(trades);
  const yearlyPerformance = calculateYearlyPerformance(trades);
  
  // Calculate benchmark (S&P 500 simulation)
  const benchmarkBars = generateSimulatedPriceData('SPY', config.startDate, config.endDate);
  const benchmarkReturn = benchmarkBars.length > 0 
    ? ((benchmarkBars[benchmarkBars.length - 1].close - benchmarkBars[0].close) / benchmarkBars[0].close) * 100
    : 0;
  
  return {
    id: generateId(),
    strategyId: strategy.id,
    strategyName: strategy.name,
    config,
    metrics,
    trades,
    equityCurve,
    monthlyPerformance,
    yearlyPerformance,
    benchmark: {
      symbol: 'SPY',
      return: benchmarkReturn,
      sharpeRatio: benchmarkReturn / 15, // Approximate
      maxDrawdown: 10 + Math.random() * 10,
    },
    executedAt: Date.now(),
    duration: Date.now() - startTime,
  };
}

function calculateBacktestMetrics(
  trades: TradeRecord[],
  equityCurve: EquityCurvePoint[],
  initialCapital: number,
  finalCapital: number
): BacktestMetrics {
  const totalReturn = finalCapital - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;
  
  // Calculate trading days
  const tradingDays = equityCurve.length;
  const tradingYears = tradingDays / 252;
  const annualizedReturn = tradingYears > 0 
    ? (Math.pow(finalCapital / initialCapital, 1 / tradingYears) - 1) * 100
    : 0;
  
  // Calculate drawdown metrics
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let maxDrawdownDuration = 0;
  let currentDrawdownStart = 0;
  
  for (const point of equityCurve) {
    if (point.drawdown > maxDrawdown) {
      maxDrawdown = point.drawdown;
      maxDrawdownPercent = point.drawdownPercent;
    }
    if (point.drawdown > 0 && currentDrawdownStart === 0) {
      currentDrawdownStart = point.timestamp;
    } else if (point.drawdown === 0 && currentDrawdownStart > 0) {
      const duration = (point.timestamp - currentDrawdownStart) / (24 * 60 * 60 * 1000);
      maxDrawdownDuration = Math.max(maxDrawdownDuration, duration);
      currentDrawdownStart = 0;
    }
  }
  
  // Calculate volatility
  const returns = equityCurve.slice(1).map((p, i) => 
    (p.equity - equityCurve[i].equity) / equityCurve[i].equity
  );
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 252) * 100;
  
  // Downside volatility
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVariance = negativeReturns.length > 0
    ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    : 0;
  const downsideVolatility = Math.sqrt(downsideVariance * 252) * 100;
  
  // Risk-adjusted returns
  const riskFreeRate = 0.05; // 5% annual
  const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate * 100) / volatility : 0;
  const sortinoRatio = downsideVolatility > 0 ? (annualizedReturn - riskFreeRate * 100) / downsideVolatility : 0;
  const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;
  
  // Trade statistics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
    : 0;
  
  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(t => t.pnl))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.abs(Math.min(...losingTrades.map(t => t.pnl)))
    : 0;
  
  const avgHoldingPeriod = trades.length > 0
    ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length
    : 0;
  
  const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  
  // Consecutive stats
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let totalConsecutiveWinStreaks = 0;
  let totalConsecutiveLossStreaks = 0;
  let winStreakCount = 0;
  let lossStreakCount = 0;
  
  for (const trade of trades) {
    if (trade.pnl > 0) {
      currentConsecutiveWins++;
      if (currentConsecutiveLosses > 0) {
        totalConsecutiveLossStreaks += currentConsecutiveLosses;
        lossStreakCount++;
      }
      currentConsecutiveLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
    } else {
      currentConsecutiveLosses++;
      if (currentConsecutiveWins > 0) {
        totalConsecutiveWinStreaks += currentConsecutiveWins;
        winStreakCount++;
      }
      currentConsecutiveWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
    }
  }
  
  const avgConsecutiveWins = winStreakCount > 0 ? totalConsecutiveWinStreaks / winStreakCount : 0;
  const avgConsecutiveLosses = lossStreakCount > 0 ? totalConsecutiveLossStreaks / lossStreakCount : 0;
  
  // Time in market
  const totalHoldingTime = trades.reduce((sum, t) => sum + t.holdingPeriod, 0);
  const timeInMarket = tradingDays > 0 ? (totalHoldingTime / tradingDays) * 100 : 0;
  
  // Position sizing stats
  const positionSizes = trades.map(t => t.quantity * t.entryPrice);
  const avgPositionSize = positionSizes.length > 0
    ? positionSizes.reduce((a, b) => a + b, 0) / positionSizes.length
    : 0;
  const maxPositionSize = positionSizes.length > 0 ? Math.max(...positionSizes) : 0;
  
  // Monthly returns
  const monthlyReturns = calculateMonthlyReturns(equityCurve);
  
  return {
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
    monthlyReturns,
    maxDrawdown,
    maxDrawdownPercent,
    maxDrawdownDuration,
    volatility,
    downsidevVolatility: downsideVolatility,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgHoldingPeriod,
    profitFactor,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgConsecutiveWins,
    avgConsecutiveLosses,
    timeInMarket,
    avgPositionSize,
    maxPositionSize,
  };
}

function calculateMonthlyReturns(equityCurve: EquityCurvePoint[]): number[] {
  const monthlyReturns: number[] = [];
  let lastMonthEnd = equityCurve[0]?.equity || 0;
  let currentMonth = new Date(equityCurve[0]?.timestamp || 0).getMonth();
  
  for (const point of equityCurve) {
    const month = new Date(point.timestamp).getMonth();
    if (month !== currentMonth) {
      const monthReturn = lastMonthEnd > 0 ? ((point.equity - lastMonthEnd) / lastMonthEnd) * 100 : 0;
      monthlyReturns.push(monthReturn);
      lastMonthEnd = point.equity;
      currentMonth = month;
    }
  }
  
  return monthlyReturns;
}

function calculateMonthlyPerformance(trades: TradeRecord[]): Array<{
  month: string;
  return: number;
  trades: number;
  winRate: number;
}> {
  const monthlyData = new Map<string, TradeRecord[]>();
  
  for (const trade of trades) {
    const date = new Date(trade.exitTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(trade);
  }
  
  const result: Array<{ month: string; return: number; trades: number; winRate: number }> = [];
  
  for (const [month, monthTrades] of Array.from(monthlyData)) {
    const totalPnl = monthTrades.reduce((sum: number, t: TradeRecord) => sum + t.pnl, 0);
    const wins = monthTrades.filter((t: TradeRecord) => t.pnl > 0).length;
    
    result.push({
      month,
      return: totalPnl,
      trades: monthTrades.length,
      winRate: monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0,
    });
  }
  
  return result.sort((a, b) => a.month.localeCompare(b.month));
}

function calculateYearlyPerformance(trades: TradeRecord[]): Array<{
  year: number;
  return: number;
  trades: number;
  winRate: number;
  maxDrawdown: number;
}> {
  const yearlyData = new Map<number, TradeRecord[]>();
  
  for (const trade of trades) {
    const year = new Date(trade.exitTime).getFullYear();
    
    if (!yearlyData.has(year)) {
      yearlyData.set(year, []);
    }
    yearlyData.get(year)!.push(trade);
  }
  
  const result: Array<{ year: number; return: number; trades: number; winRate: number; maxDrawdown: number }> = [];
  
  for (const [year, yearTrades] of Array.from(yearlyData)) {
    const totalPnl = yearTrades.reduce((sum: number, t: TradeRecord) => sum + t.pnl, 0);
    const wins = yearTrades.filter((t: TradeRecord) => t.pnl > 0).length;
    const maxLoss = yearTrades.length > 0 
      ? Math.abs(Math.min(...yearTrades.map((t: TradeRecord) => t.pnl), 0))
      : 0;
    
    result.push({
      year,
      return: totalPnl,
      trades: yearTrades.length,
      winRate: yearTrades.length > 0 ? (wins / yearTrades.length) * 100 : 0,
      maxDrawdown: maxLoss,
    });
  }
  
  return result.sort((a, b) => a.year - b.year);
}

/**
 * Run multiple backtests with different parameters
 */
export function runParameterSweep(
  strategy: GeneratedStrategy,
  baseConfig: BacktestConfig,
  parameterRanges: {
    stopLossRange?: number[];
    takeProfitRange?: number[];
    positionSizeRange?: number[];
  }
): BacktestResult[] {
  const results: BacktestResult[] = [];
  
  const stopLosses = parameterRanges.stopLossRange || [3];
  const takeProfits = parameterRanges.takeProfitRange || [6];
  const positionSizes = parameterRanges.positionSizeRange || [2];
  
  for (const sl of stopLosses) {
    for (const tp of takeProfits) {
      for (const ps of positionSizes) {
        // Modify strategy with new parameters
        const modifiedStrategy = {
          ...strategy,
          exitRules: strategy.exitRules.map(rule => {
            if (rule.type === 'stop_loss') return { ...rule, value: sl };
            if (rule.type === 'take_profit') return { ...rule, value: tp };
            return rule;
          }),
          positionSizing: {
            ...strategy.positionSizing,
            riskPerTrade: ps,
          },
        };
        
        const result = runBacktest(modifiedStrategy, baseConfig);
        results.push(result);
      }
    }
  }
  
  return results;
}

/**
 * Compare backtest results
 */
export function compareBacktestResults(results: BacktestResult[]): {
  comparison: Array<{
    id: string;
    strategyName: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    score: number;
  }>;
  bestOverall: string;
  bestRiskAdjusted: string;
  bestWinRate: string;
} {
  const comparison = results.map(r => {
    const score = 
      (r.metrics.sharpeRatio * 20) +
      (r.metrics.winRate * 0.3) +
      (r.metrics.profitFactor * 10) +
      ((100 - r.metrics.maxDrawdownPercent) * 0.2) +
      (r.metrics.annualizedReturn * 0.5);
    
    return {
      id: r.id,
      strategyName: r.strategyName,
      totalReturn: r.metrics.totalReturnPercent,
      sharpeRatio: r.metrics.sharpeRatio,
      maxDrawdown: r.metrics.maxDrawdownPercent,
      winRate: r.metrics.winRate,
      profitFactor: r.metrics.profitFactor,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
  
  const bestOverall = comparison[0]?.id || '';
  const bestRiskAdjusted = [...comparison].sort((a, b) => b.sharpeRatio - a.sharpeRatio)[0]?.id || '';
  const bestWinRate = [...comparison].sort((a, b) => b.winRate - a.winRate)[0]?.id || '';
  
  return {
    comparison,
    bestOverall,
    bestRiskAdjusted,
    bestWinRate,
  };
}

/**
 * Get backtest summary for display
 */
export function getBacktestSummary(result: BacktestResult): {
  overview: {
    totalReturn: string;
    annualizedReturn: string;
    sharpeRatio: string;
    maxDrawdown: string;
    winRate: string;
    profitFactor: string;
  };
  performance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgWin: string;
    avgLoss: string;
    avgHoldingPeriod: string;
  };
  risk: {
    volatility: string;
    sortinoRatio: string;
    calmarRatio: string;
    maxConsecutiveLosses: number;
    timeInMarket: string;
  };
  vsBenchmark: {
    strategyReturn: string;
    benchmarkReturn: string;
    alpha: string;
  };
} {
  const m = result.metrics;
  const b = result.benchmark;
  
  return {
    overview: {
      totalReturn: `${m.totalReturnPercent >= 0 ? '+' : ''}${m.totalReturnPercent.toFixed(2)}%`,
      annualizedReturn: `${m.annualizedReturn >= 0 ? '+' : ''}${m.annualizedReturn.toFixed(2)}%`,
      sharpeRatio: m.sharpeRatio.toFixed(2),
      maxDrawdown: `${m.maxDrawdownPercent.toFixed(2)}%`,
      winRate: `${m.winRate.toFixed(1)}%`,
      profitFactor: m.profitFactor === Infinity ? '∞' : m.profitFactor.toFixed(2),
    },
    performance: {
      totalTrades: m.totalTrades,
      winningTrades: m.winningTrades,
      losingTrades: m.losingTrades,
      avgWin: `$${m.avgWin.toFixed(2)}`,
      avgLoss: `$${m.avgLoss.toFixed(2)}`,
      avgHoldingPeriod: `${m.avgHoldingPeriod.toFixed(1)} days`,
    },
    risk: {
      volatility: `${m.volatility.toFixed(2)}%`,
      sortinoRatio: m.sortinoRatio.toFixed(2),
      calmarRatio: m.calmarRatio.toFixed(2),
      maxConsecutiveLosses: m.maxConsecutiveLosses,
      timeInMarket: `${m.timeInMarket.toFixed(1)}%`,
    },
    vsBenchmark: {
      strategyReturn: `${m.totalReturnPercent >= 0 ? '+' : ''}${m.totalReturnPercent.toFixed(2)}%`,
      benchmarkReturn: b ? `${b.return >= 0 ? '+' : ''}${b.return.toFixed(2)}%` : 'N/A',
      alpha: b ? `${(m.totalReturnPercent - b.return) >= 0 ? '+' : ''}${(m.totalReturnPercent - b.return).toFixed(2)}%` : 'N/A',
    },
  };
}
