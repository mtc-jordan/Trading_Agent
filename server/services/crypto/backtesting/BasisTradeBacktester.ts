/**
 * Basis Trade Backtesting Engine
 * 
 * Analyzes historical funding rates to optimize entry/exit timing
 * for delta-neutral basis trading strategies.
 */

import { 
  HistoricalFundingCollector, 
  HistoricalFundingData, 
  FundingRateDataPoint,
  createDemoFundingCollector 
} from './HistoricalFundingCollector';

export interface BacktestConfig {
  symbol: string;
  exchange: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number; // As percentage of capital
  entryThreshold: number; // Minimum annualized rate to enter
  exitThreshold: number; // Rate below which to exit
  maxPositionDuration: number; // Max hours to hold position
  tradingFees: number; // Per trade (percentage)
  slippage: number; // Expected slippage (percentage)
}

export interface TradeRecord {
  entryTime: number;
  exitTime: number;
  entryRate: number;
  exitRate: number;
  avgRate: number;
  duration: number; // hours
  pnl: number;
  pnlPercent: number;
  fees: number;
  netPnl: number;
  reason: 'threshold' | 'duration' | 'end_of_data';
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: TradeRecord[];
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    totalPnlPercent: number;
    totalFees: number;
    netPnl: number;
    netPnlPercent: number;
    avgTradeReturn: number;
    avgTradeDuration: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    annualizedReturn: number;
    timeInMarket: number; // Percentage
  };
  equityCurve: { timestamp: number; equity: number }[];
  monthlyReturns: { month: string; return: number }[];
  rateDistribution: {
    bucket: string;
    count: number;
    avgReturn: number;
  }[];
}

export interface OptimizationResult {
  bestConfig: Partial<BacktestConfig>;
  bestResult: BacktestResult;
  allResults: {
    config: Partial<BacktestConfig>;
    netPnlPercent: number;
    sharpeRatio: number;
    winRate: number;
  }[];
  recommendations: string[];
}

export class BasisTradeBacktester {
  private fundingCollector: HistoricalFundingCollector;
  private fundingData: Map<string, HistoricalFundingData> = new Map();

  constructor(fundingCollector?: HistoricalFundingCollector) {
    this.fundingCollector = fundingCollector || createDemoFundingCollector();
  }

  /**
   * Load funding data for backtesting
   */
  async loadData(config: BacktestConfig): Promise<void> {
    this.fundingCollector.updateConfig({
      exchanges: [config.exchange],
      symbols: [config.symbol],
      startDate: config.startDate,
      endDate: config.endDate,
    });

    this.fundingData = await this.fundingCollector.collectAll();
  }

