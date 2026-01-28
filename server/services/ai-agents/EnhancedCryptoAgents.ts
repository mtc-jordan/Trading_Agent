/**
 * TradoVerse Enhanced Crypto Analysis Agents
 * 
 * Comprehensive cryptocurrency analysis including:
 * - Advanced on-chain metrics (MVRV, SOPR, NVT, etc.)
 * - DeFi protocol analysis (TVL, yield farming, liquidity)
 * - NFT market sentiment
 * - Layer 2 activity analysis
 * - Whale tracking and smart money flow
 * - Cross-chain correlation
 * - Stablecoin flow analysis
 */

import type { SignalStrength, AgentType } from './AgentOrchestrator';

// Extended analysis type for crypto agents
export interface CryptoAgentAnalysis {
  agentName: string;
  agentType?: AgentType;
  signal: SignalStrength;
  confidence: number;
  reasoning: string;
  weight: number;
  details: Record<string, any>;
}
import { invokeLLM } from '../../_core/llm';

// ==================== TYPES ====================

export type CryptoAssetCategory = 
  | 'layer1'      // BTC, ETH, SOL, etc.
  | 'layer2'      // ARB, OP, MATIC
  | 'defi'        // UNI, AAVE, MKR
  | 'meme'        // DOGE, SHIB, PEPE
  | 'stablecoin'  // USDT, USDC, DAI
  | 'nft'         // NFT-related tokens
  | 'gaming'      // Gaming tokens
  | 'ai'          // AI-related tokens
  | 'unknown';

export interface AdvancedOnChainMetrics {
  // Valuation Metrics
  mvrv: number;                    // Market Value to Realized Value
  nvtRatio: number;                // Network Value to Transactions
  sopr: number;                    // Spent Output Profit Ratio
  puellMultiple?: number;          // Mining profitability (for PoW)
  
  // Supply Metrics
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  supplyOnExchanges: number;       // % of supply on exchanges
  supplyInSmartContracts: number;  // % locked in DeFi
  
  // Activity Metrics
  activeAddresses24h: number;
  newAddresses24h: number;
  transactionCount24h: number;
  averageTransactionValue: number;
  medianTransactionValue: number;
  
  // Holder Distribution
  addressesWithBalance: {
    moreThan1: number;
    moreThan10: number;
    moreThan100: number;
    moreThan1000: number;
    moreThan10000: number;
  };
  
  // Whale Metrics
  whaleTransactions24h: number;    // > $100k
  topHolderConcentration: number;  // Top 100 wallets %
  institutionalHoldings?: number;  // Known institutional %
  
  // Network Health
  hashRate?: number;               // For PoW
  stakingRatio?: number;           // For PoS
  validatorCount?: number;
  networkFees24h: number;
}

export interface DeFiMetrics {
  // Protocol Metrics
  totalValueLocked: number;
  tvlChange24h: number;
  tvlChange7d: number;
  
  // Liquidity
  liquidityDepth: number;
  slippageAt100k: number;          // % slippage for $100k trade
  slippageAt1m: number;            // % slippage for $1M trade
  
  // Yield
  stakingAPY?: number;
  liquidityMiningAPY?: number;
  lendingAPY?: number;
  borrowingAPY?: number;
  
  // Protocol Health
  protocolRevenue24h?: number;
  protocolRevenue7d?: number;
  uniqueUsers24h: number;
  transactionCount24h: number;
  
  // Risk Metrics
  smartContractRisk: 'low' | 'medium' | 'high';
  auditStatus: 'audited' | 'partial' | 'unaudited';
  timeInMarket: number;            // Days since launch
}

export interface DerivativesMetrics {
  // Futures
  openInterest: number;
  openInterestChange24h: number;
  fundingRate: number;
  fundingRateHistory: number[];    // Last 7 days
  
  // Options (if available)
  optionsOpenInterest?: number;
  putCallRatio?: number;
  maxPainPrice?: number;
  
  // Liquidations
  longLiquidations24h: number;
  shortLiquidations24h: number;
  
  // Positioning
  longShortRatio: number;
  topTraderLongRatio: number;
  retailLongRatio: number;
}

export interface SocialMetrics {
  // Social Engagement
  twitterFollowers: number;
  twitterMentions24h: number;
  redditSubscribers: number;
  redditActiveUsers: number;
  telegramMembers: number;
  discordMembers: number;
  
  // Sentiment
  overallSentiment: number;        // 0-100
  sentimentChange24h: number;
  fearGreedIndex: number;
  
