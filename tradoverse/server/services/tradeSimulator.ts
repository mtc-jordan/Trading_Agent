/**
 * Trade Simulator Service
 * 
 * Provides what-if analysis for proposed trades, showing projected impact
 * on portfolio metrics before execution.
 */

import { getDb } from '../db';
import { brokerConnections, portfolioAllocations } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Types for simulation
export interface SimulatedTrade {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedPrice: number;
  brokerType?: string;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  weight: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCash: number;
  totalEquity: number;
  positions: PortfolioPosition[];
  diversificationScore: number;
  concentrationRisk: number;
  beta: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdownRisk: number;
  sectorExposure: Record<string, number>;
}

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  trades: SimulatedTrade[];
  
  // Before metrics
  beforeMetrics: PortfolioMetrics;
  
  // After metrics (projected)
  afterMetrics: PortfolioMetrics;
  
  // Impact analysis
  impact: {
    totalValueChange: number;
    totalValueChangePercent: number;
    cashChange: number;
    diversificationChange: number;
    concentrationRiskChange: number;
    betaChange: number;
    volatilityChange: number;
    sharpeRatioChange: number;
    maxDrawdownRiskChange: number;
    newPositions: string[];
    closedPositions: string[];
    increasedPositions: string[];
    decreasedPositions: string[];
  };
  
  // Cost analysis
  costs: {
    estimatedCommission: number;
    estimatedSlippage: number;
    estimatedTaxImpact: number;
    totalCosts: number;
  };
  
  // Risk warnings
  warnings: SimulationWarning[];
  
  // Timestamp
  simulatedAt: string;
}

export interface SimulationWarning {
  type: 'concentration' | 'diversification' | 'liquidity' | 'volatility' | 'margin' | 'tax';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedSymbol?: string;
}

export interface ScenarioComparison {
  scenarios: SimulationResult[];
  bestScenario: string;
  worstScenario: string;
  recommendation: string;
}

// Sector mappings for common stocks
const SECTOR_MAPPING: Record<string, string> = {
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'GOOG': 'Technology',
  'META': 'Technology',
  'NVDA': 'Technology',
  'AMD': 'Technology',
  'INTC': 'Technology',
  'TSLA': 'Consumer Discretionary',
  'AMZN': 'Consumer Discretionary',
  'JPM': 'Financials',
  'BAC': 'Financials',
  'GS': 'Financials',
  'V': 'Financials',
  'MA': 'Financials',
  'JNJ': 'Healthcare',
  'UNH': 'Healthcare',
  'PFE': 'Healthcare',
  'MRNA': 'Healthcare',
  'XOM': 'Energy',
  'CVX': 'Energy',
  'COP': 'Energy',
  'PG': 'Consumer Staples',
  'KO': 'Consumer Staples',
  'PEP': 'Consumer Staples',
  'WMT': 'Consumer Staples',
  'HD': 'Consumer Discretionary',
  'NKE': 'Consumer Discretionary',
  'DIS': 'Communication Services',
  'NFLX': 'Communication Services',
  'T': 'Communication Services',
  'VZ': 'Communication Services',
  'CAT': 'Industrials',
  'BA': 'Industrials',
  'UPS': 'Industrials',
  'NEE': 'Utilities',
  'DUK': 'Utilities',
  'AMT': 'Real Estate',
  'PLD': 'Real Estate',
  'LIN': 'Materials',
  'APD': 'Materials',
};

// Beta values for common stocks (simplified)
const BETA_VALUES: Record<string, number> = {
  'AAPL': 1.25,
  'MSFT': 0.95,
  'GOOGL': 1.10,
  'META': 1.35,
  'NVDA': 1.70,
  'TSLA': 2.05,
  'AMZN': 1.20,
  'JPM': 1.15,
  'JNJ': 0.70,
  'PG': 0.45,
  'KO': 0.60,
  'XOM': 0.90,
  'default': 1.00,
};

// Volatility values (annualized, simplified)
const VOLATILITY_VALUES: Record<string, number> = {
  'AAPL': 0.28,
  'MSFT': 0.25,
  'GOOGL': 0.30,
  'META': 0.40,
  'NVDA': 0.55,
  'TSLA': 0.65,
  'AMZN': 0.35,
  'JPM': 0.30,
  'JNJ': 0.18,
  'PG': 0.15,
  'KO': 0.16,
  'XOM': 0.32,
  'default': 0.30,
};

/**
 * Calculate portfolio metrics from positions
 */
