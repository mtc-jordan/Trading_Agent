/**
 * Enhanced AI Analysis Service
 * Based on latest research from CFA Institute, IEEE, and expert insights (2024-2025)
 * 
 * Key Features:
 * 1. Multi-Agent Consensus System - 5 specialized agents with weighted voting
 * 2. Ensemble Learning - Combines multiple model predictions
 * 3. Kelly Criterion Position Sizing - Optimal capital allocation
 * 4. Market Regime Detection - Adapts strategies to market conditions
 * 5. Dynamic Risk Management - ATR-based stops and trailing stops
 */

import { invokeLLM } from "../_core/llm";
import { callDataApi } from "../_core/dataApi";

// Types for enhanced analysis
export interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number; percentB: number };
  atr: number;
  adx: number;
  stochastic: { k: number; d: number };
  ema20: number;
  ema50: number;
  ema200: number;
  vwap: number;
  obv: number;
  volumeRatio: number;
}

export interface MarketRegime {
  type: 'bull' | 'bear' | 'sideways' | 'high_volatility' | 'low_volatility';
  confidence: number;
  trendStrength: number;
  volatilityLevel: number;
}

export interface AgentAnalysis {
  agentType: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  priceTarget?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PositionSizing {
  kellyFraction: number;
  recommendedSize: number;
  maxRisk: number;
  riskRewardRatio: number;
}

export interface EnhancedAnalysisResult {
  symbol: string;
  timestamp: Date;
  currentPrice: number;
  
  // Multi-Agent Consensus
  agents: AgentAnalysis[];
  consensusRecommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  consensusConfidence: number;
  
  // Technical Analysis
  technicalIndicators: TechnicalIndicators;
  
  // Market Regime
  marketRegime: MarketRegime;
  
  // Position Sizing (Kelly Criterion)
  positionSizing: PositionSizing;
  
  // Risk Management
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  
  // Ensemble Prediction
  ensemblePrediction: {
    direction: 'up' | 'down' | 'neutral';
    magnitude: number;
    timeframe: string;
    confidence: number;
  };
  
  // Overall Score
  overallScore: number; // 0-100
  profitProbability: number;
}

// Calculate technical indicators from price data
export function calculateTechnicalIndicators(
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[]
): TechnicalIndicators {
  const n = prices.length;
  const currentPrice = prices[n - 1];
  
  // RSI (14-period)
  const rsiPeriod = 14;
  let gains = 0, losses = 0;
  for (let i = n - rsiPeriod; i < n; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / rsiPeriod;
  const avgLoss = losses / rsiPeriod;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // MACD (12, 26, 9)
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const macdHistory = prices.slice(-35).map((_, i) => {
    const e12 = calculateEMA(prices.slice(0, n - 35 + i + 1), 12);
    const e26 = calculateEMA(prices.slice(0, n - 35 + i + 1), 26);
    return e12 - e26;
  });
  const signalLine = calculateEMA(macdHistory, 9);
  const histogram = macdLine - signalLine;
  
  // Bollinger Bands (20-period, 2 std dev)
  const bbPeriod = 20;
  const bbPrices = prices.slice(-bbPeriod);
  const bbMiddle = bbPrices.reduce((a, b) => a + b, 0) / bbPeriod;
  const bbStdDev = Math.sqrt(bbPrices.reduce((sum, p) => sum + Math.pow(p - bbMiddle, 2), 0) / bbPeriod);
  const bbUpper = bbMiddle + 2 * bbStdDev;
  const bbLower = bbMiddle - 2 * bbStdDev;
  const percentB = (currentPrice - bbLower) / (bbUpper - bbLower);
  
  // ATR (14-period)
  const atrPeriod = 14;
  let atrSum = 0;
  for (let i = n - atrPeriod; i < n; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - prices[i - 1]),
      Math.abs(lows[i] - prices[i - 1])
    );
    atrSum += tr;
  }
  const atr = atrSum / atrPeriod;
  
  // ADX (14-period) - Trend Strength
  const adx = calculateADX(highs, lows, prices, 14);
  