  /**
   * Run backtest with given configuration
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    await this.loadData(config);

    const key = `${config.exchange}:${config.symbol}`;
    const data = this.fundingData.get(key);

    if (!data || data.dataPoints.length === 0) {
      return this.createEmptyResult(config);
    }

    const trades: TradeRecord[] = [];
    const equityCurve: { timestamp: number; equity: number }[] = [];
    let equity = config.initialCapital;
    let peakEquity = equity;
    let maxDrawdown = 0;

    // Sort data points by timestamp
    const sortedData = [...data.dataPoints].sort((a, b) => a.timestamp - b.timestamp);

    let inPosition = false;
    let entryPoint: FundingRateDataPoint | null = null;
    let positionRates: number[] = [];
    let positionStartTime = 0;

    for (let i = 0; i < sortedData.length; i++) {
      const point = sortedData[i];
      const annualizedRate = point.fundingRateAnnualized;

      // Record equity curve
      equityCurve.push({ timestamp: point.timestamp, equity });

      if (!inPosition) {
        // Check entry condition
        if (annualizedRate >= config.entryThreshold) {
          inPosition = true;
          entryPoint = point;
          positionRates = [point.fundingRate];
          positionStartTime = point.timestamp;
        }
      } else {
        // Track position
        positionRates.push(point.fundingRate);
        const duration = (point.timestamp - positionStartTime) / (60 * 60 * 1000); // hours

        // Check exit conditions
        let exitReason: 'threshold' | 'duration' | 'end_of_data' | null = null;

        if (annualizedRate < config.exitThreshold) {
          exitReason = 'threshold';
        } else if (duration >= config.maxPositionDuration) {
          exitReason = 'duration';
        } else if (i === sortedData.length - 1) {
          exitReason = 'end_of_data';
        }

        if (exitReason && entryPoint) {
          // Calculate trade PnL
          const avgRate = positionRates.reduce((a, b) => a + b, 0) / positionRates.length;
          const positionValue = equity * (config.positionSize / 100);
          
          // PnL from funding rate (8-hour intervals)
          const intervals = positionRates.length;
          const grossPnl = positionValue * avgRate * intervals;
          
          // Fees (entry + exit)
          const fees = positionValue * (config.tradingFees / 100) * 2;
          const slippageCost = positionValue * (config.slippage / 100) * 2;
          const totalCosts = fees + slippageCost;
          
          const netPnl = grossPnl - totalCosts;
          const pnlPercent = (netPnl / positionValue) * 100;

          trades.push({
            entryTime: entryPoint.timestamp,
            exitTime: point.timestamp,
            entryRate: entryPoint.fundingRate,
            exitRate: point.fundingRate,
            avgRate,
            duration,
            pnl: grossPnl,
            pnlPercent: (grossPnl / positionValue) * 100,
            fees: totalCosts,
            netPnl,
            reason: exitReason,
          });

          // Update equity
          equity += netPnl;
          
          // Track drawdown
          if (equity > peakEquity) {
            peakEquity = equity;
          }
          const currentDrawdown = peakEquity - equity;
          if (currentDrawdown > maxDrawdown) {
            maxDrawdown = currentDrawdown;
          }

          // Reset position
          inPosition = false;
          entryPoint = null;
          positionRates = [];
        }
      }
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(trades, config, maxDrawdown, sortedData);
    const monthlyReturns = this.calculateMonthlyReturns(trades, config.initialCapital);
    const rateDistribution = this.calculateRateDistribution(trades);

    return {
      config,
      trades,
      summary,
      equityCurve,
      monthlyReturns,
      rateDistribution,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    trades: TradeRecord[],
    config: BacktestConfig,
    maxDrawdown: number,
    dataPoints: FundingRateDataPoint[]
  ): BacktestResult['summary'] {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        totalFees: 0,
        netPnl: 0,
        netPnlPercent: 0,
        avgTradeReturn: 0,
        avgTradeDuration: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        annualizedReturn: 0,
        timeInMarket: 0,
      };
    }

    const winningTrades = trades.filter(t => t.netPnl > 0).length;
    const losingTrades = trades.filter(t => t.netPnl <= 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
    const netPnl = trades.reduce((sum, t) => sum + t.netPnl, 0);
    const avgTradeReturn = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length;
    const avgTradeDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;

    // Calculate time in market
    const totalDuration = trades.reduce((sum, t) => sum + t.duration, 0);
    const totalPeriod = (config.endDate.getTime() - config.startDate.getTime()) / (60 * 60 * 1000);
    const timeInMarket = (totalDuration / totalPeriod) * 100;

    // Calculate Sharpe Ratio (assuming risk-free rate of 5%)
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const riskFreeRate = 5 / 365 / 3; // Per 8-hour period
    const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    // Annualized return
    const daysInPeriod = (config.endDate.getTime() - config.startDate.getTime()) / (24 * 60 * 60 * 1000);
    const annualizedReturn = (netPnl / config.initialCapital) * (365 / daysInPeriod) * 100;

    return {
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate: (winningTrades / trades.length) * 100,
      totalPnl,
      totalPnlPercent: (totalPnl / config.initialCapital) * 100,
      totalFees,
      netPnl,
      netPnlPercent: (netPnl / config.initialCapital) * 100,
      avgTradeReturn,
      avgTradeDuration,
      maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / config.initialCapital) * 100,
      sharpeRatio,
      annualizedReturn,
      timeInMarket,
    };
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(
    trades: TradeRecord[],
    initialCapital: number
  ): BacktestResult['monthlyReturns'] {
    const monthlyPnl = new Map<string, number>();

    for (const trade of trades) {
      const date = new Date(trade.exitTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyPnl.get(monthKey) || 0;
      monthlyPnl.set(monthKey, current + trade.netPnl);
    }

    const results: BacktestResult['monthlyReturns'] = [];
    for (const [month, pnl] of Array.from(monthlyPnl.entries())) {
      results.push({
        month,
        return: (pnl / initialCapital) * 100,
      });
    }

    return results.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calculate rate distribution analysis
   */
  private calculateRateDistribution(trades: TradeRecord[]): BacktestResult['rateDistribution'] {
    const buckets = [
      { min: -Infinity, max: 0, label: 'Negative' },
      { min: 0, max: 5, label: '0-5%' },
      { min: 5, max: 10, label: '5-10%' },
      { min: 10, max: 15, label: '10-15%' },
      { min: 15, max: 20, label: '15-20%' },
      { min: 20, max: Infinity, label: '20%+' },
    ];

    const distribution: BacktestResult['rateDistribution'] = [];

    for (const bucket of buckets) {
      const tradesInBucket = trades.filter(t => {
        const annualized = t.avgRate * 3 * 365 * 100;
        return annualized >= bucket.min && annualized < bucket.max;
      });

      if (tradesInBucket.length > 0) {
        const avgReturn = tradesInBucket.reduce((sum, t) => sum + t.pnlPercent, 0) / tradesInBucket.length;
        distribution.push({
          bucket: bucket.label,
          count: tradesInBucket.length,
          avgReturn,
        });
      } else {
        distribution.push({
          bucket: bucket.label,
          count: 0,
          avgReturn: 0,
        });
      }
    }

    return distribution;
  }

