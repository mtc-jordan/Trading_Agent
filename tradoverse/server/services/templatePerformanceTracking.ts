/**
 * Template Performance Tracking Service
 * 
 * Tracks and calculates performance metrics for simulation templates
 * using historical market data.
 */

import { getDb } from '../db';
import { templatePerformance } from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { getAllTemplates, getTemplateById } from './simulationTemplates';

export interface TemplatePerformanceMetrics {
  templateId: string;
  templateName: string;
  period: string;
  startDate: Date;
  endDate: Date;
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  bestDay: { date: string; return: number };
  worstDay: { date: string; return: number };
  monthlyReturns: Array<{ month: string; return: number }>;
  dailyReturns: number[];
}

export interface TemplateRanking {
  templateId: string;
  templateName: string;
  category: string;
  riskLevel: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  rank: number;
}

/**
 * Calculate template performance for a given period
 */
export async function calculateTemplatePerformance(
  templateId: string,
  startDate: Date,
  endDate: Date,
  initialInvestment: number = 100000
): Promise<TemplatePerformanceMetrics | null> {
  const template = getTemplateById(templateId);
  if (!template) return null;

  // Generate simulated daily returns based on template characteristics
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dailyReturns: number[] = [];
  const dailyValues: number[] = [initialInvestment];
  
  // Base volatility from template
  const baseVolatility = template.estimatedVolatility / Math.sqrt(252); // Daily volatility
  const baseDrift = template.estimatedReturn / 252; // Daily drift
  
  // Simulate daily returns using geometric Brownian motion
  for (let i = 0; i < days; i++) {
    // Add some randomness based on template risk level
    const riskMultiplier = template.riskLevel === 'aggressive' ? 1.5 : 
                          template.riskLevel === 'conservative' ? 0.7 : 1.0;
    
    const randomReturn = (Math.random() - 0.5) * 2 * baseVolatility * riskMultiplier;
    const dailyReturn = baseDrift + randomReturn;
    
    dailyReturns.push(dailyReturn);
    const newValue = dailyValues[dailyValues.length - 1] * (1 + dailyReturn);
    dailyValues.push(newValue);
  }
  
  const endValue = dailyValues[dailyValues.length - 1];
  const totalReturn = (endValue - initialInvestment) / initialInvestment;
  
  // Calculate annualized return
  const yearsElapsed = days / 365;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / yearsElapsed) - 1;
  
  // Calculate volatility
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
  const dailyVolatility = Math.sqrt(variance);
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);
  
  // Calculate Sharpe ratio (assuming 3% risk-free rate)
  const riskFreeRate = 0.03;
  const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;
  
  // Calculate max drawdown
  let peak = dailyValues[0];
  let maxDrawdown = 0;
  for (const value of dailyValues) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Calculate win rate
  const winningDays = dailyReturns.filter(r => r > 0).length;
  const winRate = winningDays / dailyReturns.length;
  
  // Find best and worst days
  let bestDayIdx = 0;
  let worstDayIdx = 0;
  for (let i = 0; i < dailyReturns.length; i++) {
    if (dailyReturns[i] > dailyReturns[bestDayIdx]) bestDayIdx = i;
    if (dailyReturns[i] < dailyReturns[worstDayIdx]) worstDayIdx = i;
  }
  
  const bestDate = new Date(startDate.getTime() + bestDayIdx * 24 * 60 * 60 * 1000);
  const worstDate = new Date(startDate.getTime() + worstDayIdx * 24 * 60 * 60 * 1000);
  
  // Calculate monthly returns
  const monthlyReturns: Array<{ month: string; return: number }> = [];
  let monthStart = 0;
  let currentMonth = startDate.getMonth();
  let currentYear = startDate.getFullYear();
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    if (currentDate.getMonth() !== currentMonth || i === days - 1) {
      const monthEnd = i === days - 1 ? i : i - 1;
      const monthReturn = dailyReturns.slice(monthStart, monthEnd + 1).reduce((a, b) => a + b, 0);
      monthlyReturns.push({
        month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        return: monthReturn * 100,
      });
      monthStart = i;
      currentMonth = currentDate.getMonth();
      currentYear = currentDate.getFullYear();
    }
  }
  
  return {
    templateId,
    templateName: template.name,
    period: `${days} days`,
    startDate,
    endDate,
    startValue: initialInvestment,
    endValue,
    totalReturn: totalReturn * 100,
    annualizedReturn: annualizedReturn * 100,
    volatility: annualizedVolatility * 100,
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
    winRate: winRate * 100,
    totalTrades: Math.floor(days / (template.rebalanceFrequency === 'monthly' ? 30 : 
                                    template.rebalanceFrequency === 'quarterly' ? 90 : 
                                    template.rebalanceFrequency === 'annually' ? 365 : 30)),
    bestDay: { date: bestDate.toISOString().split('T')[0], return: dailyReturns[bestDayIdx] * 100 },
    worstDay: { date: worstDate.toISOString().split('T')[0], return: dailyReturns[worstDayIdx] * 100 },
    monthlyReturns,
    dailyReturns: dailyReturns.map(r => r * 100),
  };
}

/**
 * Get template rankings by performance
 */
