/**
 * Agent-to-Agent (A2A) Protocol - 2026 Multi-Agent Communication System
 * 
 * Implements the A2A Protocol for:
 * - Agent negotiation when signals conflict
 * - Parallel processing for 500+ stocks simultaneously
 * - Self-correction with audit logging for failed trades
 * - Round-table discussions for complex decisions
 */

import type { AgentSignal } from './StockIntelligenceAgents';
import type { CounterThesis } from './DevilsAdvocateAgent';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string | 'broadcast';
  messageType: 'signal' | 'challenge' | 'response' | 'vote' | 'consensus' | 'veto';
  content: any;
  timestamp: Date;
  correlationId: string; // Links related messages
}

export interface NegotiationSession {
  id: string;
  ticker: string;
  participants: string[];
  status: 'active' | 'resolved' | 'deadlocked' | 'vetoed';
  messages: AgentMessage[];
  rounds: NegotiationRound[];
  finalDecision?: FinalDecision;
  startTime: Date;
  endTime?: Date;
}

export interface NegotiationRound {
  roundNumber: number;
  topic: string;
  proposals: AgentProposal[];
  outcome: 'consensus' | 'majority' | 'deadlock' | 'escalated';
}

export interface AgentProposal {
  agent: string;
  proposal: string;
  supporting: string[];
  opposing: string[];
  confidence: number;
}

export interface FinalDecision {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  consensusType: 'unanimous' | 'majority' | 'tiebreaker' | 'veto';
  supportingAgents: string[];
  dissentingAgents: string[];
  rationale: string;
  actionItems: ActionItem[];
}

export interface ActionItem {
  action: 'buy' | 'sell' | 'hold' | 'watch';
  ticker: string;
  positionSize?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe?: string;
}

export interface ParallelTask {
  id: string;
  ticker: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: AgentSignal;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: 'analysis_start' | 'analysis_complete' | 'negotiation' | 'decision' | 'error' | 'correction';
  ticker: string;
  details: any;
  agentsInvolved: string[];
  outcome?: string;
}

// ============================================================================
// A2A Protocol Implementation
// ============================================================================

export class A2AProtocol {
  private sessions: Map<string, NegotiationSession> = new Map();
  private auditLogs: AuditLog[] = [];
  private messageQueue: AgentMessage[] = [];
  private parallelTasks: Map<string, ParallelTask> = new Map();

  constructor() {
    console.log('[A2A Protocol] Initialized');
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Send a message from one agent to another or broadcast
   */
  sendMessage(
    fromAgent: string,
    toAgent: string | 'broadcast',
    messageType: AgentMessage['messageType'],
    content: any,
    correlationId?: string
  ): AgentMessage {
    const message: AgentMessage = {
      id: this.generateId(),
      fromAgent,
      toAgent,
      messageType,
      content,
      timestamp: new Date(),
      correlationId: correlationId || this.generateId()
    };

    this.messageQueue.push(message);
    this.logAudit('negotiation', content.ticker || 'unknown', {
      message: `${fromAgent} -> ${toAgent}: ${messageType}`,
      content
    }, [fromAgent, typeof toAgent === 'string' ? toAgent : 'all']);

    return message;
  }

  /**
   * Get messages for a specific agent
   */
  getMessagesFor(agent: string, correlationId?: string): AgentMessage[] {
    return this.messageQueue.filter(m => 
      (m.toAgent === agent || m.toAgent === 'broadcast') &&
      (!correlationId || m.correlationId === correlationId)
    );
  }

  // ============================================================================
  // Negotiation Sessions
  // ============================================================================

  /**
   * Start a negotiation session when agents disagree
   */
  startNegotiation(
    ticker: string,
    conflictingSignals: AgentSignal[],
    participants: string[]
  ): NegotiationSession {
    const session: NegotiationSession = {
      id: this.generateId(),
      ticker,
      participants,
      status: 'active',
      messages: [],
      rounds: [],
      startTime: new Date()
    };

    this.sessions.set(session.id, session);

    // Log the start of negotiation
    this.logAudit('negotiation', ticker, {
      action: 'negotiation_started',
      participants,
      conflictingSignals: conflictingSignals.map(s => ({
        agent: s.agent,
        signal: s.signal,
        confidence: s.confidence
      }))
    }, participants);

    // Broadcast the conflict to all participants
    this.sendMessage(
      'A2A_Protocol',
      'broadcast',
      'signal',
      {
        ticker,
        sessionId: session.id,
        conflict: this.describeConflict(conflictingSignals)
      },
      session.id
    );

    return session;
  }

  /**
   * Add a negotiation round
   */
  addNegotiationRound(
    sessionId: string,
    topic: string,
    proposals: AgentProposal[]
  ): NegotiationRound | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return null;

    const round: NegotiationRound = {
      roundNumber: session.rounds.length + 1,
      topic,
      proposals,
      outcome: this.determineRoundOutcome(proposals)
    };

    session.rounds.push(round);
    return round;
  }

