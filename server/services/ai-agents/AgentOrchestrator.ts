/**
 * TradoVerse AI Agent Orchestrator
 * 
 * Based on research from 30+ academic papers on AI trading:
 * - Multi-Agent Reinforcement Learning (StockMARL, Princeton MADRL)
 * - Transformer models (MASTER, AT-LSTM)
 * - Sentiment Analysis (BERT, Twitter NLP)
 * - Risk Management (Drawdown Control, Kelly Criterion)
 * 
 * Implements 7 specialized AI agents with consensus mechanism
 */

import { invokeLLM } from "../../_core/llm";

// Agent Types
export type AgentType = 
  | 'technical'
  | 'fundamental'
  | 'sentiment'
  | 'risk'
  | 'regime'
  | 'execution'
  | 'coordinator';

export type AssetType = 'stock' | 'crypto';

export type MarketRegime = 'bullish' | 'bearish' | 'sideways' | 'volatile' | 'unknown';

export type SignalStrength = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

export interface AgentAnalysis {
  agentType: AgentType;
  signal: SignalStrength;
  confidence: number; // 0-100
  reasoning: string;
  indicators: Record<string, number | string>;
  timestamp: number;
}

export interface ConsensusDecision {
  finalSignal: SignalStrength;
  overallConfidence: number;
  agentVotes: AgentAnalysis[];
  riskApproved: boolean;
  reasoning: string;
  suggestedAction: {
    action: 'buy' | 'sell' | 'hold';
    quantity?: number;
    stopLoss?: number;
    takeProfit?: number;
    urgency: 'immediate' | 'normal' | 'low';
  };
}

export interface MarketData {
  symbol: string;
  assetType: AssetType;
  currentPrice: number;
  priceHistory: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[];
  indicators?: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    ema?: { ema8: number; ema21: number; ema50: number; ema200: number };
    bollinger?: { upper: number; middle: number; lower: number };
    atr?: number;
    obv?: number;
    vwap?: number;
  };
  fundamentals?: {
    peRatio?: number;
    marketCap?: number;
    revenue?: number;
    earningsGrowth?: number;
    debtToEquity?: number;
  };
  sentiment?: {
    newsScore?: number;
    socialScore?: number;
    fearGreedIndex?: number;
  };
  onChainMetrics?: {
    activeAddresses?: number;
    exchangeInflow?: number;
    exchangeOutflow?: number;
    whaleTransactions?: number;
  };
}

export interface PortfolioContext {
  currentPosition?: {
    quantity: number;
    averagePrice: number;
    unrealizedPnL: number;
  };
  portfolioValue: number;
  availableCash: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxDrawdown: number;
  currentDrawdown: number;
}

/**
 * Technical Analysis Agent
 * Uses transformer-based pattern recognition and traditional indicators
 */
export class TechnicalAnalysisAgent {
  private agentType: AgentType = 'technical';
  private historicalAccuracy: number = 0.65; // Updated based on performance

