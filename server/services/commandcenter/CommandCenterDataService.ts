/**
 * Command Center Data Service
 * 
 * Aggregates real-time data from all agent services and provides
 * a unified interface for the AI Command Center dashboard.
 */

import { crossAgentSynthesis } from './CrossAgentSynthesis';
import { AlphaOrchestrator } from '../swarm/orchestrator/AlphaOrchestrator';

// Types for Command Center
export interface AgentStatus {
  id: string;
  name: string;
  type: 'stock' | 'crypto' | 'sentiment' | 'macro' | 'options' | 'swarm';
  status: 'active' | 'idle' | 'error' | 'processing';
  lastSignal: Date | null;
  signalCount: number;
  accuracy: number;
  confidence: number;
}

export interface UnifiedSignal {
  id: string;
  source: string;
  sourceType: 'stock_agent' | 'crypto_agent' | 'sentiment_agent' | 'macro_agent' | 'options_agent' | 'swarm_consensus';
  asset: string;
  assetClass: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  confidence: number;
  reasoning: string[];
  timestamp: Date;
  expiresAt: Date;
  actionable: boolean;
  suggestedAction?: {
    type: 'buy' | 'sell' | 'hold' | 'hedge';
    size: 'small' | 'medium' | 'large';
    urgency: 'immediate' | 'today' | 'this_week';
  };
}

export interface PortfolioMetrics {
  totalValue: number;
  dayPnL: number;
  dayPnLPercent: number;
  weekPnL: number;
  weekPnLPercent: number;
  cashAvailable: number;
  buyingPower: number;
  marginUsed: number;
  positions: PositionSummary[];
  riskMetrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    beta: number;
    var95: number;
  };
}

export interface PositionSummary {
  symbol: string;
  assetClass: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number;
}

export interface PendingAction {
  id: string;
  type: 'trade' | 'rebalance' | 'hedge' | 'alert';
  priority: 'high' | 'medium' | 'low';
  asset: string;
  action: string;
  description: string;
  confidence: number;
  source: string;
  createdAt: Date;
  expiresAt: Date;
  requiresApproval: boolean;
  estimatedImpact: {
    expectedReturn: number;
    riskLevel: string;
    timeHorizon: string;
  };
}

export interface CommandCenterSummary {
  marketRegime: {
    current: 'risk_on' | 'risk_off' | 'transition';
    confidence: number;
    trend: 'improving' | 'stable' | 'deteriorating';
  };
  signalSummary: {
    total: number;
    bullish: number;
    bearish: number;
    neutral: number;
    highConviction: number;
  };
  agentSummary: {
    total: number;
    active: number;
    topPerformer: string;
    avgAccuracy: number;
  };
  portfolioSummary: {
    totalValue: number;
    dayPnL: number;
    riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  };
  alertCount: number;
  pendingActions: number;
  lastUpdate: Date;
}

export interface VoiceCommandResult {
  success: boolean;
  response: string;
  data?: unknown;
  suggestedActions?: string[];
  executedAction?: string;
}

class CommandCenterDataService {
  private alphaOrchestrator: AlphaOrchestrator;
  
  private signalCache: Map<string, UnifiedSignal> = new Map();
  private pendingActionsCache: PendingAction[] = [];
  private lastRefresh: Date | null = null;
  private readonly CACHE_TTL_MS = 10000; // 10 seconds

  constructor() {
    this.alphaOrchestrator = new AlphaOrchestrator();
  }

