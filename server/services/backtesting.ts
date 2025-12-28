import { callDataApi } from "../_core/dataApi";

export interface BacktestConfig {
  strategy: StrategyConfig;
  symbols: string[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission: number; // Per trade commission rate
  slippage: number; // Slippage rate
}

export interface StrategyConfig {
  type: "momentum" | "mean_reversion" | "trend_following" | "custom";
  parameters: Record<string, number | string | boolean>;
  entryConditions: string[];
  exitConditions: string[];
  positionSizing: "fixed" | "percent" | "kelly";
  maxPositionSize: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface BacktestTrade {
  symbol: string;
  entryDate: Date;
  entryPrice: number;
  exitDate?: Date;
  exitPrice?: number;
  side: "long" | "short";
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  exitReason?: "signal" | "stop_loss" | "take_profit" | "end_of_test";
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: { date: Date; equity: number }[];
  drawdownCurve: { date: Date; drawdown: number }[];
}

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // Days
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageHoldingPeriod: number; // Days
  calmarRatio: number;
}

// Fetch historical data for backtesting
export async function fetchHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    // Calculate the range based on date difference
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let range = "max";
    if (daysDiff <= 30) range = "1mo";
    else if (daysDiff <= 90) range = "3mo";
    else if (daysDiff <= 180) range = "6mo";
    else if (daysDiff <= 365) range = "1y";
    else if (daysDiff <= 730) range = "2y";
    else if (daysDiff <= 1825) range = "5y";
    else if (daysDiff <= 3650) range = "10y";

    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range,
        includeAdjustedClose: true,
      },
    });

    const chartResponse = response as { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }>; adjclose?: Array<{ adjclose?: number[] }> } }> } };
    if (!chartResponse?.chart?.result?.[0]) {
      return [];
    }

    const result = chartResponse.chart!.result![0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];

    const data: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i] * 1000;
      if (ts >= startDate.getTime() && ts <= endDate.getTime()) {
        data.push({
          timestamp: ts,
          open: quotes.open?.[i] || 0,
          high: quotes.high?.[i] || 0,
          low: quotes.low?.[i] || 0,
          close: adjClose[i] || quotes.close?.[i] || 0,
          volume: quotes.volume?.[i] || 0,
        });
      }
    }

    return data;
  } catch (error) {
    console.error(`Failed to fetch historical data for ${symbol}:`, error);
    return [];
  }
}

// Calculate Simple Moving Average
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Calculate Exponential Moving Average
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i]);
    } else if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      ema.push(sum / period);
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
}

// Calculate RSI
function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  return rsi;
}

// Generate trading signals based on strategy
function generateSignals(
  data: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[],
  strategy: StrategyConfig
): { timestamp: number; signal: "buy" | "sell" | "hold" }[] {
  const closes = data.map(d => d.close);
  const signals: { timestamp: number; signal: "buy" | "sell" | "hold" }[] = [];

  switch (strategy.type) {
    case "momentum": {
      const shortPeriod = (strategy.parameters.shortPeriod as number) || 10;
      const longPeriod = (strategy.parameters.longPeriod as number) || 20;
      const shortSMA = calculateSMA(closes, shortPeriod);
      const longSMA = calculateSMA(closes, longPeriod);

      for (let i = 0; i < data.length; i++) {
        if (isNaN(shortSMA[i]) || isNaN(longSMA[i])) {
          signals.push({ timestamp: data[i].timestamp, signal: "hold" });
        } else if (shortSMA[i] > longSMA[i] && shortSMA[i - 1] <= longSMA[i - 1]) {
          signals.push({ timestamp: data[i].timestamp, signal: "buy" });
        } else if (shortSMA[i] < longSMA[i] && shortSMA[i - 1] >= longSMA[i - 1]) {
          signals.push({ timestamp: data[i].timestamp, signal: "sell" });
        } else {
          signals.push({ timestamp: data[i].timestamp, signal: "hold" });
        }
      }
      break;
    }

    case "mean_reversion": {
      const period = (strategy.parameters.period as number) || 20;
      const stdMultiplier = (strategy.parameters.stdMultiplier as number) || 2;
      const sma = calculateSMA(closes, period);

      for (let i = 0; i < data.length; i++) {
        if (isNaN(sma[i]) || i < period) {
          signals.push({ timestamp: data[i].timestamp, signal: "hold" });
        } else {
          const slice = closes.slice(i - period + 1, i + 1);
          const std = Math.sqrt(slice.reduce((sum, val) => sum + Math.pow(val - sma[i], 2), 0) / period);
          const upperBand = sma[i] + stdMultiplier * std;
          const lowerBand = sma[i] - stdMultiplier * std;

          if (closes[i] < lowerBand) {
            signals.push({ timestamp: data[i].timestamp, signal: "buy" });
          } else if (closes[i] > upperBand) {
            signals.push({ timestamp: data[i].timestamp, signal: "sell" });
          } else {
            signals.push({ timestamp: data[i].timestamp, signal: "hold" });
          }
        }
      }
      break;
    }

    case "trend_following": {
      const period = (strategy.parameters.period as number) || 14;
      const overbought = (strategy.parameters.overbought as number) || 70;
      const oversold = (strategy.parameters.oversold as number) || 30;
      const rsi = calculateRSI(closes, period);
      const ema = calculateEMA(closes, 50);

      for (let i = 0; i < data.length; i++) {
        if (isNaN(rsi[i]) || isNaN(ema[i])) {
          signals.push({ timestamp: data[i].timestamp, signal: "hold" });
        } else if (closes[i] > ema[i] && rsi[i] < oversold) {
          signals.push({ timestamp: data[i].timestamp, signal: "buy" });
        } else if (closes[i] < ema[i] && rsi[i] > overbought) {
          signals.push({ timestamp: data[i].timestamp, signal: "sell" });
        } else {
          signals.push({ timestamp: data[i].timestamp, signal: "hold" });
        }
      }
      break;
    }

    default:
      // Default to hold for custom strategies
      for (const d of data) {
        signals.push({ timestamp: d.timestamp, signal: "hold" });
      }
  }

  return signals;
}

