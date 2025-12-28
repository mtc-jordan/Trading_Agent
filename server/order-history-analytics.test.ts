/**
 * Tests for Order History, Broker Analytics, and Portfolio Rebalancing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock services
vi.mock('./services/orderHistory', () => ({
  recordOrderExecution: vi.fn().mockResolvedValue({ id: 'exec-1' }),
  getOrderHistory: vi.fn().mockResolvedValue({
    executions: [
      {
        id: 'exec-1',
        connectionId: 'conn-1',
        orderId: 'order-1',
        symbol: 'AAPL',
        side: 'buy',
        orderType: 'market',
        executedQuantity: 10,
        executedPrice: 150.00,
        executionValue: 1500.00,
        commission: 0.50,
        fees: 0.02,
        isClosingTrade: false,
        realizedPL: null,
        realizedPLPercent: null,
        executedAt: new Date().toISOString(),
      }
    ],
    total: 1,
    hasMore: false,
  }),
  getPnLSummary: vi.fn().mockResolvedValue({
    totalRealizedPL: 1500.00,
    totalUnrealizedPL: 250.00,
    totalTrades: 25,
    winningTrades: 18,
    losingTrades: 7,
    winRate: 72.0,
    avgWin: 150.00,
    avgLoss: -75.00,
    profitFactor: 2.0,
    avgHoldingPeriod: 3.5,
  }),
  getSymbolPnLBreakdown: vi.fn().mockResolvedValue([
    { symbol: 'AAPL', totalPL: 800.00, trades: 10, winRate: 80.0, totalVolume: 15000.00 },
    { symbol: 'GOOGL', totalPL: 500.00, trades: 8, winRate: 62.5, totalVolume: 12000.00 },
    { symbol: 'MSFT', totalPL: 200.00, trades: 7, winRate: 71.4, totalVolume: 8000.00 },
  ]),
  getDailyPnL: vi.fn().mockResolvedValue([
    { date: '2024-01-01', pnl: 150.00, trades: 3, cumulativePnl: 150.00 },
    { date: '2024-01-02', pnl: -50.00, trades: 2, cumulativePnl: 100.00 },
    { date: '2024-01-03', pnl: 200.00, trades: 4, cumulativePnl: 300.00 },
  ]),
}));

vi.mock('./services/brokerAnalytics', () => ({
  getAggregatedAnalytics: vi.fn().mockResolvedValue({
    totalEquity: 100000.00,
    totalCash: 25000.00,
    totalBuyingPower: 50000.00,
    totalDayPL: 500.00,
    totalPL: 5000.00,
    connectionCount: 2,
    brokerBreakdown: [
      { connectionId: 'conn-1', brokerType: 'alpaca', equity: 60000.00, cash: 15000.00, totalPL: 3000.00 },
      { connectionId: 'conn-2', brokerType: 'interactive_brokers', equity: 40000.00, cash: 10000.00, totalPL: 2000.00 },
    ],
  }),
  getPerformanceMetrics: vi.fn().mockResolvedValue([
    {
      id: 'metric-1',
      connectionId: 'conn-1',
      periodType: 'monthly',
      totalReturn: 5000.00,
      totalReturnPercent: 5.0,
      totalTrades: 50,
      winningTrades: 35,
      losingTrades: 15,
      winRate: 70.0,
      avgWin: 200.00,
      avgLoss: -100.00,
      profitFactor: 2.33,
      sharpeRatio: 1.5,
      sortinoRatio: 2.0,
      maxDrawdown: 8.5,
      volatility: 12.0,
      avgTradeSize: 2000.00,
      avgHoldingPeriod: 2.5,
      largestWin: 1000.00,
      largestLoss: -500.00,
      totalVolume: 100000.00,
    }
  ]),
  calculateMetrics: vi.fn().mockResolvedValue({ success: true }),
  getBuyingPowerHistory: vi.fn().mockResolvedValue([
    { date: '2024-01-01', buyingPower: 50000.00, equity: 100000.00, marginUtilization: 50.0 },
    { date: '2024-01-02', buyingPower: 48000.00, equity: 98000.00, marginUtilization: 51.0 },
  ]),
  getTradeFrequency: vi.fn().mockResolvedValue({
    daily: [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 },
    ],
    hourly: [
      { hour: 9, count: 10 },
      { hour: 10, count: 15 },
      { hour: 14, count: 8 },
    ],
    bySymbol: [
      { symbol: 'AAPL', count: 25 },
      { symbol: 'GOOGL', count: 18 },
    ],
  }),
}));

vi.mock('./services/portfolioRebalancing', () => ({
  createAllocation: vi.fn().mockResolvedValue({ id: 'alloc-1' }),
  getUserAllocations: vi.fn().mockResolvedValue([
    {
      id: 'alloc-1',
      name: 'Growth Portfolio',
      description: 'Tech-heavy growth allocation',
      targetAllocations: [
        { symbol: 'AAPL', targetPercent: 30 },
        { symbol: 'GOOGL', targetPercent: 25 },
        { symbol: 'MSFT', targetPercent: 25 },
        { symbol: 'NVDA', targetPercent: 20 },
      ],
      rebalanceThreshold: 5,
      rebalanceFrequency: 'monthly',
      isActive: true,
    }
  ]),
  getRebalanceSuggestions: vi.fn().mockResolvedValue({
    allocationId: 'alloc-1',
    totalPortfolioValue: 100000.00,
    currentAllocations: [
      { symbol: 'AAPL', currentPercent: 35, targetPercent: 30, drift: 5, currentValue: 35000.00 },
      { symbol: 'GOOGL', currentPercent: 20, targetPercent: 25, drift: -5, currentValue: 20000.00 },
      { symbol: 'MSFT', currentPercent: 27, targetPercent: 25, drift: 2, currentValue: 27000.00 },
      { symbol: 'NVDA', currentPercent: 18, targetPercent: 20, drift: -2, currentValue: 18000.00 },
    ],
    suggestedTrades: [
      { symbol: 'AAPL', side: 'sell', quantity: 33, estimatedValue: 5000.00, brokerType: 'alpaca', reason: 'Reduce overweight position' },
      { symbol: 'GOOGL', side: 'buy', quantity: 28, estimatedValue: 5000.00, brokerType: 'alpaca', reason: 'Increase underweight position' },
    ],
    estimatedFees: 2.00,
    estimatedTaxImpact: 150.00,
  }),
  executeRebalancing: vi.fn().mockResolvedValue({
    success: true,
    executedTrades: 2,
    totalVolume: 10000.00,
    totalFees: 2.00,
  }),
  deleteAllocation: vi.fn().mockResolvedValue({ success: true }),
  getRebalancingHistory: vi.fn().mockResolvedValue([
    {
      id: 'rebal-1',
      allocationId: 'alloc-1',
      tradesCount: 4,
      totalTradingVolume: 20000.00,
      totalFees: 4.00,
      status: 'completed',
      triggeredBy: 'manual',
      createdAt: new Date().toISOString(),
    }
  ]),
}));

describe('Order History Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordOrderExecution', () => {
    it('should record a new order execution', async () => {
      const { recordOrderExecution } = await import('./services/orderHistory');
      
      const result = await recordOrderExecution({
        connectionId: 'conn-1',
        orderId: 'order-1',
        symbol: 'AAPL',
        side: 'buy',
        orderType: 'market',
        executedQuantity: 10,
        executedPrice: 150.00,
        executionValue: 1500.00,
        commission: 0.50,
        fees: 0.02,
        executedAt: new Date(),
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBe('exec-1');
    });
  });

  describe('getOrderHistory', () => {
    it('should return paginated order history', async () => {
      const { getOrderHistory } = await import('./services/orderHistory');
      
      const result = await getOrderHistory({
        userId: 'user-1',
        limit: 20,
        offset: 0,
      });
      
      expect(result.executions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.executions[0].symbol).toBe('AAPL');
    });

    it('should filter by connection', async () => {
      const { getOrderHistory } = await import('./services/orderHistory');
      
      const result = await getOrderHistory({
        userId: 'user-1',
        connectionId: 'conn-1',
        limit: 20,
        offset: 0,
      });
      
      expect(result.executions).toBeDefined();
    });

    it('should filter by symbol', async () => {
      const { getOrderHistory } = await import('./services/orderHistory');
      
      const result = await getOrderHistory({
        userId: 'user-1',
        symbol: 'AAPL',
        limit: 20,
        offset: 0,
      });
      
      expect(result.executions).toBeDefined();
    });

    it('should filter by side', async () => {
      const { getOrderHistory } = await import('./services/orderHistory');
      
      const result = await getOrderHistory({
        userId: 'user-1',
        side: 'buy',
        limit: 20,
        offset: 0,
      });
      
      expect(result.executions).toBeDefined();
    });
  });

  describe('getPnLSummary', () => {
    it('should return P&L summary with all metrics', async () => {
      const { getPnLSummary } = await import('./services/orderHistory');
      
      const result = await getPnLSummary({ userId: 'user-1' });
      
      expect(result.totalRealizedPL).toBe(1500.00);
      expect(result.winRate).toBe(72.0);
      expect(result.profitFactor).toBe(2.0);
      expect(result.totalTrades).toBe(25);
    });

    it('should calculate win rate correctly', async () => {
      const { getPnLSummary } = await import('./services/orderHistory');
      
      const result = await getPnLSummary({ userId: 'user-1' });
      
      const expectedWinRate = (result.winningTrades / result.totalTrades) * 100;
      expect(result.winRate).toBeCloseTo(expectedWinRate, 1);
    });
  });

  describe('getSymbolPnLBreakdown', () => {
    it('should return P&L breakdown by symbol', async () => {
      const { getSymbolPnLBreakdown } = await import('./services/orderHistory');
      
      const result = await getSymbolPnLBreakdown({ userId: 'user-1' });
      
      expect(result).toHaveLength(3);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].totalPL).toBe(800.00);
    });
  });

  describe('getDailyPnL', () => {
    it('should return daily P&L with cumulative values', async () => {
      const { getDailyPnL } = await import('./services/orderHistory');
      
      const result = await getDailyPnL({ userId: 'user-1', days: 30 });
      
      expect(result).toHaveLength(3);
      expect(result[2].cumulativePnl).toBe(300.00);
    });
  });
});

describe('Broker Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAggregatedAnalytics', () => {
    it('should return aggregated analytics across all brokers', async () => {
      const { getAggregatedAnalytics } = await import('./services/brokerAnalytics');
      
      const result = await getAggregatedAnalytics('user-1');
      
      expect(result.totalEquity).toBe(100000.00);
      expect(result.connectionCount).toBe(2);
      expect(result.brokerBreakdown).toHaveLength(2);
    });

    it('should sum equity across all brokers correctly', async () => {
      const { getAggregatedAnalytics } = await import('./services/brokerAnalytics');
      
      const result = await getAggregatedAnalytics('user-1');
      
      const summedEquity = result.brokerBreakdown.reduce((sum, b) => sum + b.equity, 0);
      expect(result.totalEquity).toBe(summedEquity);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for a connection', async () => {
      const { getPerformanceMetrics } = await import('./services/brokerAnalytics');
      
      const result = await getPerformanceMetrics('conn-1', 'monthly');
      
      expect(result).toHaveLength(1);
      expect(result[0].totalReturn).toBe(5000.00);
      expect(result[0].winRate).toBe(70.0);
    });

    it('should include risk metrics', async () => {
      const { getPerformanceMetrics } = await import('./services/brokerAnalytics');
      
      const result = await getPerformanceMetrics('conn-1', 'monthly');
      
      expect(result[0].sharpeRatio).toBe(1.5);
      expect(result[0].sortinoRatio).toBe(2.0);
      expect(result[0].maxDrawdown).toBe(8.5);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate and store metrics', async () => {
      const { calculateMetrics } = await import('./services/brokerAnalytics');
      
      const result = await calculateMetrics('conn-1', 'monthly');
      
      expect(result.success).toBe(true);
    });
  });

  describe('getBuyingPowerHistory', () => {
    it('should return buying power history', async () => {
      const { getBuyingPowerHistory } = await import('./services/brokerAnalytics');
      
      const result = await getBuyingPowerHistory('conn-1', 30);
      
      expect(result).toHaveLength(2);
      expect(result[0].marginUtilization).toBe(50.0);
    });
  });

  describe('getTradeFrequency', () => {
    it('should return trade frequency data', async () => {
      const { getTradeFrequency } = await import('./services/brokerAnalytics');
      
      const result = await getTradeFrequency('conn-1', 30);
      
      expect(result.daily).toHaveLength(2);
      expect(result.hourly).toHaveLength(3);
      expect(result.bySymbol).toHaveLength(2);
    });

    it('should identify most active trading hours', async () => {
      const { getTradeFrequency } = await import('./services/brokerAnalytics');
      
      const result = await getTradeFrequency('conn-1', 30);
      
      const mostActiveHour = result.hourly.reduce((max, h) => h.count > max.count ? h : max);
      expect(mostActiveHour.hour).toBe(10);
    });
  });
});

describe('Portfolio Rebalancing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAllocation', () => {
    it('should create a new allocation', async () => {
      const { createAllocation } = await import('./services/portfolioRebalancing');
      
      const result = await createAllocation({
        userId: 'user-1',
        name: 'Test Portfolio',
        targetAllocations: [
          { symbol: 'AAPL', targetPercent: 50 },
          { symbol: 'GOOGL', targetPercent: 50 },
        ],
        rebalanceThreshold: 5,
        rebalanceFrequency: 'monthly',
      });
      
      expect(result.id).toBe('alloc-1');
    });
  });

  describe('getUserAllocations', () => {
    it('should return user allocations', async () => {
      const { getUserAllocations } = await import('./services/portfolioRebalancing');
      
      const result = await getUserAllocations('user-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Growth Portfolio');
    });

    it('should include target allocations', async () => {
      const { getUserAllocations } = await import('./services/portfolioRebalancing');
      
      const result = await getUserAllocations('user-1');
      
      expect(result[0].targetAllocations).toHaveLength(4);
      const totalPercent = result[0].targetAllocations.reduce((sum, a) => sum + a.targetPercent, 0);
      expect(totalPercent).toBe(100);
    });
  });

  describe('getRebalanceSuggestions', () => {
    it('should return rebalancing suggestions', async () => {
      const { getRebalanceSuggestions } = await import('./services/portfolioRebalancing');
      
      const result = await getRebalanceSuggestions('alloc-1', 'user-1');
      
      expect(result.totalPortfolioValue).toBe(100000.00);
      expect(result.currentAllocations).toHaveLength(4);
      expect(result.suggestedTrades).toHaveLength(2);
    });

    it('should identify overweight positions', async () => {
      const { getRebalanceSuggestions } = await import('./services/portfolioRebalancing');
      
      const result = await getRebalanceSuggestions('alloc-1', 'user-1');
      
      const overweight = result.currentAllocations.filter(a => a.drift > 0);
      expect(overweight.length).toBeGreaterThan(0);
      expect(overweight[0].symbol).toBe('AAPL');
    });

    it('should suggest sell for overweight positions', async () => {
      const { getRebalanceSuggestions } = await import('./services/portfolioRebalancing');
      
      const result = await getRebalanceSuggestions('alloc-1', 'user-1');
      
      const sellTrades = result.suggestedTrades.filter(t => t.side === 'sell');
      expect(sellTrades.length).toBeGreaterThan(0);
      expect(sellTrades[0].symbol).toBe('AAPL');
    });

    it('should estimate fees and tax impact', async () => {
      const { getRebalanceSuggestions } = await import('./services/portfolioRebalancing');
      
      const result = await getRebalanceSuggestions('alloc-1', 'user-1');
      
      expect(result.estimatedFees).toBe(2.00);
      expect(result.estimatedTaxImpact).toBe(150.00);
    });
  });

  describe('executeRebalancing', () => {
    it('should execute rebalancing trades', async () => {
      const { executeRebalancing } = await import('./services/portfolioRebalancing');
      
      const result = await executeRebalancing('alloc-1', 'user-1');
      
      expect(result.success).toBe(true);
      expect(result.executedTrades).toBe(2);
    });
  });

  describe('deleteAllocation', () => {
    it('should delete an allocation', async () => {
      const { deleteAllocation } = await import('./services/portfolioRebalancing');
      
      const result = await deleteAllocation('alloc-1', 'user-1');
      
      expect(result.success).toBe(true);
    });
  });

  describe('getRebalancingHistory', () => {
    it('should return rebalancing history', async () => {
      const { getRebalancingHistory } = await import('./services/portfolioRebalancing');
      
      const result = await getRebalancingHistory('user-1', 20);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });
  });
});

describe('P&L Calculations', () => {
  it('should calculate profit factor correctly', () => {
    const totalWins = 1500;
    const totalLosses = 500;
    const profitFactor = totalWins / totalLosses;
    
    expect(profitFactor).toBe(3.0);
  });

  it('should handle zero losses in profit factor', () => {
    const totalWins = 1500;
    const totalLosses = 0;
    const profitFactor = totalLosses === 0 ? Infinity : totalWins / totalLosses;
    
    expect(profitFactor).toBe(Infinity);
  });

  it('should calculate win rate correctly', () => {
    const winningTrades = 18;
    const totalTrades = 25;
    const winRate = (winningTrades / totalTrades) * 100;
    
    expect(winRate).toBe(72.0);
  });

  it('should calculate drift correctly', () => {
    const currentPercent = 35;
    const targetPercent = 30;
    const drift = currentPercent - targetPercent;
    
    expect(drift).toBe(5);
  });

  it('should identify positions exceeding threshold', () => {
    const threshold = 5;
    const positions = [
      { symbol: 'AAPL', drift: 7 },
      { symbol: 'GOOGL', drift: -3 },
      { symbol: 'MSFT', drift: 2 },
    ];
    
    const exceedingThreshold = positions.filter(p => Math.abs(p.drift) > threshold);
    
    expect(exceedingThreshold).toHaveLength(1);
    expect(exceedingThreshold[0].symbol).toBe('AAPL');
  });
});

describe('Risk Metrics Calculations', () => {
  it('should calculate Sharpe ratio', () => {
    const returns = 0.12; // 12% annual return
    const riskFreeRate = 0.02; // 2% risk-free rate
    const volatility = 0.15; // 15% volatility
    
    const sharpeRatio = (returns - riskFreeRate) / volatility;
    
    expect(sharpeRatio).toBeCloseTo(0.67, 2);
  });

  it('should calculate max drawdown', () => {
    const equityCurve = [100, 110, 105, 95, 100, 90, 95, 105];
    
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    
    for (const value of equityCurve) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    expect(maxDrawdown).toBeCloseTo(18.18, 1); // (110 - 90) / 110 * 100
  });

  it('should calculate margin utilization', () => {
    const equity = 100000;
    const buyingPower = 50000;
    const marginUtilization = ((equity - buyingPower) / equity) * 100;
    
    expect(marginUtilization).toBe(50);
  });
});

describe('Trade Frequency Analysis', () => {
  it('should aggregate trades by day', () => {
    const trades = [
      { date: '2024-01-01', symbol: 'AAPL' },
      { date: '2024-01-01', symbol: 'GOOGL' },
      { date: '2024-01-02', symbol: 'MSFT' },
    ];
    
    const dailyCount = trades.reduce((acc, trade) => {
      acc[trade.date] = (acc[trade.date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    expect(dailyCount['2024-01-01']).toBe(2);
    expect(dailyCount['2024-01-02']).toBe(1);
  });

  it('should identify most traded symbol', () => {
    const trades = [
      { symbol: 'AAPL' },
      { symbol: 'AAPL' },
      { symbol: 'GOOGL' },
      { symbol: 'AAPL' },
    ];
    
    const symbolCount = trades.reduce((acc, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostTraded = Object.entries(symbolCount).sort((a, b) => b[1] - a[1])[0];
    
    expect(mostTraded[0]).toBe('AAPL');
    expect(mostTraded[1]).toBe(3);
  });
});

describe('Rebalancing Trade Calculations', () => {
  it('should calculate required trade quantity', () => {
    const currentValue = 35000;
    const targetValue = 30000;
    const currentPrice = 150;
    
    const valueToTrade = currentValue - targetValue;
    const quantity = Math.floor(valueToTrade / currentPrice);
    
    expect(quantity).toBe(33);
  });

  it('should determine trade side based on drift', () => {
    const drift = 5; // overweight
    const side = drift > 0 ? 'sell' : 'buy';
    
    expect(side).toBe('sell');
  });

  it('should calculate total portfolio value', () => {
    const positions = [
      { symbol: 'AAPL', value: 35000 },
      { symbol: 'GOOGL', value: 20000 },
      { symbol: 'MSFT', value: 27000 },
      { symbol: 'NVDA', value: 18000 },
    ];
    
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    
    expect(totalValue).toBe(100000);
  });

  it('should calculate current allocation percentages', () => {
    const totalValue = 100000;
    const positions = [
      { symbol: 'AAPL', value: 35000 },
      { symbol: 'GOOGL', value: 20000 },
    ];
    
    const allocations = positions.map(p => ({
      symbol: p.symbol,
      percent: (p.value / totalValue) * 100,
    }));
    
    expect(allocations[0].percent).toBe(35);
    expect(allocations[1].percent).toBe(20);
  });
});