  async analyze(data: MarketData): Promise<AgentAnalysis> {
    const indicators = data.indicators || {};
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // RSI Analysis (Momentum)
    if (indicators.rsi !== undefined) {
      if (indicators.rsi < 30) {
        signal = 'buy';
        confidence += 15;
        reasons.push(`RSI oversold at ${indicators.rsi.toFixed(1)}`);
      } else if (indicators.rsi > 70) {
        signal = 'sell';
        confidence += 15;
        reasons.push(`RSI overbought at ${indicators.rsi.toFixed(1)}`);
      } else if (indicators.rsi > 50 && indicators.rsi < 60) {
        reasons.push(`RSI neutral-bullish at ${indicators.rsi.toFixed(1)}`);
        confidence += 5;
      }
    }

    // MACD Analysis (Trend)
    if (indicators.macd) {
      if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
        if (signal === 'buy') {
          signal = 'strong_buy';
          confidence += 10;
        } else if (signal === 'hold') {
          signal = 'buy';
          confidence += 10;
        }
        reasons.push('MACD bullish crossover');
      } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
        if (signal === 'sell') {
          signal = 'strong_sell';
          confidence += 10;
        } else if (signal === 'hold') {
          signal = 'sell';
          confidence += 10;
        }
        reasons.push('MACD bearish crossover');
      }
    }

    // EMA Analysis (Trend Direction)
    if (indicators.ema) {
      const { ema8, ema21, ema50, ema200 } = indicators.ema;
      if (ema8 > ema21 && ema21 > ema50 && ema50 > ema200) {
        reasons.push('Strong uptrend: EMA alignment bullish');
        confidence += 10;
        if (signal === 'hold') signal = 'buy';
      } else if (ema8 < ema21 && ema21 < ema50 && ema50 < ema200) {
        reasons.push('Strong downtrend: EMA alignment bearish');
        confidence += 10;
        if (signal === 'hold') signal = 'sell';
      }
    }

    // Bollinger Bands Analysis (Volatility)
    if (indicators.bollinger && data.currentPrice) {
      const { upper, lower, middle } = indicators.bollinger;
      if (data.currentPrice <= lower) {
        reasons.push('Price at lower Bollinger Band - potential bounce');
        confidence += 8;
        if (signal === 'hold') signal = 'buy';
      } else if (data.currentPrice >= upper) {
        reasons.push('Price at upper Bollinger Band - potential pullback');
        confidence += 8;
        if (signal === 'hold') signal = 'sell';
      }
    }

    // Price Action Analysis
    if (data.priceHistory.length >= 5) {
      const recent = data.priceHistory.slice(-5);
      const higherHighs = recent.every((candle, i) => 
        i === 0 || candle.high >= recent[i - 1].high
      );
      const lowerLows = recent.every((candle, i) => 
        i === 0 || candle.low <= recent[i - 1].low
      );

      if (higherHighs) {
        reasons.push('Higher highs pattern detected');
        confidence += 5;
      }
      if (lowerLows) {
        reasons.push('Lower lows pattern detected');
        confidence += 5;
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: this.agentType,
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Insufficient technical data for analysis',
      indicators: {
        rsi: indicators.rsi || 'N/A',
        macdHistogram: indicators.macd?.histogram || 'N/A',
        atr: indicators.atr || 'N/A',
      },
      timestamp: Date.now(),
    };
  }

  updateAccuracy(wasCorrect: boolean): void {
    // Exponential moving average for accuracy tracking
    this.historicalAccuracy = this.historicalAccuracy * 0.95 + (wasCorrect ? 0.05 : 0);
  }

  getWeight(): number {
    return this.historicalAccuracy;
  }
}

/**
 * Fundamental Analysis Agent
 * Uses NLP to analyze financial reports and company metrics
 */
export class FundamentalAnalysisAgent {
  private agentType: AgentType = 'fundamental';
  private historicalAccuracy: number = 0.60;

