import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevilsAdvocateAgent, createDevilsAdvocate } from './DevilsAdvocateAgent';
import { A2AProtocol, createA2AProtocol } from './A2AProtocol';
import { WeightedVotingSystem, createWeightedVotingSystem } from './WeightedVotingSystem';
import { InvestmentThesisGenerator, createInvestmentThesisGenerator } from './InvestmentThesisGenerator';
import type { AgentSignal } from './StockIntelligenceAgents';

// Mock LLM
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          counterSignal: 'bearish',
          severity: 'medium',
          vetoRecommended: false,
          killSwitchPrice: 140.00,
          counterArguments: [
            {
              category: 'fundamental',
              argument: 'Valuation stretched compared to peers',
              evidence: 'P/E ratio 25% above sector average',
              impact: 'medium'
            }
          ],
          blindSpots: ['Regulatory risk in key markets'],
          macroContradictions: ['Rising rates may pressure growth stocks'],
          liquidityWarnings: [],
          historicalPrecedents: [],
          confidenceReduction: 15
        })
      }
    }]
  })
}));

// Sample agent signals for testing
const sampleSignals: AgentSignal[] = [
  {
    agent: 'Fundamental Analyst',
    ticker: 'AAPL',
    signal: 'bullish',
    confidence: 75,
    rationale: 'Strong fundamentals with growing free cash flow',
    keyFindings: ['FCF up 20%', 'Low debt'],
    risks: ['Valuation concerns'],
    timestamp: new Date(),
    dataPoints: { peRatio: 28, fcfYield: 4.5 }
  },
  {
    agent: 'Technical Analyst',
    ticker: 'AAPL',
    signal: 'bullish',
    confidence: 70,
    rationale: 'Price above key moving averages',
    keyFindings: ['Above 200 DMA', 'RSI at 55'],
    risks: ['Resistance at $180'],
    timestamp: new Date(),
    dataPoints: { rsi: 55, macd: 2.5 }
  },
  {
    agent: 'Sentiment Harvester',
    ticker: 'AAPL',
    signal: 'neutral',
    confidence: 55,
    rationale: 'Mixed sentiment across social media',
    keyFindings: ['Reddit neutral', 'Twitter slightly positive'],
    risks: ['Sentiment can shift quickly'],
    timestamp: new Date(),
    dataPoints: { redditScore: 0.1, twitterScore: 0.3 }
  },
  {
    agent: 'Macro Linker',
    ticker: 'AAPL',
    signal: 'bullish',
    confidence: 65,
    rationale: 'Tech sector benefits from current macro environment',
    keyFindings: ['Low correlation to rates', 'Dollar weakness helps'],
    risks: ['Recession risk'],
    timestamp: new Date(),
    dataPoints: { sectorCorrelation: 0.8, dollarImpact: -0.2 }
  },
  {
    agent: 'Portfolio Manager',
    ticker: 'AAPL',
    signal: 'bullish',
    confidence: 72,
    rationale: 'Consensus bullish with acceptable risk profile',
    keyFindings: ['4/5 agents bullish', 'Risk/reward favorable'],
    risks: ['Position sizing important'],
    timestamp: new Date(),
    dataPoints: { consensusScore: 0.72, riskScore: 0.35 }
  }
];

describe('DevilsAdvocateAgent', () => {
  let devil: DevilsAdvocateAgent;

  beforeEach(() => {
    devil = createDevilsAdvocate();
  });

  it('should create a Devil\'s Advocate agent', () => {
    expect(devil).toBeDefined();
  });

  it('should assess severity based on signals', () => {
    const severity = devil.assessSeverity(sampleSignals);
    expect(['low', 'medium', 'high', 'critical']).toContain(severity);
  });

  it('should detect high severity for unanimous agreement', () => {
    const unanimousSignals = sampleSignals.map(s => ({ ...s, signal: 'bullish' as const }));
    const severity = devil.assessSeverity(unanimousSignals);
    expect(severity).toBe('high');
  });

  it('should generate quick counter-points for bullish signal', () => {
    const counterPoints = devil.generateQuickCounterPoints('bullish', 'Technology');
    expect(counterPoints.length).toBeGreaterThan(0);
    expect(counterPoints.some(p => p.includes('AI') || p.includes('earnings'))).toBe(true);
  });

  it('should challenge consensus and return counter-thesis', async () => {
    const counterThesis = await devil.challenge('AAPL', sampleSignals, 175.00);
    
    expect(counterThesis).toBeDefined();
    expect(counterThesis.ticker).toBe('AAPL');
    expect(counterThesis.originalSignal).toBe('bullish');
    expect(counterThesis.killSwitchPrice).toBeGreaterThan(0);
    expect(counterThesis.counterArguments.length).toBeGreaterThan(0);
  });
});

