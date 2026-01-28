/**
 * Performance Comparison Engine
 * 
 * Compares actual vs predicted performance and dynamically adjusts
 * agent weights based on historical accuracy using adaptive learning.
 */

import { getDb } from '../../db';
import { 
  investmentTheses, 
  thesisPerformance, 
  agentPerformance 
} from '../../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { thesisPerformanceTracker, AgentSignalSnapshot } from './ThesisPerformanceTracker';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PerformanceComparison {
  thesisId: number;
  ticker: string;
  rating: string;
  predictedDirection: 'bullish' | 'bearish' | 'neutral';
  actualDirection: 'bullish' | 'bearish' | 'neutral';
  predictedReturn: number;
  actualReturn: number;
  returnDifference: number;
  wasCorrect: boolean;
  convictionScore: number;
  alphaGenerated: number;
  timeHeld: number; // days
  agentBreakdown: AgentPerformanceBreakdown[];
}

export interface AgentPerformanceBreakdown {
  agentType: string;
  signal: string;
  confidence: number;
  wasCorrect: boolean;
  contributionToDecision: number;
}

export interface WeightAdjustment {
  agentType: string;
  previousWeight: number;
  newWeight: number;
  adjustmentReason: string;
  accuracyDelta: number;
  confidenceLevel: number;
}

export interface MarketCondition {
  regime: 'bull' | 'bear' | 'sideways' | 'volatile';
  volatilityLevel: 'low' | 'medium' | 'high';
  trendStrength: number;
  marketSentiment: number;
}

export interface ConditionBasedWeights {
  condition: MarketCondition;
  weights: Record<string, number>;
  sampleSize: number;
  accuracy: number;
}

export interface LearningMetrics {
  totalComparisons: number;
  overallAccuracy: number;
  avgAlpha: number;
  avgReturnDifference: number;
  bestPerformingAgent: string;
  worstPerformingAgent: string;
  weightAdjustments: WeightAdjustment[];
  conditionBasedPerformance: ConditionBasedWeights[];
}

// ============================================================================
// Performance Comparison Engine Class
// ============================================================================

export class PerformanceComparisonEngine {
  // Learning parameters
  private learningRate = 0.1;
  private minWeight = 0.05;
  private maxWeight = 0.40;
  private decayFactor = 0.95; // Recent performance weighted more
  
  // Base weights
  private baseWeights: Record<string, number> = {
    fundamental: 0.25,
    technical: 0.20,
    sentiment: 0.15,
    macro: 0.20,
    portfolio: 0.20
  };

  // Condition-specific weight modifiers
  private conditionModifiers: Record<string, Record<string, number>> = {
    bull: { fundamental: 1.1, technical: 1.2, sentiment: 1.3, macro: 0.9, portfolio: 1.0 },
    bear: { fundamental: 1.3, technical: 1.1, sentiment: 0.8, macro: 1.2, portfolio: 1.1 },
    sideways: { fundamental: 1.0, technical: 1.4, sentiment: 0.9, macro: 1.0, portfolio: 1.1 },
    volatile: { fundamental: 0.9, technical: 0.8, sentiment: 0.7, macro: 1.3, portfolio: 1.4 }
  };

