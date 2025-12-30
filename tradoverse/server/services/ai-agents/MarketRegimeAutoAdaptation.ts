/**
 * Market Regime Auto-Adaptation Service
 * 
 * Automatically detects market regime changes and adjusts agent weights accordingly.
 * Based on research from:
 * - "Regime-Switching Models for Financial Time Series" (Hamilton, 1989)
 * - "Machine Learning for Asset Managers" (López de Prado, 2020)
 * - "Adaptive Asset Allocation" (Butler et al., 2012)
 */

import { invokeLLM } from '../../_core/llm';

// Market regime types
export type MarketRegime = 
  | 'bull_trending'      // Strong upward trend
  | 'bear_trending'      // Strong downward trend
  | 'sideways_range'     // Range-bound, low volatility
  | 'high_volatility'    // High volatility, uncertain direction
  | 'crisis'             // Market crisis/crash
  | 'recovery'           // Recovery from crisis
  | 'euphoria'           // Extreme bullishness (potential top)
  | 'capitulation';      // Extreme bearishness (potential bottom)

// Agent weight configuration
export interface AgentWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  risk: number;
  regime: number;
  execution: number;
}

// Regime detection result
export interface RegimeDetectionResult {
  currentRegime: MarketRegime;
  confidence: number;
  previousRegime: MarketRegime | null;
  regimeChangeDetected: boolean;
  indicators: {
    volatility: number;
    trend: number;
    momentum: number;
    sentiment: number;
    volume: number;
  };
  timestamp: number;
}

// Weight adjustment recommendation
export interface WeightAdjustmentRecommendation {
  regime: MarketRegime;
  recommendedWeights: AgentWeights;
  previousWeights: AgentWeights;
  adjustmentReason: string;
  expectedImpact: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Auto-adaptation configuration
export interface AutoAdaptationConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  minConfidenceThreshold: number;
  cooldownPeriodMs: number;
  maxWeightChange: number;
  notifyOnChange: boolean;
}

// Regime history entry
export interface RegimeHistoryEntry {
  regime: MarketRegime;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  weights: AgentWeights;
  performance: {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
  } | null;
}

// Default agent weights by regime (research-based optimal allocations)
const REGIME_WEIGHT_PRESETS: Record<MarketRegime, AgentWeights> = {
  bull_trending: {
    technical: 0.25,    // Follow trends
    fundamental: 0.20,  // Value matters less in bull
    sentiment: 0.15,    // Sentiment confirms trend
    risk: 0.10,         // Lower risk focus
    regime: 0.15,       // Monitor for changes
    execution: 0.15     // Timing matters
  },
  bear_trending: {
    technical: 0.20,    // Identify support levels
    fundamental: 0.25,  // Value becomes important
    sentiment: 0.10,    // Sentiment often wrong at bottoms
    risk: 0.25,         // High risk focus
    regime: 0.10,       // Monitor for reversal
    execution: 0.10     // Quick exits needed
  },
  sideways_range: {
    technical: 0.30,    // Range trading signals
    fundamental: 0.15,  // Less relevant in range
    sentiment: 0.10,    // Noise in range
    risk: 0.15,         // Moderate risk
    regime: 0.15,       // Watch for breakout
    execution: 0.15     // Entry/exit timing
  },
  high_volatility: {
    technical: 0.15,    // Signals less reliable
    fundamental: 0.15,  // Long-term view
    sentiment: 0.15,    // Extreme sentiment
    risk: 0.30,         // Maximum risk focus
    regime: 0.15,       // Regime shifts likely
    execution: 0.10     // Difficult execution
  },
  crisis: {
    technical: 0.10,    // Patterns break down
    fundamental: 0.10,  // Fundamentals ignored
    sentiment: 0.15,    // Panic indicators
    risk: 0.40,         // Survival mode
    regime: 0.15,       // Watch for bottom
    execution: 0.10     // Liquidity issues
  },
  recovery: {
    technical: 0.25,    // New trends forming
    fundamental: 0.25,  // Value opportunities
    sentiment: 0.15,    // Improving sentiment
    risk: 0.15,         // Moderate caution
    regime: 0.10,       // Confirm recovery
    execution: 0.10     // Build positions
  },
  euphoria: {
    technical: 0.15,    // Overbought signals
    fundamental: 0.20,  // Valuation warnings
    sentiment: 0.25,    // Extreme greed
    risk: 0.25,         // High risk awareness
    regime: 0.10,       // Top detection
    execution: 0.05     // Reduce positions
  },
  capitulation: {
    technical: 0.20,    // Oversold signals
    fundamental: 0.30,  // Deep value
    sentiment: 0.20,    // Extreme fear
    risk: 0.15,         // Calculated risk
    regime: 0.10,       // Bottom detection
    execution: 0.05     // Accumulate slowly
  }
};