describe('A2AProtocol', () => {
  let protocol: A2AProtocol;

  beforeEach(() => {
    protocol = createA2AProtocol();
  });

  it('should create an A2A Protocol instance', () => {
    expect(protocol).toBeDefined();
  });

  it('should send and receive messages', () => {
    const message = protocol.sendMessage(
      'Fundamental Analyst',
      'Technical Analyst',
      'signal',
      { ticker: 'AAPL', signal: 'bullish' }
    );

    expect(message).toBeDefined();
    expect(message.fromAgent).toBe('Fundamental Analyst');
    expect(message.toAgent).toBe('Technical Analyst');

    const messages = protocol.getMessagesFor('Technical Analyst');
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should start and manage negotiation sessions', () => {
    const session = protocol.startNegotiation('AAPL', sampleSignals, [
      'Fundamental Analyst',
      'Technical Analyst'
    ]);

    expect(session).toBeDefined();
    expect(session.ticker).toBe('AAPL');
    expect(session.status).toBe('active');
    expect(session.participants.length).toBe(2);
  });

  it('should track audit logs', () => {
    protocol.sendMessage('Agent1', 'Agent2', 'signal', { ticker: 'AAPL' });
    
    const logs = protocol.getAuditLogs('AAPL');
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should process parallel tasks', async () => {
    const tickers = ['AAPL', 'MSFT', 'GOOGL'];
    const processor = async (ticker: string) => ({ ticker, processed: true });

    const results = await protocol.processParallel(tickers, processor, 2);
    
    expect(results.size).toBe(3);
    for (const ticker of tickers) {
      const result = results.get(ticker);
      expect(result).not.toBeInstanceOf(Error);
    }
  });

  it('should record trade outcomes for self-correction', () => {
    const decision = {
      signal: 'bullish' as const,
      confidence: 75,
      consensusType: 'majority' as const,
      supportingAgents: ['Fundamental Analyst', 'Technical Analyst'],
      dissentingAgents: ['Sentiment Harvester'],
      rationale: 'Majority bullish',
      actionItems: []
    };

    protocol.recordTradeOutcome('AAPL', decision, {
      entryPrice: 170,
      exitPrice: 185,
      pnl: 15,
      holdingPeriod: 30,
      exitReason: 'target_hit'
    });

    const performance = protocol.getAgentPerformance();
    expect(performance.size).toBeGreaterThan(0);
  });
});

describe('WeightedVotingSystem', () => {
  let votingSystem: WeightedVotingSystem;

  beforeEach(() => {
    votingSystem = createWeightedVotingSystem();
  });

  it('should create a voting system', () => {
    expect(votingSystem).toBeDefined();
  });

  it('should start a voting session', () => {
    const session = votingSystem.startVotingSession('AAPL');
    
    expect(session).toBeDefined();
    expect(session.ticker).toBe('AAPL');
    expect(session.status).toBe('voting');
  });

  it('should cast votes in a session', () => {
    const session = votingSystem.startVotingSession('AAPL');
    
    const vote = votingSystem.castVote(session.id, sampleSignals[0]);
    
    expect(vote).toBeDefined();
    expect(vote?.agent).toBe('Fundamental Analyst');
    expect(vote?.signal).toBe('bullish');
    expect(vote?.weight).toBeGreaterThan(0);
  });

  it('should finalize voting and calculate result', () => {
    const session = votingSystem.startVotingSession('AAPL');
    
    // Cast all votes
    for (const signal of sampleSignals) {
      votingSystem.castVote(session.id, signal);
    }

    const result = votingSystem.finalizeVoting(session.id);
    
    expect(result).toBeDefined();
    expect(result?.finalSignal).toBe('bullish');
    expect(result?.weightedConfidence).toBeGreaterThan(0);
    expect(result?.participatingAgents).toBe(5);
    expect(result?.recommendation).toBeDefined();
  });

  it('should apply veto when counter-thesis recommends it', () => {
    const session = votingSystem.startVotingSession('AAPL');
    
    for (const signal of sampleSignals) {
      votingSystem.castVote(session.id, signal);
    }

    // Submit a critical counter-thesis with veto
    votingSystem.submitCounterThesis(session.id, {
      ticker: 'AAPL',
      originalSignal: 'bullish',
      counterSignal: 'bearish',
      severity: 'critical',
      vetoRecommended: true,
      killSwitchPrice: 140,
      counterArguments: [{ category: 'fundamental', argument: 'Critical risk', evidence: 'test', impact: 'high' }],
      blindSpots: [],
      macroContradictions: [],
      liquidityWarnings: [],
      historicalPrecedents: [],
      confidenceReduction: 30,
      timestamp: new Date()
    });

    const result = votingSystem.finalizeVoting(session.id);
    
    expect(result?.vetoApplied).toBe(true);
    expect(result?.finalSignal).toBe('neutral');
    expect(result?.recommendation.action).toBe('no_action');
  });

  it('should update agent weights based on outcomes', () => {
    const initialWeight = votingSystem.getAgentWeight('Fundamental Analyst');
    
    votingSystem.updateAgentWeight('Fundamental Analyst', true);
    
    const updatedWeight = votingSystem.getAgentWeight('Fundamental Analyst');
    expect(updatedWeight).toBeGreaterThanOrEqual(initialWeight);
  });

  it('should get all agent weights', () => {
    const weights = votingSystem.getAllWeights();
    
    expect(weights.length).toBeGreaterThan(0);
    expect(weights.some(w => w.agent === 'Fundamental Analyst')).toBe(true);
  });
});

