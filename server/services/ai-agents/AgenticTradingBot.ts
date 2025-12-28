/**
 * TradoVerse Agentic Trading Bot
 * 
 * A sophisticated trading bot powered by 7 specialized AI agents:
 * 1. Technical Analysis Agent - Pattern recognition and indicators
 * 2. Fundamental Analysis Agent - Financial health and valuation
 * 3. Sentiment Analysis Agent - News and social media sentiment
 * 4. Risk Management Agent - Position sizing and drawdown control
 * 5. Market Regime Agent - Market condition classification
 * 6. Execution Agent - Order timing and slippage optimization
 * 7. Meta-Coordinator Agent - Consensus decision making
 * 
 * Based on research from 30+ academic papers including:
 * - StockMARL (Multi-Agent RL for Stock Trading)
 * - MASTER (Market-Guided Stock Transformer)
 * - Deep RL for Portfolio Optimization
 */

import { invokeLLM } from "../../_core/llm";
import { 
  agentOrchestrator, 
  type MarketData, 
  type PortfolioContext,
  type ConsensusDecision,
  type SignalStrength,
  type AgentAnalysis
} from './AgentOrchestrator';
import { cryptoCoordinator, type CryptoMetrics, type TokenomicsData } from './CryptoAgent';
import { calculateAllIndicators, type OHLCV } from './TechnicalIndicators';

// Bot Configuration
export interface BotConfiguration {
  name: string;
  userId: string;
  assetType: 'stock' | 'crypto' | 'both';
  symbols: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxDrawdown: number; // e.g., 0.15 for 15%
  maxPositionSize: number; // e.g., 0.10 for 10% per position
  tradingHours?: { start: number; end: number }; // UTC hours
  enableAutoTrade: boolean;
  minConfidenceThreshold: number; // e.g., 70 for 70%
  consensusRequirement: 'majority' | 'supermajority' | 'unanimous';
}

// Trade Signal
export interface TradeSignal {
  id: string;
  symbol: string;
  assetType: 'stock' | 'crypto';
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  urgency: 'immediate' | 'normal' | 'low';
  reasoning: string;
  agentVotes: AgentVote[];
  consensusDetails: ConsensusDetails;
  timestamp: number;
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
}

export interface AgentVote {
  agentName: string;
  signal: SignalStrength;
  confidence: number;
  weight: number;
  reasoning: string;
}

export interface ConsensusDetails {
  method: 'weighted_voting' | 'majority' | 'supermajority' | 'unanimous';
  totalVotes: number;
  buyVotes: number;
  sellVotes: number;
  holdVotes: number;
  riskApproved: boolean;
  vetoReason?: string;
}

// Bot State
export interface BotState {
  isRunning: boolean;
  lastAnalysis: number;
  totalSignals: number;
  successfulTrades: number;
  failedTrades: number;
  currentDrawdown: number;
  peakValue: number;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
  agentAccuracies: Record<string, number>;
}

/**
 * The main Agentic Trading Bot class
 */
export class AgenticTradingBot {
  private config: BotConfiguration;
  private state: BotState;
  private signalHistory: TradeSignal[] = [];

