/**
 * Devil's Advocate Agent - 2026 Adversarial Skepticism System
 * 
 * The Devil's Advocate is a CRITICAL agent that prevents groupthink and
 * identifies blind spots in the investment committee's analysis.
 * 
 * Key Responsibilities:
 * - Challenge bullish consensus with bearish counter-arguments
 * - Identify hidden risks that other agents may have missed
 * - Question assumptions about revenue, debt, and growth
 * - Check macro correlations (Gold/Dollar) for contradictions
 * - Warn about liquidity issues and market structure risks
 * - Provide "Kill Switch" price levels where thesis is invalidated
 */

import { invokeLLM } from '../../_core/llm';
import type { AgentSignal } from './StockIntelligenceAgents';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CounterThesis {
  ticker: string;
  originalSignal: 'bullish' | 'bearish' | 'neutral';
  counterSignal: 'bullish' | 'bearish' | 'neutral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vetoRecommended: boolean;
  killSwitchPrice: number;
  counterArguments: CounterArgument[];
  blindSpots: string[];
  macroContradictions: string[];
  liquidityWarnings: string[];
  historicalPrecedents: HistoricalPrecedent[];
  confidenceReduction: number; // How much to reduce original confidence
  timestamp: Date;
}

export interface CounterArgument {
  category: 'fundamental' | 'technical' | 'sentiment' | 'macro' | 'structural';
  argument: string;
  evidence: string;
  impact: 'low' | 'medium' | 'high';
}

export interface HistoricalPrecedent {
  event: string;
  date: string;
  outcome: string;
  relevance: string;
}

export interface DevilsAdvocateConfig {
  skepticismLevel: 'mild' | 'moderate' | 'aggressive';
  focusAreas: ('fundamentals' | 'technicals' | 'sentiment' | 'macro' | 'liquidity')[];
  vetoThreshold: number; // Severity score above which to recommend veto
  maxConfidenceReduction: number; // Maximum confidence reduction (0-50)
}

// ============================================================================
// Devil's Advocate Agent
// ============================================================================

export class DevilsAdvocateAgent {
  private name = "Devil's Advocate";
  private config: DevilsAdvocateConfig;
  private systemPrompt: string;

  constructor(config?: Partial<DevilsAdvocateConfig>) {
    this.config = {
      skepticismLevel: config?.skepticismLevel || 'moderate',
      focusAreas: config?.focusAreas || ['fundamentals', 'technicals', 'sentiment', 'macro', 'liquidity'],
      vetoThreshold: config?.vetoThreshold || 80,
      maxConfidenceReduction: config?.maxConfidenceReduction || 40
    };

    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    const skepticismInstructions = {
      mild: 'Be constructively skeptical. Raise concerns but acknowledge strengths.',
      moderate: 'Be firmly skeptical. Challenge assumptions and demand evidence.',
      aggressive: 'Be relentlessly skeptical. Assume the worst case and prove otherwise.'
    };

    return `You are the Devil's Advocate - a CRITICAL agent designed to prevent groupthink in investment decisions.

YOUR ROLE:
You MUST challenge the consensus and find reasons why the trade could fail.
You are NOT trying to be right - you are trying to prevent catastrophic mistakes.

SKEPTICISM LEVEL: ${this.config.skepticismLevel.toUpperCase()}
${skepticismInstructions[this.config.skepticismLevel]}

YOUR RESPONSIBILITIES:

1. CHALLENGE BULLISH CONSENSUS:
   - If agents are bullish, find bearish counter-arguments
   - Question revenue sustainability and growth assumptions
   - Identify debt covenant risks and refinancing needs
   - Look for accounting red flags (revenue recognition, one-time items)

2. IDENTIFY BLIND SPOTS:
   - What are the agents NOT considering?
   - Are there regulatory risks on the horizon?
   - Is there concentration risk (single customer, single product)?
   - What about competitive threats?

3. CHECK MACRO CONTRADICTIONS:
   - If bullish on growth stock but yields rising - contradiction!
   - If bullish on exporter but dollar strengthening - contradiction!
   - If bullish on discretionary but consumer confidence falling - contradiction!

4. LIQUIDITY WARNINGS:
   - Is the stock thinly traded?
   - Are there large block holders who might sell?
   - Is there options market maker hedging risk?
   - What's the short interest and borrow cost?

5. HISTORICAL PRECEDENTS:
   - Find similar situations that ended badly
   - Reference market crashes, sector rotations, company failures
   - "This time is different" is usually wrong

6. KILL SWITCH PRICE:
   - Determine the price level where the thesis is INVALIDATED
   - This is NOT a stop loss - it's where the fundamental case breaks

OUTPUT FORMAT (JSON):
{
  "counterSignal": "bullish" | "bearish" | "neutral",
  "severity": "low" | "medium" | "high" | "critical",
  "vetoRecommended": boolean,
  "killSwitchPrice": number,
  "counterArguments": [
    {
      "category": "fundamental" | "technical" | "sentiment" | "macro" | "structural",
      "argument": "string",
      "evidence": "string",
      "impact": "low" | "medium" | "high"
    }
  ],
  "blindSpots": ["string"],
  "macroContradictions": ["string"],
  "liquidityWarnings": ["string"],
  "historicalPrecedents": [
    {
      "event": "string",
      "date": "string",
      "outcome": "string",
      "relevance": "string"
    }
  ],
  "confidenceReduction": number
}`;
  }

