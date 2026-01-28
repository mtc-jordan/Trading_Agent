/**
 * Unified Signal Aggregation Engine
 * 
 * Aggregates signals from all specialized agents across asset classes
 * and provides a unified interface for querying and executing trades.
 */

// Signal source types
type SignalSource = 
  | 'stock_consensus'
  | 'crypto_whale'
  | 'crypto_narrative'
  | 'crypto_yield'
  | 'options_greeks'
  | 'sentiment_social'
  | 'macro_regime'
  | 'swarm_debate'
  | 'earnings_sentiment'
  | 'sec_filings';

export interface UnifiedSignal {
  id: string;
  source: SignalSource;
  asset: string;
  assetClass: 'stock' | 'crypto' | 'options' | 'commodity' | 'forex';
  direction: 'long' | 'short' | 'neutral';
  strength: number; // 0-100
  confidence: number; // 0-100
  timeframe: 'scalp' | 'intraday' | 'swing' | 'position' | 'investment';
  metadata: {
    agentName: string;
    reasoning: string;
    keyFactors: string[];
    supportingData: Record<string, unknown>;
  };
  riskMetrics: {
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    avgHoldingPeriod: string;
  };
  execution: {
    entryPrice?: number;
    targetPrice?: number;
    stopLoss?: number;
    positionSize?: number;
    urgency: 'immediate' | 'today' | 'this_week' | 'opportunistic';
  };
  timestamp: Date;
  expiresAt: Date;
}

interface AggregatedView {
  asset: string;
  signals: UnifiedSignal[];
  consensus: {
    direction: 'long' | 'short' | 'neutral';
    strength: number;
    confidence: number;
    agreementScore: number;
  };
  conflictingSignals: {
    bullish: UnifiedSignal[];
    bearish: UnifiedSignal[];
    neutral: UnifiedSignal[];
  };
  recommendedAction: {
    action: 'buy' | 'sell' | 'hold' | 'close' | 'hedge';
    size: 'small' | 'medium' | 'large';
    rationale: string;
  };
}

interface SignalFilter {
  assets?: string[];
  assetClasses?: AggregatedView['asset'][];
  sources?: SignalSource[];
  minStrength?: number;
  minConfidence?: number;
  timeframes?: UnifiedSignal['timeframe'][];
  direction?: UnifiedSignal['direction'];
  maxAge?: number; // milliseconds
}

interface SignalStats {
  totalSignals: number;
  bySource: Record<SignalSource, number>;
  byAssetClass: Record<string, number>;
  byDirection: {
    long: number;
    short: number;
    neutral: number;
  };
  avgStrength: number;
  avgConfidence: number;
  topAssets: { asset: string; signalCount: number; avgStrength: number }[];
}

// Real-time signal stream
interface SignalStreamConfig {
  filter?: SignalFilter;
  onSignal: (signal: UnifiedSignal) => void;
  onAggregation: (view: AggregatedView) => void;
}

export class UnifiedSignalAggregator {
  private signals: Map<string, UnifiedSignal> = new Map();
  private assetViews: Map<string, AggregatedView> = new Map();
  private subscribers: Map<string, SignalStreamConfig> = new Map();
  private readonly MAX_SIGNALS = 10000;
  private readonly DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Source weights for consensus calculation
  private readonly sourceWeights: Record<SignalSource, number> = {
    stock_consensus: 0.15,
    crypto_whale: 0.12,
    crypto_narrative: 0.08,
    crypto_yield: 0.10,
    options_greeks: 0.12,
    sentiment_social: 0.08,
    macro_regime: 0.15,
    swarm_debate: 0.10,
    earnings_sentiment: 0.05,
    sec_filings: 0.05
  };

