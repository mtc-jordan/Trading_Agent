/**
 * TradoVerse Crypto-Specific AI Agent
 * 
 * Specialized agent for cryptocurrency analysis including:
 * - On-chain metrics analysis
 * - DeFi protocol analysis
 * - Whale activity tracking
 * - Cross-exchange arbitrage detection
 * - Tokenomics evaluation
 */

import type { AgentAnalysis, SignalStrength, MarketData } from './AgentOrchestrator';

export interface CryptoMetrics {
  // On-chain metrics
  activeAddresses: number;
  transactionCount: number;
  averageTransactionValue: number;
  hashRate?: number; // For PoW coins
  stakingRatio?: number; // For PoS coins
  
  // Exchange metrics
  exchangeInflow: number;
  exchangeOutflow: number;
  exchangeReserves: number;
  
  // Whale metrics
  whaleTransactions: number; // Transactions > $100k
  topHolderConcentration: number; // % held by top 100 wallets
  
  // DeFi metrics
  totalValueLocked?: number;
  liquidityDepth?: number;
  yieldRate?: number;
  
  // Market metrics
  fundingRate?: number; // Perpetual futures
  openInterest?: number;
  longShortRatio?: number;
}

export interface TokenomicsData {
  totalSupply: number;
  circulatingSupply: number;
  maxSupply?: number;
  inflationRate: number;
  burnRate?: number;
  vestingSchedule?: {
    nextUnlock: Date;
    unlockAmount: number;
    unlockPercentage: number;
  };
}

/**
 * On-Chain Analysis Agent
 * Analyzes blockchain data for trading signals
 */