  async challenge(
    ticker: string,
    agentSignals: AgentSignal[],
    currentPrice: number,
    additionalContext?: {
      shortInterest?: number;
      avgVolume?: number;
      marketCap?: number;
      sector?: string;
      recentNews?: string[];
    }
  ): Promise<CounterThesis> {
    // Determine the consensus signal
    const consensus = this.determineConsensus(agentSignals);
    
    // Build the challenge prompt
    const prompt = this.buildChallengePrompt(ticker, agentSignals, consensus, currentPrice, additionalContext);
    
    // Get the counter-thesis from LLM
    const response = await this.callLLM(prompt);
    
    // Parse and return the counter-thesis
    return this.parseCounterThesis(response, ticker, consensus.signal, currentPrice);
  }

  private determineConsensus(signals: AgentSignal[]): {
    signal: 'bullish' | 'bearish' | 'neutral';
    avgConfidence: number;
    bullishCount: number;
    bearishCount: number;
  } {
    let bullish = 0;
    let bearish = 0;
    let totalConfidence = 0;

    for (const signal of signals) {
      totalConfidence += signal.confidence;
      if (signal.signal === 'bullish') bullish++;
      else if (signal.signal === 'bearish') bearish++;
    }

    const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;
    
    let consensusSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullish > bearish) consensusSignal = 'bullish';
    else if (bearish > bullish) consensusSignal = 'bearish';

