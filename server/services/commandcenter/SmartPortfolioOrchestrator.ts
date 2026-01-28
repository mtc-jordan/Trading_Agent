/**
 * Smart Portfolio Orchestration System
 * 
 * Coordinates portfolio-level decisions across all asset classes,
 * manages position sizing, risk allocation, and execution routing.
 */

import { crossAgentSynthesis } from './CrossAgentSynthesis';
import { unifiedSignalAggregator, type UnifiedSignal } from './UnifiedSignalAggregator';

// Portfolio position types
interface Position {
  id: string;
  asset: string;
  assetClass: 'stock' | 'crypto' | 'options' | 'commodity' | 'forex';
  side: 'long' | 'short';
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  weight: number; // Portfolio weight
  openedAt: Date;
  lastUpdated: Date;
  metadata: {
    sourceSignal?: string;
    targetPrice?: number;
    stopLoss?: number;
    trailingStop?: number;
    notes?: string;
  };
}

interface PortfolioSummary {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  positions: Position[];
  allocation: {
    byAssetClass: Record<string, { value: number; weight: number }>;
    bySector?: Record<string, { value: number; weight: number }>;
    byRisk: {
      low: number;
      medium: number;
      high: number;
    };
  };
  riskMetrics: {
    portfolioBeta: number;
    sharpeRatio: number;
    maxDrawdown: number;
    var95: number; // Value at Risk 95%
    correlationRisk: number;
  };
}

// Execution order types
interface ExecutionOrder {
  id: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  side: 'buy' | 'sell';
  asset: string;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  trailingPercent?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  status: 'pending' | 'submitted' | 'filled' | 'partial' | 'cancelled' | 'rejected';
  sourceSignal: string;
  rationale: string;
  riskScore: number;
  requiresApproval: boolean;
  createdAt: Date;
  submittedAt?: Date;
  filledAt?: Date;
  filledPrice?: number;
  filledQuantity?: number;
}

// Rebalancing types
interface RebalanceTarget {
  asset: string;
  targetWeight: number;
  currentWeight: number;
  action: 'buy' | 'sell' | 'hold';
  deltaShares: number;
  deltaValue: number;
  priority: 'high' | 'medium' | 'low';
}

interface RebalancePlan {
  id: string;
  createdAt: Date;
  targets: RebalanceTarget[];
  estimatedCost: number;
  estimatedTaxImpact: number;
  riskImpact: {
    beforeBeta: number;
    afterBeta: number;
    beforeVar: number;
    afterVar: number;
  };
  orders: ExecutionOrder[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'cancelled';
}

// Risk policy types
interface RiskPolicy {
  maxPositionSize: number; // Max % of portfolio in single position
  maxSectorExposure: number; // Max % in single sector
  maxAssetClassExposure: Record<string, number>;
  maxCorrelation: number; // Kill-switch threshold
  maxDrawdown: number; // Stop-loss at portfolio level
  minCashReserve: number; // Minimum cash %
  maxLeverage: number;
  approvalThresholds: {
    tradeSize: number; // Trades above this % require approval
    riskScore: number; // Trades with risk above this require approval
  };
}

// Voice command types
interface VoicePortfolioCommand {
  intent: 'query' | 'trade' | 'rebalance' | 'alert' | 'settings';
  action?: string;
  asset?: string;
  quantity?: number;
  parameters?: Record<string, unknown>;
}

interface VoicePortfolioResponse {
  text: string;
  data?: unknown;
  pendingAction?: ExecutionOrder;
  requiresConfirmation: boolean;
}

export class SmartPortfolioOrchestrator {
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, ExecutionOrder> = new Map();
  private cashBalance: number = 100000; // Default starting cash
  private riskPolicy: RiskPolicy;
  private rebalancePlans: Map<string, RebalancePlan> = new Map();

