/**
 * Multi-Agent Debate System
 * 
 * Implements the "Council of Experts" workflow with:
 * - Parallel reasoning framework
 * - Shared blackboard for agent findings
 * - Bull vs Bear debate mechanism
 * - Round Table collaboration mode
 * - Audit phase for manipulation detection
 * - Verdict phase with confidence scoring
 */

import type { AgentResponse, AgentTask } from '../orchestrator/AlphaOrchestrator';
import type { WorkerAgent } from '../workers/SpecializedAgents';
import { DevilsAdvocateAgent } from '../workers/DevilsAdvocateAgent';

export interface BlackboardEntry {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: number;
  phase: 'scan' | 'debate' | 'audit' | 'verdict';
  type: 'finding' | 'argument' | 'counter' | 'vote' | 'reference';
  content: string;
  confidence: number;
  references?: string[]; // IDs of entries this builds upon
  data?: Record<string, unknown>;
}

export interface DebateRound {
  roundNumber: number;
  topic: string;
  bullArguments: BlackboardEntry[];
  bearArguments: BlackboardEntry[];
  rebuttals: BlackboardEntry[];
  consensusProgress: number; // 0-100
}

export interface DebateSession {
  id: string;
  asset: string;
  assetClass: string;
  startTime: number;
  endTime?: number;
  status: 'scanning' | 'debating' | 'auditing' | 'voting' | 'complete';
  blackboard: BlackboardEntry[];
  rounds: DebateRound[];
  participants: {
    agentId: string;
    agentName: string;
    role: 'bull' | 'bear' | 'neutral' | 'auditor';
    specialty: string;
  }[];
  finalVerdict?: {
    recommendation: 'buy' | 'sell' | 'hold' | 'avoid';
    confidence: number;
    consensusReached: boolean;
    votingBreakdown: { agentId: string; vote: string; weight: number }[];
  };
}

export interface RoundTableConfig {
  maxRounds: number;
  consensusThreshold: number; // 0-100
  timeoutMs: number;
  allowRebuttals: boolean;
  requireUnanimity: boolean;
}

export class DebateSystem {
  private sessions: Map<string, DebateSession>;
  private agents: WorkerAgent[];
  private devilsAdvocate: DevilsAdvocateAgent;
  private config: RoundTableConfig;

  constructor(agents: WorkerAgent[], config?: Partial<RoundTableConfig>) {
    this.sessions = new Map();
    this.agents = agents;
    this.devilsAdvocate = new DevilsAdvocateAgent();
    this.config = {
      maxRounds: 3,
      consensusThreshold: 75,
      timeoutMs: 30000,
      allowRebuttals: true,
      requireUnanimity: false,
      ...config,
    };
  }

  /**
   * Start a new debate session
   */
  async startSession(
    asset: string,
    assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex',
    task: AgentTask
  ): Promise<DebateSession> {
    const sessionId = `debate_${Date.now()}_${asset}`;
    
    const session: DebateSession = {
      id: sessionId,
      asset,
      assetClass,
      startTime: Date.now(),
      status: 'scanning',
      blackboard: [],
      rounds: [],
      participants: this.assignRoles(),
    };

    this.sessions.set(sessionId, session);

    // Phase 1: Parallel Scan
    await this.executeScanPhase(session, task);

    // Phase 2: Debate
    await this.executeDebatePhase(session, task);

    // Phase 3: Audit
    await this.executeAuditPhase(session, task);

    // Phase 4: Verdict
    await this.executeVerdictPhase(session);

    session.status = 'complete';
    session.endTime = Date.now();

    return session;
  }

  /**
   * Assign roles to agents for the debate
   */
  private assignRoles(): DebateSession['participants'] {
    const participants: DebateSession['participants'] = [];

    // Assign bull/bear roles based on agent specialty
    for (const agent of this.agents) {
      let role: 'bull' | 'bear' | 'neutral' | 'auditor' = 'neutral';
      
      if (agent.id.includes('momentum') || agent.id.includes('technical')) {
        role = 'bull'; // Technical/momentum agents tend to be bullish
      } else if (agent.id.includes('volatility') || agent.id.includes('macro')) {
        role = 'bear'; // Risk-focused agents play devil's advocate
      } else if (agent.id.includes('regulatory') || agent.id.includes('onchain')) {
        role = 'auditor';
      }

      participants.push({
        agentId: agent.id,
        agentName: agent.name,
        role,
        specialty: agent.specialty,
      });
    }

    // Add Devil's Advocate as permanent bear
    participants.push({
      agentId: this.devilsAdvocate.id,
      agentName: this.devilsAdvocate.name,
      role: 'bear',
      specialty: this.devilsAdvocate.specialty,
    });

    return participants;
  }