// Regime detection thresholds
const REGIME_THRESHOLDS = {
  volatility: {
    low: 15,
    medium: 25,
    high: 40,
    extreme: 60
  },
  trend: {
    strongBull: 0.7,
    bull: 0.3,
    neutral: -0.3,
    bear: -0.7
  },
  sentiment: {
    euphoria: 80,
    bullish: 60,
    neutral: 40,
    bearish: 20,
    capitulation: 10
  }
};

// In-memory storage for regime tracking
const regimeHistory: RegimeHistoryEntry[] = [];
let currentRegimeState: RegimeDetectionResult | null = null;
let lastAdaptationTime = 0;

// User configurations
const userConfigs = new Map<string, AutoAdaptationConfig>();

/**
 * Get default auto-adaptation configuration
 */
export function getDefaultConfig(): AutoAdaptationConfig {
  return {
    enabled: true,
    sensitivity: 'medium',
    minConfidenceThreshold: 60,
    cooldownPeriodMs: 3600000, // 1 hour
    maxWeightChange: 0.15,
    notifyOnChange: true
  };
}

/**
 * Get user's auto-adaptation configuration
 */
export function getUserConfig(userId: string): AutoAdaptationConfig {
  return userConfigs.get(userId) || getDefaultConfig();
}

/**
 * Update user's auto-adaptation configuration
 */
export function updateUserConfig(userId: string, config: Partial<AutoAdaptationConfig>): AutoAdaptationConfig {
  const currentConfig = getUserConfig(userId);
  const newConfig = { ...currentConfig, ...config };
  userConfigs.set(userId, newConfig);
  return newConfig;
}

/**
 * Calculate technical indicators for regime detection
 */
function calculateIndicators(marketData: {
  prices: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
}): RegimeDetectionResult['indicators'] {
  const { prices, volumes, highs, lows } = marketData;
  
  if (prices.length < 20) {
    return { volatility: 20, trend: 0, momentum: 0, sentiment: 50, volume: 1 };
  }

  // Calculate volatility (standard deviation of returns)
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

  // Calculate trend (linear regression slope)
  const n = prices.length;
  const xSum = (n * (n - 1)) / 2;
  const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;
  const ySum = prices.reduce((a, b) => a + b, 0);
  const xySum = prices.reduce((sum, p, i) => sum + p * i, 0);
  const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
  const trend = slope / (ySum / n); // Normalized slope

  // Calculate momentum (ROC - Rate of Change)
  const momentum = (prices[prices.length - 1] - prices[0]) / prices[0];

  // Calculate volume trend
  const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const volumeRatio = recentVolume / avgVolume;

  // Estimate sentiment from price action
  const bullishDays = prices.slice(1).filter((p, i) => p > prices[i]).length;
  const sentiment = (bullishDays / (prices.length - 1)) * 100;

  return {
    volatility: Math.min(100, volatility),
    trend: Math.max(-1, Math.min(1, trend * 100)),
    momentum: Math.max(-1, Math.min(1, momentum)),
    sentiment: Math.min(100, Math.max(0, sentiment)),
    volume: volumeRatio
  };
}

/**
 * Detect current market regime based on indicators
 */
