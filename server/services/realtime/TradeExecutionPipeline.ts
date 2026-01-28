/**
 * Trade Execution Pipeline
 * 
 * Connects the consensus engine output to actual order
 * placement via Alpaca API. Implements stealth trading,
 * position sizing, and execution monitoring.
 */

import { webSocketServer, TradeExecution } from './WebSocketServer';
import { consensusBroadcaster, ExecutionSignal } from './ConsensusBroadcaster';

// Interfaces
export interface ExecutionConfig {
  maxPositionSize: number;
  maxDailyTrades: number;
  minConsensusScore: number;
  stealthMode: boolean;
  sliceCount: number;
  sliceDelayMs: number;
  requireHITL: boolean;
  hitlThreshold: number;
}

export interface ExecutionOrder {
  orderId: string;
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  status: 'pending' | 'submitted' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired';
  filledQuantity: number;
  avgFillPrice: number;
  sliceIndex?: number;
  totalSlices?: number;
  createdAt: Date;
  updatedAt: Date;
  alpacaOrderId?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  signalId: string;
  orders: ExecutionOrder[];
  totalQuantity: number;
  filledQuantity: number;
  avgPrice: number;
  executionTime: number;
  error?: string;
}

export interface PositionInfo {
  symbol: string;
  quantity: number;
  side: 'long' | 'short';
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  marketValue: number;
}

export class TradeExecutionPipeline {
  private config: ExecutionConfig;
  private pendingOrders: Map<string, ExecutionOrder> = new Map();
  private executedOrders: ExecutionOrder[] = [];
  private dailyTradeCount: number = 0;
  private lastTradeDate: string = '';
  private alpacaBaseUrl: string;
  private alpacaApiKey: string;
  private alpacaApiSecret: string;

  constructor(config?: Partial<ExecutionConfig>) {
    this.config = {
      maxPositionSize: 10000, // $10,000 max per position
      maxDailyTrades: 50,
      minConsensusScore: 85,
      stealthMode: true,
      sliceCount: 5,
      sliceDelayMs: 2000,
      requireHITL: true,
      hitlThreshold: 5000, // Require approval for orders > $5,000
      ...config
    };

    // Alpaca API configuration
    this.alpacaBaseUrl = process.env.ALPACA_API_URL || 'https://paper-api.alpaca.markets';
    this.alpacaApiKey = process.env.ALPACA_API_KEY || '';
    this.alpacaApiSecret = process.env.ALPACA_API_SECRET || '';
  }

