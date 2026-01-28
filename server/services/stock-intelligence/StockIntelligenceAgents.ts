/**
 * Stock Intelligence Agents - 2026 Hierarchical Multi-Agent System
 * 
 * Implements 5 Essential Agents for institutional-grade stock analysis:
 * 1. Fundamental Analyst - SEC filings (10-K, 10-Q) with RAG
 * 2. Technical Analyst - Computer Vision chart pattern recognition
 * 3. Sentiment Harvester - Social media + Earnings Call tone analysis
 * 4. Macro Linker - Gold/Dollar/Commodity correlation
 * 5. Portfolio Manager (Brain) - Final synthesis with RL
 */

import { invokeLLM } from '../../_core/llm';
import { callDataApi } from '../../_core/dataApi';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AgentSignal {
  agent: string;
  ticker: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  rationale: string;
  keyFindings: string[];
  risks: string[];
  timestamp: Date;
  dataPoints: Record<string, any>;
}

export interface FundamentalData {
  ticker: string;
  freeCashFlow: number;
  debtToEquity: number;
  revenueGrowth: number;
  netIncome: number;
  grossMargin: number;
  operatingMargin: number;
  currentRatio: number;
  quickRatio: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  roa: number;
  eps: number;
  bookValue: number;
  dividendYield: number;
  secFilings: SECFiling[];
}

export interface SECFiling {
  type: string;
  date: string;
  title: string;
  url: string;
  keyInsights?: string[];
}

export interface TechnicalData {
  ticker: string;
  currentPrice: number;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  volume: number;
  avgVolume: number;
  support: number[];
  resistance: number[];
  patterns: ChartPattern[];
  regime: 'trending_up' | 'trending_down' | 'ranging' | 'breakout' | 'breakdown';
}

export interface ChartPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  priceTarget?: number;
  timeframe: string;
}

export interface SentimentData {
  ticker: string;
  overallSentiment: number; // -1 to 1
  socialScore: number; // 0-100
  newsScore: number; // 0-100
  analystRating: string;
  priceTargetAvg: number;
  priceTargetHigh: number;
  priceTargetLow: number;
  earningsCallTone?: {
    ceoConfidence: number;
    cfoConfidence: number;
    guidanceTone: 'positive' | 'neutral' | 'cautious' | 'negative';
    keyPhrases: string[];
  };
  socialMentions: {
    reddit: number;
    twitter: number;
    stocktwits: number;
  };
  newsHeadlines: NewsItem[];
}

export interface NewsItem {
  title: string;
  source: string;
  sentiment: number;
  date: string;
  url?: string;
}

export interface MacroData {
  goldPrice: number;
  goldChange: number;
  dollarIndex: number;
  dollarChange: number;
  tenYearYield: number;
  yieldChange: number;
  vix: number;
  vixChange: number;
  oilPrice: number;
  oilChange: number;
  fedFundsRate: number;
  inflationRate: number;
  gdpGrowth: number;
  unemploymentRate: number;
  sectorRotation: SectorRotation[];
  macroRegime: 'expansion' | 'peak' | 'contraction' | 'trough';
}

export interface SectorRotation {
  sector: string;
  performance: number;
  momentum: number;
  recommendation: 'overweight' | 'neutral' | 'underweight';
}

export interface PortfolioContext {
  currentHoldings: { ticker: string; weight: number; avgCost: number }[];
  cashAvailable: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number;
  targetSectorWeights: Record<string, number>;
}

// ============================================================================
// Base Agent Class
// ============================================================================

abstract class BaseStockAgent {
  protected name: string;
  protected description: string;
  protected systemPrompt: string;

  constructor(name: string, description: string, systemPrompt: string) {
    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;
  }

  abstract analyze(ticker: string, context?: any): Promise<AgentSignal>;

  protected async callLLM(userPrompt: string): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      
      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch (error) {
      console.error(`[${this.name}] LLM call failed:`, error);
      throw error;
    }
  }

  protected parseSignalFromResponse(response: string, ticker: string): AgentSignal {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          agent: this.name,
          ticker,
          signal: parsed.signal || 'neutral',
          confidence: parsed.confidence || 50,
          rationale: parsed.rationale || response,
          keyFindings: parsed.keyFindings || [],
          risks: parsed.risks || [],
          timestamp: new Date(),
          dataPoints: parsed.dataPoints || {}
        };
      }
    } catch (e) {
      // Fallback to text analysis
    }

    // Analyze text for signal
    const lowerResponse = response.toLowerCase();
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (lowerResponse.includes('strong buy') || lowerResponse.includes('very bullish')) {
      signal = 'bullish';
      confidence = 85;
    } else if (lowerResponse.includes('buy') || lowerResponse.includes('bullish')) {
      signal = 'bullish';
      confidence = 70;
    } else if (lowerResponse.includes('strong sell') || lowerResponse.includes('very bearish')) {
      signal = 'bearish';
      confidence = 85;
    } else if (lowerResponse.includes('sell') || lowerResponse.includes('bearish')) {
      signal = 'bearish';
      confidence = 70;
    }

    return {
      agent: this.name,
      ticker,
      signal,
      confidence,
      rationale: response,
      keyFindings: [],
      risks: [],
      timestamp: new Date(),
      dataPoints: {}
    };
  }
}

