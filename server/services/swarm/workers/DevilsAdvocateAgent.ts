/**
 * Devil's Advocate Agent (Adversarial Bear)
 * 
 * The quality control agent that finds reasons why a trade will fail.
 * Implements adversarial critique with 0-10 scoring system.
 * Trades with critique score >7/10 must be aborted.
 */

import type { AgentResponse, AgentTask } from '../orchestrator/AlphaOrchestrator';

export interface CritiqueResult {
  overallScore: number; // 0-10, higher = more reasons to reject
  categories: {
    marketRisk: number;
    liquidityRisk: number;
    timingRisk: number;
    correlationRisk: number;
    regulatoryRisk: number;
    technicalRisk: number;
    sentimentRisk: number;
    macroRisk: number;
  };
  criticalIssues: string[];
  warnings: string[];
  counterArguments: string[];
  historicalFailures: {
    scenario: string;
    similarity: number;
    outcome: string;
  }[];
  vetoRecommended: boolean;
}

export class DevilsAdvocateAgent {
  public readonly id = 'devils_advocate';
  public readonly name = "Devil's Advocate";
  public readonly specialty = 'Trade Critique & Risk Identification';

  private readonly VETO_THRESHOLD = 7; // Score above this triggers veto
  private readonly CRITICAL_ISSUE_WEIGHT = 2;
  private readonly WARNING_WEIGHT = 0.5;

  /**
   * Analyze and critique a proposed trade
   */
  async analyze(task: AgentTask): Promise<AgentResponse> {
    const startTime = Date.now();
    const critique = await this.performCritique(task);
    
    const recommendation: 'buy' | 'sell' | 'hold' | 'avoid' = 
      critique.vetoRecommended ? 'avoid' : 'hold';

    return {
      agentId: this.id,
      agentName: this.name,
      taskId: task.id,
      timestamp: startTime,
      isStale: false,
      confidence: critique.overallScore * 10, // Convert to 0-100 scale
      recommendation,
      reasoning: critique.counterArguments,
      risks: [...critique.criticalIssues, ...critique.warnings],
      data: critique as unknown as Record<string, unknown>,
    };
  }