function detectRegimeFromIndicators(indicators: RegimeDetectionResult['indicators']): {
  regime: MarketRegime;
  confidence: number;
} {
  const { volatility, trend, momentum, sentiment, volume } = indicators;

  // Crisis detection (highest priority)
  if (volatility > REGIME_THRESHOLDS.volatility.extreme && trend < REGIME_THRESHOLDS.trend.bear) {
    return { regime: 'crisis', confidence: 85 };
  }

  // Capitulation detection
  if (sentiment < REGIME_THRESHOLDS.sentiment.capitulation && volatility > REGIME_THRESHOLDS.volatility.high) {
    return { regime: 'capitulation', confidence: 80 };
  }

  // Euphoria detection
  if (sentiment > REGIME_THRESHOLDS.sentiment.euphoria && trend > REGIME_THRESHOLDS.trend.bull) {
    return { regime: 'euphoria', confidence: 75 };
  }

  // High volatility regime
  if (volatility > REGIME_THRESHOLDS.volatility.high) {
    return { regime: 'high_volatility', confidence: 70 };
  }

  // Bull trending
  if (trend > REGIME_THRESHOLDS.trend.strongBull && momentum > 0.1) {
    return { regime: 'bull_trending', confidence: 75 };
  }

  // Bear trending
  if (trend < REGIME_THRESHOLDS.trend.bear && momentum < -0.1) {
    return { regime: 'bear_trending', confidence: 75 };
  }

  // Recovery (improving from low levels)
  if (trend > REGIME_THRESHOLDS.trend.bull && sentiment > 40 && sentiment < 60) {
    return { regime: 'recovery', confidence: 65 };
  }

  // Sideways range (default)
  if (Math.abs(trend) < REGIME_THRESHOLDS.trend.bull && volatility < REGIME_THRESHOLDS.volatility.medium) {
    return { regime: 'sideways_range', confidence: 60 };
  }

  // Default to sideways with lower confidence
  return { regime: 'sideways_range', confidence: 50 };
}

/**
 * Detect market regime from market data
 */
export async function detectRegime(marketData: {
  prices: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
  symbol?: string;
}): Promise<RegimeDetectionResult> {
  const indicators = calculateIndicators(marketData);
  const { regime, confidence } = detectRegimeFromIndicators(indicators);

  const previousRegime = currentRegimeState?.currentRegime || null;
  const regimeChangeDetected = previousRegime !== null && previousRegime !== regime;

  const result: RegimeDetectionResult = {
    currentRegime: regime,
    confidence,
    previousRegime,
    regimeChangeDetected,
    indicators,
    timestamp: Date.now()
  };

  // Update current state
  if (regimeChangeDetected && currentRegimeState) {
    // Close previous regime entry
    const lastEntry = regimeHistory[regimeHistory.length - 1];
    if (lastEntry && lastEntry.endTime === null) {
      lastEntry.endTime = Date.now();
      lastEntry.duration = lastEntry.endTime - lastEntry.startTime;
    }

    // Start new regime entry
    regimeHistory.push({
      regime,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      weights: REGIME_WEIGHT_PRESETS[regime],
      performance: null
    });
  } else if (!currentRegimeState) {
    // First detection
    regimeHistory.push({
      regime,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      weights: REGIME_WEIGHT_PRESETS[regime],
      performance: null
    });
  }

  currentRegimeState = result;
  return result;
}

/**
 * Get recommended weights for current regime
 */
export function getRecommendedWeights(regime: MarketRegime): AgentWeights {
  return { ...REGIME_WEIGHT_PRESETS[regime] };
}

/**
 * Generate weight adjustment recommendation
 */
export function generateWeightAdjustment(
  currentWeights: AgentWeights,
  targetRegime: MarketRegime,
  config: AutoAdaptationConfig
): WeightAdjustmentRecommendation {
  const recommendedWeights = getRecommendedWeights(targetRegime);
  
  // Apply max weight change constraint
  const adjustedWeights: AgentWeights = { ...currentWeights };
  for (const key of Object.keys(recommendedWeights) as (keyof AgentWeights)[]) {
    const diff = recommendedWeights[key] - currentWeights[key];
    const maxDiff = config.maxWeightChange;
    adjustedWeights[key] = currentWeights[key] + Math.max(-maxDiff, Math.min(maxDiff, diff));
  }

  // Normalize weights to sum to 1
  const total = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(adjustedWeights) as (keyof AgentWeights)[]) {
    adjustedWeights[key] = adjustedWeights[key] / total;
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (['crisis', 'capitulation', 'high_volatility'].includes(targetRegime)) {
    riskLevel = 'high';
  } else if (['sideways_range', 'recovery'].includes(targetRegime)) {
    riskLevel = 'low';
  }

  // Generate adjustment reason
  const adjustmentReason = getAdjustmentReason(targetRegime, currentWeights, adjustedWeights);
  const expectedImpact = getExpectedImpact(targetRegime);

  return {
    regime: targetRegime,
    recommendedWeights: adjustedWeights,
    previousWeights: currentWeights,
    adjustmentReason,
    expectedImpact,
    riskLevel
  };
}

