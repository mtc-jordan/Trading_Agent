/**
 * Cross-Agent Intelligence Synthesis Service
 * 
 * Combines signals from all AI agents across different domains (stocks, crypto, options, sentiment)
 * into a unified intelligence layer that provides holistic market insights.
 */

// Agent signal types from different domains
interface StockAgentSignal {
  agentId: string;
  agentName: string;
  domain: 'stock';
  symbol: string;
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  timestamp: Date;
}

interface CryptoAgentSignal {
  agentId: string;
  agentName: string;
  domain: 'crypto';
  token: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  whaleActivity: 'accumulating' | 'distributing' | 'neutral';
  narrativeStrength: number;
  onChainMetrics: {
    mvrv: number;
    nvt: number;
    exchangeFlow: 'inflow' | 'outflow' | 'neutral';
  };
  timestamp: Date;
}

interface SentimentAgentSignal {
  agentId: string;
  agentName: string;
  domain: 'sentiment';
  asset: string;
  overallSentiment: number; // -1 to 1
  platforms: {
    twitter: number;
    reddit: number;
    stocktwits: number;
    news: number;
  };
  trendingScore: number;
  alertLevel: 'normal' | 'elevated' | 'extreme';
  timestamp: Date;
}

interface MacroAgentSignal {
  agentId: string;
  agentName: string;
  domain: 'macro';
  regime: 'risk_on' | 'risk_off' | 'transition';
  fedSentiment: number;
  vixLevel: number;
  dollarStrength: number;
  yieldCurve: 'normal' | 'flat' | 'inverted';
  correlations: {
    btcNasdaq: number;
    goldUsd: number;
    spyVix: number;
  };
  timestamp: Date;
}

interface OptionsAgentSignal {
  agentId: string;
  agentName: string;
  domain: 'options';
  underlying: string;
  impliedVolatility: number;
  ivPercentile: number;
  putCallRatio: number;
  maxPain: number;
  unusualActivity: boolean;
  greekExposure: {
    delta: number;
    gamma: number;
    vanna: number;
    charm: number;
  };
  timestamp: Date;
}

type AgentSignal = StockAgentSignal | CryptoAgentSignal | SentimentAgentSignal | MacroAgentSignal | OptionsAgentSignal;

// Synthesized intelligence output
interface SynthesizedIntelligence {
  id: string;
  timestamp: Date;
  marketRegime: {
    current: 'risk_on' | 'risk_off' | 'transition';
    confidence: number;
    drivers: string[];
  };
  assetSignals: AssetSynthesis[];
  crossAssetCorrelations: CorrelationMatrix;
  riskAssessment: RiskSynthesis;
  opportunities: OpportunitySignal[];
  warnings: WarningSignal[];
  recommendedActions: ActionRecommendation[];
}

interface AssetSynthesis {
  asset: string;
  assetClass: 'stock' | 'crypto' | 'commodity' | 'forex';
  aggregatedSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  contributingAgents: {
    agentName: string;
    signal: string;
    weight: number;
  }[];
  sentimentAlignment: number; // How aligned are different signals
  riskScore: number;
  keyInsights: string[];
}

interface CorrelationMatrix {
  pairs: {
    asset1: string;
    asset2: string;
    correlation: number;
    lagDays: number;
    isAnomalous: boolean;
  }[];
  regimeCorrelations: {
    regime: string;
    avgCorrelation: number;
  }[];
}

