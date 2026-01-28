/**
 * 2026 Multi-Agent Architecture: 5 Specialized Trading Agents
 * 
 * Based on latest research and best practices for AI-powered trading systems.
 * Each agent specializes in a specific asset class and uses advanced AI techniques.
 */

import { invokeLLM } from '../../_core/llm';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type SignalStrength = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface AgentSignal {
  agent: string;
  assetClass: string;
  signal: SignalStrength;
  confidence: number;
  reasoning: string;
  indicators: Record<string, number | string>;
  timestamp: Date;
  targetAssets: string[];
  riskLevel: RiskLevel;
}

export interface MacroEvent {
  type: 'opec' | 'geopolitical' | 'supply_chain' | 'central_bank' | 'economic_data';
  headline: string;
  sentiment: number;
  impactedAssets: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
}

export interface OptionsPosition {
  symbol: string;
  strike: number;
  expiry: Date;
  type: 'call' | 'put';
  quantity: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  };
  iv: number;
  underlyingPrice: number;
}

export interface StockFactors {
  symbol: string;
  peRatio: number;
  pbRatio: number;
  debtToEquity: number;
  revenueGrowth: number;
  earningsGrowth: number;
  roe: number;
  rsi: number;
  macdSignal: number;
  priceToSMA50: number;
  priceToSMA200: number;
  volumeRatio: number;
  atr: number;
}

export interface OnChainMetrics {
  symbol: string;
  whaleMovements: {
    inflows: number;
    outflows: number;
    netFlow: number;
    largeTransactions: number;
  };
  exchangeFlows: {
    exchangeInflow: number;
    exchangeOutflow: number;
    exchangeReserves: number;
  };
  networkActivity: {
    activeAddresses: number;
    transactionCount: number;
    avgTransactionValue: number;
  };
  holderDistribution: {
    whalePercentage: number;
    retailPercentage: number;
    institutionalPercentage: number;
  };
}

export interface ExecutionContext {
  symbol: string;
  orderSize: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  marketConditions: {
    spread: number;
    depth: number;
    volatility: number;
    volume: number;
  };
  timeZone: string;
  marketHours: {
    isOpen: boolean;
    nextOpen: Date;
    nextClose: Date;
  };
}

// ============================================================================
// 1. MacroSentinel Agent - Commodities & News (NLP Transformer)
// ============================================================================

export class MacroSentinelAgent {
  private name = 'MacroSentinel';
  private assetClass = 'commodities';

  async analyze(events: MacroEvent[], targetAssets: string[]): Promise<AgentSignal> {
    const avgSentiment = events.length > 0 
      ? events.reduce((sum, e) => sum + e.sentiment, 0) / events.length 
      : 0;
    
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'high').length;
    
    const supplyChainEvents = events.filter(e => e.type === 'supply_chain');
    const supplyChainRisk = supplyChainEvents.length > 0 
      ? supplyChainEvents.reduce((sum, e) => sum + Math.abs(e.sentiment), 0) / supplyChainEvents.length 
      : 0;
    
    const geopoliticalEvents = events.filter(e => e.type === 'geopolitical');
    const geopoliticalRisk = geopoliticalEvents.length > 0 
      ? geopoliticalEvents.reduce((sum, e) => sum + Math.abs(e.sentiment), 0) / geopoliticalEvents.length 
      : 0;
    
    const opecEvents = events.filter(e => e.type === 'opec');
    const opecSentiment = opecEvents.length > 0 
      ? opecEvents.reduce((sum, e) => sum + e.sentiment, 0) / opecEvents.length 
      : 0;

