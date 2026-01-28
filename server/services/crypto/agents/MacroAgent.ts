/**
 * Cross-Asset Correlation Agent (Macro Agent)
 * 
 * Monitors correlation between BTC and traditional markets (Nasdaq, S&P 500).
 * Calculates lag times and prepares positions based on cross-asset movements.
 * 
 * Based on 2026 Big Investor strategies for crypto AI trading.
 */

// Types for macro correlation analysis
export interface CorrelationData {
  asset1: string;
  asset2: string;
  timeframe: '1h' | '4h' | '1d' | '1w' | '1m';
  correlation: number; // -1 to 1
  rSquared: number;
  pValue: number;
  sampleSize: number;
  startDate: Date;
  endDate: Date;
}

export interface LagAnalysis {
  leadingAsset: string;
  laggingAsset: string;
  optimalLag: number; // in hours
  lagCorrelation: number;
  confidence: number;
  historicalAccuracy: number;
}

export interface MacroRegime {
  regime: 'risk_on' | 'risk_off' | 'transition' | 'decorrelated';
  confidence: number;
  indicators: {
    vix: number;
    dxy: number;
    us10y: number;
    sp500Trend: 'bullish' | 'bearish' | 'neutral';
    btcCorrelation: number;
  };
  description: string;
}

export interface CrossAssetSignal {
  id: string;
  timestamp: Date;
  type: 'lag_opportunity' | 'correlation_breakdown' | 'regime_change' | 'divergence';
  assets: string[];
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  expectedMove: number;
  timeHorizon: string;
  reasoning: string;
}

export interface MacroReport {
  timestamp: Date;
  currentRegime: MacroRegime;
  correlations: CorrelationData[];
  lagAnalysis: LagAnalysis[];
  activeSignals: CrossAssetSignal[];
  btcBeta: number;
  marketRiskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  recommendation: string;
}

// Historical price data structure
interface PricePoint {
  timestamp: Date;
  price: number;
  volume: number;
}

export class MacroAgent {
  private priceHistory: Map<string, PricePoint[]> = new Map();
  private correlationCache: Map<string, CorrelationData> = new Map();
  private signalHistory: CrossAssetSignal[] = [];
  private currentRegime: MacroRegime | null = null;

  constructor() {
    // Initialize with simulated historical data
    this.initializeHistoricalData();
  }

  /**
   * Calculate correlation between two assets
   */
  async calculateCorrelation(
    asset1: string,
    asset2: string,
    timeframe: '1h' | '4h' | '1d' | '1w' | '1m' = '1d'
  ): Promise<CorrelationData> {
    const cacheKey = `${asset1}_${asset2}_${timeframe}`;
    const cached = this.correlationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.endDate.getTime() < 60 * 60 * 1000) {
      return cached;
    }

    // Get price data
    const prices1 = this.priceHistory.get(asset1) || [];
    const prices2 = this.priceHistory.get(asset2) || [];

    // Calculate returns
    const returns1 = this.calculateReturns(prices1);
    const returns2 = this.calculateReturns(prices2);

    // Align data points
    const minLength = Math.min(returns1.length, returns2.length);
    const alignedReturns1 = returns1.slice(-minLength);
    const alignedReturns2 = returns2.slice(-minLength);

    // Calculate Pearson correlation
    const correlation = this.pearsonCorrelation(alignedReturns1, alignedReturns2);
    const rSquared = correlation * correlation;

    // Calculate p-value (simplified)
    const tStat = correlation * Math.sqrt((minLength - 2) / (1 - rSquared));
    const pValue = this.tDistributionPValue(tStat, minLength - 2);

    const result: CorrelationData = {
      asset1,
      asset2,
      timeframe,
      correlation,
      rSquared,
      pValue,
      sampleSize: minLength,
      startDate: new Date(Date.now() - minLength * 24 * 60 * 60 * 1000),
      endDate: new Date()
    };