interface RiskSynthesis {
  overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'extreme';
  riskScore: number; // 0-100
  factors: {
    factor: string;
    contribution: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
  hedgeRecommendations: string[];
}

interface OpportunitySignal {
  id: string;
  type: 'momentum' | 'mean_reversion' | 'arbitrage' | 'yield' | 'event';
  asset: string;
  expectedReturn: number;
  timeHorizon: string;
  confidence: number;
  supportingAgents: string[];
  riskRewardRatio: number;
}

interface WarningSignal {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affectedAssets: string[];
  source: string;
  actionRequired: boolean;
}

interface ActionRecommendation {
  id: string;
  action: 'buy' | 'sell' | 'hedge' | 'rebalance' | 'hold' | 'close';
  asset: string;
  urgency: 'immediate' | 'today' | 'this_week' | 'opportunistic';
  size: 'small' | 'medium' | 'large';
  rationale: string;
  consensusScore: number;
  requiresApproval: boolean;
}

// Voice command interface
interface VoiceCommand {
  command: string;
  intent: 'query' | 'action' | 'status' | 'alert';
  parameters: Record<string, string>;
  timestamp: Date;
}

interface VoiceResponse {
  text: string;
  data?: unknown;
  suggestedActions?: string[];
  followUpQuestions?: string[];
}

export class CrossAgentSynthesisService {
  private signals: Map<string, AgentSignal[]> = new Map();
  private synthesisCache: SynthesizedIntelligence | null = null;
  private lastSynthesisTime: Date | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  // Agent weights for different market regimes
  private readonly agentWeights: Record<string, Record<string, number>> = {
    risk_on: {
      momentum: 0.25,
      technical: 0.20,
      sentiment: 0.20,
      fundamental: 0.15,
      macro: 0.10,
      risk: 0.10
    },
    risk_off: {
      risk: 0.30,
      macro: 0.25,
      fundamental: 0.20,
      technical: 0.15,
      sentiment: 0.05,
      momentum: 0.05
    },
    transition: {
      macro: 0.25,
      risk: 0.20,
      technical: 0.20,
      fundamental: 0.15,
      sentiment: 0.10,
      momentum: 0.10
    }
  };

  /**
   * Ingest a signal from any agent
   */
  ingestSignal(signal: AgentSignal): void {
    const key = `${signal.domain}_${signal.agentId}`;
    const existing = this.signals.get(key) || [];
    
    // Keep last 100 signals per agent
    existing.unshift(signal);
    if (existing.length > 100) {
      existing.pop();
    }
    
    this.signals.set(key, existing);
    
    // Invalidate cache
    this.synthesisCache = null;
  }

