/**
 * TradoVerse Unified Multi-Asset Orchestrator
 * 
 * Coordinates AI analysis across all asset types:
 * - Stocks (7 specialized agents)
 * - Crypto (5 specialized agents)
 * - Options (4 specialized agents)
 * - Forex (currency analysis)
 * - Commodities (supply/demand analysis)
 */

import type { SignalStrength } from './AgentOrchestrator';
import { agentOrchestrator } from './AgentOrchestrator';
import { EnhancedCryptoOrchestrator, type CryptoAnalysisInput, type CryptoAssetCategory } from './EnhancedCryptoAgents';
import { OptionsAnalysisOrchestrator, type OptionsAnalysisInput } from './OptionsAnalysisAgents';

// ==================== TYPES ====================

export type MultiAssetType = 'stock' | 'crypto' | 'options' | 'forex' | 'commodity';

export interface MultiAssetInput {
  symbol: string;
  assetType: MultiAssetType;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d?: number;
  volume24h: number;
  marketCap?: number;
  
  stockData?: {
    sector: string;
    industry: string;
    peRatio?: number;
    earningsGrowth?: number;
    dividendYield?: number;
  };
  
  cryptoData?: CryptoAnalysisInput;
  optionsData?: OptionsAnalysisInput;
  
  forexData?: {
    baseCurrency: string;
    quoteCurrency: string;
    interestRateDiff: number;
    centralBankBias: 'hawkish' | 'neutral' | 'dovish';
    cotPositioning: number;
  };
  
  commodityData?: {
    commodityType: 'energy' | 'metals' | 'agriculture' | 'livestock';
    inventoryLevels: number;
    seasonalPattern: number;
    supplyDisruption: boolean;
  };
}

export interface MultiAssetAnalysisResult {
  symbol: string;
  assetType: MultiAssetType;
  overallSignal: SignalStrength;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  analyses: {
    agentName: string;
    signal: SignalStrength;
    confidence: number;
    reasoning: string;
  }[];
  keyMetrics: Record<string, any>;
  recommendation: string;
  timestamp: number;
}

// ==================== ASSET DETECTION ====================

export function detectAssetType(symbol: string): MultiAssetType {
  // Crypto detection: BTC-USD, ETH-USD, BTCUSD, etc.
  if (symbol.includes('-USD') || symbol.includes('USDT') || /^(BTC|ETH|XRP|SOL|ADA|DOT|DOGE|SHIB|AVAX|LINK|MATIC|UNI|AAVE|LTC|BCH)[A-Z]*$/.test(symbol)) return 'crypto';
  
  // Options detection: AAPL240119C00150000
  if (/^[A-Z]+\d{6}[CP]\d{8}$/.test(symbol)) return 'options';
  
  // Forex detection: EUR/USD, EURUSD, GBP/JPY
  const forexPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
  if (symbol.includes('/') && forexPairs.some(c => symbol.includes(c))) return 'forex';
  if (/^(EUR|GBP|USD|JPY|CHF|AUD|CAD|NZD){2}$/.test(symbol)) return 'forex';
  
  // Commodity detection: GC=F, CL=F, SI=F
  if (symbol.includes('=F')) return 'commodity';
  return 'stock';
}

export function detectCryptoCategory(symbol: string): CryptoAssetCategory {
  const layer1 = ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'ATOM'];
  const layer2 = ['ARB', 'OP', 'MATIC', 'IMX'];
  const defi = ['UNI', 'AAVE', 'MKR', 'CRV', 'COMP', 'SNX'];
  const meme = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'];
  const stablecoin = ['USDT', 'USDC', 'DAI', 'BUSD'];
  
  const base = symbol.split('-')[0].split('/')[0].toUpperCase();
  
  if (layer1.includes(base)) return 'layer1';
  if (layer2.includes(base)) return 'layer2';
  if (defi.includes(base)) return 'defi';
  if (meme.includes(base)) return 'meme';
  if (stablecoin.includes(base)) return 'stablecoin';
  return 'unknown';
}

// ==================== FOREX AGENT ====================

export class ForexAnalysisAgent {
  async analyze(input: MultiAssetInput): Promise<{
    signal: SignalStrength;
    confidence: number;
    reasoning: string;
    details: Record<string, any>;
  }> {
    const forex = input.forexData;
    if (!forex) return { signal: 'hold', confidence: 30, reasoning: 'No forex data', details: {} };

    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (forex.interestRateDiff > 2) {
      signal = 'buy';
      confidence += 20;
      reasons.push(`Positive carry trade (${forex.interestRateDiff}% rate diff)`);
    } else if (forex.interestRateDiff < -2) {
      signal = 'sell';
      confidence += 20;
      reasons.push(`Negative carry trade`);
    }
    details.interestRateDiff = forex.interestRateDiff;

    if (forex.centralBankBias === 'hawkish') {
      if (signal !== 'sell') signal = 'buy';
      confidence += 15;
      reasons.push('Hawkish central bank stance');
    } else if (forex.centralBankBias === 'dovish') {
      if (signal !== 'buy') signal = 'sell';
      confidence += 15;
      reasons.push('Dovish central bank stance');
    }
    details.centralBankBias = forex.centralBankBias;
    details.cotPositioning = forex.cotPositioning;

    return {
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Forex analysis neutral',
      details
    };
  }
}

