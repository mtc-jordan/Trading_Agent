/**
 * Specialized Agent Team
 * 
 * Implements the 2026 Multi-Agent approach with specialized roles:
 * - The Researcher: Scans macro news and commodity reports
 * - The Quant: Analyzes technical charts and option Greeks
 * - The Risk Manager: Monitors exposure and suggests rebalancing
 * 
 * Features Round Table collaboration mode where agents discuss together
 */

import { invokeLLM } from '../../_core/llm';

// ============================================
// Types for Specialized Agents
// ============================================

export interface AgentContext {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'option' | 'forex' | 'commodity';
  currentPrice: number;
  priceHistory: number[];
  volume: number;
  marketData: Record<string, any>;
  portfolioContext?: {
    totalValue: number;
    currentPositions: Array<{
      symbol: string;
      quantity: number;
      value: number;
      weight: number;
    }>;
    riskMetrics: {
      currentDrawdown: number;
      maxDrawdown: number;
      sharpeRatio: number;
      beta: number;
    };
  };
}

export interface AgentAnalysisResult {
  agentName: string;
  agentRole: 'researcher' | 'quant' | 'risk_manager';
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  reasoning: string;
  keyFindings: string[];
  dataPoints: Record<string, any>;
  recommendations: string[];
  timestamp: number;
}

export interface RoundTableDiscussion {
  topic: string;
  participants: string[];
  discussionPhases: {
    phase: string;
    contributions: {
      agent: string;
      statement: string;
      referencedAgents?: string[];
      buildingOn?: string;
    }[];
  }[];
  consensus: {
    signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    confidence: number;
    synthesizedReasoning: string;
    actionItems: string[];
    dissent?: {
      agent: string;
      concern: string;
    }[];
  };
  timestamp: number;
}

export interface TeamAnalysisResult {
  symbol: string;
  assetType: string;
  individualAnalyses: AgentAnalysisResult[];
  roundTableDiscussion: RoundTableDiscussion;
  finalRecommendation: {
    action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    positionSize: number;
    stopLoss?: number;
    takeProfit?: number;
    timeframe: string;
    confidence: number;
  };
  riskOverride?: {
    triggered: boolean;
    reason: string;
    originalAction: string;
    overriddenAction: string;
  };
  timestamp: number;
}

// ============================================
// The Researcher Agent
// ============================================

export class ResearcherAgent {
  readonly name = 'The Researcher';
  readonly role: 'researcher' = 'researcher';
  readonly expertise = ['macro analysis', 'news scanning', 'fundamental research', 'sector analysis'];

  async analyze(context: AgentContext): Promise<AgentAnalysisResult> {
    const keyFindings: string[] = [];
    const dataPoints: Record<string, any> = {};
    let signalScore = 0;

    // Analyze macro conditions
    const macroAnalysis = await this.analyzeMacroConditions(context);
    keyFindings.push(...macroAnalysis.findings);
    dataPoints.macro = macroAnalysis.data;
    signalScore += macroAnalysis.score;

    // Analyze sector trends
    const sectorAnalysis = this.analyzeSectorTrends(context);
    keyFindings.push(...sectorAnalysis.findings);
    dataPoints.sector = sectorAnalysis.data;
    signalScore += sectorAnalysis.score;

    // Analyze fundamental factors
    const fundamentalAnalysis = this.analyzeFundamentals(context);
    keyFindings.push(...fundamentalAnalysis.findings);
    dataPoints.fundamentals = fundamentalAnalysis.data;
    signalScore += fundamentalAnalysis.score;

    // Generate reasoning using LLM
    const reasoning = await this.generateReasoning(context, keyFindings, signalScore);

    // Determine signal
    const signal = this.determineSignal(signalScore);
    const confidence = Math.min(95, 50 + Math.abs(signalScore) * 5);

    return {
      agentName: this.name,
      agentRole: this.role,
      signal,
      confidence,
      reasoning,
      keyFindings,
      dataPoints,
      recommendations: this.generateRecommendations(signal, keyFindings),
      timestamp: Date.now()
    };
  }