  /**
   * Get all recent signals for an asset
   */
  getSignalsForAsset(asset: string): AgentSignal[] {
    const allSignals: AgentSignal[] = [];
    
    for (const signals of Array.from(this.signals.values())) {
      for (const signal of signals) {
        const signalAsset = this.getAssetFromSignal(signal);
        if (signalAsset.toLowerCase() === asset.toLowerCase()) {
          allSignals.push(signal);
        }
      }
    }
    
    return allSignals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private getAssetFromSignal(signal: AgentSignal): string {
    switch (signal.domain) {
      case 'stock':
        return signal.symbol;
      case 'crypto':
        return signal.token;
      case 'sentiment':
        return signal.asset;
      case 'options':
        return signal.underlying;
      case 'macro':
        return 'MACRO';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Synthesize all signals into unified intelligence
   */
  synthesize(forceRefresh: boolean = false): SynthesizedIntelligence {
    // Return cached if valid
    if (!forceRefresh && this.synthesisCache && this.lastSynthesisTime) {
      const age = Date.now() - this.lastSynthesisTime.getTime();
      if (age < this.CACHE_TTL_MS) {
        return this.synthesisCache;
      }
    }

    const marketRegime = this.determineMarketRegime();
    const assetSignals = this.synthesizeAssetSignals(marketRegime.current);
    const correlations = this.calculateCorrelations();
    const riskAssessment = this.assessRisk(assetSignals, marketRegime);
    const opportunities = this.identifyOpportunities(assetSignals, correlations);
    const warnings = this.generateWarnings(assetSignals, riskAssessment);
    const recommendations = this.generateRecommendations(
      assetSignals, 
      opportunities, 
      warnings, 
      marketRegime
    );

    const synthesis: SynthesizedIntelligence = {
      id: `synthesis_${Date.now()}`,
      timestamp: new Date(),
      marketRegime,
      assetSignals,
      crossAssetCorrelations: correlations,
      riskAssessment,
      opportunities,
      warnings,
      recommendedActions: recommendations
    };

    this.synthesisCache = synthesis;
    this.lastSynthesisTime = new Date();

    return synthesis;
  }

  /**
   * Determine current market regime from macro signals
   */
  private determineMarketRegime(): SynthesizedIntelligence['marketRegime'] {
    const macroSignals: MacroAgentSignal[] = [];
    
    for (const signals of Array.from(this.signals.values())) {
      for (const signal of signals) {
        if (signal.domain === 'macro') {
          macroSignals.push(signal);
        }
      }
    }

    if (macroSignals.length === 0) {
      // Default to transition if no macro data
      return {
        current: 'transition',
        confidence: 50,
        drivers: ['No macro data available']
      };
    }

    // Get most recent macro signal
    const latest = macroSignals.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )[0];

    const drivers: string[] = [];
    
    if (latest.vixLevel < 20) {
      drivers.push('Low VIX indicates calm markets');
    } else if (latest.vixLevel > 30) {
      drivers.push('Elevated VIX signals fear');
    }

    if (latest.fedSentiment > 0.3) {
      drivers.push('Hawkish Fed stance');
    } else if (latest.fedSentiment < -0.3) {
      drivers.push('Dovish Fed stance');
    }

    if (latest.yieldCurve === 'inverted') {
      drivers.push('Inverted yield curve - recession signal');
    }

    return {
      current: latest.regime,
      confidence: 75,
      drivers
    };
  }

  /**
   * Synthesize signals for each asset
   */
  private synthesizeAssetSignals(regime: string): AssetSynthesis[] {
    const assetMap = new Map<string, AgentSignal[]>();
    
    // Group signals by asset
    for (const signals of Array.from(this.signals.values())) {
      for (const signal of signals) {
        const asset = this.getAssetFromSignal(signal);
        if (asset === 'MACRO' || asset === 'UNKNOWN') continue;
        
        const existing = assetMap.get(asset) || [];
        existing.push(signal);
        assetMap.set(asset, existing);
      }
    }

    const syntheses: AssetSynthesis[] = [];
    const weights = this.agentWeights[regime] || this.agentWeights.transition;

    for (const [asset, signals] of Array.from(assetMap.entries())) {
      // Get most recent signal from each agent
      const latestByAgent = new Map<string, AgentSignal>();
      for (const signal of signals) {
        const existing = latestByAgent.get(signal.agentId);
        if (!existing || signal.timestamp > existing.timestamp) {
          latestByAgent.set(signal.agentId, signal);
        }
      }

      const contributingAgents: AssetSynthesis['contributingAgents'] = [];
      let weightedScore = 0;
      let totalWeight = 0;

      for (const signal of Array.from(latestByAgent.values())) {
        const agentType = this.getAgentType(signal.agentName);
        const weight = weights[agentType] || 0.1;
        const score = this.signalToScore(signal);
        
        weightedScore += score * weight;
        totalWeight += weight;

        contributingAgents.push({
          agentName: signal.agentName,
          signal: this.getSignalLabel(signal),
          weight
        });
      }

      const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
      const aggregatedSignal = this.scoreToSignal(avgScore);
      
      // Calculate sentiment alignment (how much agents agree)
      const scores = Array.from(latestByAgent.values()).map(s => this.signalToScore(s));
      const variance = this.calculateVariance(scores);
      const alignment = Math.max(0, 1 - variance / 2);

      syntheses.push({
        asset,
        assetClass: this.determineAssetClass(asset),
        aggregatedSignal,
        confidence: Math.round(alignment * 100),
        contributingAgents,
        sentimentAlignment: alignment,
        riskScore: this.calculateAssetRisk(signals),
        keyInsights: this.extractKeyInsights(signals)
      });
    }

    return syntheses.sort((a, b) => b.confidence - a.confidence);
  }

  private getAgentType(agentName: string): string {
    const name = agentName.toLowerCase();
    if (name.includes('momentum') || name.includes('alpha')) return 'momentum';
    if (name.includes('technical') || name.includes('chart')) return 'technical';
    if (name.includes('sentiment') || name.includes('social')) return 'sentiment';
    if (name.includes('fundamental') || name.includes('value')) return 'fundamental';
    if (name.includes('macro') || name.includes('global')) return 'macro';
    if (name.includes('risk') || name.includes('volatility')) return 'risk';
    return 'other';
  }

  private signalToScore(signal: AgentSignal): number {
    if (signal.domain === 'stock') {
      const scores: Record<string, number> = {
        strong_buy: 1,
        buy: 0.5,
        hold: 0,
        sell: -0.5,
        strong_sell: -1
      };
      return scores[signal.signal] || 0;
    }
    if (signal.domain === 'crypto') {
      const scores: Record<string, number> = {
        bullish: 0.75,
        neutral: 0,
        bearish: -0.75
      };
      return scores[signal.signal] || 0;
    }
    if (signal.domain === 'sentiment') {
      return signal.overallSentiment;
    }
    return 0;
  }

  private getSignalLabel(signal: AgentSignal): string {
    if (signal.domain === 'stock') return signal.signal;
    if (signal.domain === 'crypto') return signal.signal;
    if (signal.domain === 'sentiment') {
      if (signal.overallSentiment > 0.3) return 'bullish';
      if (signal.overallSentiment < -0.3) return 'bearish';
      return 'neutral';
    }
    return 'unknown';
  }

  private scoreToSignal(score: number): AssetSynthesis['aggregatedSignal'] {
    if (score >= 0.6) return 'strong_buy';
    if (score >= 0.2) return 'buy';
    if (score >= -0.2) return 'hold';
    if (score >= -0.6) return 'sell';
    return 'strong_sell';
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private determineAssetClass(asset: string): AssetSynthesis['assetClass'] {
    const cryptoTokens = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'ARB', 'OP', 'DOGE', 'SHIB'];
    const commodities = ['GLD', 'SLV', 'USO', 'UNG', 'PAXG'];
    const forex = ['DXY', 'EURUSD', 'GBPUSD', 'USDJPY'];
    
    if (cryptoTokens.includes(asset.toUpperCase())) return 'crypto';
    if (commodities.includes(asset.toUpperCase())) return 'commodity';
    if (forex.includes(asset.toUpperCase())) return 'forex';
    return 'stock';
  }

  private calculateAssetRisk(signals: AgentSignal[]): number {
    let riskScore = 50; // Base risk
    
    for (const signal of signals) {
      if (signal.domain === 'options') {
        if (signal.ivPercentile > 80) riskScore += 15;
        if (signal.unusualActivity) riskScore += 10;
      }
      if (signal.domain === 'sentiment') {
        if (signal.alertLevel === 'extreme') riskScore += 20;
        if (signal.alertLevel === 'elevated') riskScore += 10;
      }
    }
    
    return Math.min(100, riskScore);
  }

  private extractKeyInsights(signals: AgentSignal[]): string[] {
    const insights: string[] = [];
    
    for (const signal of signals.slice(0, 5)) {
      if (signal.domain === 'stock' && signal.reasoning) {
        insights.push(signal.reasoning);
      }
      if (signal.domain === 'crypto') {
        if (signal.whaleActivity === 'accumulating') {
          insights.push('Whale accumulation detected');
        }
        if (signal.narrativeStrength > 70) {
          insights.push('Strong narrative momentum');
        }
      }
    }
    
    return insights.slice(0, 3);
  }

  /**
   * Calculate cross-asset correlations
   */
  private calculateCorrelations(): CorrelationMatrix {
    // Simplified correlation calculation
    const pairs = [
      { asset1: 'BTC', asset2: 'NASDAQ', correlation: 0.72, lagDays: 0, isAnomalous: false },
      { asset1: 'BTC', asset2: 'SPY', correlation: 0.65, lagDays: 1, isAnomalous: false },
      { asset1: 'BTC', asset2: 'GLD', correlation: -0.12, lagDays: 0, isAnomalous: false },
      { asset1: 'ETH', asset2: 'BTC', correlation: 0.92, lagDays: 0, isAnomalous: false },
      { asset1: 'SPY', asset2: 'VIX', correlation: -0.85, lagDays: 0, isAnomalous: false }
    ];

    return {
      pairs,
      regimeCorrelations: [
        { regime: 'risk_on', avgCorrelation: 0.65 },
        { regime: 'risk_off', avgCorrelation: 0.82 },
        { regime: 'transition', avgCorrelation: 0.55 }
      ]
    };
  }

  /**
   * Assess overall portfolio risk
   */
  private assessRisk(
    assetSignals: AssetSynthesis[], 
    marketRegime: SynthesizedIntelligence['marketRegime']
  ): RiskSynthesis {
    let riskScore = 30; // Base risk
    const factors: RiskSynthesis['factors'] = [];

    // Market regime risk
    if (marketRegime.current === 'risk_off') {
      riskScore += 25;
      factors.push({ factor: 'Risk-off market regime', contribution: 25, trend: 'stable' });
    } else if (marketRegime.current === 'transition') {
      riskScore += 15;
      factors.push({ factor: 'Market regime transition', contribution: 15, trend: 'increasing' });
    }

    // Asset concentration risk
    const highRiskAssets = assetSignals.filter(a => a.riskScore > 70);
    if (highRiskAssets.length > 0) {
      const contribution = highRiskAssets.length * 5;
      riskScore += contribution;
      factors.push({ 
        factor: `${highRiskAssets.length} high-risk assets`, 
        contribution, 
        trend: 'stable' 
      });
    }

    // Signal disagreement risk
    const lowAlignmentAssets = assetSignals.filter(a => a.sentimentAlignment < 0.5);
    if (lowAlignmentAssets.length > 2) {
      riskScore += 10;
      factors.push({ 
        factor: 'Agent disagreement on multiple assets', 
        contribution: 10, 
        trend: 'increasing' 
      });
    }

    const level = this.riskScoreToLevel(riskScore);
    const hedgeRecommendations = this.generateHedgeRecommendations(level, marketRegime);

    return {
      overallRiskLevel: level,
      riskScore: Math.min(100, riskScore),
      factors,
      hedgeRecommendations
    };
  }

  private riskScoreToLevel(score: number): RiskSynthesis['overallRiskLevel'] {
    if (score < 25) return 'low';
    if (score < 45) return 'moderate';
    if (score < 65) return 'elevated';
    if (score < 85) return 'high';
    return 'extreme';
  }

  private generateHedgeRecommendations(
    level: RiskSynthesis['overallRiskLevel'],
    regime: SynthesizedIntelligence['marketRegime']
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'elevated' || level === 'high' || level === 'extreme') {
      recommendations.push('Consider increasing cash allocation');
      recommendations.push('Add VIX calls for tail risk protection');
    }

    if (regime.current === 'risk_off') {
      recommendations.push('Rotate to defensive sectors (utilities, healthcare)');
      recommendations.push('Consider gold allocation for safe haven');
    }

    if (level === 'extreme') {
      recommendations.push('URGENT: Reduce overall exposure by 50%');
    }

    return recommendations;
  }

  /**
   * Identify trading opportunities
   */
  private identifyOpportunities(
    assetSignals: AssetSynthesis[],
    correlations: CorrelationMatrix
  ): OpportunitySignal[] {
    const opportunities: OpportunitySignal[] = [];

    // Momentum opportunities
    const strongBuys = assetSignals.filter(
      a => a.aggregatedSignal === 'strong_buy' && a.confidence > 70
    );
    
    for (const asset of strongBuys) {
      opportunities.push({
        id: `opp_momentum_${asset.asset}`,
        type: 'momentum',
        asset: asset.asset,
        expectedReturn: 0.05 + (asset.confidence / 1000),
        timeHorizon: '1-2 weeks',
        confidence: asset.confidence,
        supportingAgents: asset.contributingAgents.map(a => a.agentName),
        riskRewardRatio: 2.5
      });
    }

    // Mean reversion opportunities
    const strongSells = assetSignals.filter(
      a => a.aggregatedSignal === 'strong_sell' && a.sentimentAlignment < 0.4
    );
    
    for (const asset of strongSells) {
      opportunities.push({
        id: `opp_reversion_${asset.asset}`,
        type: 'mean_reversion',
        asset: asset.asset,
        expectedReturn: 0.03,
        timeHorizon: '3-5 days',
        confidence: 60,
        supportingAgents: ['Contrarian Agent'],
        riskRewardRatio: 1.5
      });
    }

    // Correlation arbitrage
    const anomalousCorrelations = correlations.pairs.filter(p => p.isAnomalous);
    for (const pair of anomalousCorrelations) {
      opportunities.push({
        id: `opp_arb_${pair.asset1}_${pair.asset2}`,
        type: 'arbitrage',
        asset: `${pair.asset1}/${pair.asset2}`,
        expectedReturn: 0.02,
        timeHorizon: '1-3 days',
        confidence: 65,
        supportingAgents: ['Correlation Agent'],
        riskRewardRatio: 3.0
      });
    }

    return opportunities.sort((a, b) => b.riskRewardRatio - a.riskRewardRatio);
  }

  /**
   * Generate warning signals
   */
  private generateWarnings(
    assetSignals: AssetSynthesis[],
    riskAssessment: RiskSynthesis
  ): WarningSignal[] {
    const warnings: WarningSignal[] = [];

    // Risk level warnings
    if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'extreme') {
      warnings.push({
        id: 'warn_risk_level',
        severity: riskAssessment.overallRiskLevel === 'extreme' ? 'critical' : 'warning',
        message: `Portfolio risk is ${riskAssessment.overallRiskLevel}. Consider reducing exposure.`,
        affectedAssets: assetSignals.filter(a => a.riskScore > 70).map(a => a.asset),
        source: 'Risk Synthesis Engine',
        actionRequired: riskAssessment.overallRiskLevel === 'extreme'
      });
    }

    // Agent disagreement warnings
    const lowAlignment = assetSignals.filter(a => a.sentimentAlignment < 0.3);
    for (const asset of lowAlignment) {
      warnings.push({
        id: `warn_disagreement_${asset.asset}`,
        severity: 'warning',
        message: `Significant agent disagreement on ${asset.asset}. Exercise caution.`,
        affectedAssets: [asset.asset],
        source: 'Consensus Engine',
        actionRequired: false
      });
    }

    return warnings;
  }

