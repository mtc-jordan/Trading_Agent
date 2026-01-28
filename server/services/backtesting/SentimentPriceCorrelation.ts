/**
 * Sentiment-Price Correlation Engine
 * 
 * Calculates statistical correlations between earnings sentiment scores
 * and post-earnings stock price movements.
 */

import { 
  HistoricalSentimentData, 
  SentimentScore,
  ManagementTone,
  GuidanceSignal 
} from './HistoricalSentimentCollector';
import { PriceMovement, TimeframedMovement, AbnormalReturn } from './PostEarningsPriceAnalyzer';

// Types for correlation analysis
export interface CorrelationResult {
  factor: string;
  timeframe: string;
  correlation: number; // Pearson correlation coefficient
  pValue: number;
  confidenceInterval: [number, number];
  sampleSize: number;
  rSquared: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

export interface CorrelationMatrix {
  factors: string[];
  timeframes: string[];
  correlations: number[][];
  pValues: number[][];
}

export interface FactorDecomposition {
  factor: string;
  contribution: number; // Percentage contribution to overall correlation
  weight: number; // Optimal weight for prediction
  significance: number;
}

export interface SectorAdjustedCorrelation {
  sector: string;
  baseCorrelation: number;
  sectorAdjustedCorrelation: number;
  sectorEffect: number;
}

export interface MarketCapAdjustedCorrelation {
  marketCapBucket: 'mega' | 'large' | 'mid' | 'small' | 'micro';
  baseCorrelation: number;
  adjustedCorrelation: number;
  sizeEffect: number;
}

export interface DataPoint {
  symbol: string;
  earningsDate: string;
  sentimentScore: number;
  priceMovement: number;
  sector?: string;
  marketCap?: number;
}

export class SentimentPriceCorrelation {
  private dataPoints: DataPoint[] = [];
  private correlationCache: Map<string, CorrelationResult> = new Map();

  /**
   * Add data points for correlation analysis
   */
  addDataPoints(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>
  ): void {
    for (const sentiment of sentimentData) {
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        // Add data points for each timeframe
        for (const movement of priceMovement.movements) {
          this.dataPoints.push({
            symbol: sentiment.symbol,
            earningsDate: sentiment.earningsDate,
            sentimentScore: sentiment.sentiment.overall,
            priceMovement: movement.percentChange
          });
        }
      }
    }
  }

  /**
   * Calculate correlation between sentiment and price movement
   */
  calculateCorrelation(
    sentimentScores: number[],
    priceMovements: number[]
  ): CorrelationResult {
    if (sentimentScores.length !== priceMovements.length || sentimentScores.length < 3) {
      return this.getEmptyCorrelationResult('overall', 'all');
    }

    const n = sentimentScores.length;
    
    // Calculate means
    const meanSentiment = sentimentScores.reduce((a, b) => a + b, 0) / n;
    const meanPrice = priceMovements.reduce((a, b) => a + b, 0) / n;

    // Calculate Pearson correlation
    let numerator = 0;
    let denomSentiment = 0;
    let denomPrice = 0;

    for (let i = 0; i < n; i++) {
      const sentimentDiff = sentimentScores[i] - meanSentiment;
      const priceDiff = priceMovements[i] - meanPrice;
      numerator += sentimentDiff * priceDiff;
      denomSentiment += sentimentDiff * sentimentDiff;
      denomPrice += priceDiff * priceDiff;
    }

    const correlation = numerator / (Math.sqrt(denomSentiment) * Math.sqrt(denomPrice));
    const rSquared = correlation * correlation;

    // Calculate p-value using t-distribution approximation
    const tStat = correlation * Math.sqrt((n - 2) / (1 - rSquared));
    const pValue = this.calculatePValue(tStat, n - 2);

    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(correlation, n);

    // Determine significance level
    const significance = this.determineSignificance(pValue, Math.abs(correlation));

    return {
      factor: 'overall',
      timeframe: 'all',
      correlation: isNaN(correlation) ? 0 : correlation,
      pValue,
      confidenceInterval,
      sampleSize: n,
      rSquared: isNaN(rSquared) ? 0 : rSquared,
      significance
    };
  }