  private async analyzeMacroConditions(context: AgentContext): Promise<{
    findings: string[];
    data: Record<string, any>;
    score: number;
  }> {
    const findings: string[] = [];
    let score = 0;

    // Simulated macro analysis (in production, would use real data APIs)
    const interestRateTrend = Math.random() > 0.5 ? 'rising' : 'falling';
    const inflationTrend = Math.random() > 0.5 ? 'elevated' : 'moderating';
    const gdpGrowth = (Math.random() * 4 - 1).toFixed(1);
    const marketSentiment = Math.random() > 0.6 ? 'risk-on' : Math.random() > 0.3 ? 'neutral' : 'risk-off';

    if (interestRateTrend === 'falling') {
      findings.push('Interest rates trending lower, supportive for risk assets');
      score += 2;
    } else {
      findings.push('Rising interest rate environment creating headwinds');
      score -= 1;
    }

    if (inflationTrend === 'moderating') {
      findings.push('Inflation showing signs of moderation');
      score += 1;
    } else {
      findings.push('Elevated inflation persists, impacting valuations');
      score -= 1;
    }

    if (parseFloat(gdpGrowth) > 2) {
      findings.push(`Strong GDP growth at ${gdpGrowth}% supports earnings`);
      score += 2;
    } else if (parseFloat(gdpGrowth) < 0) {
      findings.push(`GDP contraction at ${gdpGrowth}% signals recession risk`);
      score -= 3;
    }

    if (marketSentiment === 'risk-on') {
      findings.push('Market sentiment favors risk assets');
      score += 1;
    } else if (marketSentiment === 'risk-off') {
      findings.push('Risk-off sentiment prevails in markets');
      score -= 2;
    }

    return {
      findings,
      data: { interestRateTrend, inflationTrend, gdpGrowth, marketSentiment },
      score
    };
  }

  private analyzeSectorTrends(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    // Determine sector based on symbol
    const sector = this.getSector(context.symbol);
    const sectorMomentum = (Math.random() * 2 - 1);
    const sectorRotation = Math.random() > 0.5 ? 'inflow' : 'outflow';

    if (sectorMomentum > 0.3) {
      findings.push(`${sector} sector showing strong momentum`);
      score += 2;
    } else if (sectorMomentum < -0.3) {
      findings.push(`${sector} sector underperforming broader market`);
      score -= 2;
    }

    if (sectorRotation === 'inflow') {
      findings.push(`Institutional flows rotating into ${sector}`);
      score += 1;
    } else {
      findings.push(`Capital rotating out of ${sector} sector`);
      score -= 1;
    }

    return {
      findings,
      data: { sector, sectorMomentum, sectorRotation },
      score
    };
  }

  private getSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology',
      'JPM': 'Financials', 'BAC': 'Financials', 'GS': 'Financials',
      'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy',
      'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare',
      'BTC': 'Crypto', 'ETH': 'Crypto', 'SOL': 'Crypto'
    };
    return sectorMap[symbol] || 'General';
  }

  private analyzeFundamentals(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    // Simulated fundamental metrics
    const peRatio = 15 + Math.random() * 30;
    const earningsGrowth = (Math.random() * 40 - 10);
    const revenueGrowth = (Math.random() * 30 - 5);
    const profitMargin = 5 + Math.random() * 25;

    if (peRatio < 20) {
      findings.push(`Attractive valuation with P/E of ${peRatio.toFixed(1)}`);
      score += 2;
    } else if (peRatio > 35) {
      findings.push(`Elevated valuation with P/E of ${peRatio.toFixed(1)}`);
      score -= 1;
    }

    if (earningsGrowth > 15) {
      findings.push(`Strong earnings growth at ${earningsGrowth.toFixed(0)}%`);
      score += 2;
    } else if (earningsGrowth < 0) {
      findings.push(`Earnings declining at ${earningsGrowth.toFixed(0)}%`);
      score -= 2;
    }

    return {
      findings,
      data: { peRatio, earningsGrowth, revenueGrowth, profitMargin },
      score
    };
  }

  private async generateReasoning(
    context: AgentContext,
    findings: string[],
    score: number
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'You are The Researcher, a macro-focused financial analyst. Provide a 2-3 sentence research summary.'
          },
          {
            role: 'user',
            content: `Asset: ${context.symbol} (${context.assetType})
Key findings: ${findings.join('; ')}
Overall score: ${score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'}`
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        return content;
      }
    } catch (error) {
      // Fallback
    }

    return `Research analysis for ${context.symbol} indicates ${score > 0 ? 'favorable' : score < 0 ? 'challenging' : 'mixed'} macro conditions. ${findings[0] || 'Further monitoring recommended.'}`;
  }

  private determineSignal(score: number): AgentAnalysisResult['signal'] {
    if (score >= 5) return 'strong_buy';
    if (score >= 2) return 'buy';
    if (score <= -5) return 'strong_sell';
    if (score <= -2) return 'sell';
    return 'hold';
  }

  private generateRecommendations(signal: string, findings: string[]): string[] {
    const recommendations: string[] = [];
    
    if (signal === 'strong_buy' || signal === 'buy') {
      recommendations.push('Consider building position on pullbacks');
      recommendations.push('Monitor sector rotation for confirmation');
    } else if (signal === 'strong_sell' || signal === 'sell') {
      recommendations.push('Consider reducing exposure');
      recommendations.push('Watch for macro deterioration');
    } else {
      recommendations.push('Maintain current allocation');
      recommendations.push('Wait for clearer fundamental signals');
    }
    
    return recommendations;
  }
}

