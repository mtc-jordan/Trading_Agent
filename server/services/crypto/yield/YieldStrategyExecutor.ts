/**
 * Yield Strategy Executor
 * 
 * Automated execution of yield strategies including:
 * - Cash and Carry (spot + short perp)
 * - Funding Rate Arbitrage (long/short across exchanges)
 * - Basis Trading (futures vs spot)
 */

import { exchangeService, ExchangeId, Position, Order } from '../exchange/ExchangeService';
import { fundingRateAggregator, YieldOpportunity, FundingArbitrage } from '../funding/FundingRateAggregator';

export interface StrategyConfig {
  id: string;
  name: string;
  type: 'cash_and_carry' | 'funding_arb' | 'basis_trade';
  symbol: string;
  exchanges: ExchangeId[];
  targetApr: number;
  maxCapital: number;
  leverage: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  autoRebalance: boolean;
  rebalanceThreshold: number; // Funding rate change threshold to trigger rebalance
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StrategyPosition {
  strategyId: string;
  exchange: ExchangeId;
  symbol: string;
  side: 'long' | 'short' | 'spot';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  fundingReceived: number;
  fundingPaid: number;
  netFunding: number;
  openedAt: number;
}

export interface StrategyPerformance {
  strategyId: string;
  totalCapitalDeployed: number;
  currentValue: number;
  totalPnl: number;
  fundingPnl: number;
  tradingPnl: number;
  realizedApr: number;
  projectedApr: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  startDate: number;
  lastUpdated: number;
}

export interface ExecutionResult {
  success: boolean;
  strategyId: string;
  action: 'open' | 'close' | 'rebalance' | 'adjust';
  orders: Order[];
  message: string;
  timestamp: number;
}

export interface RiskCheck {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    value: number;
    threshold: number;
    message: string;
  }[];
}

export class YieldStrategyExecutor {
  private strategies: Map<string, StrategyConfig> = new Map();
  private positions: Map<string, StrategyPosition[]> = new Map();
  private performance: Map<string, StrategyPerformance> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {}

