/**
 * Cross-Asset Statistical Arbitrage System
 * 
 * Implements Z-Score normalization for finding mispricings between correlated assets.
 * Formula: Z = (X_t - μ) / σ
 */

import { AgentSignal, SignalStrength, RiskLevel } from './SpecializedTradingAgents';

export interface AssetPriceHistory {
  symbol: string;
  assetClass: 'stock' | 'crypto' | 'commodity' | 'forex' | 'etf';
  prices: number[];
  timestamps: Date[];
  returns: number[];
}

export interface CorrelationPair {
  asset1: string;
  asset2: string;
  correlation: number;
  historicalMean: number;
  historicalStd: number;
  currentSpread: number;
  zScore: number;
}

export interface ArbitrageOpportunity {
  pair: CorrelationPair;
  signal: 'long_spread' | 'short_spread' | 'neutral';
  confidence: number;
  expectedReturn: number;
  timeHorizon: string;
  riskLevel: RiskLevel;
  trades: {
    symbol: string;
    action: 'buy' | 'sell';
    weight: number;
    reasoning: string;
  }[];
}

export interface InflationHedgePlay {
  trigger: string;
  triggerAsset: string;
  triggerSignal: SignalStrength;
  relatedTrades: {
    assetClass: string;
    symbol: string;
    action: 'buy' | 'sell';
    reasoning: string;
    expectedCorrelation: number;
  }[];
  overallConfidence: number;
  riskLevel: RiskLevel;
}

export class StatisticalArbitrageCalculator {
  private zScoreThreshold = 2.0;
  private lookbackPeriod = 60;
  private minCorrelation = 0.6;

  calculateZScore(spread: number, mean: number, std: number): number {
    if (std === 0) return 0;
    return (spread - mean) / std;
  }

  calculateRollingStats(prices: number[], window: number): { mean: number; std: number } {
    if (prices.length < window) window = prices.length;
    const recentPrices = prices.slice(-window);
    const mean = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length;
    return { mean, std: Math.sqrt(variance) };
  }

  calculateCorrelation(returns1: number[], returns2: number[]): number {
    const n = Math.min(returns1.length, returns2.length);
    if (n < 2) return 0;
    const r1 = returns1.slice(-n);
    const r2 = returns2.slice(-n);
    const mean1 = r1.reduce((sum, r) => sum + r, 0) / n;
    const mean2 = r2.reduce((sum, r) => sum + r, 0) / n;
    let covariance = 0, var1 = 0, var2 = 0;
    for (let i = 0; i < n; i++) {
      const diff1 = r1[i] - mean1;
      const diff2 = r2[i] - mean2;
      covariance += diff1 * diff2;
      var1 += diff1 * diff1;
      var2 += diff2 * diff2;
    }
    const denominator = Math.sqrt(var1 * var2);
    return denominator === 0 ? 0 : covariance / denominator;
  }

  calculateSpread(price1: number, price2: number, useRatio: boolean = true): number {
    if (useRatio) return price2 > 0 ? price1 / price2 : 0;
    return price1 - price2;
  }

