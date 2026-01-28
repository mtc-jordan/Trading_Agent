/**
 * Funding Rate Aggregator Service
 * 
 * Aggregates funding rates from multiple exchanges to find arbitrage
 * opportunities and optimal yield strategies.
 */

import { exchangeService, ExchangeId, FundingRate } from '../exchange/ExchangeService';

export interface AggregatedFundingRate {
  symbol: string;
  baseAsset: string;
  rates: Map<ExchangeId, FundingRate>;
  avgRate: number;
  avgRateAnnualized: number;
  maxRate: number;
  maxRateExchange: ExchangeId;
  minRate: number;
  minRateExchange: ExchangeId;
  spread: number;
  spreadAnnualized: number;
  timestamp: number;
}

export interface FundingArbitrage {
  symbol: string;
  longExchange: ExchangeId;
  shortExchange: ExchangeId;
  longRate: number;
  shortRate: number;
  netRate: number;
  netRateAnnualized: number;
  estimatedApr: number;
  riskScore: number; // 0-100, lower is better
  timestamp: number;
}

export interface YieldOpportunity {
  type: 'cash_and_carry' | 'funding_arb' | 'basis_trade';
  symbol: string;
  exchange: ExchangeId;
  direction: 'long' | 'short';
  fundingRate: number;
  estimatedApr: number;
  requiredCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
}

export interface FundingHistory {
  symbol: string;
  exchange: ExchangeId;
  rates: {
    rate: number;
    timestamp: number;
  }[];
  avgRate7d: number;
  avgRate30d: number;
  volatility: number;
}

export class FundingRateAggregator {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cacheTTL: number = 30000; // 30 seconds
  private updateInterval: NodeJS.Timeout | null = null;
  private latestRates: Map<string, AggregatedFundingRate> = new Map();

  constructor() {}

