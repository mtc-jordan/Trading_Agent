/**
 * Thesis Performance Tracker Service
 * 
 * Tracks actual vs predicted performance of approved investment theses
 * and adjusts agent weights based on historical accuracy.
 */

import { getDb } from '../../db';
import { 
  investmentTheses, 
  thesisPerformance, 
  agentPerformance
} from '../../../drizzle/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { callDataApi } from '../../_core/dataApi';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ThesisCreationInput {
  userId: number;
  ticker: string;
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  convictionScore: number;
  targetPrice?: number;
  targetDate?: Date;
  timeHorizon?: 'short' | 'medium' | 'long';
  entryPrice: number;
  agentSignals: AgentSignalSnapshot[];
  consensusDetails?: any;
  executiveSummary?: string;
  fullThesis?: string;
  riskFactors?: string[];
  counterThesis?: string;
}

export interface AgentSignalSnapshot {
  agentType: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  rationale: string;
  weight: number;
}

export interface AgentAccuracyReport {
  agentType: string;
  totalSignals: number;
  correctSignals: number;
  accuracy: number;
  bullishAccuracy: number;
  bearishAccuracy: number;
  neutralAccuracy: number;
  avgConfidence: number;
  avgReturnWhenCorrect: number;
  avgReturnWhenWrong: number;
  recommendedWeight: number;
  currentWeight: number;
}

export interface PerformanceSummary {
  totalTheses: number;
  approvedTheses: number;
  closedTheses: number;
  avgReturn: number;
  avgAlpha: number;
  winRate: number;
  bestPerformer: { ticker: string; return: number } | null;
  worstPerformer: { ticker: string; return: number } | null;
  agentAccuracy: AgentAccuracyReport[];
}

// ============================================================================
// Thesis Performance Tracker Class
// ============================================================================

export class ThesisPerformanceTracker {
  private benchmarkSymbol = 'SPY';
  
  private defaultWeights: Record<string, number> = {
    fundamental: 0.25,
    technical: 0.20,
    sentiment: 0.15,
    macro: 0.20,
    portfolio: 0.20
  };

  async createThesis(input: ThesisCreationInput): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [thesis] = await db.insert(investmentTheses).values({
      userId: input.userId,
      ticker: input.ticker,
      rating: input.rating,
      convictionScore: String(input.convictionScore),
      targetPrice: input.targetPrice ? String(input.targetPrice) : null,
      targetDate: input.targetDate,
      timeHorizon: input.timeHorizon || 'medium',
      entryPrice: String(input.entryPrice),
      agentSignals: input.agentSignals,
      consensusDetails: input.consensusDetails,
      executiveSummary: input.executiveSummary,
      fullThesis: input.fullThesis,
      riskFactors: input.riskFactors,
      counterThesis: input.counterThesis,
      status: 'pending'
    }).$returningId();

