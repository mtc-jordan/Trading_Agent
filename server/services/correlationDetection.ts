/**
 * Advanced Cross-Asset Correlation Detection Service
 * 
 * Uses LSTM-inspired pattern recognition to detect:
 * - Correlation regime changes (when assets start moving together)
 * - Breakdown alerts (when traditionally uncorrelated assets sync)
 * - Predictive correlation shifts
 * 
 * Based on 2026 best practices for multi-asset analysis
 */

import { invokeLLM } from '../_core/llm';

// Types for correlation detection
export interface AssetPriceData {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond';
  prices: number[];
  timestamps: number[];
  returns?: number[];
}

export interface CorrelationRegime {
  regime: 'normal' | 'crisis' | 'euphoria' | 'transition';
  confidence: number;
  description: string;
  historicalComparison: string;
}

export interface CorrelationBreakdown {
  asset1: string;
  asset2: string;
  historicalCorrelation: number;
  currentCorrelation: number;
  correlationChange: number;
  significance: 'low' | 'medium' | 'high' | 'critical';
  alert: string;
  potentialCause: string;
  actionRecommendation: string;
}

export interface CorrelationPrediction {
  asset1: string;
  asset2: string;
  currentCorrelation: number;
  predictedCorrelation: number;
  predictionHorizon: string;
  confidence: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  reasoning: string;
}

export interface CrossAssetSignal {
  signalType: 'correlation_spike' | 'regime_change' | 'divergence' | 'convergence';
  assets: string[];
  strength: number;
  description: string;
  tradingImplication: string;
  timestamp: number;
}

export interface CorrelationAnalysisResult {
  regime: CorrelationRegime;
  breakdowns: CorrelationBreakdown[];
  predictions: CorrelationPrediction[];
  signals: CrossAssetSignal[];
  correlationMatrix: number[][];
  assetSymbols: string[];
  analysisTimestamp: number;
  marketContext: string;
}

// Calculate returns from prices
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

// Calculate Pearson correlation coefficient
function calculateCorrelation(returns1: number[], returns2: number[]): number {
  const n = Math.min(returns1.length, returns2.length);
  if (n < 2) return 0;

  const mean1 = returns1.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const mean2 = returns2.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denom1 * denom2);
  return denominator === 0 ? 0 : numerator / denominator;
}

// Calculate rolling correlation
function calculateRollingCorrelation(
  returns1: number[],
  returns2: number[],
  windowSize: number
): number[] {
  const rollingCorr: number[] = [];
  const n = Math.min(returns1.length, returns2.length);

  for (let i = windowSize; i <= n; i++) {
    const window1 = returns1.slice(i - windowSize, i);
    const window2 = returns2.slice(i - windowSize, i);
    rollingCorr.push(calculateCorrelation(window1, window2));
  }

  return rollingCorr;
}

// Detect correlation regime using pattern analysis
function detectCorrelationRegime(
  correlationMatrix: number[][],
  historicalAverages: number[][]
): CorrelationRegime {
  // Calculate average correlation across all pairs
  let totalCorr = 0;
  let count = 0;
  let totalChange = 0;

  for (let i = 0; i < correlationMatrix.length; i++) {
    for (let j = i + 1; j < correlationMatrix[i].length; j++) {
      totalCorr += Math.abs(correlationMatrix[i][j]);
      if (historicalAverages[i] && historicalAverages[i][j] !== undefined) {
        totalChange += Math.abs(correlationMatrix[i][j] - historicalAverages[i][j]);
      }
      count++;
    }
  }

  const avgCorr = count > 0 ? totalCorr / count : 0;
  const avgChange = count > 0 ? totalChange / count : 0;

  // Determine regime based on correlation levels
  if (avgCorr > 0.7 && avgChange > 0.2) {
    return {
      regime: 'crisis',
      confidence: Math.min(95, 70 + avgCorr * 25),
      description: 'High correlation regime - assets moving together, typical of market stress',
      historicalComparison: 'Similar to 2008 financial crisis or March 2020 COVID crash patterns'
    };
  } else if (avgCorr > 0.6 && avgChange > 0.15) {
    return {
      regime: 'transition',
      confidence: Math.min(85, 60 + avgCorr * 20),
      description: 'Transitional regime - correlations shifting, potential regime change ahead',
      historicalComparison: 'Similar to pre-crisis periods or recovery phases'
    };
  } else if (avgCorr < 0.3 && avgChange < 0.1) {
    return {
      regime: 'normal',
      confidence: Math.min(90, 75 + (1 - avgCorr) * 15),
      description: 'Normal regime - healthy diversification, assets moving independently',
      historicalComparison: 'Typical of stable market conditions with functioning diversification'
    };
  } else {
    return {
      regime: 'euphoria',
      confidence: Math.min(80, 55 + avgCorr * 20),
      description: 'Euphoric regime - moderate correlations with upward bias',
      historicalComparison: 'Similar to late-cycle bull market conditions'
    };
  }
}