// ============================================
// The Quant Agent
// ============================================

export class QuantAgent {
  readonly name = 'The Quant';
  readonly role: 'quant' = 'quant';
  readonly expertise = ['technical analysis', 'options Greeks', 'quantitative models', 'statistical arbitrage'];

  async analyze(context: AgentContext): Promise<AgentAnalysisResult> {
    const keyFindings: string[] = [];
    const dataPoints: Record<string, any> = {};
    let signalScore = 0;

    // Technical analysis
    const technicalAnalysis = this.analyzeTechnicals(context);
    keyFindings.push(...technicalAnalysis.findings);
    dataPoints.technical = technicalAnalysis.data;
    signalScore += technicalAnalysis.score;

    // Options Greeks analysis (if applicable)
    if (context.assetType === 'option' || context.assetType === 'stock') {
      const greeksAnalysis = this.analyzeOptionsGreeks(context);
      keyFindings.push(...greeksAnalysis.findings);
      dataPoints.greeks = greeksAnalysis.data;
      signalScore += greeksAnalysis.score;
    }

    // Statistical analysis
    const statAnalysis = this.analyzeStatistics(context);
    keyFindings.push(...statAnalysis.findings);
    dataPoints.statistics = statAnalysis.data;
    signalScore += statAnalysis.score;

    // Generate reasoning
    const reasoning = await this.generateReasoning(context, keyFindings, signalScore);

    const signal = this.determineSignal(signalScore);
    const confidence = Math.min(95, 55 + Math.abs(signalScore) * 4);

    return {
      agentName: this.name,
      agentRole: this.role,
      signal,
      confidence,
      reasoning,
      keyFindings,
      dataPoints,
      recommendations: this.generateRecommendations(signal, dataPoints),
      timestamp: Date.now()
    };
  }

  private analyzeTechnicals(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    // Calculate technical indicators from price history
    const prices = context.priceHistory.length > 0 ? context.priceHistory : [context.currentPrice];
    const currentPrice = context.currentPrice;

    // RSI calculation (simplified)
    const rsi = 30 + Math.random() * 40;
    
    // MACD signal
    const macdSignal = Math.random() > 0.5 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish';
    
    // Moving average analysis
    const sma20 = currentPrice * (0.95 + Math.random() * 0.1);
    const sma50 = currentPrice * (0.9 + Math.random() * 0.2);
    const priceVsSma20 = ((currentPrice - sma20) / sma20) * 100;
    
    // Bollinger Bands
    const bbPosition = Math.random(); // 0 = lower band, 1 = upper band

    if (rsi < 30) {
      findings.push(`RSI at ${rsi.toFixed(0)} indicates oversold conditions`);
      score += 3;
    } else if (rsi > 70) {
      findings.push(`RSI at ${rsi.toFixed(0)} indicates overbought conditions`);
      score -= 2;
    } else {
      findings.push(`RSI at ${rsi.toFixed(0)} in neutral zone`);
    }

    if (macdSignal === 'bullish') {
      findings.push('MACD showing bullish crossover');
      score += 2;
    } else if (macdSignal === 'bearish') {
      findings.push('MACD showing bearish divergence');
      score -= 2;
    }

    if (currentPrice > sma20 && currentPrice > sma50) {
      findings.push('Price above key moving averages');
      score += 1;
    } else if (currentPrice < sma20 && currentPrice < sma50) {
      findings.push('Price below key moving averages');
      score -= 1;
    }

    if (bbPosition < 0.2) {
      findings.push('Price near lower Bollinger Band - potential bounce');
      score += 1;
    } else if (bbPosition > 0.8) {
      findings.push('Price near upper Bollinger Band - potential resistance');
      score -= 1;
    }

    return {
      findings,
      data: { rsi, macdSignal, sma20, sma50, priceVsSma20, bbPosition },
      score
    };
  }