/**
 * Get human-readable adjustment reason
 */
function getAdjustmentReason(
  regime: MarketRegime,
  oldWeights: AgentWeights,
  newWeights: AgentWeights
): string {
  const reasons: Record<MarketRegime, string> = {
    bull_trending: 'Market showing strong bullish trend. Increasing technical and sentiment weights to capture momentum.',
    bear_trending: 'Market in bearish trend. Increasing risk and fundamental weights for protection and value identification.',
    sideways_range: 'Market range-bound. Increasing technical weight for range trading signals.',
    high_volatility: 'High volatility detected. Significantly increasing risk weight for protection.',
    crisis: 'Crisis conditions detected. Maximum risk weight for capital preservation.',
    recovery: 'Recovery phase identified. Balanced approach with focus on fundamentals and technicals.',
    euphoria: 'Extreme bullish sentiment detected. Increasing sentiment and risk weights to identify potential top.',
    capitulation: 'Extreme fear detected. Increasing fundamental weight to identify deep value opportunities.'
  };

  return reasons[regime];
}

/**
 * Get expected impact description
 */
function getExpectedImpact(regime: MarketRegime): string {
  const impacts: Record<MarketRegime, string> = {
    bull_trending: 'Expected to capture more upside momentum with slightly higher risk tolerance.',
    bear_trending: 'Expected to reduce drawdowns and identify value opportunities during decline.',
    sideways_range: 'Expected to profit from range-bound conditions with mean reversion strategies.',
    high_volatility: 'Expected to significantly reduce position sizes and protect capital.',
    crisis: 'Expected to minimize losses and preserve capital during market stress.',
    recovery: 'Expected to gradually build positions as market stabilizes.',
    euphoria: 'Expected to take profits and reduce exposure before potential correction.',
    capitulation: 'Expected to identify bottom and accumulate quality assets at deep discounts.'
  };

  return impacts[regime];
}

/**
 * Auto-adapt weights based on regime change
 */
export async function autoAdaptWeights(
  userId: string,
  currentWeights: AgentWeights,
  marketData: {
    prices: number[];
    volumes: number[];
    highs: number[];
    lows: number[];
  }
): Promise<{
  adapted: boolean;
  recommendation: WeightAdjustmentRecommendation | null;
  reason: string;
}> {
  const config = getUserConfig(userId);

  // Check if auto-adaptation is enabled
  if (!config.enabled) {
    return { adapted: false, recommendation: null, reason: 'Auto-adaptation is disabled' };
  }

  // Check cooldown period
  const now = Date.now();
  if (now - lastAdaptationTime < config.cooldownPeriodMs) {
    return { adapted: false, recommendation: null, reason: 'Cooldown period active' };
  }

  // Detect current regime
  const regimeResult = await detectRegime(marketData);

  // Check confidence threshold
  if (regimeResult.confidence < config.minConfidenceThreshold) {
    return { 
      adapted: false, 
      recommendation: null, 
      reason: `Confidence (${regimeResult.confidence}%) below threshold (${config.minConfidenceThreshold}%)` 
    };
  }

  // Check if regime changed
  if (!regimeResult.regimeChangeDetected) {
    return { adapted: false, recommendation: null, reason: 'No regime change detected' };
  }

  // Generate weight adjustment
  const recommendation = generateWeightAdjustment(
    currentWeights,
    regimeResult.currentRegime,
    config
  );

  // Update last adaptation time
  lastAdaptationTime = now;

  return {
    adapted: true,
    recommendation,
    reason: `Regime changed from ${regimeResult.previousRegime} to ${regimeResult.currentRegime}`
  };
}

/**
 * Get regime history
 */
export function getRegimeHistory(limit: number = 50): RegimeHistoryEntry[] {
  return regimeHistory.slice(-limit);
}

/**
 * Get current regime state
 */
export function getCurrentRegimeState(): RegimeDetectionResult | null {
  return currentRegimeState;
}

/**
 * Get regime statistics
 */