export class OnChainAnalysisAgent {
  async analyze(
    symbol: string,
    metrics: CryptoMetrics
  ): Promise<AgentAnalysis> {
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // Exchange Flow Analysis (most important on-chain signal)
    const netFlow = metrics.exchangeInflow - metrics.exchangeOutflow;
    const flowRatio = metrics.exchangeOutflow / (metrics.exchangeInflow || 1);

    if (flowRatio > 1.5) {
      // More outflow than inflow = accumulation
      signal = 'buy';
      confidence += 20;
      reasons.push(`Strong accumulation: ${flowRatio.toFixed(2)}x more outflow than inflow`);
    } else if (flowRatio < 0.7) {
      // More inflow than outflow = distribution
      signal = 'sell';
      confidence += 20;
      reasons.push(`Distribution detected: ${(1/flowRatio).toFixed(2)}x more inflow than outflow`);
    }

    // Active Addresses Analysis
    // Higher active addresses = more network usage = bullish
    if (metrics.activeAddresses > 100000) {
      confidence += 10;
      reasons.push(`High network activity: ${(metrics.activeAddresses / 1000).toFixed(0)}k active addresses`);
      if (signal === 'hold') signal = 'buy';
    } else if (metrics.activeAddresses < 10000) {
      confidence += 5;
      reasons.push(`Low network activity: ${metrics.activeAddresses} active addresses`);
    }

    // Whale Activity Analysis
    if (metrics.whaleTransactions > 50) {
      reasons.push(`High whale activity: ${metrics.whaleTransactions} large transactions`);
      confidence += 8;
      // Whale activity is ambiguous - could be buying or selling
    }

    // Top Holder Concentration (Risk indicator)
    if (metrics.topHolderConcentration > 50) {
      confidence -= 10;
      reasons.push(`High concentration risk: Top 100 wallets hold ${metrics.topHolderConcentration.toFixed(1)}%`);
    } else if (metrics.topHolderConcentration < 20) {
      confidence += 5;
      reasons.push(`Well distributed: Top 100 wallets hold only ${metrics.topHolderConcentration.toFixed(1)}%`);
    }

    // Staking Ratio (for PoS coins)
    if (metrics.stakingRatio !== undefined) {
      if (metrics.stakingRatio > 60) {
        confidence += 10;
        reasons.push(`High staking ratio: ${metrics.stakingRatio.toFixed(1)}% staked (reduced sell pressure)`);
        if (signal === 'hold') signal = 'buy';
      } else if (metrics.stakingRatio < 30) {
        reasons.push(`Low staking ratio: ${metrics.stakingRatio.toFixed(1)}% staked`);
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: 'technical', // Using 'technical' as closest match
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Insufficient on-chain data',
      indicators: {
        exchangeFlowRatio: flowRatio.toFixed(2),
        activeAddresses: metrics.activeAddresses,
        whaleTransactions: metrics.whaleTransactions,
        stakingRatio: metrics.stakingRatio || 'N/A',
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * DeFi Analysis Agent
 * Analyzes DeFi protocol metrics for trading signals
 */
export class DeFiAnalysisAgent {
  async analyze(
    symbol: string,
    metrics: CryptoMetrics
  ): Promise<AgentAnalysis> {
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // Total Value Locked Analysis
    if (metrics.totalValueLocked !== undefined) {
      if (metrics.totalValueLocked > 1_000_000_000) {
        confidence += 15;
        reasons.push(`Strong TVL: $${(metrics.totalValueLocked / 1e9).toFixed(2)}B locked`);
        if (signal === 'hold') signal = 'buy';
      } else if (metrics.totalValueLocked < 10_000_000) {
        confidence -= 10;
        reasons.push(`Low TVL: $${(metrics.totalValueLocked / 1e6).toFixed(2)}M locked`);
      }
    }

    // Liquidity Depth Analysis
    if (metrics.liquidityDepth !== undefined) {
      if (metrics.liquidityDepth > 10_000_000) {
        confidence += 10;
        reasons.push(`Deep liquidity: $${(metrics.liquidityDepth / 1e6).toFixed(2)}M available`);
      } else if (metrics.liquidityDepth < 100_000) {
        confidence -= 15;
        reasons.push(`Shallow liquidity warning: $${(metrics.liquidityDepth / 1e3).toFixed(0)}K available`);
      }
    }

    // Yield Rate Analysis
    if (metrics.yieldRate !== undefined) {
      if (metrics.yieldRate > 20) {
        reasons.push(`High yield: ${metrics.yieldRate.toFixed(1)}% APY (sustainability concern)`);
        confidence -= 5; // High yields can be unsustainable
      } else if (metrics.yieldRate > 5 && metrics.yieldRate <= 20) {
        confidence += 5;
        reasons.push(`Healthy yield: ${metrics.yieldRate.toFixed(1)}% APY`);
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: 'fundamental',
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Insufficient DeFi data',
      indicators: {
        tvl: metrics.totalValueLocked ? `$${(metrics.totalValueLocked / 1e9).toFixed(2)}B` : 'N/A',
        liquidityDepth: metrics.liquidityDepth ? `$${(metrics.liquidityDepth / 1e6).toFixed(2)}M` : 'N/A',
        yieldRate: metrics.yieldRate ? `${metrics.yieldRate.toFixed(1)}%` : 'N/A',
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * Derivatives Analysis Agent
 * Analyzes futures and options data for crypto
 */
export class DerivativesAnalysisAgent {
  async analyze(
    symbol: string,
    metrics: CryptoMetrics
  ): Promise<AgentAnalysis> {
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // Funding Rate Analysis (Perpetual Futures)
    if (metrics.fundingRate !== undefined) {
      if (metrics.fundingRate > 0.1) {
        // Very high positive funding = overleveraged longs
        signal = 'sell';
        confidence += 20;
        reasons.push(`Extreme positive funding (${(metrics.fundingRate * 100).toFixed(3)}%) - overleveraged longs`);
      } else if (metrics.fundingRate < -0.1) {
        // Very negative funding = overleveraged shorts
        signal = 'buy';
        confidence += 20;
        reasons.push(`Extreme negative funding (${(metrics.fundingRate * 100).toFixed(3)}%) - overleveraged shorts`);
      } else if (metrics.fundingRate > 0.03) {
        reasons.push(`Positive funding (${(metrics.fundingRate * 100).toFixed(3)}%) - bullish bias`);
        confidence += 5;
      } else if (metrics.fundingRate < -0.03) {
        reasons.push(`Negative funding (${(metrics.fundingRate * 100).toFixed(3)}%) - bearish bias`);
        confidence += 5;
      }
    }

    // Open Interest Analysis
    if (metrics.openInterest !== undefined) {
      // High OI with price increase = strong trend
      // High OI with price decrease = potential capitulation
      reasons.push(`Open Interest: $${(metrics.openInterest / 1e9).toFixed(2)}B`);
    }

    // Long/Short Ratio Analysis
    if (metrics.longShortRatio !== undefined) {
      if (metrics.longShortRatio > 2) {
        // Too many longs - contrarian sell
        signal = 'sell';
        confidence += 15;
        reasons.push(`Crowded long: ${metrics.longShortRatio.toFixed(2)} L/S ratio (contrarian sell)`);
      } else if (metrics.longShortRatio < 0.5) {
        // Too many shorts - contrarian buy
        signal = 'buy';
        confidence += 15;
        reasons.push(`Crowded short: ${metrics.longShortRatio.toFixed(2)} L/S ratio (contrarian buy)`);
      } else {
        reasons.push(`Balanced positioning: ${metrics.longShortRatio.toFixed(2)} L/S ratio`);
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: 'sentiment',
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Insufficient derivatives data',
      indicators: {
        fundingRate: metrics.fundingRate ? `${(metrics.fundingRate * 100).toFixed(3)}%` : 'N/A',
        openInterest: metrics.openInterest ? `$${(metrics.openInterest / 1e9).toFixed(2)}B` : 'N/A',
        longShortRatio: metrics.longShortRatio?.toFixed(2) || 'N/A',
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * Tokenomics Analysis Agent
 * Evaluates token economics for long-term value
 */
export class TokenomicsAnalysisAgent {
  async analyze(
    symbol: string,
    tokenomics: TokenomicsData
  ): Promise<AgentAnalysis> {
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // Supply Analysis
    const circulatingRatio = tokenomics.circulatingSupply / tokenomics.totalSupply;
    
    if (circulatingRatio > 0.9) {
      confidence += 10;
      reasons.push(`${(circulatingRatio * 100).toFixed(1)}% of supply circulating - minimal dilution risk`);
    } else if (circulatingRatio < 0.3) {
      confidence -= 15;
      signal = 'sell';
      reasons.push(`Only ${(circulatingRatio * 100).toFixed(1)}% circulating - high dilution risk`);
    }

    // Inflation Analysis
    if (tokenomics.inflationRate > 10) {
      confidence -= 10;
      reasons.push(`High inflation: ${tokenomics.inflationRate.toFixed(1)}% annual`);
      if (signal === 'hold') signal = 'sell';
    } else if (tokenomics.inflationRate < 2) {
      confidence += 5;
      reasons.push(`Low inflation: ${tokenomics.inflationRate.toFixed(1)}% annual`);
    }

    // Burn Mechanism
    if (tokenomics.burnRate && tokenomics.burnRate > 0) {
      confidence += 8;
      reasons.push(`Deflationary: ${tokenomics.burnRate.toFixed(2)}% burn rate`);
      if (signal === 'hold') signal = 'buy';
    }

    // Vesting Schedule Analysis
    if (tokenomics.vestingSchedule) {
      const daysUntilUnlock = Math.ceil(
        (tokenomics.vestingSchedule.nextUnlock.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilUnlock < 30 && tokenomics.vestingSchedule.unlockPercentage > 5) {
        confidence -= 15;
        signal = 'sell';
        reasons.push(`Warning: ${tokenomics.vestingSchedule.unlockPercentage.toFixed(1)}% unlock in ${daysUntilUnlock} days`);
      } else if (daysUntilUnlock > 180) {
        confidence += 5;
        reasons.push('No significant unlocks in next 6 months');
      }
    }

    // Max Supply Analysis
    if (tokenomics.maxSupply) {
      const percentOfMax = (tokenomics.circulatingSupply / tokenomics.maxSupply) * 100;
      if (percentOfMax > 80) {
        confidence += 5;
        reasons.push(`${percentOfMax.toFixed(1)}% of max supply reached - scarcity factor`);
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: 'fundamental',
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Insufficient tokenomics data',
      indicators: {
        circulatingRatio: `${(circulatingRatio * 100).toFixed(1)}%`,
        inflationRate: `${tokenomics.inflationRate.toFixed(1)}%`,
        burnRate: tokenomics.burnRate ? `${tokenomics.burnRate.toFixed(2)}%` : 'N/A',
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * Crypto Market Coordinator
 * Combines all crypto-specific agents for comprehensive analysis
 */
export class CryptoMarketCoordinator {
  private onChainAgent: OnChainAnalysisAgent;
  private defiAgent: DeFiAnalysisAgent;
  private derivativesAgent: DerivativesAnalysisAgent;
  private tokenomicsAgent: TokenomicsAnalysisAgent;

  constructor() {
    this.onChainAgent = new OnChainAnalysisAgent();
    this.defiAgent = new DeFiAnalysisAgent();
    this.derivativesAgent = new DerivativesAnalysisAgent();
    this.tokenomicsAgent = new TokenomicsAnalysisAgent();
  }

  async analyzeComprehensive(
    symbol: string,
    metrics: CryptoMetrics,
    tokenomics?: TokenomicsData
  ): Promise<{
    overallSignal: SignalStrength;
    confidence: number;
    analyses: AgentAnalysis[];
    summary: string;
  }> {
    const analyses: AgentAnalysis[] = [];

    // Run all analyses
    const onChainAnalysis = await this.onChainAgent.analyze(symbol, metrics);
    analyses.push(onChainAnalysis);

    const defiAnalysis = await this.defiAgent.analyze(symbol, metrics);
    analyses.push(defiAnalysis);

    const derivativesAnalysis = await this.derivativesAgent.analyze(symbol, metrics);
    analyses.push(derivativesAnalysis);

    if (tokenomics) {
      const tokenomicsAnalysis = await this.tokenomicsAgent.analyze(symbol, tokenomics);
      analyses.push(tokenomicsAnalysis);
    }

    // Calculate weighted consensus
    const signalToScore: Record<SignalStrength, number> = {
      'strong_buy': 2,
      'buy': 1,
      'hold': 0,
      'sell': -1,
      'strong_sell': -2,
    };

    // Weights: On-chain (35%), Derivatives (30%), DeFi (20%), Tokenomics (15%)
    const weights = [0.35, 0.20, 0.30, 0.15];
    let totalWeight = 0;
    let weightedScore = 0;
    let totalConfidence = 0;

    analyses.forEach((analysis, index) => {
      const weight = weights[index] || 0.1;
      const adjustedWeight = weight * (analysis.confidence / 100);
      totalWeight += adjustedWeight;
      weightedScore += signalToScore[analysis.signal] * adjustedWeight;
      totalConfidence += analysis.confidence * weight;
    });

    const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const avgConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 50;

    // Convert score to signal
    let overallSignal: SignalStrength;
    if (avgScore >= 1.5) overallSignal = 'strong_buy';
    else if (avgScore >= 0.5) overallSignal = 'buy';
    else if (avgScore <= -1.5) overallSignal = 'strong_sell';
    else if (avgScore <= -0.5) overallSignal = 'sell';
    else overallSignal = 'hold';

    // Generate summary
    const summary = analyses
      .map(a => `${a.agentType}: ${a.signal} (${a.confidence}%)`)
      .join(' | ');

    return {
      overallSignal,
      confidence: avgConfidence,
      analyses,
      summary,
    };
  }
}

// Export singleton
export const cryptoCoordinator = new CryptoMarketCoordinator();
