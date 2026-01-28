/**
 * Consensus Score Broadcasting System
 * 
 * Manages real-time broadcasting of consensus scores,
 * threshold alerts, and execution signals from the
 * multi-agent debate system.
 */

import { webSocketServer, ConsensusUpdate, TradeSignal, WebSocketRoom } from './WebSocketServer';

// Interfaces
export interface ConsensusState {
  debateId: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  currentScore: number;
  previousScore: number;
  threshold: number;
  trend: 'rising' | 'falling' | 'stable';
  factors: ConsensusFactor[];
  agentVotes: AgentVote[];
  timestamp: Date;
}

export interface ConsensusFactor {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AgentVote {
  agentId: string;
  agentName: string;
  vote: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

export interface ExecutionSignal {
  signalId: string;
  debateId: string;
  symbol: string;
  action: 'buy' | 'sell';
  consensusScore: number;
  recommendedSize: number;
  maxSize: number;
  urgency: 'low' | 'medium' | 'high';
  validUntil: Date;
  conditions: string[];
}

export interface ThresholdAlert {
  debateId: string;
  symbol: string;
  currentScore: number;
  threshold: number;
  direction: 'crossed_above' | 'crossed_below' | 'approaching';
  timestamp: Date;
}

export class ConsensusBroadcaster {
  private consensusStates: Map<string, ConsensusState> = new Map();
  private executionSignals: Map<string, ExecutionSignal> = new Map();
  private readonly EXECUTION_THRESHOLD = 85;
  private readonly CAUTION_THRESHOLD = 70;
  private readonly APPROACHING_MARGIN = 5;
  private readonly SIGNAL_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Update and broadcast consensus score
   */
  updateConsensus(
    debateId: string,
    symbol: string,
    action: 'buy' | 'sell' | 'hold',
    newScore: number,
    factors: ConsensusFactor[],
    agentVotes: AgentVote[]
  ): ConsensusState {
    const existingState = this.consensusStates.get(debateId);
    const previousScore = existingState?.currentScore || 0;

    // Calculate trend
    const scoreDiff = newScore - previousScore;
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (scoreDiff > 2) trend = 'rising';
    else if (scoreDiff < -2) trend = 'falling';

    const state: ConsensusState = {
      debateId,
      symbol,
      action,
      currentScore: newScore,
      previousScore,
      threshold: this.EXECUTION_THRESHOLD,
      trend,
      factors,
      agentVotes,
      timestamp: new Date()
    };

    this.consensusStates.set(debateId, state);

    // Broadcast consensus update
    this.broadcastConsensusUpdate(state);

    // Check for threshold events
    this.checkThresholds(state, previousScore);

    // Generate execution signal if threshold crossed
    if (newScore >= this.EXECUTION_THRESHOLD && previousScore < this.EXECUTION_THRESHOLD) {
      this.generateExecutionSignal(state);
    }

    return state;
  }

  /**
   * Broadcast consensus update to all subscribers
   */
  private broadcastConsensusUpdate(state: ConsensusState): void {
    const update: ConsensusUpdate = {
      debateId: state.debateId,
      score: state.currentScore,
      previousScore: state.previousScore,
      threshold: state.threshold,
      recommendation: this.getRecommendation(state.currentScore),
      factors: state.factors.map(f => ({
        name: f.name,
        weight: f.weight,
        contribution: f.contribution
      })),
      timestamp: state.timestamp
    };

    webSocketServer.broadcastConsensusUpdate(update);

    console.log(`[ConsensusBroadcaster] Updated ${state.debateId}: ${state.currentScore}% (${state.trend})`);
  }