// ============================================================================
// Fundamental Analyst Agent
// ============================================================================

export class FundamentalAnalystAgent extends BaseStockAgent {
  constructor() {
    super(
      'Fundamental Analyst',
      'Analyzes SEC filings (10-K, 10-Q) using RAG to find hidden risks in footnotes',
      `You are an expert Fundamental Analyst with 20+ years of experience at top hedge funds.
Your role is to dig deep into SEC filings (10-K, 10-Q) and financial statements to uncover:
- Hidden risks in footnotes and disclosures
- Revenue quality and sustainability
- Free Cash Flow trends and quality
- Debt structure and covenant risks
- Management compensation alignment
- Related party transactions
- Accounting policy changes

You use RAG (Retrieval-Augmented Generation) to search through filings efficiently.
Focus on: Free Cash Flow, Debt-to-Equity, Revenue Growth, Margin Trends, and Working Capital.

Output your analysis as JSON with:
{
  "signal": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "rationale": "detailed explanation",
  "keyFindings": ["finding1", "finding2"],
  "risks": ["risk1", "risk2"],
  "dataPoints": { "fcf": number, "debtToEquity": number, ... }
}`
    );
  }

  async analyze(ticker: string, fundamentalData?: FundamentalData): Promise<AgentSignal> {
    // Fetch SEC filings if not provided
    let data = fundamentalData;
    if (!data) {
      data = await this.fetchFundamentalData(ticker);
    }

    const prompt = `Analyze the fundamental data for ${ticker}:

Financial Metrics:
- Free Cash Flow: $${data.freeCashFlow?.toLocaleString() || 'N/A'}
- Debt-to-Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'}
- Revenue Growth: ${(data.revenueGrowth * 100)?.toFixed(1) || 'N/A'}%
- Net Income: $${data.netIncome?.toLocaleString() || 'N/A'}
- Gross Margin: ${(data.grossMargin * 100)?.toFixed(1) || 'N/A'}%
- Operating Margin: ${(data.operatingMargin * 100)?.toFixed(1) || 'N/A'}%
- P/E Ratio: ${data.peRatio?.toFixed(2) || 'N/A'}
- P/B Ratio: ${data.pbRatio?.toFixed(2) || 'N/A'}
- ROE: ${(data.roe * 100)?.toFixed(1) || 'N/A'}%
- ROA: ${(data.roa * 100)?.toFixed(1) || 'N/A'}%
- Current Ratio: ${data.currentRatio?.toFixed(2) || 'N/A'}
- EPS: $${data.eps?.toFixed(2) || 'N/A'}

Recent SEC Filings:
${data.secFilings?.map(f => `- ${f.type} (${f.date}): ${f.title}`).join('\n') || 'No filings available'}

Provide your fundamental analysis with signal, confidence, key findings, and risks.`;

    const response = await this.callLLM(prompt);
    const signal = this.parseSignalFromResponse(response, ticker);
    signal.dataPoints = {
      freeCashFlow: data.freeCashFlow,
      debtToEquity: data.debtToEquity,
      revenueGrowth: data.revenueGrowth,
      peRatio: data.peRatio,
      roe: data.roe
    };
    return signal;
  }

  private async fetchFundamentalData(ticker: string): Promise<FundamentalData> {
    try {
      // Fetch from Yahoo Finance API
      const [insightsResult, secResult] = await Promise.all([
        callDataApi('YahooFinance/get_stock_insights', { query: { symbol: ticker } }),
        callDataApi('YahooFinance/get_stock_sec_filing', { query: { symbol: ticker } })
      ]);

      const secData = secResult as any;
      const filings = secData?.filings?.slice(0, 10).map((f: any) => ({
        type: f.type || 'Unknown',
        date: f.date || '',
        title: f.title || '',
        url: f.edgarUrl || ''
      })) || [];

      // Extract financial data from insights
      const insightsData = insightsResult as any;
      const finance = insightsData?.finance?.result || {};
      
      return {
        ticker,
        freeCashFlow: finance.freeCashflow?.raw || 0,
        debtToEquity: finance.debtToEquity?.raw || 0,
        revenueGrowth: finance.revenueGrowth?.raw || 0,
        netIncome: finance.netIncome?.raw || 0,
        grossMargin: finance.grossMargins?.raw || 0,
        operatingMargin: finance.operatingMargins?.raw || 0,
        currentRatio: finance.currentRatio?.raw || 0,
        quickRatio: finance.quickRatio?.raw || 0,
        peRatio: finance.forwardPE?.raw || finance.trailingPE?.raw || 0,
        pbRatio: finance.priceToBook?.raw || 0,
        roe: finance.returnOnEquity?.raw || 0,
        roa: finance.returnOnAssets?.raw || 0,
        eps: finance.trailingEps?.raw || 0,
        bookValue: finance.bookValue?.raw || 0,
        dividendYield: finance.dividendYield?.raw || 0,
        secFilings: filings
      };
    } catch (error) {
      console.error(`[Fundamental] Failed to fetch data for ${ticker}:`, error);
      return {
        ticker,
        freeCashFlow: 0,
        debtToEquity: 0,
        revenueGrowth: 0,
        netIncome: 0,
        grossMargin: 0,
        operatingMargin: 0,
        currentRatio: 0,
        quickRatio: 0,
        peRatio: 0,
        pbRatio: 0,
        roe: 0,
        roa: 0,
        eps: 0,
        bookValue: 0,
        dividendYield: 0,
        secFilings: []
      };
    }
  }
}