  /**
   * Start strategy monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(async () => {
      await this.monitorAllStrategies();
    }, intervalMs);

    console.log('[YieldExecutor] Strategy monitoring started');
  }

  /**
   * Stop strategy monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('[YieldExecutor] Strategy monitoring stopped');
  }

  /**
   * Create a new yield strategy
   */
  createStrategy(config: Omit<StrategyConfig, 'id' | 'createdAt' | 'updatedAt'>): StrategyConfig {
    const id = `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    const strategy: StrategyConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.strategies.set(id, strategy);
    this.positions.set(id, []);
    this.performance.set(id, this.initializePerformance(id));

    console.log(`[YieldExecutor] Created strategy: ${strategy.name} (${id})`);
    return strategy;
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformance(strategyId: string): StrategyPerformance {
    return {
      strategyId,
      totalCapitalDeployed: 0,
      currentValue: 0,
      totalPnl: 0,
      fundingPnl: 0,
      tradingPnl: 0,
      realizedApr: 0,
      projectedApr: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      startDate: Date.now(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Execute a cash and carry strategy
   * Long spot + Short perpetual to capture funding
   */
  async executeCashAndCarry(
    strategyId: string,
    symbol: string,
    exchange: ExchangeId,
    capitalUsd: number
  ): Promise<ExecutionResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return this.createExecutionResult(strategyId, 'open', false, [], 'Strategy not found');
    }

    // Risk checks
    const riskCheck = await this.performRiskChecks(strategy, capitalUsd);
    if (!riskCheck.passed) {
      const failedChecks = riskCheck.checks.filter(c => !c.passed).map(c => c.message).join('; ');
      return this.createExecutionResult(strategyId, 'open', false, [], `Risk check failed: ${failedChecks}`);
    }

    // Get current funding rate
    const fundingRate = await fundingRateAggregator.getSymbolRate(symbol);
    if (!fundingRate) {
      return this.createExecutionResult(strategyId, 'open', false, [], 'Could not fetch funding rate');
    }

    // Only proceed if funding rate is positive (shorts receive funding)
    if (fundingRate.avgRate < 0.0001) {
      return this.createExecutionResult(strategyId, 'open', false, [], 
        `Funding rate too low: ${(fundingRate.avgRate * 100).toFixed(4)}%`);
    }

    const orders: Order[] = [];

    try {
      // Calculate position size
      const markPrice = fundingRate.rates.get(exchange)?.markPrice || 0;
      if (markPrice === 0) {
        return this.createExecutionResult(strategyId, 'open', false, [], 'Could not get mark price');
      }

      const positionSize = (capitalUsd / markPrice) * strategy.leverage;

      // 1. Open short perpetual position
      const shortOrder = await exchangeService.placeOrder(exchange, {
        symbol,
        side: 'sell',
        type: 'market',
        quantity: positionSize
      });

      if (shortOrder) {
        orders.push(shortOrder);
        
        // Record position
        const position: StrategyPosition = {
          strategyId,
          exchange,
          symbol,
          side: 'short',
          size: positionSize,
          entryPrice: shortOrder.avgPrice || markPrice,
          currentPrice: markPrice,
          unrealizedPnl: 0,
          fundingReceived: 0,
          fundingPaid: 0,
          netFunding: 0,
          openedAt: Date.now()
        };

        const strategyPositions = this.positions.get(strategyId) || [];
        strategyPositions.push(position);
        this.positions.set(strategyId, strategyPositions);

        // Update performance
        const perf = this.performance.get(strategyId);
        if (perf) {
          perf.totalCapitalDeployed += capitalUsd;
          perf.totalTrades++;
          perf.lastUpdated = Date.now();
        }

        return this.createExecutionResult(strategyId, 'open', true, orders,
          `Opened short ${positionSize.toFixed(4)} ${symbol} at ${markPrice.toFixed(2)}`);
      }

      return this.createExecutionResult(strategyId, 'open', false, orders, 'Failed to place short order');
    } catch (error) {
      console.error('[YieldExecutor] Cash and carry execution error:', error);
      return this.createExecutionResult(strategyId, 'open', false, orders, 
        `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute funding rate arbitrage
   * Long on exchange A + Short on exchange B
   */
  async executeFundingArbitrage(
    strategyId: string,
    opportunity: FundingArbitrage,
    capitalUsd: number
  ): Promise<ExecutionResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return this.createExecutionResult(strategyId, 'open', false, [], 'Strategy not found');
    }

    // Risk checks
    const riskCheck = await this.performRiskChecks(strategy, capitalUsd);
    if (!riskCheck.passed) {
      const failedChecks = riskCheck.checks.filter(c => !c.passed).map(c => c.message).join('; ');
      return this.createExecutionResult(strategyId, 'open', false, [], `Risk check failed: ${failedChecks}`);
    }

    const orders: Order[] = [];
    const capitalPerLeg = capitalUsd / 2;