function calculatePortfolioMetrics(
  positions: PortfolioPosition[],
  cash: number
): PortfolioMetrics {
  const totalEquity = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalValue = totalEquity + cash;
  
  // Calculate weights
  const positionsWithWeights = positions.map(p => ({
    ...p,
    weight: totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0,
  }));
  
  // Diversification score (based on number of positions and weight distribution)
  const numPositions = positions.length;
  const weights = positionsWithWeights.map(p => p.weight / 100);
  const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
  const diversificationScore = numPositions > 0 
    ? Math.min(100, (1 - herfindahlIndex) * 100 * (Math.min(numPositions, 20) / 20))
    : 0;
  
  // Concentration risk (max single position weight)
  const maxWeight = Math.max(...weights, 0);
  const concentrationRisk = maxWeight * 100;
  
  // Portfolio beta (weighted average)
  let portfolioBeta = 0;
  for (const pos of positionsWithWeights) {
    const beta = BETA_VALUES[pos.symbol] || BETA_VALUES['default'];
    portfolioBeta += beta * (pos.weight / 100);
  }
  
  // Portfolio volatility (simplified - weighted average)
  let portfolioVolatility = 0;
  for (const pos of positionsWithWeights) {
    const vol = VOLATILITY_VALUES[pos.symbol] || VOLATILITY_VALUES['default'];
    portfolioVolatility += vol * (pos.weight / 100);
  }
  
  // Sharpe ratio estimate (assuming 5% risk-free rate and 10% expected return)
  const riskFreeRate = 0.05;
  const expectedReturn = 0.10;
  const sharpeRatio = portfolioVolatility > 0 
    ? (expectedReturn - riskFreeRate) / portfolioVolatility 
    : 0;
  
  // Max drawdown risk estimate (based on volatility)
  const maxDrawdownRisk = portfolioVolatility * 2.5; // Rough estimate
  
  // Sector exposure
  const sectorExposure: Record<string, number> = {};
  for (const pos of positionsWithWeights) {
    const sector = SECTOR_MAPPING[pos.symbol] || 'Other';
    sectorExposure[sector] = (sectorExposure[sector] || 0) + pos.weight;
  }
  
  return {
    totalValue,
    totalCash: cash,
    totalEquity,
    positions: positionsWithWeights,
    diversificationScore,
    concentrationRisk,
    beta: portfolioBeta,
    volatility: portfolioVolatility * 100, // Convert to percentage
    sharpeRatio,
    maxDrawdownRisk: maxDrawdownRisk * 100, // Convert to percentage
    sectorExposure,
  };
}

/**
 * Apply simulated trades to positions
 */
function applyTradesToPositions(
  positions: PortfolioPosition[],
  cash: number,
  trades: SimulatedTrade[]
): { positions: PortfolioPosition[]; cash: number } {
  const newPositions = [...positions.map(p => ({ ...p }))];
  let newCash = cash;
  
  for (const trade of trades) {
    const tradeValue = trade.quantity * trade.estimatedPrice;
    const existingIndex = newPositions.findIndex(p => p.symbol === trade.symbol);
    
    if (trade.side === 'buy') {
      newCash -= tradeValue;
      
      if (existingIndex >= 0) {
        // Add to existing position
        const existing = newPositions[existingIndex];
        const totalCost = existing.avgCost * existing.quantity + tradeValue;
        const totalQty = existing.quantity + trade.quantity;
        existing.quantity = totalQty;
        existing.avgCost = totalCost / totalQty;
        existing.marketValue = totalQty * trade.estimatedPrice;
        existing.currentPrice = trade.estimatedPrice;
        existing.unrealizedPL = existing.marketValue - (existing.avgCost * totalQty);
        existing.unrealizedPLPercent = (existing.unrealizedPL / (existing.avgCost * totalQty)) * 100;
      } else {
        // New position
        newPositions.push({
          symbol: trade.symbol,
          quantity: trade.quantity,
          avgCost: trade.estimatedPrice,
          currentPrice: trade.estimatedPrice,
          marketValue: tradeValue,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          weight: 0, // Will be recalculated
        });
      }
    } else {
      // Sell
      newCash += tradeValue;
      
      if (existingIndex >= 0) {
        const existing = newPositions[existingIndex];
        existing.quantity -= trade.quantity;
        
        if (existing.quantity <= 0) {
          // Remove position
          newPositions.splice(existingIndex, 1);
        } else {
          existing.marketValue = existing.quantity * trade.estimatedPrice;
          existing.currentPrice = trade.estimatedPrice;
          existing.unrealizedPL = existing.marketValue - (existing.avgCost * existing.quantity);
          existing.unrealizedPLPercent = (existing.unrealizedPL / (existing.avgCost * existing.quantity)) * 100;
        }
      }
    }
  }
  
  return { positions: newPositions, cash: newCash };
}

