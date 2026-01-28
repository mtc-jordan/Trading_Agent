/**
 * Real-Time Agent Communication Hub
 * 
 * Enables the 7 AI agents to "discuss" trading decisions in real-time,
 * showing users the debate process with arguments for and against each trade.
 * This transparency helps users understand the reasoning behind consensus decisions.
 */

import { invokeLLM } from '../../_core/llm';

// Agent types
export type AgentType = 
  | 'technical'
  | 'fundamental'
  | 'sentiment'
  | 'risk'
  | 'regime'
  | 'execution'
  | 'coordinator';

// Message types in the communication hub
export type MessageType = 
  | 'analysis'
  | 'argument'
  | 'counter_argument'
  | 'vote'
  | 'consensus'
  | 'question'
  | 'clarification';

// Agent message structure
export interface AgentMessage {
  id: string;
  agentType: AgentType;
  agentName: string;
  messageType: MessageType;
  content: string;
  confidence: number;
  timestamp: number;
  replyTo?: string;
  supportingData?: Record<string, unknown>;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

// Discussion thread
export interface DiscussionThread {
  id: string;
  symbol: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity';
  topic: string;
  startedAt: number;
  status: 'active' | 'concluded' | 'paused';
  messages: AgentMessage[];
  consensus?: ConsensusResult;
  participants: AgentType[];
}

// Consensus result
export interface ConsensusResult {
  decision: 'buy' | 'sell' | 'hold';
  confidence: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  reasoning: string;
  keyArguments: {
    forDecision: string[];
    againstDecision: string[];
  };
  timestamp: number;
}

// Agent personality profiles for realistic discussions
const AGENT_PROFILES: Record<AgentType, {
  name: string;
  personality: string;
  expertise: string[];
  biases: string[];
}> = {
  technical: {
    name: 'TechAnalyst',
    personality: 'Data-driven, pattern-focused, relies heavily on charts and indicators',
    expertise: ['Chart patterns', 'Technical indicators', 'Price action', 'Volume analysis'],
    biases: ['May ignore fundamental factors', 'Can be late to trend changes']
  },
  fundamental: {
    name: 'FundaBot',
    personality: 'Value-oriented, focuses on company financials and intrinsic value',
    expertise: ['Financial statements', 'Valuation metrics', 'Industry analysis', 'Competitive positioning'],
    biases: ['May underweight market sentiment', 'Can be slow to react to price movements']
  },
  sentiment: {
    name: 'SentiMind',
    personality: 'Emotionally aware, tracks market psychology and social trends',
    expertise: ['Social media analysis', 'News sentiment', 'Fear/greed indicators', 'Crowd behavior'],
    biases: ['Can be swayed by noise', 'May overreact to short-term sentiment shifts']
  },
  risk: {
    name: 'RiskGuard',
    personality: 'Cautious, protective, focuses on downside scenarios',
    expertise: ['Risk metrics', 'Portfolio correlation', 'Drawdown analysis', 'Position sizing'],
    biases: ['May be overly conservative', 'Can miss opportunities due to risk aversion']
  },
  regime: {
    name: 'RegimeDetector',
    personality: 'Big-picture thinker, identifies market phases and macro trends',
    expertise: ['Market cycles', 'Economic indicators', 'Sector rotation', 'Volatility regimes'],
    biases: ['May miss micro-level opportunities', 'Can be slow to detect regime changes']
  },
  execution: {
    name: 'ExecBot',
    personality: 'Practical, timing-focused, optimizes entry and exit points',
    expertise: ['Order flow', 'Liquidity analysis', 'Slippage minimization', 'Timing optimization'],
    biases: ['May overthink execution', 'Can delay decisions seeking perfect entry']
  },
  coordinator: {
    name: 'Consensus',
    personality: 'Balanced, synthesizes all viewpoints, seeks agreement',
    expertise: ['Multi-factor analysis', 'Conflict resolution', 'Weight optimization', 'Final decision making'],
    biases: ['May compromise too much', 'Can be slow in volatile markets']
  }
};

// Active discussions storage
const activeDiscussions = new Map<string, DiscussionThread>();

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new discussion thread for a trading decision
 */
export async function startDiscussion(
  symbol: string,
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity',
  topic: string,
  marketData?: Record<string, unknown>
): Promise<DiscussionThread> {
  const thread: DiscussionThread = {
    id: generateId(),
    symbol,
    assetType,
    topic,
    startedAt: Date.now(),
    status: 'active',
    messages: [],
    participants: ['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution', 'coordinator']
  };

  // Generate initial analysis from each agent
  const initialAnalyses = await generateInitialAnalyses(symbol, assetType, topic, marketData);
  thread.messages.push(...initialAnalyses);

  activeDiscussions.set(thread.id, thread);
  return thread;
}

/**
 * Generate initial analysis messages from all agents
 */
async function generateInitialAnalyses(
  symbol: string,
  assetType: string,
  topic: string,
  marketData?: Record<string, unknown>
): Promise<AgentMessage[]> {
  const messages: AgentMessage[] = [];
  const agents: AgentType[] = ['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution'];

  for (const agentType of agents) {
    const profile = AGENT_PROFILES[agentType];
    const analysis = await generateAgentAnalysis(agentType, symbol, assetType, topic, marketData);
    
    messages.push({
      id: generateId(),
      agentType,
      agentName: profile.name,
      messageType: 'analysis',
      content: analysis.content,
      confidence: analysis.confidence,
      timestamp: Date.now(),
      supportingData: analysis.supportingData,
      sentiment: analysis.sentiment
    });
  }

  return messages;
}

/**
 * Generate analysis from a specific agent using LLM
 */
async function generateAgentAnalysis(
  agentType: AgentType,
  symbol: string,
  assetType: string,
  topic: string,
  marketData?: Record<string, unknown>
): Promise<{
  content: string;
  confidence: number;
  supportingData: Record<string, unknown>;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}> {
  const profile = AGENT_PROFILES[agentType];
  
  const systemPrompt = `You are ${profile.name}, an AI trading agent with the following characteristics:
- Personality: ${profile.personality}
- Expertise: ${profile.expertise.join(', ')}
- Known biases: ${profile.biases.join(', ')}

Provide your analysis on the trading topic. Be specific, data-driven, and true to your personality.
Your response must be a JSON object with:
- content: Your analysis (2-3 sentences)
- confidence: A number 0-100 representing your confidence
- sentiment: "bullish", "bearish", or "neutral"
- keyPoints: Array of 2-3 key supporting points`;

  const userPrompt = `Analyze ${symbol} (${assetType}) regarding: ${topic}
${marketData ? `\nMarket Data: ${JSON.stringify(marketData)}` : ''}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'agent_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              confidence: { type: 'number' },
              sentiment: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
              keyPoints: { type: 'array', items: { type: 'string' } }
            },
            required: ['content', 'confidence', 'sentiment', 'keyPoints'],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const result = JSON.parse(typeof messageContent === 'string' ? messageContent : '{}');
    return {
      content: result.content || `${profile.name} is analyzing ${symbol}...`,
      confidence: Math.min(100, Math.max(0, result.confidence || 50)),
      supportingData: { keyPoints: result.keyPoints || [] },
      sentiment: result.sentiment || 'neutral'
    };
  } catch (error) {
    // Fallback response if LLM fails
    return generateFallbackAnalysis(agentType, symbol);
  }
}

/**
 * Generate fallback analysis without LLM
 */
function generateFallbackAnalysis(
  agentType: AgentType,
  symbol: string
): {
  content: string;
  confidence: number;
  supportingData: Record<string, unknown>;
  sentiment: 'bullish' | 'bearish' | 'neutral';
} {
  const fallbacks: Record<AgentType, () => {
    content: string;
    confidence: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
  }> = {
    technical: () => ({
      content: `Technical analysis for ${symbol} shows mixed signals. RSI is neutral, MACD showing potential crossover. Waiting for confirmation.`,
      confidence: 55,
      sentiment: 'neutral'
    }),
    fundamental: () => ({
      content: `Fundamental analysis indicates ${symbol} is trading near fair value. P/E ratio is in line with sector average.`,
      confidence: 60,
      sentiment: 'neutral'
    }),
    sentiment: () => ({
      content: `Market sentiment for ${symbol} is cautiously optimistic. Social media mentions are stable with slight positive bias.`,
      confidence: 50,
      sentiment: 'bullish'
    }),
    risk: () => ({
      content: `Risk assessment for ${symbol}: Moderate volatility expected. Current position sizing should account for potential 5-8% drawdown.`,
      confidence: 65,
      sentiment: 'neutral'
    }),
    regime: () => ({
      content: `Current market regime appears to be in consolidation phase. ${symbol} likely to follow broader market trends.`,
      confidence: 55,
      sentiment: 'neutral'
    }),
    execution: () => ({
      content: `Execution analysis: Liquidity for ${symbol} is adequate. Recommend limit orders with 0.5% buffer from current price.`,
      confidence: 70,
      sentiment: 'neutral'
    }),
    coordinator: () => ({
      content: `Synthesizing all agent inputs for ${symbol}. Consensus building in progress.`,
      confidence: 50,
      sentiment: 'neutral'
    })
  };

  const fallback = fallbacks[agentType]();
  return {
    ...fallback,
    supportingData: { source: 'fallback' }
  };
}

/**
 * Add an argument to the discussion
 */
export async function addArgument(
  threadId: string,
  agentType: AgentType,
  position: 'for' | 'against',
  targetMessageId?: string
): Promise<AgentMessage | null> {
  const thread = activeDiscussions.get(threadId);
  if (!thread || thread.status !== 'active') return null;

  const profile = AGENT_PROFILES[agentType];
  const messageType: MessageType = position === 'for' ? 'argument' : 'counter_argument';

  // Get context from previous messages
  const context = thread.messages.slice(-5).map(m => `${m.agentName}: ${m.content}`).join('\n');

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are ${profile.name}. Provide a ${position === 'for' ? 'supporting' : 'counter'} argument based on your expertise. Be concise (1-2 sentences).`
        },
        {
          role: 'user',
          content: `Discussion context:\n${context}\n\nProvide your ${position} argument for ${thread.symbol}.`
        }
      ]
    });

    const responseContent = response.choices[0].message.content;
    const content = (typeof responseContent === 'string' ? responseContent : '') || `${profile.name} ${position === 'for' ? 'supports' : 'opposes'} this position.`;

    const message: AgentMessage = {
      id: generateId(),
      agentType,
      agentName: profile.name,
      messageType,
      content,
      confidence: Math.floor(Math.random() * 30) + 50,
      timestamp: Date.now(),
      replyTo: targetMessageId,
      sentiment: position === 'for' ? 'bullish' : 'bearish'
    };

    thread.messages.push(message);
    return message;
  } catch (error) {
    return null;
  }
}

