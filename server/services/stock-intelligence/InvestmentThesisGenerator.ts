/**
 * Institutional Investment Thesis Generator - 2026
 * 
 * Generates professional-grade investment thesis documents that:
 * - Synthesize all agent analyses into a coherent narrative
 * - Include risk assessment from Devil's Advocate
 * - Provide actionable recommendations with price targets
 * - Output in institutional-quality markdown format
 * - Support approval workflow for investment committee
 */

import { invokeLLM } from '../../_core/llm';
import type { AgentSignal } from './StockIntelligenceAgents';
import type { CounterThesis } from './DevilsAdvocateAgent';
import type { VotingResult } from './WeightedVotingSystem';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface InvestmentThesis {
  id: string;
  ticker: string;
  companyName: string;
  generatedAt: Date;
  expiresAt: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired';
  
  // Executive Summary
  executiveSummary: {
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    targetPrice: number;
    currentPrice: number;
    upside: number;
    timeHorizon: string;
    confidenceLevel: number;
    keyThesis: string;
  };
  
  // Analysis Sections
  fundamentalAnalysis: AnalysisSection;
  technicalAnalysis: AnalysisSection;
  sentimentAnalysis: AnalysisSection;
  macroAnalysis: AnalysisSection;
  
  // Risk Assessment
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    keyRisks: Risk[];
    killSwitchPrice: number;
    maxDrawdown: number;
    counterArguments: string[];
  };
  
  // Voting Summary
  votingSummary: {
    consensusStrength: string;
    bullishVotes: number;
    bearishVotes: number;
    neutralVotes: number;
    dissent: string[];
  };
  
  // Action Plan
  actionPlan: {
    entryStrategy: string;
    positionSize: string;
    stopLoss: number;
    takeProfit: number[];
    scalingPlan: string;
    exitCriteria: string[];
  };
  
  // Markdown Output
  markdownContent: string;
  
  // Approval Workflow
  approvalWorkflow: {
    requiredApprovers: string[];
    approvals: Approval[];
    rejections: Rejection[];
  };
}