  /**
   * Add a new signal to the aggregator
   */
  addSignal(signal: Omit<UnifiedSignal, 'id' | 'expiresAt'>): UnifiedSignal {
    const id = `sig_${signal.source}_${signal.asset}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + this.DEFAULT_EXPIRY_MS);
    
    const fullSignal: UnifiedSignal = {
      ...signal,
      id,
      expiresAt
    };

    this.signals.set(id, fullSignal);
    
    // Update aggregated view for this asset
    this.updateAssetView(signal.asset);
    
    // Notify subscribers
    this.notifySubscribers(fullSignal);
    
    // Cleanup old signals if needed
    if (this.signals.size > this.MAX_SIGNALS) {
      this.cleanupExpiredSignals();
    }

    return fullSignal;
  }

  /**
   * Batch add signals
   */
  addSignals(signals: Omit<UnifiedSignal, 'id' | 'expiresAt'>[]): UnifiedSignal[] {
    return signals.map(s => this.addSignal(s));
  }

  /**
   * Get all signals matching filter
   */
  getSignals(filter?: SignalFilter): UnifiedSignal[] {
    let signals = Array.from(this.signals.values());
    
    // Remove expired signals
    const now = Date.now();
    signals = signals.filter(s => s.expiresAt.getTime() > now);
    
    if (!filter) return signals;

    if (filter.assets && filter.assets.length > 0) {
      const assetsLower = filter.assets.map(a => a.toLowerCase());
      signals = signals.filter(s => assetsLower.includes(s.asset.toLowerCase()));
    }

    if (filter.assetClasses && filter.assetClasses.length > 0) {
      signals = signals.filter(s => filter.assetClasses!.includes(s.assetClass as string));
    }

    if (filter.sources && filter.sources.length > 0) {
      signals = signals.filter(s => filter.sources!.includes(s.source));
    }

    if (filter.minStrength !== undefined) {
      signals = signals.filter(s => s.strength >= filter.minStrength!);
    }

    if (filter.minConfidence !== undefined) {
      signals = signals.filter(s => s.confidence >= filter.minConfidence!);
    }

    if (filter.timeframes && filter.timeframes.length > 0) {
      signals = signals.filter(s => filter.timeframes!.includes(s.timeframe));
    }

    if (filter.direction) {
      signals = signals.filter(s => s.direction === filter.direction);
    }

    if (filter.maxAge !== undefined) {
      const cutoff = now - filter.maxAge;
      signals = signals.filter(s => s.timestamp.getTime() > cutoff);
    }

    return signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get aggregated view for an asset
   */
  getAssetView(asset: string): AggregatedView | null {
    const key = asset.toUpperCase();
    
    // Check if view exists and is fresh
    const existing = this.assetViews.get(key);
    if (existing) {
      return existing;
    }

    // Build view if we have signals
    const signals = this.getSignals({ assets: [asset] });
    if (signals.length === 0) return null;

    return this.buildAssetView(asset, signals);
  }

  /**
   * Get aggregated views for multiple assets
   */
  getMultiAssetView(assets: string[]): AggregatedView[] {
    return assets
      .map(a => this.getAssetView(a))
      .filter((v): v is AggregatedView => v !== null);
  }

  /**
   * Get top signals by strength
   */
  getTopSignals(limit: number = 10, filter?: SignalFilter): UnifiedSignal[] {
    const signals = this.getSignals(filter);
    return signals
      .sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence))
      .slice(0, limit);
  }

  /**
   * Get conflicting signals (assets with mixed signals)
   */
  getConflictingSignals(): AggregatedView[] {
    const views = Array.from(this.assetViews.values());
    return views.filter(v => 
      v.conflictingSignals.bullish.length > 0 && 
      v.conflictingSignals.bearish.length > 0 &&
      v.consensus.agreementScore < 0.5
    );
  }

  /**
   * Get high-conviction signals (strong agreement)
   */
  getHighConvictionSignals(minAgreement: number = 0.8): AggregatedView[] {
    const views = Array.from(this.assetViews.values());
    return views.filter(v => v.consensus.agreementScore >= minAgreement);
  }

  /**
   * Get signal statistics
   */
  getStats(): SignalStats {
    const signals = this.getSignals();
    
    const bySource: Record<SignalSource, number> = {
      stock_consensus: 0,
      crypto_whale: 0,
      crypto_narrative: 0,
      crypto_yield: 0,
      options_greeks: 0,
      sentiment_social: 0,
      macro_regime: 0,
      swarm_debate: 0,
      earnings_sentiment: 0,
      sec_filings: 0
    };

    const byAssetClass: Record<string, number> = {};
    const byDirection = { long: 0, short: 0, neutral: 0 };
    const assetCounts: Record<string, { count: number; totalStrength: number }> = {};
    
    let totalStrength = 0;
    let totalConfidence = 0;

    for (const signal of signals) {
      bySource[signal.source]++;
      byAssetClass[signal.assetClass] = (byAssetClass[signal.assetClass] || 0) + 1;
      byDirection[signal.direction]++;
      totalStrength += signal.strength;
      totalConfidence += signal.confidence;

      if (!assetCounts[signal.asset]) {
        assetCounts[signal.asset] = { count: 0, totalStrength: 0 };
      }
      assetCounts[signal.asset].count++;
      assetCounts[signal.asset].totalStrength += signal.strength;
    }

    const topAssets = Object.entries(assetCounts)
      .map(([asset, data]) => ({
        asset,
        signalCount: data.count,
        avgStrength: data.totalStrength / data.count
      }))
      .sort((a, b) => b.signalCount - a.signalCount)
      .slice(0, 10);

    return {
      totalSignals: signals.length,
      bySource,
      byAssetClass,
      byDirection,
      avgStrength: signals.length > 0 ? totalStrength / signals.length : 0,
      avgConfidence: signals.length > 0 ? totalConfidence / signals.length : 0,
      topAssets
    };
  }

  /**
   * Subscribe to signal stream
   */
  subscribe(subscriberId: string, config: SignalStreamConfig): void {
    this.subscribers.set(subscriberId, config);
  }

  /**
   * Unsubscribe from signal stream
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Update aggregated view for an asset
   */
  private updateAssetView(asset: string): void {
    const signals = this.getSignals({ assets: [asset] });
    if (signals.length === 0) {
      this.assetViews.delete(asset.toUpperCase());
      return;
    }

    const view = this.buildAssetView(asset, signals);
    this.assetViews.set(asset.toUpperCase(), view);

    // Notify subscribers of aggregation update
    for (const config of Array.from(this.subscribers.values())) {
      if (this.matchesFilter(signals[0], config.filter)) {
        config.onAggregation(view);
      }
    }
  }

  /**
   * Build aggregated view from signals
   */
  private buildAssetView(asset: string, signals: UnifiedSignal[]): AggregatedView {
    const bullish = signals.filter(s => s.direction === 'long');
    const bearish = signals.filter(s => s.direction === 'short');
    const neutral = signals.filter(s => s.direction === 'neutral');

    // Calculate weighted consensus
    let weightedBullish = 0;
    let weightedBearish = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = this.sourceWeights[signal.source] * (signal.confidence / 100);
      totalWeight += weight;
      
      if (signal.direction === 'long') {
        weightedBullish += weight * signal.strength;
      } else if (signal.direction === 'short') {
        weightedBearish += weight * signal.strength;
      }
    }

    const netScore = totalWeight > 0 
      ? (weightedBullish - weightedBearish) / totalWeight 
      : 0;

    const direction: 'long' | 'short' | 'neutral' = 
      netScore > 20 ? 'long' : 
      netScore < -20 ? 'short' : 
      'neutral';

    const strength = Math.abs(netScore);
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    // Calculate agreement score (how much signals agree)
    const maxCount = Math.max(bullish.length, bearish.length, neutral.length);
    const agreementScore = signals.length > 0 ? maxCount / signals.length : 0;

    // Determine recommended action
    const recommendedAction = this.determineAction(direction, strength, avgConfidence, agreementScore);

    return {
      asset: asset.toUpperCase(),
      signals,
      consensus: {
        direction,
        strength,
        confidence: avgConfidence,
        agreementScore
      },
      conflictingSignals: {
        bullish,
        bearish,
        neutral
      },
      recommendedAction
    };
  }

  /**
   * Determine recommended action based on consensus
   */
  private determineAction(
    direction: 'long' | 'short' | 'neutral',
    strength: number,
    confidence: number,
    agreement: number
  ): AggregatedView['recommendedAction'] {
    // Low agreement = hold
    if (agreement < 0.4) {
      return {
        action: 'hold',
        size: 'small',
        rationale: 'Mixed signals - waiting for clearer consensus'
      };
    }

    // Neutral direction = hold
    if (direction === 'neutral') {
      return {
        action: 'hold',
        size: 'small',
        rationale: 'No clear directional bias'
      };
    }

    // Strong conviction
    if (strength > 60 && confidence > 70 && agreement > 0.7) {
      return {
        action: direction === 'long' ? 'buy' : 'sell',
        size: 'large',
        rationale: `Strong ${direction} consensus with high confidence`
      };
    }

    // Medium conviction
    if (strength > 40 && confidence > 50) {
      return {
        action: direction === 'long' ? 'buy' : 'sell',
        size: 'medium',
        rationale: `Moderate ${direction} signal with decent agreement`
      };
    }

    // Weak conviction
    return {
      action: direction === 'long' ? 'buy' : 'sell',
      size: 'small',
      rationale: `Weak ${direction} signal - consider small position`
    };
  }

  /**
   * Notify subscribers of new signal
   */
  private notifySubscribers(signal: UnifiedSignal): void {
    for (const config of Array.from(this.subscribers.values())) {
      if (this.matchesFilter(signal, config.filter)) {
        config.onSignal(signal);
      }
    }
  }

  /**
   * Check if signal matches filter
   */
  private matchesFilter(signal: UnifiedSignal, filter?: SignalFilter): boolean {
    if (!filter) return true;

    if (filter.assets && filter.assets.length > 0) {
      const assetsLower = filter.assets.map(a => a.toLowerCase());
      if (!assetsLower.includes(signal.asset.toLowerCase())) return false;
    }

    if (filter.sources && filter.sources.length > 0) {
      if (!filter.sources.includes(signal.source)) return false;
    }

    if (filter.minStrength !== undefined && signal.strength < filter.minStrength) {
      return false;
    }

    if (filter.minConfidence !== undefined && signal.confidence < filter.minConfidence) {
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired signals
   */
  private cleanupExpiredSignals(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, signal] of Array.from(this.signals.entries())) {
      if (signal.expiresAt.getTime() < now) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.signals.delete(id);
    }

    // Rebuild affected asset views
    const affectedAssets = new Set<string>();
    for (const id of toDelete) {
      const parts = id.split('_');
      if (parts.length >= 3) {
        affectedAssets.add(parts[2]);
      }
    }

    for (const asset of Array.from(affectedAssets)) {
      this.updateAssetView(asset);
    }
  }

  /**
   * Clear all signals
   */
  clear(): void {
    this.signals.clear();
    this.assetViews.clear();
  }

  /**
   * Export signals for persistence
   */
  exportSignals(): UnifiedSignal[] {
    return Array.from(this.signals.values());
  }

  /**
   * Import signals from persistence
   */
  importSignals(signals: UnifiedSignal[]): void {
    for (const signal of signals) {
      this.signals.set(signal.id, signal);
    }
    
    // Rebuild all asset views
    const assets = new Set(signals.map(s => s.asset));
    for (const asset of Array.from(assets)) {
      this.updateAssetView(asset);
    }
  }
}

export const unifiedSignalAggregator = new UnifiedSignalAggregator();