  constructor(config: BotConfiguration) {
    this.config = config;
    this.state = {
      isRunning: false,
      lastAnalysis: 0,
      totalSignals: 0,
      successfulTrades: 0,
      failedTrades: 0,
      currentDrawdown: 0,
      peakValue: 0,
      performance: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        allTime: 0,
      },
      agentAccuracies: {
        technical: 0.65,
        fundamental: 0.60,
        sentiment: 0.55,
        risk: 0.70,
        regime: 0.58,
        execution: 0.62,
        coordinator: 0.68,
      },
    };
  }

  /**
   * Analyze a single asset and generate a trade signal
   */
  async analyzeAsset(
    marketData: MarketData,
    portfolio: PortfolioContext,
    cryptoMetrics?: CryptoMetrics,
    tokenomics?: TokenomicsData
  ): Promise<TradeSignal> {
    const signalId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Step 1: Calculate technical indicators
    const candles: OHLCV[] = marketData.priceHistory.map(p => ({
      timestamp: p.timestamp,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
    }));
    
    const indicators = calculateAllIndicators(candles);
    
    // Enrich market data with calculated indicators
    const enrichedData: MarketData = {
      ...marketData,
      indicators: {
        rsi: indicators.rsi[indicators.rsi.length - 1],
        macd: {
          value: indicators.macd.macd[indicators.macd.macd.length - 1] || 0,
          signal: indicators.macd.signal[indicators.macd.signal.length - 1] || 0,
          histogram: indicators.macd.histogram[indicators.macd.histogram.length - 1] || 0,
        },
        ema: {
          ema8: indicators.ema.ema8[indicators.ema.ema8.length - 1] || 0,
          ema21: indicators.ema.ema21[indicators.ema.ema21.length - 1] || 0,
          ema50: indicators.ema.ema50[indicators.ema.ema50.length - 1] || 0,
          ema200: indicators.ema.ema200[indicators.ema.ema200.length - 1] || 0,
        },
        bollinger: {
          upper: indicators.bollinger.upper[indicators.bollinger.upper.length - 1] || 0,
          middle: indicators.bollinger.middle[indicators.bollinger.middle.length - 1] || 0,
          lower: indicators.bollinger.lower[indicators.bollinger.lower.length - 1] || 0,
        },
        atr: indicators.atr[indicators.atr.length - 1],
        obv: indicators.obv[indicators.obv.length - 1],
        vwap: indicators.vwap[indicators.vwap.length - 1],
      },
    };

    // Step 2: Get main agent consensus
    const consensus = await agentOrchestrator.orchestrate(enrichedData, portfolio);

    // Step 3: For crypto, also get crypto-specific analysis
    let cryptoAnalysis: { overallSignal: SignalStrength; confidence: number; analyses: AgentAnalysis[] } | null = null;
    if (marketData.assetType === 'crypto' && cryptoMetrics) {
      cryptoAnalysis = await cryptoCoordinator.analyzeComprehensive(
        marketData.symbol,
        cryptoMetrics,
        tokenomics
      );
    }

    // Step 4: Combine analyses using consensus mechanism
    const agentVotes: AgentVote[] = consensus.agentVotes.map(vote => ({
      agentName: vote.agentType,
      signal: vote.signal,
      confidence: vote.confidence,
      weight: this.state.agentAccuracies[vote.agentType] || 0.5,
      reasoning: vote.reasoning,
    }));

    // Add crypto-specific votes if available
    if (cryptoAnalysis) {
      cryptoAnalysis.analyses.forEach(analysis => {
        agentVotes.push({
          agentName: `crypto_${analysis.agentType}`,
          signal: analysis.signal,
          confidence: analysis.confidence,
          weight: 0.55, // Crypto-specific agents get moderate weight
          reasoning: analysis.reasoning,
        });
      });
    }

    // Step 5: Apply consensus mechanism
    const consensusDetails = this.calculateConsensus(agentVotes, consensus.riskApproved);

    // Step 6: Determine final action
    let finalAction: 'buy' | 'sell' | 'hold' = 'hold';
    let finalConfidence = consensus.overallConfidence;

    if (cryptoAnalysis) {
      // Blend stock and crypto signals
      finalConfidence = (consensus.overallConfidence * 0.6 + cryptoAnalysis.confidence * 0.4);
    }

    // Check confidence threshold
    if (finalConfidence >= this.config.minConfidenceThreshold) {
      if (consensusDetails.buyVotes > consensusDetails.sellVotes && consensusDetails.riskApproved) {
        finalAction = 'buy';
      } else if (consensusDetails.sellVotes > consensusDetails.buyVotes) {
        finalAction = 'sell';
      }
    }

    // Step 7: Calculate position size
    let quantity = 0;
    if (finalAction === 'buy') {
      const maxPosition = portfolio.portfolioValue * this.config.maxPositionSize;
      const confidenceMultiplier = finalConfidence / 100;
      quantity = Math.floor((maxPosition * confidenceMultiplier) / marketData.currentPrice);
    } else if (finalAction === 'sell' && portfolio.currentPosition) {
      const sellPercent = consensusDetails.sellVotes > consensusDetails.buyVotes * 1.5 ? 1 : 0.5;
      quantity = Math.floor(portfolio.currentPosition.quantity * sellPercent);
    }

    // Step 8: Calculate stop-loss and take-profit
    const atr = enrichedData.indicators?.atr || marketData.currentPrice * 0.02;
    const stopLossDistance = atr * (this.config.riskTolerance === 'conservative' ? 1.5 : 
                                     this.config.riskTolerance === 'aggressive' ? 3 : 2);
    const stopLoss = finalAction === 'buy' ? marketData.currentPrice - stopLossDistance : undefined;
    const takeProfit = finalAction === 'buy' ? marketData.currentPrice + stopLossDistance * 2 : undefined;

    // Step 9: Build reasoning
    const reasoning = this.buildReasoning(agentVotes, consensusDetails, indicators.patterns);

    const signal: TradeSignal = {
      id: signalId,
      symbol: marketData.symbol,
      assetType: marketData.assetType,
      action: finalAction,
      quantity,
      price: marketData.currentPrice,
      stopLoss,
      takeProfit,
      confidence: finalConfidence,
      urgency: consensus.suggestedAction.urgency,
      reasoning,
      agentVotes,
      consensusDetails,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.signalHistory.push(signal);
    this.state.totalSignals++;
    this.state.lastAnalysis = Date.now();

    return signal;
  }

  /**
   * Calculate consensus from agent votes
   */
  private calculateConsensus(votes: AgentVote[], riskApproved: boolean): ConsensusDetails {
    let buyVotes = 0;
    let sellVotes = 0;
    let holdVotes = 0;

    for (const vote of votes) {
      const weightedVote = vote.weight * (vote.confidence / 100);
      
      switch (vote.signal) {
        case 'strong_buy':
          buyVotes += weightedVote * 2;
          break;
        case 'buy':
          buyVotes += weightedVote;
          break;
        case 'strong_sell':
          sellVotes += weightedVote * 2;
          break;
        case 'sell':
          sellVotes += weightedVote;
          break;
        default:
          holdVotes += weightedVote;
      }
    }

    // Check consensus requirement
    const totalVotes = buyVotes + sellVotes + holdVotes;
    let meetsConsensus = false;

    switch (this.config.consensusRequirement) {
      case 'majority':
        meetsConsensus = Math.max(buyVotes, sellVotes, holdVotes) > totalVotes * 0.5;
        break;
      case 'supermajority':
        meetsConsensus = Math.max(buyVotes, sellVotes, holdVotes) > totalVotes * 0.67;
        break;
      case 'unanimous':
        meetsConsensus = holdVotes === 0 && (buyVotes === 0 || sellVotes === 0);
        break;
    }

    return {
      method: 'weighted_voting',
      totalVotes: votes.length,
      buyVotes,
      sellVotes,
      holdVotes,
      riskApproved: riskApproved && meetsConsensus,
      vetoReason: !riskApproved ? 'Risk agent vetoed due to high risk' : 
                  !meetsConsensus ? `Consensus requirement (${this.config.consensusRequirement}) not met` : undefined,
    };
  }

  /**
   * Build human-readable reasoning from agent analyses
   */
  private buildReasoning(
    votes: AgentVote[], 
    consensus: ConsensusDetails,
    patterns: { name: string; type: string }[]
  ): string {
    const parts: string[] = [];

    // Summarize agent signals
    const bullishAgents = votes.filter(v => v.signal === 'buy' || v.signal === 'strong_buy');
    const bearishAgents = votes.filter(v => v.signal === 'sell' || v.signal === 'strong_sell');

    if (bullishAgents.length > 0) {
      parts.push(`Bullish signals from: ${bullishAgents.map(a => a.agentName).join(', ')}`);
    }
    if (bearishAgents.length > 0) {
      parts.push(`Bearish signals from: ${bearishAgents.map(a => a.agentName).join(', ')}`);
    }

    // Add pattern information
    const recentPatterns = patterns.slice(-3);
    if (recentPatterns.length > 0) {
      parts.push(`Detected patterns: ${recentPatterns.map(p => p.name).join(', ')}`);
    }

    // Add consensus info
    parts.push(`Consensus: ${consensus.buyVotes.toFixed(1)} buy vs ${consensus.sellVotes.toFixed(1)} sell`);

    if (consensus.vetoReason) {
      parts.push(`Note: ${consensus.vetoReason}`);
    }

    return parts.join('. ');
  }

  /**
   * Get enhanced AI analysis with LLM reasoning
   */
  async getEnhancedAnalysis(signal: TradeSignal): Promise<string> {
    const prompt = `You are an expert trading analyst. Analyze this trading signal and provide insights.

Symbol: ${signal.symbol} (${signal.assetType})
Action: ${signal.action.toUpperCase()}
Confidence: ${signal.confidence.toFixed(1)}%
Price: $${signal.price.toFixed(2)}
${signal.stopLoss ? `Stop Loss: $${signal.stopLoss.toFixed(2)}` : ''}
${signal.takeProfit ? `Take Profit: $${signal.takeProfit.toFixed(2)}` : ''}

Agent Analysis Summary:
${signal.agentVotes.map(v => `- ${v.agentName}: ${v.signal} (${v.confidence}%) - ${v.reasoning}`).join('\n')}

Consensus: ${signal.consensusDetails.buyVotes.toFixed(1)} buy vs ${signal.consensusDetails.sellVotes.toFixed(1)} sell
Risk Approved: ${signal.consensusDetails.riskApproved ? 'Yes' : 'No'}

Please provide:
1. A brief market outlook summary
2. Key factors supporting this signal
3. Potential risks to monitor
4. Suggested position management

Keep response concise and actionable.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are an expert trading analyst. Provide concise, actionable insights.' },
          { role: 'user', content: prompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : 'Unable to generate enhanced analysis';
    } catch (error) {
      console.error('Error generating enhanced analysis:', error);
      return 'Enhanced analysis unavailable';
    }
  }

  /**
   * Update agent accuracy based on trade outcome
   */
  updateAgentAccuracy(signal: TradeSignal, wasSuccessful: boolean): void {
    for (const vote of signal.agentVotes) {
      const agentName = vote.agentName;
      const currentAccuracy = this.state.agentAccuracies[agentName] || 0.5;
      
      // Determine if agent was correct
      const agentWasCorrect = 
        (wasSuccessful && (vote.signal === 'buy' || vote.signal === 'strong_buy')) ||
        (!wasSuccessful && (vote.signal === 'sell' || vote.signal === 'strong_sell'));

      // Exponential moving average update
      this.state.agentAccuracies[agentName] = currentAccuracy * 0.95 + (agentWasCorrect ? 0.05 : 0);
    }

    if (wasSuccessful) {
      this.state.successfulTrades++;
    } else {
      this.state.failedTrades++;
    }
  }

  /**
   * Get bot statistics
   */
  getStatistics(): {
    winRate: number;
    totalTrades: number;
    agentPerformance: Record<string, number>;
    bestAgent: string;
    worstAgent: string;
  } {
    const totalTrades = this.state.successfulTrades + this.state.failedTrades;
    const winRate = totalTrades > 0 ? (this.state.successfulTrades / totalTrades) * 100 : 0;

    const agentEntries = Object.entries(this.state.agentAccuracies);
    const sortedAgents = agentEntries.sort((a, b) => b[1] - a[1]);

    return {
      winRate,
      totalTrades,
      agentPerformance: this.state.agentAccuracies,
      bestAgent: sortedAgents[0]?.[0] || 'none',
      worstAgent: sortedAgents[sortedAgents.length - 1]?.[0] || 'none',
    };
  }

  /**
   * Get recent signals
   */
  getRecentSignals(limit: number = 10): TradeSignal[] {
    return this.signalHistory.slice(-limit);
  }

  /**
   * Get configuration
   */
  getConfig(): BotConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BotConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current state
   */
  getState(): BotState {
    return { ...this.state };
  }

  /**
   * Start the bot
   */
  start(): void {
    this.state.isRunning = true;
  }

  /**
   * Stop the bot
   */
  stop(): void {
    this.state.isRunning = false;
  }
}

/**
 * Factory function to create a new trading bot
 */
export function createTradingBot(config: BotConfiguration): AgenticTradingBot {
  return new AgenticTradingBot(config);
}

/**
 * Preset configurations for different trading styles
 */
export const BotPresets = {
  conservative: {
    riskTolerance: 'conservative' as const,
    maxDrawdown: 0.10,
    maxPositionSize: 0.05,
    minConfidenceThreshold: 80,
    consensusRequirement: 'supermajority' as const,
  },
  moderate: {
    riskTolerance: 'moderate' as const,
    maxDrawdown: 0.15,
    maxPositionSize: 0.08,
    minConfidenceThreshold: 70,
    consensusRequirement: 'majority' as const,
  },
  aggressive: {
    riskTolerance: 'aggressive' as const,
    maxDrawdown: 0.25,
    maxPositionSize: 0.15,
    minConfidenceThreshold: 60,
    consensusRequirement: 'majority' as const,
  },
};