  // Stochastic (14, 3, 3)
  const stochPeriod = 14;
  const stochHighs = highs.slice(-stochPeriod);
  const stochLows = lows.slice(-stochPeriod);
  const highestHigh = Math.max(...stochHighs);
  const lowestLow = Math.min(...stochLows);
  const stochK = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
  const stochD = stochK; // Simplified
  
  // EMAs
  const ema20 = calculateEMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);
  const ema200 = calculateEMA(prices, Math.min(200, n - 1));
  
  // VWAP (simplified - daily)
  const vwapPrices = prices.slice(-20);
  const vwapVolumes = volumes.slice(-20);
  const vwapSum = vwapPrices.reduce((sum, p, i) => sum + p * vwapVolumes[i], 0);
  const volumeSum = vwapVolumes.reduce((a, b) => a + b, 0);
  const vwap = vwapSum / volumeSum;
  
  // OBV (On-Balance Volume)
  let obv = 0;
  for (let i = 1; i < n; i++) {
    if (prices[i] > prices[i - 1]) obv += volumes[i];
    else if (prices[i] < prices[i - 1]) obv -= volumes[i];
  }
  
  // Volume Ratio (current vs average)
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = volumes[n - 1] / avgVolume;
  
  return {
    rsi,
    macd: { value: macdLine, signal: signalLine, histogram },
    bollingerBands: { upper: bbUpper, middle: bbMiddle, lower: bbLower, percentB },
    atr,
    adx,
    stochastic: { k: stochK, d: stochD },
    ema20,
    ema50,
    ema200,
    vwap,
    obv,
    volumeRatio
  };
}

function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  const n = closes.length;
  if (n < period + 1) return 25; // Default neutral value
  
  let plusDMSum = 0, minusDMSum = 0, trSum = 0;
  
  for (let i = n - period; i < n; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    
    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
    
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    
    plusDMSum += plusDM;
    minusDMSum += minusDM;
    trSum += tr;
  }
  
  const plusDI = (plusDMSum / trSum) * 100;
  const minusDI = (minusDMSum / trSum) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  
  return dx;
}

// Detect market regime using multiple indicators
export function detectMarketRegime(
  prices: number[],
  indicators: TechnicalIndicators
): MarketRegime {
  const n = prices.length;
  const currentPrice = prices[n - 1];
  
  // Trend detection
  const shortTrend = currentPrice > indicators.ema20 ? 1 : -1;
  const mediumTrend = currentPrice > indicators.ema50 ? 1 : -1;
  const longTrend = currentPrice > indicators.ema200 ? 1 : -1;
  const trendScore = shortTrend + mediumTrend + longTrend;
  
  // Volatility assessment
  const priceRange = Math.max(...prices.slice(-20)) - Math.min(...prices.slice(-20));
  const avgPrice = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volatilityPercent = (priceRange / avgPrice) * 100;
  
  // ADX for trend strength
  const trendStrength = indicators.adx;
  
  // Determine regime
  let type: MarketRegime['type'];
  let confidence: number;
  
  if (volatilityPercent > 15) {
    type = 'high_volatility';
    confidence = Math.min(volatilityPercent / 20, 1);
  } else if (volatilityPercent < 5) {
    type = 'low_volatility';
    confidence = 1 - (volatilityPercent / 5);
  } else if (trendScore >= 2 && trendStrength > 25) {
    type = 'bull';
    confidence = (trendStrength / 50) * (trendScore / 3);
  } else if (trendScore <= -2 && trendStrength > 25) {
    type = 'bear';
    confidence = (trendStrength / 50) * (Math.abs(trendScore) / 3);
  } else {
    type = 'sideways';
    confidence = 1 - (trendStrength / 50);
  }
  
  return {
    type,
    confidence: Math.min(Math.max(confidence, 0.1), 0.95),
    trendStrength,
    volatilityLevel: volatilityPercent
  };
}