/**
 * Generate warnings based on simulation results
 */
function generateWarnings(
  beforeMetrics: PortfolioMetrics,
  afterMetrics: PortfolioMetrics,
  trades: SimulatedTrade[]
): SimulationWarning[] {
  const warnings: SimulationWarning[] = [];
  
  // Concentration warning
  if (afterMetrics.concentrationRisk > 25) {
    const topPosition = afterMetrics.positions.reduce((max, p) => 
      p.weight > max.weight ? p : max, afterMetrics.positions[0]);
    
    warnings.push({
      type: 'concentration',
      severity: afterMetrics.concentrationRisk > 40 ? 'high' : 'medium',
      message: `High concentration risk: ${topPosition?.symbol || 'Unknown'} will represent ${afterMetrics.concentrationRisk.toFixed(1)}% of portfolio`,
      affectedSymbol: topPosition?.symbol,
    });
  }
  
  // Diversification warning
  if (afterMetrics.diversificationScore < 40) {
    warnings.push({
      type: 'diversification',
      severity: afterMetrics.diversificationScore < 20 ? 'high' : 'medium',
      message: `Low diversification score (${afterMetrics.diversificationScore.toFixed(0)}). Consider spreading investments across more assets.`,
    });
  }
  
  // Volatility warning
  if (afterMetrics.volatility > beforeMetrics.volatility * 1.2) {
    warnings.push({
      type: 'volatility',
      severity: afterMetrics.volatility > 40 ? 'high' : 'medium',
      message: `Portfolio volatility will increase by ${((afterMetrics.volatility - beforeMetrics.volatility) / beforeMetrics.volatility * 100).toFixed(1)}%`,
    });
  }
  
  // Cash/margin warning
  if (afterMetrics.totalCash < 0) {
    warnings.push({
      type: 'margin',
      severity: 'high',
      message: `Insufficient cash: These trades would require $${Math.abs(afterMetrics.totalCash).toFixed(2)} in margin`,
    });
  } else if (afterMetrics.totalCash < afterMetrics.totalValue * 0.05) {
    warnings.push({
      type: 'margin',
      severity: 'low',
      message: `Low cash reserve: Only ${(afterMetrics.totalCash / afterMetrics.totalValue * 100).toFixed(1)}% cash remaining`,
    });
  }
  
  // Tax impact warning for sells
  const sellTrades = trades.filter(t => t.side === 'sell');
  if (sellTrades.length > 0) {
    warnings.push({
      type: 'tax',
      severity: 'low',
      message: `${sellTrades.length} sell trade(s) may trigger capital gains tax. Review tax implications.`,
    });
  }
  
  return warnings;
}

/**
 * Estimate trading costs
 */
function estimateCosts(
  trades: SimulatedTrade[],
  beforePositions: PortfolioPosition[]
): { estimatedCommission: number; estimatedSlippage: number; estimatedTaxImpact: number; totalCosts: number } {
  let estimatedCommission = 0;
  let estimatedSlippage = 0;
  let estimatedTaxImpact = 0;
  
  for (const trade of trades) {
    const tradeValue = trade.quantity * trade.estimatedPrice;
    
    // Commission (assume $0.005 per share, min $1)
    estimatedCommission += Math.max(1, trade.quantity * 0.005);
    
    // Slippage (assume 0.1% of trade value)
    estimatedSlippage += tradeValue * 0.001;
    
    // Tax impact for sells (simplified - assume 15% capital gains on profit)
    if (trade.side === 'sell') {
      const existingPosition = beforePositions.find(p => p.symbol === trade.symbol);
      if (existingPosition && existingPosition.unrealizedPL > 0) {
        const profitPerShare = existingPosition.unrealizedPL / existingPosition.quantity;
        const realizedProfit = Math.min(trade.quantity, existingPosition.quantity) * profitPerShare;
        if (realizedProfit > 0) {
          estimatedTaxImpact += realizedProfit * 0.15;
        }
      }
    }
  }
  
  return {
    estimatedCommission,
    estimatedSlippage,
    estimatedTaxImpact,
    totalCosts: estimatedCommission + estimatedSlippage + estimatedTaxImpact,
  };
}

/**
 * Simulate trades and return impact analysis
 */