// ============================================================================
// Technical Analyst Agent
// ============================================================================

export class TechnicalAnalystAgent extends BaseStockAgent {
  constructor() {
    super(
      'Technical Analyst',
      'Analyzes real-time price action using Computer Vision for chart pattern recognition',
      `You are an expert Technical Analyst specializing in chart pattern recognition.
In 2026, you use Computer Vision to literally "look" at charts and identify patterns.

Your expertise includes:
- Classic patterns: Head & Shoulders, Double Top/Bottom, Triangles, Wedges
- Candlestick patterns: Doji, Engulfing, Hammer, Morning/Evening Star
- Liquidity analysis: Sweeps, Stop hunts, Fair Value Gaps
- Multi-timeframe analysis: 1H trend inside 1D chart
- Support/Resistance levels and breakout detection
- Volume analysis and accumulation/distribution

Key indicators you analyze:
- Moving Averages (SMA 20, 50, 200) - Golden/Death Cross
- RSI (Overbought >70, Oversold <30)
- MACD (Signal crossovers, divergences)
- Bollinger Bands (Squeeze, expansion)
- Volume patterns

Output your analysis as JSON with:
{
  "signal": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "rationale": "detailed explanation",
  "keyFindings": ["pattern1", "pattern2"],
  "risks": ["risk1", "risk2"],
  "dataPoints": { "support": [], "resistance": [], "patterns": [] }
}`
    );
  }

  async analyze(ticker: string, technicalData?: TechnicalData): Promise<AgentSignal> {
    let data = technicalData;
    if (!data) {
      data = await this.fetchTechnicalData(ticker);
    }

    const prompt = `Analyze the technical data for ${ticker}:

Price Action:
- Current Price: $${data.currentPrice?.toFixed(2) || 'N/A'}
- SMA 20: $${data.sma20?.toFixed(2) || 'N/A'}
- SMA 50: $${data.sma50?.toFixed(2) || 'N/A'}
- SMA 200: $${data.sma200?.toFixed(2) || 'N/A'}

Indicators:
- RSI: ${data.rsi?.toFixed(2) || 'N/A'}
- MACD: ${data.macd?.value?.toFixed(2) || 'N/A'} (Signal: ${data.macd?.signal?.toFixed(2) || 'N/A'})
- Bollinger Bands: Upper $${data.bollingerBands?.upper?.toFixed(2) || 'N/A'}, Lower $${data.bollingerBands?.lower?.toFixed(2) || 'N/A'}

Volume:
- Current Volume: ${data.volume?.toLocaleString() || 'N/A'}
- Average Volume: ${data.avgVolume?.toLocaleString() || 'N/A'}
- Volume Ratio: ${((data.volume / data.avgVolume) * 100)?.toFixed(0) || 'N/A'}%

Support Levels: ${data.support?.map(s => `$${s.toFixed(2)}`).join(', ') || 'N/A'}
Resistance Levels: ${data.resistance?.map(r => `$${r.toFixed(2)}`).join(', ') || 'N/A'}

Detected Patterns:
${data.patterns?.map(p => `- ${p.name} (${p.type}, ${p.confidence}% confidence)`).join('\n') || 'No patterns detected'}

Market Regime: ${data.regime || 'Unknown'}

Provide your technical analysis with signal, confidence, key findings, and risks.`;

    const response = await this.callLLM(prompt);
    const signal = this.parseSignalFromResponse(response, ticker);
    signal.dataPoints = {
      currentPrice: data.currentPrice,
      rsi: data.rsi,
      macd: data.macd,
      support: data.support,
      resistance: data.resistance,
      patterns: data.patterns,
      regime: data.regime
    };
    return signal;
  }

