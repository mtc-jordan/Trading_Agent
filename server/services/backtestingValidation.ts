/**
 * Backtesting Validation Service
 * Validates enhanced analysis recommendations against historical data
 * Based on research from CFA Institute and QuantInsti best practices
 */

import { getDb } from "../db";
import { backtestResults, strategyComparisons, priceTracking } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { callDataApi } from "../_core/dataApi";
import { runEnhancedAnalysis, EnhancedAnalysisResult } from "./enhancedAnalysis";

// Types for backtesting validation
export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  strategyType: 'standard' | 'enhanced' | 'rl' | 'custom';
  strategyConfig?: Record<string, unknown>;
  commission?: number;
  slippage?: number;
}

export interface BacktestTrade {
  entryDate: Date;
  entryPrice: number;
  exitDate: Date;
  exitPrice: number;
  side: 'long' | 'short';
  quantity: number;
  pnl: number;
  pnlPercent: number;
  recommendation: string;
  confidence: number;
  exitReason: 'signal' | 'stop_loss' | 'take_profit' | 'end_of_test';
}

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgHoldingPeriod: number;
  calmarRatio: number;
}

export interface BacktestValidationResult {
  id?: number;
  config: BacktestConfig;
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: { date: string; value: number }[];
  drawdownCurve: { date: string; drawdown: number }[];
  analysisAccuracy: {
    totalPredictions: number;
    correctPredictions: number;
    accuracyRate: number;
    avgConfidence: number;
    byRecommendation: Record<string, { total: number; correct: number; accuracy: number }>;
  };
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
}

// Fetch historical price data
async function fetchHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let range = "max";
    if (daysDiff <= 30) range = "1mo";
    else if (daysDiff <= 90) range = "3mo";
    else if (daysDiff <= 180) range = "6mo";
    else if (daysDiff <= 365) range = "1y";
    else if (daysDiff <= 730) range = "2y";
    else if (daysDiff <= 1825) range = "5y";

    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range,
        includeAdjustedClose: true,
      },
    });

    const chartResponse = response as { 
      chart?: { 
        result?: Array<{ 
          timestamp?: number[]; 
          indicators?: { 
            quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }>; 
            adjclose?: Array<{ adjclose?: number[] }> 
          } 
        }> 
      } 
    };
    
    if (!chartResponse?.chart?.result?.[0]) {
      return [];
    }

    const result = chartResponse.chart.result[0];
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