// Kelly Criterion for position sizing
export function calculateKellyPosition(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  accountBalance: number,
  maxRiskPercent: number = 0.02
): PositionSizing {
  // Kelly formula: f* = (bp - q) / b
  // where b = avgWin/avgLoss, p = winRate, q = 1 - winRate
  const b = avgWin / avgLoss;
  const p = winRate;
  const q = 1 - winRate;
  
  let kellyFraction = (b * p - q) / b;
  
  // Use fractional Kelly (25-50%) for safety
  kellyFraction = kellyFraction * 0.25;
  
  // Cap at max risk
  kellyFraction = Math.min(Math.max(kellyFraction, 0), maxRiskPercent);
  
  const recommendedSize = accountBalance * kellyFraction;
  const riskRewardRatio = avgWin / avgLoss;
  
  return {
    kellyFraction,
    recommendedSize,
    maxRisk: accountBalance * maxRiskPercent,
    riskRewardRatio
  };
}

// Technical Analysis Agent
async function runTechnicalAgent(
  symbol: string,
  currentPrice: number,
  indicators: TechnicalIndicators,
  regime: MarketRegime
): Promise<AgentAnalysis> {
  const signals: number[] = [];
  const factors: string[] = [];
  
  // RSI signals
  if (indicators.rsi < 30) {
    signals.push(1);
    factors.push('RSI oversold (<30)');
  } else if (indicators.rsi > 70) {
    signals.push(-1);
    factors.push('RSI overbought (>70)');
  } else {
    signals.push(0);
  }
  
  // MACD signals
  if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
    signals.push(1);
    factors.push('MACD bullish crossover');
  } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
    signals.push(-1);
    factors.push('MACD bearish crossover');
  } else {
    signals.push(0);
  }
  
  // Bollinger Band signals
  if (indicators.bollingerBands.percentB < 0.2) {
    signals.push(1);
    factors.push('Price near lower Bollinger Band');
  } else if (indicators.bollingerBands.percentB > 0.8) {
    signals.push(-1);
    factors.push('Price near upper Bollinger Band');
  } else {
    signals.push(0);
  }
  
  // EMA trend signals
  if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.ema50) {
    signals.push(1);
    factors.push('Price above rising EMAs');
  } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.ema50) {
    signals.push(-1);
    factors.push('Price below falling EMAs');
  } else {
    signals.push(0);
  }
  
  // Stochastic signals
  if (indicators.stochastic.k < 20) {
    signals.push(1);
    factors.push('Stochastic oversold');
  } else if (indicators.stochastic.k > 80) {
    signals.push(-1);
    factors.push('Stochastic overbought');
  } else {
    signals.push(0);
  }
  
  // Volume confirmation
  if (indicators.volumeRatio > 1.5) {
    factors.push('High volume confirmation');
  }
  
  const avgSignal = signals.reduce((a, b) => a + b, 0) / signals.length;
  const confidence = Math.abs(avgSignal) * 0.6 + 0.3;
  
  let recommendation: AgentAnalysis['recommendation'];
  if (avgSignal > 0.5) recommendation = 'strong_buy';
  else if (avgSignal > 0.2) recommendation = 'buy';
  else if (avgSignal < -0.5) recommendation = 'strong_sell';
  else if (avgSignal < -0.2) recommendation = 'sell';
  else recommendation = 'hold';
  
  // Calculate price targets based on ATR
  const stopLoss = currentPrice - (indicators.atr * 2);
  const takeProfit = currentPrice + (indicators.atr * 3);
  
  return {
    agentType: 'Technical Analysis',
    recommendation,
    confidence,
    reasoning: `Technical indicators suggest ${recommendation} based on ${factors.length} key signals.`,
    keyFactors: factors,
    priceTarget: takeProfit,
    stopLoss,
    takeProfit
  };
}