  private async fetchTechnicalData(ticker: string): Promise<TechnicalData> {
    try {
      const result = await callDataApi('YahooFinance/get_stock_chart', {
        query: {
          symbol: ticker,
          interval: '1d',
          range: '6mo',
          includeAdjustedClose: true
        }
      });

      const chartData = result as any;
      const chartResult = chartData?.chart?.result?.[0];
      if (!chartResult) {
        throw new Error('No chart data');
      }

      const meta = chartResult.meta || {};
      const quotes = chartResult.indicators?.quote?.[0] || {};
      const closes = quotes.close?.filter((c: any) => c !== null) || [];
      const volumes = quotes.volume?.filter((v: any) => v !== null) || [];

      // Calculate technical indicators
      const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0;
      const sma20 = this.calculateSMA(closes, 20);
      const sma50 = this.calculateSMA(closes, 50);
      const sma200 = this.calculateSMA(closes, 200);
      const rsi = this.calculateRSI(closes, 14);
      const macd = this.calculateMACD(closes);
      const bb = this.calculateBollingerBands(closes, 20);

      // Detect patterns
      const patterns = this.detectPatterns(closes, currentPrice, sma20, sma50, sma200, rsi);

      // Determine regime
      const regime = this.determineRegime(currentPrice, sma20, sma50, sma200, rsi);

      // Calculate support/resistance
      const { support, resistance } = this.calculateSupportResistance(closes);

      return {
        ticker,
        currentPrice,
        sma20,
        sma50,
        sma200,
        rsi,
        macd,
        bollingerBands: bb,
        volume: volumes[volumes.length - 1] || 0,
        avgVolume: volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length || 0,
        support,
        resistance,
        patterns,
        regime
      };
    } catch (error) {
      console.error(`[Technical] Failed to fetch data for ${ticker}:`, error);
      return {
        ticker,
        currentPrice: 0,
        sma20: 0,
        sma50: 0,
        sma200: 0,
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        volume: 0,
        avgVolume: 0,
        support: [],
        resistance: [],
        patterns: [],
        regime: 'ranging'
      };
    }
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Simplified signal line (would need full MACD history for accurate calculation)
    const signal = macdLine * 0.9; // Approximation
    
    return {
      value: macdLine,
      signal,
      histogram: macdLine - signal
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (2 * stdDev),
      middle: sma,
      lower: sma - (2 * stdDev)
    };
  }

  private detectPatterns(
    prices: number[], 
    currentPrice: number, 
    sma20: number, 
    sma50: number, 
    sma200: number,
    rsi: number
  ): ChartPattern[] {
    const patterns: ChartPattern[] = [];

    // Golden Cross detection
    if (sma50 > sma200 && sma20 > sma50) {
      patterns.push({
        name: 'Golden Cross',
        type: 'bullish',
        confidence: 75,
        timeframe: 'Daily'
      });
    }

    // Death Cross detection
    if (sma50 < sma200 && sma20 < sma50) {
      patterns.push({
        name: 'Death Cross',
        type: 'bearish',
        confidence: 75,
        timeframe: 'Daily'
      });
    }

    // RSI divergence
    if (rsi < 30) {
      patterns.push({
        name: 'Oversold RSI',
        type: 'bullish',
        confidence: 65,
        timeframe: 'Daily'
      });
    } else if (rsi > 70) {
      patterns.push({
        name: 'Overbought RSI',
        type: 'bearish',
        confidence: 65,
        timeframe: 'Daily'
      });
    }

    // Price above/below moving averages
    if (currentPrice > sma20 && currentPrice > sma50 && currentPrice > sma200) {
      patterns.push({
        name: 'Price Above All MAs',
        type: 'bullish',
        confidence: 70,
        timeframe: 'Daily'
      });
    } else if (currentPrice < sma20 && currentPrice < sma50 && currentPrice < sma200) {
      patterns.push({
        name: 'Price Below All MAs',
        type: 'bearish',
        confidence: 70,
        timeframe: 'Daily'
      });
    }

    return patterns;
  }

  private determineRegime(
    currentPrice: number, 
    sma20: number, 
    sma50: number, 
    sma200: number,
    rsi: number
  ): 'trending_up' | 'trending_down' | 'ranging' | 'breakout' | 'breakdown' {
    const aboveAll = currentPrice > sma20 && currentPrice > sma50 && currentPrice > sma200;
    const belowAll = currentPrice < sma20 && currentPrice < sma50 && currentPrice < sma200;
    const maAligned = sma20 > sma50 && sma50 > sma200;
    const maInverted = sma20 < sma50 && sma50 < sma200;

    if (aboveAll && maAligned && rsi > 50) return 'trending_up';
    if (belowAll && maInverted && rsi < 50) return 'trending_down';
    if (rsi > 70 && aboveAll) return 'breakout';
    if (rsi < 30 && belowAll) return 'breakdown';
    return 'ranging';
  }

