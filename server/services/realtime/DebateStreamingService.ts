/**
 * Debate Streaming Service
 * 
 * Manages real-time streaming of multi-agent debates
 * including argument broadcasting, round progression,
 * and debate history caching.
 */

import { webSocketServer, DebateArgument, WebSocketRoom } from './WebSocketServer';

// Interfaces
export interface DebateSession {
  id: string;
  topic: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  agents: AgentParticipant[];
  currentRound: number;
  totalRounds: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  arguments: DebateArgument[];
  consensusHistory: ConsensusPoint[];
  startTime: Date;
  endTime?: Date;
  finalDecision?: 'execute' | 'reject' | 'caution';
  finalConsensus?: number;
}

export interface AgentParticipant {
  id: string;
  name: string;
  role: string;
  stance?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  argumentCount: number;
}

export interface ConsensusPoint {
  round: number;
  score: number;
  timestamp: Date;
}

export interface DebateConfig {
  topic: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  agents: string[];
  totalRounds?: number;
  consensusThreshold?: number;
}

export class DebateStreamingService {
  private activeSessions: Map<string, DebateSession> = new Map();
  private sessionHistory: DebateSession[] = [];
  private readonly MAX_HISTORY = 100;
  private readonly DEFAULT_ROUNDS = 5;
  private readonly DEFAULT_THRESHOLD = 85;

  /**
   * Start a new debate session
   */
  startDebate(config: DebateConfig): DebateSession {
    const sessionId = this.generateSessionId();
    
    const session: DebateSession = {
      id: sessionId,
      topic: config.topic,
      symbol: config.symbol,
      action: config.action,
      agents: config.agents.map(agentName => ({
        id: `agent_${agentName.toLowerCase().replace(/\s+/g, '_')}`,
        name: agentName,
        role: this.getAgentRole(agentName),
        argumentCount: 0
      })),
      currentRound: 1,
      totalRounds: config.totalRounds || this.DEFAULT_ROUNDS,
      status: 'active',
      arguments: [],
      consensusHistory: [],
      startTime: new Date()
    };

    this.activeSessions.set(sessionId, session);

    // Broadcast debate start
    webSocketServer.broadcastDebateStart(
      sessionId,
      config.topic,
      config.agents
    );

    console.log(`[DebateStreaming] Started debate ${sessionId}: ${config.topic}`);

    return session;
  }