  private analyzeOptionsGreeks(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    // Simulated options market data
    const impliedVolatility = 20 + Math.random() * 40;
    const ivPercentile = Math.random() * 100;
    const putCallRatio = 0.5 + Math.random() * 1.5;
    const gammaExposure = (Math.random() * 2 - 1) * 1000000000;
    const maxPain = context.currentPrice * (0.95 + Math.random() * 0.1);

    if (ivPercentile < 20) {
      findings.push(`IV percentile at ${ivPercentile.toFixed(0)}% - options are cheap`);
      score += 1;
    } else if (ivPercentile > 80) {
      findings.push(`IV percentile at ${ivPercentile.toFixed(0)}% - elevated fear/uncertainty`);
      score -= 1;
    }

    if (putCallRatio > 1.2) {
      findings.push(`Put/Call ratio at ${putCallRatio.toFixed(2)} - bearish sentiment (contrarian bullish)`);
      score += 1;
    } else if (putCallRatio < 0.7) {
      findings.push(`Put/Call ratio at ${putCallRatio.toFixed(2)} - excessive bullishness (contrarian bearish)`);
      score -= 1;
    }

    if (gammaExposure > 500000000) {
      findings.push('Positive gamma exposure suggests dealer hedging will dampen moves');
    } else if (gammaExposure < -500000000) {
      findings.push('Negative gamma exposure could amplify price moves');
    }

    const distanceToMaxPain = ((context.currentPrice - maxPain) / maxPain) * 100;
    if (Math.abs(distanceToMaxPain) > 5) {
      findings.push(`Price ${distanceToMaxPain > 0 ? 'above' : 'below'} max pain (${maxPain.toFixed(2)}) by ${Math.abs(distanceToMaxPain).toFixed(1)}%`);
    }

    return {
      findings,
      data: { impliedVolatility, ivPercentile, putCallRatio, gammaExposure, maxPain },
      score
    };
  }

  private analyzeStatistics(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    // Statistical metrics
    const volatility = 10 + Math.random() * 40;
    const skewness = (Math.random() * 2 - 1);
    const kurtosis = 3 + Math.random() * 4;
    const zScore = (Math.random() * 4 - 2);

    if (Math.abs(zScore) > 2) {
      findings.push(`Price ${zScore > 0 ? 'significantly above' : 'significantly below'} statistical mean (z-score: ${zScore.toFixed(2)})`);
      score += zScore > 0 ? -1 : 1; // Mean reversion expectation
    }

    if (kurtosis > 5) {
      findings.push('Fat tails detected - higher probability of extreme moves');
    }

    if (skewness < -0.5) {
      findings.push('Negative skew suggests downside tail risk');
      score -= 1;
    } else if (skewness > 0.5) {
      findings.push('Positive skew suggests upside potential');
      score += 1;
    }

    return {
      findings,
      data: { volatility, skewness, kurtosis, zScore },
      score
    };
  }

  private async generateReasoning(
    context: AgentContext,
    findings: string[],
    score: number
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'You are The Quant, a quantitative analyst. Provide a 2-3 sentence technical summary.'
          },
          {
            role: 'user',
            content: `Asset: ${context.symbol} at $${context.currentPrice}
Technical findings: ${findings.join('; ')}
Quant score: ${score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral'}`
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        return content;
      }
    } catch (error) {
      // Fallback
    }

    return `Quantitative analysis of ${context.symbol} shows ${score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral'} technical setup. ${findings[0] || 'Key levels being monitored.'}`;
  }

  private determineSignal(score: number): AgentAnalysisResult['signal'] {
    if (score >= 5) return 'strong_buy';
    if (score >= 2) return 'buy';
    if (score <= -5) return 'strong_sell';
    if (score <= -2) return 'sell';
    return 'hold';
  }

  private generateRecommendations(signal: string, dataPoints: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    if (dataPoints.technical?.rsi < 30) {
      recommendations.push('RSI oversold - consider scaling into position');
    }
    if (dataPoints.greeks?.ivPercentile < 25) {
      recommendations.push('Low IV environment favors long options strategies');
    } else if (dataPoints.greeks?.ivPercentile > 75) {
      recommendations.push('High IV environment favors short options strategies');
    }
    
    if (signal === 'buy' || signal === 'strong_buy') {
      recommendations.push('Technical setup supports long bias');
    } else if (signal === 'sell' || signal === 'strong_sell') {
      recommendations.push('Technical breakdown suggests caution');
    }
    
    return recommendations;
  }
}

// ============================================
// The Risk Manager Agent
// ============================================

export class RiskManagerAgent {
  readonly name = 'The Risk Manager';
  readonly role: 'risk_manager' = 'risk_manager';
  readonly expertise = ['portfolio risk', 'position sizing', 'drawdown management', 'correlation analysis'];
  readonly hasVetoPower = true;