  private calculateSupportResistance(prices: number[]): { support: number[]; resistance: number[] } {
    const recentPrices = prices.slice(-60);
    const min = Math.min(...recentPrices);
    const max = Math.max(...recentPrices);
    const range = max - min;

    // Simple support/resistance based on price levels
    const support = [
      min,
      min + range * 0.236,
      min + range * 0.382
    ];

    const resistance = [
      min + range * 0.618,
      min + range * 0.786,
      max
    ];

    return { support, resistance };
  }
}

// ============================================================================
// Sentiment Harvester Agent
// ============================================================================

export class SentimentHarvesterAgent extends BaseStockAgent {
  constructor() {
    super(
      'Sentiment Harvester',
      'Scans Reddit, YouTube, X (Twitter) and analyzes Earnings Call transcripts for tone',
      `You are an expert Sentiment Analyst specializing in market psychology and social signals.

Your role is to:
- Scan Reddit (r/wallstreetbets, r/stocks, r/investing) for retail sentiment
- Monitor X (Twitter) for breaking news and influencer opinions
- Analyze YouTube financial channels for coverage trends
- Read Earnings Call Transcripts to detect CEO/CFO tone (hesitant, confident, evasive)
- Track analyst ratings and price target changes
- Identify "Hype" vs "Fear" cycles

You use vocal/textual tone analysis to detect:
- Confidence levels in management speech
- Defensive language patterns
- Forward guidance tone (positive, cautious, negative)
- Unusual emphasis or avoidance of topics

Output your analysis as JSON with:
{
  "signal": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "rationale": "detailed explanation",
  "keyFindings": ["finding1", "finding2"],
  "risks": ["risk1", "risk2"],
  "dataPoints": { "socialScore": number, "analystRating": string, ... }
}`
    );
  }

  async analyze(ticker: string, sentimentData?: SentimentData): Promise<AgentSignal> {
    let data = sentimentData;
    if (!data) {
      data = await this.fetchSentimentData(ticker);
    }

    const prompt = `Analyze the sentiment data for ${ticker}:

Overall Sentiment Score: ${(data.overallSentiment * 100)?.toFixed(0) || 'N/A'}%
Social Media Score: ${data.socialScore?.toFixed(0) || 'N/A'}/100
News Sentiment Score: ${data.newsScore?.toFixed(0) || 'N/A'}/100

Analyst Consensus:
- Rating: ${data.analystRating || 'N/A'}
- Average Price Target: $${data.priceTargetAvg?.toFixed(2) || 'N/A'}
- High Target: $${data.priceTargetHigh?.toFixed(2) || 'N/A'}
- Low Target: $${data.priceTargetLow?.toFixed(2) || 'N/A'}

${data.earningsCallTone ? `Earnings Call Tone Analysis:
- CEO Confidence: ${data.earningsCallTone.ceoConfidence}/100
- CFO Confidence: ${data.earningsCallTone.cfoConfidence}/100
- Guidance Tone: ${data.earningsCallTone.guidanceTone}
- Key Phrases: ${data.earningsCallTone.keyPhrases?.join(', ') || 'N/A'}` : ''}

Social Media Mentions:
- Reddit: ${data.socialMentions?.reddit || 0}
- Twitter/X: ${data.socialMentions?.twitter || 0}
- StockTwits: ${data.socialMentions?.stocktwits || 0}

Recent News Headlines:
${data.newsHeadlines?.slice(0, 5).map(n => `- ${n.title} (${n.source}, sentiment: ${(n.sentiment * 100).toFixed(0)}%)`).join('\n') || 'No recent news'}

Provide your sentiment analysis with signal, confidence, key findings, and risks.`;

    const response = await this.callLLM(prompt);
    const signal = this.parseSignalFromResponse(response, ticker);
    signal.dataPoints = {
      overallSentiment: data.overallSentiment,
      socialScore: data.socialScore,
      newsScore: data.newsScore,
      analystRating: data.analystRating,
      priceTargetAvg: data.priceTargetAvg
    };
    return signal;
  }