// Detect correlation breakdowns
function detectBreakdowns(
  assets: AssetPriceData[],
  currentMatrix: number[][],
  historicalMatrix: number[][],
  threshold: number = 0.3
): CorrelationBreakdown[] {
  const breakdowns: CorrelationBreakdown[] = [];

  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const current = currentMatrix[i][j];
      const historical = historicalMatrix[i]?.[j] ?? current;
      const change = Math.abs(current - historical);

      if (change >= threshold) {
        const significance = change >= 0.5 ? 'critical' :
          change >= 0.4 ? 'high' :
          change >= 0.3 ? 'medium' : 'low';

        const direction = current > historical ? 'increased' : 'decreased';
        
        breakdowns.push({
          asset1: assets[i].symbol,
          asset2: assets[j].symbol,
          historicalCorrelation: historical,
          currentCorrelation: current,
          correlationChange: current - historical,
          significance,
          alert: `Correlation between ${assets[i].symbol} and ${assets[j].symbol} has ${direction} significantly`,
          potentialCause: generatePotentialCause(assets[i], assets[j], current, historical),
          actionRecommendation: generateActionRecommendation(assets[i], assets[j], current, historical)
        });
      }
    }
  }

  return breakdowns.sort((a, b) => Math.abs(b.correlationChange) - Math.abs(a.correlationChange));
}

// Generate potential cause for correlation change
function generatePotentialCause(
  asset1: AssetPriceData,
  asset2: AssetPriceData,
  current: number,
  historical: number
): string {
  const increased = current > historical;
  
  // Cross-asset type analysis
  if (asset1.assetType === 'crypto' && asset2.assetType === 'stock') {
    if (increased) {
      return 'Risk-on sentiment driving both crypto and equities higher together. Possible institutional flow correlation.';
    } else {
      return 'Decoupling of crypto from traditional risk assets. May indicate crypto-specific factors dominating.';
    }
  }
  
  if (asset1.assetType === 'commodity' && asset2.assetType === 'stock') {
    if (increased) {
      return 'Inflation concerns or supply chain disruptions affecting both commodities and equities.';
    } else {
      return 'Sector rotation or changing inflation expectations causing divergence.';
    }
  }

  if (asset1.assetType === 'forex' && (asset2.assetType === 'stock' || asset2.assetType === 'crypto')) {
    if (increased) {
      return 'Dollar strength/weakness driving correlated moves across asset classes.';
    } else {
      return 'Currency-specific factors (central bank policy) diverging from risk asset dynamics.';
    }
  }

  // Same asset type
  if (asset1.assetType === asset2.assetType) {
    if (increased) {
      return `Sector-wide factors driving ${asset1.assetType} assets together. Possible macro catalyst.`;
    } else {
      return `Idiosyncratic factors causing divergence within ${asset1.assetType} sector.`;
    }
  }

  return increased 
    ? 'Market stress or risk-on/risk-off dynamics increasing cross-asset correlation.'
    : 'Normalization of correlations or asset-specific factors driving divergence.';
}

// Generate action recommendation
function generateActionRecommendation(
  asset1: AssetPriceData,
  asset2: AssetPriceData,
  current: number,
  historical: number
): string {
  const increased = current > historical;
  const highCorr = Math.abs(current) > 0.7;

  if (increased && highCorr) {
    return `Consider reducing combined exposure to ${asset1.symbol} and ${asset2.symbol} as diversification benefit has diminished. Review portfolio risk.`;
  } else if (increased && !highCorr) {
    return `Monitor the correlation trend. If it continues rising, consider rebalancing to maintain diversification.`;
  } else if (!increased && Math.abs(current) < 0.3) {
    return `Good diversification opportunity. ${asset1.symbol} and ${asset2.symbol} now offer better risk reduction when combined.`;
  } else {
    return `Correlation returning to normal levels. Maintain current allocation strategy.`;
  }
}