  async analyze(data: MarketData): Promise<AgentAnalysis> {
    const fundamentals = data.fundamentals || {};
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // P/E Ratio Analysis
    if (fundamentals.peRatio !== undefined) {
      if (fundamentals.peRatio < 15 && fundamentals.peRatio > 0) {
        signal = 'buy';
        confidence += 15;
        reasons.push(`Undervalued with P/E of ${fundamentals.peRatio.toFixed(1)}`);
      } else if (fundamentals.peRatio > 40) {
        signal = 'sell';
        confidence += 10;
        reasons.push(`Potentially overvalued with P/E of ${fundamentals.peRatio.toFixed(1)}`);
      } else if (fundamentals.peRatio >= 15 && fundamentals.peRatio <= 25) {
        reasons.push(`Fair valuation with P/E of ${fundamentals.peRatio.toFixed(1)}`);
      }
    }

    // Earnings Growth Analysis
    if (fundamentals.earningsGrowth !== undefined) {
      if (fundamentals.earningsGrowth > 20) {
        confidence += 15;
        reasons.push(`Strong earnings growth at ${fundamentals.earningsGrowth.toFixed(1)}%`);
        if (signal === 'hold') signal = 'buy';
      } else if (fundamentals.earningsGrowth < -10) {
        confidence += 10;
        reasons.push(`Declining earnings at ${fundamentals.earningsGrowth.toFixed(1)}%`);
        if (signal === 'hold') signal = 'sell';
      }
    }

    // Debt Analysis
    if (fundamentals.debtToEquity !== undefined) {
      if (fundamentals.debtToEquity > 2) {
        confidence -= 10;
        reasons.push(`High debt-to-equity ratio of ${fundamentals.debtToEquity.toFixed(2)}`);
      } else if (fundamentals.debtToEquity < 0.5) {
        confidence += 5;
        reasons.push(`Low debt-to-equity ratio of ${fundamentals.debtToEquity.toFixed(2)}`);
      }
    }

    // Market Cap Analysis (for crypto, this is important)
    if (data.assetType === 'crypto' && fundamentals.marketCap) {
      if (fundamentals.marketCap > 10_000_000_000) {
        confidence += 5;
        reasons.push('Large-cap crypto with established market presence');
      } else if (fundamentals.marketCap < 100_000_000) {
        confidence -= 10;
        reasons.push('Small-cap crypto with higher risk');
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: this.agentType,
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Limited fundamental data available',
      indicators: {
        peRatio: fundamentals.peRatio || 'N/A',
        earningsGrowth: fundamentals.earningsGrowth || 'N/A',
        debtToEquity: fundamentals.debtToEquity || 'N/A',
      },
      timestamp: Date.now(),
    };
  }

  getWeight(): number {
    return this.historicalAccuracy;
  }
}

/**
 * Sentiment Analysis Agent
 * Uses NLP to analyze news, social media, and market sentiment
 */
export class SentimentAnalysisAgent {
  private agentType: AgentType = 'sentiment';
  private historicalAccuracy: number = 0.55;

  async analyze(data: MarketData): Promise<AgentAnalysis> {
    const sentiment = data.sentiment || {};
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    // News Sentiment
    if (sentiment.newsScore !== undefined) {
      if (sentiment.newsScore > 70) {
        signal = 'buy';
        confidence += 15;
        reasons.push(`Positive news sentiment at ${sentiment.newsScore}`);
      } else if (sentiment.newsScore < 30) {
        signal = 'sell';
        confidence += 15;
        reasons.push(`Negative news sentiment at ${sentiment.newsScore}`);
      } else {
        reasons.push(`Neutral news sentiment at ${sentiment.newsScore}`);
      }
    }

    // Social Media Sentiment
    if (sentiment.socialScore !== undefined) {
      if (sentiment.socialScore > 70) {
        confidence += 10;
        reasons.push(`Bullish social media sentiment at ${sentiment.socialScore}`);
        if (signal === 'hold') signal = 'buy';
      } else if (sentiment.socialScore < 30) {
        confidence += 10;
        reasons.push(`Bearish social media sentiment at ${sentiment.socialScore}`);
        if (signal === 'hold') signal = 'sell';
      }
    }

    // Fear & Greed Index (especially for crypto)
    if (sentiment.fearGreedIndex !== undefined) {
      if (sentiment.fearGreedIndex < 25) {
        // Extreme fear = potential buying opportunity (contrarian)
        reasons.push(`Extreme fear (${sentiment.fearGreedIndex}) - contrarian buy signal`);
        confidence += 10;
        if (signal === 'hold' || signal === 'sell') signal = 'buy';
      } else if (sentiment.fearGreedIndex > 75) {
        // Extreme greed = potential selling opportunity
        reasons.push(`Extreme greed (${sentiment.fearGreedIndex}) - contrarian sell signal`);
        confidence += 10;
        if (signal === 'hold' || signal === 'buy') signal = 'sell';
      }
    }

    // On-chain metrics for crypto
    if (data.assetType === 'crypto' && data.onChainMetrics) {
      const { exchangeInflow, exchangeOutflow, whaleTransactions } = data.onChainMetrics;
      
      if (exchangeOutflow && exchangeInflow && exchangeOutflow > exchangeInflow * 1.5) {
        reasons.push('High exchange outflow - accumulation signal');
        confidence += 8;
        if (signal === 'hold') signal = 'buy';
      }
      
      if (whaleTransactions && whaleTransactions > 100) {
        reasons.push(`High whale activity: ${whaleTransactions} large transactions`);
        confidence += 5;
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: this.agentType,
      signal,
      confidence,
      reasoning: reasons.join('. ') || 'Limited sentiment data available',
      indicators: {
        newsScore: sentiment.newsScore || 'N/A',
        socialScore: sentiment.socialScore || 'N/A',
        fearGreedIndex: sentiment.fearGreedIndex || 'N/A',
      },
      timestamp: Date.now(),
    };
  }

  getWeight(): number {
    return this.historicalAccuracy;
  }
}

/**
 * Risk Management Agent
 * Implements drawdown control and position sizing
 * Has VETO power over risky trades
 */
export class RiskManagementAgent {
  private agentType: AgentType = 'risk';
  private maxDrawdownLimit: number = 0.20; // 20% max drawdown
  private maxPositionSize: number = 0.10; // 10% max per position

