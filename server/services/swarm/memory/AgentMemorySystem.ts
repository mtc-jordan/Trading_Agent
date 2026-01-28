/**
 * Agent Memory System
 * 
 * Stores and retrieves agent memories to prevent repeating mistakes.
 * Implements:
 * - Vector database abstraction (Pinecone/Milvus style)
 * - Semantic search for similar past trades
 * - Trade outcome tracking
 * - Pattern recognition from historical decisions
 * - Learning from mistakes
 */

export interface TradeMemory {
  id: string;
  timestamp: number;
  asset: string;
  assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex';
  action: 'buy' | 'sell' | 'hold' | 'avoid';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  outcome: 'profit' | 'loss' | 'breakeven' | 'pending';
  pnlPercent?: number;
  pnlAbsolute?: number;
  
  // Context at time of trade
  context: {
    marketRegime: 'risk-on' | 'risk-off' | 'transition';
    volatility: number;
    sentiment: number;
    technicalSignal: string;
    macroConditions: string;
    agentConsensus: number;
  };
  
  // Agent analysis
  agentAnalysis: {
    agentId: string;
    recommendation: string;
    confidence: number;
    reasoning: string[];
    risks: string[];
  }[];
  
  // Post-trade analysis
  postMortem?: {
    whatWorked: string[];
    whatFailed: string[];
    lessonsLearned: string[];
    shouldRepeat: boolean;
  };
  
  // Vector embedding for similarity search
  embedding?: number[];
  
  // Tags for filtering
  tags: string[];
}

export interface SimilarTradeResult {
  memory: TradeMemory;
  similarity: number;
  relevantLessons: string[];
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalTrades: number;
  winRate: number;
  avgPnLPercent: number;
  avgConfidence: number;
  bestMarketRegime: string;
  worstMarketRegime: string;
  recentAccuracy: number; // Last 20 trades
}

export interface PatternMatch {
  pattern: string;
  occurrences: number;
  avgOutcome: number;
  confidence: number;
  examples: TradeMemory[];
}

export class AgentMemorySystem {
  private memories: Map<string, TradeMemory>;
  private embeddings: Map<string, number[]>;
  private agentPerformance: Map<string, AgentPerformance>;
  private patterns: Map<string, PatternMatch>;

  constructor() {
    this.memories = new Map();
    this.embeddings = new Map();
    this.agentPerformance = new Map();
    this.patterns = new Map();
  }

  /**
   * Store a new trade memory
   */
  async storeMemory(memory: Omit<TradeMemory, 'id' | 'embedding'>): Promise<TradeMemory> {
    const id = `mem_${Date.now()}_${memory.asset}`;
    
    // Generate embedding for similarity search
    const embedding = await this.generateEmbedding(memory);
    
    const fullMemory: TradeMemory = {
      ...memory,
      id,
      embedding,
    };

    this.memories.set(id, fullMemory);
    this.embeddings.set(id, embedding);

    // Update agent performance
    this.updateAgentPerformance(fullMemory);

    // Detect patterns
    this.detectPatterns(fullMemory);

    return fullMemory;
  }

  /**
   * Generate embedding vector for a trade memory
   * In production, this would use a real embedding model
   */
  private async generateEmbedding(memory: Omit<TradeMemory, 'id' | 'embedding'>): Promise<number[]> {
    // Simulated embedding generation
    // In production, use OpenAI embeddings or similar
    const features: number[] = [];

    // Asset class encoding
    const assetClassMap = { crypto: 0, stocks: 1, commodities: 2, forex: 3 };
    features.push(assetClassMap[memory.assetClass] / 3);

    // Action encoding
    const actionMap = { buy: 1, sell: -1, hold: 0, avoid: -0.5 };
    features.push(actionMap[memory.action]);

    // Context features
    const regimeMap = { 'risk-on': 1, 'risk-off': -1, transition: 0 };
    features.push(regimeMap[memory.context.marketRegime]);
    features.push(memory.context.volatility / 100);
    features.push(memory.context.sentiment / 100);
    features.push(memory.context.agentConsensus / 100);

    // Outcome encoding
    const outcomeMap = { profit: 1, loss: -1, breakeven: 0, pending: 0.5 };
    features.push(outcomeMap[memory.outcome]);

    // PnL if available
    features.push((memory.pnlPercent || 0) / 100);

    // Pad to fixed length
    while (features.length < 128) {
      features.push(Math.random() * 0.1 - 0.05); // Small random noise
    }

    return features.slice(0, 128);
  }