  constructor() {
    // Default risk policy
    this.riskPolicy = {
      maxPositionSize: 0.10, // 10% max per position
      maxSectorExposure: 0.25, // 25% max per sector
      maxAssetClassExposure: {
        stock: 0.60,
        crypto: 0.20,
        options: 0.15,
        commodity: 0.15,
        forex: 0.10
      },
      maxCorrelation: 0.85,
      maxDrawdown: 0.15, // 15% portfolio stop-loss
      minCashReserve: 0.05, // 5% minimum cash
      maxLeverage: 1.0, // No leverage by default
      approvalThresholds: {
        tradeSize: 0.05, // 5% of portfolio
        riskScore: 70
      }
    };
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(): PortfolioSummary {
    const positions = Array.from(this.positions.values());
    
    let investedValue = 0;
    let totalPnL = 0;
    let dayPnL = 0;

    const byAssetClass: Record<string, { value: number; weight: number }> = {};
    const byRisk = { low: 0, medium: 0, high: 0 };

    for (const pos of positions) {
      investedValue += pos.marketValue;
      totalPnL += pos.unrealizedPnL;
      
      // Asset class allocation
      if (!byAssetClass[pos.assetClass]) {
        byAssetClass[pos.assetClass] = { value: 0, weight: 0 };
      }
      byAssetClass[pos.assetClass].value += pos.marketValue;

      // Risk allocation (simplified)
      if (pos.assetClass === 'crypto' || pos.assetClass === 'options') {
        byRisk.high += pos.marketValue;
      } else if (pos.assetClass === 'stock') {
        byRisk.medium += pos.marketValue;
      } else {
        byRisk.low += pos.marketValue;
      }
    }

    const totalValue = this.cashBalance + investedValue;

    // Calculate weights
    for (const key of Object.keys(byAssetClass)) {
      byAssetClass[key].weight = totalValue > 0 ? byAssetClass[key].value / totalValue : 0;
    }

    return {
      totalValue,
      cashBalance: this.cashBalance,
      investedValue,
      totalPnL,
      totalPnLPercent: investedValue > 0 ? (totalPnL / (investedValue - totalPnL)) * 100 : 0,
      dayPnL,
      dayPnLPercent: 0,
      positions,
      allocation: {
        byAssetClass,
        byRisk: {
          low: totalValue > 0 ? byRisk.low / totalValue : 0,
          medium: totalValue > 0 ? byRisk.medium / totalValue : 0,
          high: totalValue > 0 ? byRisk.high / totalValue : 0
        }
      },
      riskMetrics: this.calculateRiskMetrics(positions, totalValue)
    };
  }

  /**
   * Calculate portfolio risk metrics
   */
  private calculateRiskMetrics(positions: Position[], totalValue: number): PortfolioSummary['riskMetrics'] {
    // Simplified risk calculations
    let weightedBeta = 0;
    
    for (const pos of positions) {
      const weight = pos.marketValue / totalValue;
      // Assign approximate betas by asset class
      const beta = pos.assetClass === 'crypto' ? 2.0 :
                   pos.assetClass === 'options' ? 1.5 :
                   pos.assetClass === 'stock' ? 1.0 :
                   pos.assetClass === 'commodity' ? 0.5 : 0.3;
      weightedBeta += weight * beta;
    }

    return {
      portfolioBeta: weightedBeta || 1.0,
      sharpeRatio: 1.2, // Placeholder
      maxDrawdown: 0.08, // Placeholder
      var95: totalValue * 0.02, // 2% VaR estimate
      correlationRisk: 0.65 // Placeholder
    };
  }

  /**
   * Process signal and generate execution order
   */
  processSignalForExecution(signal: UnifiedSignal): ExecutionOrder | null {
    const summary = this.getPortfolioSummary();
    
    // Check if we already have a position
    const existingPosition = this.positions.get(signal.asset.toUpperCase());
    
    // Validate against risk policy
    const validation = this.validateTrade(signal, summary, existingPosition);
    if (!validation.allowed) {
      console.log(`Trade blocked: ${validation.reason}`);
      return null;
    }

    // Calculate position size
    const positionSize = this.calculatePositionSize(signal, summary);
    if (positionSize.quantity <= 0) {
      return null;
    }

    const order: ExecutionOrder = {
      id: `order_${Date.now()}`,
      type: signal.execution.entryPrice ? 'limit' : 'market',
      side: signal.direction === 'long' ? 'buy' : 'sell',
      asset: signal.asset,
      quantity: positionSize.quantity,
      limitPrice: signal.execution.entryPrice,
      timeInForce: signal.execution.urgency === 'immediate' ? 'ioc' : 'day',
      status: 'pending',
      sourceSignal: signal.id,
      rationale: signal.metadata.reasoning,
      riskScore: this.calculateTradeRiskScore(signal, summary),
      requiresApproval: this.requiresApproval(signal, positionSize, summary),
      createdAt: new Date()
    };

    this.orders.set(order.id, order);
    return order;
  }

  /**
   * Validate trade against risk policy
   */
  private validateTrade(
    signal: UnifiedSignal,
    summary: PortfolioSummary,
    existingPosition?: Position
  ): { allowed: boolean; reason?: string } {
    // Check cash reserve
    if (signal.direction === 'long') {
      const cashAfterTrade = this.cashBalance - (signal.execution.positionSize || 0);
      const minCash = summary.totalValue * this.riskPolicy.minCashReserve;
      if (cashAfterTrade < minCash) {
        return { allowed: false, reason: 'Insufficient cash reserve' };
      }
    }

    // Check asset class exposure
    const assetClassAllocation = summary.allocation.byAssetClass[signal.assetClass];
    if (assetClassAllocation) {
      const maxExposure = this.riskPolicy.maxAssetClassExposure[signal.assetClass] || 0.25;
      if (assetClassAllocation.weight >= maxExposure) {
        return { allowed: false, reason: `Max ${signal.assetClass} exposure reached` };
      }
    }

    // Check position size limit
    if (existingPosition) {
      const newWeight = (existingPosition.marketValue + (signal.execution.positionSize || 0)) / summary.totalValue;
      if (newWeight > this.riskPolicy.maxPositionSize) {
        return { allowed: false, reason: 'Position size limit exceeded' };
      }
    }

    // Check correlation kill-switch
    const synthesis = crossAgentSynthesis.synthesize();
    if (synthesis.crossAssetCorrelations.regimeCorrelations[0]?.avgCorrelation > this.riskPolicy.maxCorrelation) {
      return { allowed: false, reason: 'Correlation kill-switch triggered' };
    }

    return { allowed: true };
  }

  /**
   * Calculate position size based on signal and portfolio
   */
  private calculatePositionSize(
    signal: UnifiedSignal,
    summary: PortfolioSummary
  ): { quantity: number; value: number } {
    // Use Kelly Criterion variant
    const confidence = signal.confidence / 100;
    const winRate = signal.riskMetrics.winRate;
    const riskReward = signal.riskMetrics.sharpeRatio;

    // Kelly fraction: f = (p * b - q) / b where p = win rate, b = risk/reward, q = 1-p
    const kellyFraction = Math.max(0, (winRate * riskReward - (1 - winRate)) / riskReward);
    
    // Use half-Kelly for safety
    const halfKelly = kellyFraction / 2;
    
    // Cap at max position size
    const maxSize = Math.min(halfKelly, this.riskPolicy.maxPositionSize);
    
    // Calculate value and quantity
    const value = summary.totalValue * maxSize * confidence;
    const price = signal.execution.entryPrice || 100; // Fallback price
    const quantity = Math.floor(value / price);

    return { quantity, value };
  }

  /**
   * Calculate trade risk score
   */
  private calculateTradeRiskScore(signal: UnifiedSignal, summary: PortfolioSummary): number {
    let riskScore = 30; // Base risk

    // Asset class risk
    if (signal.assetClass === 'crypto') riskScore += 25;
    else if (signal.assetClass === 'options') riskScore += 20;
    else if (signal.assetClass === 'stock') riskScore += 10;

    // Confidence inverse (low confidence = higher risk)
    riskScore += (100 - signal.confidence) * 0.2;

    // Portfolio concentration risk
    const assetAllocation = summary.allocation.byAssetClass[signal.assetClass];
    if (assetAllocation && assetAllocation.weight > 0.3) {
      riskScore += 15;
    }

    // Urgency risk
    if (signal.execution.urgency === 'immediate') riskScore += 10;

    return Math.min(100, riskScore);
  }

  /**
   * Check if trade requires human approval
   */
  private requiresApproval(
    signal: UnifiedSignal,
    positionSize: { quantity: number; value: number },
    summary: PortfolioSummary
  ): boolean {
    // Large trade
    if (positionSize.value / summary.totalValue > this.riskPolicy.approvalThresholds.tradeSize) {
      return true;
    }

    // High risk
    const riskScore = this.calculateTradeRiskScore(signal, summary);
    if (riskScore > this.riskPolicy.approvalThresholds.riskScore) {
      return true;
    }

    // Low confidence
    if (signal.confidence < 60) {
      return true;
    }

    return false;
  }

  /**
   * Generate rebalance plan
   */
  generateRebalancePlan(targetAllocation: Record<string, number>): RebalancePlan {
    const summary = this.getPortfolioSummary();
    const targets: RebalanceTarget[] = [];
    const orders: ExecutionOrder[] = [];

    for (const [asset, targetWeight] of Object.entries(targetAllocation)) {
      const position = this.positions.get(asset.toUpperCase());
      const currentWeight = position ? position.weight : 0;
      const currentValue = position ? position.marketValue : 0;
      
      const targetValue = summary.totalValue * targetWeight;
      const deltaValue = targetValue - currentValue;
      const currentPrice = position?.currentPrice || 100;
      const deltaShares = Math.floor(deltaValue / currentPrice);

      let action: 'buy' | 'sell' | 'hold' = 'hold';
      if (deltaShares > 0) action = 'buy';
      else if (deltaShares < 0) action = 'sell';

      const priority: 'high' | 'medium' | 'low' = 
        Math.abs(targetWeight - currentWeight) > 0.05 ? 'high' :
        Math.abs(targetWeight - currentWeight) > 0.02 ? 'medium' : 'low';

      targets.push({
        asset,
        targetWeight,
        currentWeight,
        action,
        deltaShares: Math.abs(deltaShares),
        deltaValue: Math.abs(deltaValue),
        priority
      });

      if (action !== 'hold') {
        orders.push({
          id: `rebal_${asset}_${Date.now()}`,
          type: 'market',
          side: action,
          asset,
          quantity: Math.abs(deltaShares),
          timeInForce: 'day',
          status: 'pending',
          sourceSignal: 'rebalance',
          rationale: `Rebalance to ${(targetWeight * 100).toFixed(1)}% allocation`,
          riskScore: 30,
          requiresApproval: Math.abs(deltaValue) > summary.totalValue * 0.05,
          createdAt: new Date()
        });
      }
    }

    const plan: RebalancePlan = {
      id: `rebal_plan_${Date.now()}`,
      createdAt: new Date(),
      targets: targets.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      estimatedCost: orders.reduce((sum, o) => sum + (o.quantity * 0.01), 0), // Estimated commissions
      estimatedTaxImpact: 0, // Would need tax lot info
      riskImpact: {
        beforeBeta: summary.riskMetrics.portfolioBeta,
        afterBeta: summary.riskMetrics.portfolioBeta * 0.95, // Estimate
        beforeVar: summary.riskMetrics.var95,
        afterVar: summary.riskMetrics.var95 * 0.9
      },
      orders,
      status: 'draft'
    };

    this.rebalancePlans.set(plan.id, plan);
    return plan;
  }

  /**
   * Execute approved order
   */
  async executeOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.status !== 'pending') {
      return { success: false, message: `Order status is ${order.status}` };
    }