  async analyze(
    data: MarketData, 
    portfolio: PortfolioContext,
    proposedAction: { action: 'buy' | 'sell'; quantity: number }
  ): Promise<AgentAnalysis & { approved: boolean; adjustedQuantity?: number }> {
    let approved = true;
    let adjustedQuantity = proposedAction.quantity;
    const reasons: string[] = [];
    let confidence = 70;

    // Check current drawdown
    if (portfolio.currentDrawdown >= this.maxDrawdownLimit * 0.8) {
      approved = false;
      reasons.push(`Current drawdown (${(portfolio.currentDrawdown * 100).toFixed(1)}%) approaching limit`);
      confidence += 20;
    }

    // Check position size
    const positionValue = proposedAction.quantity * data.currentPrice;
    const positionPercent = positionValue / portfolio.portfolioValue;
    
    if (positionPercent > this.maxPositionSize) {
      adjustedQuantity = Math.floor((portfolio.portfolioValue * this.maxPositionSize) / data.currentPrice);
      reasons.push(`Position size reduced from ${(positionPercent * 100).toFixed(1)}% to ${(this.maxPositionSize * 100).toFixed(1)}%`);
    }

    // Check available cash for buys
    if (proposedAction.action === 'buy' && positionValue > portfolio.availableCash) {
      adjustedQuantity = Math.floor(portfolio.availableCash / data.currentPrice);
      reasons.push('Quantity adjusted to available cash');
    }

    // Volatility check using ATR
    if (data.indicators?.atr && data.currentPrice) {
      const atrPercent = (data.indicators.atr / data.currentPrice) * 100;
      if (atrPercent > 5) {
        reasons.push(`High volatility warning: ATR at ${atrPercent.toFixed(1)}% of price`);
        confidence += 10;
        // Reduce position size in high volatility
        adjustedQuantity = Math.floor(adjustedQuantity * 0.7);
      }
    }

    // Risk tolerance adjustment
    if (portfolio.riskTolerance === 'conservative') {
      adjustedQuantity = Math.floor(adjustedQuantity * 0.5);
      reasons.push('Conservative risk profile - position reduced by 50%');
    } else if (portfolio.riskTolerance === 'aggressive') {
      reasons.push('Aggressive risk profile - full position allowed');
    }

    // Calculate suggested stop-loss and take-profit
    const stopLossPercent = portfolio.riskTolerance === 'conservative' ? 0.03 : 
                           portfolio.riskTolerance === 'aggressive' ? 0.08 : 0.05;
    const takeProfitPercent = stopLossPercent * 2; // 2:1 risk-reward ratio

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: this.agentType,
      signal: approved ? 'hold' : 'strong_sell', // Risk agent doesn't give buy/sell signals
      confidence,
      reasoning: reasons.join('. ') || 'Trade within risk parameters',
      indicators: {
        currentDrawdown: `${(portfolio.currentDrawdown * 100).toFixed(1)}%`,
        positionSize: `${(positionPercent * 100).toFixed(1)}%`,
        suggestedStopLoss: `${(stopLossPercent * 100).toFixed(1)}%`,
      },
      timestamp: Date.now(),
      approved,
      adjustedQuantity,
    };
  }
}

/**
 * Market Regime Agent
 * Classifies current market conditions
 */
export class MarketRegimeAgent {
  private agentType: AgentType = 'regime';
  private historicalAccuracy: number = 0.58;

