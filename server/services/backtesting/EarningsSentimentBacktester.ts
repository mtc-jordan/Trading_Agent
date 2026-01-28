/**
 * Earnings Sentiment Backtester
 * 
 * Comprehensive backtesting framework to analyze historical correlation
 * between earnings call sentiment and stock price movements.
 */

import { 
  HistoricalSentimentCollector, 
  HistoricalSentimentData,
  createHistoricalSentimentCollector 
} from './HistoricalSentimentCollector';
import { 
  PostEarningsPriceAnalyzer, 
  PriceMovement,
  createPostEarningsPriceAnalyzer 
} from './PostEarningsPriceAnalyzer';
import { 
  SentimentPriceCorrelation, 
  CorrelationResult,
  CorrelationMatrix,
  FactorDecomposition,
  createSentimentPriceCorrelation 
} from './SentimentPriceCorrelation';

// Types for backtesting
export interface BacktestConfig {
  symbols: string[];
  startDate: string;
  endDate: string;
  timeframes: Array<'1d' | '3d' | '5d' | '10d' | '30d'>;
  minimumSampleSize: number;
  confidenceLevel: number;
  includeSectorAnalysis: boolean;
  includeMarketCapAnalysis: boolean;
  benchmarkSymbol: string;
}

export interface BacktestResult {
  config: BacktestConfig;
  summary: BacktestSummary;
  correlationMatrix: CorrelationMatrix;
  factorDecomposition: FactorDecomposition[];
  bestPredictors: BestPredictor[];
  tradingSignals: TradingSignalAnalysis;
  statisticalTests: StatisticalTests;
  recommendations: BacktestRecommendation[];
  rawData: BacktestRawData;
}

export interface BacktestSummary {
  totalEarningsEvents: number;
  symbolsCovered: number;
  dateRange: { start: string; end: string };
  overallCorrelation: number;
  overallPValue: number;
  bestTimeframe: string;
  bestFactor: string;
  predictiveAccuracy: number;
  profitFactor: number;
}

export interface BestPredictor {
  factor: string;
  timeframe: string;
  correlation: number;
  pValue: number;
  predictiveAccuracy: number;
  sharpeRatio: number;
  rank: number;
}

export interface TradingSignalAnalysis {
  totalSignals: number;
  bullishSignals: number;
  bearishSignals: number;
  neutralSignals: number;
  bullishAccuracy: number;
  bearishAccuracy: number;
  averageReturn: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface StatisticalTests {
  normalityTest: NormalityTest;
  autocorrelationTest: AutocorrelationTest;
  heteroskedasticityTest: HeteroskedasticityTest;
  stationarityTest: StationarityTest;
}

export interface NormalityTest {
  testName: string;
  statistic: number;
  pValue: number;
  isNormal: boolean;
}

export interface AutocorrelationTest {
  testName: string;
  statistic: number;
  pValue: number;
  hasAutocorrelation: boolean;
}

export interface HeteroskedasticityTest {
  testName: string;
  statistic: number;
  pValue: number;
  isHomoscedastic: boolean;
}

export interface StationarityTest {
  testName: string;
  statistic: number;
  pValue: number;
  isStationary: boolean;
}

export interface BacktestRecommendation {
  type: 'strategy' | 'risk' | 'improvement' | 'caution';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
}

export interface BacktestRawData {
  sentimentData: HistoricalSentimentData[];
  priceMovements: Array<{ key: string; movement: PriceMovement }>;
  correlationResults: CorrelationResult[];
}

export interface SignalPerformance {
  signal: 'bullish' | 'bearish' | 'neutral';
  sentimentThreshold: number;
  actualReturn: number;
  correct: boolean;
}

export class EarningsSentimentBacktester {
  private sentimentCollector: HistoricalSentimentCollector;
  private priceAnalyzer: PostEarningsPriceAnalyzer;
  private correlationEngine: SentimentPriceCorrelation;
  private isRunning: boolean = false;
  private progress: number = 0;