    if (order.requiresApproval) {
      return { success: false, message: 'Order requires approval' };
    }

    // Simulate execution (in real implementation, this would call Alpaca API)
    order.status = 'submitted';
    order.submittedAt = new Date();

    // Simulate fill
    setTimeout(() => {
      order.status = 'filled';
      order.filledAt = new Date();
      order.filledPrice = order.limitPrice || 100;
      order.filledQuantity = order.quantity;

      // Update position
      this.updatePositionFromFill(order);
    }, 100);

    return { success: true, message: 'Order submitted' };
  }

  /**
   * Update position from filled order
   */
  private updatePositionFromFill(order: ExecutionOrder): void {
    const key = order.asset.toUpperCase();
    const existing = this.positions.get(key);
    const fillPrice = order.filledPrice || 100;
    const fillQty = order.filledQuantity || order.quantity;

    if (order.side === 'buy') {
      if (existing) {
        // Average in
        const totalQty = existing.quantity + fillQty;
        const totalCost = (existing.avgEntryPrice * existing.quantity) + (fillPrice * fillQty);
        existing.avgEntryPrice = totalCost / totalQty;
        existing.quantity = totalQty;
        existing.currentPrice = fillPrice;
        existing.marketValue = totalQty * fillPrice;
        existing.unrealizedPnL = (fillPrice - existing.avgEntryPrice) * totalQty;
        existing.unrealizedPnLPercent = (existing.unrealizedPnL / (existing.avgEntryPrice * totalQty)) * 100;
        existing.lastUpdated = new Date();
      } else {
        // New position
        const position: Position = {
          id: `pos_${key}_${Date.now()}`,
          asset: key,
          assetClass: this.determineAssetClass(key),
          side: 'long',
          quantity: fillQty,
          avgEntryPrice: fillPrice,
          currentPrice: fillPrice,
          marketValue: fillQty * fillPrice,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          weight: 0, // Will be calculated
          openedAt: new Date(),
          lastUpdated: new Date(),
          metadata: {
            sourceSignal: order.sourceSignal
          }
        };
        this.positions.set(key, position);
      }
      
      // Deduct cash
      this.cashBalance -= fillQty * fillPrice;
    } else {
      // Sell
      if (existing) {
        existing.quantity -= fillQty;
        if (existing.quantity <= 0) {
          this.positions.delete(key);
        } else {
          existing.marketValue = existing.quantity * fillPrice;
          existing.lastUpdated = new Date();
        }
        
        // Add cash
        this.cashBalance += fillQty * fillPrice;
      }
    }

    // Recalculate weights
    this.recalculateWeights();
  }