  /**
   * Find similar past trades
   */
  async findSimilarTrades(
    currentContext: {
      asset: string;
      assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex';
      marketRegime: 'risk-on' | 'risk-off' | 'transition';
      volatility: number;
      sentiment: number;
    },
    limit: number = 5
  ): Promise<SimilarTradeResult[]> {
    // Generate query embedding
    const queryMemory: Omit<TradeMemory, 'id' | 'embedding'> = {
      timestamp: Date.now(),
      asset: currentContext.asset,
      assetClass: currentContext.assetClass,
      action: 'hold',
      entryPrice: 0,
      size: 0,
      outcome: 'pending',
      context: {
        marketRegime: currentContext.marketRegime,
        volatility: currentContext.volatility,
        sentiment: currentContext.sentiment,
        technicalSignal: '',
        macroConditions: '',
        agentConsensus: 50,
      },
      agentAnalysis: [],
      tags: [],
    };

    const queryEmbedding = await this.generateEmbedding(queryMemory);

    // Calculate similarities
    const similarities: { memory: TradeMemory; similarity: number }[] = [];

    for (const [id, embedding] of Array.from(this.embeddings.entries())) {
      const memory = this.memories.get(id);
      if (!memory) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      similarities.push({ memory, similarity });
    }

    // Sort by similarity and take top results
    const topResults = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Extract relevant lessons
    return topResults.map(result => ({
      memory: result.memory,
      similarity: result.similarity,
      relevantLessons: this.extractRelevantLessons(result.memory),
    }));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Extract relevant lessons from a memory
   */
  private extractRelevantLessons(memory: TradeMemory): string[] {
    const lessons: string[] = [];

    if (memory.postMortem) {
      lessons.push(...memory.postMortem.lessonsLearned);
      
      if (memory.outcome === 'loss') {
        lessons.push(...memory.postMortem.whatFailed.map(f => `Avoid: ${f}`));
      } else if (memory.outcome === 'profit') {
        lessons.push(...memory.postMortem.whatWorked.map(w => `Repeat: ${w}`));
      }
    }

    // Add context-based lessons
    if (memory.outcome === 'loss' && memory.context.volatility > 50) {
      lessons.push('High volatility contributed to loss - consider smaller position sizes');
    }

    if (memory.outcome === 'profit' && memory.context.agentConsensus > 80) {
      lessons.push('Strong agent consensus correlated with profitable outcome');
    }

    return lessons;
  }

  /**
   * Update agent performance metrics
   */
  private updateAgentPerformance(memory: TradeMemory): void {
    for (const analysis of memory.agentAnalysis) {
      let perf = this.agentPerformance.get(analysis.agentId);
      
      if (!perf) {
        perf = {
          agentId: analysis.agentId,
          agentName: analysis.agentId,
          totalTrades: 0,
          winRate: 0,
          avgPnLPercent: 0,
          avgConfidence: 0,
          bestMarketRegime: 'transition',
          worstMarketRegime: 'transition',
          recentAccuracy: 0,
        };
      }

      // Update metrics
      perf.totalTrades++;
      
      if (memory.outcome !== 'pending') {
        const isWin = memory.outcome === 'profit';
        perf.winRate = ((perf.winRate * (perf.totalTrades - 1)) + (isWin ? 1 : 0)) / perf.totalTrades;
      }

      if (memory.pnlPercent !== undefined) {
        perf.avgPnLPercent = ((perf.avgPnLPercent * (perf.totalTrades - 1)) + memory.pnlPercent) / perf.totalTrades;
      }

      perf.avgConfidence = ((perf.avgConfidence * (perf.totalTrades - 1)) + analysis.confidence) / perf.totalTrades;

      this.agentPerformance.set(analysis.agentId, perf);
    }
  }

  /**
   * Detect patterns in trade history
   */
  private detectPatterns(memory: TradeMemory): void {
    // Pattern: Asset class + Market regime
    const regimePattern = `${memory.assetClass}_${memory.context.marketRegime}`;
    this.updatePattern(regimePattern, memory);

    // Pattern: High volatility trades
    if (memory.context.volatility > 50) {
      this.updatePattern('high_volatility', memory);
    }

    // Pattern: High consensus trades
    if (memory.context.agentConsensus > 80) {
      this.updatePattern('high_consensus', memory);
    }

    // Pattern: Contrarian trades (low sentiment, buy action)
    if (memory.context.sentiment < 30 && memory.action === 'buy') {
      this.updatePattern('contrarian_buy', memory);
    }
  }

  /**
   * Update pattern statistics
   */
  private updatePattern(patternKey: string, memory: TradeMemory): void {
    let pattern = this.patterns.get(patternKey);
    
    if (!pattern) {
      pattern = {
        pattern: patternKey,
        occurrences: 0,
        avgOutcome: 0,
        confidence: 0,
        examples: [],
      };
    }

    pattern.occurrences++;
    
    const outcomeScore = memory.outcome === 'profit' ? 1 : memory.outcome === 'loss' ? -1 : 0;
    pattern.avgOutcome = ((pattern.avgOutcome * (pattern.occurrences - 1)) + outcomeScore) / pattern.occurrences;
    
    pattern.confidence = Math.min(100, pattern.occurrences * 5); // Confidence grows with occurrences
    
    pattern.examples.push(memory);
    if (pattern.examples.length > 10) {
      pattern.examples = pattern.examples.slice(-10);
    }

    this.patterns.set(patternKey, pattern);
  }

  /**
   * Get agent performance leaderboard
   */
  getAgentLeaderboard(): AgentPerformance[] {
    return Array.from(this.agentPerformance.values())
      .sort((a, b) => {
        // Sort by win rate, then by avg PnL
        if (Math.abs(a.winRate - b.winRate) > 0.05) {
          return b.winRate - a.winRate;
        }
        return b.avgPnLPercent - a.avgPnLPercent;
      });
  }

  /**
   * Get pattern insights
   */
  getPatternInsights(): PatternMatch[] {
    return Array.from(this.patterns.values())
      .filter(p => p.occurrences >= 3) // Only patterns with enough data
      .sort((a, b) => Math.abs(b.avgOutcome) - Math.abs(a.avgOutcome));
  }

  /**
   * Record trade outcome (post-trade)
   */
  recordOutcome(
    memoryId: string,
    exitPrice: number,
    postMortem: TradeMemory['postMortem']
  ): TradeMemory | undefined {
    const memory = this.memories.get(memoryId);
    if (!memory) return undefined;

    memory.exitPrice = exitPrice;
    memory.pnlPercent = ((exitPrice - memory.entryPrice) / memory.entryPrice) * 100;
    if (memory.action === 'sell') {
      memory.pnlPercent = -memory.pnlPercent;
    }
    memory.pnlAbsolute = memory.size * (memory.pnlPercent / 100);
    
    memory.outcome = memory.pnlPercent > 0.5 ? 'profit' : memory.pnlPercent < -0.5 ? 'loss' : 'breakeven';
    memory.postMortem = postMortem;

    // Update agent performance with actual outcome
    this.updateAgentPerformance(memory);

    return memory;
  }

  /**
   * Get memories by filter
   */
  getMemories(filter?: {
    assetClass?: string;
    outcome?: string;
    dateRange?: { start: number; end: number };
    tags?: string[];
  }): TradeMemory[] {
    let results = Array.from(this.memories.values());

    if (filter) {
      if (filter.assetClass) {
        results = results.filter(m => m.assetClass === filter.assetClass);
      }
      if (filter.outcome) {
        results = results.filter(m => m.outcome === filter.outcome);
      }
      if (filter.dateRange) {
        results = results.filter(m => 
          m.timestamp >= filter.dateRange!.start && 
          m.timestamp <= filter.dateRange!.end
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(m => 
          filter.tags!.some(tag => m.tags.includes(tag))
        );
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get learning summary
   */
  getLearningsSummary(): {
    totalMemories: number;
    winRate: number;
    avgPnL: number;
    topPatterns: PatternMatch[];
    topAgents: AgentPerformance[];
    recentLessons: string[];
  } {
    const memories = Array.from(this.memories.values());
    const completedTrades = memories.filter(m => m.outcome !== 'pending');
    
    const wins = completedTrades.filter(m => m.outcome === 'profit').length;
    const winRate = completedTrades.length > 0 ? wins / completedTrades.length : 0;
    
    const avgPnL = completedTrades.length > 0
      ? completedTrades.reduce((sum, m) => sum + (m.pnlPercent || 0), 0) / completedTrades.length
      : 0;

    // Get recent lessons
    const recentLessons: string[] = [];
    const recentMemories = memories.slice(-10);
    for (const memory of recentMemories) {
      if (memory.postMortem) {
        recentLessons.push(...memory.postMortem.lessonsLearned);
      }
    }

    return {
      totalMemories: memories.length,
      winRate,
      avgPnL,
      topPatterns: this.getPatternInsights().slice(0, 5),
      topAgents: this.getAgentLeaderboard().slice(0, 5),
      recentLessons: Array.from(new Set(recentLessons)).slice(0, 10),
    };
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    const summary = this.getLearningsSummary();
    
    let report = `=== AGENT MEMORY SYSTEM REPORT ===\n`;
    report += `Total Memories: ${summary.totalMemories}\n`;
    report += `Win Rate: ${(summary.winRate * 100).toFixed(1)}%\n`;
    report += `Average P&L: ${summary.avgPnL.toFixed(2)}%\n\n`;

    report += `--- TOP PATTERNS ---\n`;
    for (const pattern of summary.topPatterns) {
      const direction = pattern.avgOutcome > 0 ? '📈' : pattern.avgOutcome < 0 ? '📉' : '➡️';
      report += `${direction} ${pattern.pattern}: ${pattern.occurrences} trades, ${(pattern.avgOutcome * 100).toFixed(1)}% avg outcome\n`;
    }

    report += `\n--- TOP AGENTS ---\n`;
    for (const agent of summary.topAgents) {
      report += `${agent.agentId}: ${(agent.winRate * 100).toFixed(1)}% win rate, ${agent.avgPnLPercent.toFixed(2)}% avg P&L\n`;
    }

    report += `\n--- RECENT LESSONS ---\n`;
    for (const lesson of summary.recentLessons) {
      report += `• ${lesson}\n`;
    }

    return report;
  }
}