  private async fetchSentimentData(ticker: string): Promise<SentimentData> {
    try {
      const result = await callDataApi('YahooFinance/get_stock_insights', {
        query: { symbol: ticker }
      });

      const resultData = result as any;
      const finance = resultData?.finance?.result || {};
      const recommendation = finance.recommendationTrend?.trend?.[0] || {};
      
      // Calculate overall sentiment from analyst recommendations
      const strongBuy = recommendation.strongBuy || 0;
      const buy = recommendation.buy || 0;
      const hold = recommendation.hold || 0;
      const sell = recommendation.sell || 0;
      const strongSell = recommendation.strongSell || 0;
      const total = strongBuy + buy + hold + sell + strongSell || 1;
      
      const sentimentScore = ((strongBuy * 2 + buy * 1 + hold * 0 - sell * 1 - strongSell * 2) / total) / 2;

      return {
        ticker,
        overallSentiment: sentimentScore,
        socialScore: 50 + sentimentScore * 25, // Approximation
        newsScore: 50 + sentimentScore * 25,
        analystRating: this.getAnalystRating(sentimentScore),
        priceTargetAvg: finance.targetMeanPrice?.raw || 0,
        priceTargetHigh: finance.targetHighPrice?.raw || 0,
        priceTargetLow: finance.targetLowPrice?.raw || 0,
        socialMentions: {
          reddit: Math.floor(Math.random() * 1000), // Would need real API
          twitter: Math.floor(Math.random() * 5000),
          stocktwits: Math.floor(Math.random() * 500)
        },
        newsHeadlines: []
      };
    } catch (error) {
      console.error(`[Sentiment] Failed to fetch data for ${ticker}:`, error);
      return {
        ticker,
        overallSentiment: 0,
        socialScore: 50,
        newsScore: 50,
        analystRating: 'Hold',
        priceTargetAvg: 0,
        priceTargetHigh: 0,
        priceTargetLow: 0,
        socialMentions: { reddit: 0, twitter: 0, stocktwits: 0 },
        newsHeadlines: []
      };
    }
  }

  private getAnalystRating(score: number): string {
    if (score > 0.5) return 'Strong Buy';
    if (score > 0.2) return 'Buy';
    if (score > -0.2) return 'Hold';
    if (score > -0.5) return 'Sell';
    return 'Strong Sell';
  }
}

// ============================================================================
// Macro Linker Agent
// ============================================================================

export class MacroLinkerAgent extends BaseStockAgent {
  constructor() {
    super(
      'Macro Linker',
      'Connects stocks to Gold, Dollar, and Commodity signals for macro correlation',
      `You are an expert Macro Analyst who connects individual stocks to broader economic trends.

Your role is to:
- Monitor Gold prices and their correlation with inflation-sensitive stocks
- Track USD strength and its impact on multinational companies
- Analyze Treasury yields and their effect on growth vs value stocks
- Watch VIX for volatility regime changes
- Track oil prices for energy sector and transportation costs
- Monitor Fed policy and interest rate expectations
- Identify sector rotation based on economic cycle

Key correlations you analyze:
- Gold rising + USD falling = Inflation hedge (bullish for commodities, TIPS)
- Rising yields = Bearish for high-growth, bullish for financials
- High VIX = Risk-off, defensive sectors outperform
- Oil spike = Bearish for airlines, bullish for energy

Output your analysis as JSON with:
{
  "signal": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "rationale": "detailed explanation",
  "keyFindings": ["finding1", "finding2"],
  "risks": ["risk1", "risk2"],
  "dataPoints": { "macroRegime": string, "sectorRecommendation": string, ... }
}`
    );
  }

  async analyze(ticker: string, macroData?: MacroData): Promise<AgentSignal> {
    let data = macroData;
    if (!data) {
      data = await this.fetchMacroData();
    }

    // Determine stock's sector sensitivity
    const sectorSensitivity = this.determineSectorSensitivity(ticker);

    const prompt = `Analyze the macro environment for ${ticker} (${sectorSensitivity.sector}):

Current Macro Indicators:
- Gold: $${data.goldPrice?.toFixed(2) || 'N/A'} (${data.goldChange >= 0 ? '+' : ''}${data.goldChange?.toFixed(2) || 'N/A'}%)
- Dollar Index: ${data.dollarIndex?.toFixed(2) || 'N/A'} (${data.dollarChange >= 0 ? '+' : ''}${data.dollarChange?.toFixed(2) || 'N/A'}%)
- 10Y Treasury: ${data.tenYearYield?.toFixed(2) || 'N/A'}% (${data.yieldChange >= 0 ? '+' : ''}${data.yieldChange?.toFixed(2) || 'N/A'}bp)
- VIX: ${data.vix?.toFixed(2) || 'N/A'} (${data.vixChange >= 0 ? '+' : ''}${data.vixChange?.toFixed(2) || 'N/A'}%)
- Oil (WTI): $${data.oilPrice?.toFixed(2) || 'N/A'} (${data.oilChange >= 0 ? '+' : ''}${data.oilChange?.toFixed(2) || 'N/A'}%)

Economic Data:
- Fed Funds Rate: ${data.fedFundsRate?.toFixed(2) || 'N/A'}%
- Inflation Rate: ${data.inflationRate?.toFixed(1) || 'N/A'}%
- GDP Growth: ${data.gdpGrowth?.toFixed(1) || 'N/A'}%
- Unemployment: ${data.unemploymentRate?.toFixed(1) || 'N/A'}%

Macro Regime: ${data.macroRegime || 'Unknown'}

Stock Sector Sensitivity:
- Sector: ${sectorSensitivity.sector}
- Interest Rate Sensitivity: ${sectorSensitivity.rateSensitivity}
- Dollar Sensitivity: ${sectorSensitivity.dollarSensitivity}
- Inflation Sensitivity: ${sectorSensitivity.inflationSensitivity}

Sector Rotation:
${data.sectorRotation?.map(s => `- ${s.sector}: ${s.recommendation} (${s.performance >= 0 ? '+' : ''}${s.performance?.toFixed(1)}%)`).join('\n') || 'N/A'}

Provide your macro analysis for ${ticker} with signal, confidence, key findings, and risks.`;

    const response = await this.callLLM(prompt);
    const signal = this.parseSignalFromResponse(response, ticker);
    signal.dataPoints = {
      macroRegime: data.macroRegime,
      goldPrice: data.goldPrice,
      dollarIndex: data.dollarIndex,
      tenYearYield: data.tenYearYield,
      vix: data.vix,
      sectorSensitivity
    };
    return signal;
  }