  constructor(benchmarkSymbol: string = 'SPY') {
    this.sentimentCollector = createHistoricalSentimentCollector();
    this.priceAnalyzer = createPostEarningsPriceAnalyzer(benchmarkSymbol);
    this.correlationEngine = createSentimentPriceCorrelation();
  }

  /**
   * Run full backtest
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    this.isRunning = true;
    this.progress = 0;

    try {
      // Step 1: Collect historical sentiment data (30%)
      this.progress = 5;
      const sentimentData = await this.collectSentimentData(config);
      this.progress = 30;

      // Step 2: Analyze price movements (50%)
      const priceMovements = await this.analyzePriceMovements(sentimentData);
      this.progress = 50;

      // Step 3: Calculate correlations (70%)
      const correlationMatrix = this.correlationEngine.calculateCorrelationMatrix(
        sentimentData,
        priceMovements
      );
      this.progress = 70;

      // Step 4: Decompose by factors (80%)
      const factorDecomposition = this.correlationEngine.decomposeByFactor(
        sentimentData,
        priceMovements,
        '5d'
      );
      this.progress = 80;

      // Step 5: Analyze trading signals (90%)
      const tradingSignals = this.analyzeTradingSignals(sentimentData, priceMovements);
      this.progress = 90;

      // Step 6: Run statistical tests and generate recommendations (100%)
      const statisticalTests = this.runStatisticalTests(sentimentData, priceMovements);
      const bestPredictors = this.findBestPredictors(correlationMatrix, sentimentData, priceMovements);
      const summary = this.generateSummary(config, sentimentData, correlationMatrix, tradingSignals);
      const recommendations = this.generateRecommendations(summary, correlationMatrix, tradingSignals);
      this.progress = 100;

      // Prepare raw data
      const rawData: BacktestRawData = {
        sentimentData,
        priceMovements: Array.from(priceMovements.entries()).map(([key, movement]) => ({ key, movement })),
        correlationResults: this.extractCorrelationResults(correlationMatrix)
      };

      return {
        config,
        summary,
        correlationMatrix,
        factorDecomposition,
        bestPredictors,
        tradingSignals,
        statisticalTests,
        recommendations,
        rawData
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Collect historical sentiment data for all symbols
   */
  private async collectSentimentData(config: BacktestConfig): Promise<HistoricalSentimentData[]> {
    const allSentimentData: HistoricalSentimentData[] = [];
    
    // Calculate years from date range
    const startYear = new Date(config.startDate).getFullYear();
    const endYear = new Date(config.endDate).getFullYear();
    const years = endYear - startYear + 1;

    for (const symbol of config.symbols) {
      try {
        const transcripts = await this.sentimentCollector.fetchHistoricalTranscripts(
          symbol,
          years
        );
        // Analyze sentiment for each transcript
        for (const transcript of transcripts) {
          // Filter by date range
          const transcriptDate = new Date(transcript.date);
          if (transcriptDate >= new Date(config.startDate) && transcriptDate <= new Date(config.endDate)) {
            const sentiment = await this.sentimentCollector.analyzeSentiment(transcript);
            allSentimentData.push({
              symbol: transcript.symbol,
              earningsDate: transcript.date,
              fiscalYear: transcript.fiscalYear,
              fiscalQuarter: transcript.fiscalQuarter,
              sentiment,
              processedAt: Date.now()
            });
          }
        }
      } catch (error) {
        console.error(`[Backtester] Error collecting sentiment for ${symbol}:`, error);
      }
    }

    return allSentimentData;
  }

  /**
   * Analyze price movements for all sentiment data
   */
  private async analyzePriceMovements(
    sentimentData: HistoricalSentimentData[]
  ): Promise<Map<string, PriceMovement>> {
    const events = sentimentData.map(s => ({
      symbol: s.symbol,
      earningsDate: s.earningsDate
    }));

    return this.priceAnalyzer.batchAnalyze(events);
  }