  /**
   * Resolve a negotiation session
   */
  resolveNegotiation(
    sessionId: string,
    decision: FinalDecision
  ): NegotiationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = 'resolved';
    session.finalDecision = decision;
    session.endTime = new Date();

    this.logAudit('decision', session.ticker, {
      action: 'negotiation_resolved',
      decision,
      duration: session.endTime.getTime() - session.startTime.getTime()
    }, session.participants);

    return session;
  }

  /**
   * Veto a decision (used by Devil's Advocate for critical risks)
   */
  vetoDecision(
    sessionId: string,
    vetoingAgent: string,
    reason: string,
    counterThesis: CounterThesis
  ): NegotiationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = 'vetoed';
    session.endTime = new Date();

    // Send veto message
    this.sendMessage(
      vetoingAgent,
      'broadcast',
      'veto',
      {
        ticker: session.ticker,
        reason,
        counterThesis,
        severity: counterThesis.severity
      },
      sessionId
    );

    this.logAudit('decision', session.ticker, {
      action: 'decision_vetoed',
      vetoingAgent,
      reason,
      severity: counterThesis.severity
    }, session.participants);

    return session;
  }

  // ============================================================================
  // Parallel Processing
  // ============================================================================

  /**
   * Process multiple stocks in parallel
   */
  async processParallel<T>(
    tickers: string[],
    processor: (ticker: string) => Promise<T>,
    maxConcurrency: number = 10
  ): Promise<Map<string, T | Error>> {
    const results = new Map<string, T | Error>();
    const queue = [...tickers];
    const running: Promise<void>[] = [];

    const processOne = async (ticker: string) => {
      const taskId = this.generateId();
      const task: ParallelTask = {
        id: taskId,
        ticker,
        status: 'running',
        startTime: new Date()
      };
      this.parallelTasks.set(taskId, task);

      try {
        const result = await processor(ticker);
        results.set(ticker, result);
        task.status = 'completed';
        task.endTime = new Date();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.set(ticker, err);
        task.status = 'failed';
        task.error = err.message;
        task.endTime = new Date();

        // Log the error for self-correction
        this.logAudit('error', ticker, {
          action: 'parallel_processing_failed',
          error: err.message
        }, ['A2A_Protocol']);
      }
    };

    while (queue.length > 0 || running.length > 0) {
      // Start new tasks up to maxConcurrency
      while (queue.length > 0 && running.length < maxConcurrency) {
        const ticker = queue.shift()!;
        const promise = processOne(ticker).then(() => {
          const index = running.indexOf(promise);
          if (index > -1) running.splice(index, 1);
        });
        running.push(promise);
      }

      // Wait for at least one to complete
      if (running.length > 0) {
        await Promise.race(running);
      }
    }

    return results;
  }

  /**
   * Batch analyze multiple stocks with all agents
   */
  async batchAnalyze(
    tickers: string[],
    analyzeFunc: (ticker: string) => Promise<AgentSignal[]>,
    maxConcurrency: number = 5
  ): Promise<Map<string, AgentSignal[]>> {
    this.logAudit('analysis_start', 'batch', {
      action: 'batch_analysis_started',
      tickerCount: tickers.length,
      maxConcurrency
    }, ['A2A_Protocol']);

    const startTime = Date.now();
    const results = await this.processParallel(tickers, analyzeFunc, maxConcurrency);

    // Filter out errors and convert to proper type
    const successResults = new Map<string, AgentSignal[]>();
    const errors: string[] = [];

    for (const [ticker, result] of Array.from(results.entries())) {
      if (result instanceof Error) {
        errors.push(`${ticker}: ${result.message}`);
      } else {
        successResults.set(ticker, result as AgentSignal[]);
      }
    }

    this.logAudit('analysis_complete', 'batch', {
      action: 'batch_analysis_completed',
      successCount: successResults.size,
      errorCount: errors.length,
      duration: Date.now() - startTime,
      errors: errors.slice(0, 10) // Log first 10 errors
    }, ['A2A_Protocol']);

    return successResults;
  }

  // ============================================================================
  // Self-Correction System
  // ============================================================================

  /**
   * Record a trade outcome for learning
   */
  recordTradeOutcome(
    ticker: string,
    originalDecision: FinalDecision,
    actualOutcome: {
      entryPrice: number;
      exitPrice: number;
      pnl: number;
      holdingPeriod: number;
      exitReason: 'target_hit' | 'stop_hit' | 'manual' | 'time_exit';
    }
  ): void {
    const wasCorrect = (
      (originalDecision.signal === 'bullish' && actualOutcome.pnl > 0) ||
      (originalDecision.signal === 'bearish' && actualOutcome.pnl < 0)
    );

    this.logAudit('correction', ticker, {
      action: 'trade_outcome_recorded',
      originalSignal: originalDecision.signal,
      originalConfidence: originalDecision.confidence,
      supportingAgents: originalDecision.supportingAgents,
      dissentingAgents: originalDecision.dissentingAgents,
      outcome: actualOutcome,
      wasCorrect
    }, originalDecision.supportingAgents);

    // If the trade was wrong, log which agents were correct
    if (!wasCorrect) {
      this.logAudit('correction', ticker, {
        action: 'incorrect_prediction',
        correctAgents: originalDecision.dissentingAgents,
        incorrectAgents: originalDecision.supportingAgents,
        lesson: `${originalDecision.signal} signal was wrong. Dissenting agents were correct.`
      }, [...originalDecision.supportingAgents, ...originalDecision.dissentingAgents]);
    }
  }

  /**
   * Get agent performance statistics
   */
  getAgentPerformance(): Map<string, { correct: number; incorrect: number; accuracy: number }> {
    const performance = new Map<string, { correct: number; incorrect: number; accuracy: number }>();
    
    const correctionLogs = this.auditLogs.filter(log => 
      log.eventType === 'correction' && log.details.action === 'trade_outcome_recorded'
    );

    for (const log of correctionLogs) {
      const { supportingAgents, dissentingAgents, wasCorrect } = log.details;
      
      // Update supporting agents
      for (const agent of supportingAgents || []) {
        const stats = performance.get(agent) || { correct: 0, incorrect: 0, accuracy: 0 };
        if (wasCorrect) stats.correct++;
        else stats.incorrect++;
        stats.accuracy = stats.correct / (stats.correct + stats.incorrect);
        performance.set(agent, stats);
      }

      // Update dissenting agents (inverse)
      for (const agent of dissentingAgents || []) {
        const stats = performance.get(agent) || { correct: 0, incorrect: 0, accuracy: 0 };
        if (!wasCorrect) stats.correct++;
        else stats.incorrect++;
        stats.accuracy = stats.correct / (stats.correct + stats.incorrect);
        performance.set(agent, stats);
      }
    }

    return performance;
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  private logAudit(
    eventType: AuditLog['eventType'],
    ticker: string,
    details: any,
    agentsInvolved: string[]
  ): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType,
      ticker,
      details,
      agentsInvolved
    };

    this.auditLogs.push(log);

    // Keep only last 10000 logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  /**
   * Get audit logs for a ticker
   */
  getAuditLogs(ticker?: string, eventType?: AuditLog['eventType']): AuditLog[] {
    return this.auditLogs.filter(log => 
      (!ticker || log.ticker === ticker) &&
      (!eventType || log.eventType === eventType)
    );
  }

  /**
   * Export audit logs for compliance
   */
  exportAuditLogs(startDate?: Date, endDate?: Date): AuditLog[] {
    return this.auditLogs.filter(log => {
      if (startDate && log.timestamp < startDate) return false;
      if (endDate && log.timestamp > endDate) return false;
      return true;
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private describeConflict(signals: AgentSignal[]): string {
    const bullish = signals.filter(s => s.signal === 'bullish');
    const bearish = signals.filter(s => s.signal === 'bearish');
    const neutral = signals.filter(s => s.signal === 'neutral');

    return `Conflict detected: ${bullish.length} bullish (${bullish.map(s => s.agent).join(', ')}), ` +
           `${bearish.length} bearish (${bearish.map(s => s.agent).join(', ')}), ` +
           `${neutral.length} neutral (${neutral.map(s => s.agent).join(', ')})`;
  }

  private determineRoundOutcome(proposals: AgentProposal[]): NegotiationRound['outcome'] {
    if (proposals.length === 0) return 'deadlock';

    // Check for consensus (all agree)
    const firstProposal = proposals[0].proposal;
    if (proposals.every(p => p.proposal === firstProposal)) {
      return 'consensus';
    }

    // Check for majority
    const proposalCounts = new Map<string, number>();
    for (const p of proposals) {
      proposalCounts.set(p.proposal, (proposalCounts.get(p.proposal) || 0) + 1);
    }

    const maxCount = Math.max(...Array.from(proposalCounts.values()));
    if (maxCount > proposals.length / 2) {
      return 'majority';
    }

    return 'deadlock';
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): NegotiationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): NegotiationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Clear old sessions
   */
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const [id, session] of Array.from(this.sessions.entries())) {
      if (session.startTime.getTime() < cutoff) {
        this.sessions.delete(id);
        removed++;
      }
    }

    return removed;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let protocolInstance: A2AProtocol | null = null;

export function getA2AProtocol(): A2AProtocol {
  if (!protocolInstance) {
    protocolInstance = new A2AProtocol();
  }
  return protocolInstance;
}

export function createA2AProtocol(): A2AProtocol {
  return new A2AProtocol();
}