  /**
   * Get all agent statuses
   */
  async getAgentStatuses(): Promise<AgentStatus[]> {
    const agents: AgentStatus[] = [];
    
    // Stock Agents
    const stockAgents = [
      { id: 'fundamental_analyst', name: 'Fundamental Analyst', type: 'stock' as const },
      { id: 'technical_analyst', name: 'Technical Analyst', type: 'stock' as const },
      { id: 'sentiment_harvester', name: 'Sentiment Harvester', type: 'stock' as const },
      { id: 'macro_linker', name: 'Macro Linker', type: 'stock' as const },
      { id: 'portfolio_manager', name: 'Portfolio Manager', type: 'stock' as const },
      { id: 'devils_advocate', name: "Devil's Advocate", type: 'stock' as const },
    ];
    
    // Crypto Agents
    const cryptoAgents = [
      { id: 'whale_agent', name: 'Whale Tracker', type: 'crypto' as const },
      { id: 'hype_agent', name: 'Hype Detector', type: 'crypto' as const },
      { id: 'macro_crypto', name: 'Crypto Macro', type: 'crypto' as const },
      { id: 'defi_analyst', name: 'DeFi Analyst', type: 'crypto' as const },
    ];
    
    // Sentiment Agents
    const sentimentAgents = [
      { id: 'twitter_sentiment', name: 'Twitter Sentiment', type: 'sentiment' as const },
      { id: 'reddit_sentiment', name: 'Reddit Sentiment', type: 'sentiment' as const },
      { id: 'news_sentiment', name: 'News Sentiment', type: 'sentiment' as const },
    ];
    
    // Macro Agents
    const macroAgents = [
      { id: 'fed_watcher', name: 'Fed Watcher', type: 'macro' as const },
      { id: 'regime_detector', name: 'Regime Detector', type: 'macro' as const },
      { id: 'correlation_tracker', name: 'Correlation Tracker', type: 'macro' as const },
    ];
    
    // Options Agents
    const optionsAgents = [
      { id: 'greeks_analyzer', name: 'Greeks Analyzer', type: 'options' as const },
      { id: 'iv_surface', name: 'IV Surface Analyzer', type: 'options' as const },
      { id: 'flow_detector', name: 'Options Flow Detector', type: 'options' as const },
    ];
    
    // Swarm Agents
    const swarmAgents = [
      { id: 'alpha_orchestrator', name: 'Alpha Orchestrator', type: 'swarm' as const },
      { id: 'consensus_engine', name: 'Consensus Engine', type: 'swarm' as const },
      { id: 'debate_system', name: 'Debate System', type: 'swarm' as const },
    ];
    
    const allAgentDefs = [
      ...stockAgents,
      ...cryptoAgents,
      ...sentimentAgents,
      ...macroAgents,
      ...optionsAgents,
      ...swarmAgents,
    ];
    
    for (const agentDef of allAgentDefs) {
      // Simulate agent status - in production, this would query actual agent services
      const isActive = Math.random() > 0.1; // 90% chance of being active
      const hasRecentSignal = Math.random() > 0.3;
      
      agents.push({
        id: agentDef.id,
        name: agentDef.name,
        type: agentDef.type,
        status: isActive ? (hasRecentSignal ? 'active' : 'idle') : 'error',
        lastSignal: hasRecentSignal ? new Date(Date.now() - Math.random() * 3600000) : null,
        signalCount: Math.floor(Math.random() * 100) + 10,
        accuracy: 60 + Math.random() * 35,
        confidence: 50 + Math.random() * 45,
      });
    }
    
    return agents;
  }