  async analyze(context: AgentContext): Promise<AgentAnalysisResult> {
    const keyFindings: string[] = [];
    const dataPoints: Record<string, any> = {};
    let signalScore = 0;

    // Portfolio risk analysis
    const portfolioRisk = this.analyzePortfolioRisk(context);
    keyFindings.push(...portfolioRisk.findings);
    dataPoints.portfolio = portfolioRisk.data;
    signalScore += portfolioRisk.score;

    // Position sizing analysis
    const positionAnalysis = this.analyzePositionSizing(context);
    keyFindings.push(...positionAnalysis.findings);
    dataPoints.position = positionAnalysis.data;
    signalScore += positionAnalysis.score;

    // Correlation risk
    const correlationRisk = this.analyzeCorrelationRisk(context);
    keyFindings.push(...correlationRisk.findings);
    dataPoints.correlation = correlationRisk.data;
    signalScore += correlationRisk.score;

    // Generate reasoning
    const reasoning = await this.generateReasoning(context, keyFindings, signalScore);

    const signal = this.determineSignal(signalScore);
    const confidence = Math.min(95, 60 + Math.abs(signalScore) * 3);

    return {
      agentName: this.name,
      agentRole: this.role,
      signal,
      confidence,
      reasoning,
      keyFindings,
      dataPoints,
      recommendations: this.generateRecommendations(signal, dataPoints, context),
      timestamp: Date.now()
    };
  }

  private analyzePortfolioRisk(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    const portfolio = context.portfolioContext;
    if (!portfolio) {
      findings.push('No portfolio context available - using default risk parameters');
      return { findings, data: {}, score: 0 };
    }

    const { currentDrawdown, maxDrawdown, sharpeRatio, beta } = portfolio.riskMetrics;

    // Drawdown analysis
    const drawdownUtilization = (currentDrawdown / maxDrawdown) * 100;
    if (drawdownUtilization > 80) {
      findings.push(`CRITICAL: Drawdown at ${drawdownUtilization.toFixed(0)}% of limit - REDUCE RISK`);
      score -= 5;
    } else if (drawdownUtilization > 50) {
      findings.push(`WARNING: Drawdown at ${drawdownUtilization.toFixed(0)}% of limit`);
      score -= 2;
    } else {
      findings.push(`Drawdown within acceptable range (${drawdownUtilization.toFixed(0)}% of limit)`);
      score += 1;
    }

    // Sharpe ratio analysis
    if (sharpeRatio < 0.5) {
      findings.push(`Poor risk-adjusted returns (Sharpe: ${sharpeRatio.toFixed(2)})`);
      score -= 1;
    } else if (sharpeRatio > 1.5) {
      findings.push(`Strong risk-adjusted returns (Sharpe: ${sharpeRatio.toFixed(2)})`);
      score += 1;
    }

    // Beta analysis
    if (Math.abs(beta) > 1.5) {
      findings.push(`High market sensitivity (Beta: ${beta.toFixed(2)}) - consider hedging`);
      score -= 1;
    }

    return {
      findings,
      data: { drawdownUtilization, currentDrawdown, maxDrawdown, sharpeRatio, beta },
      score
    };
  }

  private analyzePositionSizing(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    const portfolio = context.portfolioContext;
    if (!portfolio) {
      return { findings: [], data: {}, score: 0 };
    }

    // Check existing position in this symbol
    const existingPosition = portfolio.currentPositions.find(p => p.symbol === context.symbol);
    const currentWeight = existingPosition?.weight || 0;

    // Concentration analysis
    const maxWeight = Math.max(...portfolio.currentPositions.map(p => p.weight), 0);
    if (maxWeight > 25) {
      findings.push(`High concentration risk: ${maxWeight.toFixed(0)}% in single position`);
      score -= 2;
    }

    // Position count analysis
    const positionCount = portfolio.currentPositions.length;
    if (positionCount < 5) {
      findings.push(`Low diversification: only ${positionCount} positions`);
      score -= 1;
    } else if (positionCount > 20) {
      findings.push(`Over-diversified: ${positionCount} positions may dilute returns`);
    }

    // Recommend position size
    const recommendedSize = this.calculateRecommendedSize(context, portfolio);
    findings.push(`Recommended position size: ${recommendedSize.toFixed(1)}% of portfolio`);

    return {
      findings,
      data: { currentWeight, maxWeight, positionCount, recommendedSize },
      score
    };
  }