// Calculate metrics from trades
function calculateMetrics(
  trades: BacktestTrade[],
  equityCurve: { date: string; value: number }[],
  initialCapital: number,
  daysInTest: number
): BacktestMetrics {
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  
  const totalReturn = equityCurve.length > 0 
    ? (equityCurve[equityCurve.length - 1].value - initialCapital) / initialCapital 
    : 0;
  
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / Math.max(daysInTest, 1)) - 1;
  
  // Calculate daily returns for Sharpe/Sortino
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value);
  }
  
  const avgDailyReturn = dailyReturns.length > 0 
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length 
    : 0;
  
  const stdDev = dailyReturns.length > 0 
    ? Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length)
    : 0;
  
  const downside = dailyReturns.filter(r => r < 0);
  const downsideStdDev = downside.length > 0 
    ? Math.sqrt(downside.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downside.length)
    : 0;
  
  const sharpeRatio = stdDev > 0 ? (avgDailyReturn * 252) / (stdDev * Math.sqrt(252)) : 0;
  const sortinoRatio = downsideStdDev > 0 ? (avgDailyReturn * 252) / (downsideStdDev * Math.sqrt(252)) : 0;
  
  // Max drawdown
  let maxDrawdown = 0;
  let peak = initialCapital;
  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value;
    const drawdown = (peak - point.value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
  
  const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  
  // Average holding period
  const holdingPeriods = trades.map(t => 
    (t.exitDate.getTime() - t.entryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const avgHoldingPeriod = holdingPeriods.length > 0 
    ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length 
    : 0;
  
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  
  return {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgHoldingPeriod,
    calmarRatio,
  };
}

// Simulate standard analysis (simple moving average crossover)
function generateStandardSignal(
  prices: number[],
  index: number
): { recommendation: string; confidence: number } {
  if (index < 50) {
    return { recommendation: 'hold', confidence: 0.5 };
  }
  
  // SMA 20 and SMA 50 crossover
  const sma20 = prices.slice(index - 19, index + 1).reduce((a, b) => a + b, 0) / 20;
  const sma50 = prices.slice(index - 49, index + 1).reduce((a, b) => a + b, 0) / 50;
  const prevSma20 = prices.slice(index - 20, index).reduce((a, b) => a + b, 0) / 20;
  const prevSma50 = prices.slice(index - 50, index - 1).reduce((a, b) => a + b, 0) / 50;
  
  // RSI
  let gains = 0, losses = 0;
  for (let i = index - 13; i <= index; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  const rsi = 100 - (100 / (1 + rs));
  
  // Generate signal
  if (sma20 > sma50 && prevSma20 <= prevSma50) {
    return { recommendation: 'strong_buy', confidence: 0.8 };
  } else if (sma20 > sma50 && rsi < 70) {
    return { recommendation: 'buy', confidence: 0.65 };
  } else if (sma20 < sma50 && prevSma20 >= prevSma50) {
    return { recommendation: 'strong_sell', confidence: 0.8 };
  } else if (sma20 < sma50 && rsi > 30) {
    return { recommendation: 'sell', confidence: 0.65 };
  }
  
  return { recommendation: 'hold', confidence: 0.5 };
}

// Simulate enhanced analysis signal
async function generateEnhancedSignal(
  symbol: string,
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[],
  index: number
): Promise<{ recommendation: string; confidence: number; stopLoss: number; takeProfit: number }> {
  if (index < 50) {
    return { recommendation: 'hold', confidence: 0.5, stopLoss: 0, takeProfit: 0 };
  }
  
  const currentPrice = prices[index];
  
  // Calculate technical indicators
  // RSI
  let gains = 0, losses = 0;
  for (let i = index - 13; i <= index; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  const rsi = 100 - (100 / (1 + rs));
  
  // MACD
  const ema12 = calculateEMA(prices.slice(0, index + 1), 12);
  const ema26 = calculateEMA(prices.slice(0, index + 1), 26);
  const macd = ema12 - ema26;
  
  // ATR for stop loss
  let atrSum = 0;
  for (let i = index - 13; i <= index; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - prices[i - 1]),
      Math.abs(lows[i] - prices[i - 1])
    );
    atrSum += tr;
  }
  const atr = atrSum / 14;
  
  // ADX for trend strength
  const adx = calculateADX(highs.slice(0, index + 1), lows.slice(0, index + 1), prices.slice(0, index + 1));
  
  // Bollinger Bands
  const bbPeriod = 20;
  const bbPrices = prices.slice(index - bbPeriod + 1, index + 1);
  const bbMiddle = bbPrices.reduce((a, b) => a + b, 0) / bbPeriod;
  const bbStdDev = Math.sqrt(bbPrices.reduce((sum, p) => sum + Math.pow(p - bbMiddle, 2), 0) / bbPeriod);
  const bbUpper = bbMiddle + 2 * bbStdDev;
  const bbLower = bbMiddle - 2 * bbStdDev;
  const percentB = (currentPrice - bbLower) / (bbUpper - bbLower);
  
  // Enhanced multi-factor scoring
  let score = 0;
  let confidence = 0.5;
  
  // RSI factor (weight: 25%)
  if (rsi < 30) score += 0.25;
  else if (rsi < 40) score += 0.125;
  else if (rsi > 70) score -= 0.25;
  else if (rsi > 60) score -= 0.125;
  
  // MACD factor (weight: 25%)
  if (macd > 0 && macd > prices[index] * 0.001) score += 0.25;
  else if (macd > 0) score += 0.125;
  else if (macd < 0 && macd < -prices[index] * 0.001) score -= 0.25;
  else if (macd < 0) score -= 0.125;
  
  // Bollinger Bands factor (weight: 20%)
  if (percentB < 0.2) score += 0.2;
  else if (percentB < 0.4) score += 0.1;
  else if (percentB > 0.8) score -= 0.2;
  else if (percentB > 0.6) score -= 0.1;
  
  // ADX trend strength factor (weight: 15%)
  if (adx > 25) {
    // Strong trend - amplify signal
    score *= 1.2;
    confidence += 0.1;
  } else if (adx < 15) {
    // Weak trend - reduce confidence
    score *= 0.8;
    confidence -= 0.1;
  }
  
  // Volume factor (weight: 15%)
  const avgVolume = volumes.slice(index - 19, index + 1).reduce((a, b) => a + b, 0) / 20;
  if (volumes[index] > avgVolume * 1.5) {
    confidence += 0.1;
  }
  
  // Determine recommendation
  let recommendation: string;
  if (score > 0.4) {
    recommendation = 'strong_buy';
    confidence = Math.min(0.95, confidence + 0.2);
  } else if (score > 0.2) {
    recommendation = 'buy';
    confidence = Math.min(0.85, confidence + 0.1);
  } else if (score < -0.4) {
    recommendation = 'strong_sell';
    confidence = Math.min(0.95, confidence + 0.2);
  } else if (score < -0.2) {
    recommendation = 'sell';
    confidence = Math.min(0.85, confidence + 0.1);
  } else {
    recommendation = 'hold';
    confidence = 0.5;
  }
  
  // ATR-based stop loss and take profit
  const stopLoss = currentPrice - 2 * atr;
  const takeProfit = currentPrice + 3 * atr;
  
  return { recommendation, confidence, stopLoss, takeProfit };
}

// Helper: Calculate EMA
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Helper: Calculate ADX
function calculateADX(highs: number[], lows: number[], closes: number[]): number {
  const period = 14;
  const n = highs.length;
  
  if (n < period + 1) return 25; // Default neutral value
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  
  // Smoothed averages
  const smoothedTR = tr.slice(-period).reduce((a, b) => a + b, 0);
  const smoothedPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0);
  const smoothedMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0);
  
  const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
  
  const dx = plusDI + minusDI > 0 
    ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 
    : 0;
  
  return dx;
}