// ==================== COMMODITY AGENT ====================

export class CommodityAnalysisAgent {
  async analyze(input: MultiAssetInput): Promise<{
    signal: SignalStrength;
    confidence: number;
    reasoning: string;
    details: Record<string, any>;
  }> {
    const commodity = input.commodityData;
    if (!commodity) return { signal: 'hold', confidence: 30, reasoning: 'No commodity data', details: {} };

    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (commodity.inventoryLevels < 30) {
      signal = 'buy';
      confidence += 20;
      reasons.push(`Low inventory levels (${commodity.inventoryLevels}%)`);
    } else if (commodity.inventoryLevels > 70) {
      signal = 'sell';
      confidence += 20;
      reasons.push(`High inventory levels`);
    }
    details.inventoryLevels = commodity.inventoryLevels;

    if (commodity.supplyDisruption) {
      signal = 'strong_buy';
      confidence += 25;
      reasons.push('Supply disruption detected');
    }
    details.supplyDisruption = commodity.supplyDisruption;
    details.commodityType = commodity.commodityType;

    return {
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Commodity analysis neutral',
      details
    };
  }
}

// ==================== UNIFIED ORCHESTRATOR ====================

export class UnifiedMultiAssetOrchestrator {
  private stockOrchestrator = agentOrchestrator;
  private cryptoOrchestrator = new EnhancedCryptoOrchestrator();
  private optionsOrchestrator = new OptionsAnalysisOrchestrator();
  private forexAgent = new ForexAnalysisAgent();
  private commodityAgent = new CommodityAnalysisAgent();

  async analyze(input: MultiAssetInput): Promise<MultiAssetAnalysisResult> {
    const assetType = input.assetType || detectAssetType(input.symbol);
    
    switch (assetType) {
      case 'stock': return this.analyzeStock(input);
      case 'crypto': return this.analyzeCrypto(input);
      case 'options': return this.analyzeOptions(input);
      case 'forex': return this.analyzeForex(input);
      case 'commodity': return this.analyzeCommodity(input);
      default: return this.analyzeStock(input);
    }
  }

  private async analyzeStock(input: MultiAssetInput): Promise<MultiAssetAnalysisResult> {
    const marketData = {
      symbol: input.symbol,
      assetType: 'stock' as const,
      currentPrice: input.currentPrice,
      priceHistory: [],
      volume: input.volume24h,
      marketCap: input.marketCap,
      technicalIndicators: {
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        ema20: input.currentPrice,
        ema50: input.currentPrice,
        bollingerBands: { upper: input.currentPrice * 1.02, middle: input.currentPrice, lower: input.currentPrice * 0.98 },
        atr: input.currentPrice * 0.02
      },
      fundamentals: {
        peRatio: input.stockData?.peRatio || 20,
        earningsGrowth: input.stockData?.earningsGrowth || 0,
        revenueGrowth: 0,
        debtToEquity: 0.5,
        roe: 15,
        freeCashFlow: 0
      },
      sentiment: { newsScore: 50, socialScore: 50, analystRating: 3, insiderActivity: 0 },
      riskMetrics: { beta: 1, volatility: 20, maxDrawdown: 10, sharpeRatio: 1 }
    };
    const portfolioContext = { currentPosition: { quantity: 0, averagePrice: 0, unrealizedPnL: 0 }, portfolioValue: 100000, riskTolerance: 'moderate' as const, maxPositionSize: 0.1, availableCash: 100000, maxDrawdown: 0.2, currentDrawdown: 0 };
    const result = await this.stockOrchestrator.orchestrate(marketData, portfolioContext);

    return {
      symbol: input.symbol,
      assetType: 'stock',
      overallSignal: result.finalSignal,
      confidence: result.overallConfidence,
      riskLevel: result.riskApproved ? 'medium' : 'high',
      analyses: result.agentVotes.map((v: any) => ({
        agentName: v.agentType,
        signal: v.signal,
        confidence: v.confidence,
        reasoning: v.reasoning
      })),
      keyMetrics: {
        sector: input.stockData?.sector,
        peRatio: input.stockData?.peRatio,
        dividendYield: input.stockData?.dividendYield
      },
      recommendation: result.reasoning,
      timestamp: Date.now()
    };
  }