    this.correlationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Analyze lag between assets
   */
  async analyzeLag(leadingAsset: string, laggingAsset: string): Promise<LagAnalysis> {
    const prices1 = this.priceHistory.get(leadingAsset) || [];
    const prices2 = this.priceHistory.get(laggingAsset) || [];

    const returns1 = this.calculateReturns(prices1);
    const returns2 = this.calculateReturns(prices2);

    // Test different lag periods (1-48 hours)
    let bestLag = 0;
    let bestCorrelation = 0;

    for (let lag = 1; lag <= 48; lag++) {
      const laggedReturns1 = returns1.slice(0, -lag);
      const laggedReturns2 = returns2.slice(lag);
      
      const minLength = Math.min(laggedReturns1.length, laggedReturns2.length);
      if (minLength < 30) continue;

      const correlation = this.pearsonCorrelation(
        laggedReturns1.slice(-minLength),
        laggedReturns2.slice(-minLength)
      );

      if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    // Calculate historical accuracy of lag prediction
    const historicalAccuracy = this.calculateLagAccuracy(leadingAsset, laggingAsset, bestLag);

    return {
      leadingAsset,
      laggingAsset,
      optimalLag: bestLag,
      lagCorrelation: bestCorrelation,
      confidence: Math.min(0.9, Math.abs(bestCorrelation) * 0.8 + historicalAccuracy * 0.2),
      historicalAccuracy
    };
  }

  /**
   * Detect current macro regime
   */
  async detectMacroRegime(): Promise<MacroRegime> {
    // Simulate macro indicators (in production, fetch from data providers)
    const vix = 15 + Math.random() * 25; // VIX typically 15-40
    const dxy = 100 + (Math.random() - 0.5) * 10; // Dollar Index
    const us10y = 3.5 + (Math.random() - 0.5) * 2; // 10-year Treasury yield

    // Get BTC-Nasdaq correlation
    const btcNasdaqCorr = await this.calculateCorrelation('BTC', 'NASDAQ', '1d');

    // Determine S&P 500 trend
    const sp500Prices = this.priceHistory.get('SP500') || [];
    const sp500Trend = this.determineTrend(sp500Prices);

    // Classify regime
    let regime: MacroRegime['regime'] = 'decorrelated';
    let confidence = 0.5;
    let description = '';

    if (vix < 20 && sp500Trend === 'bullish' && btcNasdaqCorr.correlation > 0.5) {
      regime = 'risk_on';
      confidence = 0.7 + btcNasdaqCorr.correlation * 0.2;
      description = 'Risk-on environment: Low volatility, bullish equities, BTC trading as high-beta tech';
    } else if (vix > 30 && sp500Trend === 'bearish') {
      regime = 'risk_off';
      confidence = 0.6 + (vix - 30) / 40;
      description = 'Risk-off environment: High volatility, bearish equities, expect BTC to follow lower';
    } else if (Math.abs(btcNasdaqCorr.correlation) < 0.3) {
      regime = 'decorrelated';
      confidence = 0.5 + (0.3 - Math.abs(btcNasdaqCorr.correlation));
      description = 'Decorrelated regime: BTC trading independently of traditional markets';
    } else {
      regime = 'transition';
      confidence = 0.4;
      description = 'Transition period: Market regime unclear, exercise caution';
    }

    this.currentRegime = {
      regime,
      confidence,
      indicators: {
        vix,
        dxy,
        us10y,
        sp500Trend,
        btcCorrelation: btcNasdaqCorr.correlation
      },
      description
    };

    return this.currentRegime;
  }

  /**
   * Generate cross-asset trading signals
   */
  async generateSignals(): Promise<CrossAssetSignal[]> {
    const signals: CrossAssetSignal[] = [];

    // Get current regime
    const regime = await this.detectMacroRegime();

    // Analyze BTC-Nasdaq lag
    const btcNasdaqLag = await this.analyzeLag('NASDAQ', 'BTC');

    // Generate lag opportunity signal if significant
    if (btcNasdaqLag.lagCorrelation > 0.5 && btcNasdaqLag.optimalLag > 2) {
      // Check if Nasdaq moved significantly recently
      const nasdaqPrices = this.priceHistory.get('NASDAQ') || [];
      const recentNasdaqMove = this.calculateRecentMove(nasdaqPrices, btcNasdaqLag.optimalLag);

      if (Math.abs(recentNasdaqMove) > 1) {
        signals.push({
          id: `lag_${Date.now()}`,
          timestamp: new Date(),
          type: 'lag_opportunity',
          assets: ['BTC', 'NASDAQ'],
          signal: recentNasdaqMove > 0 ? 'long' : 'short',
          confidence: btcNasdaqLag.confidence,
          expectedMove: recentNasdaqMove * btcNasdaqLag.lagCorrelation * 1.5, // BTC typically moves more
          timeHorizon: `${btcNasdaqLag.optimalLag} hours`,
          reasoning: `Nasdaq moved ${recentNasdaqMove.toFixed(2)}% ${btcNasdaqLag.optimalLag}h ago. BTC expected to follow with ${(btcNasdaqLag.lagCorrelation * 100).toFixed(0)}% correlation.`
        });
      }
    }

    // Generate regime change signal
    if (regime.regime === 'risk_off' && regime.confidence > 0.7) {
      signals.push({
        id: `regime_${Date.now()}`,
        timestamp: new Date(),
        type: 'regime_change',
        assets: ['BTC', 'ETH', 'SOL'],
        signal: 'short',
        confidence: regime.confidence,
        expectedMove: -10,
        timeHorizon: '1-7 days',
        reasoning: regime.description
      });
    }

    // Check for correlation breakdown
    const btcNasdaqCorr = await this.calculateCorrelation('BTC', 'NASDAQ', '1d');
    const btcNasdaqCorr1w = await this.calculateCorrelation('BTC', 'NASDAQ', '1w');

    if (Math.abs(btcNasdaqCorr.correlation - btcNasdaqCorr1w.correlation) > 0.3) {
      signals.push({
        id: `breakdown_${Date.now()}`,
        timestamp: new Date(),
        type: 'correlation_breakdown',
        assets: ['BTC', 'NASDAQ'],
        signal: 'neutral',
        confidence: 0.6,
        expectedMove: 0,
        timeHorizon: '1-3 days',
        reasoning: `Correlation shifted from ${(btcNasdaqCorr1w.correlation * 100).toFixed(0)}% to ${(btcNasdaqCorr.correlation * 100).toFixed(0)}%. Monitor for new regime.`
      });
    }

    this.signalHistory.push(...signals);
    return signals;
  }

  /**
   * Calculate BTC beta relative to market
   */
  async calculateBTCBeta(): Promise<number> {
    const btcSp500Corr = await this.calculateCorrelation('BTC', 'SP500', '1d');
    
    // Beta = correlation * (BTC volatility / SP500 volatility)
    const btcVol = this.calculateVolatility(this.priceHistory.get('BTC') || []);
    const sp500Vol = this.calculateVolatility(this.priceHistory.get('SP500') || []);

    return btcSp500Corr.correlation * (btcVol / sp500Vol);
  }

  /**
   * Generate comprehensive macro report
   */
  async generateMacroReport(): Promise<MacroReport> {
    const [regime, btcBeta, signals] = await Promise.all([
      this.detectMacroRegime(),
      this.calculateBTCBeta(),
      this.generateSignals()
    ]);

    // Calculate all correlations
    const correlations = await Promise.all([
      this.calculateCorrelation('BTC', 'NASDAQ', '1d'),
      this.calculateCorrelation('BTC', 'SP500', '1d'),
      this.calculateCorrelation('BTC', 'GOLD', '1d'),
      this.calculateCorrelation('ETH', 'BTC', '1d'),
      this.calculateCorrelation('SOL', 'BTC', '1d')
    ]);

    // Analyze lags
    const lagAnalysis = await Promise.all([
      this.analyzeLag('NASDAQ', 'BTC'),
      this.analyzeLag('SP500', 'BTC'),
      this.analyzeLag('BTC', 'ETH')
    ]);

    // Determine market risk level
    let marketRiskLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'moderate';
    if (regime.indicators.vix > 35) marketRiskLevel = 'extreme';
    else if (regime.indicators.vix > 25) marketRiskLevel = 'high';
    else if (regime.indicators.vix < 15) marketRiskLevel = 'low';

    // Generate recommendation
    let recommendation = '';
    if (regime.regime === 'risk_on' && marketRiskLevel === 'low') {
      recommendation = 'FAVORABLE: Risk-on environment with low volatility. Consider increasing crypto exposure.';
    } else if (regime.regime === 'risk_off') {
      recommendation = 'CAUTION: Risk-off environment. Reduce exposure or hedge positions.';
    } else if (signals.some(s => s.type === 'lag_opportunity')) {
      const lagSignal = signals.find(s => s.type === 'lag_opportunity');
      recommendation = `OPPORTUNITY: Lag signal detected. ${lagSignal?.reasoning}`;
    } else {
      recommendation = 'NEUTRAL: No strong macro signals. Maintain current positioning.';
    }

    return {
      timestamp: new Date(),
      currentRegime: regime,
      correlations,
      lagAnalysis,
      activeSignals: signals,
      btcBeta,
      marketRiskLevel,
      recommendation
    };
  }

  // Private helper methods

  private initializeHistoricalData(): void {
    // Generate simulated historical data for major assets
    const assets = ['BTC', 'ETH', 'SOL', 'NASDAQ', 'SP500', 'GOLD', 'DXY'];
    const basePrice: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2500,
      'SOL': 100,
      'NASDAQ': 15000,
      'SP500': 4500,
      'GOLD': 2000,
      'DXY': 104
    };

    assets.forEach(asset => {
      const prices: PricePoint[] = [];
      let price = basePrice[asset] || 100;

      // Generate 365 days of hourly data
      for (let i = 365 * 24; i >= 0; i--) {
        const volatility = asset === 'BTC' || asset === 'ETH' || asset === 'SOL' ? 0.03 : 0.01;
        price = price * (1 + (Math.random() - 0.5) * volatility);
        
        prices.push({
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
          price,
          volume: Math.random() * 1000000000
        });
      }

      this.priceHistory.set(asset, prices);
    });
  }