  // Developer Activity
  githubCommits30d: number;
  githubContributors: number;
  githubStars: number;
}

export interface CryptoAnalysisInput {
  symbol: string;
  category: CryptoAssetCategory;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  marketCap: number;
  onChain?: AdvancedOnChainMetrics;
  defi?: DeFiMetrics;
  derivatives?: DerivativesMetrics;
  social?: SocialMetrics;
}

// ==================== AGENTS ====================

/**
 * Advanced On-Chain Analysis Agent
 * Uses sophisticated on-chain metrics for signal generation
 */
export class AdvancedOnChainAgent {
  private agentName = 'On-Chain Analysis';
  private weight = 0.25;

  async analyze(input: CryptoAnalysisInput): Promise<CryptoAgentAnalysis> {
    const metrics = input.onChain;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (!metrics) {
      return {
        agentName: this.agentName,
        signal: 'hold',
        confidence: 30,
        reasoning: 'Insufficient on-chain data available',
        weight: this.weight,
        details: {}
      };
    }

    // MVRV Analysis
    if (metrics.mvrv < 1) {
      signal = 'strong_buy';
      confidence += 20;
      reasons.push(`MVRV below 1 (${metrics.mvrv.toFixed(2)}) indicates undervaluation`);
    } else if (metrics.mvrv > 3.5) {
      signal = 'strong_sell';
      confidence += 20;
      reasons.push(`MVRV above 3.5 (${metrics.mvrv.toFixed(2)}) indicates overvaluation`);
    }
    details.mvrv = metrics.mvrv;

    // SOPR Analysis
    if (metrics.sopr < 0.97) {
      if (signal !== 'strong_sell') signal = 'buy';
      confidence += 10;
      reasons.push(`SOPR below 0.97 (${metrics.sopr.toFixed(3)}) - holders selling at loss, potential capitulation`);
    } else if (metrics.sopr > 1.05) {
      if (signal !== 'strong_buy') signal = 'sell';
      confidence += 10;
      reasons.push(`SOPR above 1.05 (${metrics.sopr.toFixed(3)}) - profit taking occurring`);
    }
    details.sopr = metrics.sopr;

    // Exchange Flow Analysis
    if (metrics.supplyOnExchanges < 10) {
      confidence += 10;
      reasons.push(`Low exchange supply (${metrics.supplyOnExchanges.toFixed(1)}%) - bullish accumulation`);
    } else if (metrics.supplyOnExchanges > 20) {
      confidence -= 10;
      reasons.push(`High exchange supply (${metrics.supplyOnExchanges.toFixed(1)}%) - potential selling pressure`);
    }
    details.exchangeSupply = metrics.supplyOnExchanges;

    // Active Address Analysis
    const addressGrowth = metrics.newAddresses24h / metrics.activeAddresses24h;
    if (addressGrowth > 0.1) {
      confidence += 5;
      reasons.push(`Strong new address growth (${(addressGrowth * 100).toFixed(1)}%)`);
    }
    details.addressGrowth = addressGrowth;

    // Whale Activity
    if (metrics.whaleTransactions24h > 100) {
      reasons.push(`High whale activity (${metrics.whaleTransactions24h} large transactions)`);
      details.whaleActivity = 'high';
    }

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'On-chain metrics neutral',
      weight: this.weight,
      details
    };
  }
}

/**
 * DeFi Protocol Analysis Agent
 * Analyzes DeFi-specific metrics for protocol tokens
 */
export class DeFiAnalysisAgent {
  private agentName = 'DeFi Analysis';
  private weight = 0.20;

