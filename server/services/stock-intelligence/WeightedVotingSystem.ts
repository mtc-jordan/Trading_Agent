/**
 * Weighted Voting System - 2026 Consensus Decision Making
 * 
 * Implements a sophisticated voting system where:
 * - Proposer presents the signal
 * - Auditor (Devil's Advocate) provides counter-thesis
 * - Reviewer assigns confidence score (0-100)
 * - High-severity risks can veto trades
 * 
 * Agent weights are dynamically adjusted based on:
 * - Historical accuracy
 * - Market regime performance
 * - Recency of correct predictions
 */

import type { AgentSignal } from './StockIntelligenceAgents';
import type { CounterThesis } from './DevilsAdvocateAgent';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Vote {
  agent: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  weight: number;
  rationale: string;
  timestamp: Date;
}

export interface VotingSession {
  id: string;
  ticker: string;
  votes: Vote[];
  counterThesis?: CounterThesis;
  status: 'voting' | 'reviewing' | 'decided' | 'vetoed';
  result?: VotingResult;
  startTime: Date;
  endTime?: Date;
}

export interface VotingResult {
  finalSignal: 'bullish' | 'bearish' | 'neutral';
  weightedConfidence: number;
  consensusStrength: 'strong' | 'moderate' | 'weak' | 'split';
  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
  participatingAgents: number;
  unanimousDecision: boolean;
  vetoApplied: boolean;
  vetoReason?: string;
  recommendation: TradingRecommendation;
}

export interface TradingRecommendation {
  action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'no_action';
  positionSizePercent: number;
  entryStrategy: 'market' | 'limit' | 'scale_in' | 'wait';
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
  notes: string[];
}

export interface AgentWeight {
  agent: string;
  baseWeight: number;
  accuracyBonus: number;
  regimeBonus: number;
  recencyBonus: number;
  totalWeight: number;
  lastUpdated: Date;
}

export interface WeightConfig {
  baseWeights: Record<string, number>;
  accuracyMultiplier: number;
  regimeMultiplier: number;
  recencyDecay: number;
  vetoThreshold: number;
  minConfidenceForAction: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: WeightConfig = {
  baseWeights: {
    'Fundamental Analyst': 0.25,
    'Technical Analyst': 0.20,
    'Sentiment Harvester': 0.15,
    'Macro Linker': 0.20,
    'Portfolio Manager': 0.20
  },
  accuracyMultiplier: 0.5, // Up to 50% bonus for high accuracy
  regimeMultiplier: 0.3, // Up to 30% bonus for regime expertise
  recencyDecay: 0.1, // 10% decay per month without correct prediction
  vetoThreshold: 80, // Devil's Advocate can veto if severity >= 80
  minConfidenceForAction: 60 // Minimum weighted confidence for action
};

// ============================================================================
// Weighted Voting System
// ============================================================================

export class WeightedVotingSystem {
  private config: WeightConfig;
  private sessions: Map<string, VotingSession> = new Map();
  private agentWeights: Map<string, AgentWeight> = new Map();
  private accuracyHistory: Map<string, { correct: number; total: number }> = new Map();

  constructor(config?: Partial<WeightConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeWeights();
  }

  private initializeWeights(): void {
    for (const [agent, baseWeight] of Object.entries(this.config.baseWeights)) {
      this.agentWeights.set(agent, {
        agent,
        baseWeight,
        accuracyBonus: 0,
        regimeBonus: 0,
        recencyBonus: 0,
        totalWeight: baseWeight,
        lastUpdated: new Date()
      });
    }
  }

  // ============================================================================
  // Voting Session Management
  // ============================================================================

  /**
   * Start a new voting session
   */
  startVotingSession(ticker: string): VotingSession {
    const session: VotingSession = {
      id: this.generateId(),
      ticker,
      votes: [],
      status: 'voting',
      startTime: new Date()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Cast a vote in a session
   */
  castVote(
    sessionId: string,
    agentSignal: AgentSignal
  ): Vote | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'voting') return null;

    // Get agent weight
    const agentWeight = this.getAgentWeight(agentSignal.agent);

    const vote: Vote = {
      agent: agentSignal.agent,
      signal: agentSignal.signal,
      confidence: agentSignal.confidence,
      weight: agentWeight,
      rationale: agentSignal.rationale,
      timestamp: new Date()
    };

    session.votes.push(vote);
    return vote;
  }

  /**
   * Submit counter-thesis from Devil's Advocate
   */
  submitCounterThesis(
    sessionId: string,
    counterThesis: CounterThesis
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.counterThesis = counterThesis;
    session.status = 'reviewing';
    return true;
  }

  /**
   * Finalize voting and calculate result
   */
  finalizeVoting(sessionId: string): VotingResult | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.votes.length === 0) return null;

