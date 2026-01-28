/**
 * Consensus Engine
 * 
 * Calculates final confidence scores and determines trade execution.
 * Implements:
 * - Weighted voting system
 * - Confidence score calculation (0-100)
 * - Trade execution threshold (>85% required)
 * - Stealth trade fragmentation for large orders
 * - Market regime detection (risk-on/risk-off)
 */

import type { AgentResponse } from '../orchestrator/AlphaOrchestrator';
import type { DebateSession } from '../debate/DebateSystem';

export interface ConsensusResult {
  sessionId: string;
  timestamp: number;
  asset: string;
  assetClass: string;
  
  // Voting results
  votes: {
    agentId: string;
    agentName: string;
    vote: 'buy' | 'sell' | 'hold' | 'avoid';
    confidence: number;
    weight: number;
    reasoning: string[];
  }[];
  
  // Aggregated scores
  aggregatedScores: {
    buy: number;
    sell: number;
    hold: number;
    avoid: number;
  };
  
  // Final decision
  finalDecision: {
    recommendation: 'buy' | 'sell' | 'hold' | 'avoid';
    confidence: number;
    consensusReached: boolean;
    unanimity: boolean;
    marginOfVictory: number;
  };
  
  // Execution plan (if approved)
  executionPlan?: ExecutionPlan;
  
  // Risk assessment
  riskAssessment: {
    overallRisk: number;
    riskFactors: { factor: string; severity: number; description: string }[];
    withinLimits: boolean;
  };
}

export interface ExecutionPlan {
  orderType: 'market' | 'limit' | 'stealth' | 'twap' | 'vwap';
  totalSize: number;
  fragments: number;
  fragmentSize: number;
  urgency: 'immediate' | 'gradual' | 'patient';
  timeHorizon: number; // minutes
  priceLimit?: number;
  stopLoss?: number;
  takeProfit?: number;
  stealthParams?: {
    randomizeSize: boolean;
    randomizeTiming: boolean;
    maxVisibleSize: number;
    minIntervalMs: number;
    maxIntervalMs: number;
  };
}

export interface MarketRegimeAnalysis {
  regime: 'risk-on' | 'risk-off' | 'transition';
  confidence: number;
  indicators: {
    vix: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
    creditSpreads: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
    yieldCurve: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
    dollarIndex: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
    breadth: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
  };
  recommendedStrategy: 'aggressive' | 'moderate' | 'defensive';
  positionSizeMultiplier: number;
}

export class ConsensusEngine {
  private readonly EXECUTION_THRESHOLD = 85; // Minimum confidence to execute
  private readonly STEALTH_SIZE_THRESHOLD = 100000; // Orders above this use stealth
  private readonly FRAGMENT_SIZE = 10000; // Default fragment size for stealth
  
  // Agent weights based on specialty and historical accuracy
  private agentWeights: Map<string, number>;

  constructor() {
    this.agentWeights = new Map([
      ['technical_analyst', 1.0],
      ['momentum_agent', 0.9],
      ['macro_strategist', 1.1],
      ['volatility_architect', 1.2],
      ['onchain_auditor', 1.3],
      ['regulatory_agent', 1.5],
      ['devils_advocate', 1.4],
    ]);
  }

  /**
   * Calculate consensus from agent responses
   */
  calculateConsensus(
    sessionId: string,
    asset: string,
    assetClass: string,
    responses: AgentResponse[],
    proposedSize: number
  ): ConsensusResult {
    const timestamp = Date.now();
    
    // Process votes
    const votes = this.processVotes(responses);
    
    // Aggregate scores
    const aggregatedScores = this.aggregateScores(votes);
    
    // Determine final decision
    const finalDecision = this.determineFinalDecision(aggregatedScores, votes);
    
    // Assess risk
    const riskAssessment = this.assessRisk(responses, proposedSize);
    
    // Create execution plan if approved
    let executionPlan: ExecutionPlan | undefined;
    if (finalDecision.recommendation === 'buy' || finalDecision.recommendation === 'sell') {
      if (finalDecision.confidence >= this.EXECUTION_THRESHOLD && riskAssessment.withinLimits) {
        executionPlan = this.createExecutionPlan(
          proposedSize,
          finalDecision.confidence,
          finalDecision.recommendation
        );
      }
    }

    return {
      sessionId,
      timestamp,
      asset,
      assetClass,
      votes,
      aggregatedScores,
      finalDecision,
      executionPlan,
      riskAssessment,
    };
  }