describe('InvestmentThesisGenerator', () => {
  let generator: InvestmentThesisGenerator;

  beforeEach(() => {
    generator = createInvestmentThesisGenerator();
  });

  it('should create a thesis generator', () => {
    expect(generator).toBeDefined();
  });

  it('should generate an investment thesis', async () => {
    const counterThesis = {
      ticker: 'AAPL',
      originalSignal: 'bullish' as const,
      counterSignal: 'bearish' as const,
      severity: 'medium' as const,
      vetoRecommended: false,
      killSwitchPrice: 145,
      counterArguments: [
        { category: 'fundamental' as const, argument: 'Valuation stretched', evidence: 'P/E high', impact: 'medium' as const }
      ],
      blindSpots: ['Regulatory risk'],
      macroContradictions: [],
      liquidityWarnings: [],
      historicalPrecedents: [],
      confidenceReduction: 10,
      timestamp: new Date()
    };

    const votingResult = {
      finalSignal: 'bullish' as const,
      weightedConfidence: 72,
      consensusStrength: 'moderate' as const,
      bullishScore: 65,
      bearishScore: 15,
      neutralScore: 20,
      participatingAgents: 5,
      unanimousDecision: false,
      vetoApplied: false,
      recommendation: {
        action: 'buy' as const,
        positionSizePercent: 3,
        entryStrategy: 'scale_in' as const,
        riskLevel: 'medium' as const,
        timeHorizon: 'medium' as const,
        notes: []
      }
    };

    const thesis = await generator.generateThesis(
      'AAPL',
      'Apple Inc.',
      175.00,
      sampleSignals,
      counterThesis,
      votingResult
    );

    expect(thesis).toBeDefined();
    expect(thesis.ticker).toBe('AAPL');
    expect(thesis.companyName).toBe('Apple Inc.');
    expect(thesis.status).toBe('draft');
    expect(thesis.markdownContent).toContain('Investment Thesis');
    expect(thesis.executiveSummary.targetPrice).toBeGreaterThan(0);
  });

  it('should support approval workflow', async () => {
    const counterThesis = {
      ticker: 'AAPL',
      originalSignal: 'bullish' as const,
      counterSignal: 'bearish' as const,
      severity: 'low' as const,
      vetoRecommended: false,
      killSwitchPrice: 145,
      counterArguments: [],
      blindSpots: [],
      macroContradictions: [],
      liquidityWarnings: [],
      historicalPrecedents: [],
      confidenceReduction: 5,
      timestamp: new Date()
    };

    const votingResult = {
      finalSignal: 'bullish' as const,
      weightedConfidence: 80,
      consensusStrength: 'strong' as const,
      bullishScore: 75,
      bearishScore: 10,
      neutralScore: 15,
      participatingAgents: 5,
      unanimousDecision: false,
      vetoApplied: false,
      recommendation: {
        action: 'strong_buy' as const,
        positionSizePercent: 5,
        entryStrategy: 'market' as const,
        riskLevel: 'medium' as const,
        timeHorizon: 'medium' as const,
        notes: []
      }
    };

    const thesis = await generator.generateThesis(
      'AAPL',
      'Apple Inc.',
      175.00,
      sampleSignals,
      counterThesis,
      votingResult
    );

    // Submit for approval
    const submitted = generator.submitForApproval(thesis.id);
    expect(submitted).toBe(true);

    // Get updated thesis
    const pendingThesis = generator.getThesis(thesis.id);
    expect(pendingThesis?.status).toBe('pending_approval');

    // Approve
    const approved = generator.approve(thesis.id, 'Portfolio Manager', 'Looks good');
    expect(approved).toBe(true);
  });

  it('should reject thesis with reason', async () => {
    const counterThesis = {
      ticker: 'AAPL',
      originalSignal: 'bullish' as const,
      counterSignal: 'bearish' as const,
      severity: 'high' as const,
      vetoRecommended: false,
      killSwitchPrice: 145,
      counterArguments: [{ category: 'fundamental' as const, argument: 'Too risky', evidence: 'test', impact: 'high' as const }],
      blindSpots: [],
      macroContradictions: [],
      liquidityWarnings: [],
      historicalPrecedents: [],
      confidenceReduction: 20,
      timestamp: new Date()
    };

    const votingResult = {
      finalSignal: 'bullish' as const,
      weightedConfidence: 60,
      consensusStrength: 'weak' as const,
      bullishScore: 50,
      bearishScore: 30,
      neutralScore: 20,
      participatingAgents: 5,
      unanimousDecision: false,
      vetoApplied: false,
      recommendation: {
        action: 'hold' as const,
        positionSizePercent: 0,
        entryStrategy: 'wait' as const,
        riskLevel: 'high' as const,
        timeHorizon: 'short' as const,
        notes: []
      }
    };

    const thesis = await generator.generateThesis(
      'AAPL',
      'Apple Inc.',
      175.00,
      sampleSignals,
      counterThesis,
      votingResult
    );

    generator.submitForApproval(thesis.id);
    const rejected = generator.reject(thesis.id, 'Risk Officer', 'Risk too high');
    
    expect(rejected).toBe(true);
    
    const rejectedThesis = generator.getThesis(thesis.id);
    expect(rejectedThesis?.status).toBe('rejected');
  });

  it('should generate proper markdown content', async () => {
    const counterThesis = {
      ticker: 'MSFT',
      originalSignal: 'bullish' as const,
      counterSignal: 'bearish' as const,
      severity: 'medium' as const,
      vetoRecommended: false,
      killSwitchPrice: 380,
      counterArguments: [{ category: 'technical' as const, argument: 'Overbought', evidence: 'RSI > 70', impact: 'medium' as const }],
      blindSpots: ['Cloud competition'],
      macroContradictions: [],
      liquidityWarnings: [],
      historicalPrecedents: [],
      confidenceReduction: 10,
      timestamp: new Date()
    };

    const votingResult = {
      finalSignal: 'bullish' as const,
      weightedConfidence: 75,
      consensusStrength: 'moderate' as const,
      bullishScore: 70,
      bearishScore: 15,
      neutralScore: 15,
      participatingAgents: 5,
      unanimousDecision: false,
      vetoApplied: false,
      recommendation: {
        action: 'buy' as const,
        positionSizePercent: 3,
        entryStrategy: 'scale_in' as const,
        riskLevel: 'medium' as const,
        timeHorizon: 'medium' as const,
        notes: []
      }
    };

    const thesis = await generator.generateThesis(
      'MSFT',
      'Microsoft Corporation',
      420.00,
      sampleSignals.map(s => ({ ...s, ticker: 'MSFT' })),
      counterThesis,
      votingResult
    );

    // Check markdown content
    expect(thesis.markdownContent).toContain('# Investment Thesis: MSFT');
    expect(thesis.markdownContent).toContain('Microsoft Corporation');
    expect(thesis.markdownContent).toContain('Executive Summary');
    expect(thesis.markdownContent).toContain('Risk Assessment');
    expect(thesis.markdownContent).toContain('Action Plan');
    expect(thesis.markdownContent).toContain('Kill Switch Price');
  });
});