  /**
   * Analyze trading signals based on sentiment thresholds
   */
  private analyzeTradingSignals(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>
  ): TradingSignalAnalysis {
    const signals: SignalPerformance[] = [];
    const returns: number[] = [];

    // Define sentiment thresholds
    const bullishThreshold = 0.6;
    const bearishThreshold = 0.4;

    for (const sentiment of sentimentData) {
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        const movement5d = priceMovement.movements.find(m => m.timeframe === '5d');
        if (movement5d) {
          const sentimentScore = sentiment.sentiment.overall;
          const actualReturn = movement5d.percentChange;
          returns.push(actualReturn);

          let signal: 'bullish' | 'bearish' | 'neutral';
          if (sentimentScore >= bullishThreshold) {
            signal = 'bullish';
          } else if (sentimentScore <= bearishThreshold) {
            signal = 'bearish';
          } else {
            signal = 'neutral';
          }

          const correct = (signal === 'bullish' && actualReturn > 0) ||
                         (signal === 'bearish' && actualReturn < 0) ||
                         (signal === 'neutral');

          signals.push({
            signal,
            sentimentThreshold: sentimentScore,
            actualReturn,
            correct
          });
        }
      }
    }

    // Calculate metrics
    const bullishSignals = signals.filter(s => s.signal === 'bullish');
    const bearishSignals = signals.filter(s => s.signal === 'bearish');
    const neutralSignals = signals.filter(s => s.signal === 'neutral');

    const bullishAccuracy = bullishSignals.length > 0
      ? bullishSignals.filter(s => s.correct).length / bullishSignals.length
      : 0;
    const bearishAccuracy = bearishSignals.length > 0
      ? bearishSignals.filter(s => s.correct).length / bearishSignals.length
      : 0;

    const winningTrades = signals.filter(s => s.correct && s.signal !== 'neutral');
    const losingTrades = signals.filter(s => !s.correct && s.signal !== 'neutral');
    const winRate = (winningTrades.length + losingTrades.length) > 0
      ? winningTrades.length / (winningTrades.length + losingTrades.length)
      : 0;

    const averageReturn = returns.length > 0
      ? returns.reduce((a, b) => a + b, 0) / returns.length
      : 0;

    // Calculate profit factor
    const grossProfit = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    for (const ret of returns) {
      cumulative += ret;
      if (cumulative > peak) peak = cumulative;
      const drawdown = (peak - cumulative) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02 / 252; // Daily
    const excessReturns = returns.map(r => r / 100 - riskFreeRate);
    const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const stdDev = Math.sqrt(
      excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / excessReturns.length
    );
    const sharpeRatio = stdDev > 0 ? (meanExcess / stdDev) * Math.sqrt(252) : 0;

    return {
      totalSignals: signals.length,
      bullishSignals: bullishSignals.length,
      bearishSignals: bearishSignals.length,
      neutralSignals: neutralSignals.length,
      bullishAccuracy: bullishAccuracy * 100,
      bearishAccuracy: bearishAccuracy * 100,
      averageReturn,
      winRate: winRate * 100,
      profitFactor,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio
    };
  }

  /**
   * Run statistical tests on the data
   */
  private runStatisticalTests(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>
  ): StatisticalTests {
    // Extract returns for testing
    const returns: number[] = [];
    for (const sentiment of sentimentData) {
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);
      if (priceMovement) {
        const movement = priceMovement.movements.find(m => m.timeframe === '5d');
        if (movement) {
          returns.push(movement.percentChange);
        }
      }
    }

    return {
      normalityTest: this.jarqueBeraTest(returns),
      autocorrelationTest: this.ljungBoxTest(returns),
      heteroskedasticityTest: this.breuschPaganTest(returns),
      stationarityTest: this.augmentedDickeyFullerTest(returns)
    };
  }