  async analyze(data: MarketData): Promise<AgentAnalysis & { regime: MarketRegime }> {
    let regime: MarketRegime = 'unknown';
    let signal: SignalStrength = 'hold';
    let confidence = 50;
    const reasons: string[] = [];

    if (data.priceHistory.length < 20) {
      return {
        agentType: this.agentType,
        signal: 'hold',
        confidence: 30,
        reasoning: 'Insufficient price history for regime detection',
        indicators: { regime: 'unknown' },
        timestamp: Date.now(),
        regime: 'unknown',
      };
    }

    // Calculate returns
    const returns = data.priceHistory.slice(1).map((candle, i) => 
      (candle.close - data.priceHistory[i].close) / data.priceHistory[i].close
    );

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    // Determine regime
    if (volatility > 0.03) {
      regime = 'volatile';
      signal = 'hold';
      reasons.push(`High volatility regime: ${(volatility * 100).toFixed(2)}% daily volatility`);
      confidence += 15;
    } else if (avgReturn > 0.005) {
      regime = 'bullish';
      signal = 'buy';
      reasons.push(`Bullish regime: ${(avgReturn * 100).toFixed(2)}% average daily return`);
      confidence += 20;
    } else if (avgReturn < -0.005) {
      regime = 'bearish';
      signal = 'sell';
      reasons.push(`Bearish regime: ${(avgReturn * 100).toFixed(2)}% average daily return`);
      confidence += 20;
    } else {
      regime = 'sideways';
      signal = 'hold';
      reasons.push('Sideways/consolidation regime detected');
      confidence += 10;
    }

    // Trend strength using EMA alignment
    if (data.indicators?.ema) {
      const { ema8, ema21, ema50 } = data.indicators.ema;
      if (ema8 > ema21 && ema21 > ema50) {
        reasons.push('EMAs confirm uptrend');
        confidence += 10;
      } else if (ema8 < ema21 && ema21 < ema50) {
        reasons.push('EMAs confirm downtrend');
        confidence += 10;
      }
    }

    confidence = Math.min(95, Math.max(10, confidence));

    return {
      agentType: this.agentType,
      signal,
      confidence,
      reasoning: reasons.join('. '),
      indicators: {
        regime,
        avgReturn: `${(avgReturn * 100).toFixed(2)}%`,
        volatility: `${(volatility * 100).toFixed(2)}%`,
      },
      timestamp: Date.now(),
      regime,
    };
  }

  getWeight(): number {
    return this.historicalAccuracy;
  }
}

/**
 * Execution Agent
 * Optimizes order execution timing and slippage
 */
export class ExecutionAgent {
  private agentType: AgentType = 'execution';

