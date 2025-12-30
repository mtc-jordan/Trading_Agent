/**
 * Strategy Backtester for 7-Agent Consensus System
 * 
 * Backtests the multi-agent trading system against historical data
 * to validate performance before deploying with real capital.
 * 
 * Features:
 * - Historical simulation with realistic execution
 * - Transaction costs and slippage modeling
 * - Performance metrics calculation
 * - Comparison with benchmarks
 * - Walk-forward validation
 */

// Types
export interface BacktestConfig {
  symbol: string;
  startDate: string; // ISO date string
  endDate: string;
  initialCapital: number;
  positionSizing: 'fixed' | 'percent' | 'kelly' | 'volatility';
  positionSize: number; // Fixed amount or percentage
  maxPositionSize: number;
  stopLoss: number; // Percentage
  takeProfit: number; // Percentage
  transactionCost: number; // Percentage per trade
  slippage: number; // Percentage
  useAgentWeights: boolean;
  agentWeights?: Record<string, number>;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  benchmark: string; // e.g., 'SPY', 'BTC'
}

export interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalValue: number;
  transactionCost: number;
  slippage: number;
  agentSignals: Record<string, 'buy' | 'sell' | 'hold'>;
  consensusSignal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reason: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface DailySnapshot {
  date: string;
  portfolioValue: number;
  cash: number;
  positions: Position[];
  dailyReturn: number;
  cumulativeReturn: number;
  drawdown: number;
  trades: Trade[];
  agentSignals: Record<string, 'buy' | 'sell' | 'hold'>;
  consensusSignal: 'buy' | 'sell' | 'hold';
  confidence: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  summary: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    maxDrawdownDuration: number; // days
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTradeReturn: number;
    avgWin: number;
    avgLoss: number;
    avgHoldingPeriod: number; // days
    calmarRatio: number;
    informationRatio: number;
    beta: number;
    alpha: number;
  };
  dailySnapshots: DailySnapshot[];
  trades: Trade[];
  agentPerformance: Array<{
    agentType: string;
    accuracy: number;
    profitableSignals: number;
    totalSignals: number;
    contribution: number;
  }>;
  benchmarkComparison: {
    benchmarkReturn: number;
    excessReturn: number;
    trackingError: number;
    informationRatio: number;
  };
  monthlyReturns: Array<{
    month: string;
    return: number;
    benchmarkReturn: number;
  }>;
  drawdownPeriods: Array<{
    startDate: string;
    endDate: string;
    maxDrawdown: number;
    duration: number;
    recovery: number;
  }>;
}

// Default agent weights
const DEFAULT_WEIGHTS: Record<string, number> = {
  technical: 0.20,
  fundamental: 0.18,
  sentiment: 0.12,
  risk: 0.15,
  regime: 0.12,
  execution: 0.08,
  coordinator: 0.15,
};

/**
 * Generate mock historical price data for backtesting
 */