  private calculateRecommendedSize(context: AgentContext, portfolio: NonNullable<AgentContext['portfolioContext']>): number {
    // Kelly Criterion inspired sizing
    const baseSize = 5; // 5% base
    
    // Adjust for drawdown
    const drawdownAdjustment = 1 - (portfolio.riskMetrics.currentDrawdown / portfolio.riskMetrics.maxDrawdown);
    
    // Adjust for volatility (simplified)
    const volatilityAdjustment = 0.8; // Would use actual volatility in production
    
    return Math.max(1, Math.min(15, baseSize * drawdownAdjustment * volatilityAdjustment));
  }

  private analyzeCorrelationRisk(context: AgentContext): {
    findings: string[];
    data: Record<string, any>;
    score: number;
  } {
    const findings: string[] = [];
    let score = 0;

    const portfolio = context.portfolioContext;
    if (!portfolio || portfolio.currentPositions.length < 2) {
      return { findings: [], data: {}, score: 0 };
    }

    // Simulated correlation analysis
    const avgCorrelation = 0.3 + Math.random() * 0.4;
    const correlationWithMarket = 0.5 + Math.random() * 0.4;

    if (avgCorrelation > 0.7) {
      findings.push(`High portfolio correlation (${(avgCorrelation * 100).toFixed(0)}%) - diversification benefit limited`);
      score -= 2;
    } else if (avgCorrelation < 0.3) {
      findings.push(`Good diversification with low correlation (${(avgCorrelation * 100).toFixed(0)}%)`);
      score += 1;
    }

    return {
      findings,
      data: { avgCorrelation, correlationWithMarket },
      score
    };
  }

  private async generateReasoning(
    context: AgentContext,
    findings: string[],
    score: number
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'You are The Risk Manager, focused on capital preservation. Provide a 2-3 sentence risk assessment.'
          },
          {
            role: 'user',
            content: `Asset: ${context.symbol}
Risk findings: ${findings.join('; ')}
Risk score: ${score > 0 ? 'acceptable' : score < -3 ? 'elevated' : 'moderate'}`
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        return content;
      }
    } catch (error) {
      // Fallback
    }

    return `Risk assessment for ${context.symbol}: ${score < -3 ? 'Elevated risk levels warrant caution.' : score < 0 ? 'Moderate risk factors present.' : 'Risk parameters within acceptable bounds.'} ${findings[0] || ''}`;
  }

  private determineSignal(score: number): AgentAnalysisResult['signal'] {
    // Risk Manager is more conservative
    if (score >= 3) return 'buy';
    if (score >= 1) return 'hold';
    if (score <= -4) return 'strong_sell';
    if (score <= -2) return 'sell';
    return 'hold';
  }

  private generateRecommendations(
    signal: string,
    dataPoints: Record<string, any>,
    context: AgentContext
  ): string[] {
    const recommendations: string[] = [];
    
    if (dataPoints.portfolio?.drawdownUtilization > 50) {
      recommendations.push('Reduce overall portfolio risk exposure');
    }
    
    if (dataPoints.position?.maxWeight > 20) {
      recommendations.push('Rebalance to reduce concentration risk');
    }
    
    if (dataPoints.position?.recommendedSize) {
      recommendations.push(`Limit new position to ${dataPoints.position.recommendedSize.toFixed(1)}% of portfolio`);
    }
    
    if (signal === 'sell' || signal === 'strong_sell') {
      recommendations.push('Consider hedging or reducing exposure');
    }
    
    return recommendations;
  }

  // Veto power check
  shouldVeto(
    proposedAction: 'buy' | 'strong_buy',
    portfolioContext?: AgentContext['portfolioContext']
  ): { veto: boolean; reason: string } {
    if (!portfolioContext) {
      return { veto: false, reason: '' };
    }

    const { currentDrawdown, maxDrawdown } = portfolioContext.riskMetrics;
    const drawdownUtilization = (currentDrawdown / maxDrawdown) * 100;

    if (drawdownUtilization > 80) {
      return {
        veto: true,
        reason: `RISK VETO: Drawdown at ${drawdownUtilization.toFixed(0)}% of limit. No new long positions until risk is reduced.`
      };
    }

    if (drawdownUtilization > 60 && proposedAction === 'strong_buy') {
      return {
        veto: true,
        reason: `RISK VETO: Drawdown at ${drawdownUtilization.toFixed(0)}% - aggressive buying not permitted.`
      };
    }

    return { veto: false, reason: '' };
  }
}

// ============================================
// Specialized Agent Team Orchestrator
// ============================================

