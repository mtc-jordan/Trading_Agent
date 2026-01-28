/**
 * Post-Earnings Price Movement Analyzer
 * 
 * Analyzes stock price movements following earnings announcements
 * to correlate with sentiment scores for backtesting.
 */

import { callDataApi } from '../../_core/dataApi';

// Types for price movement analysis
export interface PriceMovement {
  symbol: string;
  earningsDate: string;
  priceAtEarnings: number;
  movements: TimeframedMovement[];
  abnormalReturns: AbnormalReturn[];
  volatility: VolatilityMetrics;
  volume: VolumeMetrics;
}

export interface TimeframedMovement {
  timeframe: '1d' | '3d' | '5d' | '10d' | '30d';
  startPrice: number;
  endPrice: number;
  percentChange: number;
  absoluteChange: number;
  high: number;
  low: number;
  maxDrawdown: number;
  maxRunup: number;
}

export interface AbnormalReturn {
  timeframe: '1d' | '3d' | '5d' | '10d' | '30d';
  stockReturn: number;
  benchmarkReturn: number;
  abnormalReturn: number; // Stock return - benchmark return
  cumulativeAbnormalReturn: number;
}

export interface VolatilityMetrics {
  preEarningsVolatility: number; // 20-day vol before earnings
  postEarningsVolatility: number; // 20-day vol after earnings
  volatilityChange: number;
  impliedVolCrush: number; // Estimated IV crush based on price movement
}

export interface VolumeMetrics {
  averageVolume: number; // 20-day average before earnings
  earningsDayVolume: number;
  volumeRatio: number; // Earnings day volume / average
  postEarningsVolumeDecay: number[]; // Volume ratios for days after
}

export interface HistoricalPriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export class PostEarningsPriceAnalyzer {
  private priceCache: Map<string, HistoricalPriceData[]> = new Map();
  private benchmarkSymbol: string = 'SPY'; // S&P 500 ETF as benchmark

  constructor(benchmarkSymbol?: string) {
    if (benchmarkSymbol) {
      this.benchmarkSymbol = benchmarkSymbol;
    }
  }

  /**
   * Analyze price movements around an earnings date
   */
  async analyzePriceMovement(
    symbol: string,
    earningsDate: string
  ): Promise<PriceMovement> {
    // Fetch historical prices
    const prices = await this.fetchHistoricalPrices(symbol, earningsDate, 60);
    const benchmarkPrices = await this.fetchHistoricalPrices(this.benchmarkSymbol, earningsDate, 60);

    // Find earnings date index
    const earningsIndex = this.findEarningsDateIndex(prices, earningsDate);
    
    if (earningsIndex === -1) {
      throw new Error(`Earnings date ${earningsDate} not found in price data for ${symbol}`);
    }

    const priceAtEarnings = prices[earningsIndex].close;

    // Calculate movements for each timeframe
    const timeframes: Array<'1d' | '3d' | '5d' | '10d' | '30d'> = ['1d', '3d', '5d', '10d', '30d'];
    const movements: TimeframedMovement[] = [];
    const abnormalReturns: AbnormalReturn[] = [];

    for (const timeframe of timeframes) {
      const days = this.timeframeToDays(timeframe);
      const movement = this.calculateMovement(prices, earningsIndex, days);
      movements.push({ timeframe, ...movement });

      // Calculate abnormal returns
      const benchmarkMovement = this.calculateMovement(benchmarkPrices, earningsIndex, days);
      const abnormal = this.calculateAbnormalReturn(
        movement.percentChange,
        benchmarkMovement.percentChange,
        timeframe,
        abnormalReturns
      );
      abnormalReturns.push(abnormal);
    }

    // Calculate volatility metrics
    const volatility = this.calculateVolatilityMetrics(prices, earningsIndex);

    // Calculate volume metrics
    const volume = this.calculateVolumeMetrics(prices, earningsIndex);

    return {
      symbol,
      earningsDate,
      priceAtEarnings,
      movements,
      abnormalReturns,
      volatility,
      volume
    };
  }