    return {
      signal: consensusSignal,
      avgConfidence,
      bullishCount: bullish,
      bearishCount: bearish
    };
  }

  private buildChallengePrompt(
    ticker: string,
    signals: AgentSignal[],
    consensus: { signal: 'bullish' | 'bearish' | 'neutral'; avgConfidence: number; bullishCount: number; bearishCount: number },
    currentPrice: number,
    context?: {
      shortInterest?: number;
      avgVolume?: number;
      marketCap?: number;
      sector?: string;
      recentNews?: string[];
    }
  ): string {
    return `CHALLENGE THE INVESTMENT COMMITTEE'S DECISION ON ${ticker}

CURRENT PRICE: $${currentPrice.toFixed(2)}

CONSENSUS:
- Signal: ${consensus.signal.toUpperCase()}
- Average Confidence: ${consensus.avgConfidence.toFixed(0)}%
- Bullish Agents: ${consensus.bullishCount}
- Bearish Agents: ${consensus.bearishCount}

AGENT REPORTS:
${signals.map(s => `
[${s.agent}]
Signal: ${s.signal.toUpperCase()} (${s.confidence}% confidence)
Rationale: ${s.rationale}
Key Findings: ${s.keyFindings?.join(', ') || 'None'}
Risks Identified: ${s.risks?.join(', ') || 'None'}
`).join('\n')}

${context ? `
ADDITIONAL CONTEXT:
- Short Interest: ${context.shortInterest ? `${(context.shortInterest * 100).toFixed(1)}%` : 'Unknown'}
- Average Volume: ${context.avgVolume?.toLocaleString() || 'Unknown'}
- Market Cap: ${context.marketCap ? `$${(context.marketCap / 1e9).toFixed(1)}B` : 'Unknown'}
- Sector: ${context.sector || 'Unknown'}
${context.recentNews?.length ? `- Recent News: ${context.recentNews.slice(0, 3).join('; ')}` : ''}
` : ''}

YOUR TASK:
As the Devil's Advocate, challenge this ${consensus.signal} consensus.
${consensus.signal === 'bullish' ? 'Find reasons why this trade could FAIL.' : ''}
${consensus.signal === 'bearish' ? 'Find reasons why shorting could be DANGEROUS.' : ''}
${consensus.signal === 'neutral' ? 'Identify what the agents are MISSING - is there a clear direction?' : ''}

Consider:
1. What assumptions are the agents making that could be wrong?
2. What risks are they NOT considering?
3. Are there macro contradictions?
4. What's the liquidity situation?
5. What historical precedents suggest caution?
6. At what price is the thesis INVALIDATED?

Provide your counter-thesis in JSON format.`;
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ]
      });
      
      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch (error) {
      console.error(`[${this.name}] LLM call failed:`, error);
      throw error;
    }
  }

  private parseCounterThesis(
    response: string,
    ticker: string,
    originalSignal: 'bullish' | 'bearish' | 'neutral',
    currentPrice: number
  ): CounterThesis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          ticker,
          originalSignal,
          counterSignal: parsed.counterSignal || this.getOppositeSignal(originalSignal),
          severity: parsed.severity || 'medium',
          vetoRecommended: parsed.vetoRecommended || false,
          killSwitchPrice: parsed.killSwitchPrice || this.calculateDefaultKillSwitch(currentPrice, originalSignal),
          counterArguments: parsed.counterArguments || [],
          blindSpots: parsed.blindSpots || [],
          macroContradictions: parsed.macroContradictions || [],
          liquidityWarnings: parsed.liquidityWarnings || [],
          historicalPrecedents: parsed.historicalPrecedents || [],
          confidenceReduction: Math.min(parsed.confidenceReduction || 10, this.config.maxConfidenceReduction),
          timestamp: new Date()
        };
      }
    } catch (e) {
      console.error('[DevilsAdvocate] Failed to parse response:', e);
    }

    // Return default counter-thesis if parsing fails
    return {
      ticker,
      originalSignal,
      counterSignal: this.getOppositeSignal(originalSignal),
      severity: 'medium',
      vetoRecommended: false,
      killSwitchPrice: this.calculateDefaultKillSwitch(currentPrice, originalSignal),
      counterArguments: [{
        category: 'structural',
        argument: 'Unable to generate detailed counter-thesis',
        evidence: 'LLM response parsing failed',
        impact: 'medium'
      }],
      blindSpots: ['Analysis may be incomplete'],
      macroContradictions: [],
      liquidityWarnings: [],
      historicalPrecedents: [],
      confidenceReduction: 10,
      timestamp: new Date()
    };
  }

  private getOppositeSignal(signal: 'bullish' | 'bearish' | 'neutral'): 'bullish' | 'bearish' | 'neutral' {
    if (signal === 'bullish') return 'bearish';
    if (signal === 'bearish') return 'bullish';
    return 'neutral';
  }

  private calculateDefaultKillSwitch(currentPrice: number, signal: 'bullish' | 'bearish' | 'neutral'): number {
    // For bullish signals, kill switch is below current price
    // For bearish signals, kill switch is above current price
    if (signal === 'bullish') {
      return currentPrice * 0.85; // 15% below
    } else if (signal === 'bearish') {
      return currentPrice * 1.15; // 15% above
    }
    return currentPrice * 0.90; // 10% below for neutral
  }

  /**
   * Quick severity assessment without full LLM call
   */
  assessSeverity(signals: AgentSignal[]): 'low' | 'medium' | 'high' | 'critical' {
    const consensus = this.determineConsensus(signals);
    
    // Check for unanimous agreement (potential groupthink)
    if (consensus.bullishCount === signals.length || consensus.bearishCount === signals.length) {
      return 'high'; // Unanimous agreement is suspicious
    }
    
    // Check for very high confidence (overconfidence)
    if (consensus.avgConfidence > 85) {
      return 'high';
    }
    
    // Check for split decision
    if (Math.abs(consensus.bullishCount - consensus.bearishCount) <= 1) {
      return 'medium'; // Close call, needs scrutiny
    }
    
    // Check for low confidence
    if (consensus.avgConfidence < 50) {
      return 'medium'; // Low confidence signals uncertainty
    }
    
    return 'low';
  }

  /**
   * Generate quick counter-points without full analysis
   */
  generateQuickCounterPoints(signal: 'bullish' | 'bearish' | 'neutral', sector?: string): string[] {
    const counterPoints: string[] = [];

    if (signal === 'bullish') {
      counterPoints.push('What if earnings disappoint next quarter?');
      counterPoints.push('Is the valuation sustainable at current multiples?');
      counterPoints.push('What happens if the Fed raises rates further?');
      counterPoints.push('Are insiders selling?');
      
      if (sector === 'Technology') {
        counterPoints.push('Is AI hype creating a bubble?');
        counterPoints.push('What about antitrust risks?');
      } else if (sector === 'Financials') {
        counterPoints.push('What about credit risk in a recession?');
        counterPoints.push('Is the yield curve inversion a warning?');
      }
    } else if (signal === 'bearish') {
      counterPoints.push('What if short squeeze occurs?');
      counterPoints.push('Is bad news already priced in?');
      counterPoints.push('What if management announces buybacks?');
      counterPoints.push('Are value investors accumulating?');
    }

    return counterPoints;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDevilsAdvocate(config?: Partial<DevilsAdvocateConfig>): DevilsAdvocateAgent {
  return new DevilsAdvocateAgent(config);
}

export function createAggressiveDevil(): DevilsAdvocateAgent {
  return new DevilsAdvocateAgent({
    skepticismLevel: 'aggressive',
    vetoThreshold: 70,
    maxConfidenceReduction: 50
  });
}

export function createMildDevil(): DevilsAdvocateAgent {
  return new DevilsAdvocateAgent({
    skepticismLevel: 'mild',
    vetoThreshold: 90,
    maxConfidenceReduction: 25
  });
}