  /**
   * Process agent responses into weighted votes
   */
  private processVotes(responses: AgentResponse[]): ConsensusResult['votes'] {
    return responses.map(response => {
      const weight = this.agentWeights.get(response.agentId) || 1.0;
      
      return {
        agentId: response.agentId,
        agentName: response.agentName,
        vote: response.recommendation,
        confidence: response.confidence,
        weight,
        reasoning: response.reasoning,
      };
    });
  }

  /**
   * Aggregate weighted scores for each recommendation
   */
  private aggregateScores(votes: ConsensusResult['votes']): ConsensusResult['aggregatedScores'] {
    const scores = { buy: 0, sell: 0, hold: 0, avoid: 0 };
    let totalWeight = 0;

    for (const vote of votes) {
      const weightedScore = vote.confidence * vote.weight;
      scores[vote.vote] += weightedScore;
      totalWeight += vote.weight;
    }

    // Normalize scores
    if (totalWeight > 0) {
      scores.buy = (scores.buy / totalWeight);
      scores.sell = (scores.sell / totalWeight);
      scores.hold = (scores.hold / totalWeight);
      scores.avoid = (scores.avoid / totalWeight);
    }

    return scores;
  }

  /**
   * Determine final decision based on aggregated scores
   */
  private determineFinalDecision(
    scores: ConsensusResult['aggregatedScores'],
    votes: ConsensusResult['votes']
  ): ConsensusResult['finalDecision'] {
    // Find winning recommendation
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const winner = sortedScores[0][0] as 'buy' | 'sell' | 'hold' | 'avoid';
    const winnerScore = sortedScores[0][1];
    const runnerUpScore = sortedScores[1][1];

    // Calculate margin of victory
    const marginOfVictory = winnerScore - runnerUpScore;

    // Check for unanimity
    const uniqueVotes = new Set(votes.map(v => v.vote));
    const unanimity = uniqueVotes.size === 1;

    // Calculate overall confidence
    const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;
    const confidence = Math.min(100, avgConfidence * (1 + marginOfVictory / 100));

    // Consensus reached if confidence above threshold and clear winner
    const consensusReached = confidence >= this.EXECUTION_THRESHOLD && marginOfVictory > 10;

    return {
      recommendation: winner,
      confidence,
      consensusReached,
      unanimity,
      marginOfVictory,
    };
  }

  /**
   * Assess overall risk from agent responses
   */
  private assessRisk(
    responses: AgentResponse[],
    proposedSize: number
  ): ConsensusResult['riskAssessment'] {
    const riskFactors: { factor: string; severity: number; description: string }[] = [];
    let totalRisk = 0;

    // Collect all risks from responses
    for (const response of responses) {
      for (const risk of response.risks) {
        const severity = this.assessRiskSeverity(risk);
        riskFactors.push({
          factor: response.agentName,
          severity,
          description: risk,
        });
        totalRisk += severity;
      }
    }

    // Normalize overall risk
    const overallRisk = Math.min(100, totalRisk / Math.max(1, responses.length) * 10);

    // Check if within limits
    const withinLimits = overallRisk < 50 && riskFactors.filter(r => r.severity > 7).length < 2;

    return {
      overallRisk,
      riskFactors: riskFactors.sort((a, b) => b.severity - a.severity).slice(0, 10),
      withinLimits,
    };
  }

  /**
   * Assess severity of a risk factor
   */
  private assessRiskSeverity(risk: string): number {
    const highSeverityKeywords = ['critical', 'severe', 'avoid', 'veto', 'rug pull', 'fraud'];
    const mediumSeverityKeywords = ['warning', 'caution', 'elevated', 'concern', 'risk'];
    const lowSeverityKeywords = ['note', 'minor', 'potential', 'possible'];

    const riskLower = risk.toLowerCase();

    if (highSeverityKeywords.some(k => riskLower.includes(k))) return 8 + Math.random() * 2;
    if (mediumSeverityKeywords.some(k => riskLower.includes(k))) return 4 + Math.random() * 3;
    if (lowSeverityKeywords.some(k => riskLower.includes(k))) return 1 + Math.random() * 2;
    
    return 3 + Math.random() * 2;
  }