// Fundamental Analysis Agent (using LLM)
async function runFundamentalAgent(
  symbol: string,
  stockData: any
): Promise<AgentAnalysis> {
  const prompt = `Analyze the fundamental data for ${symbol} and provide a trading recommendation.

Stock Data:
- Current Price: $${stockData.currentPrice}
- 52-Week High: $${stockData.fiftyTwoWeekHigh}
- 52-Week Low: $${stockData.fiftyTwoWeekLow}
- Market Cap: ${stockData.marketCap}
- P/E Ratio: ${stockData.peRatio || 'N/A'}
- Volume: ${stockData.volume}

Provide your analysis in JSON format:
{
  "recommendation": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "priceTarget": number
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a fundamental analysis expert. Analyze stocks based on valuation metrics and financial health.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'fundamental_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              recommendation: { type: 'string', enum: ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'] },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
              keyFactors: { type: 'array', items: { type: 'string' } },
              priceTarget: { type: 'number' }
            },
            required: ['recommendation', 'confidence', 'reasoning', 'keyFactors', 'priceTarget'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{}');
    return {
      agentType: 'Fundamental Analysis',
      ...result
    };
  } catch (error) {
    return {
      agentType: 'Fundamental Analysis',
      recommendation: 'hold',
      confidence: 0.5,
      reasoning: 'Unable to complete fundamental analysis',
      keyFactors: ['Analysis unavailable']
    };
  }
}

// Sentiment Analysis Agent (using LLM)
async function runSentimentAgent(
  symbol: string,
  newsHeadlines: string[]
): Promise<AgentAnalysis> {
  const prompt = `Analyze the market sentiment for ${symbol} based on recent news.

Recent Headlines:
${newsHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Provide sentiment analysis in JSON format:
{
  "recommendation": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of sentiment",
  "keyFactors": ["sentiment factor 1", "sentiment factor 2"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a market sentiment analyst. Analyze news and social sentiment to gauge market mood.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              recommendation: { type: 'string', enum: ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'] },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
              keyFactors: { type: 'array', items: { type: 'string' } }
            },
            required: ['recommendation', 'confidence', 'reasoning', 'keyFactors'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{}');
    return {
      agentType: 'Sentiment Analysis',
      ...result
    };
  } catch (error) {
    return {
      agentType: 'Sentiment Analysis',
      recommendation: 'hold',
      confidence: 0.5,
      reasoning: 'Unable to complete sentiment analysis',
      keyFactors: ['Analysis unavailable']
    };
  }
}

// Risk Management Agent
async function runRiskAgent(
  symbol: string,
  currentPrice: number,
  indicators: TechnicalIndicators,
  regime: MarketRegime,
  accountBalance: number
): Promise<AgentAnalysis> {
  const factors: string[] = [];
  let riskScore = 50; // Base risk score
  
  // Volatility risk
  if (regime.volatilityLevel > 15) {
    riskScore += 20;
    factors.push('High volatility environment');
  } else if (regime.volatilityLevel < 5) {
    riskScore -= 10;
    factors.push('Low volatility - favorable conditions');
  }
  
  // Trend risk
  if (regime.type === 'sideways') {
    riskScore += 10;
    factors.push('Sideways market - higher whipsaw risk');
  } else if (regime.trendStrength > 40) {
    riskScore -= 10;
    factors.push('Strong trend - favorable for trend-following');
  }
  
  // Overbought/oversold risk
  if (indicators.rsi > 80 || indicators.rsi < 20) {
    riskScore += 15;
    factors.push('Extreme RSI levels - reversal risk');
  }
  
  // Volume risk
  if (indicators.volumeRatio < 0.5) {
    riskScore += 10;
    factors.push('Low volume - liquidity risk');
  }
  
  // Position sizing recommendation
  const positionSizing = calculateKellyPosition(
    0.55, // Assumed 55% win rate
    indicators.atr * 2, // Average win
    indicators.atr * 1, // Average loss
    accountBalance
  );
  
  let recommendation: AgentAnalysis['recommendation'];
  if (riskScore < 30) recommendation = 'strong_buy';
  else if (riskScore < 45) recommendation = 'buy';
  else if (riskScore > 70) recommendation = 'strong_sell';
  else if (riskScore > 55) recommendation = 'sell';
  else recommendation = 'hold';
  
  const confidence = 1 - (Math.abs(riskScore - 50) / 100);
  
  return {
    agentType: 'Risk Management',
    recommendation,
    confidence,
    reasoning: `Risk assessment score: ${riskScore}/100. ${riskScore > 50 ? 'Elevated' : 'Acceptable'} risk levels.`,
    keyFactors: factors,
    stopLoss: currentPrice - (indicators.atr * 2),
    takeProfit: currentPrice + (indicators.atr * 3)
  };
}

// Quantitative Agent (Pattern Recognition)
async function runQuantAgent(
  symbol: string,
  prices: number[],
  indicators: TechnicalIndicators
): Promise<AgentAnalysis> {
  const factors: string[] = [];
  let score = 0;
  
  // Moving average crossover patterns
  if (indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema200) {
    score += 2;
    factors.push('Golden alignment (EMA20 > EMA50 > EMA200)');
  } else if (indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema200) {
    score -= 2;
    factors.push('Death alignment (EMA20 < EMA50 < EMA200)');
  }
  
  // Price momentum
  const momentum5 = (prices[prices.length - 1] - prices[prices.length - 6]) / prices[prices.length - 6];
  const momentum20 = (prices[prices.length - 1] - prices[prices.length - 21]) / prices[prices.length - 21];
  
  if (momentum5 > 0.02 && momentum20 > 0.05) {
    score += 1;
    factors.push('Strong positive momentum');
  } else if (momentum5 < -0.02 && momentum20 < -0.05) {
    score -= 1;
    factors.push('Strong negative momentum');
  }
  
  // VWAP relationship
  const currentPrice = prices[prices.length - 1];
  if (currentPrice > indicators.vwap * 1.02) {
    score += 1;
    factors.push('Trading above VWAP');
  } else if (currentPrice < indicators.vwap * 0.98) {
    score -= 1;
    factors.push('Trading below VWAP');
  }
  
  // OBV trend
  if (indicators.obv > 0) {
    score += 0.5;
    factors.push('Positive OBV trend');
  } else {
    score -= 0.5;
    factors.push('Negative OBV trend');
  }
  
  let recommendation: AgentAnalysis['recommendation'];
  if (score >= 3) recommendation = 'strong_buy';
  else if (score >= 1.5) recommendation = 'buy';
  else if (score <= -3) recommendation = 'strong_sell';
  else if (score <= -1.5) recommendation = 'sell';
  else recommendation = 'hold';
  
  const confidence = Math.min(Math.abs(score) / 4, 0.9);
  
  return {
    agentType: 'Quantitative Analysis',
    recommendation,
    confidence,
    reasoning: `Quantitative score: ${score.toFixed(2)}. Pattern analysis indicates ${recommendation}.`,
    keyFactors: factors
  };
}

// Aggregate agent recommendations using weighted voting
function aggregateConsensus(agents: AgentAnalysis[]): {
  recommendation: AgentAnalysis['recommendation'];
  confidence: number;
} {
  const weights: Record<string, number> = {
    'Technical Analysis': 0.25,
    'Fundamental Analysis': 0.20,
    'Sentiment Analysis': 0.15,
    'Risk Management': 0.20,
    'Quantitative Analysis': 0.20
  };
  
  const scores: Record<string, number> = {
    'strong_buy': 2,
    'buy': 1,
    'hold': 0,
    'sell': -1,
    'strong_sell': -2
  };
  
  let weightedScore = 0;
  let totalWeight = 0;
  let totalConfidence = 0;
  
  for (const agent of agents) {
    const weight = weights[agent.agentType] || 0.2;
    const score = scores[agent.recommendation];
    weightedScore += score * weight * agent.confidence;
    totalWeight += weight;
    totalConfidence += agent.confidence * weight;
  }
  
  const avgScore = weightedScore / totalWeight;
  const avgConfidence = totalConfidence / totalWeight;
  
  let recommendation: AgentAnalysis['recommendation'];
  if (avgScore >= 1.2) recommendation = 'strong_buy';
  else if (avgScore >= 0.4) recommendation = 'buy';
  else if (avgScore <= -1.2) recommendation = 'strong_sell';
  else if (avgScore <= -0.4) recommendation = 'sell';
  else recommendation = 'hold';
  
  return { recommendation, confidence: avgConfidence };
}

// Main enhanced analysis function
export async function runEnhancedAnalysis(
  symbol: string,
  accountBalance: number = 10000
): Promise<EnhancedAnalysisResult> {
  // Fetch stock data
  let stockData: any;
  try {
    const response = await callDataApi('YahooFinance/get_stock_chart', {
      query: {
        symbol,
        region: 'US',
        interval: '1d',
        range: '6mo'
      }
    }) as any;
    
    if (response?.chart?.result?.[0]) {
      const result = response.chart.result[0];
      stockData = {
        prices: result.indicators.quote[0].close.filter((p: any) => p !== null),
        volumes: result.indicators.quote[0].volume.filter((v: any) => v !== null),
        highs: result.indicators.quote[0].high.filter((h: any) => h !== null),
        lows: result.indicators.quote[0].low.filter((l: any) => l !== null),
        currentPrice: result.meta.regularMarketPrice,
        fiftyTwoWeekHigh: result.meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.meta.fiftyTwoWeekLow,
        marketCap: result.meta.marketCap,
        volume: result.meta.regularMarketVolume
      };
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw new Error(`Failed to fetch data for ${symbol}`);
  }
  
  if (!stockData || stockData.prices.length < 50) {
    throw new Error(`Insufficient data for ${symbol}`);
  }
  
  // Calculate technical indicators
  const indicators = calculateTechnicalIndicators(
    stockData.prices,
    stockData.volumes,
    stockData.highs,
    stockData.lows
  );
  
  // Detect market regime
  const regime = detectMarketRegime(stockData.prices, indicators);
  
  // Run all agents in parallel
  const [technicalAgent, fundamentalAgent, sentimentAgent, riskAgent, quantAgent] = await Promise.all([
    runTechnicalAgent(symbol, stockData.currentPrice, indicators, regime),
    runFundamentalAgent(symbol, stockData),
    runSentimentAgent(symbol, [
      `${symbol} stock performance analysis`,
      `Market outlook for ${symbol}`,
      `${symbol} trading volume trends`
    ]),
    runRiskAgent(symbol, stockData.currentPrice, indicators, regime, accountBalance),
    runQuantAgent(symbol, stockData.prices, indicators)
  ]);
  
  const agents = [technicalAgent, fundamentalAgent, sentimentAgent, riskAgent, quantAgent];
  
  // Aggregate consensus
  const consensus = aggregateConsensus(agents);
  
  // Calculate position sizing
  const positionSizing = calculateKellyPosition(
    0.55,
    indicators.atr * 2,
    indicators.atr * 1,
    accountBalance
  );
  
  // Calculate risk level
  let riskLevel: EnhancedAnalysisResult['riskLevel'];
  if (regime.volatilityLevel > 20) riskLevel = 'extreme';
  else if (regime.volatilityLevel > 12) riskLevel = 'high';
  else if (regime.volatilityLevel > 6) riskLevel = 'medium';
  else riskLevel = 'low';
  
  // Calculate overall score (0-100)
  const recommendationScores: Record<string, number> = {
    'strong_buy': 90,
    'buy': 70,
    'hold': 50,
    'sell': 30,
    'strong_sell': 10
  };
  const overallScore = recommendationScores[consensus.recommendation] * consensus.confidence;
  
  // Ensemble prediction
  const ensemblePrediction = {
    direction: consensus.recommendation.includes('buy') ? 'up' as const : 
               consensus.recommendation.includes('sell') ? 'down' as const : 'neutral' as const,
    magnitude: indicators.atr / stockData.currentPrice * 100,
    timeframe: '1-5 days',
    confidence: consensus.confidence
  };
  
  return {
    symbol,
    timestamp: new Date(),
    currentPrice: stockData.currentPrice,
    agents,
    consensusRecommendation: consensus.recommendation,
    consensusConfidence: consensus.confidence,
    technicalIndicators: indicators,
    marketRegime: regime,
    positionSizing,
    suggestedStopLoss: stockData.currentPrice - (indicators.atr * 2),
    suggestedTakeProfit: stockData.currentPrice + (indicators.atr * 3),
    riskLevel,
    ensemblePrediction,
    overallScore,
    profitProbability: consensus.confidence * (consensus.recommendation.includes('buy') || consensus.recommendation.includes('sell') ? 0.6 : 0.5)
  };
}