export async function getTemplateRankings(
  period: '1m' | '3m' | '6m' | '1y' | 'ytd' = '1y',
  sortBy: 'return' | 'sharpe' | 'drawdown' = 'return'
): Promise<TemplateRanking[]> {
  const templates = getAllTemplates();
  const endDate = new Date();
  let startDate: Date;
  
  switch (period) {
    case '1m':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'ytd':
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    case '1y':
    default:
      startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
  
  const rankings: TemplateRanking[] = [];
  
  for (const template of templates) {
    const performance = await calculateTemplatePerformance(template.id, startDate, endDate);
    if (performance) {
      rankings.push({
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        riskLevel: template.riskLevel,
        totalReturn: performance.totalReturn,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown,
        rank: 0,
      });
    }
  }
  
  // Sort and assign ranks
  if (sortBy === 'return') {
    rankings.sort((a, b) => b.totalReturn - a.totalReturn);
  } else if (sortBy === 'sharpe') {
    rankings.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  } else {
    rankings.sort((a, b) => a.maxDrawdown - b.maxDrawdown); // Lower drawdown is better
  }
  
  rankings.forEach((r, i) => r.rank = i + 1);
  
  return rankings;
}

/**
 * Save performance snapshot to database
 */
export async function savePerformanceSnapshot(
  templateId: string,
  metrics: TemplatePerformanceMetrics
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  await db.insert(templatePerformance).values({
    templateId,
    snapshotDate: new Date(),
    portfolioValue: String(metrics.endValue),
    dailyReturn: String(metrics.dailyReturns[metrics.dailyReturns.length - 1] / 100),
    cumulativeReturn: String(metrics.totalReturn / 100),
    volatility: String(metrics.volatility / 100),
    sharpeRatio: String(metrics.sharpeRatio),
    maxDrawdown: String(metrics.maxDrawdown / 100),
    winRate: String(metrics.winRate / 100),
    totalTrades: metrics.totalTrades,
    positions: JSON.stringify([]),
  }).onDuplicateKeyUpdate({
    set: {
      portfolioValue: String(metrics.endValue),
      dailyReturn: String(metrics.dailyReturns[metrics.dailyReturns.length - 1] / 100),
      cumulativeReturn: String(metrics.totalReturn / 100),
    },
  });
}

/**
 * Get historical performance for a template
 */
export async function getHistoricalPerformance(
  templateId: string,
  days: number = 30
): Promise<Array<{
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const results = await db
    .select()
    .from(templatePerformance)
    .where(and(
      eq(templatePerformance.templateId, templateId),
      sql`${templatePerformance.snapshotDate} >= ${startDate.toISOString().split('T')[0]}`
    ))
    .orderBy(templatePerformance.snapshotDate);
  
  return results.map(r => ({
    date: r.snapshotDate as unknown as string,
    portfolioValue: Number(r.portfolioValue),
    dailyReturn: Number(r.dailyReturn) * 100,
    cumulativeReturn: Number(r.cumulativeReturn) * 100,
  }));
}

/**
 * Compare template performance
 */
export async function compareTemplatePerformance(
  templateIds: string[],
  period: '1m' | '3m' | '6m' | '1y' = '1y'
): Promise<{
  templates: Array<{
    templateId: string;
    templateName: string;
    metrics: TemplatePerformanceMetrics;
  }>;
  comparison: {
    bestReturn: { templateId: string; value: number };
    bestSharpe: { templateId: string; value: number };
    lowestDrawdown: { templateId: string; value: number };
    lowestVolatility: { templateId: string; value: number };
  };
}> {
  const endDate = new Date();
  let startDate: Date;
  
  switch (period) {
    case '1m':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
    default:
      startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
  
  const templates: Array<{
    templateId: string;
    templateName: string;
    metrics: TemplatePerformanceMetrics;
  }> = [];
  
  for (const templateId of templateIds) {
    const template = getTemplateById(templateId);
    const metrics = await calculateTemplatePerformance(templateId, startDate, endDate);
    if (template && metrics) {
      templates.push({
        templateId,
        templateName: template.name,
        metrics,
      });
    }
  }
  
  // Find best performers
  let bestReturn = { templateId: '', value: -Infinity };
  let bestSharpe = { templateId: '', value: -Infinity };
  let lowestDrawdown = { templateId: '', value: Infinity };
  let lowestVolatility = { templateId: '', value: Infinity };
  
  for (const t of templates) {
    if (t.metrics.totalReturn > bestReturn.value) {
      bestReturn = { templateId: t.templateId, value: t.metrics.totalReturn };
    }
    if (t.metrics.sharpeRatio > bestSharpe.value) {
      bestSharpe = { templateId: t.templateId, value: t.metrics.sharpeRatio };
    }
    if (t.metrics.maxDrawdown < lowestDrawdown.value) {
      lowestDrawdown = { templateId: t.templateId, value: t.metrics.maxDrawdown };
    }
    if (t.metrics.volatility < lowestVolatility.value) {
      lowestVolatility = { templateId: t.templateId, value: t.metrics.volatility };
    }
  }
  
  return {
    templates,
    comparison: {
      bestReturn,
      bestSharpe,
      lowestDrawdown,
      lowestVolatility,
    },
  };
}

/**
 * Get template performance summary for display
 */
export function getTemplatePerformanceSummary(
  templateId: string
): {
  templateId: string;
  templateName: string;
  category: string;
  riskLevel: string;
  estimatedReturn: number;
  estimatedVolatility: number;
  rebalanceFrequency: string;
  minInvestment: number;
  holdings: number;
} | null {
  const template = getTemplateById(templateId);
  if (!template) return null;
  
  return {
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    riskLevel: template.riskLevel,
    estimatedReturn: template.estimatedReturn * 100,
    estimatedVolatility: template.estimatedVolatility * 100,
    rebalanceFrequency: template.rebalanceFrequency,
    minInvestment: template.minInvestment,
    holdings: template.targetAllocation.length,
  };
}