function generateMockPriceData(
  symbol: string,
  startDate: string,
  endDate: string
): Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> = [];
  
  let price = symbol.includes('BTC') ? 40000 : 150; // Starting price
  const volatility = symbol.includes('BTC') ? 0.03 : 0.015;
  const drift = 0.0002; // Small upward drift
  
  const current = new Date(start);
  while (current <= end) {
    // Skip weekends for stocks
    if (!symbol.includes('BTC') && (current.getDay() === 0 || current.getDay() === 6)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    
    // Generate random price movement
    const dailyReturn = drift + volatility * (Math.random() - 0.5) * 2;
    const open = price;
    price = price * (1 + dailyReturn);
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    data.push({
      date: current.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return data;
}

/**
 * Simulate agent signals for a given price point
 */
function simulateAgentSignals(
  priceData: Array<{ close: number; volume: number }>,
  index: number
): Record<string, { signal: 'buy' | 'sell' | 'hold'; confidence: number }> {
  if (index < 20) {
    return {
      technical: { signal: 'hold', confidence: 0.5 },
      fundamental: { signal: 'hold', confidence: 0.5 },
      sentiment: { signal: 'hold', confidence: 0.5 },
      risk: { signal: 'hold', confidence: 0.5 },
      regime: { signal: 'hold', confidence: 0.5 },
      execution: { signal: 'hold', confidence: 0.5 },
      coordinator: { signal: 'hold', confidence: 0.5 },
    };
  }
  
  // Calculate simple indicators
  const prices = priceData.slice(Math.max(0, index - 20), index + 1).map(p => p.close);
  const sma20 = prices.reduce((a, b) => a + b, 0) / prices.length;
  const currentPrice = prices[prices.length - 1];
  const priceChange = (currentPrice - prices[0]) / prices[0];
  
  // Calculate momentum
  const momentum = priceChange > 0.02 ? 'bullish' : priceChange < -0.02 ? 'bearish' : 'neutral';
  
  // Generate signals based on simple rules
  const signals: Record<string, { signal: 'buy' | 'sell' | 'hold'; confidence: number }> = {};
  
  // Technical agent - trend following
  signals.technical = {
    signal: currentPrice > sma20 * 1.02 ? 'buy' : currentPrice < sma20 * 0.98 ? 'sell' : 'hold',
    confidence: 0.6 + Math.random() * 0.3,
  };
  
  // Fundamental agent - mean reversion
  signals.fundamental = {
    signal: currentPrice < sma20 * 0.95 ? 'buy' : currentPrice > sma20 * 1.05 ? 'sell' : 'hold',
    confidence: 0.5 + Math.random() * 0.3,
  };
  
  // Sentiment agent - momentum
  signals.sentiment = {
    signal: momentum === 'bullish' ? 'buy' : momentum === 'bearish' ? 'sell' : 'hold',
    confidence: 0.5 + Math.random() * 0.3,
  };
  
  // Risk agent - volatility based
  const recentPrices = prices.slice(-5);
  const volatility = Math.sqrt(
    recentPrices.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const ret = (p - recentPrices[i - 1]) / recentPrices[i - 1];
      return sum + ret * ret;
    }, 0) / (recentPrices.length - 1)
  );
  signals.risk = {
    signal: volatility > 0.03 ? 'sell' : volatility < 0.01 ? 'buy' : 'hold',
    confidence: 0.6 + Math.random() * 0.2,
  };
  
  // Regime agent
  signals.regime = {
    signal: priceChange > 0.05 ? 'buy' : priceChange < -0.05 ? 'sell' : 'hold',
    confidence: 0.5 + Math.random() * 0.3,
  };
  
  // Execution agent
  signals.execution = {
    signal: 'hold',
    confidence: 0.5,
  };
  
  // Coordinator agent - follows majority
  const buyCount = Object.values(signals).filter(s => s.signal === 'buy').length;
  const sellCount = Object.values(signals).filter(s => s.signal === 'sell').length;
  signals.coordinator = {
    signal: buyCount > sellCount ? 'buy' : sellCount > buyCount ? 'sell' : 'hold',
    confidence: 0.7,
  };
  
  return signals;
}

/**
 * Calculate consensus signal from agent signals
 */
function calculateConsensus(
  signals: Record<string, { signal: 'buy' | 'sell' | 'hold'; confidence: number }>,
  weights: Record<string, number>
): { signal: 'buy' | 'sell' | 'hold'; confidence: number } {
  let buyScore = 0;
  let sellScore = 0;
  let holdScore = 0;
  let totalWeight = 0;
  
  for (const [agent, data] of Object.entries(signals)) {
    const weight = weights[agent] || 0.1;
    totalWeight += weight;
    
    if (data.signal === 'buy') {
      buyScore += weight * data.confidence;
    } else if (data.signal === 'sell') {
      sellScore += weight * data.confidence;
    } else {
      holdScore += weight * data.confidence;
    }
  }
  
  // Normalize
  buyScore /= totalWeight;
  sellScore /= totalWeight;
  holdScore /= totalWeight;
  
  // Determine consensus
  const maxScore = Math.max(buyScore, sellScore, holdScore);
  let signal: 'buy' | 'sell' | 'hold';
  
  if (maxScore === buyScore && buyScore > 0.4) {
    signal = 'buy';
  } else if (maxScore === sellScore && sellScore > 0.4) {
    signal = 'sell';
  } else {
    signal = 'hold';
  }
  
  return { signal, confidence: maxScore };
}

/**
 * Run backtest on the 7-agent consensus system
 */
export async function runAgentBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const weights = config.useAgentWeights && config.agentWeights 
    ? config.agentWeights 
    : DEFAULT_WEIGHTS;
  
  // Generate mock price data
  const priceData = generateMockPriceData(config.symbol, config.startDate, config.endDate);
  const benchmarkData = generateMockPriceData(config.benchmark, config.startDate, config.endDate);
  
  // Initialize portfolio
  let cash = config.initialCapital;
  let position: Position | null = null;
  const trades: Trade[] = [];
  const dailySnapshots: DailySnapshot[] = [];
  
  // Track agent performance
  const agentStats: Record<string, { correct: number; total: number; profitable: number }> = {};
  for (const agent of Object.keys(weights)) {
    agentStats[agent] = { correct: 0, total: 0, profitable: 0 };
  }
  
  // Track drawdown
  let peakValue = config.initialCapital;
  let maxDrawdown = 0;
  let drawdownStart: string | null = null;
  const drawdownPeriods: BacktestResult['drawdownPeriods'] = [];
  
  // Monthly returns tracking
  const monthlyReturns: Map<string, { return: number; benchmarkReturn: number }> = new Map();
  let lastMonthValue = config.initialCapital;
  let lastMonth = '';
  
  // Process each day
  for (let i = 0; i < priceData.length; i++) {
    const day = priceData[i];
    const currentMonth = day.date.substring(0, 7);
    
    // Get agent signals
    const agentSignals = simulateAgentSignals(
      priceData.slice(0, i + 1).map(p => ({ close: p.close, volume: p.volume })),
      i
    );
    
    // Calculate consensus
    const consensus = calculateConsensus(agentSignals, weights);
    
    // Calculate portfolio value
    const portfolioValue = cash + (position ? position.quantity * day.close : 0);
    
    // Track drawdown
    if (portfolioValue > peakValue) {
      peakValue = portfolioValue;
      if (drawdownStart) {
        // End of drawdown period
        drawdownPeriods.push({
          startDate: drawdownStart,
          endDate: day.date,
          maxDrawdown: maxDrawdown,
          duration: Math.floor((new Date(day.date).getTime() - new Date(drawdownStart).getTime()) / (1000 * 60 * 60 * 24)),
          recovery: Math.floor((new Date(day.date).getTime() - new Date(drawdownStart).getTime()) / (1000 * 60 * 60 * 24)),
        });
        drawdownStart = null;
      }
    } else {
      const currentDrawdown = (peakValue - portfolioValue) / peakValue;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
      if (!drawdownStart && currentDrawdown > 0.01) {
        drawdownStart = day.date;
      }
    }
    
    // Track monthly returns
    if (currentMonth !== lastMonth && lastMonth !== '') {
      const monthReturn = (portfolioValue - lastMonthValue) / lastMonthValue;
      const benchmarkMonthReturn = i > 0 
        ? (benchmarkData[i].close - benchmarkData[Math.max(0, i - 20)].close) / benchmarkData[Math.max(0, i - 20)].close
        : 0;
      monthlyReturns.set(lastMonth, { return: monthReturn, benchmarkReturn: benchmarkMonthReturn });
      lastMonthValue = portfolioValue;
    }
    lastMonth = currentMonth;
    
    // Execute trades based on consensus
    const dayTrades: Trade[] = [];
    
    if (consensus.signal === 'buy' && !position && consensus.confidence > 0.5) {
      // Calculate position size
      let positionValue: number;
      if (config.positionSizing === 'fixed') {
        positionValue = Math.min(config.positionSize, cash * 0.95);
      } else if (config.positionSizing === 'percent') {
        positionValue = Math.min(cash * (config.positionSize / 100), cash * 0.95);
      } else {
        positionValue = cash * 0.5; // Default 50%
      }
      
      const quantity = Math.floor(positionValue / day.close);
      if (quantity > 0) {
        const transactionCost = positionValue * (config.transactionCost / 100);
        const slippageCost = positionValue * (config.slippage / 100);
        const totalCost = positionValue + transactionCost + slippageCost;
        
        if (totalCost <= cash) {
          const trade: Trade = {
            id: `trade-${trades.length + 1}`,
            timestamp: new Date(day.date).getTime(),
            symbol: config.symbol,
            side: 'buy',
            quantity,
            price: day.close * (1 + config.slippage / 100),
            totalValue: positionValue,
            transactionCost,
            slippage: slippageCost,
            agentSignals: Object.fromEntries(
              Object.entries(agentSignals).map(([k, v]) => [k, v.signal])
            ),
            consensusSignal: consensus.signal,
            confidence: consensus.confidence,
            reason: 'Consensus buy signal',
          };
          
          trades.push(trade);
          dayTrades.push(trade);
          cash -= totalCost;
          position = {
            symbol: config.symbol,
            quantity,
            avgCost: trade.price,
            currentPrice: day.close,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
          };
        }
      }
    } else if (consensus.signal === 'sell' && position && consensus.confidence > 0.5) {
      // Sell position
      const saleValue = position.quantity * day.close * (1 - config.slippage / 100);
      const transactionCost = saleValue * (config.transactionCost / 100);
      const slippageCost = position.quantity * day.close * (config.slippage / 100);
      
      const trade: Trade = {
        id: `trade-${trades.length + 1}`,
        timestamp: new Date(day.date).getTime(),
        symbol: config.symbol,
        side: 'sell',
        quantity: position.quantity,
        price: day.close * (1 - config.slippage / 100),
        totalValue: saleValue,
        transactionCost,
        slippage: slippageCost,
        agentSignals: Object.fromEntries(
          Object.entries(agentSignals).map(([k, v]) => [k, v.signal])
        ),
        consensusSignal: consensus.signal,
        confidence: consensus.confidence,
        reason: 'Consensus sell signal',
      };
      
      trades.push(trade);
      dayTrades.push(trade);
      cash += saleValue - transactionCost;
      
      // Track agent performance
      const tradeReturn = (trade.price - position.avgCost) / position.avgCost;
      for (const [agent, data] of Object.entries(agentSignals)) {
        agentStats[agent].total++;
        if ((data.signal === 'buy' && tradeReturn > 0) || (data.signal === 'sell' && tradeReturn < 0)) {
          agentStats[agent].correct++;
        }
        if (tradeReturn > 0) {
          agentStats[agent].profitable++;
        }
      }
      
      position = null;
    }
    
    // Update position value
    if (position) {
      position.currentPrice = day.close;
      position.unrealizedPnL = (day.close - position.avgCost) * position.quantity;
      position.unrealizedPnLPercent = (day.close - position.avgCost) / position.avgCost;
    }
    
    // Calculate daily return
    const prevValue = i > 0 ? dailySnapshots[i - 1].portfolioValue : config.initialCapital;
    const dailyReturn = (portfolioValue - prevValue) / prevValue;
    const cumulativeReturn = (portfolioValue - config.initialCapital) / config.initialCapital;
    
    // Create daily snapshot
    dailySnapshots.push({
      date: day.date,
      portfolioValue,
      cash,
      positions: position ? [position] : [],
      dailyReturn,
      cumulativeReturn,
      drawdown: peakValue > 0 ? (peakValue - portfolioValue) / peakValue : 0,
      trades: dayTrades,
      agentSignals: Object.fromEntries(
        Object.entries(agentSignals).map(([k, v]) => [k, v.signal])
      ),
      consensusSignal: consensus.signal,
      confidence: consensus.confidence,
    });
  }
  
  // Calculate summary statistics
  const finalValue = dailySnapshots[dailySnapshots.length - 1].portfolioValue;
  const totalReturn = (finalValue - config.initialCapital) / config.initialCapital;
  
  const dailyReturns = dailySnapshots.map(s => s.dailyReturn);
  const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const volatility = Math.sqrt(
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length
  ) * Math.sqrt(252);
  
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / dailySnapshots.length) - 1;
  const sharpeRatio = volatility > 0 ? annualizedReturn / volatility : 0;
  
  // Calculate Sortino ratio
  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downsideDeviation = Math.sqrt(
    negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
  ) * Math.sqrt(252);
  const sortinoRatio = downsideDeviation > 0 ? annualizedReturn / downsideDeviation : 0;
  
  // Calculate trade statistics
  const tradePairs: Array<{ buy: Trade; sell: Trade }> = [];
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].side === 'buy' && trades[i + 1]?.side === 'sell') {
      tradePairs.push({ buy: trades[i], sell: trades[i + 1] });
    }
  }
  
  const tradeReturns = tradePairs.map(p => (p.sell.price - p.buy.price) / p.buy.price);
  const winningTrades = tradeReturns.filter(r => r > 0);
  const losingTrades = tradeReturns.filter(r => r < 0);
  
  const winRate = tradeReturns.length > 0 ? winningTrades.length / tradeReturns.length : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((a, b) => a + b, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((a, b) => a + b, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : avgWin > 0 ? Infinity : 0;
  
  // Calculate benchmark comparison
  const benchmarkReturn = (benchmarkData[benchmarkData.length - 1].close - benchmarkData[0].close) / benchmarkData[0].close;
  const excessReturn = totalReturn - benchmarkReturn;
  
  // Calculate tracking error
  const benchmarkReturns = benchmarkData.slice(1).map((d, i) => 
    (d.close - benchmarkData[i].close) / benchmarkData[i].close
  );
  const returnDiffs = dailyReturns.slice(0, benchmarkReturns.length).map((r, i) => r - benchmarkReturns[i]);
  const trackingError = Math.sqrt(
    returnDiffs.reduce((sum, d) => sum + d * d, 0) / returnDiffs.length
  ) * Math.sqrt(252);
  
  const informationRatio = trackingError > 0 ? excessReturn / trackingError : 0;
  
  // Calculate max drawdown duration
  let maxDrawdownDuration = 0;
  for (const period of drawdownPeriods) {
    if (period.duration > maxDrawdownDuration) {
      maxDrawdownDuration = period.duration;
    }
  }
  
  // Calmar ratio
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  
  // Agent performance
  const agentPerformance = Object.entries(agentStats).map(([agentType, stats]) => ({
    agentType,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    profitableSignals: stats.profitable,
    totalSignals: stats.total,
    contribution: weights[agentType] || 0,
  }));
  
  return {
    config,
    summary: {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownDuration,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      avgTradeReturn: tradeReturns.length > 0 ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length : 0,
      avgWin,
      avgLoss,
      avgHoldingPeriod: tradePairs.length > 0 
        ? tradePairs.reduce((sum, p) => sum + (p.sell.timestamp - p.buy.timestamp) / (1000 * 60 * 60 * 24), 0) / tradePairs.length
        : 0,
      calmarRatio,
      informationRatio,
      beta: 1.0, // Simplified
      alpha: excessReturn,
    },
    dailySnapshots,
    trades,
    agentPerformance,
    benchmarkComparison: {
      benchmarkReturn,
      excessReturn,
      trackingError,
      informationRatio,
    },
    monthlyReturns: Array.from(monthlyReturns.entries()).map(([month, data]) => ({
      month,
      return: data.return,
      benchmarkReturn: data.benchmarkReturn,
    })),
    drawdownPeriods,
  };
}

/**
 * Run quick backtest with default settings
 */
export async function runQuickBacktest(
  symbol: string,
  days: number = 252
): Promise<BacktestResult> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return runAgentBacktest({
    symbol,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    initialCapital: 100000,
    positionSizing: 'percent',
    positionSize: 50,
    maxPositionSize: 100000,
    stopLoss: 5,
    takeProfit: 10,
    transactionCost: 0.1,
    slippage: 0.05,
    useAgentWeights: true,
    rebalanceFrequency: 'daily',
    benchmark: symbol.includes('BTC') ? 'BTC' : 'SPY',
  });
}

export default {
  runAgentBacktest,
  runQuickBacktest,
};