  /**
   * Calculate correlation matrix for all factors and timeframes
   */
  calculateCorrelationMatrix(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>
  ): CorrelationMatrix {
    const factors = [
      'overall',
      'managementOptimism',
      'managementConfidence',
      'analystSatisfaction',
      'guidanceStrength'
    ];
    
    const timeframes = ['1d', '3d', '5d', '10d', '30d'];
    
    const correlations: number[][] = [];
    const pValues: number[][] = [];

    for (const factor of factors) {
      const factorCorrelations: number[] = [];
      const factorPValues: number[] = [];

      for (const timeframe of timeframes) {
        const result = this.calculateFactorTimeframeCorrelation(
          sentimentData,
          priceMovements,
          factor,
          timeframe
        );
        factorCorrelations.push(result.correlation);
        factorPValues.push(result.pValue);
      }

      correlations.push(factorCorrelations);
      pValues.push(factorPValues);
    }

    return { factors, timeframes, correlations, pValues };
  }

  /**
   * Calculate correlation for a specific factor and timeframe
   */
  private calculateFactorTimeframeCorrelation(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>,
    factor: string,
    timeframe: string
  ): CorrelationResult {
    const cacheKey = `${factor}-${timeframe}`;
    
    if (this.correlationCache.has(cacheKey)) {
      return this.correlationCache.get(cacheKey)!;
    }

    const sentimentScores: number[] = [];
    const priceChanges: number[] = [];

    for (const sentiment of sentimentData) {
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        const movement = priceMovement.movements.find(m => m.timeframe === timeframe);
        if (movement) {
          const sentimentScore = this.extractFactorScore(sentiment.sentiment, factor);
          sentimentScores.push(sentimentScore);
          priceChanges.push(movement.percentChange);
        }
      }
    }

    const result = this.calculateCorrelation(sentimentScores, priceChanges);
    result.factor = factor;
    result.timeframe = timeframe;

    this.correlationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Extract specific factor score from sentiment
   */
  private extractFactorScore(sentiment: SentimentScore, factor: string): number {
    switch (factor) {
      case 'overall':
        return sentiment.overall;
      case 'managementOptimism':
        return sentiment.managementTone.optimism;
      case 'managementConfidence':
        return sentiment.managementTone.confidence;
      case 'managementUncertainty':
        return sentiment.managementTone.uncertainty;
      case 'analystSatisfaction':
        return sentiment.analystReaction.satisfaction;
      case 'analystSkepticism':
        return sentiment.analystReaction.skepticism;
      case 'guidanceStrength':
        return sentiment.guidanceSignal.strength;
      case 'positiveKeywords':
        return sentiment.keyMetrics.positiveKeywords / 20; // Normalize
      case 'negativeKeywords':
        return sentiment.keyMetrics.negativeKeywords / 20;
      default:
        return sentiment.overall;
    }
  }

  /**
   * Decompose correlation by sentiment factors
   */
  decomposeByFactor(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>,
    timeframe: string = '5d'
  ): FactorDecomposition[] {
    const factors = [
      'managementOptimism',
      'managementConfidence',
      'managementUncertainty',
      'analystSatisfaction',
      'analystSkepticism',
      'guidanceStrength',
      'positiveKeywords',
      'negativeKeywords'
    ];

    const decompositions: FactorDecomposition[] = [];
    let totalContribution = 0;

    for (const factor of factors) {
      const result = this.calculateFactorTimeframeCorrelation(
        sentimentData,
        priceMovements,
        factor,
        timeframe
      );

      const contribution = Math.abs(result.correlation) * result.rSquared;
      totalContribution += contribution;

      decompositions.push({
        factor,
        contribution,
        weight: result.correlation,
        significance: 1 - result.pValue
      });
    }

    // Normalize contributions
    if (totalContribution > 0) {
      for (const decomp of decompositions) {
        decomp.contribution = (decomp.contribution / totalContribution) * 100;
      }
    }

    // Sort by contribution
    decompositions.sort((a, b) => b.contribution - a.contribution);

    return decompositions;
  }