    try {
      // Get current prices
      const longOrderBook = await exchangeService.getOrderBook(opportunity.longExchange, opportunity.symbol);
      const shortOrderBook = await exchangeService.getOrderBook(opportunity.shortExchange, opportunity.symbol);

      if (!longOrderBook || !shortOrderBook) {
        return this.createExecutionResult(strategyId, 'open', false, [], 'Could not fetch order books');
      }

      const longPrice = longOrderBook.asks[0]?.[0] || 0;
      const shortPrice = shortOrderBook.bids[0]?.[0] || 0;

      if (longPrice === 0 || shortPrice === 0) {
        return this.createExecutionResult(strategyId, 'open', false, [], 'Invalid prices');
      }

      const positionSize = capitalPerLeg / ((longPrice + shortPrice) / 2) * strategy.leverage;

      // 1. Open long position on low-funding exchange
      const longOrder = await exchangeService.placeOrder(opportunity.longExchange, {
        symbol: opportunity.symbol,
        side: 'buy',
        type: 'market',
        quantity: positionSize
      });

      if (longOrder) {
        orders.push(longOrder);
      }

      // 2. Open short position on high-funding exchange
      const shortOrder = await exchangeService.placeOrder(opportunity.shortExchange, {
        symbol: opportunity.symbol,
        side: 'sell',
        type: 'market',
        quantity: positionSize
      });

      if (shortOrder) {
        orders.push(shortOrder);
      }

      if (longOrder && shortOrder) {
        // Record positions
        const strategyPositions = this.positions.get(strategyId) || [];
        
        strategyPositions.push({
          strategyId,
          exchange: opportunity.longExchange,
          symbol: opportunity.symbol,
          side: 'long',
          size: positionSize,
          entryPrice: longOrder.avgPrice || longPrice,
          currentPrice: longPrice,
          unrealizedPnl: 0,
          fundingReceived: 0,
          fundingPaid: 0,
          netFunding: 0,
          openedAt: Date.now()
        });

        strategyPositions.push({
          strategyId,
          exchange: opportunity.shortExchange,
          symbol: opportunity.symbol,
          side: 'short',
          size: positionSize,
          entryPrice: shortOrder.avgPrice || shortPrice,
          currentPrice: shortPrice,
          unrealizedPnl: 0,
          fundingReceived: 0,
          fundingPaid: 0,
          netFunding: 0,
          openedAt: Date.now()
        });

        this.positions.set(strategyId, strategyPositions);

        // Update performance
        const perf = this.performance.get(strategyId);
        if (perf) {
          perf.totalCapitalDeployed += capitalUsd;
          perf.totalTrades += 2;
          perf.lastUpdated = Date.now();
        }

        return this.createExecutionResult(strategyId, 'open', true, orders,
          `Opened arb: Long ${opportunity.longExchange} / Short ${opportunity.shortExchange} for ${opportunity.symbol}`);
      }

      return this.createExecutionResult(strategyId, 'open', false, orders, 'Failed to open both legs');
    } catch (error) {
      console.error('[YieldExecutor] Funding arbitrage execution error:', error);
      return this.createExecutionResult(strategyId, 'open', false, orders,
        `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close a strategy's positions
   */
  async closeStrategy(strategyId: string): Promise<ExecutionResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return this.createExecutionResult(strategyId, 'close', false, [], 'Strategy not found');
    }

    const strategyPositions = this.positions.get(strategyId) || [];
    if (strategyPositions.length === 0) {
      return this.createExecutionResult(strategyId, 'close', false, [], 'No positions to close');
    }

    const orders: Order[] = [];
    const errors: string[] = [];

    for (const position of strategyPositions) {
      try {
        const order = await exchangeService.placeOrder(position.exchange, {
          symbol: position.symbol,
          side: position.side === 'long' ? 'sell' : 'buy',
          type: 'market',
          quantity: position.size,
          reduceOnly: true
        });

        if (order) {
          orders.push(order);
        } else {
          errors.push(`Failed to close ${position.side} ${position.symbol} on ${position.exchange}`);
        }
      } catch (error) {
        errors.push(`Error closing position: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Clear positions
    this.positions.set(strategyId, []);

    // Update performance
    const perf = this.performance.get(strategyId);
    if (perf) {
      perf.totalTrades += orders.length;
      perf.lastUpdated = Date.now();
    }

    if (errors.length > 0) {
      return this.createExecutionResult(strategyId, 'close', false, orders, errors.join('; '));
    }

    return this.createExecutionResult(strategyId, 'close', true, orders,
      `Closed ${orders.length} positions for strategy ${strategy.name}`);
  }

  /**
   * Perform risk checks before execution
   */
  private async performRiskChecks(strategy: StrategyConfig, capitalUsd: number): Promise<RiskCheck> {
    const checks: RiskCheck['checks'] = [];

    // Check 1: Capital within limits
    checks.push({
      name: 'Capital Limit',
      passed: capitalUsd <= strategy.maxCapital,
      value: capitalUsd,
      threshold: strategy.maxCapital,
      message: capitalUsd <= strategy.maxCapital 
        ? 'Capital within limits' 
        : `Capital ${capitalUsd} exceeds max ${strategy.maxCapital}`
    });

    // Check 2: Leverage within limits
    checks.push({
      name: 'Leverage Limit',
      passed: strategy.leverage <= 10,
      value: strategy.leverage,
      threshold: 10,
      message: strategy.leverage <= 10 
        ? 'Leverage acceptable' 
        : `Leverage ${strategy.leverage}x exceeds safe limit of 10x`
    });

    // Check 3: Exchange connectivity
    for (const exchange of strategy.exchanges) {
      const connected = await exchangeService.testConnection(exchange);
      checks.push({
        name: `${exchange} Connection`,
        passed: connected,
        value: connected ? 1 : 0,
        threshold: 1,
        message: connected 
          ? `${exchange} connected` 
          : `${exchange} not connected`
      });
    }

    // Check 4: Minimum APR threshold
    const fundingRate = await fundingRateAggregator.getSymbolRate(strategy.symbol);
    const currentApr = fundingRate ? fundingRate.avgRateAnnualized : 0;
    checks.push({
      name: 'Minimum APR',
      passed: currentApr >= strategy.targetApr * 0.5,
      value: currentApr,
      threshold: strategy.targetApr * 0.5,
      message: currentApr >= strategy.targetApr * 0.5 
        ? `Current APR ${currentApr.toFixed(2)}% meets threshold` 
        : `Current APR ${currentApr.toFixed(2)}% below threshold ${(strategy.targetApr * 0.5).toFixed(2)}%`
    });

    return {
      passed: checks.every(c => c.passed),
      checks
    };
  }

  /**
   * Monitor all active strategies
   */
  private async monitorAllStrategies(): Promise<void> {
    for (const [strategyId, strategy] of Array.from(this.strategies.entries())) {
      if (!strategy.isActive) continue;

      try {
        await this.monitorStrategy(strategyId);
      } catch (error) {
        console.error(`[YieldExecutor] Error monitoring strategy ${strategyId}:`, error);
      }
    }
  }

  /**
   * Monitor a single strategy
   */
  private async monitorStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    const strategyPositions = this.positions.get(strategyId);
    
    if (!strategy || !strategyPositions || strategyPositions.length === 0) return;

    // Update position prices and PnL
    for (const position of strategyPositions) {
      const orderBook = await exchangeService.getOrderBook(position.exchange, position.symbol);
      if (orderBook) {
        const midPrice = (orderBook.bids[0]?.[0] + orderBook.asks[0]?.[0]) / 2;
        position.currentPrice = midPrice;
        
        const priceDiff = position.side === 'long' 
          ? midPrice - position.entryPrice 
          : position.entryPrice - midPrice;
        position.unrealizedPnl = priceDiff * position.size;
      }
    }

    // Check for rebalance conditions
    if (strategy.autoRebalance) {
      const fundingRate = await fundingRateAggregator.getSymbolRate(strategy.symbol);
      if (fundingRate) {
        // Check if funding rate has changed significantly
        const currentApr = fundingRate.avgRateAnnualized;
        const perf = this.performance.get(strategyId);
        
        if (perf && Math.abs(currentApr - perf.projectedApr) > strategy.rebalanceThreshold) {
          console.log(`[YieldExecutor] Rebalance triggered for ${strategy.name}: APR changed from ${perf.projectedApr.toFixed(2)}% to ${currentApr.toFixed(2)}%`);
          // In production, would trigger rebalance logic here
        }
      }
    }

    // Update performance metrics
    this.updatePerformance(strategyId);
  }

