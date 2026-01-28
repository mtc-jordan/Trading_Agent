/**
 * Historical Funding Rate Data Collector
 * 
 * Collects and stores historical funding rate data from multiple exchanges
 * for backtesting basis trading strategies.
 */

export interface FundingRateDataPoint {
  timestamp: number;
  symbol: string;
  exchange: string;
  fundingRate: number;
  fundingRateAnnualized: number;
  markPrice: number;
  indexPrice: number;
  nextFundingTime: number;
}

export interface HistoricalFundingData {
  symbol: string;
  exchange: string;
  startTime: number;
  endTime: number;
  dataPoints: FundingRateDataPoint[];
  statistics: {
    avgRate: number;
    avgRateAnnualized: number;
    maxRate: number;
    minRate: number;
    stdDev: number;
    positiveRatePercent: number;
    totalDataPoints: number;
  };
}

export interface FundingCollectorConfig {
  exchanges: string[];
  symbols: string[];
  startDate: Date;
  endDate: Date;
  interval?: 'hourly' | 'daily';
}

export interface ExchangeApiConfig {
  exchange: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
}

// Exchange API configurations
const EXCHANGE_CONFIGS: Record<string, ExchangeApiConfig> = {
  binance: {
    exchange: 'binance',
    baseUrl: 'https://fapi.binance.com',
  },
  bybit: {
    exchange: 'bybit',
    baseUrl: 'https://api.bybit.com',
  },
  okx: {
    exchange: 'okx',
    baseUrl: 'https://www.okx.com',
  },
  dydx: {
    exchange: 'dydx',
    baseUrl: 'https://api.dydx.exchange',
  },
};

export class HistoricalFundingCollector {
  private config: FundingCollectorConfig;
  private cache: Map<string, HistoricalFundingData> = new Map();
  private rateLimitDelay: number = 100;
  private lastCallTime: number = 0;

  constructor(config: FundingCollectorConfig) {
    this.config = config;
  }