    // Check for veto
    if (session.counterThesis?.vetoRecommended && 
        this.calculateSeverityScore(session.counterThesis) >= this.config.vetoThreshold) {
      session.status = 'vetoed';
      session.endTime = new Date();
      
      return {
        finalSignal: 'neutral',
        weightedConfidence: 0,
        consensusStrength: 'split',
        bullishScore: 0,
        bearishScore: 0,
        neutralScore: 0,
        participatingAgents: session.votes.length,
        unanimousDecision: false,
        vetoApplied: true,
        vetoReason: `Devil's Advocate veto: ${session.counterThesis.counterArguments[0]?.argument || 'Critical risk identified'}`,
        recommendation: {
          action: 'no_action',
          positionSizePercent: 0,
          entryStrategy: 'wait',
          riskLevel: 'high',
          timeHorizon: 'short',
          notes: ['Trade vetoed due to critical risk assessment']
        }
      };
    }

    // Calculate weighted scores
    const scores = this.calculateWeightedScores(session.votes);
    
    // Apply confidence reduction from Devil's Advocate
    const confidenceReduction = session.counterThesis?.confidenceReduction || 0;
    const adjustedConfidence = Math.max(0, scores.weightedConfidence - confidenceReduction);

    // Determine final signal
    const finalSignal = this.determineFinalSignal(scores);
    
    // Determine consensus strength
    const consensusStrength = this.determineConsensusStrength(scores, session.votes);
    