  /**
   * Check and broadcast threshold alerts
   */
  private checkThresholds(state: ConsensusState, previousScore: number): void {
    const { currentScore, debateId, symbol } = state;

    // Crossed above execution threshold
    if (currentScore >= this.EXECUTION_THRESHOLD && previousScore < this.EXECUTION_THRESHOLD) {
      this.broadcastThresholdAlert({
        debateId,
        symbol,
        currentScore,
        threshold: this.EXECUTION_THRESHOLD,
        direction: 'crossed_above',
        timestamp: new Date()
      });
    }

    // Crossed below execution threshold
    if (currentScore < this.EXECUTION_THRESHOLD && previousScore >= this.EXECUTION_THRESHOLD) {
      this.broadcastThresholdAlert({
        debateId,
        symbol,
        currentScore,
        threshold: this.EXECUTION_THRESHOLD,
        direction: 'crossed_below',
        timestamp: new Date()
      });
    }

    // Approaching threshold
    if (
      currentScore >= this.EXECUTION_THRESHOLD - this.APPROACHING_MARGIN &&
      currentScore < this.EXECUTION_THRESHOLD &&
      previousScore < this.EXECUTION_THRESHOLD - this.APPROACHING_MARGIN
    ) {
      this.broadcastThresholdAlert({
        debateId,
        symbol,
        currentScore,
        threshold: this.EXECUTION_THRESHOLD,
        direction: 'approaching',
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast threshold alert
   */
  private broadcastThresholdAlert(alert: ThresholdAlert): void {
    const alertType = alert.direction === 'crossed_above' ? 'success' :
                     alert.direction === 'crossed_below' ? 'warning' : 'info';

    const message = alert.direction === 'crossed_above'
      ? `Consensus for ${alert.symbol} crossed above ${alert.threshold}% threshold! Ready for execution.`
      : alert.direction === 'crossed_below'
      ? `Consensus for ${alert.symbol} dropped below ${alert.threshold}% threshold. Execution paused.`
      : `Consensus for ${alert.symbol} approaching ${alert.threshold}% threshold (${alert.currentScore}%)`;

    webSocketServer.broadcastAlert({
      alertId: `threshold_${Date.now()}`,
      type: alertType,
      title: 'Consensus Threshold Alert',
      message,
      source: 'ConsensusBroadcaster',
      timestamp: alert.timestamp,
      requiresAction: alert.direction === 'crossed_above'
    });

    console.log(`[ConsensusBroadcaster] Threshold alert: ${alert.direction} for ${alert.symbol}`);
  }

  /**
   * Generate execution signal when threshold is met
   */
  private generateExecutionSignal(state: ConsensusState): ExecutionSignal {
    const signalId = `signal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Calculate recommended size based on confidence
    const avgConfidence = state.agentVotes.length > 0
      ? state.agentVotes.reduce((sum, v) => sum + v.confidence, 0) / state.agentVotes.length
      : 0;

    const sizeMultiplier = Math.min(1, (state.currentScore - this.EXECUTION_THRESHOLD) / 15 + 0.5);
    const recommendedSize = Math.round(sizeMultiplier * 100) / 100; // 0.50 to 1.00

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (state.currentScore >= 95 && avgConfidence >= 90) urgency = 'high';
    else if (state.currentScore < 88 || avgConfidence < 75) urgency = 'low';

    const signal: ExecutionSignal = {
      signalId,
      debateId: state.debateId,
      symbol: state.symbol,
      action: state.action === 'hold' ? 'buy' : state.action,
      consensusScore: state.currentScore,
      recommendedSize,
      maxSize: 1.0,
      urgency,
      validUntil: new Date(Date.now() + this.SIGNAL_VALIDITY_MS),
      conditions: this.generateConditions(state)
    };

    this.executionSignals.set(signalId, signal);

    // Broadcast trade signal
    const tradeSignal: TradeSignal = {
      signalId,
      symbol: state.symbol,
      action: signal.action,
      quantity: recommendedSize * 100, // Base units
      price: 0, // Market price
      confidence: avgConfidence,
      consensusScore: state.currentScore,
      timestamp: new Date()
    };

    webSocketServer.broadcastTradeSignal(tradeSignal);

    console.log(`[ConsensusBroadcaster] Generated execution signal ${signalId} for ${state.symbol}`);

    return signal;
  }

  /**
   * Generate execution conditions
   */
  private generateConditions(state: ConsensusState): string[] {
    const conditions: string[] = [];

    // Check for unanimous bullish
    const bullishVotes = state.agentVotes.filter(v => v.vote === 'bullish').length;
    const totalVotes = state.agentVotes.length;
    
    if (bullishVotes === totalVotes && totalVotes > 0) {
      conditions.push('Unanimous bullish consensus');
    } else if (bullishVotes / totalVotes >= 0.8) {
      conditions.push('Strong bullish majority (80%+)');
    }

    // Check for high confidence
    const avgConfidence = state.agentVotes.reduce((sum, v) => sum + v.confidence, 0) / (totalVotes || 1);
    if (avgConfidence >= 90) {
      conditions.push('High agent confidence (90%+)');
    }

    // Check trend
    if (state.trend === 'rising') {
      conditions.push('Consensus trending upward');
    }

    // Add factor-based conditions
    for (const factor of state.factors) {
      if (factor.contribution >= 0.3) {
        conditions.push(`Strong ${factor.name} signal`);
      }
    }

    return conditions;
  }

  /**
   * Get recommendation based on score
   */
  private getRecommendation(score: number): 'execute' | 'reject' | 'caution' {
    if (score >= this.EXECUTION_THRESHOLD) return 'execute';
    if (score >= this.CAUTION_THRESHOLD) return 'caution';
    return 'reject';
  }

  /**
   * Get current consensus state
   */
  getConsensusState(debateId: string): ConsensusState | undefined {
    return this.consensusStates.get(debateId);
  }

  /**
   * Get all active consensus states
   */
  getAllConsensusStates(): ConsensusState[] {
    return Array.from(this.consensusStates.values());
  }

  /**
   * Get pending execution signals
   */
  getPendingSignals(): ExecutionSignal[] {
    const now = Date.now();
    const validSignals: ExecutionSignal[] = [];

    for (const [signalId, signal] of Array.from(this.executionSignals.entries())) {
      if (signal.validUntil.getTime() > now) {
        validSignals.push(signal);
      } else {
        this.executionSignals.delete(signalId);
      }
    }

    return validSignals;
  }

  /**
   * Consume execution signal (mark as used)
   */
  consumeSignal(signalId: string): ExecutionSignal | null {
    const signal = this.executionSignals.get(signalId);
    if (signal) {
      this.executionSignals.delete(signalId);
      return signal;
    }
    return null;
  }

  /**
   * Get broadcaster statistics
   */
  getStats(): {
    activeDebates: number;
    pendingSignals: number;
    averageConsensus: number;
    aboveThreshold: number;
  } {
    const states = Array.from(this.consensusStates.values());
    const avgConsensus = states.length > 0
      ? states.reduce((sum, s) => sum + s.currentScore, 0) / states.length
      : 0;
    const aboveThreshold = states.filter(s => s.currentScore >= this.EXECUTION_THRESHOLD).length;

    return {
      activeDebates: states.length,
      pendingSignals: this.getPendingSignals().length,
      averageConsensus: Math.round(avgConsensus * 10) / 10,
      aboveThreshold
    };
  }

  /**
   * Clear consensus state for a debate
   */
  clearConsensus(debateId: string): void {
    this.consensusStates.delete(debateId);
    
    // Clear related signals
    for (const [signalId, signal] of Array.from(this.executionSignals.entries())) {
      if (signal.debateId === debateId) {
        this.executionSignals.delete(signalId);
      }
    }
  }
}

// Singleton instance
export const consensusBroadcaster = new ConsensusBroadcaster();