export function getRegimeStatistics(): {
  totalRegimeChanges: number;
  averageRegimeDuration: number;
  regimeDistribution: Record<MarketRegime, number>;
  currentStreak: number;
} {
  const completedRegimes = regimeHistory.filter(r => r.duration !== null);
  
  const totalRegimeChanges = regimeHistory.length - 1;
  const averageRegimeDuration = completedRegimes.length > 0
    ? completedRegimes.reduce((sum, r) => sum + (r.duration || 0), 0) / completedRegimes.length
    : 0;

  const regimeDistribution: Record<MarketRegime, number> = {
    bull_trending: 0,
    bear_trending: 0,
    sideways_range: 0,
    high_volatility: 0,
    crisis: 0,
    recovery: 0,
    euphoria: 0,
    capitulation: 0
  };

  regimeHistory.forEach(r => {
    regimeDistribution[r.regime]++;
  });

  // Calculate current streak
  let currentStreak = 0;
  if (regimeHistory.length > 0) {
    const currentRegime = regimeHistory[regimeHistory.length - 1].regime;
    for (let i = regimeHistory.length - 1; i >= 0; i--) {
      if (regimeHistory[i].regime === currentRegime) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    totalRegimeChanges,
    averageRegimeDuration,
    regimeDistribution,
    currentStreak
  };
}

/**
 * Get all regime presets
 */
export function getAllRegimePresets(): Record<MarketRegime, AgentWeights> {
  return { ...REGIME_WEIGHT_PRESETS };
}

/**
 * Validate custom weights
 */
export function validateWeights(weights: AgentWeights): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all weights are present
  const requiredKeys: (keyof AgentWeights)[] = ['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution'];
  for (const key of requiredKeys) {
    if (typeof weights[key] !== 'number') {
      errors.push(`Missing or invalid weight for ${key}`);
    } else if (weights[key] < 0 || weights[key] > 1) {
      errors.push(`Weight for ${key} must be between 0 and 1`);
    }
  }

  // Check sum is approximately 1
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.01) {
    errors.push(`Weights must sum to 1 (current sum: ${sum.toFixed(3)})`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Use LLM to enhance regime analysis
 */
export async function enhanceRegimeAnalysis(
  regime: MarketRegime,
  indicators: RegimeDetectionResult['indicators'],
  symbol?: string
): Promise<{
  analysis: string;
  tradingRecommendations: string[];
  riskWarnings: string[];
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a market regime analyst. Provide concise analysis and recommendations based on detected market regime and indicators.
Your response must be a JSON object with:
- analysis: Brief analysis of current market conditions (2-3 sentences)
- tradingRecommendations: Array of 3-4 specific trading recommendations
- riskWarnings: Array of 2-3 risk warnings to consider`
        },
        {
          role: 'user',
          content: `Market Regime: ${regime}
${symbol ? `Symbol: ${symbol}` : ''}
Indicators:
- Volatility: ${indicators.volatility.toFixed(1)}%
- Trend: ${indicators.trend.toFixed(2)}
- Momentum: ${indicators.momentum.toFixed(2)}
- Sentiment: ${indicators.sentiment.toFixed(1)}
- Volume Ratio: ${indicators.volume.toFixed(2)}

Provide your analysis and recommendations.`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'regime_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              analysis: { type: 'string' },
              tradingRecommendations: { type: 'array', items: { type: 'string' } },
              riskWarnings: { type: 'array', items: { type: 'string' } }
            },
            required: ['analysis', 'tradingRecommendations', 'riskWarnings'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(typeof content === 'string' ? content : '{}');
  } catch (error) {
    return {
      analysis: `Market is currently in ${regime.replace('_', ' ')} regime with ${indicators.volatility.toFixed(1)}% volatility.`,
      tradingRecommendations: [
        'Monitor key support and resistance levels',
        'Adjust position sizes according to volatility',
        'Consider hedging strategies if appropriate'
      ],
      riskWarnings: [
        'Past regime patterns may not predict future behavior',
        'Regime transitions can be sudden and unpredictable'
      ]
    };
  }
}

/**
 * Clear regime history (for testing)
 */
export function clearRegimeHistory(): void {
  regimeHistory.length = 0;
  currentRegimeState = null;
  lastAdaptationTime = 0;
}