    // Check for unanimous decision
    const unanimousDecision = session.votes.every(v => v.signal === finalSignal);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      finalSignal,
      adjustedConfidence,
      consensusStrength,
      session.counterThesis
    );

    const result: VotingResult = {
      finalSignal,
      weightedConfidence: adjustedConfidence,
      consensusStrength,
      bullishScore: scores.bullish,
      bearishScore: scores.bearish,
      neutralScore: scores.neutral,
      participatingAgents: session.votes.length,
      unanimousDecision,
      vetoApplied: false,
      recommendation
    };

    session.result = result;
    session.status = 'decided';
    session.endTime = new Date();

    return result;
  }

  // ============================================================================
  // Score Calculation
  // ============================================================================

  private calculateWeightedScores(votes: Vote[]): {
    bullish: number;
    bearish: number;
    neutral: number;
    weightedConfidence: number;
  } {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let totalWeight = 0;
    let weightedConfidenceSum = 0;

    for (const vote of votes) {
      const weightedScore = vote.weight * (vote.confidence / 100);
      totalWeight += vote.weight;
      weightedConfidenceSum += vote.weight * vote.confidence;

      switch (vote.signal) {
        case 'bullish':
          bullish += weightedScore;
          break;
        case 'bearish':
          bearish += weightedScore;
          break;
        case 'neutral':
          neutral += weightedScore;
          break;
      }
    }

    // Normalize scores
    const total = bullish + bearish + neutral || 1;
    const weightedConfidence = totalWeight > 0 ? weightedConfidenceSum / totalWeight : 0;

    return {
      bullish: (bullish / total) * 100,
      bearish: (bearish / total) * 100,
      neutral: (neutral / total) * 100,
      weightedConfidence
    };
  }

  private determineFinalSignal(scores: { bullish: number; bearish: number; neutral: number }): 'bullish' | 'bearish' | 'neutral' {
    const { bullish, bearish, neutral } = scores;
    
    if (bullish > bearish && bullish > neutral) return 'bullish';
    if (bearish > bullish && bearish > neutral) return 'bearish';
    return 'neutral';
  }

  private determineConsensusStrength(
    scores: { bullish: number; bearish: number; neutral: number },
    votes: Vote[]
  ): 'strong' | 'moderate' | 'weak' | 'split' {
    const maxScore = Math.max(scores.bullish, scores.bearish, scores.neutral);
    const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

    // Check for split decision
    const diff = Math.abs(scores.bullish - scores.bearish);
    if (diff < 10) return 'split';

    // Strong consensus: dominant signal with high confidence
    if (maxScore > 70 && avgConfidence > 75) return 'strong';
    
    // Moderate consensus
    if (maxScore > 50 && avgConfidence > 60) return 'moderate';
    
    return 'weak';
  }

  private calculateSeverityScore(counterThesis: CounterThesis): number {
    const severityMap = { low: 25, medium: 50, high: 75, critical: 100 };
    return severityMap[counterThesis.severity] || 50;
  }

  // ============================================================================
  // Recommendation Generation
  // ============================================================================

  private generateRecommendation(
    signal: 'bullish' | 'bearish' | 'neutral',
    confidence: number,
    consensusStrength: 'strong' | 'moderate' | 'weak' | 'split',
    counterThesis?: CounterThesis
  ): TradingRecommendation {
    const notes: string[] = [];

    // Determine action based on signal and confidence
    let action: TradingRecommendation['action'];
    let positionSizePercent: number;
    let entryStrategy: TradingRecommendation['entryStrategy'];
    let riskLevel: TradingRecommendation['riskLevel'];
    let timeHorizon: TradingRecommendation['timeHorizon'];

    if (confidence < this.config.minConfidenceForAction) {
      action = 'hold';
      positionSizePercent = 0;
      entryStrategy = 'wait';
      riskLevel = 'medium';
      timeHorizon = 'short';
      notes.push('Confidence below threshold for action');
    } else if (signal === 'bullish') {
      if (consensusStrength === 'strong' && confidence > 80) {
        action = 'strong_buy';
        positionSizePercent = 5;
        entryStrategy = 'market';
        riskLevel = 'medium';
        timeHorizon = 'medium';
      } else if (consensusStrength === 'moderate' || confidence > 65) {
        action = 'buy';
        positionSizePercent = 3;
        entryStrategy = 'scale_in';
        riskLevel = 'medium';
        timeHorizon = 'medium';
      } else {
        action = 'hold';
        positionSizePercent = 0;
        entryStrategy = 'wait';
        riskLevel = 'low';
        timeHorizon = 'short';
        notes.push('Weak consensus - waiting for confirmation');
      }
    } else if (signal === 'bearish') {
      if (consensusStrength === 'strong' && confidence > 80) {
        action = 'strong_sell';
        positionSizePercent = 5;
        entryStrategy = 'market';
        riskLevel = 'high';
        timeHorizon = 'short';
      } else if (consensusStrength === 'moderate' || confidence > 65) {
        action = 'sell';
        positionSizePercent = 3;
        entryStrategy = 'scale_in';
        riskLevel = 'medium';
        timeHorizon = 'short';
      } else {
        action = 'hold';
        positionSizePercent = 0;
        entryStrategy = 'wait';
        riskLevel = 'low';
        timeHorizon = 'short';
        notes.push('Weak bearish signal - monitoring');
      }
    } else {
      action = 'hold';
      positionSizePercent = 0;
      entryStrategy = 'wait';
      riskLevel = 'low';
      timeHorizon = 'short';
      notes.push('Neutral signal - no action recommended');
    }

    // Adjust for counter-thesis risks
    if (counterThesis) {
      if (counterThesis.severity === 'high' || counterThesis.severity === 'critical') {
        positionSizePercent = Math.max(0, positionSizePercent - 2);
        riskLevel = 'high';
        notes.push(`Risk adjusted: ${counterThesis.counterArguments[0]?.argument || 'High risk identified'}`);
      }

      if (counterThesis.killSwitchPrice) {
        notes.push(`Kill switch price: $${counterThesis.killSwitchPrice.toFixed(2)}`);
      }

      if (counterThesis.blindSpots.length > 0) {
        notes.push(`Blind spots: ${counterThesis.blindSpots.slice(0, 2).join(', ')}`);
      }
    }

    return {
      action,
      positionSizePercent,
      entryStrategy,
      riskLevel,
      timeHorizon,
      notes
    };
  }

  // ============================================================================
  // Weight Management
  // ============================================================================

  /**
   * Get current weight for an agent
   */
  getAgentWeight(agent: string): number {
    const weight = this.agentWeights.get(agent);
    return weight?.totalWeight || this.config.baseWeights[agent] || 0.1;
  }

  /**
   * Update agent weight based on prediction outcome
   */
  updateAgentWeight(
    agent: string,
    wasCorrect: boolean,
    marketRegime?: string
  ): void {
    const weight = this.agentWeights.get(agent);
    if (!weight) return;

    // Update accuracy history
    const history = this.accuracyHistory.get(agent) || { correct: 0, total: 0 };
    history.total++;
    if (wasCorrect) history.correct++;
    this.accuracyHistory.set(agent, history);

    // Calculate accuracy bonus
    const accuracy = history.total > 0 ? history.correct / history.total : 0.5;
    weight.accuracyBonus = (accuracy - 0.5) * this.config.accuracyMultiplier;

    // Update recency bonus (reset on correct prediction)
    if (wasCorrect) {
      weight.recencyBonus = 0.1;
    } else {
      weight.recencyBonus = Math.max(-0.2, weight.recencyBonus - this.config.recencyDecay);
    }

    // Calculate total weight
    weight.totalWeight = Math.max(0.05, Math.min(0.5,
      weight.baseWeight + weight.accuracyBonus + weight.regimeBonus + weight.recencyBonus
    ));

    weight.lastUpdated = new Date();
  }

  /**
   * Get all agent weights
   */
  getAllWeights(): AgentWeight[] {
    return Array.from(this.agentWeights.values());
  }

  /**
   * Reset weights to default
   */
  resetWeights(): void {
    this.initializeWeights();
    this.accuracyHistory.clear();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get session by ID
   */
  getSession(sessionId: string): VotingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a ticker
   */
  getSessionsForTicker(ticker: string): VotingSession[] {
    return Array.from(this.sessions.values()).filter(s => s.ticker === ticker);
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(limit: number = 10): VotingSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateId(): string {
    return `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let votingSystemInstance: WeightedVotingSystem | null = null;

export function getWeightedVotingSystem(): WeightedVotingSystem {
  if (!votingSystemInstance) {
    votingSystemInstance = new WeightedVotingSystem();
  }
  return votingSystemInstance;
}

export function createWeightedVotingSystem(config?: Partial<WeightConfig>): WeightedVotingSystem {
  return new WeightedVotingSystem(config);
}