  /**
   * Add an argument to the debate
   */
  addArgument(
    sessionId: string,
    agentId: string,
    agentName: string,
    stance: 'bullish' | 'bearish' | 'neutral',
    argument: string,
    confidence: number
  ): DebateArgument | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      console.warn(`[DebateStreaming] Cannot add argument to inactive session ${sessionId}`);
      return null;
    }

    const debateArgument: DebateArgument = {
      debateId: sessionId,
      agentId,
      agentName,
      stance,
      argument,
      confidence,
      timestamp: new Date(),
      round: session.currentRound
    };

    // Add to session
    session.arguments.push(debateArgument);

    // Update agent stats
    const agent = session.agents.find(a => a.id === agentId || a.name === agentName);
    if (agent) {
      agent.stance = stance;
      agent.confidence = confidence;
      agent.argumentCount++;
    }

    // Broadcast argument
    webSocketServer.broadcastDebateArgument(debateArgument);

    console.log(`[DebateStreaming] ${agentName} (${stance}): ${argument.substring(0, 50)}...`);

    return debateArgument;
  }

  /**
   * Advance to next round
   */
  advanceRound(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return false;
    }

    if (session.currentRound >= session.totalRounds) {
      console.warn(`[DebateStreaming] Session ${sessionId} already at final round`);
      return false;
    }

    session.currentRound++;

    // Broadcast round update
    webSocketServer.broadcastDebateRound(
      sessionId,
      session.currentRound,
      session.totalRounds
    );

    console.log(`[DebateStreaming] Session ${sessionId} advanced to round ${session.currentRound}/${session.totalRounds}`);

    return true;
  }

  /**
   * Update consensus score for the session
   */
  updateConsensus(sessionId: string, score: number): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const consensusPoint: ConsensusPoint = {
      round: session.currentRound,
      score,
      timestamp: new Date()
    };

    session.consensusHistory.push(consensusPoint);

    // Broadcast consensus update
    const previousScore = session.consensusHistory.length > 1
      ? session.consensusHistory[session.consensusHistory.length - 2].score
      : 0;

    webSocketServer.broadcastConsensusUpdate({
      debateId: sessionId,
      score,
      previousScore,
      threshold: this.DEFAULT_THRESHOLD,
      recommendation: this.getRecommendation(score),
      factors: this.calculateFactors(session),
      timestamp: new Date()
    });
  }

  /**
   * End the debate session
   */
  endDebate(
    sessionId: string,
    finalConsensus: number,
    decision: 'execute' | 'reject' | 'caution'
  ): DebateSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.status = 'completed';
    session.endTime = new Date();
    session.finalConsensus = finalConsensus;
    session.finalDecision = decision;

    // Broadcast debate end
    webSocketServer.broadcastDebateEnd(sessionId, finalConsensus, decision);

    // Broadcast final consensus
    webSocketServer.broadcastConsensusFinal(sessionId, finalConsensus, decision === 'execute' ? 'execute' : 'reject');

    // Move to history
    this.activeSessions.delete(sessionId);
    this.sessionHistory.unshift(session);

    // Trim history
    if (this.sessionHistory.length > this.MAX_HISTORY) {
      this.sessionHistory = this.sessionHistory.slice(0, this.MAX_HISTORY);
    }

    console.log(`[DebateStreaming] Ended debate ${sessionId} with decision: ${decision} (${finalConsensus}%)`);

    return session;
  }

  /**
   * Cancel a debate session
   */
  cancelDebate(sessionId: string, reason: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'cancelled';
    session.endTime = new Date();

    // Broadcast cancellation as debate end
    webSocketServer.broadcastDebateEnd(sessionId, 0, 'cancelled');

    // Broadcast alert
    webSocketServer.broadcastAlert({
      alertId: `alert_${Date.now()}`,
      type: 'warning',
      title: 'Debate Cancelled',
      message: `Debate "${session.topic}" was cancelled: ${reason}`,
      source: 'DebateStreamingService',
      timestamp: new Date(),
      requiresAction: false
    });

    this.activeSessions.delete(sessionId);

    console.log(`[DebateStreaming] Cancelled debate ${sessionId}: ${reason}`);

    return true;
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): DebateSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DebateSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session history
   */
  getSessionHistory(limit: number = 10): DebateSession[] {
    return this.sessionHistory.slice(0, limit);
  }

  /**
   * Get debate statistics
   */
  getStats(): {
    activeSessions: number;
    completedSessions: number;
    averageConsensus: number;
    executeRate: number;
  } {
    const completed = this.sessionHistory.filter(s => s.status === 'completed');
    const executed = completed.filter(s => s.finalDecision === 'execute');

    const avgConsensus = completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.finalConsensus || 0), 0) / completed.length
      : 0;

    return {
      activeSessions: this.activeSessions.size,
      completedSessions: completed.length,
      averageConsensus: Math.round(avgConsensus * 10) / 10,
      executeRate: completed.length > 0 ? (executed.length / completed.length) * 100 : 0
    };
  }

  // ==================== Helper Methods ====================

  private generateSessionId(): string {
    return `debate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private getAgentRole(agentName: string): string {
    const roles: Record<string, string> = {
      'Alpha Orchestrator': 'Coordination',
      'On-Chain Auditor': 'Crypto Integrity',
      'Macro Strategist': 'Global Links',
      'Volatility Architect': 'Options/Risk',
      'Adversarial Bear': 'Quality Control',
      'Momentum Agent': 'Trend Detection',
      'Regulatory Agent': 'Compliance'
    };
    return roles[agentName] || 'Analysis';
  }

  private getRecommendation(score: number): 'execute' | 'reject' | 'caution' {
    if (score >= this.DEFAULT_THRESHOLD) return 'execute';
    if (score >= 70) return 'caution';
    return 'reject';
  }

  private calculateFactors(session: DebateSession): { name: string; weight: number; contribution: number }[] {
    const bullishCount = session.arguments.filter(a => a.stance === 'bullish').length;
    const bearishCount = session.arguments.filter(a => a.stance === 'bearish').length;
    const neutralCount = session.arguments.filter(a => a.stance === 'neutral').length;
    const total = bullishCount + bearishCount + neutralCount || 1;

    const avgBullishConf = this.calculateAverageConfidence(session.arguments.filter(a => a.stance === 'bullish'));
    const avgBearishConf = this.calculateAverageConfidence(session.arguments.filter(a => a.stance === 'bearish'));

    return [
      { name: 'Bullish Arguments', weight: 0.35, contribution: (bullishCount / total) * avgBullishConf },
      { name: 'Bearish Arguments', weight: 0.35, contribution: (bearishCount / total) * avgBearishConf },
      { name: 'Agent Agreement', weight: 0.20, contribution: this.calculateAgreement(session) },
      { name: 'Confidence Level', weight: 0.10, contribution: this.calculateOverallConfidence(session) }
    ];
  }

  private calculateAverageConfidence(arguments_: DebateArgument[]): number {
    if (arguments_.length === 0) return 0;
    return arguments_.reduce((sum, a) => sum + a.confidence, 0) / arguments_.length;
  }

  private calculateAgreement(session: DebateSession): number {
    const stances = session.agents.map(a => a.stance).filter(Boolean);
    if (stances.length === 0) return 0;

    const stanceCounts = new Map<string, number>();
    for (const stance of stances) {
      stanceCounts.set(stance!, (stanceCounts.get(stance!) || 0) + 1);
    }

    const maxCount = Math.max(...Array.from(stanceCounts.values()));
    return (maxCount / stances.length) * 100;
  }

  private calculateOverallConfidence(session: DebateSession): number {
    const confidences = session.agents.map(a => a.confidence).filter((c): c is number => c !== undefined);
    if (confidences.length === 0) return 0;
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}

// Singleton instance
export const debateStreamingService = new DebateStreamingService();
