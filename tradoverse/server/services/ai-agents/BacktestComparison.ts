/**
 * Backtest Comparison Service
 * 
 * Allows users to compare multiple backtest runs side-by-side
 * to evaluate different agent configurations or time periods.
 */

import { getDb } from '../../db';

// Types
export interface BacktestRun {
  id: string;
  name: string;
  symbol: string;
  startDate: string;
  endDate: string;
  config: BacktestConfig;
  results: BacktestResults;
  createdAt: Date;
}

export interface BacktestConfig {
  initialCapital: number;
  transactionCost: number;
  slippage: number;
  useAgentWeights: boolean;
  rebalanceFrequency: string;
  agentWeights?: Record<string, number>;
}

export interface BacktestResults {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  volatility: number;
  calmarRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  treynorRatio: number;
  equityCurve: { date: string; value: number }[];
  drawdownCurve: { date: string; value: number }[];
  monthlyReturns: { month: string; return: number }[];
  tradeLog: TradeEntry[];
}

export interface TradeEntry {
  date: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  pnl: number;
  signal: string;
  agentVotes: Record<string, string>;
}

export interface ComparisonMetrics {
  metric: string;
  description: string;
  values: { runId: string; value: number; rank: number }[];
  winner: string;
  improvement: number;
}

export interface BacktestComparison {
  runs: BacktestRun[];
  metrics: ComparisonMetrics[];
  correlationMatrix: number[][];
  equityCurveComparison: { date: string; [key: string]: number | string }[];
  drawdownComparison: { date: string; [key: string]: number | string }[];
  monthlyComparison: { month: string; [key: string]: number | string }[];
  summary: ComparisonSummary;
}

export interface ComparisonSummary {
  bestOverall: string;
  bestRiskAdjusted: string;
  lowestDrawdown: string;
  highestWinRate: string;
  recommendations: string[];
}

// In-memory storage for backtest runs
const backtestStore: Map<string, BacktestRun> = new Map();

/**
 * Save a backtest run for comparison
 */