  /**
   * Recalculate position weights
   */
  private recalculateWeights(): void {
    const totalValue = this.cashBalance + 
      Array.from(this.positions.values()).reduce((sum, p) => sum + p.marketValue, 0);

    for (const position of Array.from(this.positions.values())) {
      position.weight = totalValue > 0 ? position.marketValue / totalValue : 0;
    }
  }

  /**
   * Determine asset class from symbol
   */
  private determineAssetClass(asset: string): Position['assetClass'] {
    const cryptoTokens = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'ARB', 'OP', 'DOGE', 'SHIB'];
    const commodities = ['GLD', 'SLV', 'USO', 'UNG', 'PAXG'];
    const forex = ['DXY', 'EURUSD', 'GBPUSD', 'USDJPY'];
    
    if (cryptoTokens.includes(asset.toUpperCase())) return 'crypto';
    if (commodities.includes(asset.toUpperCase())) return 'commodity';
    if (forex.includes(asset.toUpperCase())) return 'forex';
    return 'stock';
  }

  /**
   * Process voice command for portfolio
   */
  processVoiceCommand(command: VoicePortfolioCommand): VoicePortfolioResponse {
    const summary = this.getPortfolioSummary();

    switch (command.intent) {
      case 'query':
        return this.handleQueryCommand(command, summary);
      case 'trade':
        return this.handleTradeCommand(command, summary);
      case 'rebalance':
        return this.handleRebalanceCommand(command, summary);
      case 'alert':
        return this.handleAlertCommand(command, summary);
      case 'settings':
        return this.handleSettingsCommand(command);
      default:
        return {
          text: "I can help with portfolio queries, trades, rebalancing, alerts, or settings. What would you like to do?",
          requiresConfirmation: false
        };
    }
  }

  private handleQueryCommand(command: VoicePortfolioCommand, summary: PortfolioSummary): VoicePortfolioResponse {
    if (command.action === 'summary' || !command.action) {
      return {
        text: `Your portfolio is worth $${summary.totalValue.toLocaleString()} with ${summary.totalPnLPercent >= 0 ? '+' : ''}${summary.totalPnLPercent.toFixed(2)}% P&L. You have ${summary.positions.length} positions and $${summary.cashBalance.toLocaleString()} in cash.`,
        data: summary,
        requiresConfirmation: false
      };
    }

    if (command.action === 'position' && command.asset) {
      const position = this.positions.get(command.asset.toUpperCase());
      if (position) {
        return {
          text: `${position.asset}: ${position.quantity} shares at $${position.avgEntryPrice.toFixed(2)} avg. Current value $${position.marketValue.toLocaleString()} (${position.unrealizedPnLPercent >= 0 ? '+' : ''}${position.unrealizedPnLPercent.toFixed(2)}%)`,
          data: position,
          requiresConfirmation: false
        };
      }
      return {
        text: `No position found for ${command.asset}`,
        requiresConfirmation: false
      };
    }

    if (command.action === 'risk') {
      return {
        text: `Portfolio beta: ${summary.riskMetrics.portfolioBeta.toFixed(2)}, VaR 95%: $${summary.riskMetrics.var95.toLocaleString()}, Max drawdown: ${(summary.riskMetrics.maxDrawdown * 100).toFixed(1)}%`,
        data: summary.riskMetrics,
        requiresConfirmation: false
      };
    }

    return {
      text: "I can show portfolio summary, specific positions, or risk metrics. What would you like to see?",
      requiresConfirmation: false
    };
  }

  private handleTradeCommand(command: VoicePortfolioCommand, summary: PortfolioSummary): VoicePortfolioResponse {
    if (!command.asset || !command.quantity) {
      return {
        text: "Please specify the asset and quantity for the trade.",
        requiresConfirmation: false
      };
    }

    const side = command.action === 'sell' ? 'sell' : 'buy';
    const estimatedValue = command.quantity * 100; // Placeholder price

    const order: ExecutionOrder = {
      id: `voice_order_${Date.now()}`,
      type: 'market',
      side,
      asset: command.asset.toUpperCase(),
      quantity: command.quantity,
      timeInForce: 'day',
      status: 'pending',
      sourceSignal: 'voice_command',
      rationale: 'Voice command trade',
      riskScore: this.calculateTradeRiskScore({
        id: 'voice',
        source: 'stock_consensus',
        asset: command.asset,
        assetClass: this.determineAssetClass(command.asset),
        direction: side === 'buy' ? 'long' : 'short',
        strength: 70,
        confidence: 70,
        timeframe: 'swing',
        metadata: { agentName: 'Voice', reasoning: 'User command', keyFactors: [], supportingData: {} },
        riskMetrics: { maxDrawdown: 0.1, sharpeRatio: 1.5, winRate: 0.6, avgHoldingPeriod: '5d' },
        execution: { urgency: 'today' },
        timestamp: new Date(),
        expiresAt: new Date()
      }, summary),
      requiresApproval: estimatedValue > summary.totalValue * 0.05,
      createdAt: new Date()
    };

    this.orders.set(order.id, order);

    return {
      text: `Ready to ${side} ${command.quantity} shares of ${command.asset.toUpperCase()} for approximately $${estimatedValue.toLocaleString()}. ${order.requiresApproval ? 'This trade requires your approval.' : 'Confirm to execute.'}`,
      pendingAction: order,
      requiresConfirmation: true
    };
  }

  private handleRebalanceCommand(command: VoicePortfolioCommand, summary: PortfolioSummary): VoicePortfolioResponse {
    // Generate a simple rebalance plan
    const currentAllocation: Record<string, number> = {};
    for (const pos of summary.positions) {
      currentAllocation[pos.asset] = pos.weight;
    }

    return {
      text: `Current allocation: ${Object.entries(currentAllocation).map(([a, w]) => `${a}: ${(w * 100).toFixed(1)}%`).join(', ')}. Would you like me to generate a rebalance plan?`,
      data: currentAllocation,
      requiresConfirmation: false
    };
  }

  private handleAlertCommand(command: VoicePortfolioCommand, summary: PortfolioSummary): VoicePortfolioResponse {
    const alerts: string[] = [];

    // Check for risk alerts
    if (summary.riskMetrics.portfolioBeta > 1.5) {
      alerts.push('High portfolio beta - consider hedging');
    }

    if (summary.allocation.byRisk.high > 0.4) {
      alerts.push('High-risk allocation exceeds 40%');
    }

    if (summary.cashBalance / summary.totalValue < this.riskPolicy.minCashReserve) {
      alerts.push('Cash reserve below minimum');
    }

    if (alerts.length === 0) {
      return {
        text: 'No active alerts. Your portfolio is within risk parameters.',
        requiresConfirmation: false
      };
    }

    return {
      text: `${alerts.length} active alert${alerts.length > 1 ? 's' : ''}: ${alerts.join('. ')}`,
      data: alerts,
      requiresConfirmation: false
    };
  }

  private handleSettingsCommand(command: VoicePortfolioCommand): VoicePortfolioResponse {
    return {
      text: `Current risk settings: Max position ${(this.riskPolicy.maxPositionSize * 100).toFixed(0)}%, Max drawdown ${(this.riskPolicy.maxDrawdown * 100).toFixed(0)}%, Cash reserve ${(this.riskPolicy.minCashReserve * 100).toFixed(0)}%`,
      data: this.riskPolicy,
      requiresConfirmation: false
    };
  }

  /**
   * Update risk policy
   */
  updateRiskPolicy(updates: Partial<RiskPolicy>): void {
    this.riskPolicy = { ...this.riskPolicy, ...updates };
  }

  /**
   * Get pending orders
   */
  getPendingOrders(): ExecutionOrder[] {
    return Array.from(this.orders.values()).filter(o => o.status === 'pending');
  }

  /**
   * Approve order
   */
  approveOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (order && order.status === 'pending') {
      order.requiresApproval = false;
      return true;
    }
    return false;
  }

  /**
   * Cancel order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (order && order.status === 'pending') {
      order.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get order history
   */
  getOrderHistory(limit: number = 50): ExecutionOrder[] {
    return Array.from(this.orders.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Set cash balance (for testing/initialization)
   */
  setCashBalance(amount: number): void {
    this.cashBalance = amount;
  }

  /**
   * Add position directly (for testing/initialization)
   */
  addPosition(position: Omit<Position, 'id' | 'weight'>): void {
    const key = position.asset.toUpperCase();
    const fullPosition: Position = {
      ...position,
      id: `pos_${key}_${Date.now()}`,
      weight: 0
    };
    this.positions.set(key, fullPosition);
    this.recalculateWeights();
  }
}

export const smartPortfolioOrchestrator = new SmartPortfolioOrchestrator();