  async analyze(input: CryptoAnalysisInput): Promise<CryptoAgentAnalysis> {
    const metrics = input.defi;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (!metrics) {
      return {
        agentName: this.agentName,
        signal: 'hold',
        confidence: 30,
        reasoning: 'No DeFi metrics available',
        weight: this.weight,
        details: {}
      };
    }

    // TVL Analysis
    if (metrics.tvlChange24h > 5) {
      signal = 'buy';
      confidence += 15;
      reasons.push(`TVL growing strongly (+${metrics.tvlChange24h.toFixed(1)}% 24h)`);
    } else if (metrics.tvlChange24h < -10) {
      signal = 'sell';
      confidence += 15;
      reasons.push(`TVL declining sharply (${metrics.tvlChange24h.toFixed(1)}% 24h)`);
    }
    details.tvlChange = metrics.tvlChange24h;

    // Yield Analysis
    if (metrics.stakingAPY && metrics.stakingAPY > 10) {
      confidence += 10;
      reasons.push(`Attractive staking yield (${metrics.stakingAPY.toFixed(1)}% APY)`);
    }
    details.stakingAPY = metrics.stakingAPY;

    // Protocol Health
    if (metrics.smartContractRisk === 'low' && metrics.auditStatus === 'audited') {
      confidence += 10;
      reasons.push('Strong security profile (audited, low risk)');
    } else if (metrics.smartContractRisk === 'high' || metrics.auditStatus === 'unaudited') {
      confidence -= 15;
      reasons.push('Security concerns (unaudited or high risk)');
    }
    details.securityProfile = { risk: metrics.smartContractRisk, audit: metrics.auditStatus };

    // User Growth
    if (metrics.uniqueUsers24h > 10000) {
      confidence += 5;
      reasons.push(`Strong user activity (${metrics.uniqueUsers24h.toLocaleString()} users 24h)`);
    }
    details.uniqueUsers = metrics.uniqueUsers24h;

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'DeFi metrics neutral',
      weight: this.weight,
      details
    };
  }
}

/**
 * Whale Tracking Agent
 * Monitors large holder behavior and smart money flow
 */
export class WhaleTrackingAgent {
  private agentName = 'Whale Tracking';
  private weight = 0.20;

  async analyze(input: CryptoAnalysisInput): Promise<CryptoAgentAnalysis> {
    const metrics = input.onChain;
    const derivatives = input.derivatives;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (!metrics) {
      return {
        agentName: this.agentName,
        signal: 'hold',
        confidence: 30,
        reasoning: 'Insufficient whale data available',
        weight: this.weight,
        details: {}
      };
    }

    // Whale Transaction Analysis
    if (metrics.whaleTransactions24h > 200) {
      confidence += 10;
      reasons.push(`Very high whale activity (${metrics.whaleTransactions24h} transactions)`);
      details.whaleActivityLevel = 'very_high';
    } else if (metrics.whaleTransactions24h > 100) {
      confidence += 5;
      reasons.push(`High whale activity (${metrics.whaleTransactions24h} transactions)`);
      details.whaleActivityLevel = 'high';
    }

    // Top Holder Concentration
    if (metrics.topHolderConcentration > 50) {
      confidence -= 10;
      reasons.push(`High concentration risk (top 100 hold ${metrics.topHolderConcentration.toFixed(1)}%)`);
      details.concentrationRisk = 'high';
    } else if (metrics.topHolderConcentration < 20) {
      confidence += 5;
      reasons.push(`Well distributed (top 100 hold ${metrics.topHolderConcentration.toFixed(1)}%)`);
      details.concentrationRisk = 'low';
    }

    // Institutional Holdings
    if (metrics.institutionalHoldings && metrics.institutionalHoldings > 10) {
      confidence += 10;
      reasons.push(`Strong institutional presence (${metrics.institutionalHoldings.toFixed(1)}%)`);
      details.institutionalPresence = 'strong';
    }

    // Derivatives Positioning (if available)
    if (derivatives) {
      if (derivatives.longShortRatio > 1.5) {
        signal = 'buy';
        confidence += 10;
        reasons.push(`Whales heavily long (L/S ratio: ${derivatives.longShortRatio.toFixed(2)})`);
      } else if (derivatives.longShortRatio < 0.7) {
        signal = 'sell';
        confidence += 10;
        reasons.push(`Whales heavily short (L/S ratio: ${derivatives.longShortRatio.toFixed(2)})`);
      }
      details.longShortRatio = derivatives.longShortRatio;
    }

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Whale metrics neutral',
      weight: this.weight,
      details
    };
  }
}

/**
 * Derivatives Analysis Agent
 * Analyzes futures and options data for crypto
 */
export class CryptoDerivativesAgent {
  private agentName = 'Crypto Derivatives';
  private weight = 0.20;