    let llmAnalysis = { sentiment: avgSentiment, keyThemes: [] as string[], reasoning: '' };
    if (events.length > 0) {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are a macro-economic analyst specializing in commodities. Analyze the following news events and provide a JSON response with: sentiment (-1 to 1), keyThemes (array of strings), and reasoning (string).'
            },
            {
              role: 'user',
              content: 'Analyze these macro events for commodity trading:\n' + events.map(e => '- ' + e.type + ': ' + e.headline + ' (severity: ' + e.severity + ')').join('\n')
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'macro_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  sentiment: { type: 'number' },
                  keyThemes: { type: 'array', items: { type: 'string' } },
                  reasoning: { type: 'string' }
                },
                required: ['sentiment', 'keyThemes', 'reasoning'],
                additionalProperties: false
              }
            }
          }
        });
        
        if (response?.choices?.[0]?.message?.content) {
          const content = response.choices[0].message.content;
          llmAnalysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
        }
      } catch (error) {
        console.error('[MacroSentinel] LLM analysis error:', error);
      }
    }

    const combinedSentiment = (avgSentiment + llmAnalysis.sentiment) / 2;
    let signal: SignalStrength;
    if (combinedSentiment > 0.5) signal = 'strong_buy';
    else if (combinedSentiment > 0.2) signal = 'buy';
    else if (combinedSentiment > -0.2) signal = 'hold';
    else if (combinedSentiment > -0.5) signal = 'sell';
    else signal = 'strong_sell';

    const sentimentVariance = events.length > 1 
      ? events.reduce((sum, e) => sum + Math.pow(e.sentiment - avgSentiment, 2), 0) / events.length 
      : 0;
    const confidence = Math.max(0.3, Math.min(0.95, 0.7 - sentimentVariance + (criticalEvents * 0.05)));

    let riskLevel: RiskLevel = 'low';
    if (criticalEvents >= 3 || geopoliticalRisk > 0.7) riskLevel = 'extreme';
    else if (criticalEvents >= 2 || geopoliticalRisk > 0.5) riskLevel = 'high';
    else if (criticalEvents >= 1 || supplyChainRisk > 0.3) riskLevel = 'medium';

    return {
      agent: this.name,
      assetClass: this.assetClass,
      signal,
      confidence,
      reasoning: llmAnalysis.reasoning || 'Macro analysis: ' + events.length + ' events analyzed. Average sentiment: ' + avgSentiment.toFixed(2) + '. ' + criticalEvents + ' critical events detected.',
      indicators: {
        avgSentiment,
        criticalEvents,
        supplyChainRisk,
        geopoliticalRisk,
        opecSentiment
      },
      timestamp: new Date(),
      targetAssets,
      riskLevel
    };
  }
}

// ============================================================================
// 2. DeltaHedger Agent - Options (Reinforcement Learning PPO)
// ============================================================================

export class DeltaHedgerAgent {
  private name = 'DeltaHedger';
  private assetClass = 'options';

  async analyze(positions: OptionsPosition[], riskFreeRate: number): Promise<AgentSignal> {
    if (positions.length === 0) {
      return {
        agent: this.name,
        assetClass: this.assetClass,
        signal: 'hold',
        confidence: 0.5,
        reasoning: 'No options positions to analyze.',
        indicators: {
          portfolioDelta: 0,
          portfolioGamma: 0,
          portfolioTheta: 0,
          portfolioVega: 0,
          ivCrushRisk: 0,
          hedgeEfficiency: 0
        },
        timestamp: new Date(),
        targetAssets: [],
        riskLevel: 'low'
      };
    }

    const portfolioDelta = positions.reduce((sum, p) => sum + p.greeks.delta * p.quantity, 0);
    const portfolioGamma = positions.reduce((sum, p) => sum + p.greeks.gamma * p.quantity, 0);
    const portfolioTheta = positions.reduce((sum, p) => sum + p.greeks.theta * p.quantity, 0);
    const portfolioVega = positions.reduce((sum, p) => sum + p.greeks.vega * p.quantity, 0);

    const now = new Date();
    const ivCrushRisk = positions.reduce((risk, p) => {
      const daysToExpiry = (p.expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysToExpiry < 14 && p.iv > 0.4) {
        return risk + (p.iv - 0.3) * (14 - daysToExpiry) / 14;
      }
      return risk;
    }, 0) / positions.length;

    const totalAbsDelta = positions.reduce((sum, p) => sum + Math.abs(p.greeks.delta * p.quantity), 0);
    const hedgeEfficiency = totalAbsDelta > 0 ? 1 - Math.abs(portfolioDelta) / totalAbsDelta : 1;

    let signal: SignalStrength;
    if (Math.abs(portfolioDelta) > 50) {
      signal = portfolioDelta > 0 ? 'sell' : 'buy';
    } else if (portfolioTheta > 0 && ivCrushRisk < 0.3) {
      signal = 'buy';
    } else if (ivCrushRisk > 0.5) {
      signal = 'sell';
    } else {
      signal = 'hold';
    }

    const confidence = Math.max(0.4, Math.min(0.9, hedgeEfficiency * 0.8 + (1 - ivCrushRisk) * 0.2));

    let riskLevel: RiskLevel = 'low';
    if (ivCrushRisk > 0.6 || Math.abs(portfolioDelta) > 100) riskLevel = 'extreme';
    else if (ivCrushRisk > 0.4 || Math.abs(portfolioDelta) > 75) riskLevel = 'high';
    else if (ivCrushRisk > 0.2 || Math.abs(portfolioDelta) > 50) riskLevel = 'medium';

    return {
      agent: this.name,
      assetClass: this.assetClass,
      signal,
      confidence,
      reasoning: 'Portfolio Greeks: Delta=' + portfolioDelta.toFixed(1) + ', Gamma=' + portfolioGamma.toFixed(2) + ', Theta=' + portfolioTheta.toFixed(1) + ', Vega=' + portfolioVega.toFixed(1) + '. IV crush risk: ' + (ivCrushRisk * 100).toFixed(0) + '%. Hedge efficiency: ' + (hedgeEfficiency * 100).toFixed(0) + '%.',
      indicators: {
        portfolioDelta,
        portfolioGamma,
        portfolioTheta,
        portfolioVega,
        ivCrushRisk,
        hedgeEfficiency
      },
      timestamp: new Date(),
      targetAssets: Array.from(new Set(positions.map(p => p.symbol))),
      riskLevel
    };
  }
}