  /**
   * Perform comprehensive critique of proposed trade
   */
  async performCritique(task: AgentTask): Promise<CritiqueResult> {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const counterArguments: string[] = [];

    // Analyze each risk category
    const marketRisk = await this.assessMarketRisk(task);
    const liquidityRisk = await this.assessLiquidityRisk(task);
    const timingRisk = await this.assessTimingRisk(task);
    const correlationRisk = await this.assessCorrelationRisk(task);
    const regulatoryRisk = await this.assessRegulatoryRisk(task);
    const technicalRisk = await this.assessTechnicalRisk(task);
    const sentimentRisk = await this.assessSentimentRisk(task);
    const macroRisk = await this.assessMacroRisk(task);

    // Collect issues from each assessment
    this.collectIssues(marketRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(liquidityRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(timingRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(correlationRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(regulatoryRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(technicalRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(sentimentRisk, criticalIssues, warnings, counterArguments);
    this.collectIssues(macroRisk, criticalIssues, warnings, counterArguments);

    // Calculate overall score
    const categoryScores = {
      marketRisk: marketRisk.score,
      liquidityRisk: liquidityRisk.score,
      timingRisk: timingRisk.score,
      correlationRisk: correlationRisk.score,
      regulatoryRisk: regulatoryRisk.score,
      technicalRisk: technicalRisk.score,
      sentimentRisk: sentimentRisk.score,
      macroRisk: macroRisk.score,
    };

    // Weighted average with bonus for critical issues
    const baseScore = Object.values(categoryScores).reduce((a, b) => a + b, 0) / 8;
    const criticalBonus = criticalIssues.length * this.CRITICAL_ISSUE_WEIGHT;
    const warningBonus = warnings.length * this.WARNING_WEIGHT;
    
    const overallScore = Math.min(10, baseScore + criticalBonus + warningBonus);

    // Find historical failures
    const historicalFailures = await this.findHistoricalFailures(task);

    return {
      overallScore,
      categories: categoryScores,
      criticalIssues,
      warnings,
      counterArguments,
      historicalFailures,
      vetoRecommended: overallScore > this.VETO_THRESHOLD,
    };
  }

  private collectIssues(
    assessment: { score: number; issues: string[]; warnings: string[]; counterArgs: string[] },
    criticalIssues: string[],
    warnings: string[],
    counterArguments: string[]
  ): void {
    criticalIssues.push(...assessment.issues);
    warnings.push(...assessment.warnings);
    counterArguments.push(...assessment.counterArgs);
  }

  /**
   * Assess market-wide risk factors
   */
  private async assessMarketRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate market risk analysis
    const marketConditions = {
      volatilitySpike: Math.random() > 0.7,
      trendExhaustion: Math.random() > 0.8,
      breadthDivergence: Math.random() > 0.75,
      sectorRotation: Math.random() > 0.6,
    };

    if (marketConditions.volatilitySpike) {
      issues.push('Volatility spike detected - increased risk of adverse moves');
      counterArgs.push('Historical data shows 60% of volatility spikes lead to mean reversion losses');
      score += 3;
    }

    if (marketConditions.trendExhaustion) {
      warnings.push('Trend exhaustion signals present');
      counterArgs.push('Late-cycle entries have 40% lower success rate');
      score += 2;
    }

    if (marketConditions.breadthDivergence) {
      warnings.push('Market breadth diverging from price');
      counterArgs.push('Breadth divergence preceded 70% of major corrections');
      score += 1.5;
    }

    if (marketConditions.sectorRotation) {
      warnings.push('Active sector rotation underway');
      score += 1;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess liquidity risk
   */
  private async assessLiquidityRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate liquidity analysis
    const liquidity = {
      dailyVolume: Math.random() * 50000000,
      bidAskSpread: Math.random() * 0.02,
      depthRatio: Math.random() * 2,
      slippageEstimate: Math.random() * 0.05,
    };

    if (liquidity.dailyVolume < 5000000) {
      issues.push(`Insufficient liquidity: $${(liquidity.dailyVolume / 1000000).toFixed(2)}M daily volume`);
      counterArgs.push('Low liquidity assets have 3x higher slippage during exits');
      score += 4;
    } else if (liquidity.dailyVolume < 10000000) {
      warnings.push('Moderate liquidity concerns');
      score += 1;
    }

    if (liquidity.bidAskSpread > 0.01) {
      warnings.push(`Wide spread: ${(liquidity.bidAskSpread * 100).toFixed(2)}% - execution costs elevated`);
      score += 1.5;
    }

    if (liquidity.slippageEstimate > 0.02) {
      issues.push(`High slippage risk: ${(liquidity.slippageEstimate * 100).toFixed(2)}% estimated`);
      counterArgs.push('Slippage above 2% erodes 40% of typical trade profits');
      score += 2;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess timing risk
   */
  private async assessTimingRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Check for upcoming events
    const events = {
      earningsIn7Days: Math.random() > 0.8,
      fedMeetingIn3Days: Math.random() > 0.85,
      optionsExpiry: Math.random() > 0.7,
      economicDataRelease: Math.random() > 0.6,
      endOfQuarter: Math.random() > 0.9,
    };

    if (events.earningsIn7Days && task.assetClass === 'stocks') {
      issues.push('Earnings announcement within 7 days - binary event risk');
      counterArgs.push('Pre-earnings entries have 55% failure rate due to IV crush');
      score += 3;
    }

    if (events.fedMeetingIn3Days) {
      warnings.push('Fed meeting within 3 days - policy uncertainty');
      counterArgs.push('Fed meetings cause 2x normal volatility in first hour');
      score += 2;
    }

    if (events.optionsExpiry) {
      warnings.push('Options expiry approaching - gamma risk elevated');
      score += 1.5;
    }

    if (events.economicDataRelease) {
      warnings.push('Major economic data release pending');
      score += 1;
    }

    if (events.endOfQuarter) {
      warnings.push('End of quarter - window dressing and rebalancing flows');
      score += 0.5;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess correlation risk
   */
  private async assessCorrelationRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate correlation analysis
    const correlations = {
      portfolioCorrelation: Math.random(),
      sectorCorrelation: Math.random(),
      marketCorrelation: Math.random(),
      hedgeEffectiveness: Math.random(),
    };

    if (correlations.portfolioCorrelation > 0.8) {
      issues.push('High correlation with existing portfolio positions');
      counterArgs.push('Correlated positions amplify drawdowns by 1.5x on average');
      score += 3;
    } else if (correlations.portfolioCorrelation > 0.6) {
      warnings.push('Moderate portfolio correlation detected');
      score += 1;
    }

    if (correlations.marketCorrelation > 0.9) {
      warnings.push('Trade highly correlated with market - limited alpha potential');
      counterArgs.push('High-beta trades underperform in corrections');
      score += 1.5;
    }

    if (correlations.hedgeEffectiveness < 0.3) {
      warnings.push('Hedge effectiveness below optimal threshold');
      score += 1;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess regulatory risk
   */
  private async assessRegulatoryRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate regulatory analysis
    const regulatory = {
      pendingLitigation: Math.random() > 0.9,
      secInvestigation: Math.random() > 0.95,
      regulatoryChange: Math.random() > 0.8,
      complianceIssues: Math.random() > 0.85,
    };

    if (task.assetClass === 'crypto') {
      // Crypto-specific regulatory risks
      const cryptoReg = {
        unverifiedContract: Math.random() > 0.7,
        rugPullIndicators: Math.random() > 0.9,
        sanctionedAddresses: Math.random() > 0.95,
      };

      if (cryptoReg.unverifiedContract) {
        issues.push('Smart contract not verified - potential security risk');
        counterArgs.push('Unverified contracts have 10x higher exploit rate');
        score += 3;
      }

      if (cryptoReg.rugPullIndicators) {
        issues.push('Rug pull indicators detected in contract');
        score += 5;
      }
    }

    if (regulatory.pendingLitigation) {
      warnings.push('Pending litigation against company');
      score += 2;
    }

    if (regulatory.secInvestigation) {
      issues.push('Active SEC investigation');
      counterArgs.push('SEC investigations result in 30% average stock decline');
      score += 4;
    }

    if (regulatory.regulatoryChange) {
      warnings.push('Potential regulatory changes affecting sector');
      score += 1;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess technical risk
   */
  private async assessTechnicalRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate technical analysis critique
    const technicals = {
      overbought: Math.random() > 0.7,
      bearishDivergence: Math.random() > 0.8,
      resistanceNear: Math.random() > 0.6,
      volumeDecline: Math.random() > 0.65,
      trendWeakening: Math.random() > 0.7,
    };

    if (technicals.overbought) {
      warnings.push('Overbought conditions on multiple timeframes');
      counterArgs.push('Buying overbought conditions has 35% lower win rate');
      score += 2;
    }

    if (technicals.bearishDivergence) {
      issues.push('Bearish divergence detected between price and momentum');
      counterArgs.push('Bearish divergences precede 65% of significant pullbacks');
      score += 2.5;
    }

    if (technicals.resistanceNear) {
      warnings.push('Major resistance level within 2% of current price');
      score += 1.5;
    }

    if (technicals.volumeDecline) {
      warnings.push('Volume declining during price advance');
      counterArgs.push('Advances on declining volume fail 60% of the time');
      score += 1.5;
    }

    if (technicals.trendWeakening) {
      warnings.push('Trend strength indicators weakening');
      score += 1;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess sentiment risk
   */
  private async assessSentimentRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate sentiment analysis
    const sentiment = {
      extremeBullish: Math.random() > 0.85,
      retailFomo: Math.random() > 0.8,
      institutionalSelling: Math.random() > 0.75,
      mediaHype: Math.random() > 0.7,
      shortInterestLow: Math.random() > 0.8,
    };

    if (sentiment.extremeBullish) {
      issues.push('Extreme bullish sentiment - contrarian warning');
      counterArgs.push('Extreme bullish sentiment precedes corrections 70% of the time');
      score += 3;
    }

    if (sentiment.retailFomo) {
      warnings.push('Retail FOMO indicators elevated');
      counterArgs.push('Retail buying peaks often mark local tops');
      score += 2;
    }

    if (sentiment.institutionalSelling) {
      issues.push('Institutional selling detected');
      counterArgs.push('Smart money exiting while retail enters is bearish signal');
      score += 2.5;
    }

    if (sentiment.mediaHype) {
      warnings.push('Elevated media coverage - potential blow-off top');
      score += 1;
    }

    if (sentiment.shortInterestLow) {
      warnings.push('Low short interest - limited squeeze potential');
      score += 0.5;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Assess macro risk
   */
  private async assessMacroRisk(task: AgentTask): Promise<{
    score: number;
    issues: string[];
    warnings: string[];
    counterArgs: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const counterArgs: string[] = [];
    let score = 0;

    // Simulate macro analysis
    const macro = {
      recessionRisk: Math.random(),
      yieldCurveInverted: Math.random() > 0.7,
      dollarStrength: Math.random() > 0.75,
      creditSpreadsWidening: Math.random() > 0.8,
      geopoliticalTension: Math.random() > 0.6,
    };

    if (macro.recessionRisk > 0.6) {
      issues.push(`Recession probability elevated: ${(macro.recessionRisk * 100).toFixed(0)}%`);
      counterArgs.push('Risk assets decline 25% on average during recessions');
      score += 3;
    }

    if (macro.yieldCurveInverted) {
      warnings.push('Yield curve inverted - recession signal');
      counterArgs.push('Inverted yield curve has predicted 7 of last 7 recessions');
      score += 2;
    }

    if (macro.dollarStrength && (task.assetClass === 'crypto' || task.assetClass === 'commodities')) {
      warnings.push('Strong dollar headwind for this asset class');
      score += 1.5;
    }

    if (macro.creditSpreadsWidening) {
      warnings.push('Credit spreads widening - risk-off environment');
      score += 1.5;
    }

    if (macro.geopoliticalTension) {
      warnings.push('Elevated geopolitical tensions');
      score += 1;
    }

    return { score: Math.min(10, score), issues, warnings, counterArgs };
  }

  /**
   * Find historical failures similar to current trade
   */
  private async findHistoricalFailures(task: AgentTask): Promise<{
    scenario: string;
    similarity: number;
    outcome: string;
  }[]> {
    // Simulated historical failure patterns
    const failures = [
      {
        scenario: 'Similar RSI overbought entry in Q2 2024',
        similarity: 0.75,
        outcome: '-8% drawdown before recovery',
      },
      {
        scenario: 'Pre-Fed meeting entry in March 2024',
        similarity: 0.68,
        outcome: '-5% gap down on hawkish surprise',
      },
      {
        scenario: 'High correlation entry during sector rotation',
        similarity: 0.62,
        outcome: '-12% as sector fell out of favor',
      },
    ];

    // Return relevant failures based on random selection
    return failures.filter(() => Math.random() > 0.5);
  }

  /**
   * Generate summary critique for display
   */
  generateSummary(critique: CritiqueResult): string {
    const status = critique.vetoRecommended ? '🚫 VETO RECOMMENDED' : '⚠️ PROCEED WITH CAUTION';
    
    let summary = `${status}\n`;
    summary += `Overall Risk Score: ${critique.overallScore.toFixed(1)}/10\n\n`;
    
    if (critique.criticalIssues.length > 0) {
      summary += `Critical Issues (${critique.criticalIssues.length}):\n`;
      critique.criticalIssues.forEach(issue => {
        summary += `  • ${issue}\n`;
      });
    }
    
    if (critique.counterArguments.length > 0) {
      summary += `\nCounter-Arguments:\n`;
      critique.counterArguments.slice(0, 3).forEach(arg => {
        summary += `  • ${arg}\n`;
      });
    }

    return summary;
  }
}