/**
 * Generate debate between agents
 */
export async function generateDebate(
  threadId: string,
  rounds: number = 2
): Promise<AgentMessage[]> {
  const thread = activeDiscussions.get(threadId);
  if (!thread || thread.status !== 'active') return [];

  const newMessages: AgentMessage[] = [];
  const debatingAgents: AgentType[] = ['technical', 'fundamental', 'sentiment', 'risk'];

  for (let round = 0; round < rounds; round++) {
    for (const agent of debatingAgents) {
      // Alternate between for and against arguments
      const position = round % 2 === 0 ? 'for' : 'against';
      const message = await addArgument(threadId, agent, position);
      if (message) {
        newMessages.push(message);
      }
    }
  }

  return newMessages;
}

/**
 * Conduct voting and reach consensus
 */
export async function conductVoting(threadId: string): Promise<ConsensusResult | null> {
  const thread = activeDiscussions.get(threadId);
  if (!thread || thread.status !== 'active') return null;

  const votes: { agent: AgentType; vote: 'buy' | 'sell' | 'hold'; confidence: number }[] = [];
  const votingAgents: AgentType[] = ['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution'];

  // Collect votes from each agent
  for (const agentType of votingAgents) {
    const agentMessages = thread.messages.filter(m => m.agentType === agentType);
    const lastMessage = agentMessages[agentMessages.length - 1];
    
    let vote: 'buy' | 'sell' | 'hold' = 'hold';
    if (lastMessage) {
      if (lastMessage.sentiment === 'bullish' && lastMessage.confidence > 60) {
        vote = 'buy';
      } else if (lastMessage.sentiment === 'bearish' && lastMessage.confidence > 60) {
        vote = 'sell';
      }
    }

    votes.push({
      agent: agentType,
      vote,
      confidence: lastMessage?.confidence || 50
    });

    // Add vote message to thread
    const profile = AGENT_PROFILES[agentType];
    thread.messages.push({
      id: generateId(),
      agentType,
      agentName: profile.name,
      messageType: 'vote',
      content: `I vote to ${vote.toUpperCase()} with ${lastMessage?.confidence || 50}% confidence.`,
      confidence: lastMessage?.confidence || 50,
      timestamp: Date.now(),
      sentiment: vote === 'buy' ? 'bullish' : vote === 'sell' ? 'bearish' : 'neutral'
    });
  }

  // Calculate consensus
  const buyVotes = votes.filter(v => v.vote === 'buy').length;
  const sellVotes = votes.filter(v => v.vote === 'sell').length;
  const holdVotes = votes.filter(v => v.vote === 'hold').length;

  let decision: 'buy' | 'sell' | 'hold';
  let votesFor: number;
  let votesAgainst: number;

  if (buyVotes > sellVotes && buyVotes > holdVotes) {
    decision = 'buy';
    votesFor = buyVotes;
    votesAgainst = sellVotes;
  } else if (sellVotes > buyVotes && sellVotes > holdVotes) {
    decision = 'sell';
    votesFor = sellVotes;
    votesAgainst = buyVotes;
  } else {
    decision = 'hold';
    votesFor = holdVotes;
    votesAgainst = Math.max(buyVotes, sellVotes);
  }

  // Calculate weighted confidence
  const relevantVotes = votes.filter(v => v.vote === decision);
  const avgConfidence = relevantVotes.length > 0
    ? relevantVotes.reduce((sum, v) => sum + v.confidence, 0) / relevantVotes.length
    : 50;

  // Gather key arguments
  const bullishMessages = thread.messages.filter(m => m.sentiment === 'bullish');
  const bearishMessages = thread.messages.filter(m => m.sentiment === 'bearish');

  const consensus: ConsensusResult = {
    decision,
    confidence: Math.round(avgConfidence),
    votesFor,
    votesAgainst,
    abstentions: holdVotes,
    reasoning: `Based on ${votesFor} votes for ${decision.toUpperCase()} vs ${votesAgainst} against, with ${avgConfidence.toFixed(0)}% average confidence.`,
    keyArguments: {
      forDecision: bullishMessages.slice(0, 3).map(m => m.content),
      againstDecision: bearishMessages.slice(0, 3).map(m => m.content)
    },
    timestamp: Date.now()
  };

  // Add consensus message from coordinator
  thread.messages.push({
    id: generateId(),
    agentType: 'coordinator',
    agentName: AGENT_PROFILES.coordinator.name,
    messageType: 'consensus',
    content: `CONSENSUS REACHED: ${decision.toUpperCase()} ${thread.symbol} with ${consensus.confidence}% confidence. ${consensus.reasoning}`,
    confidence: consensus.confidence,
    timestamp: Date.now(),
    sentiment: decision === 'buy' ? 'bullish' : decision === 'sell' ? 'bearish' : 'neutral'
  });

  thread.consensus = consensus;
  thread.status = 'concluded';

  return consensus;
}