  /**
   * Compare actual vs predicted performance for a closed thesis
   */
  async comparePerformance(thesisId: number): Promise<PerformanceComparison | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [thesis] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesisId))
      .limit(1);

    if (!thesis || thesis.status !== 'closed') return null;

    // Get final performance snapshot
    const [finalSnapshot] = await db.select().from(thesisPerformance)
      .where(eq(thesisPerformance.thesisId, thesisId))
      .orderBy(desc(thesisPerformance.snapshotDate))
      .limit(1);

    if (!finalSnapshot) return null;

    const actualReturn = parseFloat(finalSnapshot.percentReturn || '0');
    const alphaGenerated = parseFloat(finalSnapshot.alphaGenerated || '0');
    const agentSignals = thesis.agentSignals as AgentSignalSnapshot[];

    // Determine predicted direction from rating
    const predictedDirection = this.ratingToDirection(thesis.rating);
    const actualDirection = this.returnToDirection(actualReturn);
    const wasCorrect = predictedDirection === actualDirection;

    // Calculate predicted return from target price
    let predictedReturn = 0;
    if (thesis.targetPrice && thesis.entryPrice) {
      const entry = parseFloat(thesis.entryPrice);
      const target = parseFloat(thesis.targetPrice);
      predictedReturn = ((target - entry) / entry) * 100;
    }

    // Calculate time held
    const startDate = thesis.approvedAt || thesis.createdAt;
    const endDate = thesis.closedAt || new Date();
    const timeHeld = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Build agent breakdown
    const agentBreakdown: AgentPerformanceBreakdown[] = agentSignals.map(signal => ({
      agentType: signal.agentType,
      signal: signal.signal,
      confidence: signal.confidence,
      wasCorrect: this.wasAgentCorrect(signal, actualReturn),
      contributionToDecision: signal.weight * signal.confidence
    }));

    return {
      thesisId,
      ticker: thesis.ticker,
      rating: thesis.rating,
      predictedDirection,
      actualDirection,
      predictedReturn,
      actualReturn,
      returnDifference: actualReturn - predictedReturn,
      wasCorrect,
      convictionScore: parseFloat(thesis.convictionScore || '0'),
      alphaGenerated,
      timeHeld,
      agentBreakdown
    };
  }

  /**
   * Calculate adaptive weight adjustments based on historical performance
   */
  async calculateWeightAdjustments(userId: number): Promise<WeightAdjustment[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const adjustments: WeightAdjustment[] = [];
    const agentTypes = ['fundamental', 'technical', 'sentiment', 'macro', 'portfolio'];

    // Get all closed theses for the user
    const closedTheses = await db.select().from(investmentTheses)
      .where(and(
        eq(investmentTheses.userId, userId),
        eq(investmentTheses.status, 'closed')
      ));

    if (closedTheses.length < 5) {
      // Not enough data for meaningful adjustments
      return agentTypes.map(agentType => ({
        agentType,
        previousWeight: this.baseWeights[agentType],
        newWeight: this.baseWeights[agentType],
        adjustmentReason: 'Insufficient data for adjustment',
        accuracyDelta: 0,
        confidenceLevel: 0
      }));
    }

    // Calculate accuracy for each agent
    const agentAccuracy: Record<string, { correct: number; total: number; avgReturn: number }> = {};
    
    for (const agentType of agentTypes) {
      agentAccuracy[agentType] = { correct: 0, total: 0, avgReturn: 0 };
    }

    for (const thesis of closedTheses) {
      const [snapshot] = await db.select().from(thesisPerformance)
        .where(eq(thesisPerformance.thesisId, thesis.id))
        .orderBy(desc(thesisPerformance.snapshotDate))
        .limit(1);

      if (!snapshot) continue;

      const actualReturn = parseFloat(snapshot.percentReturn || '0');
      const agentSignals = thesis.agentSignals as AgentSignalSnapshot[];

      for (const signal of agentSignals) {
        const wasCorrect = this.wasAgentCorrect(signal, actualReturn);
        agentAccuracy[signal.agentType].total++;
        if (wasCorrect) {
          agentAccuracy[signal.agentType].correct++;
          agentAccuracy[signal.agentType].avgReturn += actualReturn;
        }
      }
    }

    // Calculate new weights using adaptive learning
    const accuracies: Record<string, number> = {};
    let totalAccuracy = 0;

    for (const agentType of agentTypes) {
      const data = agentAccuracy[agentType];
      const accuracy = data.total > 0 ? data.correct / data.total : 0.5;
      accuracies[agentType] = accuracy;
      totalAccuracy += accuracy;
    }

    // Normalize and apply learning rate
    for (const agentType of agentTypes) {
      const currentWeight = this.baseWeights[agentType];
      const accuracy = accuracies[agentType];
      const normalizedAccuracy = totalAccuracy > 0 ? accuracy / totalAccuracy * agentTypes.length : 1;
      
      // Calculate new weight with learning rate
      const targetWeight = currentWeight * normalizedAccuracy;
      const newWeight = currentWeight + this.learningRate * (targetWeight - currentWeight);
      const clampedWeight = Math.max(this.minWeight, Math.min(this.maxWeight, newWeight));

      const accuracyDelta = accuracy - 0.5; // Relative to random chance
      let adjustmentReason = 'No significant change';
      
      if (accuracyDelta > 0.1) {
        adjustmentReason = 'Strong performance - weight increased';
      } else if (accuracyDelta < -0.1) {
        adjustmentReason = 'Weak performance - weight decreased';
      } else if (Math.abs(clampedWeight - currentWeight) > 0.02) {
        adjustmentReason = 'Minor adjustment based on recent accuracy';
      }

      adjustments.push({
        agentType,
        previousWeight: currentWeight,
        newWeight: clampedWeight,
        adjustmentReason,
        accuracyDelta,
        confidenceLevel: Math.min(1, agentAccuracy[agentType].total / 20) // Confidence based on sample size
      });
    }

    // Normalize weights to sum to 1
    const totalWeight = adjustments.reduce((sum, a) => sum + a.newWeight, 0);
    for (const adjustment of adjustments) {
      adjustment.newWeight = adjustment.newWeight / totalWeight;
    }

    return adjustments;
  }

  /**
   * Get condition-based weight recommendations
   */
  async getConditionBasedWeights(
    userId: number, 
    currentCondition: MarketCondition
  ): Promise<ConditionBasedWeights> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get historical performance under similar conditions
    const closedTheses = await db.select().from(investmentTheses)
      .where(and(
        eq(investmentTheses.userId, userId),
        eq(investmentTheses.status, 'closed')
      ));

    // Filter theses by similar market conditions (stored in consensusDetails)
    const similarConditionTheses = closedTheses.filter(thesis => {
      const details = thesis.consensusDetails as any;
      if (!details?.marketCondition) return false;
      return details.marketCondition.regime === currentCondition.regime;
    });

    if (similarConditionTheses.length < 3) {
      // Use condition modifiers as default
      const modifiers = this.conditionModifiers[currentCondition.regime] || {};
      const weights: Record<string, number> = {};
      let total = 0;

      for (const [agent, base] of Object.entries(this.baseWeights)) {
        weights[agent] = base * (modifiers[agent] || 1);
        total += weights[agent];
      }

      // Normalize
      for (const agent of Object.keys(weights)) {
        weights[agent] = weights[agent] / total;
      }

      return {
        condition: currentCondition,
        weights,
        sampleSize: 0,
        accuracy: 0.5
      };
    }

    // Calculate accuracy under this condition
    const agentAccuracy: Record<string, { correct: number; total: number }> = {};
    let totalCorrect = 0;
    let totalTheses = 0;

    for (const thesis of similarConditionTheses) {
      const [snapshot] = await db.select().from(thesisPerformance)
        .where(eq(thesisPerformance.thesisId, thesis.id))
        .orderBy(desc(thesisPerformance.snapshotDate))
        .limit(1);

      if (!snapshot) continue;

      const actualReturn = parseFloat(snapshot.percentReturn || '0');
      const predictedDirection = this.ratingToDirection(thesis.rating);
      const actualDirection = this.returnToDirection(actualReturn);
      
      if (predictedDirection === actualDirection) totalCorrect++;
      totalTheses++;

      const agentSignals = thesis.agentSignals as AgentSignalSnapshot[];
      for (const signal of agentSignals) {
        if (!agentAccuracy[signal.agentType]) {
          agentAccuracy[signal.agentType] = { correct: 0, total: 0 };
        }
        agentAccuracy[signal.agentType].total++;
        if (this.wasAgentCorrect(signal, actualReturn)) {
          agentAccuracy[signal.agentType].correct++;
        }
      }
    }

    // Calculate condition-specific weights
    const weights: Record<string, number> = {};
    let totalWeight = 0;

    for (const [agent, base] of Object.entries(this.baseWeights)) {
      const data = agentAccuracy[agent] || { correct: 0, total: 0 };
      const accuracy = data.total > 0 ? data.correct / data.total : 0.5;
      const modifier = this.conditionModifiers[currentCondition.regime]?.[agent] || 1;
      
      // Blend historical accuracy with condition modifier
      weights[agent] = base * modifier * (0.5 + accuracy);
      totalWeight += weights[agent];
    }

    // Normalize
    for (const agent of Object.keys(weights)) {
      weights[agent] = weights[agent] / totalWeight;
    }

    return {
      condition: currentCondition,
      weights,
      sampleSize: similarConditionTheses.length,
      accuracy: totalTheses > 0 ? totalCorrect / totalTheses : 0.5
    };
  }

  /**
   * Generate comprehensive learning metrics
   */
  async generateLearningMetrics(userId: number): Promise<LearningMetrics> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const closedTheses = await db.select().from(investmentTheses)
      .where(and(
        eq(investmentTheses.userId, userId),
        eq(investmentTheses.status, 'closed')
      ));

    const comparisons: PerformanceComparison[] = [];
    for (const thesis of closedTheses) {
      const comparison = await this.comparePerformance(thesis.id);
      if (comparison) comparisons.push(comparison);
    }

    const totalComparisons = comparisons.length;
    const correctPredictions = comparisons.filter(c => c.wasCorrect).length;
    const overallAccuracy = totalComparisons > 0 ? correctPredictions / totalComparisons : 0;
    const avgAlpha = comparisons.reduce((sum, c) => sum + c.alphaGenerated, 0) / (totalComparisons || 1);
    const avgReturnDifference = comparisons.reduce((sum, c) => sum + c.returnDifference, 0) / (totalComparisons || 1);

    // Calculate agent-level accuracy
    const agentStats: Record<string, { correct: number; total: number }> = {};
    for (const comparison of comparisons) {
      for (const agent of comparison.agentBreakdown) {
        if (!agentStats[agent.agentType]) {
          agentStats[agent.agentType] = { correct: 0, total: 0 };
        }
        agentStats[agent.agentType].total++;
        if (agent.wasCorrect) agentStats[agent.agentType].correct++;
      }
    }

    let bestAgent = '';
    let worstAgent = '';
    let bestAccuracy = 0;
    let worstAccuracy = 1;

    for (const [agent, stats] of Object.entries(agentStats)) {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestAgent = agent;
      }
      if (accuracy < worstAccuracy) {
        worstAccuracy = accuracy;
        worstAgent = agent;
      }
    }

    const weightAdjustments = await this.calculateWeightAdjustments(userId);

    // Get condition-based performance for different regimes
    const conditionBasedPerformance: ConditionBasedWeights[] = [];
    for (const regime of ['bull', 'bear', 'sideways', 'volatile'] as const) {
      const condition: MarketCondition = {
        regime,
        volatilityLevel: 'medium',
        trendStrength: 0.5,
        marketSentiment: 0.5
      };
      const conditionWeights = await this.getConditionBasedWeights(userId, condition);
      conditionBasedPerformance.push(conditionWeights);
    }

    return {
      totalComparisons,
      overallAccuracy,
      avgAlpha,
      avgReturnDifference,
      bestPerformingAgent: bestAgent || 'N/A',
      worstPerformingAgent: worstAgent || 'N/A',
      weightAdjustments,
      conditionBasedPerformance
    };
  }

  /**
   * Apply weight adjustments to the system
   */
  async applyWeightAdjustments(userId: number, adjustments: WeightAdjustment[]): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    for (const adjustment of adjustments) {
      // Update agent performance records with new weights
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const [existing] = await db.select().from(agentPerformance)
        .where(and(
          eq(agentPerformance.agentType, adjustment.agentType),
          gte(agentPerformance.periodStart, periodStart),
          lte(agentPerformance.periodEnd, periodEnd)
        ))
        .limit(1);

      if (existing) {
        await db.update(agentPerformance)
          .set({
            currentWeight: String(adjustment.newWeight),
            recommendedWeight: String(adjustment.newWeight)
          })
          .where(eq(agentPerformance.id, existing.id));
      }
    }
  }

  // Helper methods
  private ratingToDirection(rating: string): 'bullish' | 'bearish' | 'neutral' {
    switch (rating) {
      case 'strong_buy':
      case 'buy':
        return 'bullish';
      case 'strong_sell':
      case 'sell':
        return 'bearish';
      default:
        return 'neutral';
    }
  }

  private returnToDirection(returnPct: number): 'bullish' | 'bearish' | 'neutral' {
    if (returnPct > 5) return 'bullish';
    if (returnPct < -5) return 'bearish';
    return 'neutral';
  }

  private wasAgentCorrect(signal: AgentSignalSnapshot, actualReturn: number): boolean {
    switch (signal.signal) {
      case 'bullish': return actualReturn > 0;
      case 'bearish': return actualReturn < 0;
      case 'neutral': return Math.abs(actualReturn) < 5;
      default: return false;
    }
  }
}

export const performanceComparisonEngine = new PerformanceComparisonEngine();