export async function saveBacktestRun(
  userId: string,
  run: Omit<BacktestRun, 'id' | 'createdAt'>
): Promise<string> {
  const id = `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const backtestRun: BacktestRun = {
    ...run,
    id,
    createdAt: new Date(),
  };
  
  backtestStore.set(`${userId}_${id}`, backtestRun);
  return id;
}

/**
 * Get all backtest runs for a user
 */
export async function getUserBacktestRuns(userId: string): Promise<BacktestRun[]> {
  const runs: BacktestRun[] = [];
  
  const entries = Array.from(backtestStore.entries());
  for (const [key, run] of entries) {
    if (key.startsWith(`${userId}_`)) {
      runs.push(run);
    }
  }
  
  return runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get a specific backtest run
 */
export async function getBacktestRun(userId: string, runId: string): Promise<BacktestRun | null> {
  return backtestStore.get(`${userId}_${runId}`) || null;
}

/**
 * Delete a backtest run
 */
export async function deleteBacktestRun(userId: string, runId: string): Promise<boolean> {
  return backtestStore.delete(`${userId}_${runId}`);
}

/**
 * Compare multiple backtest runs
 */
export async function compareBacktests(
  userId: string,
  runIds: string[]
): Promise<BacktestComparison> {
  // Get all runs
  const runs: BacktestRun[] = [];
  for (const runId of runIds) {
    const run = await getBacktestRun(userId, runId);
    if (run) {
      runs.push(run);
    }
  }
  
  if (runs.length < 2) {
    throw new Error('Need at least 2 backtest runs to compare');
  }
  
  // Calculate comparison metrics
  const metrics = calculateComparisonMetrics(runs);
  
  // Calculate correlation matrix
  const correlationMatrix = calculateCorrelationMatrix(runs);
  
  // Prepare equity curve comparison
  const equityCurveComparison = prepareEquityCurveComparison(runs);
  
  // Prepare drawdown comparison
  const drawdownComparison = prepareDrawdownComparison(runs);
  
  // Prepare monthly comparison
  const monthlyComparison = prepareMonthlyComparison(runs);
  
  // Generate summary
  const summary = generateComparisonSummary(runs, metrics);
  
  return {
    runs,
    metrics,
    correlationMatrix,
    equityCurveComparison,
    drawdownComparison,
    monthlyComparison,
    summary,
  };
}

/**
 * Calculate comparison metrics for all runs
 */
function calculateComparisonMetrics(runs: BacktestRun[]): ComparisonMetrics[] {
  const metricDefinitions = [
    { key: 'totalReturn', name: 'Total Return', description: 'Overall return percentage', higherBetter: true },
    { key: 'annualizedReturn', name: 'Annualized Return', description: 'Return annualized over the period', higherBetter: true },
    { key: 'sharpeRatio', name: 'Sharpe Ratio', description: 'Risk-adjusted return (higher is better)', higherBetter: true },
    { key: 'maxDrawdown', name: 'Max Drawdown', description: 'Maximum peak-to-trough decline', higherBetter: false },
    { key: 'winRate', name: 'Win Rate', description: 'Percentage of profitable trades', higherBetter: true },
    { key: 'profitFactor', name: 'Profit Factor', description: 'Gross profit / Gross loss', higherBetter: true },
    { key: 'volatility', name: 'Volatility', description: 'Standard deviation of returns', higherBetter: false },
    { key: 'calmarRatio', name: 'Calmar Ratio', description: 'Return / Max Drawdown', higherBetter: true },
    { key: 'sortinoRatio', name: 'Sortino Ratio', description: 'Return / Downside deviation', higherBetter: true },
    { key: 'totalTrades', name: 'Total Trades', description: 'Number of trades executed', higherBetter: false },
  ];
  
  const metrics: ComparisonMetrics[] = [];
  
  for (const def of metricDefinitions) {
    const values = runs.map(run => ({
      runId: run.id,
      value: (run.results as any)[def.key] || 0,
      rank: 0,
    }));
    
    // Sort and assign ranks
    const sorted = [...values].sort((a, b) => 
      def.higherBetter ? b.value - a.value : a.value - b.value
    );
    sorted.forEach((v, i) => {
      const original = values.find(x => x.runId === v.runId);
      if (original) original.rank = i + 1;
    });
    
    const winner = sorted[0].runId;
    const improvement = sorted.length > 1 
      ? Math.abs(sorted[0].value - sorted[1].value) / Math.abs(sorted[1].value || 1) * 100
      : 0;
    
    metrics.push({
      metric: def.name,
      description: def.description,
      values,
      winner,
      improvement,
    });
  }
  
  return metrics;
}

/**
 * Calculate correlation matrix between equity curves
 */
function calculateCorrelationMatrix(runs: BacktestRun[]): number[][] {
  const n = runs.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j > i) {
        const correlation = calculateCorrelation(
          runs[i].results.equityCurve.map(e => e.value),
          runs[j].results.equityCurve.map(e => e.value)
        );
        matrix[i][j] = correlation;
        matrix[j][i] = correlation;
      }
    }
  }
  
  return matrix;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  const denominator = Math.sqrt(denomX * denomY);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Prepare equity curve comparison data
 */
function prepareEquityCurveComparison(
  runs: BacktestRun[]
): { date: string; [key: string]: number | string }[] {
  // Get all unique dates
  const allDates = new Set<string>();
  runs.forEach(run => {
    run.results.equityCurve.forEach(point => allDates.add(point.date));
  });
  
  const sortedDates = Array.from(allDates).sort();
  
  // Build comparison data
  return sortedDates.map(date => {
    const point: { date: string; [key: string]: number | string } = { date };
    
    runs.forEach(run => {
      const equity = run.results.equityCurve.find(e => e.date === date);
      point[run.name] = equity?.value || 0;
    });
    
    return point;
  });
}

/**
 * Prepare drawdown comparison data
 */
function prepareDrawdownComparison(
  runs: BacktestRun[]
): { date: string; [key: string]: number | string }[] {
  const allDates = new Set<string>();
  runs.forEach(run => {
    run.results.drawdownCurve.forEach(point => allDates.add(point.date));
  });
  
  const sortedDates = Array.from(allDates).sort();
  
  return sortedDates.map(date => {
    const point: { date: string; [key: string]: number | string } = { date };
    
    runs.forEach(run => {
      const dd = run.results.drawdownCurve.find(d => d.date === date);
      point[run.name] = dd?.value || 0;
    });
    
    return point;
  });
}

/**
 * Prepare monthly returns comparison
 */
function prepareMonthlyComparison(
  runs: BacktestRun[]
): { month: string; [key: string]: number | string }[] {
  const allMonths = new Set<string>();
  runs.forEach(run => {
    run.results.monthlyReturns.forEach(m => allMonths.add(m.month));
  });
  
  const sortedMonths = Array.from(allMonths).sort();
  
  return sortedMonths.map(month => {
    const point: { month: string; [key: string]: number | string } = { month };
    
    runs.forEach(run => {
      const monthly = run.results.monthlyReturns.find(m => m.month === month);
      point[run.name] = monthly?.return || 0;
    });
    
    return point;
  });
}

/**
 * Generate comparison summary with recommendations
 */
function generateComparisonSummary(
  runs: BacktestRun[],
  metrics: ComparisonMetrics[]
): ComparisonSummary {
  // Find best by different criteria
  const returnMetric = metrics.find(m => m.metric === 'Total Return');
  const sharpeMetric = metrics.find(m => m.metric === 'Sharpe Ratio');
  const drawdownMetric = metrics.find(m => m.metric === 'Max Drawdown');
  const winRateMetric = metrics.find(m => m.metric === 'Win Rate');
  
  // Calculate overall score (weighted average of ranks)
  const scores: { runId: string; score: number }[] = runs.map(run => {
    let score = 0;
    let weight = 0;
    
    // Weight important metrics more heavily
    const weights: Record<string, number> = {
      'Sharpe Ratio': 3,
      'Total Return': 2,
      'Max Drawdown': 2,
      'Win Rate': 1.5,
      'Profit Factor': 1.5,
      'Calmar Ratio': 1,
      'Sortino Ratio': 1,
    };
    
    for (const metric of metrics) {
      const value = metric.values.find(v => v.runId === run.id);
      if (value) {
        const w = weights[metric.metric] || 1;
        score += (runs.length - value.rank + 1) * w;
        weight += w;
      }
    }
    
    return { runId: run.id, score: score / weight };
  });
  
  scores.sort((a, b) => b.score - a.score);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  const bestRun = runs.find(r => r.id === scores[0].runId);
  const worstRun = runs.find(r => r.id === scores[scores.length - 1].runId);
  
  if (bestRun && worstRun) {
    const bestReturn = bestRun.results.totalReturn;
    const worstReturn = worstRun.results.totalReturn;
    
    if (bestReturn > worstReturn * 1.5) {
      recommendations.push(
        `"${bestRun.name}" significantly outperforms other configurations with ${bestReturn.toFixed(1)}% return`
      );
    }
    
    if (bestRun.results.maxDrawdown < worstRun.results.maxDrawdown * 0.7) {
      recommendations.push(
        `"${bestRun.name}" shows better risk management with ${bestRun.results.maxDrawdown.toFixed(1)}% max drawdown`
      );
    }
    
    if (bestRun.results.sharpeRatio > 1.5) {
      recommendations.push(
        `"${bestRun.name}" has excellent risk-adjusted returns (Sharpe: ${bestRun.results.sharpeRatio.toFixed(2)})`
      );
    }
  }
  
  // Add general recommendations
  const avgSharpe = runs.reduce((sum, r) => sum + r.results.sharpeRatio, 0) / runs.length;
  if (avgSharpe < 1) {
    recommendations.push(
      'Consider adjusting agent weights or adding risk management rules to improve risk-adjusted returns'
    );
  }
  
  const avgDrawdown = runs.reduce((sum, r) => sum + r.results.maxDrawdown, 0) / runs.length;
  if (avgDrawdown > 20) {
    recommendations.push(
      'High average drawdown detected. Consider implementing stop-loss rules or reducing position sizes'
    );
  }
  
  return {
    bestOverall: scores[0].runId,
    bestRiskAdjusted: sharpeMetric?.winner || scores[0].runId,
    lowestDrawdown: drawdownMetric?.winner || scores[0].runId,
    highestWinRate: winRateMetric?.winner || scores[0].runId,
    recommendations,
  };
}

/**
 * Initialize sample backtest runs for demo
 */
export function initializeSampleBacktests(userId: string): void {
  // Check if already initialized
  const existingRuns = Array.from(backtestStore.keys()).filter(k => k.startsWith(`${userId}_`));
  if (existingRuns.length > 0) return;
  
  const configs = [
    { name: 'Conservative Strategy', weights: { technical: 0.15, fundamental: 0.25, sentiment: 0.10, risk: 0.25, regime: 0.10, execution: 0.10, coordinator: 0.05 } },
    { name: 'Aggressive Strategy', weights: { technical: 0.30, fundamental: 0.15, sentiment: 0.20, risk: 0.10, regime: 0.10, execution: 0.10, coordinator: 0.05 } },
    { name: 'Balanced Strategy', weights: { technical: 0.20, fundamental: 0.20, sentiment: 0.15, risk: 0.15, regime: 0.10, execution: 0.10, coordinator: 0.10 } },
  ];
  
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  configs.forEach((config, idx) => {
    // Generate sample equity curve
    const equityCurve: { date: string; value: number }[] = [];
    const drawdownCurve: { date: string; value: number }[] = [];
    const monthlyReturns: { month: string; return: number }[] = [];
    
    let equity = 100000;
    let peak = equity;
    const baseReturn = idx === 0 ? 0.0003 : idx === 1 ? 0.0005 : 0.0004;
    const baseVol = idx === 0 ? 0.008 : idx === 1 ? 0.015 : 0.012;
    
    for (let i = 365; i >= 0; i--) {
      const date = new Date(now - i * day).toISOString().split('T')[0];
      const dailyReturn = baseReturn + (Math.random() - 0.5) * baseVol;
      equity *= (1 + dailyReturn);
      peak = Math.max(peak, equity);
      const drawdown = ((peak - equity) / peak) * 100;
      
      equityCurve.push({ date, value: equity });
      drawdownCurve.push({ date, value: -drawdown });
      
      // Monthly returns
      const month = date.substring(0, 7);
      const existing = monthlyReturns.find(m => m.month === month);
      if (!existing) {
        monthlyReturns.push({ month, return: dailyReturn * 100 * 20 }); // Approximate monthly
      }
    }
    
    const totalReturn = ((equity - 100000) / 100000) * 100;
    const maxDrawdown = Math.abs(Math.min(...drawdownCurve.map(d => d.value)));
    
    const run: BacktestRun = {
      id: `sample_${idx}`,
      name: config.name,
      symbol: 'AAPL',
      startDate: new Date(now - 365 * day).toISOString().split('T')[0],
      endDate: new Date(now).toISOString().split('T')[0],
      config: {
        initialCapital: 100000,
        transactionCost: 0.1,
        slippage: 0.05,
        useAgentWeights: true,
        rebalanceFrequency: 'daily',
        agentWeights: config.weights,
      },
      results: {
        totalReturn,
        annualizedReturn: totalReturn,
        sharpeRatio: totalReturn / (baseVol * Math.sqrt(252) * 100) * 2,
        maxDrawdown,
        winRate: 52 + Math.random() * 10,
        totalTrades: 150 + Math.floor(Math.random() * 100),
        profitFactor: 1.2 + Math.random() * 0.5,
        volatility: baseVol * Math.sqrt(252) * 100,
        calmarRatio: totalReturn / maxDrawdown,
        sortinoRatio: totalReturn / (baseVol * Math.sqrt(252) * 50),
        beta: 0.8 + Math.random() * 0.4,
        alpha: totalReturn * 0.3,
        informationRatio: 0.5 + Math.random() * 0.5,
        treynorRatio: totalReturn / (0.8 + Math.random() * 0.4),
        equityCurve,
        drawdownCurve,
        monthlyReturns,
        tradeLog: [],
      },
      createdAt: new Date(now - idx * day * 7),
    };
    
    backtestStore.set(`${userId}_sample_${idx}`, run);
  });
}