  /**
   * Calculate sector-adjusted correlations
   */
  calculateSectorAdjustedCorrelations(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>,
    sectorMap: Map<string, string>,
    timeframe: string = '5d'
  ): SectorAdjustedCorrelation[] {
    // Group by sector
    const sectorGroups = new Map<string, { sentiments: number[]; prices: number[] }>();

    for (const sentiment of sentimentData) {
      const sector = sectorMap.get(sentiment.symbol) || 'Unknown';
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        const movement = priceMovement.movements.find(m => m.timeframe === timeframe);
        if (movement) {
          if (!sectorGroups.has(sector)) {
            sectorGroups.set(sector, { sentiments: [], prices: [] });
          }
          const group = sectorGroups.get(sector)!;
          group.sentiments.push(sentiment.sentiment.overall);
          group.prices.push(movement.percentChange);
        }
      }
    }

    // Calculate base correlation (all data)
    const allSentiments: number[] = [];
    const allPrices: number[] = [];
    for (const group of Array.from(sectorGroups.values())) {
      allSentiments.push(...group.sentiments);
      allPrices.push(...group.prices);
    }
    const baseResult = this.calculateCorrelation(allSentiments, allPrices);

    // Calculate sector-specific correlations
    const results: SectorAdjustedCorrelation[] = [];

    for (const [sector, group] of Array.from(sectorGroups.entries())) {
      if (group.sentiments.length >= 5) {
        const sectorResult = this.calculateCorrelation(group.sentiments, group.prices);
        results.push({
          sector,
          baseCorrelation: baseResult.correlation,
          sectorAdjustedCorrelation: sectorResult.correlation,
          sectorEffect: sectorResult.correlation - baseResult.correlation
        });
      }
    }