// Run backtest
export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const allTrades: BacktestTrade[] = [];
  const equityCurve: { date: Date; equity: number }[] = [];
  const drawdownCurve: { date: Date; drawdown: number }[] = [];

  let cash = config.initialCapital;
  let peakEquity = config.initialCapital;
  const positions: Map<string, { quantity: number; entryPrice: number; entryDate: Date }> = new Map();

  // Fetch data for all symbols
  const symbolData: Map<string, { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]> = new Map();
  
  for (const symbol of config.symbols) {
    const data = await fetchHistoricalData(symbol, config.startDate, config.endDate);
    if (data.length > 0) {
      symbolData.set(symbol, data);
    }
  }

  if (symbolData.size === 0) {
    throw new Error("No historical data available for the specified symbols and date range");
  }

  // Generate signals for each symbol
  const symbolSignals: Map<string, { timestamp: number; signal: "buy" | "sell" | "hold" }[]> = new Map();
  for (const [symbol, data] of Array.from(symbolData.entries())) {
    const signals = generateSignals(data, config.strategy);
    symbolSignals.set(symbol, signals);
  }

  // Get all unique timestamps and sort them
  const allTimestamps = new Set<number>();
  for (const [, data] of Array.from(symbolData.entries())) {
    for (const d of data) {
      allTimestamps.add(d.timestamp);
    }
  }
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  // Simulate trading
  for (const timestamp of sortedTimestamps) {
    const date = new Date(timestamp);

    for (const [symbol, signals] of Array.from(symbolSignals.entries())) {
      const signalIndex = signals.findIndex((s: { timestamp: number; signal: "buy" | "sell" | "hold" }) => s.timestamp === timestamp);
      if (signalIndex === -1) continue;

      const signal = signals[signalIndex];
      const data = symbolData.get(symbol)!;
      const dataIndex = data.findIndex(d => d.timestamp === timestamp);
      if (dataIndex === -1) continue;

      const currentPrice = data[dataIndex].close;
      const position = positions.get(symbol);

      // Calculate position size
      let positionSize = 0;
      if (config.strategy.positionSizing === "fixed") {
        positionSize = config.strategy.maxPositionSize;
      } else if (config.strategy.positionSizing === "percent") {
        positionSize = (cash * config.strategy.maxPositionSize) / 100;
      }

      // Check stop loss and take profit
      if (position) {
        const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice;
        
        if (config.strategy.stopLoss && pnlPercent <= -config.strategy.stopLoss) {
          // Stop loss triggered
          const exitPrice = currentPrice * (1 - config.slippage);
          const pnl = (exitPrice - position.entryPrice) * position.quantity - (config.commission * 2);
          
          allTrades.push({
            symbol,
            entryDate: position.entryDate,
            entryPrice: position.entryPrice,
            exitDate: date,
            exitPrice,
            side: "long",
            quantity: position.quantity,
            pnl,
            pnlPercent: pnl / (position.entryPrice * position.quantity),
            exitReason: "stop_loss"
          });
          
          cash += exitPrice * position.quantity;
          positions.delete(symbol);
          continue;
        }

        if (config.strategy.takeProfit && pnlPercent >= config.strategy.takeProfit) {
          // Take profit triggered
          const exitPrice = currentPrice * (1 - config.slippage);
          const pnl = (exitPrice - position.entryPrice) * position.quantity - (config.commission * 2);
          
          allTrades.push({
            symbol,
            entryDate: position.entryDate,
            entryPrice: position.entryPrice,
            exitDate: date,
            exitPrice,
            side: "long",
            quantity: position.quantity,
            pnl,
            pnlPercent: pnl / (position.entryPrice * position.quantity),
            exitReason: "take_profit"
          });
          
          cash += exitPrice * position.quantity;
          positions.delete(symbol);
          continue;
        }
      }

      // Process signals
      if (signal.signal === "buy" && !position && positionSize > 0) {
        const entryPrice = currentPrice * (1 + config.slippage);
        const quantity = Math.floor(positionSize / entryPrice);
        
        if (quantity > 0 && cash >= entryPrice * quantity + config.commission) {
          cash -= entryPrice * quantity + config.commission;
          positions.set(symbol, { quantity, entryPrice, entryDate: date });
        }
      } else if (signal.signal === "sell" && position) {
        const exitPrice = currentPrice * (1 - config.slippage);
        const pnl = (exitPrice - position.entryPrice) * position.quantity - (config.commission * 2);
        
        allTrades.push({
          symbol,
          entryDate: position.entryDate,
          entryPrice: position.entryPrice,
          exitDate: date,
          exitPrice,
          side: "long",
          quantity: position.quantity,
          pnl,
          pnlPercent: pnl / (position.entryPrice * position.quantity),
          exitReason: "signal"
        });
        
        cash += exitPrice * position.quantity;
        positions.delete(symbol);
      }
    }

    // Calculate current equity
    let positionsValue = 0;
    for (const [symbol, position] of Array.from(positions.entries())) {
      const data = symbolData.get(symbol);
      const dataIndex = data?.findIndex((d: { timestamp: number }) => d.timestamp === timestamp);
      if (dataIndex !== undefined && dataIndex !== -1 && data) {
        positionsValue += data[dataIndex].close * position.quantity;
      }
    }
    
    const currentEquity = cash + positionsValue;
    equityCurve.push({ date, equity: currentEquity });

    // Calculate drawdown
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const drawdown = (peakEquity - currentEquity) / peakEquity;
    drawdownCurve.push({ date, drawdown });
  }

  // Close any remaining positions at end of test
  const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
  for (const [symbol, position] of Array.from(positions.entries())) {
    const data = symbolData.get(symbol);
    const lastData = data?.[data.length - 1];
    if (lastData) {
      const exitPrice = lastData.close;
      const pnl = (exitPrice - position.entryPrice) * position.quantity - (config.commission * 2);
      
      allTrades.push({
        symbol,
        entryDate: position.entryDate,
        entryPrice: position.entryPrice,
        exitDate: new Date(lastTimestamp),
        exitPrice,
        side: "long",
        quantity: position.quantity,
        pnl,
        pnlPercent: pnl / (position.entryPrice * position.quantity),
        exitReason: "end_of_test"
      });
      
      cash += exitPrice * position.quantity;
    }
  }

  // Calculate metrics
  const finalEquity = cash;
  const totalReturn = (finalEquity - config.initialCapital) / config.initialCapital;
  
  const tradingDays = sortedTimestamps.length;
  const years = tradingDays / 252;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

  const winningTrades = allTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = allTrades.filter(t => (t.pnl || 0) <= 0);
  const winRate = allTrades.length > 0 ? winningTrades.length / allTrades.length : 0;

  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

  // Calculate Sharpe ratio
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = stdReturn > 0 ? (avgReturn * 252) / (stdReturn * Math.sqrt(252)) : 0;

  // Calculate Sortino ratio (only downside deviation)
  const negativeReturns = returns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length)
    : 0;
  const sortinoRatio = downsideDeviation > 0 ? (avgReturn * 252) / (downsideDeviation * Math.sqrt(252)) : 0;

  // Max drawdown
  const maxDrawdown = Math.max(...drawdownCurve.map(d => d.drawdown));

  // Max drawdown duration
  let maxDrawdownDuration = 0;
  let currentDrawdownDuration = 0;
  for (const d of drawdownCurve) {
    if (d.drawdown > 0) {
      currentDrawdownDuration++;
      maxDrawdownDuration = Math.max(maxDrawdownDuration, currentDrawdownDuration);
    } else {
      currentDrawdownDuration = 0;
    }
  }

  // Average holding period
  const holdingPeriods = allTrades
    .filter(t => t.exitDate)
    .map(t => (t.exitDate!.getTime() - t.entryDate.getTime()) / (1000 * 60 * 60 * 24));
  const averageHoldingPeriod = holdingPeriods.length > 0
    ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
    : 0;

  // Calmar ratio
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

  const metrics: BacktestMetrics = {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownDuration,
    winRate,
    profitFactor,
    averageWin,
    averageLoss,
    totalTrades: allTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageHoldingPeriod,
    calmarRatio
  };

  return {
    config,
    trades: allTrades,
    metrics,
    equityCurve,
    drawdownCurve
  };
}