  /**
   * Update strategy performance metrics
   */
  private updatePerformance(strategyId: string): void {
    const strategyPositions = this.positions.get(strategyId);
    const perf = this.performance.get(strategyId);
    
    if (!strategyPositions || !perf) return;

    let totalUnrealizedPnl = 0;
    let totalFundingPnl = 0;

    for (const position of strategyPositions) {
      totalUnrealizedPnl += position.unrealizedPnl;
      totalFundingPnl += position.netFunding;
    }

    perf.tradingPnl = totalUnrealizedPnl;
    perf.fundingPnl = totalFundingPnl;
    perf.totalPnl = totalUnrealizedPnl + totalFundingPnl;
    perf.currentValue = perf.totalCapitalDeployed + perf.totalPnl;

    // Calculate realized APR
    const daysRunning = (Date.now() - perf.startDate) / (1000 * 60 * 60 * 24);
    if (daysRunning > 0 && perf.totalCapitalDeployed > 0) {
      perf.realizedApr = (perf.totalPnl / perf.totalCapitalDeployed) * (365 / daysRunning) * 100;
    }

    perf.lastUpdated = Date.now();
  }

  /**
   * Create execution result
   */
  private createExecutionResult(
    strategyId: string,
    action: ExecutionResult['action'],
    success: boolean,
    orders: Order[],
    message: string
  ): ExecutionResult {
    const result: ExecutionResult = {
      success,
      strategyId,
      action,
      orders,
      message,
      timestamp: Date.now()
    };

    this.executionHistory.push(result);
    return result;
  }