// Main backtest validation function
export async function runBacktestValidation(
  userId: number,
  config: BacktestConfig
): Promise<BacktestValidationResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Create initial record
  const [insertResult] = await db.insert(backtestResults).values({
    userId,
    name: `${config.strategyType} Backtest - ${config.symbol}`,
    symbol: config.symbol,
    startDate: config.startDate,
    endDate: config.endDate,
    initialCapital: config.initialCapital.toString(),
    strategyType: config.strategyType,
    strategyConfig: config.strategyConfig || {},
    status: 'running',
  });
  
  const backtestId = insertResult.insertId;
  
  try {
    // Fetch historical data
    const historicalData = await fetchHistoricalData(config.symbol, config.startDate, config.endDate);
    
    if (historicalData.length < 60) {
      throw new Error('Insufficient historical data for backtesting (need at least 60 days)');
    }
    
    const prices = historicalData.map(d => d.close);
    const volumes = historicalData.map(d => d.volume);
    const highs = historicalData.map(d => d.high);
    const lows = historicalData.map(d => d.low);
    
    const trades: BacktestTrade[] = [];
    const equityCurve: { date: string; value: number }[] = [];
    const drawdownCurve: { date: string; drawdown: number }[] = [];
    
    let cash = config.initialCapital;
    let position = 0;
    let entryPrice = 0;
    let entryDate: Date | null = null;
    let stopLoss = 0;
    let takeProfit = 0;
    let peak = config.initialCapital;
    
    const commission = config.commission || 0.001;
    const slippage = config.slippage || 0.0005;
    
    // Track predictions for accuracy
    const predictions: { recommendation: string; confidence: number; actualReturn: number }[] = [];
    
    // Simulate trading
    for (let i = 50; i < historicalData.length; i++) {
      const currentPrice = prices[i];
      const currentDate = new Date(historicalData[i].timestamp);
      const equity = cash + position * currentPrice;
      
      // Record equity curve
      equityCurve.push({
        date: currentDate.toISOString().split('T')[0],
        value: equity,
      });
      
      // Calculate drawdown
      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak;
      drawdownCurve.push({
        date: currentDate.toISOString().split('T')[0],
        drawdown,
      });
      
      // Generate signal based on strategy type
      let signal: { recommendation: string; confidence: number; stopLoss?: number; takeProfit?: number };
      
      if (config.strategyType === 'enhanced') {
        signal = await generateEnhancedSignal(config.symbol, prices, volumes, highs, lows, i);
      } else {
        signal = generateStandardSignal(prices, i);
      }
      
      // Track prediction for accuracy calculation
      if (i < historicalData.length - 5) {
        const futureReturn = (prices[i + 5] - currentPrice) / currentPrice;
        predictions.push({
          recommendation: signal.recommendation,
          confidence: signal.confidence,
          actualReturn: futureReturn,
        });
      }
      
      // Check stop loss / take profit
      if (position > 0) {
        if (currentPrice <= stopLoss) {
          // Stop loss hit
          const exitPrice = currentPrice * (1 - slippage);
          const pnl = (exitPrice - entryPrice) * position - commission * exitPrice * position;
          
          trades.push({
            entryDate: entryDate!,
            entryPrice,
            exitDate: currentDate,
            exitPrice,
            side: 'long',
            quantity: position,
            pnl,
            pnlPercent: (exitPrice - entryPrice) / entryPrice,
            recommendation: signal.recommendation,
            confidence: signal.confidence,
            exitReason: 'stop_loss',
          });
          
          cash += exitPrice * position - commission * exitPrice * position;
          position = 0;
          entryDate = null;
          continue;
        }
        
        if (currentPrice >= takeProfit) {
          // Take profit hit
          const exitPrice = currentPrice * (1 - slippage);
          const pnl = (exitPrice - entryPrice) * position - commission * exitPrice * position;
          
          trades.push({
            entryDate: entryDate!,
            entryPrice,
            exitDate: currentDate,
            exitPrice,
            side: 'long',
            quantity: position,
            pnl,
            pnlPercent: (exitPrice - entryPrice) / entryPrice,
            recommendation: signal.recommendation,
            confidence: signal.confidence,
            exitReason: 'take_profit',
          });
          
          cash += exitPrice * position - commission * exitPrice * position;
          position = 0;
          entryDate = null;
          continue;
        }
      }
      
      // Execute trades based on signal
      if (position === 0 && (signal.recommendation === 'strong_buy' || signal.recommendation === 'buy')) {
        // Enter long position
        const buyPrice = currentPrice * (1 + slippage);
        const positionSize = Math.floor((cash * 0.95) / buyPrice); // Use 95% of capital
        
        if (positionSize > 0) {
          position = positionSize;
          entryPrice = buyPrice;
          entryDate = currentDate;
          cash -= buyPrice * positionSize + commission * buyPrice * positionSize;
          
          // Set stop loss and take profit
          if (signal.stopLoss && signal.takeProfit) {
            stopLoss = signal.stopLoss;
            takeProfit = signal.takeProfit;
          } else {
            // Default 2% stop loss, 4% take profit
            stopLoss = buyPrice * 0.98;
            takeProfit = buyPrice * 1.04;
          }
        }
      } else if (position > 0 && (signal.recommendation === 'strong_sell' || signal.recommendation === 'sell')) {
        // Exit long position
        const exitPrice = currentPrice * (1 - slippage);
        const pnl = (exitPrice - entryPrice) * position - commission * exitPrice * position;
        
        trades.push({
          entryDate: entryDate!,
          entryPrice,
          exitDate: currentDate,
          exitPrice,
          side: 'long',
          quantity: position,
          pnl,
          pnlPercent: (exitPrice - entryPrice) / entryPrice,
          recommendation: signal.recommendation,
          confidence: signal.confidence,
          exitReason: 'signal',
        });
        
        cash += exitPrice * position - commission * exitPrice * position;
        position = 0;
        entryDate = null;
      }
    }
    
    // Close any remaining position at end
    if (position > 0) {
      const exitPrice = prices[prices.length - 1] * (1 - slippage);
      const pnl = (exitPrice - entryPrice) * position - commission * exitPrice * position;
      
      trades.push({
        entryDate: entryDate!,
        entryPrice,
        exitDate: new Date(historicalData[historicalData.length - 1].timestamp),
        exitPrice,
        side: 'long',
        quantity: position,
        pnl,
        pnlPercent: (exitPrice - entryPrice) / entryPrice,
        recommendation: 'end',
        confidence: 0,
        exitReason: 'end_of_test',
      });
      
      cash += exitPrice * position;
    }
    
    // Calculate metrics
    const daysInTest = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const metrics = calculateMetrics(trades, equityCurve, config.initialCapital, daysInTest);
    
    // Calculate analysis accuracy
    const accuracyByRec: Record<string, { total: number; correct: number; accuracy: number }> = {};
    let totalCorrect = 0;
    
    for (const pred of predictions) {
      const isBullish = pred.recommendation === 'strong_buy' || pred.recommendation === 'buy';
      const isBearish = pred.recommendation === 'strong_sell' || pred.recommendation === 'sell';
      const isCorrect = (isBullish && pred.actualReturn > 0) || 
                       (isBearish && pred.actualReturn < 0) ||
                       (pred.recommendation === 'hold' && Math.abs(pred.actualReturn) < 0.02);
      
      if (isCorrect) totalCorrect++;
      
      if (!accuracyByRec[pred.recommendation]) {
        accuracyByRec[pred.recommendation] = { total: 0, correct: 0, accuracy: 0 };
      }
      accuracyByRec[pred.recommendation].total++;
      if (isCorrect) accuracyByRec[pred.recommendation].correct++;
    }
    
    // Calculate accuracy rates
    for (const rec of Object.keys(accuracyByRec)) {
      accuracyByRec[rec].accuracy = accuracyByRec[rec].total > 0 
        ? accuracyByRec[rec].correct / accuracyByRec[rec].total 
        : 0;
    }
    
    const analysisAccuracy = {
      totalPredictions: predictions.length,
      correctPredictions: totalCorrect,
      accuracyRate: predictions.length > 0 ? totalCorrect / predictions.length : 0,
      avgConfidence: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
        : 0,
      byRecommendation: accuracyByRec,
    };
    
    // Update database record
    await db.update(backtestResults)
      .set({
        finalCapital: (cash + position * prices[prices.length - 1]).toString(),
        totalReturn: metrics.totalReturn.toString(),
        annualizedReturn: metrics.annualizedReturn.toString(),
        sharpeRatio: metrics.sharpeRatio.toString(),
        sortinoRatio: metrics.sortinoRatio.toString(),
        maxDrawdown: metrics.maxDrawdown.toString(),
        winRate: metrics.winRate.toString(),
        profitFactor: metrics.profitFactor.toString(),
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        avgWin: metrics.avgWin.toString(),
        avgLoss: metrics.avgLoss.toString(),
        equityCurve,
        trades: trades.map(t => ({
          ...t,
          entryDate: t.entryDate.toISOString(),
          exitDate: t.exitDate.toISOString(),
        })),
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(backtestResults.id, backtestId));
    
    return {
      id: backtestId,
      config,
      trades,
      metrics,
      equityCurve,
      drawdownCurve,
      analysisAccuracy,
      status: 'completed',
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await db.update(backtestResults)
      .set({
        status: 'failed',
        errorMessage,
      })
      .where(eq(backtestResults.id, backtestId));
    
    return {
      id: backtestId,
      config,
      trades: [],
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgHoldingPeriod: 0,
        calmarRatio: 0,
      },
      equityCurve: [],
      drawdownCurve: [],
      analysisAccuracy: {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracyRate: 0,
        avgConfidence: 0,
        byRecommendation: {},
      },
      status: 'failed',
      errorMessage,
    };
  }
}

// Get backtest results for a user
export async function getUserBacktests(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select()
    .from(backtestResults)
    .where(eq(backtestResults.userId, userId))
    .orderBy(desc(backtestResults.createdAt))
    .limit(limit);
  
  return results;
}

// Get a specific backtest result
export async function getBacktestById(backtestId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [result] = await db.select()
    .from(backtestResults)
    .where(and(
      eq(backtestResults.id, backtestId),
      eq(backtestResults.userId, userId)
    ));
  
  return result;
}