  async analyze(input: CryptoAnalysisInput): Promise<CryptoAgentAnalysis> {
    const metrics = input.derivatives;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (!metrics) {
      return {
        agentName: this.agentName,
        signal: 'hold',
        confidence: 30,
        reasoning: 'No derivatives data available',
        weight: this.weight,
        details: {}
      };
    }

    // Funding Rate Analysis
    if (metrics.fundingRate > 0.05) {
      signal = 'sell';
      confidence += 15;
      reasons.push(`Extreme positive funding (${(metrics.fundingRate * 100).toFixed(2)}%) - overleveraged longs`);
    } else if (metrics.fundingRate < -0.03) {
      signal = 'buy';
      confidence += 15;
      reasons.push(`Negative funding (${(metrics.fundingRate * 100).toFixed(2)}%) - shorts paying longs`);
    }
    details.fundingRate = metrics.fundingRate;

    // Open Interest Analysis
    if (metrics.openInterestChange24h > 20) {
      confidence += 10;
      reasons.push(`OI surge (+${metrics.openInterestChange24h.toFixed(1)}%) - new money entering`);
    } else if (metrics.openInterestChange24h < -20) {
      confidence += 5;
      reasons.push(`OI dropping (${metrics.openInterestChange24h.toFixed(1)}%) - deleveraging`);
    }
    details.openInterestChange = metrics.openInterestChange24h;

    // Liquidation Analysis
    const totalLiquidations = metrics.longLiquidations24h + metrics.shortLiquidations24h;
    const liquidationRatio = metrics.longLiquidations24h / (totalLiquidations || 1);
    if (liquidationRatio > 0.7) {
      signal = signal === 'hold' ? 'buy' : signal;
      confidence += 10;
      reasons.push(`Heavy long liquidations (${(liquidationRatio * 100).toFixed(0)}%) - potential bottom`);
    } else if (liquidationRatio < 0.3) {
      signal = signal === 'hold' ? 'sell' : signal;
      confidence += 10;
      reasons.push(`Heavy short liquidations (${((1 - liquidationRatio) * 100).toFixed(0)}%) - potential top`);
    }
    details.liquidationRatio = liquidationRatio;

    // Put/Call Ratio (if available)
    if (metrics.putCallRatio) {
      if (metrics.putCallRatio > 1.5) {
        confidence += 5;
        reasons.push(`High put/call ratio (${metrics.putCallRatio.toFixed(2)}) - bearish sentiment`);
      } else if (metrics.putCallRatio < 0.5) {
        confidence += 5;
        reasons.push(`Low put/call ratio (${metrics.putCallRatio.toFixed(2)}) - bullish sentiment`);
      }
      details.putCallRatio = metrics.putCallRatio;
    }

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Derivatives metrics neutral',
      weight: this.weight,
      details
    };
  }
}

/**
 * Social Sentiment Agent for Crypto
 * Analyzes social media and community metrics
 */
export class CryptoSocialAgent {
  private agentName = 'Crypto Social';
  private weight = 0.15;

  async analyze(input: CryptoAnalysisInput): Promise<CryptoAgentAnalysis> {
    const metrics = input.social;
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];
    const details: Record<string, any> = {};

    if (!metrics) {
      return {
        agentName: this.agentName,
        signal: 'hold',
        confidence: 30,
        reasoning: 'No social metrics available',
        weight: this.weight,
        details: {}
      };
    }

    // Overall Sentiment
    if (metrics.overallSentiment > 70) {
      signal = 'buy';
      confidence += 10;
      reasons.push(`Strong positive sentiment (${metrics.overallSentiment}/100)`);
    } else if (metrics.overallSentiment < 30) {
      signal = 'sell';
      confidence += 10;
      reasons.push(`Strong negative sentiment (${metrics.overallSentiment}/100)`);
    }
    details.sentiment = metrics.overallSentiment;

    // Fear & Greed
    if (metrics.fearGreedIndex < 20) {
      signal = 'buy';
      confidence += 15;
      reasons.push(`Extreme fear (${metrics.fearGreedIndex}) - contrarian buy signal`);
    } else if (metrics.fearGreedIndex > 80) {
      signal = 'sell';
      confidence += 15;
      reasons.push(`Extreme greed (${metrics.fearGreedIndex}) - contrarian sell signal`);
    }
    details.fearGreed = metrics.fearGreedIndex;

    // Developer Activity
    if (metrics.githubCommits30d > 100) {
      confidence += 10;
      reasons.push(`Active development (${metrics.githubCommits30d} commits/30d)`);
    } else if (metrics.githubCommits30d < 10) {
      confidence -= 5;
      reasons.push(`Low development activity (${metrics.githubCommits30d} commits/30d)`);
    }
    details.devActivity = metrics.githubCommits30d;

    // Social Growth
    const socialScore = (metrics.twitterMentions24h / 1000) + (metrics.redditActiveUsers / 100);
    if (socialScore > 100) {
      confidence += 5;
      reasons.push('High social engagement');
      details.socialEngagement = 'high';
    }