  /**
   * Get aggregated signals from all sources
   */
  async getAggregatedSignals(filters?: {
    assetClass?: string;
    direction?: string;
    minConfidence?: number;
    source?: string;
  }): Promise<UnifiedSignal[]> {
    // Get synthesis from CrossAgentSynthesis
    const synthesis = crossAgentSynthesis.synthesize();
    const signals: UnifiedSignal[] = [];
    
    // Convert asset signals to unified format
    for (const assetSignal of synthesis.assetSignals) {
      const direction = this.mapSignalToDirection(assetSignal.aggregatedSignal);
      const strength = this.mapConfidenceToStrength(assetSignal.confidence);
      
      signals.push({
        id: `signal_${assetSignal.asset}_${Date.now()}`,
        source: assetSignal.contributingAgents[0]?.agentName || 'Multi-Agent Consensus',
        sourceType: this.determineSourceType(assetSignal.assetClass),
        asset: assetSignal.asset,
        assetClass: assetSignal.assetClass,
        direction,
        strength,
        confidence: assetSignal.confidence,
        reasoning: assetSignal.keyInsights,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
        actionable: assetSignal.confidence > 70,
        suggestedAction: assetSignal.confidence > 70 ? {
          type: direction === 'bullish' ? 'buy' : direction === 'bearish' ? 'sell' : 'hold',
          size: strength === 'strong' ? 'large' : strength === 'moderate' ? 'medium' : 'small',
          urgency: assetSignal.confidence > 85 ? 'immediate' : 'today',
        } : undefined,
      });
    }
    
    // Add opportunity-based signals
    for (const opp of synthesis.opportunities) {
      signals.push({
        id: opp.id,
        source: opp.supportingAgents.join(', '),
        sourceType: 'swarm_consensus',
        asset: opp.asset,
        assetClass: this.inferAssetClass(opp.asset),
        direction: 'bullish',
        strength: this.mapConfidenceToStrength(opp.confidence),
        confidence: opp.confidence,
        reasoning: [`${opp.type} opportunity`, `Expected return: ${(opp.expectedReturn * 100).toFixed(1)}%`, `Time horizon: ${opp.timeHorizon}`],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // 24 hour expiry
        actionable: true,
        suggestedAction: {
          type: 'buy',
          size: opp.riskRewardRatio > 2 ? 'medium' : 'small',
          urgency: 'this_week',
        },
      });
    }
    
    // Apply filters
    let filtered = signals;
    if (filters) {
      if (filters.assetClass) {
        filtered = filtered.filter(s => s.assetClass === filters.assetClass);
      }
      if (filters.direction) {
        filtered = filtered.filter(s => s.direction === filters.direction);
      }
      if (filters.minConfidence !== undefined) {
        const minConf = filters.minConfidence;
        filtered = filtered.filter(s => s.confidence >= minConf);
      }
      if (filters.source) {
        const sourceFilter = filters.source.toLowerCase();
        filtered = filtered.filter(s => s.source.toLowerCase().includes(sourceFilter));
      }
    }
    
    // Sort by confidence descending
    return filtered.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get portfolio metrics
   */
  async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    // In production, this would fetch from actual broker connections
    // For now, return simulated data
    const positions: PositionSummary[] = [
      {
        symbol: 'AAPL',
        assetClass: 'stock',
        quantity: 100,
        avgCost: 175.50,
        currentPrice: 182.30,
        marketValue: 18230,
        unrealizedPnL: 680,
        unrealizedPnLPercent: 3.88,
        dayChange: 2.15,
        dayChangePercent: 1.19,
        weight: 0.15,
      },
      {
        symbol: 'BTC',
        assetClass: 'crypto',
        quantity: 0.5,
        avgCost: 42000,
        currentPrice: 43500,
        marketValue: 21750,
        unrealizedPnL: 750,
        unrealizedPnLPercent: 3.57,
        dayChange: -500,
        dayChangePercent: -1.14,
        weight: 0.18,
      },
      {
        symbol: 'MSFT',
        assetClass: 'stock',
        quantity: 50,
        avgCost: 380.00,
        currentPrice: 395.20,
        marketValue: 19760,
        unrealizedPnL: 760,
        unrealizedPnLPercent: 4.00,
        dayChange: 3.50,
        dayChangePercent: 0.89,
        weight: 0.16,
      },
      {
        symbol: 'ETH',
        assetClass: 'crypto',
        quantity: 5,
        avgCost: 2200,
        currentPrice: 2350,
        marketValue: 11750,
        unrealizedPnL: 750,
        unrealizedPnLPercent: 6.82,
        dayChange: 50,
        dayChangePercent: 2.17,
        weight: 0.10,
      },
      {
        symbol: 'NVDA',
        assetClass: 'stock',
        quantity: 25,
        avgCost: 450.00,
        currentPrice: 485.60,
        marketValue: 12140,
        unrealizedPnL: 890,
        unrealizedPnLPercent: 7.91,
        dayChange: 8.20,
        dayChangePercent: 1.72,
        weight: 0.10,
      },
    ];
    
    const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0) + 50000; // + cash
    const dayPnL = positions.reduce((sum, p) => sum + (p.dayChange * p.quantity), 0);
    const weekPnL = dayPnL * 3.5; // Simulated
    
