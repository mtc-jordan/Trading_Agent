/**
 * Order Management System
 * 
 * Manages order lifecycle, position tracking, P&L calculation,
 * and execution reporting for the trading platform.
 */

import { webSocketServer } from './WebSocketServer';

// Interfaces
export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  avgFillPrice: number;
  status: OrderStatus;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  source: 'manual' | 'ai_agent' | 'strategy' | 'api';
  signalId?: string;
  debateId?: string;
  consensusScore?: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  filledAt?: Date;
  cancelledAt?: Date;
  expiresAt?: Date;
  brokerId?: string;
  brokerOrderId?: string;
  error?: string;
  fills: OrderFill[];
  metadata: Record<string, unknown>;
}

export type OrderStatus = 
  | 'pending'
  | 'queued'
  | 'submitted'
  | 'partial'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export interface OrderFill {
  fillId: string;
  quantity: number;
  price: number;
  timestamp: Date;
  fee: number;
}

export interface Position {
  symbol: string;
  userId: string;
  quantity: number;
  side: 'long' | 'short' | 'flat';
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  dayPnL: number;
  dayPnLPercent: number;
  openDate: Date;
  lastUpdated: Date;
  orders: string[]; // Order IDs that contributed to this position
}

export interface PortfolioSummary {
  userId: string;
  totalValue: number;
  cashBalance: number;
  buyingPower: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  dayPnL: number;
  dayPnLPercent: number;
  positionCount: number;
  openOrderCount: number;
  lastUpdated: Date;
}

export interface ExecutionReport {
  reportId: string;
  userId: string;
  period: 'day' | 'week' | 'month' | 'all';
  startDate: Date;
  endDate: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades: TradeRecord[];
  generatedAt: Date;
}

export interface TradeRecord {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  holdingPeriod?: number;
  source: string;
  timestamp: Date;
}

export class OrderManagementSystem {
  private orders: Map<string, Order> = new Map();
  private orderQueue: Order[] = [];
  private positions: Map<string, Position> = new Map();
  private portfolios: Map<string, PortfolioSummary> = new Map();
  private tradeHistory: TradeRecord[] = [];
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_HISTORY = 10000;
  private processingQueue: boolean = false;

  /**
   * Create a new order
   */
  createOrder(params: {
    userId: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    quantity: number;
    price?: number;
    stopPrice?: number;
    timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
    source?: 'manual' | 'ai_agent' | 'strategy' | 'api';
    signalId?: string;
    debateId?: string;
    consensusScore?: number;
    priority?: number;
    metadata?: Record<string, unknown>;
  }): Order {
    const orderId = this.generateOrderId();

    const order: Order = {
      id: orderId,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.price,
      stopPrice: params.stopPrice,
      avgFillPrice: 0,
      status: 'pending',
      timeInForce: params.timeInForce || 'day',
      source: params.source || 'manual',
      signalId: params.signalId,
      debateId: params.debateId,
      consensusScore: params.consensusScore,
      priority: params.priority || 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      fills: [],
      metadata: params.metadata || {}
    };

    this.orders.set(orderId, order);
    this.addToQueue(order);

    // Broadcast order created
    webSocketServer.broadcastAlert({
      alertId: `order_${orderId}`,
      type: 'info',
      title: 'Order Created',
      message: `${order.side.toUpperCase()} ${order.quantity} ${order.symbol} @ ${order.type}`,
      source: 'OrderManagement',
      timestamp: new Date(),
      requiresAction: false
    });

    console.log(`[OMS] Created order ${orderId}: ${order.side} ${order.quantity} ${order.symbol}`);

    return order;
  }

  /**
   * Add order to processing queue
   */
  private addToQueue(order: Order): void {
    if (this.orderQueue.length >= this.MAX_QUEUE_SIZE) {
      // Remove lowest priority orders
      this.orderQueue.sort((a, b) => b.priority - a.priority);
      this.orderQueue = this.orderQueue.slice(0, this.MAX_QUEUE_SIZE - 1);
    }

    order.status = 'queued';
    order.updatedAt = new Date();
    this.orderQueue.push(order);

    // Sort by priority (higher first)
    this.orderQueue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process order queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.orderQueue.length === 0) return;

    this.processingQueue = true;

    while (this.orderQueue.length > 0) {
      const order = this.orderQueue.shift();
      if (!order) continue;

      try {
        await this.submitOrder(order);
      } catch (error) {
        console.error(`[OMS] Error processing order ${order.id}:`, error);
        order.status = 'rejected';
        order.error = error instanceof Error ? error.message : 'Unknown error';
        order.updatedAt = new Date();
      }

      // Small delay between orders
      await this.delay(100);
    }