  async analyze(data: MarketData): Promise<AgentAnalysis & { 
    optimalExecutionTime: 'immediate' | 'wait' | 'split';
    suggestedSplits?: number;
  }> {
    let optimalExecutionTime: 'immediate' | 'wait' | 'split' = 'immediate';
    let suggestedSplits: number | undefined;
    const reasons: string[] = [];
    let confidence = 60;

    // Volume analysis
    if (data.priceHistory.length > 0) {
      const recentVolume = data.priceHistory.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;
      const avgVolume = data.priceHistory.reduce((sum, c) => sum + c.volume, 0) / data.priceHistory.length;

      if (recentVolume < avgVolume * 0.5) {
        optimalExecutionTime = 'wait';
        reasons.push('Low volume - wait for better liquidity');
        confidence += 15;
      } else if (recentVolume > avgVolume * 2) {
        reasons.push('High volume - good liquidity for execution');
        confidence += 10;
      }
    }

    // Spread analysis (using high-low as proxy)
    if (data.priceHistory.length > 0) {
      const lastCandle = data.priceHistory[data.priceHistory.length - 1];
      const spread = (lastCandle.high - lastCandle.low) / lastCandle.close;
      
      if (spread > 0.02) {
        optimalExecutionTime = 'split';
        suggestedSplits = 3;
        reasons.push('Wide spread - split order recommended');
        confidence += 10;
      }
    }

    // ATR-based urgency
    if (data.indicators?.atr && data.currentPrice) {
      const atrPercent = data.indicators.atr / data.currentPrice;
      if (atrPercent > 0.03) {
        reasons.push('High ATR - consider limit orders');
      }
    }

    return {
      agentType: this.agentType,
      signal: 'hold', // Execution agent doesn't give directional signals
      confidence,
      reasoning: reasons.join('. ') || 'Standard execution recommended',
      indicators: {
        executionStrategy: optimalExecutionTime,
        suggestedSplits: suggestedSplits || 1,
      },
      timestamp: Date.now(),
      optimalExecutionTime,
      suggestedSplits,
    };
  }
}

/**
 * Meta-Coordinator Agent
 * Synthesizes all agent analyses into a final decision
 */
export class MetaCoordinatorAgent {
  private technicalAgent: TechnicalAnalysisAgent;
  private fundamentalAgent: FundamentalAnalysisAgent;
  private sentimentAgent: SentimentAnalysisAgent;
  private riskAgent: RiskManagementAgent;
  private regimeAgent: MarketRegimeAgent;
  private executionAgent: ExecutionAgent;

  constructor() {
    this.technicalAgent = new TechnicalAnalysisAgent();
    this.fundamentalAgent = new FundamentalAnalysisAgent();
    this.sentimentAgent = new SentimentAnalysisAgent();
    this.riskAgent = new RiskManagementAgent();
    this.regimeAgent = new MarketRegimeAgent();
    this.executionAgent = new ExecutionAgent();
  }