  /**
   * Start automatic rate updates
   */
  startAutoUpdate(intervalMs: number = 60000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.refreshAllRates();
    }, intervalMs);

    // Initial fetch
    this.refreshAllRates();
  }

  /**
   * Stop automatic updates
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Refresh all funding rates from all exchanges
   */
  async refreshAllRates(): Promise<void> {
    try {
      const allRates = await exchangeService.getAllAggregatedFundingRates();
      const aggregated = this.aggregateRates(allRates);
      
      for (const [symbol, rate] of Array.from(aggregated.entries())) {
        this.latestRates.set(symbol, rate);
      }

      console.log(`[FundingAggregator] Updated ${this.latestRates.size} symbols`);
    } catch (error) {
      console.error('[FundingAggregator] Error refreshing rates:', error);
    }
  }

  /**
   * Get cached data or fetch fresh
   */
  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, expiry: Date.now() + this.cacheTTL });
    return data;
  }

  /**
   * Aggregate funding rates from multiple exchanges
   */
  private aggregateRates(
    ratesByExchange: Map<ExchangeId, FundingRate[]>
  ): Map<string, AggregatedFundingRate> {
    const symbolMap = new Map<string, Map<ExchangeId, FundingRate>>();

    // Group rates by normalized symbol
    for (const [exchange, rates] of Array.from(ratesByExchange.entries())) {
      for (const rate of rates) {
        const normalizedSymbol = this.normalizeSymbol(rate.symbol);
        
        if (!symbolMap.has(normalizedSymbol)) {
          symbolMap.set(normalizedSymbol, new Map());
        }
        symbolMap.get(normalizedSymbol)!.set(exchange, rate);
      }
    }

    // Calculate aggregated metrics
    const result = new Map<string, AggregatedFundingRate>();

    for (const [symbol, exchangeRates] of Array.from(symbolMap.entries())) {
      if (exchangeRates.size < 1) continue;

      const rates = Array.from(exchangeRates.values());
      const avgRate = rates.reduce((sum: number, r: FundingRate) => sum + r.fundingRate, 0) / rates.length;
      
      let maxRate = -Infinity;
      let maxRateExchange: ExchangeId = 'binance';
      let minRate = Infinity;
      let minRateExchange: ExchangeId = 'binance';

      for (const [exchange, rate] of Array.from(exchangeRates.entries())) {
        if (rate.fundingRate > maxRate) {
          maxRate = rate.fundingRate;
          maxRateExchange = exchange;
        }
        if (rate.fundingRate < minRate) {
          minRate = rate.fundingRate;
          minRateExchange = exchange;
        }
      }

      const spread = maxRate - minRate;

      result.set(symbol, {
        symbol,
        baseAsset: symbol.replace(/USDT|USD|PERP|-USD/g, ''),
        rates: exchangeRates,
        avgRate,
        avgRateAnnualized: avgRate * 3 * 365 * 100, // Assuming 8-hour funding
        maxRate,
        maxRateExchange,
        minRate,
        minRateExchange,
        spread,
        spreadAnnualized: spread * 3 * 365 * 100,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Normalize symbol across exchanges
   */
  private normalizeSymbol(symbol: string): string {
    // Convert various formats to standard format
    return symbol
      .toUpperCase()
      .replace('-USD', 'USDT')
      .replace('PERP', '')
      .replace(/_/g, '');
  }

  /**
   * Get aggregated funding rates for all symbols
   */
  async getAggregatedRates(): Promise<AggregatedFundingRate[]> {
    return this.getCachedOrFetch('aggregated-rates', async () => {
      const allRates = await exchangeService.getAllAggregatedFundingRates();
      const aggregated = this.aggregateRates(allRates);
      return Array.from(aggregated.values());
    });
  }

  /**
   * Get funding rate for specific symbol
   */
  async getSymbolRate(symbol: string): Promise<AggregatedFundingRate | null> {
    const rates = await this.getAggregatedRates();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    return rates.find(r => this.normalizeSymbol(r.symbol) === normalizedSymbol) || null;
  }

  /**
   * Find funding rate arbitrage opportunities
   */
  async findArbitrageOpportunities(minSpreadApr: number = 5): Promise<FundingArbitrage[]> {
    return this.getCachedOrFetch(`arbitrage-${minSpreadApr}`, async () => {
      const rates = await this.getAggregatedRates();
      const opportunities: FundingArbitrage[] = [];

      for (const rate of rates) {
        if (rate.rates.size < 2) continue;

        const spreadApr = rate.spreadAnnualized;
        if (spreadApr < minSpreadApr) continue;

        // Calculate risk score based on liquidity and spread volatility
        const riskScore = this.calculateArbitrageRisk(rate);

        opportunities.push({
          symbol: rate.symbol,
          longExchange: rate.minRateExchange, // Go long where funding is lowest (you receive)
          shortExchange: rate.maxRateExchange, // Go short where funding is highest (you receive)
          longRate: rate.minRate,
          shortRate: rate.maxRate,
          netRate: rate.spread,
          netRateAnnualized: rate.spreadAnnualized,
          estimatedApr: spreadApr * 0.8, // Account for fees and slippage
          riskScore,
          timestamp: Date.now()
        });
      }

      // Sort by estimated APR descending
      return opportunities.sort((a, b) => b.estimatedApr - a.estimatedApr);
    });
  }

  /**
   * Calculate risk score for arbitrage opportunity
   */
  private calculateArbitrageRisk(rate: AggregatedFundingRate): number {
    let risk = 0;

    // Higher spread = potentially higher risk (could be due to liquidity issues)
    if (rate.spreadAnnualized > 50) risk += 20;
    else if (rate.spreadAnnualized > 30) risk += 10;

    // Fewer exchanges = higher risk
    if (rate.rates.size < 3) risk += 15;

    // dYdX has higher execution risk (on-chain)
    if (rate.maxRateExchange === 'dydx' || rate.minRateExchange === 'dydx') {
      risk += 10;
    }

    // Cap at 100
    return Math.min(risk, 100);
  }

  /**
   * Find yield opportunities (positive funding = short, negative = long)
   */
  async findYieldOpportunities(minApr: number = 8): Promise<YieldOpportunity[]> {
    return this.getCachedOrFetch(`yield-${minApr}`, async () => {
      const rates = await this.getAggregatedRates();
      const opportunities: YieldOpportunity[] = [];

      for (const rate of rates) {
        // High positive funding = short opportunity (you receive funding)
        if (rate.maxRate > 0 && rate.avgRateAnnualized > minApr) {
          const maxRateData = rate.rates.get(rate.maxRateExchange);
          
          opportunities.push({
            type: 'cash_and_carry',
            symbol: rate.symbol,
            exchange: rate.maxRateExchange,
            direction: 'short',
            fundingRate: rate.maxRate,
            estimatedApr: rate.maxRate * 3 * 365 * 100 * 0.9, // 10% buffer for fees
            requiredCapital: 10000, // Minimum suggested
            riskLevel: rate.maxRate > 0.001 ? 'low' : 'medium',
            description: `Short ${rate.baseAsset} perpetual on ${rate.maxRateExchange} while holding spot. Receive ${(rate.maxRate * 100).toFixed(4)}% funding every 8 hours.`,
            timestamp: Date.now()
          });
        }

        // High negative funding = long opportunity (you receive funding)
        if (rate.minRate < 0 && Math.abs(rate.minRate) * 3 * 365 * 100 > minApr) {
          opportunities.push({
            type: 'cash_and_carry',
            symbol: rate.symbol,
            exchange: rate.minRateExchange,
            direction: 'long',
            fundingRate: rate.minRate,
            estimatedApr: Math.abs(rate.minRate) * 3 * 365 * 100 * 0.9,
            requiredCapital: 10000,
            riskLevel: Math.abs(rate.minRate) > 0.001 ? 'low' : 'medium',
            description: `Long ${rate.baseAsset} perpetual on ${rate.minRateExchange} while shorting spot (if available). Receive ${(Math.abs(rate.minRate) * 100).toFixed(4)}% funding every 8 hours.`,
            timestamp: Date.now()
          });
        }

        // Cross-exchange arbitrage
        if (rate.spreadAnnualized > minApr && rate.rates.size >= 2) {
          opportunities.push({
            type: 'funding_arb',
            symbol: rate.symbol,
            exchange: rate.maxRateExchange,
            direction: 'short',
            fundingRate: rate.spread,
            estimatedApr: rate.spreadAnnualized * 0.8,
            requiredCapital: 20000, // Need capital on both exchanges
            riskLevel: 'medium',
            description: `Short on ${rate.maxRateExchange} (${(rate.maxRate * 100).toFixed(4)}%) + Long on ${rate.minRateExchange} (${(rate.minRate * 100).toFixed(4)}%). Net ${(rate.spread * 100).toFixed(4)}% per funding.`,
            timestamp: Date.now()
          });
        }
      }

      // Sort by estimated APR descending
      return opportunities.sort((a, b) => b.estimatedApr - a.estimatedApr);
    });
  }

  /**
   * Get top funding rate symbols by absolute rate
   */
  async getTopFundingRates(limit: number = 20): Promise<AggregatedFundingRate[]> {
    const rates = await this.getAggregatedRates();
    
    return rates
      .sort((a, b) => Math.abs(b.avgRate) - Math.abs(a.avgRate))
      .slice(0, limit);
  }

  /**
   * Get symbols with extreme funding (potential reversal signals)
   */
  async getExtremeFunding(threshold: number = 0.001): Promise<{
    extremePositive: AggregatedFundingRate[];
    extremeNegative: AggregatedFundingRate[];
  }> {
    const rates = await this.getAggregatedRates();
    
    return {
      extremePositive: rates.filter(r => r.avgRate > threshold)
        .sort((a, b) => b.avgRate - a.avgRate),
      extremeNegative: rates.filter(r => r.avgRate < -threshold)
        .sort((a, b) => a.avgRate - b.avgRate)
    };
  }

  /**
   * Calculate funding rate statistics
   */
  async getFundingStats(): Promise<{
    totalSymbols: number;
    avgFundingRate: number;
    positiveCount: number;
    negativeCount: number;
    highestRate: { symbol: string; rate: number; exchange: ExchangeId };
    lowestRate: { symbol: string; rate: number; exchange: ExchangeId };
    totalArbitrageOpportunities: number;
    totalYieldOpportunities: number;
  }> {
    const rates = await this.getAggregatedRates();
    const arbitrage = await this.findArbitrageOpportunities(5);
    const yields = await this.findYieldOpportunities(8);

    let highestRate = { symbol: '', rate: -Infinity, exchange: 'binance' as ExchangeId };
    let lowestRate = { symbol: '', rate: Infinity, exchange: 'binance' as ExchangeId };
    let totalRate = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    for (const rate of rates) {
      totalRate += rate.avgRate;
      
      if (rate.avgRate > 0) positiveCount++;
      else if (rate.avgRate < 0) negativeCount++;

      if (rate.maxRate > highestRate.rate) {
        highestRate = { symbol: rate.symbol, rate: rate.maxRate, exchange: rate.maxRateExchange };
      }
      if (rate.minRate < lowestRate.rate) {
        lowestRate = { symbol: rate.symbol, rate: rate.minRate, exchange: rate.minRateExchange };
      }
    }

    return {
      totalSymbols: rates.length,
      avgFundingRate: rates.length > 0 ? totalRate / rates.length : 0,
      positiveCount,
      negativeCount,
      highestRate,
      lowestRate,
      totalArbitrageOpportunities: arbitrage.length,
      totalYieldOpportunities: yields.length
    };
  }

  /**
   * Get funding rate heatmap data
   */
  async getFundingHeatmap(): Promise<{
    symbols: string[];
    exchanges: ExchangeId[];
    data: { symbol: string; exchange: ExchangeId; rate: number }[];
  }> {
    const rates = await this.getAggregatedRates();
    const symbols = new Set<string>();
    const exchanges = new Set<ExchangeId>();
    const data: { symbol: string; exchange: ExchangeId; rate: number }[] = [];

    for (const rate of rates) {
      symbols.add(rate.symbol);
      
      for (const [exchange, fundingRate] of Array.from(rate.rates.entries())) {
        exchanges.add(exchange);
        data.push({
          symbol: rate.symbol,
          exchange,
          rate: fundingRate.fundingRate
        });
      }
    }

    return {
      symbols: Array.from(symbols),
      exchanges: Array.from(exchanges),
      data
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const fundingRateAggregator = new FundingRateAggregator();