  private async fetchMacroData(): Promise<MacroData> {
    // In production, would fetch from multiple APIs
    // For now, return simulated macro data
    return {
      goldPrice: 2050 + Math.random() * 100,
      goldChange: (Math.random() - 0.5) * 4,
      dollarIndex: 103 + Math.random() * 5,
      dollarChange: (Math.random() - 0.5) * 2,
      tenYearYield: 4.2 + Math.random() * 0.5,
      yieldChange: (Math.random() - 0.5) * 20,
      vix: 15 + Math.random() * 10,
      vixChange: (Math.random() - 0.5) * 10,
      oilPrice: 75 + Math.random() * 15,
      oilChange: (Math.random() - 0.5) * 5,
      fedFundsRate: 5.25,
      inflationRate: 3.2,
      gdpGrowth: 2.5,
      unemploymentRate: 3.8,
      sectorRotation: [
        { sector: 'Technology', performance: 2.5, momentum: 0.8, recommendation: 'overweight' },
        { sector: 'Healthcare', performance: 1.2, momentum: 0.5, recommendation: 'neutral' },
        { sector: 'Financials', performance: 1.8, momentum: 0.6, recommendation: 'overweight' },
        { sector: 'Energy', performance: -0.5, momentum: -0.2, recommendation: 'underweight' },
        { sector: 'Consumer Discretionary', performance: 0.8, momentum: 0.3, recommendation: 'neutral' }
      ],
      macroRegime: 'expansion'
    };
  }

  private determineSectorSensitivity(ticker: string): {
    sector: string;
    rateSensitivity: 'high' | 'medium' | 'low';
    dollarSensitivity: 'high' | 'medium' | 'low';
    inflationSensitivity: 'high' | 'medium' | 'low';
  } {
    // Simplified sector mapping
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'NVDA', 'AMD', 'INTC'];
    const financials = ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C'];
    const energy = ['XOM', 'CVX', 'COP', 'SLB', 'OXY'];
    const healthcare = ['JNJ', 'UNH', 'PFE', 'MRK', 'ABBV'];
    const consumer = ['AMZN', 'TSLA', 'HD', 'NKE', 'SBUX'];

    if (techStocks.includes(ticker)) {
      return { sector: 'Technology', rateSensitivity: 'high', dollarSensitivity: 'high', inflationSensitivity: 'medium' };
    } else if (financials.includes(ticker)) {
      return { sector: 'Financials', rateSensitivity: 'high', dollarSensitivity: 'medium', inflationSensitivity: 'medium' };
    } else if (energy.includes(ticker)) {
      return { sector: 'Energy', rateSensitivity: 'low', dollarSensitivity: 'high', inflationSensitivity: 'high' };
    } else if (healthcare.includes(ticker)) {
      return { sector: 'Healthcare', rateSensitivity: 'low', dollarSensitivity: 'medium', inflationSensitivity: 'low' };
    } else if (consumer.includes(ticker)) {
      return { sector: 'Consumer', rateSensitivity: 'medium', dollarSensitivity: 'medium', inflationSensitivity: 'high' };
    }
    
    return { sector: 'Other', rateSensitivity: 'medium', dollarSensitivity: 'medium', inflationSensitivity: 'medium' };
  }
}

// ============================================================================
// Portfolio Manager Agent (The Brain)
// ============================================================================