/**
 * Get discussion thread by ID
 */
export function getDiscussion(threadId: string): DiscussionThread | null {
  return activeDiscussions.get(threadId) || null;
}

/**
 * Get all active discussions
 */
export function getActiveDiscussions(): DiscussionThread[] {
  return Array.from(activeDiscussions.values()).filter(d => d.status === 'active');
}

/**
 * Get discussion history for a symbol
 */
export function getDiscussionHistory(symbol: string, limit: number = 10): DiscussionThread[] {
  return Array.from(activeDiscussions.values())
    .filter(d => d.symbol === symbol)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

/**
 * Run a complete discussion cycle
 */
export async function runFullDiscussion(
  symbol: string,
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity',
  topic: string,
  marketData?: Record<string, unknown>
): Promise<{
  thread: DiscussionThread;
  consensus: ConsensusResult | null;
}> {
  // Start discussion with initial analyses
  const thread = await startDiscussion(symbol, assetType, topic, marketData);

  // Generate debate rounds
  await generateDebate(thread.id, 2);

  // Conduct voting and reach consensus
  const consensus = await conductVoting(thread.id);

  return { thread, consensus };
}

/**
 * Get agent profile information
 */
export function getAgentProfile(agentType: AgentType): typeof AGENT_PROFILES[AgentType] {
  return AGENT_PROFILES[agentType];
}

/**
 * Get all agent profiles
 */
export function getAllAgentProfiles(): typeof AGENT_PROFILES {
  return AGENT_PROFILES;
}

/**
 * Subscribe to discussion updates (for real-time streaming)
 */
export function subscribeToDiscussion(
  threadId: string,
  callback: (message: AgentMessage) => void
): () => void {
  // In a real implementation, this would use WebSockets or Server-Sent Events
  // For now, we return a no-op unsubscribe function
  return () => {};
}

/**
 * Clear old discussions (cleanup)
 */
export function clearOldDiscussions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let cleared = 0;

  const entries = Array.from(activeDiscussions.entries());
  for (const [id, thread] of entries) {
    if (thread.startedAt < cutoff) {
      activeDiscussions.delete(id);
      cleared++;
    }
  }

  return cleared;
}