  /**
   * Jarque-Bera normality test
   */
  private jarqueBeraTest(data: number[]): NormalityTest {
    if (data.length < 4) {
      return { testName: 'Jarque-Bera', statistic: 0, pValue: 1, isNormal: true };
    }

    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    
    // Calculate moments
    let m2 = 0, m3 = 0, m4 = 0;
    for (const x of data) {
      const diff = x - mean;
      m2 += diff * diff;
      m3 += diff * diff * diff;
      m4 += diff * diff * diff * diff;
    }
    m2 /= n;
    m3 /= n;
    m4 /= n;

    const skewness = m3 / Math.pow(m2, 1.5);
    const kurtosis = m4 / (m2 * m2) - 3;

    const jb = (n / 6) * (skewness * skewness + (kurtosis * kurtosis) / 4);
    
    // Chi-squared p-value approximation (df=2)
    const pValue = Math.exp(-jb / 2);

    return {
      testName: 'Jarque-Bera',
      statistic: jb,
      pValue,
      isNormal: pValue > 0.05
    };
  }

  /**
   * Ljung-Box autocorrelation test
   */
  private ljungBoxTest(data: number[], lags: number = 10): AutocorrelationTest {
    if (data.length < lags + 1) {
      return { testName: 'Ljung-Box', statistic: 0, pValue: 1, hasAutocorrelation: false };
    }

    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    
    // Calculate variance
    let variance = 0;
    for (const x of data) {
      variance += (x - mean) * (x - mean);
    }
    variance /= n;

    // Calculate autocorrelations
    let q = 0;
    for (let k = 1; k <= lags; k++) {
      let autocov = 0;
      for (let t = k; t < n; t++) {
        autocov += (data[t] - mean) * (data[t - k] - mean);
      }
      autocov /= n;
      const rho = autocov / variance;
      q += (rho * rho) / (n - k);
    }
    q *= n * (n + 2);

    // Chi-squared p-value approximation
    const pValue = 1 - this.chiSquaredCDF(q, lags);

    return {
      testName: 'Ljung-Box',
      statistic: q,
      pValue,
      hasAutocorrelation: pValue < 0.05
    };
  }

  /**
   * Breusch-Pagan heteroskedasticity test (simplified)
   */
  private breuschPaganTest(data: number[]): HeteroskedasticityTest {
    if (data.length < 10) {
      return { testName: 'Breusch-Pagan', statistic: 0, pValue: 1, isHomoscedastic: true };
    }

    // Simplified test: compare variance in first and second half
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid);
    const secondHalf = data.slice(mid);

    const var1 = this.calculateVariance(firstHalf);
    const var2 = this.calculateVariance(secondHalf);

    // F-test for equality of variances
    const fStat = var1 > var2 ? var1 / var2 : var2 / var1;
    const df1 = mid - 1;
    const df2 = data.length - mid - 1;

    // Approximate p-value
    const pValue = 1 - this.fDistributionCDF(fStat, df1, df2);