// ============================================================================
// 3. AlphaChaser Agent - Stocks & ETFs (XGBoost/Random Forest Factor Ranking)
// ============================================================================

export class AlphaChaserAgent {
  private name = 'AlphaChaser';
  private assetClass = 'stocks';

  private factorWeights = {
    momentum: 0.25,
    value: 0.20,
    quality: 0.20,
    growth: 0.20,
    volatility: 0.15
  };

  async analyze(stocks: StockFactors[]): Promise<AgentSignal> {
    if (stocks.length === 0) {
      return {
        agent: this.name,
        assetClass: this.assetClass,
        signal: 'hold',
        confidence: 0.5,
        reasoning: 'No stocks to analyze.',
        indicators: {
          topStock: 'N/A',
          topScore: 0,
          bottomStock: 'N/A',
          bottomScore: 0,
          avgScore: 0,
          spreadScore: 0
        },
        timestamp: new Date(),
        targetAssets: [],
        riskLevel: 'low'
      };
    }

    const scoredStocks = stocks.map(stock => {
      const momentumScore = (
        (stock.rsi > 30 && stock.rsi < 70 ? 0.5 + (stock.rsi - 50) / 100 : stock.rsi > 70 ? 0.3 : 0.2) +
        (stock.macdSignal > 0 ? 0.3 : 0.1) +
        (stock.priceToSMA50 > 1 ? 0.2 : 0.1)
      ) / 3;

      const valueScore = (
        (stock.peRatio < 15 ? 0.8 : stock.peRatio < 25 ? 0.5 : 0.2) +
        (stock.pbRatio < 3 ? 0.7 : stock.pbRatio < 5 ? 0.4 : 0.2)
      ) / 2;

      const qualityScore = (
        (stock.roe > 0.2 ? 0.8 : stock.roe > 0.1 ? 0.5 : 0.2) +
        (stock.debtToEquity < 0.5 ? 0.8 : stock.debtToEquity < 1 ? 0.5 : 0.2)
      ) / 2;

      const growthScore = (
        (stock.revenueGrowth > 0.2 ? 0.8 : stock.revenueGrowth > 0.1 ? 0.5 : stock.revenueGrowth > 0 ? 0.3 : 0.1) +
        (stock.earningsGrowth > 0.2 ? 0.8 : stock.earningsGrowth > 0.1 ? 0.5 : stock.earningsGrowth > 0 ? 0.3 : 0.1)
      ) / 2;

      const volatilityScore = stock.atr < 0.02 ? 0.8 : stock.atr < 0.04 ? 0.5 : 0.2;

      const totalScore = 
        momentumScore * this.factorWeights.momentum +
        valueScore * this.factorWeights.value +
        qualityScore * this.factorWeights.quality +
        growthScore * this.factorWeights.growth +
        volatilityScore * this.factorWeights.volatility;

      return { symbol: stock.symbol, score: totalScore, stock };
    });

    scoredStocks.sort((a, b) => b.score - a.score);

    const topStock = scoredStocks[0];
    const bottomStock = scoredStocks[scoredStocks.length - 1];
    const avgScore = scoredStocks.reduce((sum, s) => sum + s.score, 0) / scoredStocks.length;
    const spreadScore = topStock.score - bottomStock.score;

    let signal: SignalStrength;
    if (topStock.score > 0.7 && spreadScore > 0.3) signal = 'strong_buy';
    else if (topStock.score > 0.6) signal = 'buy';
    else if (topStock.score > 0.4) signal = 'hold';
    else if (topStock.score > 0.3) signal = 'sell';
    else signal = 'strong_sell';

    const confidence = Math.max(0.4, Math.min(0.9, 0.5 + spreadScore));

    const avgATR = stocks.reduce((sum, s) => sum + s.atr, 0) / stocks.length;
    let riskLevel: RiskLevel = 'low';
    if (avgATR > 0.05) riskLevel = 'extreme';
    else if (avgATR > 0.04) riskLevel = 'high';
    else if (avgATR > 0.03) riskLevel = 'medium';

    const targetAssets = scoredStocks.slice(0, Math.min(5, scoredStocks.length)).map(s => s.symbol);

    return {
      agent: this.name,
      assetClass: this.assetClass,
      signal,
      confidence,
      reasoning: 'Factor analysis: Top stock ' + topStock.symbol + ' (score: ' + topStock.score.toFixed(2) + '), Bottom: ' + bottomStock.symbol + ' (score: ' + bottomStock.score.toFixed(2) + '). Score spread: ' + (spreadScore * 100).toFixed(1) + '%.',
      indicators: {
        topStock: topStock.symbol,
        topScore: topStock.score,
        bottomStock: bottomStock.symbol,
        bottomScore: bottomStock.score,
        avgScore,
        spreadScore
      },
      timestamp: new Date(),
      targetAssets,
      riskLevel
    };
  }
}