  private async analyzeCrypto(input: MultiAssetInput): Promise<MultiAssetAnalysisResult> {
    const cryptoInput: CryptoAnalysisInput = input.cryptoData || {
      symbol: input.symbol,
      category: detectCryptoCategory(input.symbol),
      currentPrice: input.currentPrice,
      priceChange24h: input.priceChange24h,
      priceChange7d: input.priceChange7d || 0,
      volume24h: input.volume24h,
      marketCap: input.marketCap || 0
    };

    const result = await this.cryptoOrchestrator.analyze(cryptoInput);

    return {
      symbol: input.symbol,
      assetType: 'crypto',
      overallSignal: result.overallSignal,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      analyses: result.analyses.map(a => ({
        agentName: a.agentName,
        signal: a.signal,
        confidence: a.confidence,
        reasoning: a.reasoning
      })),
      keyMetrics: result.keyMetrics,
      recommendation: result.recommendation,
      timestamp: Date.now()
    };
  }

  private async analyzeOptions(input: MultiAssetInput): Promise<MultiAssetAnalysisResult> {
    if (!input.optionsData) {
      return {
        symbol: input.symbol,
        assetType: 'options',
        overallSignal: 'hold',
        confidence: 30,
        riskLevel: 'high',
        analyses: [],
        keyMetrics: {},
        recommendation: 'Insufficient options data',
        timestamp: Date.now()
      };
    }

    const result = await this.optionsOrchestrator.analyze(input.optionsData);

    return {
      symbol: input.symbol,
      assetType: 'options',
      overallSignal: result.overallSignal,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      analyses: result.analyses.map(a => ({
        agentName: a.agentName,
        signal: a.signal,
        confidence: a.confidence,
        reasoning: a.reasoning
      })),
      keyMetrics: {
        ivRank: input.optionsData.greeks.ivRank,
        daysToExpiry: input.optionsData.greeks.daysToExpiry,
        delta: input.optionsData.greeks.delta,
        marketOutlook: result.marketOutlook
      },
      recommendation: result.summary,
      timestamp: Date.now()
    };
  }

  private async analyzeForex(input: MultiAssetInput): Promise<MultiAssetAnalysisResult> {
    const result = await this.forexAgent.analyze(input);

    return {
      symbol: input.symbol,
      assetType: 'forex',
      overallSignal: result.signal,
      confidence: result.confidence,
      riskLevel: 'medium',
      analyses: [{
        agentName: 'Forex Analysis',
        signal: result.signal,
        confidence: result.confidence,
        reasoning: result.reasoning
      }],
      keyMetrics: result.details,
      recommendation: result.reasoning,
      timestamp: Date.now()
    };
  }

  private async analyzeCommodity(input: MultiAssetInput): Promise<MultiAssetAnalysisResult> {
    const result = await this.commodityAgent.analyze(input);

    return {
      symbol: input.symbol,
      assetType: 'commodity',
      overallSignal: result.signal,
      confidence: result.confidence,
      riskLevel: result.details.supplyDisruption ? 'high' : 'medium',
      analyses: [{
        agentName: 'Commodity Analysis',
        signal: result.signal,
        confidence: result.confidence,
        reasoning: result.reasoning
      }],
      keyMetrics: result.details,
      recommendation: result.reasoning,
      timestamp: Date.now()
    };
  }

  async analyzePortfolio(assets: MultiAssetInput[]): Promise<{
    overallRisk: 'low' | 'medium' | 'high' | 'extreme';
    diversificationScore: number;
    assetAllocation: Record<MultiAssetType, number>;
    correlationWarnings: string[];
    recommendations: string[];
    individualAnalyses: MultiAssetAnalysisResult[];
  }> {
    const individualAnalyses = await Promise.all(assets.map(asset => this.analyze(asset)));

    const assetAllocation: Record<MultiAssetType, number> = { stock: 0, crypto: 0, options: 0, forex: 0, commodity: 0 };
    for (const asset of assets) {
      const type = asset.assetType || detectAssetType(asset.symbol);
      assetAllocation[type]++;
    }

    const totalAssets = assets.length || 1;
    const weights = Object.values(assetAllocation).map(count => count / totalAssets);
    const hhi = weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    const highRiskCount = individualAnalyses.filter(a => a.riskLevel === 'high' || a.riskLevel === 'extreme').length;
    let overallRisk: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
    if (highRiskCount > totalAssets * 0.5) overallRisk = 'high';
    if (highRiskCount > totalAssets * 0.75) overallRisk = 'extreme';
    if (highRiskCount < totalAssets * 0.2) overallRisk = 'low';

    const correlationWarnings: string[] = [];
    if (assetAllocation.crypto > 2 && assetAllocation.stock > 2) {
      correlationWarnings.push('High crypto-stock correlation during risk-off events');
    }

    const recommendations: string[] = [];
    if (diversificationScore < 50) recommendations.push('Consider diversifying across more asset classes');
    if (assetAllocation.commodity === 0) recommendations.push('Adding commodities could provide inflation hedge');

    return { overallRisk, diversificationScore, assetAllocation, correlationWarnings, recommendations, individualAnalyses };
  }
}