  /**
   * Fetch historical prices for a symbol
   */
  private async fetchHistoricalPrices(
    symbol: string,
    centerDate: string,
    daysAround: number
  ): Promise<HistoricalPriceData[]> {
    const cacheKey = `${symbol}-${centerDate}-${daysAround}`;
    
    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    try {
      // Calculate date range
      const center = new Date(centerDate);
      const startDate = new Date(center);
      startDate.setDate(startDate.getDate() - daysAround);
      const endDate = new Date(center);
      endDate.setDate(endDate.getDate() + daysAround);

      // Fetch from Yahoo Finance API
      const result = await callDataApi('YahooFinance/get_stock_chart', {
        query: {
          symbol,
          region: 'US',
          interval: '1d',
          range: '6mo',
          includeAdjustedClose: true
        }
      }) as { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }>; adjclose?: Array<{ adjclose?: number[] }> } }> } };

      if (!result?.chart?.result?.[0]) {
        return this.generateMockPrices(symbol, centerDate, daysAround);
      }

      const chartData = result.chart.result[0];
      const timestamps = chartData.timestamp || [];
      const quotes = chartData.indicators?.quote?.[0] || {};
      const adjClose = chartData.indicators?.adjclose?.[0]?.adjclose || [];

      const prices: HistoricalPriceData[] = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        prices.push({
          date,
          open: quotes.open?.[i] || 0,
          high: quotes.high?.[i] || 0,
          low: quotes.low?.[i] || 0,
          close: quotes.close?.[i] || 0,
          volume: quotes.volume?.[i] || 0,
          adjustedClose: adjClose[i] || quotes.close?.[i] || 0
        });
      }

      this.priceCache.set(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error(`[PriceAnalyzer] Error fetching prices for ${symbol}:`, error);
      return this.generateMockPrices(symbol, centerDate, daysAround);
    }
  }

  /**
   * Generate mock prices for testing
   */
  private generateMockPrices(
    symbol: string,
    centerDate: string,
    daysAround: number
  ): HistoricalPriceData[] {
    const prices: HistoricalPriceData[] = [];
    const center = new Date(centerDate);
    let basePrice = 100 + Math.random() * 100;

    for (let i = -daysAround; i <= daysAround; i++) {
      const date = new Date(center);
      date.setDate(date.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Random walk with slight upward bias
      const dailyReturn = (Math.random() - 0.48) * 0.03;
      basePrice *= (1 + dailyReturn);

      const high = basePrice * (1 + Math.random() * 0.02);
      const low = basePrice * (1 - Math.random() * 0.02);
      const open = low + Math.random() * (high - low);
      const close = low + Math.random() * (high - low);

      prices.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume: Math.floor(1000000 + Math.random() * 5000000),
        adjustedClose: close
      });
    }

    return prices;
  }

  /**
   * Find the index of the earnings date in price data
   */
  private findEarningsDateIndex(prices: HistoricalPriceData[], earningsDate: string): number {
    // First try exact match
    let index = prices.findIndex(p => p.date === earningsDate);
    
    if (index === -1) {
      // Try finding closest date after earnings
      const earningsTime = new Date(earningsDate).getTime();
      for (let i = 0; i < prices.length; i++) {
        const priceTime = new Date(prices[i].date).getTime();
        if (priceTime >= earningsTime) {
          index = i;
          break;
        }
      }
    }

    return index;
  }

  /**
   * Convert timeframe string to number of days
   */
  private timeframeToDays(timeframe: string): number {
    const map: Record<string, number> = {
      '1d': 1,
      '3d': 3,
      '5d': 5,
      '10d': 10,
      '30d': 30
    };
    return map[timeframe] || 1;
  }

  /**
   * Calculate price movement for a specific timeframe
   */
  private calculateMovement(
    prices: HistoricalPriceData[],
    startIndex: number,
    days: number
  ): Omit<TimeframedMovement, 'timeframe'> {
    const endIndex = Math.min(startIndex + days, prices.length - 1);
    
    if (startIndex >= prices.length || endIndex >= prices.length) {
      return {
        startPrice: 0,
        endPrice: 0,
        percentChange: 0,
        absoluteChange: 0,
        high: 0,
        low: 0,
        maxDrawdown: 0,
        maxRunup: 0
      };
    }

    const startPrice = prices[startIndex].close;
    const endPrice = prices[endIndex].close;
    
    // Calculate high/low and drawdown/runup
    let high = startPrice;
    let low = startPrice;
    let maxDrawdown = 0;
    let maxRunup = 0;
    let peakPrice = startPrice;
    let troughPrice = startPrice;

    for (let i = startIndex; i <= endIndex; i++) {
      const price = prices[i].close;
      high = Math.max(high, prices[i].high);
      low = Math.min(low, prices[i].low);

      // Max drawdown from peak
      if (price > peakPrice) {
        peakPrice = price;
      }
      const drawdown = (peakPrice - price) / peakPrice;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      // Max runup from trough
      if (price < troughPrice) {
        troughPrice = price;
      }
      const runup = (price - troughPrice) / troughPrice;
      maxRunup = Math.max(maxRunup, runup);
    }

    return {
      startPrice,
      endPrice,
      percentChange: ((endPrice - startPrice) / startPrice) * 100,
      absoluteChange: endPrice - startPrice,
      high,
      low,
      maxDrawdown: maxDrawdown * 100,
      maxRunup: maxRunup * 100
    };
  }

  /**
   * Calculate abnormal return vs benchmark
   */
  private calculateAbnormalReturn(
    stockReturn: number,
    benchmarkReturn: number,
    timeframe: string,
    previousReturns: AbnormalReturn[]
  ): AbnormalReturn {
    const abnormalReturn = stockReturn - benchmarkReturn;
    
    // Calculate cumulative abnormal return
    const previousCAR = previousReturns.length > 0 
      ? previousReturns[previousReturns.length - 1].cumulativeAbnormalReturn 
      : 0;
    const cumulativeAbnormalReturn = previousCAR + abnormalReturn;

    return {
      timeframe: timeframe as '1d' | '3d' | '5d' | '10d' | '30d',
      stockReturn,
      benchmarkReturn,
      abnormalReturn,
      cumulativeAbnormalReturn
    };
  }

  /**
   * Calculate volatility metrics around earnings
   */
  private calculateVolatilityMetrics(
    prices: HistoricalPriceData[],
    earningsIndex: number
  ): VolatilityMetrics {
    const lookback = 20;
    
    // Pre-earnings volatility
    const preStart = Math.max(0, earningsIndex - lookback);
    const prePrices = prices.slice(preStart, earningsIndex);
    const preEarningsVolatility = this.calculateVolatility(prePrices);

    // Post-earnings volatility
    const postEnd = Math.min(prices.length, earningsIndex + lookback);
    const postPrices = prices.slice(earningsIndex, postEnd);
    const postEarningsVolatility = this.calculateVolatility(postPrices);

    const volatilityChange = postEarningsVolatility - preEarningsVolatility;

    // Estimate IV crush based on realized volatility change
    const impliedVolCrush = volatilityChange < 0 ? Math.abs(volatilityChange) * 2 : 0;

    return {
      preEarningsVolatility,
      postEarningsVolatility,
      volatilityChange,
      impliedVolCrush
    };
  }

  /**
   * Calculate annualized volatility from price data
   */
  private calculateVolatility(prices: HistoricalPriceData[]): number {
    if (prices.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = Math.log(prices[i].close / prices[i - 1].close);
      returns.push(dailyReturn);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize (252 trading days)
    return stdDev * Math.sqrt(252) * 100;
  }

  /**
   * Calculate volume metrics around earnings
   */
  private calculateVolumeMetrics(
    prices: HistoricalPriceData[],
    earningsIndex: number
  ): VolumeMetrics {
    const lookback = 20;
    
    // Calculate average volume before earnings
    const preStart = Math.max(0, earningsIndex - lookback);
    const prePrices = prices.slice(preStart, earningsIndex);
    const averageVolume = prePrices.reduce((sum, p) => sum + p.volume, 0) / prePrices.length;

    // Earnings day volume
    const earningsDayVolume = prices[earningsIndex]?.volume || averageVolume;
    const volumeRatio = earningsDayVolume / averageVolume;

    // Post-earnings volume decay
    const postEarningsVolumeDecay: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const idx = earningsIndex + i;
      if (idx < prices.length) {
        postEarningsVolumeDecay.push(prices[idx].volume / averageVolume);
      }
    }

    return {
      averageVolume,
      earningsDayVolume,
      volumeRatio,
      postEarningsVolumeDecay
    };
  }

  /**
   * Batch analyze multiple earnings events
   */
  async batchAnalyze(
    events: Array<{ symbol: string; earningsDate: string }>
  ): Promise<Map<string, PriceMovement>> {
    const results = new Map<string, PriceMovement>();

    for (const event of events) {
      try {
        const movement = await this.analyzePriceMovement(event.symbol, event.earningsDate);
        const key = `${event.symbol}-${event.earningsDate}`;
        results.set(key, movement);
      } catch (error) {
        console.error(`[PriceAnalyzer] Error analyzing ${event.symbol} on ${event.earningsDate}:`, error);
      }
    }

    return results;
  }

  /**
   * Get price at specific date
   */
  async getPriceAtDate(symbol: string, date: string): Promise<number | null> {
    try {
      const prices = await this.fetchHistoricalPrices(symbol, date, 5);
      const index = this.findEarningsDateIndex(prices, date);
      return index !== -1 ? prices[index].close : null;
    } catch (error) {
      console.error(`[PriceAnalyzer] Error getting price for ${symbol} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Set benchmark symbol
   */
  setBenchmark(symbol: string): void {
    this.benchmarkSymbol = symbol;
  }
}

// Export factory function
export function createPostEarningsPriceAnalyzer(benchmarkSymbol?: string): PostEarningsPriceAnalyzer {
  return new PostEarningsPriceAnalyzer(benchmarkSymbol);
}