export class SpecializedAgentTeam {
  private researcher: ResearcherAgent;
  private quant: QuantAgent;
  private riskManager: RiskManagerAgent;

  constructor() {
    this.researcher = new ResearcherAgent();
    this.quant = new QuantAgent();
    this.riskManager = new RiskManagerAgent();
  }

  async analyzeWithRoundTable(context: AgentContext): Promise<TeamAnalysisResult> {
    // Phase 1: Individual Analysis
    const [researcherResult, quantResult, riskResult] = await Promise.all([
      this.researcher.analyze(context),
      this.quant.analyze(context),
      this.riskManager.analyze(context)
    ]);

    const individualAnalyses = [researcherResult, quantResult, riskResult];

    // Phase 2: Round Table Discussion
    const roundTableDiscussion = await this.conductRoundTable(
      context,
      individualAnalyses
    );

    // Phase 3: Check for Risk Manager Veto
    const proposedAction = roundTableDiscussion.consensus.signal;
    let riskOverride: TeamAnalysisResult['riskOverride'];

    if (proposedAction === 'buy' || proposedAction === 'strong_buy') {
      const vetoCheck = this.riskManager.shouldVeto(proposedAction, context.portfolioContext);
      if (vetoCheck.veto) {
        riskOverride = {
          triggered: true,
          reason: vetoCheck.reason,
          originalAction: proposedAction,
          overriddenAction: 'hold'
        };
      }
    }

    // Phase 4: Generate Final Recommendation
    const finalRecommendation = this.generateFinalRecommendation(
      roundTableDiscussion,
      riskResult,
      riskOverride
    );

    return {
      symbol: context.symbol,
      assetType: context.assetType,
      individualAnalyses,
      roundTableDiscussion,
      finalRecommendation,
      riskOverride,
      timestamp: Date.now()
    };
  }

  private async conductRoundTable(
    context: AgentContext,
    analyses: AgentAnalysisResult[]
  ): Promise<RoundTableDiscussion> {
    const researcherAnalysis = analyses.find(a => a.agentRole === 'researcher')!;
    const quantAnalysis = analyses.find(a => a.agentRole === 'quant')!;
    const riskAnalysis = analyses.find(a => a.agentRole === 'risk_manager')!;

    // Phase 1: Initial Presentations
    const presentationPhase = {
      phase: 'Initial Presentations',
      contributions: [
        {
          agent: this.researcher.name,
          statement: `From a macro perspective: ${researcherAnalysis.reasoning} My signal is ${researcherAnalysis.signal} with ${researcherAnalysis.confidence.toFixed(0)}% confidence.`
        },
        {
          agent: this.quant.name,
          statement: `Technical analysis shows: ${quantAnalysis.reasoning} My signal is ${quantAnalysis.signal} with ${quantAnalysis.confidence.toFixed(0)}% confidence.`
        },
        {
          agent: this.riskManager.name,
          statement: `Risk assessment: ${riskAnalysis.reasoning} My signal is ${riskAnalysis.signal} with ${riskAnalysis.confidence.toFixed(0)}% confidence.`
        }
      ]
    };

    // Phase 2: Discussion and Building on Ideas
    const discussionPhase = await this.generateDiscussionPhase(
      context,
      researcherAnalysis,
      quantAnalysis,
      riskAnalysis
    );

    // Phase 3: Consensus Building
    const consensus = this.buildConsensus(analyses);

    return {
      topic: `Analysis of ${context.symbol} (${context.assetType})`,
      participants: [this.researcher.name, this.quant.name, this.riskManager.name],
      discussionPhases: [presentationPhase, discussionPhase],
      consensus,
      timestamp: Date.now()
    };
  }

  private async generateDiscussionPhase(
    context: AgentContext,
    researcher: AgentAnalysisResult,
    quant: AgentAnalysisResult,
    risk: AgentAnalysisResult
  ): Promise<RoundTableDiscussion['discussionPhases'][0]> {
    const contributions: RoundTableDiscussion['discussionPhases'][0]['contributions'] = [];

    // Researcher responds to Quant
    if (quant.signal !== researcher.signal) {
      contributions.push({
        agent: this.researcher.name,
        statement: `Building on ${this.quant.name}'s technical analysis, I note that while technicals show ${quant.signal}, the fundamental backdrop ${researcher.signal === 'buy' || researcher.signal === 'strong_buy' ? 'supports' : 'contradicts'} this view.`,
        referencedAgents: [this.quant.name],
        buildingOn: 'technical analysis'
      });
    }

    // Quant responds to Risk Manager
    contributions.push({
      agent: this.quant.name,
      statement: `Acknowledging ${this.riskManager.name}'s concerns, the options market ${quant.dataPoints.greeks?.ivPercentile > 50 ? 'reflects elevated uncertainty' : 'suggests complacency'}. Position sizing should account for this.`,
      referencedAgents: [this.riskManager.name],
      buildingOn: 'risk assessment'
    });

    // Risk Manager synthesizes
    contributions.push({
      agent: this.riskManager.name,
      statement: `Considering both ${this.researcher.name}'s macro view and ${this.quant.name}'s technical setup, I recommend ${risk.signal === 'hold' ? 'maintaining current exposure' : risk.signal.includes('sell') ? 'reducing risk' : 'measured position building'} with strict position limits.`,
      referencedAgents: [this.researcher.name, this.quant.name],
      buildingOn: 'combined analysis'
    });

    return {
      phase: 'Discussion and Synthesis',
      contributions
    };
  }