export async function simulateTrades(
  userId: string,
  trades: SimulatedTrade[],
  scenarioName: string = 'Default Scenario',
  currentPositions?: PortfolioPosition[],
  currentCash?: number
): Promise<SimulationResult> {
  // Use provided positions or fetch from database
  const positions = currentPositions || [];
  const cash = currentCash ?? 10000;
  
  // Calculate before metrics
  const beforeMetrics = calculatePortfolioMetrics(positions, cash);
  
  // Apply trades
  const { positions: newPositions, cash: newCash } = applyTradesToPositions(positions, cash, trades);
  
  // Calculate after metrics
  const afterMetrics = calculatePortfolioMetrics(newPositions, newCash);
  
  // Generate warnings
  const warnings = generateWarnings(beforeMetrics, afterMetrics, trades);
  
  // Estimate costs
  const costs = estimateCosts(trades, positions);
  
  // Calculate impact
  const beforeSymbols = new Set(positions.map(p => p.symbol));
  const afterSymbols = new Set(newPositions.map(p => p.symbol));
  
  const newPositionSymbols = Array.from(afterSymbols).filter(s => !beforeSymbols.has(s));
  const closedPositionSymbols = Array.from(beforeSymbols).filter(s => !afterSymbols.has(s));
  
  const increasedPositions: string[] = [];
  const decreasedPositions: string[] = [];
  
  for (const trade of trades) {
    if (beforeSymbols.has(trade.symbol) && afterSymbols.has(trade.symbol)) {
      if (trade.side === 'buy') {
        increasedPositions.push(trade.symbol);
      } else {
        decreasedPositions.push(trade.symbol);
      }
    }
  }
  
  const impact = {
    totalValueChange: afterMetrics.totalValue - beforeMetrics.totalValue - costs.totalCosts,
    totalValueChangePercent: beforeMetrics.totalValue > 0 
      ? ((afterMetrics.totalValue - beforeMetrics.totalValue - costs.totalCosts) / beforeMetrics.totalValue) * 100 
      : 0,
    cashChange: afterMetrics.totalCash - beforeMetrics.totalCash,
    diversificationChange: afterMetrics.diversificationScore - beforeMetrics.diversificationScore,
    concentrationRiskChange: afterMetrics.concentrationRisk - beforeMetrics.concentrationRisk,
    betaChange: afterMetrics.beta - beforeMetrics.beta,
    volatilityChange: afterMetrics.volatility - beforeMetrics.volatility,
    sharpeRatioChange: afterMetrics.sharpeRatio - beforeMetrics.sharpeRatio,
    maxDrawdownRiskChange: afterMetrics.maxDrawdownRisk - beforeMetrics.maxDrawdownRisk,
    newPositions: newPositionSymbols,
    closedPositions: closedPositionSymbols,
    increasedPositions: Array.from(new Set(increasedPositions)),
    decreasedPositions: Array.from(new Set(decreasedPositions)),
  };
  
  return {
    scenarioId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    scenarioName,
    trades,
    beforeMetrics,
    afterMetrics,
    impact,
    costs,
    warnings,
    simulatedAt: new Date().toISOString(),
  };
}

/**
 * Compare multiple simulation scenarios
 */
export async function compareScenarios(
  userId: string,
  scenarios: Array<{ trades: SimulatedTrade[]; name: string }>,
  currentPositions?: PortfolioPosition[],
  currentCash?: number
): Promise<ScenarioComparison> {
  const results: SimulationResult[] = [];
  
  for (const scenario of scenarios) {
    const result = await simulateTrades(
      userId,
      scenario.trades,
      scenario.name,
      currentPositions,
      currentCash
    );
    results.push(result);
  }
  
  // Find best and worst scenarios based on Sharpe ratio improvement
  let bestScenario = results[0]?.scenarioName || '';
  let worstScenario = results[0]?.scenarioName || '';
  let bestSharpeChange = results[0]?.impact.sharpeRatioChange || -Infinity;
  let worstSharpeChange = results[0]?.impact.sharpeRatioChange || Infinity;
  
  for (const result of results) {
    if (result.impact.sharpeRatioChange > bestSharpeChange) {
      bestSharpeChange = result.impact.sharpeRatioChange;
      bestScenario = result.scenarioName;
    }
    if (result.impact.sharpeRatioChange < worstSharpeChange) {
      worstSharpeChange = result.impact.sharpeRatioChange;
      worstScenario = result.scenarioName;
    }
  }
  
  // Generate recommendation
  let recommendation = '';
  const bestResult = results.find(r => r.scenarioName === bestScenario);
  
  if (bestResult) {
    if (bestResult.warnings.some(w => w.severity === 'high')) {
      recommendation = `"${bestScenario}" has the best risk-adjusted return improvement, but has high-severity warnings. Review carefully before execution.`;
    } else if (bestResult.impact.sharpeRatioChange > 0) {
      recommendation = `"${bestScenario}" is recommended as it improves the portfolio's risk-adjusted return by ${(bestResult.impact.sharpeRatioChange * 100).toFixed(2)}%.`;
    } else {
      recommendation = `None of the scenarios significantly improve risk-adjusted returns. Consider alternative strategies.`;
    }
  }
  
  return {
    scenarios: results,
    bestScenario,
    worstScenario,
    recommendation,
  };
}