export interface AnalysisSection {
  title: string;
  summary: string;
  keyFindings: string[];
  dataPoints: DataPoint[];
  confidence: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface DataPoint {
  metric: string;
  value: string | number;
  interpretation: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface Risk {
  category: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface Approval {
  approver: string;
  timestamp: Date;
  notes?: string;
}

export interface Rejection {
  rejector: string;
  timestamp: Date;
  reason: string;
}

export interface ThesisGeneratorConfig {
  includeCharts: boolean;
  detailLevel: 'summary' | 'standard' | 'detailed';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: 'short' | 'medium' | 'long';
}

// ============================================================================
// Investment Thesis Generator
// ============================================================================

export class InvestmentThesisGenerator {
  private config: ThesisGeneratorConfig;
  private theses: Map<string, InvestmentThesis> = new Map();

  constructor(config?: Partial<ThesisGeneratorConfig>) {
    this.config = {
      includeCharts: config?.includeCharts ?? true,
      detailLevel: config?.detailLevel || 'standard',
      riskTolerance: config?.riskTolerance || 'moderate',
      timeHorizon: config?.timeHorizon || 'medium'
    };
  }

  /**
   * Generate a complete investment thesis
   */
  async generateThesis(
    ticker: string,
    companyName: string,
    currentPrice: number,
    agentSignals: AgentSignal[],
    counterThesis: CounterThesis,
    votingResult: VotingResult
  ): Promise<InvestmentThesis> {
    // Extract analysis from each agent
    const fundamentalSignal = agentSignals.find(s => s.agent === 'Fundamental Analyst');
    const technicalSignal = agentSignals.find(s => s.agent === 'Technical Analyst');
    const sentimentSignal = agentSignals.find(s => s.agent === 'Sentiment Harvester');
    const macroSignal = agentSignals.find(s => s.agent === 'Macro Linker');

    // Calculate target price based on signals
    const targetPrice = this.calculateTargetPrice(currentPrice, votingResult, agentSignals);
    const upside = ((targetPrice - currentPrice) / currentPrice) * 100;

    // Build analysis sections
    const fundamentalAnalysis = this.buildAnalysisSection('Fundamental Analysis', fundamentalSignal);
    const technicalAnalysis = this.buildAnalysisSection('Technical Analysis', technicalSignal);
    const sentimentAnalysis = this.buildAnalysisSection('Sentiment Analysis', sentimentSignal);
    const macroAnalysis = this.buildAnalysisSection('Macro Analysis', macroSignal);

    // Build risk assessment
    const riskAssessment = this.buildRiskAssessment(counterThesis, votingResult);

    // Build voting summary
    const votingSummary = this.buildVotingSummary(agentSignals, votingResult);

    // Build action plan
    const actionPlan = this.buildActionPlan(currentPrice, targetPrice, counterThesis, votingResult);

    // Generate executive summary
    const executiveSummary = {
      recommendation: votingResult.recommendation.action as InvestmentThesis['executiveSummary']['recommendation'],
      targetPrice,
      currentPrice,
      upside,
      timeHorizon: this.getTimeHorizonText(votingResult.recommendation.timeHorizon),
      confidenceLevel: votingResult.weightedConfidence,
      keyThesis: await this.generateKeyThesis(ticker, agentSignals, votingResult)
    };

    // Create thesis object
    const thesis: InvestmentThesis = {
      id: this.generateId(),
      ticker,
      companyName,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.getExpirationMs()),
      status: 'draft',
      executiveSummary,
      fundamentalAnalysis,
      technicalAnalysis,
      sentimentAnalysis,
      macroAnalysis,
      riskAssessment,
      votingSummary,
      actionPlan,
      markdownContent: '', // Will be generated
      approvalWorkflow: {
        requiredApprovers: ['Portfolio Manager', 'Risk Officer'],
        approvals: [],
        rejections: []
      }
    };

    // Generate markdown content
    thesis.markdownContent = this.generateMarkdown(thesis);

    // Store thesis
    this.theses.set(thesis.id, thesis);

    return thesis;
  }

  // ============================================================================
  // Analysis Section Builders
  // ============================================================================

  private buildAnalysisSection(title: string, signal?: AgentSignal): AnalysisSection {
    if (!signal) {
      return {
        title,
        summary: 'Analysis not available',
        keyFindings: [],
        dataPoints: [],
        confidence: 0,
        signal: 'neutral'
      };
    }

    return {
      title,
      summary: signal.rationale,
      keyFindings: signal.keyFindings || [],
      dataPoints: this.extractDataPoints(signal),
      confidence: signal.confidence,
      signal: signal.signal
    };
  }

  private extractDataPoints(signal: AgentSignal): DataPoint[] {
    const dataPoints: DataPoint[] = [];
    
    // Extract from dataPoints if available
    if (signal.dataPoints) {
      for (const [key, value] of Object.entries(signal.dataPoints)) {
        if (typeof value === 'number' || typeof value === 'string') {
          dataPoints.push({
            metric: this.formatMetricName(key),
            value,
            interpretation: this.interpretMetric(key, value)
          });
        }
      }
    }

    return dataPoints.slice(0, 10); // Limit to 10 data points
  }

  private formatMetricName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private interpretMetric(key: string, value: any): string {
    // Simple interpretation logic
    if (key.includes('ratio') || key.includes('Ratio')) {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (numValue > 1) return 'Above average';
      if (numValue < 1) return 'Below average';
      return 'Average';
    }
    return 'Data point for analysis';
  }

  // ============================================================================
  // Risk Assessment Builder
  // ============================================================================

  private buildRiskAssessment(
    counterThesis: CounterThesis,
    votingResult: VotingResult
  ): InvestmentThesis['riskAssessment'] {
    const risks: Risk[] = counterThesis.counterArguments.map(arg => ({
      category: arg.category,
      description: arg.argument,
      probability: arg.impact === 'high' ? 'high' : arg.impact === 'medium' ? 'medium' : 'low',
      impact: arg.impact,
      mitigation: `Monitor ${arg.category} indicators closely`
    }));

    // Add blind spots as risks
    for (const blindSpot of counterThesis.blindSpots) {
      risks.push({
        category: 'Blind Spot',
        description: blindSpot,
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Conduct additional research'
      });
    }

    return {
      overallRisk: counterThesis.severity,
      keyRisks: risks.slice(0, 5),
      killSwitchPrice: counterThesis.killSwitchPrice,
      maxDrawdown: this.calculateMaxDrawdown(counterThesis),
      counterArguments: counterThesis.counterArguments.map(a => a.argument)
    };
  }

  private calculateMaxDrawdown(counterThesis: CounterThesis): number {
    // Estimate max drawdown based on severity
    const severityDrawdown = {
      low: 10,
      medium: 15,
      high: 25,
      critical: 40
    };
    return severityDrawdown[counterThesis.severity] || 20;
  }

  // ============================================================================
  // Voting Summary Builder
  // ============================================================================

  private buildVotingSummary(
    signals: AgentSignal[],
    votingResult: VotingResult
  ): InvestmentThesis['votingSummary'] {
    const bullish = signals.filter(s => s.signal === 'bullish');
    const bearish = signals.filter(s => s.signal === 'bearish');
    const neutral = signals.filter(s => s.signal === 'neutral');

    // Find dissenting opinions
    const dissent: string[] = [];
    const majoritySignal = votingResult.finalSignal;
    
    for (const signal of signals) {
      if (signal.signal !== majoritySignal) {
        dissent.push(`${signal.agent}: ${signal.signal} (${signal.confidence}%) - ${signal.rationale.substring(0, 100)}...`);
      }
    }

    return {
      consensusStrength: votingResult.consensusStrength,
      bullishVotes: bullish.length,
      bearishVotes: bearish.length,
      neutralVotes: neutral.length,
      dissent
    };
  }

  // ============================================================================
  // Action Plan Builder
  // ============================================================================

  private buildActionPlan(
    currentPrice: number,
    targetPrice: number,
    counterThesis: CounterThesis,
    votingResult: VotingResult
  ): InvestmentThesis['actionPlan'] {
    const stopLoss = counterThesis.killSwitchPrice;
    const takeProfit = this.calculateTakeProfitLevels(currentPrice, targetPrice);

    return {
      entryStrategy: this.getEntryStrategyText(votingResult.recommendation.entryStrategy),
      positionSize: `${votingResult.recommendation.positionSizePercent}% of portfolio`,
      stopLoss,
      takeProfit,
      scalingPlan: this.getScalingPlan(votingResult),
      exitCriteria: this.getExitCriteria(counterThesis, votingResult)
    };
  }

  private calculateTakeProfitLevels(currentPrice: number, targetPrice: number): number[] {
    const diff = targetPrice - currentPrice;
    return [
      currentPrice + diff * 0.33,
      currentPrice + diff * 0.66,
      targetPrice
    ].map(p => Math.round(p * 100) / 100);
  }

  private getEntryStrategyText(strategy: string): string {
    const strategies: Record<string, string> = {
      market: 'Enter at market price immediately',
      limit: 'Set limit order at current support level',
      scale_in: 'Scale in over 3-5 days to average entry price',
      wait: 'Wait for better entry opportunity'
    };
    return strategies[strategy] || 'Evaluate entry conditions';
  }

  private getScalingPlan(votingResult: VotingResult): string {
    if (votingResult.consensusStrength === 'strong') {
      return 'Enter full position at once due to strong consensus';
    }
    return 'Scale in: 50% initial, 25% on confirmation, 25% on pullback';
  }

  private getExitCriteria(counterThesis: CounterThesis, votingResult: VotingResult): string[] {
    const criteria: string[] = [
      `Stop loss triggered at $${counterThesis.killSwitchPrice.toFixed(2)}`,
      'Target price reached',
      'Fundamental thesis invalidated'
    ];

    if (counterThesis.macroContradictions.length > 0) {
      criteria.push('Macro conditions deteriorate significantly');
    }

    return criteria;
  }

  // ============================================================================
  // Target Price Calculation
  // ============================================================================

  private calculateTargetPrice(
    currentPrice: number,
    votingResult: VotingResult,
    signals: AgentSignal[]
  ): number {
    // Base target on signal direction and confidence
    let multiplier = 1;
    
    if (votingResult.finalSignal === 'bullish') {
      // Higher confidence = higher target
      multiplier = 1 + (votingResult.weightedConfidence / 100) * 0.3;
    } else if (votingResult.finalSignal === 'bearish') {
      multiplier = 1 - (votingResult.weightedConfidence / 100) * 0.2;
    }

    // Adjust based on consensus strength
    if (votingResult.consensusStrength === 'strong') {
      multiplier *= 1.1;
    } else if (votingResult.consensusStrength === 'weak') {
      multiplier *= 0.9;
    }

    return Math.round(currentPrice * multiplier * 100) / 100;
  }

  // ============================================================================
  // Key Thesis Generation
  // ============================================================================

  private async generateKeyThesis(
    ticker: string,
    signals: AgentSignal[],
    votingResult: VotingResult
  ): Promise<string> {
    const prompt = `Generate a concise 2-3 sentence investment thesis for ${ticker} based on:
    
Signal: ${votingResult.finalSignal.toUpperCase()}
Confidence: ${votingResult.weightedConfidence}%
Consensus: ${votingResult.consensusStrength}

Key findings from agents:
${signals.map(s => `- ${s.agent}: ${s.keyFindings?.slice(0, 2).join(', ') || s.rationale.substring(0, 100)}`).join('\n')}

Write a professional, institutional-quality thesis statement.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a senior investment analyst writing institutional-quality research.' },
          { role: 'user', content: prompt }
        ]
      });
      
      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : 'Investment thesis generation in progress.';
    } catch (error) {
      return `${votingResult.finalSignal.charAt(0).toUpperCase() + votingResult.finalSignal.slice(1)} outlook on ${ticker} with ${votingResult.weightedConfidence}% confidence based on multi-agent analysis.`;
    }
  }

  // ============================================================================
  // Markdown Generation
  // ============================================================================

  private generateMarkdown(thesis: InvestmentThesis): string {
    const { executiveSummary, fundamentalAnalysis, technicalAnalysis, sentimentAnalysis, macroAnalysis, riskAssessment, votingSummary, actionPlan } = thesis;

    return `# Investment Thesis: ${thesis.ticker}
## ${thesis.companyName}

**Generated:** ${thesis.generatedAt.toISOString().split('T')[0]}  
**Expires:** ${thesis.expiresAt.toISOString().split('T')[0]}  
**Status:** ${thesis.status.toUpperCase()}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Recommendation** | ${this.formatRecommendation(executiveSummary.recommendation)} |
| **Current Price** | $${executiveSummary.currentPrice.toFixed(2)} |
| **Target Price** | $${executiveSummary.targetPrice.toFixed(2)} |
| **Upside/Downside** | ${executiveSummary.upside >= 0 ? '+' : ''}${executiveSummary.upside.toFixed(1)}% |
| **Time Horizon** | ${executiveSummary.timeHorizon} |
| **Confidence** | ${executiveSummary.confidenceLevel.toFixed(0)}% |

### Key Thesis
${executiveSummary.keyThesis}

---

## Fundamental Analysis
**Signal:** ${this.formatSignal(fundamentalAnalysis.signal)} | **Confidence:** ${fundamentalAnalysis.confidence}%

${fundamentalAnalysis.summary}

### Key Findings
${fundamentalAnalysis.keyFindings.map(f => `- ${f}`).join('\n') || '- No specific findings'}

${fundamentalAnalysis.dataPoints.length > 0 ? `
### Key Metrics
| Metric | Value | Interpretation |
|--------|-------|----------------|
${fundamentalAnalysis.dataPoints.map(d => `| ${d.metric} | ${d.value} | ${d.interpretation} |`).join('\n')}
` : ''}

---

## Technical Analysis
**Signal:** ${this.formatSignal(technicalAnalysis.signal)} | **Confidence:** ${technicalAnalysis.confidence}%

${technicalAnalysis.summary}

### Key Findings
${technicalAnalysis.keyFindings.map(f => `- ${f}`).join('\n') || '- No specific findings'}

---

## Sentiment Analysis
**Signal:** ${this.formatSignal(sentimentAnalysis.signal)} | **Confidence:** ${sentimentAnalysis.confidence}%

${sentimentAnalysis.summary}

### Key Findings
${sentimentAnalysis.keyFindings.map(f => `- ${f}`).join('\n') || '- No specific findings'}

---

## Macro Analysis
**Signal:** ${this.formatSignal(macroAnalysis.signal)} | **Confidence:** ${macroAnalysis.confidence}%

${macroAnalysis.summary}

### Key Findings
${macroAnalysis.keyFindings.map(f => `- ${f}`).join('\n') || '- No specific findings'}

---

## Risk Assessment
**Overall Risk Level:** ${this.formatRiskLevel(riskAssessment.overallRisk)}

### Key Risks
${riskAssessment.keyRisks.map(r => `
#### ${r.category}
- **Description:** ${r.description}
- **Probability:** ${r.probability} | **Impact:** ${r.impact}
- **Mitigation:** ${r.mitigation}
`).join('\n')}

### Counter-Arguments (Devil's Advocate)
${riskAssessment.counterArguments.map(a => `- ${a}`).join('\n') || '- No significant counter-arguments'}

| Risk Metric | Value |
|-------------|-------|
| Kill Switch Price | $${riskAssessment.killSwitchPrice.toFixed(2)} |
| Max Drawdown | ${riskAssessment.maxDrawdown}% |

---

## Voting Summary

| Vote Type | Count |
|-----------|-------|
| Bullish | ${votingSummary.bullishVotes} |
| Bearish | ${votingSummary.bearishVotes} |
| Neutral | ${votingSummary.neutralVotes} |

**Consensus Strength:** ${votingSummary.consensusStrength.toUpperCase()}

${votingSummary.dissent.length > 0 ? `
### Dissenting Opinions
${votingSummary.dissent.map(d => `- ${d}`).join('\n')}
` : ''}

---

## Action Plan

### Entry Strategy
${actionPlan.entryStrategy}

### Position Sizing
${actionPlan.positionSize}

### Price Levels
| Level | Price |
|-------|-------|
| Stop Loss | $${actionPlan.stopLoss.toFixed(2)} |
| Take Profit 1 (33%) | $${actionPlan.takeProfit[0].toFixed(2)} |
| Take Profit 2 (66%) | $${actionPlan.takeProfit[1].toFixed(2)} |
| Take Profit 3 (100%) | $${actionPlan.takeProfit[2].toFixed(2)} |

### Scaling Plan
${actionPlan.scalingPlan}

### Exit Criteria
${actionPlan.exitCriteria.map(c => `- ${c}`).join('\n')}

---

## Approval Workflow

**Required Approvers:** ${thesis.approvalWorkflow.requiredApprovers.join(', ')}

| Approver | Status | Date | Notes |
|----------|--------|------|-------|
${thesis.approvalWorkflow.requiredApprovers.map(a => {
  const approval = thesis.approvalWorkflow.approvals.find(ap => ap.approver === a);
  const rejection = thesis.approvalWorkflow.rejections.find(r => r.rejector === a);
  if (approval) return `| ${a} | ✅ Approved | ${approval.timestamp.toISOString().split('T')[0]} | ${approval.notes || '-'} |`;
  if (rejection) return `| ${a} | ❌ Rejected | ${rejection.timestamp.toISOString().split('T')[0]} | ${rejection.reason} |`;
  return `| ${a} | ⏳ Pending | - | - |`;
}).join('\n')}

---

*This investment thesis was generated by TradoVerse AI Multi-Agent System. Past performance does not guarantee future results. This is not financial advice.*
`;
  }

  private formatRecommendation(rec: string): string {
    const colors: Record<string, string> = {
      strong_buy: '🟢 **STRONG BUY**',
      buy: '🟢 BUY',
      hold: '🟡 HOLD',
      sell: '🔴 SELL',
      strong_sell: '🔴 **STRONG SELL**',
      no_action: '⚪ NO ACTION'
    };
    return colors[rec] || rec;
  }

  private formatSignal(signal: string): string {
    const signals: Record<string, string> = {
      bullish: '🟢 Bullish',
      bearish: '🔴 Bearish',
      neutral: '🟡 Neutral'
    };
    return signals[signal] || signal;
  }

  private formatRiskLevel(level: string): string {
    const levels: Record<string, string> = {
      low: '🟢 Low',
      medium: '🟡 Medium',
      high: '🟠 High',
      critical: '🔴 Critical'
    };
    return levels[level] || level;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getTimeHorizonText(horizon: string): string {
    const horizons: Record<string, string> = {
      short: '1-4 weeks',
      medium: '1-3 months',
      long: '3-12 months'
    };
    return horizons[horizon] || horizon;
  }

  private getExpirationMs(): number {
    const expirations: Record<string, number> = {
      short: 7 * 24 * 60 * 60 * 1000, // 1 week
      medium: 30 * 24 * 60 * 60 * 1000, // 1 month
      long: 90 * 24 * 60 * 60 * 1000 // 3 months
    };
    return expirations[this.config.timeHorizon] || expirations.medium;
  }

  private generateId(): string {
    return `thesis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Approval Workflow
  // ============================================================================

  /**
   * Submit thesis for approval
   */
  submitForApproval(thesisId: string): boolean {
    const thesis = this.theses.get(thesisId);
    if (!thesis || thesis.status !== 'draft') return false;
    
    thesis.status = 'pending_approval';
    return true;
  }

  /**
   * Approve a thesis
   */
  approve(thesisId: string, approver: string, notes?: string): boolean {
    const thesis = this.theses.get(thesisId);
    if (!thesis || thesis.status !== 'pending_approval') return false;
    
    thesis.approvalWorkflow.approvals.push({
      approver,
      timestamp: new Date(),
      notes
    });

    // Check if all required approvers have approved
    const allApproved = thesis.approvalWorkflow.requiredApprovers.every(
      a => thesis.approvalWorkflow.approvals.some(ap => ap.approver === a)
    );

    if (allApproved) {
      thesis.status = 'approved';
    }

    // Regenerate markdown with updated approval status
    thesis.markdownContent = this.generateMarkdown(thesis);

    return true;
  }

  /**
   * Reject a thesis
   */
  reject(thesisId: string, rejector: string, reason: string): boolean {
    const thesis = this.theses.get(thesisId);
    if (!thesis || thesis.status !== 'pending_approval') return false;
    
    thesis.approvalWorkflow.rejections.push({
      rejector,
      timestamp: new Date(),
      reason
    });

    thesis.status = 'rejected';
    thesis.markdownContent = this.generateMarkdown(thesis);

    return true;
  }

  /**
   * Get thesis by ID
   */
  getThesis(thesisId: string): InvestmentThesis | undefined {
    return this.theses.get(thesisId);
  }

  /**
   * Get all theses for a ticker
   */
  getThesesForTicker(ticker: string): InvestmentThesis[] {
    return Array.from(this.theses.values()).filter(t => t.ticker === ticker);
  }

  /**
   * Get recent theses
   */
  getRecentTheses(limit: number = 10): InvestmentThesis[] {
    return Array.from(this.theses.values())
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let generatorInstance: InvestmentThesisGenerator | null = null;

export function getInvestmentThesisGenerator(): InvestmentThesisGenerator {
  if (!generatorInstance) {
    generatorInstance = new InvestmentThesisGenerator();
  }
  return generatorInstance;
}

export function createInvestmentThesisGenerator(config?: Partial<ThesisGeneratorConfig>): InvestmentThesisGenerator {
  return new InvestmentThesisGenerator(config);
}