  private calculateReturns(prices: PricePoint[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i].price - prices[i - 1].price) / prices[i - 1].price);
    }
    return returns;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private tDistributionPValue(t: number, df: number): number {
    // Simplified p-value calculation
    const absT = Math.abs(t);
    if (absT > 3) return 0.001;
    if (absT > 2) return 0.05;
    if (absT > 1.5) return 0.1;
    return 0.2;
  }

  private calculateLagAccuracy(leading: string, lagging: string, lag: number): number {
    // Simulate historical accuracy calculation
    return 0.55 + Math.random() * 0.25;
  }

  private determineTrend(prices: PricePoint[]): 'bullish' | 'bearish' | 'neutral' {
    if (prices.length < 20) return 'neutral';

    const recent = prices.slice(-20);
    const sma20 = recent.reduce((sum, p) => sum + p.price, 0) / 20;
    const currentPrice = prices[prices.length - 1].price;

    if (currentPrice > sma20 * 1.02) return 'bullish';
    if (currentPrice < sma20 * 0.98) return 'bearish';
    return 'neutral';
  }

  private calculateRecentMove(prices: PricePoint[], hoursAgo: number): number {
    if (prices.length < hoursAgo + 1) return 0;
    
    const currentPrice = prices[prices.length - 1].price;
    const pastPrice = prices[prices.length - 1 - hoursAgo].price;
    
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  private calculateVolatility(prices: PricePoint[]): number {
    const returns = this.calculateReturns(prices);
    if (returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365); // Annualized
  }
}

// Factory function
export function createMacroAgent(): MacroAgent {
  return new MacroAgent();
}