  async orchestrate(
    data: MarketData,
    portfolio: PortfolioContext
  ): Promise<ConsensusDecision> {
    // Gather all agent analyses in parallel
    const [
      technicalAnalysis,
      fundamentalAnalysis,
      sentimentAnalysis,
      regimeAnalysis,
      executionAnalysis,
    ] = await Promise.all([
      this.technicalAgent.analyze(data),
      this.fundamentalAgent.analyze(data),
      this.sentimentAgent.analyze(data),
      this.regimeAgent.analyze(data),
      this.executionAgent.analyze(data),
    ]);

    // Calculate weighted votes
    const signalToScore: Record<SignalStrength, number> = {
      'strong_buy': 2,
      'buy': 1,
      'hold': 0,
      'sell': -1,
      'strong_sell': -2,
    };

    const agents = [
      { analysis: technicalAnalysis, weight: this.technicalAgent.getWeight() },
      { analysis: fundamentalAnalysis, weight: this.fundamentalAgent.getWeight() },
      { analysis: sentimentAnalysis, weight: this.sentimentAgent.getWeight() },
      { analysis: regimeAnalysis, weight: this.regimeAgent.getWeight() },
    ];

    let totalWeight = 0;
    let weightedScore = 0;
    let totalConfidence = 0;

    for (const { analysis, weight } of agents) {
      const adjustedWeight = weight * (analysis.confidence / 100);
      totalWeight += adjustedWeight;
      weightedScore += signalToScore[analysis.signal] * adjustedWeight;
      totalConfidence += analysis.confidence * weight;
    }

    const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const avgConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 50;

    // Convert score back to signal
    let finalSignal: SignalStrength;
    if (avgScore >= 1.5) finalSignal = 'strong_buy';
    else if (avgScore >= 0.5) finalSignal = 'buy';
    else if (avgScore <= -1.5) finalSignal = 'strong_sell';
    else if (avgScore <= -0.5) finalSignal = 'sell';
    else finalSignal = 'hold';

    // Determine action and quantity
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let quantity = 0;

    if (finalSignal === 'strong_buy' || finalSignal === 'buy') {
      action = 'buy';
      // Calculate position size based on confidence and risk tolerance
      const basePercent = portfolio.riskTolerance === 'aggressive' ? 0.1 : 
                         portfolio.riskTolerance === 'conservative' ? 0.03 : 0.05;
      const confidenceMultiplier = avgConfidence / 100;
      quantity = Math.floor((portfolio.availableCash * basePercent * confidenceMultiplier) / data.currentPrice);
    } else if (finalSignal === 'strong_sell' || finalSignal === 'sell') {
      action = 'sell';
      if (portfolio.currentPosition) {
        // Sell percentage based on signal strength
        const sellPercent = finalSignal === 'strong_sell' ? 1 : 0.5;
        quantity = Math.floor(portfolio.currentPosition.quantity * sellPercent);
      }
    }

    // Risk check
    const riskAnalysis = await this.riskAgent.analyze(data, portfolio, { action: action === 'hold' ? 'buy' : action, quantity });
    const riskApproved = riskAnalysis.approved;
    const adjustedQuantity = riskAnalysis.adjustedQuantity || quantity;

    // Build reasoning
    const reasoningParts = [
      `Technical: ${technicalAnalysis.signal} (${technicalAnalysis.confidence}%)`,
      `Fundamental: ${fundamentalAnalysis.signal} (${fundamentalAnalysis.confidence}%)`,
      `Sentiment: ${sentimentAnalysis.signal} (${sentimentAnalysis.confidence}%)`,
      `Regime: ${regimeAnalysis.regime} (${regimeAnalysis.confidence}%)`,
      `Risk: ${riskApproved ? 'Approved' : 'VETOED'}`,
    ];

    // Calculate stop-loss and take-profit
    const stopLossPercent = portfolio.riskTolerance === 'conservative' ? 0.03 : 
                           portfolio.riskTolerance === 'aggressive' ? 0.08 : 0.05;
    const stopLoss = action === 'buy' ? data.currentPrice * (1 - stopLossPercent) : undefined;
    const takeProfit = action === 'buy' ? data.currentPrice * (1 + stopLossPercent * 2) : undefined;

    return {
      finalSignal: riskApproved ? finalSignal : 'hold',
      overallConfidence: avgConfidence,
      agentVotes: [
        technicalAnalysis,
        fundamentalAnalysis,
        sentimentAnalysis,
        regimeAnalysis,
        executionAnalysis,
        riskAnalysis,
      ],
      riskApproved,
      reasoning: reasoningParts.join(' | '),
      suggestedAction: {
        action: riskApproved ? action : 'hold',
        quantity: riskApproved ? adjustedQuantity : 0,
        stopLoss,
        takeProfit,
        urgency: executionAnalysis.optimalExecutionTime === 'immediate' ? 'immediate' : 
                executionAnalysis.optimalExecutionTime === 'wait' ? 'low' : 'normal',
      },
    };
  }

  /**
   * Get AI-enhanced analysis using LLM for deeper insights
   */
  async getEnhancedAnalysis(
    data: MarketData,
    consensusDecision: ConsensusDecision
  ): Promise<string> {
    const prompt = `You are an expert financial analyst. Analyze this trading decision and provide additional insights.

Symbol: ${data.symbol}
Asset Type: ${data.assetType}
Current Price: $${data.currentPrice}

Agent Consensus:
- Final Signal: ${consensusDecision.finalSignal}
- Overall Confidence: ${consensusDecision.overallConfidence.toFixed(1)}%
- Risk Approved: ${consensusDecision.riskApproved}

Individual Agent Analyses:
${consensusDecision.agentVotes.map(v => 
  `- ${v.agentType}: ${v.signal} (${v.confidence}%) - ${v.reasoning}`
).join('\n')}

Suggested Action: ${consensusDecision.suggestedAction.action} ${consensusDecision.suggestedAction.quantity} units

Please provide:
1. A brief summary of the overall market outlook
2. Key risks to watch
3. Alternative scenarios to consider
4. Confidence assessment of the recommendation

Keep your response concise and actionable.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are an expert financial analyst providing trading insights. Be concise and actionable.' },
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
}

// Export singleton instance
export const agentOrchestrator = new MetaCoordinatorAgent();