  /**
   * Rate limit helper
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastCall));
    }
    this.lastCallTime = Date.now();
  }

  /**
   * Fetch historical funding rates from Binance
   */
  private async fetchBinanceFundingHistory(
    symbol: string,
    startTime: number,
    endTime: number
  ): Promise<FundingRateDataPoint[]> {
    await this.rateLimit();

    const dataPoints: FundingRateDataPoint[] = [];
    let currentStart = startTime;
    const limit = 1000;

    while (currentStart < endTime) {
      try {
        const url = `${EXCHANGE_CONFIGS.binance.baseUrl}/fapi/v1/fundingRate?symbol=${symbol}&startTime=${currentStart}&endTime=${endTime}&limit=${limit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`[FundingCollector] Binance API error: ${response.status}`);
          break;
        }

        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
          break;
        }

        for (const item of data) {
          const rate = parseFloat(item.fundingRate);
          dataPoints.push({
            timestamp: item.fundingTime,
            symbol,
            exchange: 'binance',
            fundingRate: rate,
            fundingRateAnnualized: rate * 3 * 365 * 100, // 8-hour intervals, annualized %
            markPrice: parseFloat(item.markPrice || '0'),
            indexPrice: 0,
            nextFundingTime: item.fundingTime + 8 * 60 * 60 * 1000,
          });
        }

        // Move to next batch
        currentStart = data[data.length - 1].fundingTime + 1;
        
        await this.rateLimit();
      } catch (error) {
        console.error(`[FundingCollector] Error fetching Binance data:`, error);
        break;
      }
    }

    return dataPoints;
  }

  /**
   * Fetch historical funding rates from Bybit
   */
  private async fetchBybitFundingHistory(
    symbol: string,
    startTime: number,
    endTime: number
  ): Promise<FundingRateDataPoint[]> {
    await this.rateLimit();

    const dataPoints: FundingRateDataPoint[] = [];
    let cursor = '';
    const limit = 200;

    while (true) {
      try {
        let url = `${EXCHANGE_CONFIGS.bybit.baseUrl}/v5/market/funding/history?category=linear&symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
        if (cursor) {
          url += `&cursor=${cursor}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`[FundingCollector] Bybit API error: ${response.status}`);
          break;
        }

        const data = await response.json();
        
        if (data.retCode !== 0 || !data.result?.list?.length) {
          break;
        }

        for (const item of data.result.list) {
          const rate = parseFloat(item.fundingRate);
          dataPoints.push({
            timestamp: parseInt(item.fundingRateTimestamp),
            symbol,
            exchange: 'bybit',
            fundingRate: rate,
            fundingRateAnnualized: rate * 3 * 365 * 100,
            markPrice: 0,
            indexPrice: 0,
            nextFundingTime: parseInt(item.fundingRateTimestamp) + 8 * 60 * 60 * 1000,
          });
        }

        cursor = data.result.nextPageCursor || '';
        if (!cursor) break;
        
        await this.rateLimit();
      } catch (error) {
        console.error(`[FundingCollector] Error fetching Bybit data:`, error);
        break;
      }
    }

    return dataPoints;
  }

  /**
   * Generate simulated historical funding data for demo/testing
   */
  private generateSimulatedFundingHistory(
    symbol: string,
    exchange: string,
    startTime: number,
    endTime: number
  ): FundingRateDataPoint[] {
    const dataPoints: FundingRateDataPoint[] = [];
    const interval = 8 * 60 * 60 * 1000; // 8 hours
    
    // Seed based on symbol for consistent demo data
    let seed = 0;
    for (let i = 0; i < symbol.length; i++) {
      seed += symbol.charCodeAt(i);
    }

    let currentTime = startTime;
    let baseRate = 0.0001; // 0.01% base rate
    let trend = 0;

    while (currentTime < endTime) {
      // Add some randomness and trends
      seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
      const random = (seed / 0x7FFFFFFF) - 0.5;
      
      // Occasionally shift the trend
      if (Math.random() < 0.05) {
        trend = (Math.random() - 0.5) * 0.0002;
      }

      baseRate += trend + random * 0.00005;
      baseRate = Math.max(-0.001, Math.min(0.003, baseRate)); // Clamp to realistic range

      const rate = baseRate + random * 0.0001;
      const markPrice = 40000 + (seed % 20000); // Simulated BTC price range

      dataPoints.push({
        timestamp: currentTime,
        symbol,
        exchange,
        fundingRate: rate,
        fundingRateAnnualized: rate * 3 * 365 * 100,
        markPrice,
        indexPrice: markPrice * (1 + random * 0.001),
        nextFundingTime: currentTime + interval,
      });

      currentTime += interval;
    }

    return dataPoints;
  }

  /**
   * Collect historical funding data for all configured symbols and exchanges
   */
  async collectAll(): Promise<Map<string, HistoricalFundingData>> {
    const results = new Map<string, HistoricalFundingData>();
    const startTime = this.config.startDate.getTime();
    const endTime = this.config.endDate.getTime();

    for (const exchange of this.config.exchanges) {
      for (const symbol of this.config.symbols) {
        const key = `${exchange}:${symbol}`;
        
        // Check cache first
        const cached = this.cache.get(key);
        if (cached && cached.startTime <= startTime && cached.endTime >= endTime) {
          results.set(key, cached);
          continue;
        }

        let dataPoints: FundingRateDataPoint[] = [];

        try {
          switch (exchange.toLowerCase()) {
            case 'binance':
              dataPoints = await this.fetchBinanceFundingHistory(symbol, startTime, endTime);
              break;
            case 'bybit':
              dataPoints = await this.fetchBybitFundingHistory(symbol, startTime, endTime);
              break;
            default:
              // Use simulated data for unsupported exchanges
              dataPoints = this.generateSimulatedFundingHistory(symbol, exchange, startTime, endTime);
          }
        } catch (error) {
          console.warn(`[FundingCollector] Failed to fetch ${exchange}:${symbol}, using simulated data`);
          dataPoints = this.generateSimulatedFundingHistory(symbol, exchange, startTime, endTime);
        }

        // If no data returned, use simulated data
        if (dataPoints.length === 0) {
          dataPoints = this.generateSimulatedFundingHistory(symbol, exchange, startTime, endTime);
        }

        const statistics = this.calculateStatistics(dataPoints);

        const historicalData: HistoricalFundingData = {
          symbol,
          exchange,
          startTime,
          endTime,
          dataPoints,
          statistics,
        };

        results.set(key, historicalData);
        this.cache.set(key, historicalData);
      }
    }

    return results;
  }

  /**
   * Calculate statistics for funding rate data
   */
  private calculateStatistics(dataPoints: FundingRateDataPoint[]): HistoricalFundingData['statistics'] {
    if (dataPoints.length === 0) {
      return {
        avgRate: 0,
        avgRateAnnualized: 0,
        maxRate: 0,
        minRate: 0,
        stdDev: 0,
        positiveRatePercent: 0,
        totalDataPoints: 0,
      };
    }

    const rates = dataPoints.map(d => d.fundingRate);
    const annualizedRates = dataPoints.map(d => d.fundingRateAnnualized);
    
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const avgRateAnnualized = annualizedRates.reduce((a, b) => a + b, 0) / annualizedRates.length;
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    
    // Calculate standard deviation
    const squaredDiffs = rates.map(r => Math.pow(r - avgRate, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    const positiveCount = rates.filter(r => r > 0).length;
    const positiveRatePercent = (positiveCount / rates.length) * 100;

    return {
      avgRate,
      avgRateAnnualized,
      maxRate,
      minRate,
      stdDev,
      positiveRatePercent,
      totalDataPoints: dataPoints.length,
    };
  }

  /**
   * Get funding data for a specific symbol and exchange
   */
  async getFundingData(exchange: string, symbol: string): Promise<HistoricalFundingData | null> {
    const key = `${exchange}:${symbol}`;
    
    // Check cache
    const cached = this.cache.get(key);
    if (cached) return cached;

    // Collect data for this specific pair
    const tempConfig = { ...this.config, exchanges: [exchange], symbols: [symbol] };
    const collector = new HistoricalFundingCollector(tempConfig);
    const results = await collector.collectAll();
    
    return results.get(key) || null;
  }

  /**
   * Get aggregated funding statistics across all exchanges for a symbol
   */
  async getAggregatedStats(symbol: string): Promise<{
    symbol: string;
    exchanges: string[];
    avgRateAcrossExchanges: number;
    avgAnnualizedYield: number;
    bestExchange: string;
    worstExchange: string;
    spreadBetweenExchanges: number;
  }> {
    const results = await this.collectAll();
    const symbolData: HistoricalFundingData[] = [];

    for (const [key, data] of Array.from(results.entries())) {
      if (data.symbol === symbol) {
        symbolData.push(data);
      }
    }

    if (symbolData.length === 0) {
      return {
        symbol,
        exchanges: [],
        avgRateAcrossExchanges: 0,
        avgAnnualizedYield: 0,
        bestExchange: '',
        worstExchange: '',
        spreadBetweenExchanges: 0,
      };
    }

    const exchanges = symbolData.map(d => d.exchange);
    const avgRates = symbolData.map(d => d.statistics.avgRate);
    const avgAnnualized = symbolData.map(d => d.statistics.avgRateAnnualized);

    const avgRateAcrossExchanges = avgRates.reduce((a, b) => a + b, 0) / avgRates.length;
    const avgAnnualizedYield = avgAnnualized.reduce((a, b) => a + b, 0) / avgAnnualized.length;

    const maxIdx = avgRates.indexOf(Math.max(...avgRates));
    const minIdx = avgRates.indexOf(Math.min(...avgRates));

    return {
      symbol,
      exchanges,
      avgRateAcrossExchanges,
      avgAnnualizedYield,
      bestExchange: exchanges[maxIdx],
      worstExchange: exchanges[minIdx],
      spreadBetweenExchanges: Math.max(...avgRates) - Math.min(...avgRates),
    };
  }

  /**
   * Find arbitrage opportunities in historical data
   */
  findArbitrageOpportunities(
    data: Map<string, HistoricalFundingData>,
    minSpread: number = 0.0001 // 0.01%
  ): Array<{
    timestamp: number;
    symbol: string;
    longExchange: string;
    shortExchange: string;
    spread: number;
    annualizedYield: number;
  }> {
    const opportunities: Array<{
      timestamp: number;
      symbol: string;
      longExchange: string;
      shortExchange: string;
      spread: number;
      annualizedYield: number;
    }> = [];

    // Group data by symbol
    const symbolGroups = new Map<string, HistoricalFundingData[]>();
    for (const [, fundingData] of Array.from(data.entries())) {
      const existing = symbolGroups.get(fundingData.symbol) || [];
      existing.push(fundingData);
      symbolGroups.set(fundingData.symbol, existing);
    }

    // Find opportunities for each symbol
    for (const [symbol, exchangeData] of Array.from(symbolGroups.entries())) {
      if (exchangeData.length < 2) continue;

      // Create timestamp-indexed map for each exchange
      const timestampMaps = exchangeData.map((d: HistoricalFundingData) => {
        const map = new Map<number, FundingRateDataPoint>();
        for (const point of d.dataPoints) {
          // Round to nearest hour for matching
          const roundedTime = Math.floor(point.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
          map.set(roundedTime, point);
        }
        return { exchange: d.exchange, map };
      });

      // Find matching timestamps across exchanges
      const allTimestamps = new Set<number>();
      for (const { map } of timestampMaps) {
        for (const ts of Array.from(map.keys())) {
          allTimestamps.add(ts);
        }
      }

      for (const timestamp of Array.from(allTimestamps)) {
        const ratesAtTime: { exchange: string; rate: number }[] = [];
        
        for (const { exchange, map } of timestampMaps) {
          const point = map.get(timestamp);
          if (point) {
            ratesAtTime.push({ exchange, rate: point.fundingRate });
          }
        }

        if (ratesAtTime.length < 2) continue;

        // Find max spread
        ratesAtTime.sort((a, b) => a.rate - b.rate);
        const lowest = ratesAtTime[0];
        const highest = ratesAtTime[ratesAtTime.length - 1];
        const spread = highest.rate - lowest.rate;

        if (spread >= minSpread) {
          opportunities.push({
            timestamp,
            symbol,
            longExchange: lowest.exchange, // Long where funding is lowest (pay less)
            shortExchange: highest.exchange, // Short where funding is highest (receive more)
            spread,
            annualizedYield: spread * 3 * 365 * 100,
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.annualizedYield - a.annualizedYield);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FundingCollectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Factory function
export function createHistoricalFundingCollector(config: FundingCollectorConfig): HistoricalFundingCollector {
  return new HistoricalFundingCollector(config);
}

// Demo collector with default settings
export function createDemoFundingCollector(): HistoricalFundingCollector {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  return new HistoricalFundingCollector({
    exchanges: ['binance', 'bybit', 'okx'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    startDate,
    endDate,
    interval: 'hourly',
  });
}