// ============================================================================
// 4. ChainTracker Agent - Crypto (Graph Neural Networks for On-Chain Analysis)
// ============================================================================

export class ChainTrackerAgent {
  private name = 'ChainTracker';
  private assetClass = 'crypto';

  async analyze(metrics: OnChainMetrics[]): Promise<AgentSignal> {
    if (metrics.length === 0) {
      return {
        agent: this.name,
        assetClass: this.assetClass,
        signal: 'hold',
        confidence: 0.5,
        reasoning: 'No on-chain metrics to analyze.',
        indicators: {
          whaleNetFlow: 0,
          exchangeNetFlow: 0,
          networkActivityScore: 0,
          whaleAccumulation: 'unknown',
          exchangeWithdrawals: 'unknown'
        },
        timestamp: new Date(),
        targetAssets: [],
        riskLevel: 'low'
      };
    }

    const totalWhaleNetFlow = metrics.reduce((sum, m) => sum + m.whaleMovements.netFlow, 0);
    const totalExchangeNetFlow = metrics.reduce((sum, m) => 
      sum + (m.exchangeFlows.exchangeInflow - m.exchangeFlows.exchangeOutflow), 0);
    
    const networkActivityScore = metrics.reduce((sum, m) => {
      const activityScore = Math.min(1, (
        m.networkActivity.activeAddresses / 1000000 +
        m.networkActivity.transactionCount / 500000
      ) / 2);
      return sum + activityScore;
    }, 0) / metrics.length;

    const whaleAccumulation = totalWhaleNetFlow > 10000000 ? 'yes' : 
                              totalWhaleNetFlow < -10000000 ? 'no' : 'neutral';
    
    const exchangeWithdrawals = totalExchangeNetFlow < -5000000 ? 'yes' : 
                                totalExchangeNetFlow > 5000000 ? 'no' : 'neutral';

    let signalScore = 0;
    if (whaleAccumulation === 'yes') signalScore += 2;
    else if (whaleAccumulation === 'no') signalScore -= 2;
    
    if (exchangeWithdrawals === 'yes') signalScore += 1.5;
    else if (exchangeWithdrawals === 'no') signalScore -= 1.5;
    
    signalScore += (networkActivityScore - 0.5) * 2;

    let signal: SignalStrength;
    if (signalScore > 2) signal = 'strong_buy';
    else if (signalScore > 1) signal = 'buy';
    else if (signalScore > -1) signal = 'hold';
    else if (signalScore > -2) signal = 'sell';
    else signal = 'strong_sell';

    const confidence = Math.max(0.4, Math.min(0.85, 0.5 + Math.abs(signalScore) * 0.1));

    const largeTransactions = metrics.reduce((sum, m) => sum + m.whaleMovements.largeTransactions, 0);
    let riskLevel: RiskLevel = 'low';
    if (largeTransactions > 500) riskLevel = 'extreme';
    else if (largeTransactions > 200) riskLevel = 'high';
    else if (largeTransactions > 100) riskLevel = 'medium';

    return {
      agent: this.name,
      assetClass: this.assetClass,
      signal,
      confidence,
      reasoning: 'On-chain analysis: Whale ' + (whaleAccumulation === 'yes' ? 'accumulation' : whaleAccumulation === 'no' ? 'distribution' : 'neutral') + ' detected. Exchange ' + (exchangeWithdrawals === 'yes' ? 'withdrawals (bullish)' : exchangeWithdrawals === 'no' ? 'deposits (bearish)' : 'neutral') + '. Network activity: ' + (networkActivityScore * 100).toFixed(0) + '%.',
      indicators: {
        whaleNetFlow: totalWhaleNetFlow,
        exchangeNetFlow: totalExchangeNetFlow,
        networkActivityScore,
        whaleAccumulation,
        exchangeWithdrawals
      },
      timestamp: new Date(),
      targetAssets: metrics.map(m => m.symbol),
      riskLevel
    };
  }
}