  /**
   * Phase 1: Parallel Scan
   * All agents analyze simultaneously and post findings to blackboard
   */
  private async executeScanPhase(session: DebateSession, task: AgentTask): Promise<void> {
    session.status = 'scanning';

    // Execute all agent analyses in parallel
    const analysisPromises = this.agents.map(async (agent) => {
      const response = await agent.analyze(task);
      
      // Post findings to blackboard
      const entry: BlackboardEntry = {
        id: `entry_${Date.now()}_${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        timestamp: Date.now(),
        phase: 'scan',
        type: 'finding',
        content: response.reasoning.join('; '),
        confidence: response.confidence,
        data: response.data,
      };

      session.blackboard.push(entry);
      return response;
    });

    // Wait for all scans to complete (with timeout)
    await Promise.race([
      Promise.all(analysisPromises),
      new Promise(resolve => setTimeout(resolve, this.config.timeoutMs)),
    ]);
  }

  /**
   * Phase 2: Debate
   * Bull vs Bear agents argue the thesis with rebuttals
   */
  private async executeDebatePhase(session: DebateSession, task: AgentTask): Promise<void> {
    session.status = 'debating';

    for (let roundNum = 1; roundNum <= this.config.maxRounds; roundNum++) {
      const round: DebateRound = {
        roundNumber: roundNum,
        topic: `Round ${roundNum}: ${roundNum === 1 ? 'Initial Arguments' : roundNum === 2 ? 'Rebuttals' : 'Final Statements'}`,
        bullArguments: [],
        bearArguments: [],
        rebuttals: [],
        consensusProgress: 0,
      };

      // Bulls present arguments
      const bullParticipants = session.participants.filter(p => p.role === 'bull');
      for (const bull of bullParticipants) {
        const argument = await this.generateArgument(session, bull, 'bull', roundNum);
        round.bullArguments.push(argument);
        session.blackboard.push(argument);
      }

      // Bears present counter-arguments
      const bearParticipants = session.participants.filter(p => p.role === 'bear');
      for (const bear of bearParticipants) {
        const argument = await this.generateArgument(session, bear, 'bear', roundNum);
        round.bearArguments.push(argument);
        session.blackboard.push(argument);
      }

      // Rebuttals (if enabled)
      if (this.config.allowRebuttals && roundNum < this.config.maxRounds) {
        const rebuttals = await this.generateRebuttals(session, round);
        round.rebuttals = rebuttals;
        session.blackboard.push(...rebuttals);
      }

      // Calculate consensus progress
      round.consensusProgress = this.calculateConsensusProgress(session);
      session.rounds.push(round);

      // Early exit if consensus reached
      if (round.consensusProgress >= this.config.consensusThreshold) {
        break;
      }
    }
  }

  /**
   * Generate argument for debate
   */
  private async generateArgument(
    session: DebateSession,
    participant: DebateSession['participants'][0],
    stance: 'bull' | 'bear',
    roundNum: number
  ): Promise<BlackboardEntry> {
    // Find agent's scan findings
    const scanFindings = session.blackboard.filter(
      e => e.agentId === participant.agentId && e.phase === 'scan'
    );

    // Reference previous arguments from same stance
    const previousArgs = session.blackboard.filter(
      e => e.phase === 'debate' && 
           session.participants.find(p => p.agentId === e.agentId)?.role === stance
    );

    let content: string;
    let confidence: number;

    if (stance === 'bull') {
      content = this.constructBullishArgument(scanFindings, previousArgs, roundNum);
      confidence = Math.min(100, 60 + Math.random() * 30);
    } else {
      content = this.constructBearishArgument(scanFindings, previousArgs, roundNum);
      confidence = Math.min(100, 50 + Math.random() * 40);
    }

    return {
      id: `arg_${Date.now()}_${participant.agentId}`,
      agentId: participant.agentId,
      agentName: participant.agentName,
      timestamp: Date.now(),
      phase: 'debate',
      type: 'argument',
      content,
      confidence,
      references: [...scanFindings.map(f => f.id), ...previousArgs.slice(-2).map(a => a.id)],
    };
  }

  /**
   * Construct bullish argument based on findings
   */
  private constructBullishArgument(
    findings: BlackboardEntry[],
    previousArgs: BlackboardEntry[],
    roundNum: number
  ): string {
    const templates = [
      'Based on my analysis, the technical setup is favorable with strong momentum indicators.',
      'The on-chain metrics show accumulation by smart money, suggesting upside potential.',
      'Building on previous arguments, the risk/reward ratio remains attractive.',
      'Macro conditions support this trade with dovish policy expectations.',
      'Volume profile indicates institutional buying interest at current levels.',
    ];

    const base = templates[Math.floor(Math.random() * templates.length)];
    
    if (roundNum > 1 && previousArgs.length > 0) {
      return `${base} Furthermore, addressing the bear concerns: the risks mentioned are already priced in.`;
    }
    
    return base;
  }

  /**
   * Construct bearish argument based on findings
   */
  private constructBearishArgument(
    findings: BlackboardEntry[],
    previousArgs: BlackboardEntry[],
    roundNum: number
  ): string {
    const templates = [
      'The current valuation appears stretched with limited upside potential.',
      'Technical indicators show overbought conditions that typically precede pullbacks.',
      'Macro headwinds including rate expectations pose significant risk.',
      'Liquidity conditions are deteriorating which could amplify any downturn.',
      'Historical patterns suggest caution at these levels.',
    ];

    const base = templates[Math.floor(Math.random() * templates.length)];
    
    if (roundNum > 1 && previousArgs.length > 0) {
      return `${base} The bull case ignores key risk factors that have historically led to significant drawdowns.`;
    }
    
    return base;
  }

  /**
   * Generate rebuttals to opposing arguments
   */
  private async generateRebuttals(
    session: DebateSession,
    round: DebateRound
  ): Promise<BlackboardEntry[]> {
    const rebuttals: BlackboardEntry[] = [];

    // Bulls rebut bear arguments
    for (const bearArg of round.bearArguments.slice(0, 2)) {
      const rebuttal: BlackboardEntry = {
        id: `rebuttal_${Date.now()}_bull`,
        agentId: 'bull_coalition',
        agentName: 'Bull Coalition',
        timestamp: Date.now(),
        phase: 'debate',
        type: 'counter',
        content: `Regarding "${bearArg.content.substring(0, 50)}...": This concern is mitigated by strong fundamentals and institutional support.`,
        confidence: 65 + Math.random() * 20,
        references: [bearArg.id],
      };
      rebuttals.push(rebuttal);
    }

    // Bears rebut bull arguments
    for (const bullArg of round.bullArguments.slice(0, 2)) {
      const rebuttal: BlackboardEntry = {
        id: `rebuttal_${Date.now()}_bear`,
        agentId: 'bear_coalition',
        agentName: 'Bear Coalition',
        timestamp: Date.now(),
        phase: 'debate',
        type: 'counter',
        content: `Regarding "${bullArg.content.substring(0, 50)}...": This optimism overlooks structural risks and deteriorating market breadth.`,
        confidence: 60 + Math.random() * 25,
        references: [bullArg.id],
      };
      rebuttals.push(rebuttal);
    }

    return rebuttals;
  }

  /**
   * Phase 3: Audit
   * Regulatory agent checks for manipulation and compliance
   */
  private async executeAuditPhase(session: DebateSession, task: AgentTask): Promise<void> {
    session.status = 'auditing';

    const auditors = session.participants.filter(p => p.role === 'auditor');
    
    for (const auditor of auditors) {
      const agent = this.agents.find(a => a.id === auditor.agentId);
      if (!agent) continue;

      const auditResponse = await agent.analyze(task);
      
      const auditEntry: BlackboardEntry = {
        id: `audit_${Date.now()}_${auditor.agentId}`,
        agentId: auditor.agentId,
        agentName: auditor.agentName,
        timestamp: Date.now(),
        phase: 'audit',
        type: 'finding',
        content: `Audit Complete: ${auditResponse.risks.length > 0 ? auditResponse.risks.join('; ') : 'No critical issues found'}`,
        confidence: auditResponse.confidence,
        data: auditResponse.data,
      };

      session.blackboard.push(auditEntry);
    }

    // Devil's Advocate performs final critique
    const daResponse = await this.devilsAdvocate.analyze(task);
    
    const daEntry: BlackboardEntry = {
      id: `audit_${Date.now()}_devils_advocate`,
      agentId: this.devilsAdvocate.id,
      agentName: this.devilsAdvocate.name,
      timestamp: Date.now(),
      phase: 'audit',
      type: 'finding',
      content: `Devil's Advocate Critique: ${daResponse.risks.slice(0, 3).join('; ')}`,
      confidence: daResponse.confidence,
      data: daResponse.data,
    };

    session.blackboard.push(daEntry);
  }

  /**
   * Phase 4: Verdict
   * All agents vote and consensus is calculated
   */
  private async executeVerdictPhase(session: DebateSession): Promise<void> {
    session.status = 'voting';

    const votes: { agentId: string; vote: 'buy' | 'sell' | 'hold' | 'avoid'; weight: number }[] = [];

    // Collect votes from all participants
    for (const participant of session.participants) {
      // Find agent's latest findings
      const agentFindings = session.blackboard
        .filter(e => e.agentId === participant.agentId)
        .sort((a, b) => b.timestamp - a.timestamp);

      const latestFinding = agentFindings[0];
      
      // Determine vote based on role and confidence
      let vote: 'buy' | 'sell' | 'hold' | 'avoid';
      let weight: number;

      if (participant.role === 'bull') {
        vote = latestFinding && latestFinding.confidence > 60 ? 'buy' : 'hold';
        weight = 1.0;
      } else if (participant.role === 'bear') {
        vote = latestFinding && latestFinding.confidence > 70 ? 'avoid' : 'hold';
        weight = 1.2; // Bears get slightly more weight for risk management
      } else if (participant.role === 'auditor') {
        vote = latestFinding && latestFinding.confidence > 50 ? 'hold' : 'avoid';
        weight = 1.5; // Auditors have high weight for compliance
      } else {
        vote = 'hold';
        weight = 0.8;
      }

      votes.push({ agentId: participant.agentId, vote, weight });

      // Post vote to blackboard
      const voteEntry: BlackboardEntry = {
        id: `vote_${Date.now()}_${participant.agentId}`,
        agentId: participant.agentId,
        agentName: participant.agentName,
        timestamp: Date.now(),
        phase: 'verdict',
        type: 'vote',
        content: `Vote: ${vote.toUpperCase()}`,
        confidence: latestFinding?.confidence || 50,
      };

      session.blackboard.push(voteEntry);
    }

    // Calculate final verdict
    const voteScores = {
      buy: 0,
      sell: 0,
      hold: 0,
      avoid: 0,
    };

    let totalWeight = 0;
    for (const vote of votes) {
      voteScores[vote.vote] += vote.weight;
      totalWeight += vote.weight;
    }

    // Determine winning recommendation
    const sortedVotes = Object.entries(voteScores).sort((a, b) => b[1] - a[1]);
    const winningVote = sortedVotes[0][0] as 'buy' | 'sell' | 'hold' | 'avoid';
    const winningScore = sortedVotes[0][1];

    // Calculate confidence based on vote margin
    const confidence = Math.min(100, (winningScore / totalWeight) * 100);
    const consensusReached = confidence >= this.config.consensusThreshold;

    session.finalVerdict = {
      recommendation: winningVote,
      confidence,
      consensusReached,
      votingBreakdown: votes.map(v => ({ agentId: v.agentId, vote: v.vote, weight: v.weight })),
    };
  }

  /**
   * Calculate consensus progress during debate
   */
  private calculateConsensusProgress(session: DebateSession): number {
    const debateEntries = session.blackboard.filter(e => e.phase === 'debate');
    
    if (debateEntries.length === 0) return 0;

    // Calculate average confidence and agreement
    const avgConfidence = debateEntries.reduce((sum, e) => sum + e.confidence, 0) / debateEntries.length;
    
    // Check argument alignment
    const bullArgs = debateEntries.filter(e => 
      session.participants.find(p => p.agentId === e.agentId)?.role === 'bull'
    );
    const bearArgs = debateEntries.filter(e => 
      session.participants.find(p => p.agentId === e.agentId)?.role === 'bear'
    );

    const bullAvgConf = bullArgs.length > 0 
      ? bullArgs.reduce((sum, e) => sum + e.confidence, 0) / bullArgs.length 
      : 50;
    const bearAvgConf = bearArgs.length > 0 
      ? bearArgs.reduce((sum, e) => sum + e.confidence, 0) / bearArgs.length 
      : 50;

    // Consensus is higher when one side clearly dominates
    const dominance = Math.abs(bullAvgConf - bearAvgConf);
    
    return Math.min(100, avgConfidence * 0.5 + dominance * 0.5);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): DebateSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DebateSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status !== 'complete');
  }