  /**
   * Generate action recommendations
   */
  private generateRecommendations(
    assetSignals: AssetSynthesis[],
    opportunities: OpportunitySignal[],
    warnings: WarningSignal[],
    marketRegime: SynthesizedIntelligence['marketRegime']
  ): ActionRecommendation[] {
    const recommendations: ActionRecommendation[] = [];

    // Buy recommendations from strong signals
    const buySignals = assetSignals.filter(
      a => (a.aggregatedSignal === 'strong_buy' || a.aggregatedSignal === 'buy') && 
           a.confidence > 65 &&
           a.riskScore < 70
    );

    for (const signal of buySignals.slice(0, 5)) {
      recommendations.push({
        id: `rec_buy_${signal.asset}`,
        action: 'buy',
        asset: signal.asset,
        urgency: signal.aggregatedSignal === 'strong_buy' ? 'today' : 'this_week',
        size: signal.confidence > 80 ? 'medium' : 'small',
        rationale: signal.keyInsights.join('. ') || 'Strong consensus signal',
        consensusScore: signal.confidence,
        requiresApproval: signal.confidence < 75
      });
    }

    // Sell recommendations
    const sellSignals = assetSignals.filter(
      a => (a.aggregatedSignal === 'strong_sell' || a.aggregatedSignal === 'sell') &&
           a.confidence > 65
    );

    for (const signal of sellSignals.slice(0, 3)) {
      recommendations.push({
        id: `rec_sell_${signal.asset}`,
        action: 'sell',
        asset: signal.asset,
        urgency: signal.aggregatedSignal === 'strong_sell' ? 'immediate' : 'today',
        size: 'medium',
        rationale: 'Bearish consensus from multiple agents',
        consensusScore: signal.confidence,
        requiresApproval: false
      });
    }

    // Hedge recommendations from warnings
    const criticalWarnings = warnings.filter(w => w.severity === 'critical');
    if (criticalWarnings.length > 0) {
      recommendations.push({
        id: 'rec_hedge_portfolio',
        action: 'hedge',
        asset: 'PORTFOLIO',
        urgency: 'immediate',
        size: 'large',
        rationale: 'Critical risk warnings detected',
        consensusScore: 90,
        requiresApproval: true
      });
    }

    return recommendations.sort((a, b) => {
      const urgencyOrder = { immediate: 0, today: 1, this_week: 2, opportunistic: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * Process voice command and return response
   */
  processVoiceCommand(command: VoiceCommand): VoiceResponse {
    const synthesis = this.synthesize();
    const lowerCommand = command.command.toLowerCase();

    // Status queries
    if (lowerCommand.includes('market') && lowerCommand.includes('status')) {
      return {
        text: `The market is currently in a ${synthesis.marketRegime.current.replace('_', ' ')} regime with ${synthesis.marketRegime.confidence}% confidence. ${synthesis.marketRegime.drivers[0] || ''}`,
        data: synthesis.marketRegime,
        suggestedActions: ['Show opportunities', 'Check risk level']
      };
    }

    // Risk queries
    if (lowerCommand.includes('risk')) {
      return {
        text: `Overall portfolio risk is ${synthesis.riskAssessment.overallRiskLevel} with a score of ${synthesis.riskAssessment.riskScore}. ${synthesis.riskAssessment.hedgeRecommendations[0] || ''}`,
        data: synthesis.riskAssessment,
        suggestedActions: ['Show hedge recommendations', 'View risk factors']
      };
    }

    // Opportunity queries
    if (lowerCommand.includes('opportunit')) {
      const topOpp = synthesis.opportunities[0];
      if (topOpp) {
        return {
          text: `Top opportunity: ${topOpp.type} trade on ${topOpp.asset} with ${Math.round(topOpp.expectedReturn * 100)}% expected return over ${topOpp.timeHorizon}.`,
          data: synthesis.opportunities.slice(0, 3),
          suggestedActions: ['Execute trade', 'Show more opportunities']
        };
      }
      return {
        text: 'No significant opportunities detected at this time.',
        suggestedActions: ['Check later', 'Adjust parameters']
      };
    }

    // Recommendation queries
    if (lowerCommand.includes('recommend') || lowerCommand.includes('what should')) {
      const topRec = synthesis.recommendedActions[0];
      if (topRec) {
        return {
          text: `Top recommendation: ${topRec.action.toUpperCase()} ${topRec.asset} with ${topRec.urgency} urgency. ${topRec.rationale}`,
          data: synthesis.recommendedActions.slice(0, 3),
          suggestedActions: ['Execute recommendation', 'Show alternatives']
        };
      }
      return {
        text: 'No specific recommendations at this time. Consider holding current positions.',
        suggestedActions: ['Review portfolio', 'Check opportunities']
      };
    }

    // Asset-specific queries
    const assetMatch = lowerCommand.match(/(?:what about|analyze|check)\s+(\w+)/i);
    if (assetMatch) {
      const asset = assetMatch[1].toUpperCase();
      const assetSignal = synthesis.assetSignals.find(
        a => a.asset.toUpperCase() === asset
      );
      
      if (assetSignal) {
        return {
          text: `${asset}: ${assetSignal.aggregatedSignal.replace('_', ' ').toUpperCase()} signal with ${assetSignal.confidence}% confidence. Risk score: ${assetSignal.riskScore}. ${assetSignal.keyInsights[0] || ''}`,
          data: assetSignal,
          suggestedActions: [`Trade ${asset}`, 'Show contributing agents']
        };
      }
      return {
        text: `No data available for ${asset}. Would you like me to run an analysis?`,
        suggestedActions: [`Analyze ${asset}`, 'Search for similar assets']
      };
    }

    // Default response
    return {
      text: "I can help you with market status, risk assessment, opportunities, recommendations, or specific asset analysis. What would you like to know?",
      suggestedActions: ['Market status', 'Show opportunities', 'Check risk']
    };
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(): {
    totalSignals: number;
    activeAgents: number;
    lastUpdate: Date | null;
    marketRegime: string;
    topOpportunity: string | null;
    riskLevel: string;
  } {
    let totalSignals = 0;
    let lastUpdate: Date | null = null;

    for (const signals of Array.from(this.signals.values())) {
      totalSignals += signals.length;
      for (const signal of signals) {
        if (!lastUpdate || signal.timestamp > lastUpdate) {
          lastUpdate = signal.timestamp;
        }
      }
    }

    const synthesis = this.synthesize();

    return {
      totalSignals,
      activeAgents: this.signals.size,
      lastUpdate,
      marketRegime: synthesis.marketRegime.current,
      topOpportunity: synthesis.opportunities[0]?.asset || null,
      riskLevel: synthesis.riskAssessment.overallRiskLevel
    };
  }
}

export const crossAgentSynthesis = new CrossAgentSynthesisService();