    this.processingQueue = false;
  }

  /**
   * Submit order for execution
   */
  private async submitOrder(order: Order): Promise<void> {
    order.status = 'submitted';
    order.updatedAt = new Date();

    // Simulate order execution (in production, this would call the broker API)
    const fill = await this.simulateFill(order);

    if (fill) {
      this.applyFill(order, fill);
    }
  }

  /**
   * Simulate order fill (for demo)
   */
  private async simulateFill(order: Order): Promise<OrderFill | null> {
    // Simulate market delay
    await this.delay(Math.random() * 500 + 100);

    // Get simulated price
    const basePrice = this.getSimulatedPrice(order.symbol);
    const slippage = order.type === 'market' 
      ? (Math.random() - 0.5) * 0.002 
      : 0;
    const fillPrice = basePrice * (1 + slippage);

    // Simulate partial fills for larger orders
    const fillRatio = order.quantity > 100 
      ? 0.7 + Math.random() * 0.3 
      : 1;
    const fillQuantity = Math.floor(order.quantity * fillRatio);

    if (fillQuantity === 0) return null;

    return {
      fillId: `fill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      quantity: fillQuantity,
      price: Math.round(fillPrice * 100) / 100,
      timestamp: new Date(),
      fee: Math.round(fillQuantity * fillPrice * 0.0001 * 100) / 100 // 0.01% fee
    };
  }

  /**
   * Apply fill to order
   */
  private applyFill(order: Order, fill: OrderFill): void {
    order.fills.push(fill);
    order.filledQuantity += fill.quantity;

    // Calculate average fill price
    const totalValue = order.fills.reduce((sum, f) => sum + f.quantity * f.price, 0);
    order.avgFillPrice = Math.round((totalValue / order.filledQuantity) * 100) / 100;

    // Update status
    if (order.filledQuantity >= order.quantity) {
      order.status = 'filled';
      order.filledAt = new Date();
    } else {
      order.status = 'partial';
    }

    order.updatedAt = new Date();

    // Update position
    this.updatePosition(order, fill);

    // Broadcast fill
    webSocketServer.broadcastTradeCompleted({
      orderId: order.id,
      signalId: order.signalId || '',
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      filledQuantity: order.filledQuantity,
      avgPrice: order.avgFillPrice,
      status: order.status === 'filled' ? 'filled' : 'partial',
      timestamp: new Date()
    });

    // Record trade
    this.recordTrade(order, fill);

    console.log(`[OMS] Filled ${fill.quantity} ${order.symbol} @ ${fill.price}`);
  }

  /**
   * Update position based on fill
   */
  private updatePosition(order: Order, fill: OrderFill): void {
    const positionKey = `${order.userId}_${order.symbol}`;
    let position = this.positions.get(positionKey);

    if (!position) {
      position = {
        symbol: order.symbol,
        userId: order.userId,
        quantity: 0,
        side: 'flat',
        avgEntryPrice: 0,
        currentPrice: fill.price,
        marketValue: 0,
        costBasis: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
        dayPnL: 0,
        dayPnLPercent: 0,
        openDate: new Date(),
        lastUpdated: new Date(),
        orders: []
      };
    }

    // Update position based on order side
    if (order.side === 'buy') {
      // Calculate new average entry price
      const totalCost = position.costBasis + (fill.quantity * fill.price);
      const totalQuantity = position.quantity + fill.quantity;
      
      position.avgEntryPrice = totalQuantity > 0 
        ? Math.round((totalCost / totalQuantity) * 100) / 100 
        : 0;
      position.quantity = totalQuantity;
      position.costBasis = totalCost;
    } else {
      // Selling - calculate realized P&L
      const sellValue = fill.quantity * fill.price;
      const costOfSold = fill.quantity * position.avgEntryPrice;
      const realizedPnL = sellValue - costOfSold;

      position.realizedPnL += realizedPnL;
      position.quantity -= fill.quantity;
      position.costBasis = position.quantity * position.avgEntryPrice;
    }

    // Update position side
    position.side = position.quantity > 0 ? 'long' : position.quantity < 0 ? 'short' : 'flat';

    // Update market value and unrealized P&L
    position.currentPrice = fill.price;
    position.marketValue = position.quantity * position.currentPrice;
    position.unrealizedPnL = position.marketValue - position.costBasis;
    position.unrealizedPnLPercent = position.costBasis > 0 
      ? (position.unrealizedPnL / position.costBasis) * 100 
      : 0;

    position.lastUpdated = new Date();
    position.orders.push(order.id);

    this.positions.set(positionKey, position);

    // Update portfolio
    this.updatePortfolio(order.userId);
  }

  /**
   * Update portfolio summary
   */
  private updatePortfolio(userId: string): void {
    const userPositions = Array.from(this.positions.values())
      .filter(p => p.userId === userId);

    const openOrders = Array.from(this.orders.values())
      .filter(o => o.userId === userId && ['pending', 'queued', 'submitted', 'partial'].includes(o.status));

    const totalValue = userPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalUnrealizedPnL = userPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalRealizedPnL = userPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
    const dayPnL = userPositions.reduce((sum, p) => sum + p.dayPnL, 0);

    const portfolio: PortfolioSummary = {
      userId,
      totalValue,
      cashBalance: 100000 - totalValue, // Simulated starting cash
      buyingPower: 100000 - totalValue,
      totalUnrealizedPnL,
      totalRealizedPnL,
      dayPnL,
      dayPnLPercent: totalValue > 0 ? (dayPnL / totalValue) * 100 : 0,
      positionCount: userPositions.filter(p => p.side !== 'flat').length,
      openOrderCount: openOrders.length,
      lastUpdated: new Date()
    };

    this.portfolios.set(userId, portfolio);
  }

  /**
   * Record trade in history
   */
  private recordTrade(order: Order, fill: OrderFill): void {
    const trade: TradeRecord = {
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: fill.quantity,
      entryPrice: fill.price,
      source: order.source,
      timestamp: fill.timestamp
    };

    this.tradeHistory.unshift(trade);

    // Trim history
    if (this.tradeHistory.length > this.MAX_HISTORY) {
      this.tradeHistory = this.tradeHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (['filled', 'cancelled', 'rejected', 'expired'].includes(order.status)) {
      return false;
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.updatedAt = new Date();

    // Remove from queue if present
    this.orderQueue = this.orderQueue.filter(o => o.id !== orderId);

    webSocketServer.broadcastAlert({
      alertId: `cancel_${orderId}`,
      type: 'warning',
      title: 'Order Cancelled',
      message: `Order ${orderId} for ${order.symbol} has been cancelled`,
      source: 'OrderManagement',
      timestamp: new Date(),
      requiresAction: false
    });

    console.log(`[OMS] Cancelled order ${orderId}`);

    return true;
  }

  /**
   * Modify an order
   */
  modifyOrder(orderId: string, updates: Partial<Pick<Order, 'quantity' | 'price' | 'stopPrice'>>): Order | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    if (!['pending', 'queued'].includes(order.status)) {
      return null;
    }

    if (updates.quantity !== undefined) order.quantity = updates.quantity;
    if (updates.price !== undefined) order.price = updates.price;
    if (updates.stopPrice !== undefined) order.stopPrice = updates.stopPrice;

    order.updatedAt = new Date();

    console.log(`[OMS] Modified order ${orderId}`);

    return order;
  }

  // ==================== Getters ====================

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get orders for user
   */
  getUserOrders(userId: string, status?: OrderStatus[]): Order[] {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId && (!status || status.includes(o.status)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get position
   */
  getPosition(userId: string, symbol: string): Position | undefined {
    return this.positions.get(`${userId}_${symbol}`);
  }

  /**
   * Get all positions for user
   */
  getUserPositions(userId: string): Position[] {
    return Array.from(this.positions.values())
      .filter(p => p.userId === userId && p.side !== 'flat');
  }

  /**
   * Get portfolio summary
   */
  getPortfolio(userId: string): PortfolioSummary | undefined {
    return this.portfolios.get(userId);
  }

  /**
   * Get trade history
   */
  getTradeHistory(userId?: string, limit: number = 100): TradeRecord[] {
    let history = this.tradeHistory;
    
    if (userId) {
      const userOrders = new Set(
        Array.from(this.orders.values())
          .filter(o => o.userId === userId)
          .map(o => o.id)
      );
      history = history.filter(t => userOrders.has(t.orderId));
    }

    return history.slice(0, limit);
  }

  /**
   * Generate execution report
   */
  generateReport(userId: string, period: 'day' | 'week' | 'month' | 'all'): ExecutionReport {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const trades = this.getTradeHistory(userId).filter(t => t.timestamp >= startDate);
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0);

    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
      : 0;

    return {
      reportId: `report_${Date.now()}`,
      userId,
      period,
      startDate,
      endDate: now,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalPnL,
      avgWin,
      avgLoss,
      profitFactor: avgLoss > 0 ? avgWin / avgLoss : 0,
      sharpeRatio: this.calculateSharpeRatio(trades),
      maxDrawdown: this.calculateMaxDrawdown(trades),
      trades,
      generatedAt: now
    };
  }

  /**
   * Get OMS statistics
   */
  getStats(): {
    totalOrders: number;
    pendingOrders: number;
    queuedOrders: number;
    filledOrders: number;
    activePositions: number;
    totalTradeHistory: number;
  } {
    const orders = Array.from(this.orders.values());

    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      queuedOrders: this.orderQueue.length,
      filledOrders: orders.filter(o => o.status === 'filled').length,
      activePositions: Array.from(this.positions.values()).filter(p => p.side !== 'flat').length,
      totalTradeHistory: this.tradeHistory.length
    };
  }

  // ==================== Helper Methods ====================

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private getSimulatedPrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'AAPL': 185.50,
      'GOOGL': 142.30,
      'MSFT': 378.90,
      'AMZN': 178.25,
      'TSLA': 248.50,
      'NVDA': 495.80,
      'META': 485.20,
      'SPY': 478.50
    };
    return basePrices[symbol] || 100.00;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateSharpeRatio(trades: TradeRecord[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.pnlPercent || 0);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  private calculateMaxDrawdown(trades: TradeRecord[]): number {
    if (trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const trade of trades) {
      cumulative += trade.pnl || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return peak > 0 ? (maxDrawdown / peak) * 100 : 0;
  }
}

// Singleton instance
export const orderManagementSystem = new OrderManagementSystem();