  /**
   * Create empty result for when no data is available
   */
  private createEmptyResult(config: BacktestConfig): BacktestResult {
    return {
      config,
      trades: [],
      summary: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        totalFees: 0,
        netPnl: 0,
        netPnlPercent: 0,
        avgTradeReturn: 0,
        avgTradeDuration: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        annualizedReturn: 0,
        timeInMarket: 0,
      },
      equityCurve: [],
      monthlyReturns: [],
      rateDistribution: [],
    };
  }

  /**
   * Optimize strategy parameters
   */
  async optimizeStrategy(
    baseConfig: BacktestConfig,
    paramRanges: {
      entryThreshold?: number[];
      exitThreshold?: number[];
      maxPositionDuration?: number[];
      positionSize?: number[];
    }
  ): Promise<OptimizationResult> {
    const allResults: OptimizationResult['allResults'] = [];
    let bestResult: BacktestResult | null = null;
    let bestConfig: Partial<BacktestConfig> = {};

    const entryThresholds = paramRanges.entryThreshold || [baseConfig.entryThreshold];
    const exitThresholds = paramRanges.exitThreshold || [baseConfig.exitThreshold];
    const durations = paramRanges.maxPositionDuration || [baseConfig.maxPositionDuration];
    const sizes = paramRanges.positionSize || [baseConfig.positionSize];

    // Grid search over parameter space
    for (const entry of entryThresholds) {
      for (const exit of exitThresholds) {
        for (const duration of durations) {
          for (const size of sizes) {
            const testConfig: BacktestConfig = {
              ...baseConfig,
              entryThreshold: entry,
              exitThreshold: exit,
              maxPositionDuration: duration,
              positionSize: size,
            };

            const result = await this.runBacktest(testConfig);

            allResults.push({
              config: {
                entryThreshold: entry,
                exitThreshold: exit,
                maxPositionDuration: duration,
                positionSize: size,
              },
              netPnlPercent: result.summary.netPnlPercent,
              sharpeRatio: result.summary.sharpeRatio,
              winRate: result.summary.winRate,
            });

            // Use Sharpe ratio as primary optimization metric
            if (!bestResult || result.summary.sharpeRatio > bestResult.summary.sharpeRatio) {
              bestResult = result;
              bestConfig = {
                entryThreshold: entry,
                exitThreshold: exit,
                maxPositionDuration: duration,
                positionSize: size,
              };
            }
          }
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(bestResult!, allResults);

    return {
      bestConfig,
      bestResult: bestResult!,
      allResults: allResults.sort((a, b) => b.sharpeRatio - a.sharpeRatio),
      recommendations,
    };
  }

  /**
   * Generate strategy recommendations based on backtest results
   */
  private generateRecommendations(
    bestResult: BacktestResult,
    allResults: OptimizationResult['allResults']
  ): string[] {
    const recommendations: string[] = [];

    // Analyze best result
    if (bestResult.summary.sharpeRatio > 1) {
      recommendations.push('Strategy shows positive risk-adjusted returns (Sharpe > 1)');
    } else if (bestResult.summary.sharpeRatio > 0) {
      recommendations.push('Strategy is marginally profitable but consider higher entry thresholds');
    } else {
      recommendations.push('Strategy underperforms - consider different parameters or markets');
    }

    if (bestResult.summary.winRate > 60) {
      recommendations.push(`High win rate (${bestResult.summary.winRate.toFixed(1)}%) indicates reliable entry signals`);
    }

    if (bestResult.summary.maxDrawdownPercent > 10) {
      recommendations.push(`Consider reducing position size - max drawdown of ${bestResult.summary.maxDrawdownPercent.toFixed(1)}% is significant`);
    }

    if (bestResult.summary.timeInMarket < 30) {
      recommendations.push('Low time in market - consider lowering entry threshold to capture more opportunities');
    }

    if (bestResult.summary.avgTradeDuration < 24) {
      recommendations.push('Short average trade duration - strategy is responsive to rate changes');
    }

    // Analyze parameter sensitivity
    const entryThresholds = Array.from(new Set(allResults.map(r => r.config.entryThreshold).filter((t): t is number => t !== undefined)));
    if (entryThresholds.length > 1) {
      const highEntry = allResults.filter(r => r.config.entryThreshold === Math.max(...entryThresholds as number[]));
      const lowEntry = allResults.filter(r => r.config.entryThreshold === Math.min(...entryThresholds as number[]));
      
      if (highEntry.length > 0 && lowEntry.length > 0) {
        const avgHighSharpe = highEntry.reduce((s, r) => s + r.sharpeRatio, 0) / highEntry.length;
        const avgLowSharpe = lowEntry.reduce((s, r) => s + r.sharpeRatio, 0) / lowEntry.length;
        
        if (avgHighSharpe > avgLowSharpe * 1.2) {
          recommendations.push('Higher entry thresholds significantly improve risk-adjusted returns');
        }
      }
    }

    return recommendations;
  }

  /**
   * Compare multiple symbols/exchanges
   */
  async compareMarkets(
    symbols: string[],
    exchanges: string[],
    baseConfig: Omit<BacktestConfig, 'symbol' | 'exchange'>
  ): Promise<{
    results: Map<string, BacktestResult>;
    ranking: { market: string; sharpeRatio: number; annualizedReturn: number }[];
    bestMarket: string;
  }> {
    const results = new Map<string, BacktestResult>();
    const ranking: { market: string; sharpeRatio: number; annualizedReturn: number }[] = [];

    for (const exchange of exchanges) {
      for (const symbol of symbols) {
        const config: BacktestConfig = {
          ...baseConfig,
          symbol,
          exchange,
        };

        const result = await this.runBacktest(config);
        const key = `${exchange}:${symbol}`;
        results.set(key, result);

        ranking.push({
          market: key,
          sharpeRatio: result.summary.sharpeRatio,
          annualizedReturn: result.summary.annualizedReturn,
        });
      }
    }

    ranking.sort((a, b) => b.sharpeRatio - a.sharpeRatio);

    return {
      results,
      ranking,
      bestMarket: ranking[0]?.market || '',
    };
  }
}

// Factory function
export function createBasisTradeBacktester(fundingCollector?: HistoricalFundingCollector): BasisTradeBacktester {
  return new BasisTradeBacktester(fundingCollector);
}

// Demo backtest configuration
export function createDemoBacktestConfig(): BacktestConfig {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  return {
    symbol: 'BTCUSDT',
    exchange: 'binance',
    startDate,
    endDate,
    initialCapital: 100000,
    positionSize: 50, // 50% of capital
    entryThreshold: 10, // 10% annualized
    exitThreshold: 5, // 5% annualized
    maxPositionDuration: 168, // 1 week
    tradingFees: 0.04, // 0.04% per trade
    slippage: 0.02, // 0.02% slippage
  };
}