    const [created] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesis.id))
      .limit(1);

    return created;
  }

  async approveThesis(thesisId: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db.update(investmentTheses)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(investmentTheses.id, thesisId));

    await this.takePerformanceSnapshot(thesisId);

    const [thesis] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesisId))
      .limit(1);

    return thesis;
  }

  async closeThesis(thesisId: number, reason: string): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await this.takePerformanceSnapshot(thesisId);

    await db.update(investmentTheses)
      .set({ status: 'closed', closedAt: new Date(), closeReason: reason })
      .where(eq(investmentTheses.id, thesisId));

    await this.updateAgentPerformance(thesisId);

    const [thesis] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesisId))
      .limit(1);

    return thesis;
  }

  async takePerformanceSnapshot(thesisId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [thesis] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesisId))
      .limit(1);

    if (!thesis) return null;

    const currentPrice = await this.getCurrentPrice(thesis.ticker);
    if (!currentPrice) return null;

    const benchmarkReturn = await this.getBenchmarkReturn(thesis.approvedAt || thesis.createdAt);
    const entryPrice = parseFloat(thesis.entryPrice);
    const absoluteReturn = currentPrice - entryPrice;
    const percentReturn = ((currentPrice - entryPrice) / entryPrice) * 100;
    const alphaGenerated = percentReturn - benchmarkReturn;
    
    let targetProgress = 0;
    if (thesis.targetPrice) {
      const targetPrice = parseFloat(thesis.targetPrice);
      const totalMove = targetPrice - entryPrice;
      const actualMove = currentPrice - entryPrice;
      targetProgress = totalMove !== 0 ? (actualMove / totalMove) * 100 : 0;
    }

    const historicalSnapshots = await db.select().from(thesisPerformance)
      .where(eq(thesisPerformance.thesisId, thesisId))
      .orderBy(desc(thesisPerformance.snapshotDate));

    const returns = historicalSnapshots.map((s: any) => parseFloat(s.percentReturn || '0'));
    const volatility = this.calculateVolatility(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const sharpeRatio = this.calculateSharpeRatio(percentReturn, volatility);

    const [snapshot] = await db.insert(thesisPerformance).values({
      thesisId,
      snapshotDate: new Date(),
      currentPrice: String(currentPrice),
      absoluteReturn: String(absoluteReturn),
      percentReturn: String(percentReturn),
      benchmarkReturn: String(benchmarkReturn),
      alphaGenerated: String(alphaGenerated),
      targetProgress: String(targetProgress),
      maxDrawdown: String(maxDrawdown),
      volatility: String(volatility),
      sharpeRatio: String(sharpeRatio)
    }).$returningId();

    const [created] = await db.select().from(thesisPerformance)
      .where(eq(thesisPerformance.id, snapshot.id))
      .limit(1);

    return created;
  }

  async updateAgentPerformance(thesisId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [thesis] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesisId))
      .limit(1);

    if (!thesis || thesis.status !== 'closed') return;

    const [finalSnapshot] = await db.select().from(thesisPerformance)
      .where(eq(thesisPerformance.thesisId, thesisId))
      .orderBy(desc(thesisPerformance.snapshotDate))
      .limit(1);

    if (!finalSnapshot) return;

    const actualReturn = parseFloat(finalSnapshot.percentReturn || '0');
    const agentSignals = thesis.agentSignals as AgentSignalSnapshot[];

    for (const signal of agentSignals) {
      const wasCorrect = this.wasAgentCorrect(signal, actualReturn);
      
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const [agentRecord] = await db.select().from(agentPerformance)
        .where(and(
          eq(agentPerformance.agentType, signal.agentType),
          gte(agentPerformance.periodStart, periodStart),
          lte(agentPerformance.periodEnd, periodEnd)
        ))
        .limit(1);

      if (!agentRecord) {
        await db.insert(agentPerformance).values({
          agentType: signal.agentType,
          periodStart,
          periodEnd,
          totalSignals: 1,
          correctSignals: wasCorrect ? 1 : 0,
          accuracy: wasCorrect ? '1.0000' : '0.0000',
          avgConfidence: String(signal.confidence),
          avgReturnWhenCorrect: wasCorrect ? String(actualReturn) : '0',
          avgReturnWhenWrong: wasCorrect ? '0' : String(actualReturn),
          currentWeight: String(this.defaultWeights[signal.agentType] || 0.2)
        });
      } else {
        const totalSignals = agentRecord.totalSignals + 1;
        const correctSignals = agentRecord.correctSignals + (wasCorrect ? 1 : 0);
        const accuracy = correctSignals / totalSignals;
        const recommendedWeight = this.calculateRecommendedWeight(accuracy);

        await db.update(agentPerformance)
          .set({
            totalSignals,
            correctSignals,
            accuracy: String(accuracy),
            recommendedWeight: String(recommendedWeight),
            avgConfidence: String(
              (parseFloat(agentRecord.avgConfidence || '0') * (totalSignals - 1) + signal.confidence) / totalSignals
            )
          })
          .where(eq(agentPerformance.id, agentRecord.id));
      }
    }
  }

  async getPerformanceSummary(userId: number): Promise<PerformanceSummary> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const theses = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.userId, userId));

    const approvedTheses = theses.filter((t: any) => t.status === 'approved' || t.status === 'closed');
    const closedTheses = theses.filter((t: any) => t.status === 'closed');

    const performanceData: { ticker: string; return: number }[] = [];
    for (const thesis of closedTheses) {
      const [snapshot] = await db.select().from(thesisPerformance)
        .where(eq(thesisPerformance.thesisId, thesis.id))
        .orderBy(desc(thesisPerformance.snapshotDate))
        .limit(1);
      if (snapshot) {
        performanceData.push({
          ticker: thesis.ticker,
          return: parseFloat(snapshot.percentReturn || '0')
        });
      }
    }

    const avgReturn = performanceData.length > 0
      ? performanceData.reduce((sum, p) => sum + p.return, 0) / performanceData.length
      : 0;

    const avgAlpha = await this.calculateAverageAlpha(closedTheses);
    const winRate = performanceData.filter(p => p.return > 0).length / (performanceData.length || 1);

    const sortedPerformance = [...performanceData].sort((a, b) => b.return - a.return);
    const bestPerformer = sortedPerformance[0] || null;
    const worstPerformer = sortedPerformance[sortedPerformance.length - 1] || null;

    const agentAccuracy = await this.getAgentAccuracyReport();

    return {
      totalTheses: theses.length,
      approvedTheses: approvedTheses.length,
      closedTheses: closedTheses.length,
      avgReturn,
      avgAlpha,
      winRate,
      bestPerformer,
      worstPerformer,
      agentAccuracy
    };
  }

  async getAgentAccuracyReport(): Promise<AgentAccuracyReport[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const agentTypes = ['fundamental', 'technical', 'sentiment', 'macro', 'portfolio'];
    const reports: AgentAccuracyReport[] = [];

    for (const agentType of agentTypes) {
      const records = await db.select().from(agentPerformance)
        .where(eq(agentPerformance.agentType, agentType))
        .orderBy(desc(agentPerformance.periodEnd));

      if (records.length === 0) {
        reports.push({
          agentType,
          totalSignals: 0,
          correctSignals: 0,
          accuracy: 0,
          bullishAccuracy: 0,
          bearishAccuracy: 0,
          neutralAccuracy: 0,
          avgConfidence: 0,
          avgReturnWhenCorrect: 0,
          avgReturnWhenWrong: 0,
          recommendedWeight: this.defaultWeights[agentType] || 0.2,
          currentWeight: this.defaultWeights[agentType] || 0.2
        });
        continue;
      }

      const totalSignals = records.reduce((sum: number, r: any) => sum + r.totalSignals, 0);
      const correctSignals = records.reduce((sum: number, r: any) => sum + r.correctSignals, 0);

      reports.push({
        agentType,
        totalSignals,
        correctSignals,
        accuracy: totalSignals > 0 ? correctSignals / totalSignals : 0,
        bullishAccuracy: this.avgNumeric(records, 'bullishAccuracy'),
        bearishAccuracy: this.avgNumeric(records, 'bearishAccuracy'),
        neutralAccuracy: this.avgNumeric(records, 'neutralAccuracy'),
        avgConfidence: this.avgNumeric(records, 'avgConfidence'),
        avgReturnWhenCorrect: this.avgNumeric(records, 'avgReturnWhenCorrect'),
        avgReturnWhenWrong: this.avgNumeric(records, 'avgReturnWhenWrong'),
        recommendedWeight: parseFloat(records[0].recommendedWeight || String(this.defaultWeights[agentType])),
        currentWeight: parseFloat(records[0].currentWeight || String(this.defaultWeights[agentType]))
      });
    }

    return reports;
  }

  async getRecommendedWeights(): Promise<Record<string, number>> {
    const report = await this.getAgentAccuracyReport();
    const weights: Record<string, number> = {};

    for (const agent of report) {
      weights[agent.agentType] = agent.recommendedWeight;
    }

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (totalWeight > 0) {
      for (const key of Object.keys(weights)) {
        weights[key] = weights[key] / totalWeight;
      }
    }

    return weights;
  }

  async getThesis(thesisId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [thesis] = await db.select().from(investmentTheses)
      .where(eq(investmentTheses.id, thesisId))
      .limit(1);
    return thesis || null;
  }

  async getUserTheses(userId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    return await db.select().from(investmentTheses)
      .where(eq(investmentTheses.userId, userId))
      .orderBy(desc(investmentTheses.createdAt));
  }

  async getThesisPerformanceHistory(thesisId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    return await db.select().from(thesisPerformance)
      .where(eq(thesisPerformance.thesisId, thesisId))
      .orderBy(desc(thesisPerformance.snapshotDate));
  }

  // Helper Methods
  private async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const response = await callDataApi('YahooFinance/get_stock_chart', {
        query: { symbol: ticker, interval: '1d', range: '1d' }
      }) as any;

      if (response?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        return response.chart.result[0].meta.regularMarketPrice;
      }
      return null;
    } catch (error) {
      console.error(`[PerformanceTracker] Error fetching price for ${ticker}:`, error);
      return null;
    }
  }

  private async getBenchmarkReturn(startDate: Date): Promise<number> {
    try {
      const response = await callDataApi('YahooFinance/get_stock_chart', {
        query: { symbol: this.benchmarkSymbol, interval: '1d', range: '1y' }
      }) as any;

      if (response?.chart?.result?.[0]) {
        const result = response.chart.result[0];
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];
        
        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        let startIdx = timestamps.findIndex((t: number) => t >= startTimestamp);
        if (startIdx === -1) startIdx = 0;
        
        const startPrice = closes[startIdx];
        const currentPrice = closes[closes.length - 1];
        
        if (startPrice && currentPrice) {
          return ((currentPrice - startPrice) / startPrice) * 100;
        }
      }
      return 0;
    } catch (error) {
      console.error('[PerformanceTracker] Error fetching benchmark return:', error);
      return 0;
    }
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / (returns.length - 1);
    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;
    let peak = returns[0];
    let maxDrawdown = 0;
    for (const ret of returns) {
      if (ret > peak) peak = ret;
      const drawdown = (peak - ret) / (peak || 1);
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown * 100;
  }

  private calculateSharpeRatio(returns: number, volatility: number): number {
    const riskFreeRate = 4.5;
    if (volatility === 0) return 0;
    return (returns - riskFreeRate) / volatility;
  }

  private wasAgentCorrect(signal: AgentSignalSnapshot, actualReturn: number): boolean {
    switch (signal.signal) {
      case 'bullish': return actualReturn > 0;
      case 'bearish': return actualReturn < 0;
      case 'neutral': return Math.abs(actualReturn) < 5;
      default: return false;
    }
  }

  private calculateRecommendedWeight(accuracy: number): number {
    const baseWeight = 0.2;
    const multiplier = 0.5 + accuracy;
    return baseWeight * multiplier;
  }

  private async calculateAverageAlpha(theses: any[]): Promise<number> {
    const db = await getDb();
    if (!db) return 0;
    
    let totalAlpha = 0;
    let count = 0;

    for (const thesis of theses) {
      const [snapshot] = await db.select().from(thesisPerformance)
        .where(eq(thesisPerformance.thesisId, thesis.id))
        .orderBy(desc(thesisPerformance.snapshotDate))
        .limit(1);
      if (snapshot?.alphaGenerated) {
        totalAlpha += parseFloat(snapshot.alphaGenerated);
        count++;
      }
    }

    return count > 0 ? totalAlpha / count : 0;
  }

  private avgNumeric(records: any[], field: string): number {
    const values = records
      .map(r => parseFloat(String(r[field]) || '0'))
      .filter(v => !isNaN(v));
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }
}

export const thesisPerformanceTracker = new ThesisPerformanceTracker();