  /**
   * Get all strategies
   */
  getStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id: string): StrategyConfig | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get strategy positions
   */
  getPositions(strategyId: string): StrategyPosition[] {
    return this.positions.get(strategyId) || [];
  }

  /**
   * Get strategy performance
   */
  getPerformance(strategyId: string): StrategyPerformance | undefined {
    return this.performance.get(strategyId);
  }

  /**
   * Get all performance data
   */
  getAllPerformance(): StrategyPerformance[] {
    return Array.from(this.performance.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory(strategyId?: string, limit: number = 50): ExecutionResult[] {
    let history = this.executionHistory;
    
    if (strategyId) {
      history = history.filter(h => h.strategyId === strategyId);
    }

    return history.slice(-limit);
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(id: string, updates: Partial<StrategyConfig>): StrategyConfig | null {
    const strategy = this.strategies.get(id);
    if (!strategy) return null;

    const updated = {
      ...strategy,
      ...updates,
      id, // Prevent ID change
      createdAt: strategy.createdAt, // Prevent creation date change
      updatedAt: Date.now()
    };

    this.strategies.set(id, updated);
    return updated;
  }

  /**
   * Delete strategy
   */
  deleteStrategy(id: string): boolean {
    const strategy = this.strategies.get(id);
    if (!strategy) return false;

    // Check for open positions
    const positions = this.positions.get(id) || [];
    if (positions.length > 0) {
      console.warn(`[YieldExecutor] Cannot delete strategy ${id} with open positions`);
      return false;
    }

    this.strategies.delete(id);
    this.positions.delete(id);
    this.performance.delete(id);
    return true;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalStrategies: number;
    activeStrategies: number;
    totalCapitalDeployed: number;
    totalPnl: number;
    avgApr: number;
    totalPositions: number;
  } {
    const strategies = Array.from(this.strategies.values());
    const performances = Array.from(this.performance.values());
    
    let totalPositions = 0;
    for (const positions of Array.from(this.positions.values())) {
      totalPositions += positions.length;
    }

    const totalCapital = performances.reduce((sum, p) => sum + p.totalCapitalDeployed, 0);
    const totalPnl = performances.reduce((sum, p) => sum + p.totalPnl, 0);
    const avgApr = performances.length > 0 
      ? performances.reduce((sum, p) => sum + p.realizedApr, 0) / performances.length 
      : 0;

    return {
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.isActive).length,
      totalCapitalDeployed: totalCapital,
      totalPnl,
      avgApr,
      totalPositions
    };
  }
}

// Export singleton instance
export const yieldStrategyExecutor = new YieldStrategyExecutor();