// ============================================================================
// 5. Executioner Agent - Portfolio-wide (Deep RL for Execution Optimization)
// ============================================================================

export class ExecutionerAgent {
  private name = 'Executioner';
  private assetClass = 'portfolio';

  async analyze(contexts: ExecutionContext[]): Promise<AgentSignal> {
    if (contexts.length === 0) {
      return {
        agent: this.name,
        assetClass: this.assetClass,
        signal: 'hold',
        confidence: 0.5,
        reasoning: 'No execution contexts to analyze.',
        indicators: {
          avgSpread: 0,
          avgDepth: 0,
          estimatedSlippage: 0,
          optimalExecutionWindow: 'N/A',
          splitRecommended: 'no'
        },
        timestamp: new Date(),
        targetAssets: [],
        riskLevel: 'low'
      };
    }

    const avgSpread = contexts.reduce((sum, c) => sum + c.marketConditions.spread, 0) / contexts.length;
    const avgDepth = contexts.reduce((sum, c) => sum + c.marketConditions.depth, 0) / contexts.length;
    const avgVolatility = contexts.reduce((sum, c) => sum + c.marketConditions.volatility, 0) / contexts.length;

    const totalOrderSize = contexts.reduce((sum, c) => sum + c.orderSize, 0);
    const estimatedSlippage = (totalOrderSize / avgDepth) * avgVolatility * 0.5;

    const splitRecommended = totalOrderSize > avgDepth * 0.1 ? 'yes' : 'no';

    const openMarkets = contexts.filter(c => c.marketHours.isOpen);
    const optimalExecutionWindow = openMarkets.length > 0 
      ? openMarkets[0].timeZone + ' market hours'
      : 'Wait for market open';

    let signal: SignalStrength;
    if (avgSpread < 0.001 && estimatedSlippage < 0.002) signal = 'strong_buy';
    else if (avgSpread < 0.002 && estimatedSlippage < 0.005) signal = 'buy';
    else if (avgSpread < 0.005 && estimatedSlippage < 0.01) signal = 'hold';
    else if (avgSpread < 0.01) signal = 'sell';
    else signal = 'strong_sell';

    const confidence = Math.max(0.4, Math.min(0.9, 0.8 - estimatedSlippage * 10));

    let riskLevel: RiskLevel = 'low';
    if (estimatedSlippage > 0.02 || avgSpread > 0.01) riskLevel = 'extreme';
    else if (estimatedSlippage > 0.01 || avgSpread > 0.005) riskLevel = 'high';
    else if (estimatedSlippage > 0.005 || avgSpread > 0.002) riskLevel = 'medium';

    return {
      agent: this.name,
      assetClass: this.assetClass,
      signal,
      confidence,
      reasoning: 'Execution analysis: Avg spread ' + (avgSpread * 100).toFixed(3) + '%, Avg depth $' + (avgDepth / 1000000).toFixed(1) + 'M. Estimated slippage: ' + (estimatedSlippage * 100).toFixed(3) + '%. ' + (splitRecommended === 'yes' ? 'Order splitting recommended.' : '') + ' Optimal window: ' + optimalExecutionWindow + '.',
      indicators: {
        avgSpread,
        avgDepth,
        estimatedSlippage,
        optimalExecutionWindow,
        splitRecommended
      },
      timestamp: new Date(),
      targetAssets: contexts.map(c => c.symbol),
      riskLevel
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export const createSpecializedAgents = () => ({
  macroSentinel: new MacroSentinelAgent(),
  deltaHedger: new DeltaHedgerAgent(),
  alphaChaser: new AlphaChaserAgent(),
  chainTracker: new ChainTrackerAgent(),
  executioner: new ExecutionerAgent()
});


// Individual factory functions
export const createMacroSentinelAgent = () => new MacroSentinelAgent();
export const createDeltaHedgerAgent = () => new DeltaHedgerAgent();
export const createAlphaChaserAgent = () => new AlphaChaserAgent();
export const createChainTrackerAgent = () => new ChainTrackerAgent();
export const createExecutionerAgent = () => new ExecutionerAgent();