  /**
   * Create execution plan for approved trade
   */
  private createExecutionPlan(
    size: number,
    confidence: number,
    direction: 'buy' | 'sell'
  ): ExecutionPlan {
    // Determine order type based on size
    let orderType: ExecutionPlan['orderType'];
    let fragments: number;
    let urgency: ExecutionPlan['urgency'];

    if (size > this.STEALTH_SIZE_THRESHOLD) {
      orderType = 'stealth';
      fragments = Math.ceil(size / this.FRAGMENT_SIZE);
      urgency = 'patient';
    } else if (confidence > 95) {
      orderType = 'market';
      fragments = 1;
      urgency = 'immediate';
    } else if (confidence > 90) {
      orderType = 'limit';
      fragments = Math.ceil(size / 25000);
      urgency = 'gradual';
    } else {
      orderType = 'twap';
      fragments = Math.ceil(size / 20000);
      urgency = 'patient';
    }

    const plan: ExecutionPlan = {
      orderType,
      totalSize: size,
      fragments,
      fragmentSize: size / fragments,
      urgency,
      timeHorizon: this.calculateTimeHorizon(orderType, fragments),
    };

    // Add stealth parameters for large orders
    if (orderType === 'stealth') {
      plan.stealthParams = {
        randomizeSize: true,
        randomizeTiming: true,
        maxVisibleSize: this.FRAGMENT_SIZE * 0.5,
        minIntervalMs: 5000,
        maxIntervalMs: 30000,
      };
    }

    // Add stop loss and take profit
    plan.stopLoss = -0.02; // 2% stop loss
    plan.takeProfit = 0.05; // 5% take profit

    return plan;
  }

  /**
   * Calculate time horizon for execution
   */
  private calculateTimeHorizon(orderType: string, fragments: number): number {
    switch (orderType) {
      case 'market':
        return 1;
      case 'limit':
        return 15;
      case 'twap':
        return fragments * 5;
      case 'vwap':
        return fragments * 3;
      case 'stealth':
        return fragments * 10;
      default:
        return 30;
    }
  }

  /**
   * Analyze current market regime
   */
  analyzeMarketRegime(): MarketRegimeAnalysis {
    // Simulated market indicators
    const indicators: MarketRegimeAnalysis['indicators'] = {
      vix: { value: 15 + Math.random() * 20, signal: 'neutral' },
      creditSpreads: { value: 1 + Math.random() * 2, signal: 'neutral' },
      yieldCurve: { value: (Math.random() - 0.3) * 2, signal: 'neutral' },
      dollarIndex: { value: 95 + Math.random() * 15, signal: 'neutral' },
      breadth: { value: 40 + Math.random() * 40, signal: 'neutral' },
    };

    // Determine signals
    indicators.vix.signal = indicators.vix.value < 18 ? 'bullish' : indicators.vix.value > 25 ? 'bearish' : 'neutral';
    indicators.creditSpreads.signal = indicators.creditSpreads.value < 1.5 ? 'bullish' : indicators.creditSpreads.value > 2.5 ? 'bearish' : 'neutral';
    indicators.yieldCurve.signal = indicators.yieldCurve.value > 0.5 ? 'bullish' : indicators.yieldCurve.value < 0 ? 'bearish' : 'neutral';
    indicators.dollarIndex.signal = indicators.dollarIndex.value < 100 ? 'bullish' : indicators.dollarIndex.value > 105 ? 'bearish' : 'neutral';
    indicators.breadth.signal = indicators.breadth.value > 60 ? 'bullish' : indicators.breadth.value < 40 ? 'bearish' : 'neutral';

    type SignalType = 'bullish' | 'bearish' | 'neutral';

    // Count bullish/bearish signals
    const signals = Object.values(indicators).map(i => i.signal);
    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;

    // Determine regime
    let regime: 'risk-on' | 'risk-off' | 'transition';
    let recommendedStrategy: 'aggressive' | 'moderate' | 'defensive';
    let positionSizeMultiplier: number;

    if (bullishCount >= 3) {
      regime = 'risk-on';
      recommendedStrategy = 'aggressive';
      positionSizeMultiplier = 1.2;
    } else if (bearishCount >= 3) {
      regime = 'risk-off';
      recommendedStrategy = 'defensive';
      positionSizeMultiplier = 0.6;
    } else {
      regime = 'transition';
      recommendedStrategy = 'moderate';
      positionSizeMultiplier = 0.9;
    }

    const confidence = Math.max(bullishCount, bearishCount) / 5 * 100;

    return {
      regime,
      confidence,
      indicators,
      recommendedStrategy,
      positionSizeMultiplier,
    };
  }