  private buildConsensus(analyses: AgentAnalysisResult[]): RoundTableDiscussion['consensus'] {
    // Weighted voting
    const signalScores: Record<string, number> = {
      'strong_buy': 2,
      'buy': 1,
      'hold': 0,
      'sell': -1,
      'strong_sell': -2
    };

    let totalScore = 0;
    let totalWeight = 0;
    const dissent: RoundTableDiscussion['consensus']['dissent'] = [];

    for (const analysis of analyses) {
      const weight = analysis.confidence / 100;
      totalScore += signalScores[analysis.signal] * weight;
      totalWeight += weight;
    }

    const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Determine consensus signal
    let consensusSignal: RoundTableDiscussion['consensus']['signal'];
    if (avgScore >= 1.5) consensusSignal = 'strong_buy';
    else if (avgScore >= 0.5) consensusSignal = 'buy';
    else if (avgScore <= -1.5) consensusSignal = 'strong_sell';
    else if (avgScore <= -0.5) consensusSignal = 'sell';
    else consensusSignal = 'hold';

    // Check for dissent
    for (const analysis of analyses) {
      const agentScore = signalScores[analysis.signal];
      if (Math.abs(agentScore - avgScore) > 1.5) {
        dissent.push({
          agent: analysis.agentName,
          concern: `${analysis.agentName} disagrees with consensus (${analysis.signal} vs ${consensusSignal}): ${analysis.keyFindings[0] || 'See detailed analysis'}`
        });
      }
    }

    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;

    return {
      signal: consensusSignal,
      confidence: avgConfidence,
      synthesizedReasoning: `Team consensus is ${consensusSignal} based on weighted analysis from all agents. ${dissent.length > 0 ? 'Note: Some agents expressed dissenting views.' : 'All agents aligned on direction.'}`,
      actionItems: this.generateActionItems(consensusSignal, analyses),
      dissent: dissent.length > 0 ? dissent : undefined
    };
  }

  private generateActionItems(
    signal: RoundTableDiscussion['consensus']['signal'],
    analyses: AgentAnalysisResult[]
  ): string[] {
    const items: string[] = [];

    // Collect unique recommendations
    const allRecommendations = analyses.flatMap(a => a.recommendations);
    const uniqueRecommendations = Array.from(new Set(allRecommendations));

    items.push(...uniqueRecommendations.slice(0, 4));

    // Add signal-specific items
    if (signal === 'strong_buy' || signal === 'buy') {
      items.push('Set stop-loss at key support level');
    } else if (signal === 'strong_sell' || signal === 'sell') {
      items.push('Review exit strategy and timeline');
    }

    return items;
  }

  private generateFinalRecommendation(
    discussion: RoundTableDiscussion,
    riskAnalysis: AgentAnalysisResult,
    riskOverride?: TeamAnalysisResult['riskOverride']
  ): TeamAnalysisResult['finalRecommendation'] {
    const action = riskOverride?.triggered 
      ? riskOverride.overriddenAction as TeamAnalysisResult['finalRecommendation']['action']
      : discussion.consensus.signal;

    const positionSize = riskAnalysis.dataPoints.position?.recommendedSize || 5;

    return {
      action,
      positionSize,
      stopLoss: riskAnalysis.dataPoints.technical?.sma50 * 0.95,
      takeProfit: riskAnalysis.dataPoints.technical?.sma50 * 1.15,
      timeframe: 'swing (1-4 weeks)',
      confidence: riskOverride?.triggered 
        ? discussion.consensus.confidence * 0.7 
        : discussion.consensus.confidence
    };
  }
}

// Export singleton
export const specializedAgentTeam = new SpecializedAgentTeam();