    return results.sort((a, b) => Math.abs(b.sectorEffect) - Math.abs(a.sectorEffect));
  }

  /**
   * Calculate market-cap adjusted correlations
   */
  calculateMarketCapAdjustedCorrelations(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>,
    marketCapMap: Map<string, number>,
    timeframe: string = '5d'
  ): MarketCapAdjustedCorrelation[] {
    // Define market cap buckets (in billions)
    const buckets: Array<{ name: MarketCapAdjustedCorrelation['marketCapBucket']; min: number; max: number }> = [
      { name: 'mega', min: 200, max: Infinity },
      { name: 'large', min: 10, max: 200 },
      { name: 'mid', min: 2, max: 10 },
      { name: 'small', min: 0.3, max: 2 },
      { name: 'micro', min: 0, max: 0.3 }
    ];

    // Group by market cap bucket
    const bucketGroups = new Map<string, { sentiments: number[]; prices: number[] }>();

    for (const sentiment of sentimentData) {
      const marketCap = marketCapMap.get(sentiment.symbol) || 0;
      const bucket = buckets.find(b => marketCap >= b.min && marketCap < b.max);
      const bucketName = bucket?.name || 'unknown';
      
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        const movement = priceMovement.movements.find(m => m.timeframe === timeframe);
        if (movement) {
          if (!bucketGroups.has(bucketName)) {
            bucketGroups.set(bucketName, { sentiments: [], prices: [] });
          }
          const group = bucketGroups.get(bucketName)!;
          group.sentiments.push(sentiment.sentiment.overall);
          group.prices.push(movement.percentChange);
        }
      }
    }

    // Calculate base correlation
    const allSentiments: number[] = [];
    const allPrices: number[] = [];
    for (const group of Array.from(bucketGroups.values())) {
      allSentiments.push(...group.sentiments);
      allPrices.push(...group.prices);
    }
    const baseResult = this.calculateCorrelation(allSentiments, allPrices);

    // Calculate bucket-specific correlations
    const results: MarketCapAdjustedCorrelation[] = [];

    for (const [bucketName, group] of Array.from(bucketGroups.entries())) {
      if (group.sentiments.length >= 5 && bucketName !== 'unknown') {
        const bucketResult = this.calculateCorrelation(group.sentiments, group.prices);
        results.push({
          marketCapBucket: bucketName as MarketCapAdjustedCorrelation['marketCapBucket'],
          baseCorrelation: baseResult.correlation,
          adjustedCorrelation: bucketResult.correlation,
          sizeEffect: bucketResult.correlation - baseResult.correlation
        });
      }
    }

    return results;
  }

  /**
   * Calculate p-value from t-statistic
   */
  private calculatePValue(tStat: number, df: number): number {
    // Approximation using normal distribution for large df
    if (df > 30) {
      const z = Math.abs(tStat);
      return 2 * (1 - this.normalCDF(z));
    }

    // Student's t-distribution approximation
    const x = df / (df + tStat * tStat);
    return this.incompleteBeta(df / 2, 0.5, x);
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Incomplete beta function approximation
   */
  private incompleteBeta(a: number, b: number, x: number): number {
    // Simple approximation for p-value calculation
    if (x === 0) return 0;
    if (x === 1) return 1;

    const bt = Math.exp(
      this.logGamma(a + b) - this.logGamma(a) - this.logGamma(b) +
      a * Math.log(x) + b * Math.log(1 - x)
    );

    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betaCF(a, b, x) / a;
    } else {
      return 1 - bt * this.betaCF(b, a, 1 - x) / b;
    }
  }

  /**
   * Log gamma function approximation
   */
  private logGamma(x: number): number {
    const c = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
    ];

    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let j = 0; j < 6; j++) {
      ser += c[j] / ++y;
    }

    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  /**
   * Continued fraction for beta function
   */
  private betaCF(a: number, b: number, x: number): number {
    const maxIterations = 100;
    const eps = 3e-7;

    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;

    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIterations; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;

      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;

      if (Math.abs(del - 1) < eps) break;
    }

    return h;
  }

  /**
   * Calculate confidence interval for correlation
   */
  private calculateConfidenceInterval(
    correlation: number,
    n: number,
    confidence: number = 0.95
  ): [number, number] {
    // Fisher z-transformation
    const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const se = 1 / Math.sqrt(n - 3);
    
    // Z-score for confidence level
    const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
    
    const zLower = z - zScore * se;
    const zUpper = z + zScore * se;
    
    // Transform back
    const lower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
    const upper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);
    
    return [
      isNaN(lower) ? -1 : Math.max(-1, lower),
      isNaN(upper) ? 1 : Math.min(1, upper)
    ];
  }

  /**
   * Determine significance level
   */
  private determineSignificance(
    pValue: number,
    absCorrelation: number
  ): 'high' | 'medium' | 'low' | 'none' {
    if (pValue < 0.01 && absCorrelation > 0.5) return 'high';
    if (pValue < 0.05 && absCorrelation > 0.3) return 'medium';
    if (pValue < 0.1 && absCorrelation > 0.2) return 'low';
    return 'none';
  }

  /**
   * Get empty correlation result
   */
  private getEmptyCorrelationResult(factor: string, timeframe: string): CorrelationResult {
    return {
      factor,
      timeframe,
      correlation: 0,
      pValue: 1,
      confidenceInterval: [-1, 1],
      sampleSize: 0,
      rSquared: 0,
      significance: 'none'
    };
  }

  /**
   * Clear correlation cache
   */
  clearCache(): void {
    this.correlationCache.clear();
    this.dataPoints = [];
  }

  /**
   * Get all data points
   */
  getDataPoints(): DataPoint[] {
    return this.dataPoints;
  }
}

// Export factory function
export function createSentimentPriceCorrelation(): SentimentPriceCorrelation {
  return new SentimentPriceCorrelation();
}