  /**
   * Calculate consensus from debate session
   */
  calculateConsensusFromDebate(session: DebateSession, proposedSize: number): ConsensusResult {
    // Convert debate findings to agent responses
    const responses: AgentResponse[] = session.participants.map(participant => {
      const findings = session.blackboard.filter(e => e.agentId === participant.agentId);
      const latestFinding = findings.sort((a, b) => b.timestamp - a.timestamp)[0];

      return {
        agentId: participant.agentId,
        agentName: participant.agentName,
        taskId: session.id,
        timestamp: latestFinding?.timestamp || Date.now(),
        isStale: false,
        confidence: latestFinding?.confidence || 50,
        recommendation: this.inferRecommendation(participant.role, latestFinding?.confidence || 50),
        reasoning: findings.map(f => f.content),
        risks: findings.filter(f => f.type === 'counter').map(f => f.content),
        data: {},
      };
    });

    return this.calculateConsensus(
      session.id,
      session.asset,
      session.assetClass,
      responses,
      proposedSize
    );
  }

  /**
   * Infer recommendation from role and confidence
   */
  private inferRecommendation(
    role: string,
    confidence: number
  ): 'buy' | 'sell' | 'hold' | 'avoid' {
    if (role === 'bull' && confidence > 60) return 'buy';
    if (role === 'bear' && confidence > 70) return 'avoid';
    if (role === 'auditor' && confidence < 50) return 'avoid';
    return 'hold';
  }

  /**
   * Update agent weight based on performance
   */
  updateAgentWeight(agentId: string, performance: number): void {
    const currentWeight = this.agentWeights.get(agentId) || 1.0;
    // Adjust weight based on performance (0-100)
    const adjustment = (performance - 50) / 100 * 0.1;
    const newWeight = Math.max(0.5, Math.min(2.0, currentWeight + adjustment));
    this.agentWeights.set(agentId, newWeight);
  }

  /**
   * Generate consensus report
   */
  generateReport(result: ConsensusResult): string {
    let report = `=== CONSENSUS REPORT ===\n`;
    report += `Asset: ${result.asset} (${result.assetClass})\n`;
    report += `Timestamp: ${new Date(result.timestamp).toISOString()}\n\n`;

    report += `--- VOTING RESULTS ---\n`;
    for (const vote of result.votes) {
      report += `${vote.agentName}: ${vote.vote.toUpperCase()} (${vote.confidence.toFixed(1)}% conf, ${vote.weight.toFixed(2)}x weight)\n`;
    }

    report += `\n--- AGGREGATED SCORES ---\n`;
    report += `Buy: ${result.aggregatedScores.buy.toFixed(1)}\n`;
    report += `Sell: ${result.aggregatedScores.sell.toFixed(1)}\n`;
    report += `Hold: ${result.aggregatedScores.hold.toFixed(1)}\n`;
    report += `Avoid: ${result.aggregatedScores.avoid.toFixed(1)}\n`;

    report += `\n--- FINAL DECISION ---\n`;
    report += `Recommendation: ${result.finalDecision.recommendation.toUpperCase()}\n`;
    report += `Confidence: ${result.finalDecision.confidence.toFixed(1)}%\n`;
    report += `Consensus Reached: ${result.finalDecision.consensusReached ? 'YES' : 'NO'}\n`;
    report += `Unanimity: ${result.finalDecision.unanimity ? 'YES' : 'NO'}\n`;
    report += `Margin of Victory: ${result.finalDecision.marginOfVictory.toFixed(1)}\n`;

    if (result.executionPlan) {
      report += `\n--- EXECUTION PLAN ---\n`;
      report += `Order Type: ${result.executionPlan.orderType}\n`;
      report += `Total Size: $${result.executionPlan.totalSize.toLocaleString()}\n`;
      report += `Fragments: ${result.executionPlan.fragments}\n`;
      report += `Time Horizon: ${result.executionPlan.timeHorizon} minutes\n`;
    }

    report += `\n--- RISK ASSESSMENT ---\n`;
    report += `Overall Risk: ${result.riskAssessment.overallRisk.toFixed(1)}%\n`;
    report += `Within Limits: ${result.riskAssessment.withinLimits ? 'YES' : 'NO'}\n`;
    if (result.riskAssessment.riskFactors.length > 0) {
      report += `Top Risks:\n`;
      for (const risk of result.riskAssessment.riskFactors.slice(0, 5)) {
        report += `  - [${risk.severity.toFixed(1)}] ${risk.description}\n`;
      }
    }

    return report;
  }
}