/**
 * Generate optimized rebalancing suggestions
 */
export async function generateOptimizedTrades(
  userId: string,
  targetAllocations: Array<{ symbol: string; targetPercent: number }>,
  currentPositions: PortfolioPosition[],
  currentCash: number,
  constraints?: {
    maxTradesPerSymbol?: number;
    minTradeValue?: number;
    maxConcentration?: number;
    preserveCash?: number;
  }
): Promise<SimulatedTrade[]> {
  const trades: SimulatedTrade[] = [];
  const totalValue = currentPositions.reduce((sum, p) => sum + p.marketValue, 0) + currentCash;
  
  const maxConcentration = constraints?.maxConcentration || 25;
  const minTradeValue = constraints?.minTradeValue || 100;
  const preserveCash = constraints?.preserveCash || totalValue * 0.05;
  
  // Calculate target values
  const targetValues: Record<string, number> = {};
  for (const target of targetAllocations) {
    // Cap at max concentration
    const cappedPercent = Math.min(target.targetPercent, maxConcentration);
    targetValues[target.symbol] = (cappedPercent / 100) * totalValue;
  }
  
  // Calculate current values
  const currentValues: Record<string, number> = {};
  for (const pos of currentPositions) {
    currentValues[pos.symbol] = pos.marketValue;
  }
  
  // Generate trades
  const allSymbols = Array.from(new Set([...Object.keys(targetValues), ...Object.keys(currentValues)]));
  
  for (const symbol of allSymbols) {
    const currentValue = currentValues[symbol] || 0;
    const targetValue = targetValues[symbol] || 0;
    const difference = targetValue - currentValue;
    
    if (Math.abs(difference) < minTradeValue) continue;
    
    // Get current price (use position price or estimate)
    const position = currentPositions.find(p => p.symbol === symbol);
    const estimatedPrice = position?.currentPrice || 100; // Default price if unknown
    
    const quantity = Math.abs(Math.floor(difference / estimatedPrice));
    if (quantity === 0) continue;
    
    trades.push({
      symbol,
      side: difference > 0 ? 'buy' : 'sell',
      quantity,
      estimatedPrice,
    });
  }
  
  // Check if we have enough cash for buys
  const totalBuys = trades
    .filter(t => t.side === 'buy')
    .reduce((sum, t) => sum + t.quantity * t.estimatedPrice, 0);
  
  const availableCash = currentCash - preserveCash;
  
  if (totalBuys > availableCash) {
    // Scale down buys proportionally
    const scaleFactor = availableCash / totalBuys;
    for (const trade of trades) {
      if (trade.side === 'buy') {
        trade.quantity = Math.floor(trade.quantity * scaleFactor);
      }
    }
  }
  
  // Remove zero-quantity trades
  return trades.filter(t => t.quantity > 0);
}

/**
 * Get sample positions for simulation (demo data)
 */
export function getSamplePositions(): PortfolioPosition[] {
  return [
    { symbol: 'AAPL', quantity: 50, avgCost: 145.00, currentPrice: 175.00, marketValue: 8750, unrealizedPL: 1500, unrealizedPLPercent: 20.69, weight: 0 },
    { symbol: 'MSFT', quantity: 30, avgCost: 280.00, currentPrice: 375.00, marketValue: 11250, unrealizedPL: 2850, unrealizedPLPercent: 33.93, weight: 0 },
    { symbol: 'GOOGL', quantity: 20, avgCost: 120.00, currentPrice: 140.00, marketValue: 2800, unrealizedPL: 400, unrealizedPLPercent: 16.67, weight: 0 },
    { symbol: 'NVDA', quantity: 15, avgCost: 400.00, currentPrice: 480.00, marketValue: 7200, unrealizedPL: 1200, unrealizedPLPercent: 20.00, weight: 0 },
    { symbol: 'TSLA', quantity: 25, avgCost: 200.00, currentPrice: 250.00, marketValue: 6250, unrealizedPL: 1250, unrealizedPLPercent: 25.00, weight: 0 },
  ];
}