  findCorrelationPairs(assets: AssetPriceHistory[]): CorrelationPair[] {
    const pairs: CorrelationPair[] = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];
        const correlation = this.calculateCorrelation(asset1.returns, asset2.returns);
        if (Math.abs(correlation) >= this.minCorrelation) {
          const minLen = Math.min(asset1.prices.length, asset2.prices.length);
          const spreadHistory: number[] = [];
          for (let k = 0; k < minLen; k++) {
            const idx1 = asset1.prices.length - minLen + k;
            const idx2 = asset2.prices.length - minLen + k;
            spreadHistory.push(this.calculateSpread(asset1.prices[idx1], asset2.prices[idx2]));
          }
          const { mean: historicalMean, std: historicalStd } = this.calculateRollingStats(spreadHistory, this.lookbackPeriod);
          const currentSpread = spreadHistory[spreadHistory.length - 1] || 0;
          const zScore = this.calculateZScore(currentSpread, historicalMean, historicalStd);
          pairs.push({ asset1: asset1.symbol, asset2: asset2.symbol, correlation, historicalMean, historicalStd, currentSpread, zScore });
        }
      }
    }
    return pairs.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  findArbitrageOpportunities(pairs: CorrelationPair[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    for (const pair of pairs) {
      if (Math.abs(pair.zScore) < this.zScoreThreshold) continue;
      const signal = pair.zScore > 0 ? 'short_spread' : 'long_spread';
      const expectedReturn = Math.abs(pair.zScore - (pair.zScore > 0 ? this.zScoreThreshold : -this.zScoreThreshold)) * pair.historicalStd / pair.currentSpread;
      const confidence = Math.min(0.9, 0.5 + Math.abs(pair.zScore) * 0.1 + Math.abs(pair.correlation) * 0.2);
      let riskLevel: RiskLevel = 'medium';
      if (Math.abs(pair.zScore) > 3) riskLevel = 'high';
      if (Math.abs(pair.zScore) > 4) riskLevel = 'extreme';
      const trades = [];
      if (signal === 'short_spread') {
        trades.push({ symbol: pair.asset1, action: 'sell' as const, weight: 0.5, reasoning: 'Z-Score ' + pair.zScore.toFixed(2) + ' indicates ' + pair.asset1 + ' is overvalued relative to ' + pair.asset2 });
        trades.push({ symbol: pair.asset2, action: 'buy' as const, weight: 0.5, reasoning: 'Z-Score ' + pair.zScore.toFixed(2) + ' indicates ' + pair.asset2 + ' is undervalued relative to ' + pair.asset1 });
      } else {
        trades.push({ symbol: pair.asset1, action: 'buy' as const, weight: 0.5, reasoning: 'Z-Score ' + pair.zScore.toFixed(2) + ' indicates ' + pair.asset1 + ' is undervalued relative to ' + pair.asset2 });
        trades.push({ symbol: pair.asset2, action: 'sell' as const, weight: 0.5, reasoning: 'Z-Score ' + pair.zScore.toFixed(2) + ' indicates ' + pair.asset2 + ' is overvalued relative to ' + pair.asset1 });
      }
      const timeHorizon = Math.abs(pair.zScore) > 3 ? '1-3 days' : Math.abs(pair.zScore) > 2.5 ? '3-7 days' : '1-2 weeks';
      opportunities.push({ pair, signal, confidence, expectedReturn, timeHorizon, riskLevel, trades });
    }
    return opportunities;
  }

  detectInflationHedgePlay(commoditySignal: AgentSignal, relatedAssets: { symbol: string; assetClass: string; correlation: number }[]): InflationHedgePlay | null {
    if (commoditySignal.signal !== 'strong_buy' && commoditySignal.signal !== 'strong_sell') return null;
    const isBullish = commoditySignal.signal === 'strong_buy';
    const triggerAsset = commoditySignal.targetAssets[0] || 'COMMODITY';
    const relatedTrades = relatedAssets.map(asset => {
      const action = isBullish === (asset.correlation > 0) ? 'buy' : 'sell';
      let reasoning = '';
      switch (asset.assetClass) {
        case 'stock': reasoning = isBullish ? 'Mining/producer stocks typically benefit from ' + triggerAsset + ' price increases' : 'High-debt manufacturers face margin pressure from rising ' + triggerAsset + ' costs'; break;
        case 'options': reasoning = isBullish ? 'Sell OTM puts on mining stocks to collect premium with price floor support' : 'Buy protective puts as commodity weakness may spread to related equities'; break;
        case 'crypto': reasoning = isBullish ? '"Digital Gold" assets (BTC) and RWA tokens correlate with inflation spikes' : 'Risk-off sentiment from commodity weakness may pressure crypto'; break;
        default: reasoning = 'Correlation-based trade on ' + triggerAsset + ' signal';
      }
      return { assetClass: asset.assetClass, symbol: asset.symbol, action: action as 'buy' | 'sell', reasoning, expectedCorrelation: asset.correlation };
    });
    const avgCorrelation = relatedAssets.reduce((sum, a) => sum + Math.abs(a.correlation), 0) / relatedAssets.length;
    const overallConfidence = Math.min(0.85, commoditySignal.confidence * 0.6 + avgCorrelation * 0.4);
    return { trigger: triggerAsset + ' ' + (isBullish ? 'Shortage' : 'Surplus') + ' Signal', triggerAsset, triggerSignal: commoditySignal.signal, relatedTrades, overallConfidence, riskLevel: commoditySignal.riskLevel };
  }

  generateArbitrageSignal(opportunities: ArbitrageOpportunity[]): AgentSignal {
    if (opportunities.length === 0) {
      return { agent: 'StatisticalArbitrage', assetClass: 'multi-asset', signal: 'hold', confidence: 0.5, reasoning: 'No significant arbitrage opportunities detected.', indicators: { opportunityCount: 0, avgZScore: 0, bestOpportunity: 'N/A', expectedReturn: 0 }, timestamp: new Date(), targetAssets: [], riskLevel: 'low' };
    }
    const bestOpp = opportunities[0];
    const avgZScore = opportunities.reduce((sum, o) => sum + Math.abs(o.pair.zScore), 0) / opportunities.length;
    const avgExpectedReturn = opportunities.reduce((sum, o) => sum + o.expectedReturn, 0) / opportunities.length;
    let signal: SignalStrength;
    if (opportunities.length >= 3 && avgZScore > 2.5) signal = 'strong_buy';
    else if (opportunities.length >= 2 && avgZScore > 2.0) signal = 'buy';
    else signal = 'hold';
    const confidence = Math.min(0.9, 0.4 + opportunities.length * 0.1 + avgZScore * 0.1);
    let riskLevel: RiskLevel = 'medium';
    if (avgZScore > 3.5) riskLevel = 'extreme';
    else if (avgZScore > 3.0) riskLevel = 'high';
    else if (avgZScore < 2.5) riskLevel = 'low';
    const targetAssets = Array.from(new Set(opportunities.flatMap(o => o.trades.map(t => t.symbol))));
    return { agent: 'StatisticalArbitrage', assetClass: 'multi-asset', signal, confidence, reasoning: 'Found ' + opportunities.length + ' arbitrage opportunities. Best: ' + bestOpp.pair.asset1 + '/' + bestOpp.pair.asset2 + ' with Z-Score ' + bestOpp.pair.zScore.toFixed(2) + '.', indicators: { opportunityCount: opportunities.length, avgZScore, bestOpportunity: bestOpp.pair.asset1 + '/' + bestOpp.pair.asset2, bestZScore: bestOpp.pair.zScore, expectedReturn: avgExpectedReturn, timeHorizon: bestOpp.timeHorizon }, timestamp: new Date(), targetAssets, riskLevel };
  }
}

export const createStatisticalArbitrageCalculator = () => new StatisticalArbitrageCalculator();