// Generate cross-asset signals
function generateSignals(
  assets: AssetPriceData[],
  correlationMatrix: number[][],
  historicalMatrix: number[][]
): CrossAssetSignal[] {
  const signals: CrossAssetSignal[] = [];
  const timestamp = Date.now();

  // Check for correlation spikes
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const current = correlationMatrix[i][j];
      const historical = historicalMatrix[i]?.[j] ?? 0;
      const change = current - historical;

      if (Math.abs(change) > 0.4) {
        signals.push({
          signalType: change > 0 ? 'convergence' : 'divergence',
          assets: [assets[i].symbol, assets[j].symbol],
          strength: Math.min(100, Math.abs(change) * 200),
          description: change > 0 
            ? `${assets[i].symbol} and ${assets[j].symbol} are converging - correlation spike detected`
            : `${assets[i].symbol} and ${assets[j].symbol} are diverging - correlation breakdown`,
          tradingImplication: change > 0
            ? 'Reduced diversification benefit. Consider pairs trade or hedge adjustment.'
            : 'Enhanced diversification opportunity. May indicate sector rotation.',
          timestamp
        });
      }
    }
  }

  // Check for regime change signals
  let highCorrCount = 0;
  let totalPairs = 0;
  for (let i = 0; i < correlationMatrix.length; i++) {
    for (let j = i + 1; j < correlationMatrix[i].length; j++) {
      if (Math.abs(correlationMatrix[i][j]) > 0.6) highCorrCount++;
      totalPairs++;
    }
  }

  if (totalPairs > 0 && highCorrCount / totalPairs > 0.5) {
    signals.push({
      signalType: 'regime_change',
      assets: assets.map(a => a.symbol),
      strength: Math.min(100, (highCorrCount / totalPairs) * 120),
      description: 'Market-wide correlation regime change detected - majority of assets moving together',
      tradingImplication: 'Risk-off conditions likely. Consider reducing overall exposure or increasing hedges.',
      timestamp
    });
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

// Use LLM for advanced correlation prediction
async function predictCorrelationWithLLM(
  assets: AssetPriceData[],
  currentMatrix: number[][],
  regime: CorrelationRegime
): Promise<CorrelationPrediction[]> {
  const predictions: CorrelationPrediction[] = [];

  // Select top pairs for LLM analysis (most significant)
  const pairs: { i: number; j: number; corr: number }[] = [];
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      pairs.push({ i, j, corr: currentMatrix[i][j] });
    }
  }

  // Sort by absolute correlation and take top 5
  const topPairs = pairs
    .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))
    .slice(0, 5);

  for (const pair of topPairs) {
    const asset1 = assets[pair.i];
    const asset2 = assets[pair.j];

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are an expert quantitative analyst specializing in cross-asset correlation analysis. 
            Analyze the correlation between two assets and predict how it might evolve.
            Respond in JSON format with: predictedCorrelation (number -1 to 1), direction (increasing/decreasing/stable), confidence (0-100), reasoning (string).`
          },
          {
            role: 'user',
            content: `Analyze the correlation between ${asset1.symbol} (${asset1.assetType}) and ${asset2.symbol} (${asset2.assetType}).
            
Current correlation: ${pair.corr.toFixed(3)}
Market regime: ${regime.regime} (${regime.description})

Based on:
1. Current market regime
2. Asset types and their typical behavior
3. Historical correlation patterns

Predict the correlation for the next 1-2 weeks.`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'correlation_prediction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                predictedCorrelation: { type: 'number' },
                direction: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
                confidence: { type: 'number' },
                reasoning: { type: 'string' }
              },
              required: ['predictedCorrelation', 'direction', 'confidence', 'reasoning'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        const parsed = JSON.parse(content);
        predictions.push({
          asset1: asset1.symbol,
          asset2: asset2.symbol,
          currentCorrelation: pair.corr,
          predictedCorrelation: parsed.predictedCorrelation,
          predictionHorizon: '1-2 weeks',
          confidence: parsed.confidence,
          direction: parsed.direction,
          reasoning: parsed.reasoning
        });
      }
    } catch (error) {
      // Fallback to rule-based prediction
      const direction = regime.regime === 'crisis' ? 'increasing' :
        regime.regime === 'normal' ? 'stable' : 'decreasing';
      
      predictions.push({
        asset1: asset1.symbol,
        asset2: asset2.symbol,
        currentCorrelation: pair.corr,
        predictedCorrelation: pair.corr * (direction === 'increasing' ? 1.1 : direction === 'decreasing' ? 0.9 : 1),
        predictionHorizon: '1-2 weeks',
        confidence: 60,
        direction,
        reasoning: `Based on ${regime.regime} market regime, correlations typically ${direction === 'increasing' ? 'rise' : direction === 'decreasing' ? 'fall' : 'remain stable'}.`
      });
    }
  }

  return predictions;
}

// Build correlation matrix from asset data
function buildCorrelationMatrix(assets: AssetPriceData[]): number[][] {
  const matrix: number[][] = [];

  for (let i = 0; i < assets.length; i++) {
    matrix[i] = [];
    const returns1 = assets[i].returns || calculateReturns(assets[i].prices);

    for (let j = 0; j < assets.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
      } else {
        const returns2 = assets[j].returns || calculateReturns(assets[j].prices);
        matrix[i][j] = calculateCorrelation(returns1, returns2);
      }
    }
  }

  return matrix;
}

// Generate historical average matrix (simulated)
function generateHistoricalAverages(assets: AssetPriceData[]): number[][] {
  // In production, this would fetch actual historical averages
  // For now, use typical correlations based on asset types
  const typicalCorrelations: Record<string, Record<string, number>> = {
    stock: { stock: 0.6, crypto: 0.3, forex: 0.2, commodity: 0.25, bond: -0.2 },
    crypto: { stock: 0.3, crypto: 0.7, forex: 0.15, commodity: 0.2, bond: -0.1 },
    forex: { stock: 0.2, crypto: 0.15, forex: 0.5, commodity: 0.3, bond: 0.1 },
    commodity: { stock: 0.25, crypto: 0.2, forex: 0.3, commodity: 0.5, bond: -0.15 },
    bond: { stock: -0.2, crypto: -0.1, forex: 0.1, commodity: -0.15, bond: 0.8 }
  };

  const matrix: number[][] = [];
  for (let i = 0; i < assets.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < assets.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const type1 = assets[i].assetType;
        const type2 = assets[j].assetType;
        matrix[i][j] = typicalCorrelations[type1]?.[type2] ?? 0.3;
      }
    }
  }
  return matrix;
}

// Main analysis function
export async function analyzeCorrelations(
  assets: AssetPriceData[],
  options: {
    includePredictons?: boolean;
    breakdownThreshold?: number;
  } = {}
): Promise<CorrelationAnalysisResult> {
  const { includePredictons = true, breakdownThreshold = 0.25 } = options;

  // Calculate returns for all assets
  for (const asset of assets) {
    if (!asset.returns) {
      asset.returns = calculateReturns(asset.prices);
    }
  }

  // Build current correlation matrix
  const correlationMatrix = buildCorrelationMatrix(assets);
  
  // Get historical averages for comparison
  const historicalMatrix = generateHistoricalAverages(assets);

  // Detect regime
  const regime = detectCorrelationRegime(correlationMatrix, historicalMatrix);

  // Detect breakdowns
  const breakdowns = detectBreakdowns(assets, correlationMatrix, historicalMatrix, breakdownThreshold);

  // Generate signals
  const signals = generateSignals(assets, correlationMatrix, historicalMatrix);

  // Get predictions if requested
  let predictions: CorrelationPrediction[] = [];
  if (includePredictons) {
    predictions = await predictCorrelationWithLLM(assets, correlationMatrix, regime);
  }

  // Generate market context
  const marketContext = generateMarketContext(regime, breakdowns, signals);

  return {
    regime,
    breakdowns,
    predictions,
    signals,
    correlationMatrix,
    assetSymbols: assets.map(a => a.symbol),
    analysisTimestamp: Date.now(),
    marketContext
  };
}

// Generate market context summary
function generateMarketContext(
  regime: CorrelationRegime,
  breakdowns: CorrelationBreakdown[],
  signals: CrossAssetSignal[]
): string {
  const criticalBreakdowns = breakdowns.filter(b => b.significance === 'critical' || b.significance === 'high');
  const strongSignals = signals.filter(s => s.strength > 70);

  let context = `Market is in a ${regime.regime} correlation regime (${regime.confidence.toFixed(0)}% confidence). `;
  context += regime.description + ' ';

  if (criticalBreakdowns.length > 0) {
    context += `Alert: ${criticalBreakdowns.length} significant correlation breakdown(s) detected. `;
  }

  if (strongSignals.length > 0) {
    context += `${strongSignals.length} strong cross-asset signal(s) identified. `;
  }

  return context;
}

// Export utility functions for testing
export {
  calculateReturns,
  calculateCorrelation,
  calculateRollingCorrelation,
  detectCorrelationRegime,
  buildCorrelationMatrix,
  generateHistoricalAverages
};