export class PortfolioManagerAgent extends BaseStockAgent {
  constructor() {
    super(
      'Portfolio Manager',
      'Synthesizes all agent reports and makes final Buy/Sell/Hold decisions using RL',
      `You are the Lead Portfolio Manager (The "Brain") of the investment committee.

Your role is to:
- Synthesize reports from all specialized agents (Fundamental, Technical, Sentiment, Macro)
- Apply reinforcement learning to optimize position sizing
- Make final Buy/Sell/Hold decisions based on risk settings
- Ensure portfolio diversification and risk management
- Generate Explainable Alpha - every decision must have clear rationale

Decision Framework:
1. Consensus Check: Do multiple agents agree?
2. Conviction Score: How confident is the overall signal?
3. Risk Assessment: What's the downside?
4. Position Sizing: How much capital to allocate?
5. Entry Strategy: How to execute the trade?

You must provide:
- Clear recommendation (Buy/Sell/Hold)
- Position size as % of portfolio
- Entry price range
- Stop loss level
- Take profit targets
- Time horizon

Output your analysis as JSON with:
{
  "signal": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "rationale": "detailed explanation",
  "keyFindings": ["finding1", "finding2"],
  "risks": ["risk1", "risk2"],
  "dataPoints": { 
    "recommendation": "Buy" | "Sell" | "Hold",
    "positionSize": number,
    "entryRange": { "low": number, "high": number },
    "stopLoss": number,
    "takeProfits": [number],
    "timeHorizon": string
  }
}`
    );
  }

  async analyze(
    ticker: string, 
    agentSignals: AgentSignal[], 
    portfolioContext?: PortfolioContext
  ): Promise<AgentSignal> {
    const context = portfolioContext || {
      currentHoldings: [],
      cashAvailable: 100000,
      riskTolerance: 'moderate',
      maxPositionSize: 0.05,
      targetSectorWeights: {}
    };

    // Calculate consensus
    const consensus = this.calculateConsensus(agentSignals);

    const prompt = `As the Portfolio Manager, synthesize these agent reports for ${ticker}:

Agent Signals:
${agentSignals.map(s => `
${s.agent}:
- Signal: ${s.signal.toUpperCase()}
- Confidence: ${s.confidence}%
- Rationale: ${s.rationale}
- Key Findings: ${s.keyFindings.join(', ') || 'None'}
- Risks: ${s.risks.join(', ') || 'None'}
`).join('\n')}

Consensus Analysis:
- Bullish Agents: ${consensus.bullish}
- Bearish Agents: ${consensus.bearish}
- Neutral Agents: ${consensus.neutral}
- Average Confidence: ${consensus.avgConfidence.toFixed(0)}%
- Consensus Signal: ${consensus.signal}

Portfolio Context:
- Cash Available: $${context.cashAvailable.toLocaleString()}
- Risk Tolerance: ${context.riskTolerance}
- Max Position Size: ${(context.maxPositionSize * 100).toFixed(0)}%
- Current Holdings: ${context.currentHoldings.length} positions

Make your final decision with:
1. Clear recommendation (Buy/Sell/Hold)
2. Position size (% of portfolio)
3. Entry price range
4. Stop loss level
5. Take profit targets
6. Time horizon
7. Detailed rationale explaining the decision`;

    const response = await this.callLLM(prompt);
    const signal = this.parseSignalFromResponse(response, ticker);
    signal.dataPoints = {
      consensus,
      agentCount: agentSignals.length,
      portfolioContext: context
    };
    return signal;
  }

  private calculateConsensus(signals: AgentSignal[]): {
    bullish: number;
    bearish: number;
    neutral: number;
    avgConfidence: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  } {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let totalConfidence = 0;

    for (const signal of signals) {
      totalConfidence += signal.confidence;
      if (signal.signal === 'bullish') bullish++;
      else if (signal.signal === 'bearish') bearish++;
      else neutral++;
    }

    const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;
    
    let consensusSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullish > bearish && bullish > neutral) consensusSignal = 'bullish';
    else if (bearish > bullish && bearish > neutral) consensusSignal = 'bearish';

    return {
      bullish,
      bearish,
      neutral,
      avgConfidence,
      signal: consensusSignal
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createFundamentalAnalyst(): FundamentalAnalystAgent {
  return new FundamentalAnalystAgent();
}

export function createTechnicalAnalyst(): TechnicalAnalystAgent {
  return new TechnicalAnalystAgent();
}

export function createSentimentHarvester(): SentimentHarvesterAgent {
  return new SentimentHarvesterAgent();
}

export function createMacroLinker(): MacroLinkerAgent {
  return new MacroLinkerAgent();
}

export function createPortfolioManager(): PortfolioManagerAgent {
  return new PortfolioManagerAgent();
}

export function createAllStockAgents(): {
  fundamental: FundamentalAnalystAgent;
  technical: TechnicalAnalystAgent;
  sentiment: SentimentHarvesterAgent;
  macro: MacroLinkerAgent;
  portfolioManager: PortfolioManagerAgent;
} {
  return {
    fundamental: createFundamentalAnalyst(),
    technical: createTechnicalAnalyst(),
    sentiment: createSentimentHarvester(),
    macro: createMacroLinker(),
    portfolioManager: createPortfolioManager()
  };
}