    return {
      agentName: this.agentName,
      signal,
      confidence: Math.min(95, Math.max(20, confidence)),
      reasoning: reasons.join('. ') || 'Social metrics neutral',
      weight: this.weight,
      details
    };
  }
}

// ==================== ORCHESTRATOR ====================

export class EnhancedCryptoOrchestrator {
  private onChainAgent = new AdvancedOnChainAgent();
  private defiAgent = new DeFiAnalysisAgent();
  private whaleAgent = new WhaleTrackingAgent();
  private derivativesAgent = new CryptoDerivativesAgent();
  private socialAgent = new CryptoSocialAgent();

  async analyze(input: CryptoAnalysisInput): Promise<{
    symbol: string;
    category: CryptoAssetCategory;
    overallSignal: SignalStrength;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    analyses: CryptoAgentAnalysis[];
    summary: string;
    recommendation: string;
    keyMetrics: Record<string, any>;
  }> {
    // Run all agents in parallel
    const [onChain, defi, whale, derivatives, social] = await Promise.all([
      this.onChainAgent.analyze(input),
      this.defiAgent.analyze(input),
      this.whaleAgent.analyze(input),
      this.derivativesAgent.analyze(input),
      this.socialAgent.analyze(input)
    ]);

    const analyses: CryptoAgentAnalysis[] = [onChain, defi, whale, derivatives, social];

    // Calculate weighted consensus
    const signalScores: Record<SignalStrength, number> = {
      strong_buy: 0,
      buy: 0,
      hold: 0,
      sell: 0,
      strong_sell: 0
    };

    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const analysis of analyses) {
      signalScores[analysis.signal] += analysis.weight * analysis.confidence;
      totalWeight += analysis.weight;
      weightedConfidence += analysis.weight * analysis.confidence;
    }

    // Determine overall signal
    let overallSignal: SignalStrength = 'hold';
    let maxScore = 0;
    for (const [signal, score] of Object.entries(signalScores)) {
      if (score > maxScore) {
        maxScore = score;
        overallSignal = signal as SignalStrength;
      }
    }

    const confidence = Math.round(weightedConfidence / totalWeight);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
    if (input.category === 'meme') {
      riskLevel = 'extreme';
    } else if (input.category === 'defi' && input.defi?.smartContractRisk === 'high') {
      riskLevel = 'high';
    } else if (confidence > 75 && (overallSignal === 'buy' || overallSignal === 'strong_buy')) {
      riskLevel = 'low';
    }

    // Generate summary
    const bullishAgents = analyses.filter(a => a.signal === 'buy' || a.signal === 'strong_buy').length;
    const bearishAgents = analyses.filter(a => a.signal === 'sell' || a.signal === 'strong_sell').length;
    
    const summary = `${bullishAgents} of 5 agents bullish, ${bearishAgents} bearish. ` +
      `Overall ${overallSignal} signal with ${confidence}% confidence.`;

    // Generate recommendation
    const recommendation = this.generateRecommendation(overallSignal, confidence, riskLevel, input);

    // Compile key metrics
    const keyMetrics: Record<string, any> = {
      mvrv: input.onChain?.mvrv,
      sopr: input.onChain?.sopr,
      exchangeSupply: input.onChain?.supplyOnExchanges,
      tvl: input.defi?.totalValueLocked,
      fundingRate: input.derivatives?.fundingRate,
      fearGreed: input.social?.fearGreedIndex
    };

    return {
      symbol: input.symbol,
      category: input.category,
      overallSignal,
      confidence,
      riskLevel,
      analyses,
      summary,
      recommendation,
      keyMetrics
    };
  }

  private generateRecommendation(
    signal: SignalStrength,
    confidence: number,
    riskLevel: string,
    input: CryptoAnalysisInput
  ): string {
    if (signal === 'strong_buy' && confidence > 70) {
      return `Strong accumulation opportunity for ${input.symbol}. Consider DCA entry with ${riskLevel} risk profile.`;
    } else if (signal === 'buy') {
      return `Favorable conditions for ${input.symbol}. Consider small position with stop-loss.`;
    } else if (signal === 'strong_sell') {
      return `Exit signal for ${input.symbol}. Consider reducing exposure or hedging.`;
    } else if (signal === 'sell') {
      return `Caution advised for ${input.symbol}. Consider taking profits on existing positions.`;
    }
    return `Neutral outlook for ${input.symbol}. Wait for clearer signals before acting.`;
  }
}