    return {
      totalValue,
      dayPnL,
      dayPnLPercent: (dayPnL / totalValue) * 100,
      weekPnL,
      weekPnLPercent: (weekPnL / totalValue) * 100,
      cashAvailable: 50000,
      buyingPower: 100000,
      marginUsed: 0,
      positions,
      riskMetrics: {
        sharpeRatio: 1.85,
        maxDrawdown: 8.5,
        volatility: 15.2,
        beta: 1.12,
        var95: 3500,
      },
    };
  }

  /**
   * Get pending actions requiring approval
   */
  async getPendingActions(): Promise<PendingAction[]> {
    const synthesis = crossAgentSynthesis.synthesize();
    const actions: PendingAction[] = [];
    
    // Convert recommendations to pending actions
    for (const rec of synthesis.recommendedActions) {
      if (rec.requiresApproval) {
        actions.push({
          id: rec.id,
          type: 'trade',
          priority: rec.urgency === 'immediate' ? 'high' : rec.urgency === 'today' ? 'medium' : 'low',
          asset: rec.asset,
          action: rec.action.toUpperCase(),
          description: rec.rationale,
          confidence: rec.consensusScore,
          source: 'Multi-Agent Consensus',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (rec.urgency === 'immediate' ? 3600000 : 86400000)),
          requiresApproval: true,
          estimatedImpact: {
            expectedReturn: 5 + Math.random() * 10,
            riskLevel: rec.size === 'large' ? 'high' : rec.size === 'medium' ? 'moderate' : 'low',
            timeHorizon: rec.urgency === 'immediate' ? '1-2 days' : '1-2 weeks',
          },
        });
      }
    }
    
    // Add warning-based actions
    for (const warning of synthesis.warnings) {
      if (warning.actionRequired) {
        actions.push({
          id: warning.id,
          type: 'alert',
          priority: warning.severity === 'critical' ? 'high' : warning.severity === 'warning' ? 'medium' : 'low',
          asset: warning.affectedAssets.join(', '),
          action: 'REVIEW',
          description: warning.message,
          confidence: 90,
          source: warning.source,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          requiresApproval: true,
          estimatedImpact: {
            expectedReturn: 0,
            riskLevel: warning.severity,
            timeHorizon: 'Immediate',
          },
        });
      }
    }
    
    return actions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get command center summary
   */
  async getSummary(): Promise<CommandCenterSummary> {
    const synthesis = crossAgentSynthesis.synthesize();
    const signals = await this.getAggregatedSignals();
    const agents = await this.getAgentStatuses();
    const portfolio = await this.getPortfolioMetrics();
    const pendingActions = await this.getPendingActions();
    
    const activeAgents = agents.filter(a => a.status === 'active');
    const topPerformer = agents.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    , agents[0]);
    
    return {
      marketRegime: {
        current: synthesis.marketRegime.current,
        confidence: synthesis.marketRegime.confidence,
        trend: 'stable', // Would be calculated from historical data
      },
      signalSummary: {
        total: signals.length,
        bullish: signals.filter(s => s.direction === 'bullish').length,
        bearish: signals.filter(s => s.direction === 'bearish').length,
        neutral: signals.filter(s => s.direction === 'neutral').length,
        highConviction: signals.filter(s => s.confidence > 80).length,
      },
      agentSummary: {
        total: agents.length,
        active: activeAgents.length,
        topPerformer: topPerformer?.name || 'N/A',
        avgAccuracy: agents.reduce((sum, a) => sum + a.accuracy, 0) / agents.length,
      },
      portfolioSummary: {
        totalValue: portfolio.totalValue,
        dayPnL: portfolio.dayPnL,
        riskLevel: synthesis.riskAssessment.overallRiskLevel as 'low' | 'moderate' | 'elevated' | 'high',
      },
      alertCount: synthesis.warnings.length,
      pendingActions: pendingActions.length,
      lastUpdate: new Date(),
    };
  }

  /**
   * Execute a signal/action
   */
  async executeSignal(signalId: string, options?: {
    size?: 'small' | 'medium' | 'large';
    orderType?: 'market' | 'limit';
    limitPrice?: number;
  }): Promise<{ success: boolean; orderId?: string; message: string }> {
    // In production, this would execute through the broker
    // For now, return simulated result
    return {
      success: true,
      orderId: `order_${Date.now()}`,
      message: `Signal ${signalId} executed successfully with ${options?.orderType || 'market'} order`,
    };
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(command: string): Promise<VoiceCommandResult> {
    const voiceCmd = {
      command,
      intent: 'query' as const,
      parameters: {},
      timestamp: new Date()
    };
    const response = crossAgentSynthesis.processVoiceCommand(voiceCmd);
    
    // Check for action commands
    const lowerCommand = command.toLowerCase();
    let executedAction: string | undefined;
    
    if (lowerCommand.includes('execute') || lowerCommand.includes('buy') || lowerCommand.includes('sell')) {
      // Extract asset from command
      const assetMatch = lowerCommand.match(/(?:buy|sell|execute)\s+(\w+)/i);
      if (assetMatch) {
        const asset = assetMatch[1].toUpperCase();
        const action = lowerCommand.includes('buy') ? 'BUY' : lowerCommand.includes('sell') ? 'SELL' : 'EXECUTE';
        executedAction = `${action} order queued for ${asset}`;
      }
    }
    
    return {
      success: true,
      response: response.text,
      data: response.data,
      suggestedActions: response.suggestedActions,
      executedAction,
    };
  }

  /**
   * Approve a pending action
   */
  async approveAction(actionId: string): Promise<{ success: boolean; message: string }> {
    // In production, this would trigger the actual trade execution
    return {
      success: true,
      message: `Action ${actionId} approved and queued for execution`,
    };
  }

  /**
   * Reject a pending action
   */
  async rejectAction(actionId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Action ${actionId} rejected${reason ? `: ${reason}` : ''}`,
    };
  }

  // Helper methods
  private mapSignalToDirection(signal: string): 'bullish' | 'bearish' | 'neutral' {
    if (signal.includes('buy')) return 'bullish';
    if (signal.includes('sell')) return 'bearish';
    return 'neutral';
  }

  private mapConfidenceToStrength(confidence: number): 'strong' | 'moderate' | 'weak' {
    if (confidence >= 80) return 'strong';
    if (confidence >= 60) return 'moderate';
    return 'weak';
  }

  private determineSourceType(assetClass: string): UnifiedSignal['sourceType'] {
    switch (assetClass) {
      case 'crypto': return 'crypto_agent';
      case 'stock': return 'stock_agent';
      default: return 'swarm_consensus';
    }
  }

  private inferAssetClass(asset: string): UnifiedSignal['assetClass'] {
    const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP', 'DOT', 'AVAX', 'MATIC'];
    const forexPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'];
    const commodities = ['GOLD', 'SILVER', 'OIL', 'GAS', 'WHEAT', 'CORN'];
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'];
    
    const upperAsset = asset.toUpperCase();
    
    if (cryptoSymbols.some(c => upperAsset.includes(c))) return 'crypto';
    if (forexPairs.some(f => upperAsset.includes(f))) return 'forex';
    if (commodities.some(c => upperAsset.includes(c))) return 'commodity';
    if (indices.some(i => upperAsset.includes(i))) return 'index';
    return 'stock';
  }
}

export const commandCenterDataService = new CommandCenterDataService();