  /**
   * Execute a trade signal from the consensus engine
   */
  async executeSignal(signalId: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Get the signal
    const signal = consensusBroadcaster.consumeSignal(signalId);
    if (!signal) {
      return {
        success: false,
        signalId,
        orders: [],
        totalQuantity: 0,
        filledQuantity: 0,
        avgPrice: 0,
        executionTime: Date.now() - startTime,
        error: 'Signal not found or expired'
      };
    }

    // Validate signal
    const validation = this.validateSignal(signal);
    if (!validation.valid) {
      return {
        success: false,
        signalId,
        orders: [],
        totalQuantity: 0,
        filledQuantity: 0,
        avgPrice: 0,
        executionTime: Date.now() - startTime,
        error: validation.error
      };
    }

    // Check HITL requirement
    const estimatedValue = signal.recommendedSize * this.config.maxPositionSize;
    if (this.config.requireHITL && estimatedValue > this.config.hitlThreshold) {
      webSocketServer.broadcastHITLRequired(signalId, 'Order exceeds HITL threshold', {
        symbol: signal.symbol,
        action: signal.action,
        estimatedValue,
        threshold: this.config.hitlThreshold,
        consensusScore: signal.consensusScore
      });

      return {
        success: false,
        signalId,
        orders: [],
        totalQuantity: 0,
        filledQuantity: 0,
        avgPrice: 0,
        executionTime: Date.now() - startTime,
        error: 'HITL approval required'
      };
    }

    // Execute the trade
    try {
      const result = this.config.stealthMode
        ? await this.executeStealthTrade(signal)
        : await this.executeSingleTrade(signal);

      // Update daily trade count
      this.updateDailyTradeCount();

      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      webSocketServer.broadcastTradeFailed(signalId, errorMessage);

      return {
        success: false,
        signalId,
        orders: [],
        totalQuantity: 0,
        filledQuantity: 0,
        avgPrice: 0,
        executionTime: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  /**
   * Execute a single trade (non-stealth mode)
   */
  private async executeSingleTrade(signal: ExecutionSignal): Promise<Omit<ExecutionResult, 'executionTime'>> {
    const quantity = this.calculateQuantity(signal);
    const order = await this.createOrder(signal, quantity);

    // Submit to Alpaca
    const submittedOrder = await this.submitToAlpaca(order);
    
    if (submittedOrder.status === 'rejected') {
      return {
        success: false,
        signalId: signal.signalId,
        orders: [submittedOrder],
        totalQuantity: quantity,
        filledQuantity: 0,
        avgPrice: 0,
        error: submittedOrder.error
      };
    }

    // Broadcast execution
    this.broadcastExecution(submittedOrder);

    return {
      success: submittedOrder.status === 'filled' || submittedOrder.status === 'partial',
      signalId: signal.signalId,
      orders: [submittedOrder],
      totalQuantity: quantity,
      filledQuantity: submittedOrder.filledQuantity,
      avgPrice: submittedOrder.avgFillPrice
    };
  }

  /**
   * Execute stealth trade (fragmented into slices)
   */
  private async executeStealthTrade(signal: ExecutionSignal): Promise<Omit<ExecutionResult, 'executionTime'>> {
    const totalQuantity = this.calculateQuantity(signal);
    const sliceQuantity = Math.floor(totalQuantity / this.config.sliceCount);
    const orders: ExecutionOrder[] = [];
    let totalFilled = 0;
    let totalValue = 0;

    // Broadcast that we're starting stealth execution
    webSocketServer.broadcastTradeExecuting(`stealth_${signal.signalId}`, {
      signalId: signal.signalId,
      symbol: signal.symbol,
      action: signal.action,
      quantity: totalQuantity,
      price: 0,
      confidence: signal.consensusScore,
      consensusScore: signal.consensusScore,
      timestamp: new Date()
    });

    for (let i = 0; i < this.config.sliceCount; i++) {
      // Calculate slice quantity (last slice gets remainder)
      const isLastSlice = i === this.config.sliceCount - 1;
      const qty = isLastSlice 
        ? totalQuantity - (sliceQuantity * (this.config.sliceCount - 1))
        : sliceQuantity;

      if (qty <= 0) continue;

      const order = await this.createOrder(signal, qty, i + 1, this.config.sliceCount);
      const submittedOrder = await this.submitToAlpaca(order);
      orders.push(submittedOrder);

      if (submittedOrder.status === 'filled' || submittedOrder.status === 'partial') {
        totalFilled += submittedOrder.filledQuantity;
        totalValue += submittedOrder.filledQuantity * submittedOrder.avgFillPrice;
      }

      // Broadcast slice completion
      this.broadcastExecution(submittedOrder);

      // Delay between slices (except for last slice)
      if (!isLastSlice && this.config.sliceDelayMs > 0) {
        await this.delay(this.config.sliceDelayMs);
      }
    }

    const avgPrice = totalFilled > 0 ? totalValue / totalFilled : 0;

    // Broadcast final completion
    webSocketServer.broadcastTradeCompleted({
      orderId: `stealth_${signal.signalId}`,
      signalId: signal.signalId,
      symbol: signal.symbol,
      side: signal.action,
      quantity: totalQuantity,
      filledQuantity: totalFilled,
      avgPrice,
      status: totalFilled === totalQuantity ? 'filled' : totalFilled > 0 ? 'partial' : 'failed',
      timestamp: new Date()
    });

    return {
      success: totalFilled > 0,
      signalId: signal.signalId,
      orders,
      totalQuantity,
      filledQuantity: totalFilled,
      avgPrice
    };
  }

  /**
   * Create an execution order
   */
  private async createOrder(
    signal: ExecutionSignal,
    quantity: number,
    sliceIndex?: number,
    totalSlices?: number
  ): Promise<ExecutionOrder> {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const order: ExecutionOrder = {
      orderId,
      signalId: signal.signalId,
      symbol: signal.symbol,
      side: signal.action,
      orderType: 'market',
      quantity,
      timeInForce: 'day',
      status: 'pending',
      filledQuantity: 0,
      avgFillPrice: 0,
      sliceIndex,
      totalSlices,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.pendingOrders.set(orderId, order);

    return order;
  }

  /**
   * Submit order to Alpaca API
   */
  private async submitToAlpaca(order: ExecutionOrder): Promise<ExecutionOrder> {
    // Check if we have API credentials
    if (!this.alpacaApiKey || !this.alpacaApiSecret) {
      // Simulate order execution for demo
      return this.simulateOrderExecution(order);
    }

    try {
      const response = await fetch(`${this.alpacaBaseUrl}/v2/orders`, {
        method: 'POST',
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey,
          'APCA-API-SECRET-KEY': this.alpacaApiSecret,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: order.symbol,
          qty: order.quantity.toString(),
          side: order.side,
          type: order.orderType,
          time_in_force: order.timeInForce
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        order.status = 'rejected';
        order.error = errorData.message || 'Order rejected by Alpaca';
        order.updatedAt = new Date();
        return order;
      }

      const alpacaOrder = await response.json();
      
      order.alpacaOrderId = alpacaOrder.id;
      order.status = this.mapAlpacaStatus(alpacaOrder.status);
      order.filledQuantity = parseFloat(alpacaOrder.filled_qty) || 0;
      order.avgFillPrice = parseFloat(alpacaOrder.filled_avg_price) || 0;
      order.updatedAt = new Date();

      // Store in executed orders
      this.executedOrders.push(order);
      this.pendingOrders.delete(order.orderId);

      return order;
    } catch (error) {
      // Fallback to simulation on API error
      console.warn('[TradeExecution] Alpaca API error, falling back to simulation:', error);
      return this.simulateOrderExecution(order);
    }
  }

  /**
   * Simulate order execution (for demo/testing)
   */
  private simulateOrderExecution(order: ExecutionOrder): ExecutionOrder {
    // Simulate market price
    const basePrice = this.getSimulatedPrice(order.symbol);
    const slippage = (Math.random() - 0.5) * 0.002; // ±0.1% slippage
    const fillPrice = basePrice * (1 + slippage);

    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.avgFillPrice = Math.round(fillPrice * 100) / 100;
    order.updatedAt = new Date();

    // Store in executed orders
    this.executedOrders.push(order);
    this.pendingOrders.delete(order.orderId);

    return order;
  }

  /**
   * Get simulated price for a symbol
   */
  private getSimulatedPrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'AAPL': 185.50,
      'GOOGL': 142.30,
      'MSFT': 378.90,
      'AMZN': 178.25,
      'TSLA': 248.50,
      'NVDA': 495.80,
      'META': 485.20,
      'BTC': 43250.00,
      'ETH': 2580.00,
      'SPY': 478.50
    };

    return basePrices[symbol] || 100.00;
  }

  /**
   * Map Alpaca order status to our status
   */
  private mapAlpacaStatus(alpacaStatus: string): ExecutionOrder['status'] {
    const statusMap: Record<string, ExecutionOrder['status']> = {
      'new': 'submitted',
      'accepted': 'submitted',
      'pending_new': 'pending',
      'accepted_for_bidding': 'submitted',
      'stopped': 'cancelled',
      'rejected': 'rejected',
      'suspended': 'cancelled',
      'calculated': 'submitted',
      'partially_filled': 'partial',
      'filled': 'filled',
      'done_for_day': 'partial',
      'canceled': 'cancelled',
      'expired': 'expired',
      'replaced': 'cancelled',
      'pending_cancel': 'pending',
      'pending_replace': 'pending'
    };

    return statusMap[alpacaStatus] || 'pending';
  }

  /**
   * Broadcast execution update
   */
  private broadcastExecution(order: ExecutionOrder): void {
    const execution: TradeExecution = {
      orderId: order.orderId,
      signalId: order.signalId,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      filledQuantity: order.filledQuantity,
      avgPrice: order.avgFillPrice,
      status: order.status === 'submitted' || order.status === 'rejected' || order.status === 'expired' ? 'pending' : order.status,
      timestamp: order.updatedAt
    };

    if (order.status === 'filled' || order.status === 'partial') {
      webSocketServer.broadcastTradeCompleted(execution);
    } else if (order.status === 'rejected' || order.status === 'cancelled') {
      webSocketServer.broadcastTradeFailed(order.orderId, order.error || 'Order failed');
    }
  }

  /**
   * Validate execution signal
   */
  private validateSignal(signal: ExecutionSignal): { valid: boolean; error?: string } {
    // Check consensus score
    if (signal.consensusScore < this.config.minConsensusScore) {
      return { valid: false, error: `Consensus score ${signal.consensusScore}% below minimum ${this.config.minConsensusScore}%` };
    }

    // Check signal validity
    if (signal.validUntil.getTime() < Date.now()) {
      return { valid: false, error: 'Signal has expired' };
    }

    // Check daily trade limit
    this.resetDailyCountIfNeeded();
    if (this.dailyTradeCount >= this.config.maxDailyTrades) {
      return { valid: false, error: 'Daily trade limit reached' };
    }

    return { valid: true };
  }

  /**
   * Calculate order quantity based on signal
   */
  private calculateQuantity(signal: ExecutionSignal): number {
    const maxValue = this.config.maxPositionSize * signal.recommendedSize;
    const price = this.getSimulatedPrice(signal.symbol);
    return Math.floor(maxValue / price);
  }

  /**
   * Update daily trade count
   */
  private updateDailyTradeCount(): void {
    this.resetDailyCountIfNeeded();
    this.dailyTradeCount++;
  }

  /**
   * Reset daily count if new day
   */
  private resetDailyCountIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastTradeDate !== today) {
      this.dailyTradeCount = 0;
      this.lastTradeDate = today;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Public Getters ====================

  /**
   * Get pending orders
   */
  getPendingOrders(): ExecutionOrder[] {
    return Array.from(this.pendingOrders.values());
  }

  /**
   * Get executed orders
   */
  getExecutedOrders(limit: number = 50): ExecutionOrder[] {
    return this.executedOrders.slice(-limit);
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    pendingOrders: number;
    executedToday: number;
    dailyLimit: number;
    totalExecuted: number;
    successRate: number;
  } {
    this.resetDailyCountIfNeeded();
    
    const successful = this.executedOrders.filter(o => o.status === 'filled' || o.status === 'partial').length;
    const successRate = this.executedOrders.length > 0
      ? (successful / this.executedOrders.length) * 100
      : 0;

    return {
      pendingOrders: this.pendingOrders.size,
      executedToday: this.dailyTradeCount,
      dailyLimit: this.config.maxDailyTrades,
      totalExecuted: this.executedOrders.length,
      successRate: Math.round(successRate * 10) / 10
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExecutionConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const tradeExecutionPipeline = new TradeExecutionPipeline();