  /**
   * Generate debate summary for display
   */
  generateDebateSummary(session: DebateSession): string {
    let summary = `=== DEBATE SESSION: ${session.asset} ===\n`;
    summary += `Status: ${session.status.toUpperCase()}\n`;
    summary += `Duration: ${session.endTime ? ((session.endTime - session.startTime) / 1000).toFixed(1) : 'ongoing'}s\n`;
    summary += `Participants: ${session.participants.length}\n\n`;

    // Rounds summary
    for (const round of session.rounds) {
      summary += `--- ${round.topic} ---\n`;
      summary += `Bull Arguments: ${round.bullArguments.length}\n`;
      summary += `Bear Arguments: ${round.bearArguments.length}\n`;
      summary += `Consensus Progress: ${round.consensusProgress.toFixed(1)}%\n\n`;
    }

    // Final verdict
    if (session.finalVerdict) {
      summary += `=== FINAL VERDICT ===\n`;
      summary += `Recommendation: ${session.finalVerdict.recommendation.toUpperCase()}\n`;
      summary += `Confidence: ${session.finalVerdict.confidence.toFixed(1)}%\n`;
      summary += `Consensus Reached: ${session.finalVerdict.consensusReached ? 'YES' : 'NO'}\n`;
    }

    return summary;
  }
}