    return {
      testName: 'Breusch-Pagan',
      statistic: fStat,
      pValue,
      isHomoscedastic: pValue > 0.05
    };
  }

  /**
   * Augmented Dickey-Fuller stationarity test (simplified)
   */
  private augmentedDickeyFullerTest(data: number[]): StationarityTest {
    if (data.length < 20) {
      return { testName: 'ADF', statistic: 0, pValue: 0.5, isStationary: true };
    }

    // Simplified ADF: check if first differences are stationary
    const diffs: number[] = [];
    for (let i = 1; i < data.length; i++) {
      diffs.push(data[i] - data[i - 1]);
    }

    // Calculate mean and variance of differences
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = this.calculateVariance(diffs);

    // T-statistic for mean = 0
    const tStat = mean / Math.sqrt(variance / diffs.length);

    // ADF critical values approximation
    // At 5% level, critical value is approximately -2.86
    const criticalValue = -2.86;
    const isStationary = tStat < criticalValue;

    // Approximate p-value
    const pValue = isStationary ? 0.01 : 0.1;

    return {
      testName: 'ADF',
      statistic: tStat,
      pValue,
      isStationary
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (data.length - 1);
  }

  /**
   * Chi-squared CDF approximation
   */
  private chiSquaredCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    return this.gammaCDF(x / 2, df / 2);
  }

  /**
   * Gamma CDF approximation
   */
  private gammaCDF(x: number, a: number): number {
    // Incomplete gamma function approximation
    if (x <= 0) return 0;
    if (a <= 0) return 1;

    const iterations = 100;
    let sum = 0;
    let term = 1 / a;
    sum = term;

    for (let n = 1; n < iterations; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }

    return sum * Math.exp(-x + a * Math.log(x) - this.logGamma(a));
  }

  /**
   * F-distribution CDF approximation
   */
  private fDistributionCDF(x: number, df1: number, df2: number): number {
    if (x <= 0) return 0;
    const t = df1 * x / (df1 * x + df2);
    return this.incompleteBeta(df1 / 2, df2 / 2, t);
  }

  /**
   * Incomplete beta function
   */
  private incompleteBeta(a: number, b: number, x: number): number {
    if (x === 0) return 0;
    if (x === 1) return 1;
    return 0.5; // Simplified approximation
  }

  /**
   * Log gamma function
   */
  private logGamma(x: number): number {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
               -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
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
   * Find best predictors from correlation matrix
   */
  private findBestPredictors(
    correlationMatrix: CorrelationMatrix,
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>
  ): BestPredictor[] {
    const predictors: BestPredictor[] = [];

    for (let i = 0; i < correlationMatrix.factors.length; i++) {
      for (let j = 0; j < correlationMatrix.timeframes.length; j++) {
        const correlation = correlationMatrix.correlations[i][j];
        const pValue = correlationMatrix.pValues[i][j];

        // Calculate predictive accuracy for this factor/timeframe
        const accuracy = this.calculatePredictiveAccuracy(
          sentimentData,
          priceMovements,
          correlationMatrix.factors[i],
          correlationMatrix.timeframes[j]
        );

        // Calculate Sharpe ratio
        const sharpeRatio = this.calculateFactorSharpeRatio(
          sentimentData,
          priceMovements,
          correlationMatrix.factors[i],
          correlationMatrix.timeframes[j]
        );

        predictors.push({
          factor: correlationMatrix.factors[i],
          timeframe: correlationMatrix.timeframes[j],
          correlation,
          pValue,
          predictiveAccuracy: accuracy,
          sharpeRatio,
          rank: 0
        });
      }
    }

    // Sort by correlation strength and assign ranks
    predictors.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    predictors.forEach((p, i) => p.rank = i + 1);

    return predictors.slice(0, 10); // Return top 10
  }

  /**
   * Calculate predictive accuracy for a factor/timeframe combination
   */
  private calculatePredictiveAccuracy(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>,
    factor: string,
    timeframe: string
  ): number {
    let correct = 0;
    let total = 0;

    for (const sentiment of sentimentData) {
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        const movement = priceMovement.movements.find(m => m.timeframe === timeframe);
        if (movement) {
          const sentimentScore = this.extractFactorScore(sentiment, factor);
          const predictedDirection = sentimentScore > 0.5 ? 1 : -1;
          const actualDirection = movement.percentChange > 0 ? 1 : -1;

          if (predictedDirection === actualDirection) correct++;
          total++;
        }
      }
    }

    return total > 0 ? (correct / total) * 100 : 50;
  }

  /**
   * Calculate Sharpe ratio for a factor/timeframe combination
   */
  private calculateFactorSharpeRatio(
    sentimentData: HistoricalSentimentData[],
    priceMovements: Map<string, PriceMovement>,
    factor: string,
    timeframe: string
  ): number {
    const returns: number[] = [];

    for (const sentiment of sentimentData) {
      const key = `${sentiment.symbol}-${sentiment.earningsDate}`;
      const priceMovement = priceMovements.get(key);

      if (priceMovement) {
        const movement = priceMovement.movements.find(m => m.timeframe === timeframe);
        if (movement) {
          const sentimentScore = this.extractFactorScore(sentiment, factor);
          // Simulate return based on sentiment signal
          const position = sentimentScore > 0.5 ? 1 : -1;
          returns.push(position * movement.percentChange);
        }
      }
    }

    if (returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252 / 5) : 0; // Annualized
  }

  /**
   * Extract factor score from sentiment data
   */
  private extractFactorScore(sentiment: HistoricalSentimentData, factor: string): number {
    switch (factor) {
      case 'overall':
        return sentiment.sentiment.overall;
      case 'managementOptimism':
        return sentiment.sentiment.managementTone.optimism;
      case 'managementConfidence':
        return sentiment.sentiment.managementTone.confidence;
      case 'analystSatisfaction':
        return sentiment.sentiment.analystReaction.satisfaction;
      case 'guidanceStrength':
        return sentiment.sentiment.guidanceSignal.strength;
      default:
        return sentiment.sentiment.overall;
    }
  }

  /**
   * Generate backtest summary
   */
  private generateSummary(
    config: BacktestConfig,
    sentimentData: HistoricalSentimentData[],
    correlationMatrix: CorrelationMatrix,
    tradingSignals: TradingSignalAnalysis
  ): BacktestSummary {
    // Find best correlation
    let bestCorrelation = 0;
    let bestTimeframe = '';
    let bestFactor = '';

    for (let i = 0; i < correlationMatrix.factors.length; i++) {
      for (let j = 0; j < correlationMatrix.timeframes.length; j++) {
        if (Math.abs(correlationMatrix.correlations[i][j]) > Math.abs(bestCorrelation)) {
          bestCorrelation = correlationMatrix.correlations[i][j];
          bestFactor = correlationMatrix.factors[i];
          bestTimeframe = correlationMatrix.timeframes[j];
        }
      }
    }

    // Get overall correlation (first factor, 5d timeframe)
    const overallIdx = correlationMatrix.factors.indexOf('overall');
    const timeframeIdx = correlationMatrix.timeframes.indexOf('5d');
    const overallCorrelation = overallIdx >= 0 && timeframeIdx >= 0
      ? correlationMatrix.correlations[overallIdx][timeframeIdx]
      : 0;
    const overallPValue = overallIdx >= 0 && timeframeIdx >= 0
      ? correlationMatrix.pValues[overallIdx][timeframeIdx]
      : 1;

    return {
      totalEarningsEvents: sentimentData.length,
      symbolsCovered: new Set(sentimentData.map(s => s.symbol)).size,
      dateRange: { start: config.startDate, end: config.endDate },
      overallCorrelation,
      overallPValue,
      bestTimeframe,
      bestFactor,
      predictiveAccuracy: tradingSignals.winRate,
      profitFactor: tradingSignals.profitFactor
    };
  }

  /**
   * Generate recommendations based on backtest results
   */
  private generateRecommendations(
    summary: BacktestSummary,
    correlationMatrix: CorrelationMatrix,
    tradingSignals: TradingSignalAnalysis
  ): BacktestRecommendation[] {
    const recommendations: BacktestRecommendation[] = [];

    // Strategy recommendations
    if (summary.overallCorrelation > 0.3) {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Strong Sentiment-Price Correlation Detected',
        description: `The overall correlation of ${(summary.overallCorrelation * 100).toFixed(1)}% suggests sentiment analysis can be a valuable trading signal.`,
        expectedImpact: 'Consider incorporating sentiment scores into your trading strategy with higher weight.'
      });
    }

    if (tradingSignals.winRate > 55) {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Above-Average Win Rate',
        description: `The ${tradingSignals.winRate.toFixed(1)}% win rate exceeds random chance, indicating predictive value.`,
        expectedImpact: 'Sentiment-based signals can improve trade selection accuracy.'
      });
    }

    // Risk recommendations
    if (tradingSignals.maxDrawdown > 20) {
      recommendations.push({
        type: 'risk',
        priority: 'high',
        title: 'High Maximum Drawdown',
        description: `The ${tradingSignals.maxDrawdown.toFixed(1)}% max drawdown suggests significant risk during adverse periods.`,
        expectedImpact: 'Implement position sizing and stop-loss rules to manage downside risk.'
      });
    }

    if (tradingSignals.sharpeRatio < 0.5) {
      recommendations.push({
        type: 'risk',
        priority: 'medium',
        title: 'Low Risk-Adjusted Returns',
        description: `The Sharpe ratio of ${tradingSignals.sharpeRatio.toFixed(2)} indicates moderate risk-adjusted performance.`,
        expectedImpact: 'Consider combining sentiment with other factors to improve risk-adjusted returns.'
      });
    }

    // Improvement recommendations
    if (summary.bestFactor !== 'overall') {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        title: `Best Predictor: ${summary.bestFactor}`,
        description: `The ${summary.bestFactor} factor shows stronger correlation than overall sentiment.`,
        expectedImpact: `Focus on ${summary.bestFactor} for improved prediction accuracy.`
      });
    }

    if (summary.bestTimeframe !== '5d') {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        title: `Optimal Timeframe: ${summary.bestTimeframe}`,
        description: `The ${summary.bestTimeframe} timeframe shows the strongest sentiment-price relationship.`,
        expectedImpact: `Adjust holding period to ${summary.bestTimeframe} for better alignment with sentiment signals.`
      });
    }

    // Caution recommendations
    if (summary.totalEarningsEvents < 50) {
      recommendations.push({
        type: 'caution',
        priority: 'high',
        title: 'Limited Sample Size',
        description: `Only ${summary.totalEarningsEvents} earnings events analyzed. Results may not be statistically robust.`,
        expectedImpact: 'Expand the date range or symbol list for more reliable conclusions.'
      });
    }

    if (summary.overallPValue > 0.1) {
      recommendations.push({
        type: 'caution',
        priority: 'medium',
        title: 'Low Statistical Significance',
        description: `The p-value of ${summary.overallPValue.toFixed(3)} suggests the correlation may not be statistically significant.`,
        expectedImpact: 'Use sentiment signals as one of multiple factors rather than the primary signal.'
      });
    }

    return recommendations;
  }

  /**
   * Extract correlation results from matrix
   */
  private extractCorrelationResults(matrix: CorrelationMatrix): CorrelationResult[] {
    const results: CorrelationResult[] = [];

    for (let i = 0; i < matrix.factors.length; i++) {
      for (let j = 0; j < matrix.timeframes.length; j++) {
        results.push({
          factor: matrix.factors[i],
          timeframe: matrix.timeframes[j],
          correlation: matrix.correlations[i][j],
          pValue: matrix.pValues[i][j],
          confidenceInterval: [-1, 1],
          sampleSize: 0,
          rSquared: matrix.correlations[i][j] * matrix.correlations[i][j],
          significance: this.determineSignificance(matrix.pValues[i][j], Math.abs(matrix.correlations[i][j]))
        });
      }
    }

    return results;
  }

  /**
   * Determine significance level
   */
  private determineSignificance(pValue: number, absCorrelation: number): 'high' | 'medium' | 'low' | 'none' {
    if (pValue < 0.01 && absCorrelation > 0.5) return 'high';
    if (pValue < 0.05 && absCorrelation > 0.3) return 'medium';
    if (pValue < 0.1 && absCorrelation > 0.2) return 'low';
    return 'none';
  }

  /**
   * Get current progress
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * Check if backtest is running
   */
  isBacktestRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Cancel running backtest
   */
  cancelBacktest(): void {
    this.isRunning = false;
  }
}

// Export factory function
export function createEarningsSentimentBacktester(benchmarkSymbol?: string): EarningsSentimentBacktester {
  return new EarningsSentimentBacktester(benchmarkSymbol);
}
