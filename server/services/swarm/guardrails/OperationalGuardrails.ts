/**
 * Operational Guardrails
 * 
 * Implements institutional-grade safety constraints:
 * - 2% Rule: No single trade can risk more than 2% of total capital
 * - Correlation Kill-Switch: Auto-reduce positions when hedges fail
 * - Human-In-The-Loop (HITL): Require approval for large trades
 * - Position Limits: Maximum exposure per asset/sector
 * - Drawdown Protection: Circuit breakers for portfolio losses
 */

export interface PortfolioState {
  totalCapital: number;
  availableCapital: number;
  positions: Position[];
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  maxDrawdown: number;
  currentDrawdown: number;
}

export interface Position {
  id: string;
  asset: string;
  assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex';
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  timestamp: number;
  correlationGroup?: string;
}

export interface GuardrailConfig {
  // 2% Rule
  maxRiskPerTrade: number; // Default 0.02 (2%)
  maxRiskPerDay: number; // Default 0.05 (5%)
  
  // Position Limits
  maxPositionSize: number; // Max single position as % of capital
  maxSectorExposure: number; // Max exposure per sector
  maxAssetClassExposure: number; // Max exposure per asset class
  
  // Correlation Kill-Switch
  correlationThreshold: number; // Trigger when correlation > this
  correlationReductionPercent: number; // Reduce positions by this %
  
  // HITL Thresholds
  hitlTradeThreshold: number; // Require approval above this $ amount
  hitlDrawdownThreshold: number; // Require approval when drawdown exceeds this
  
  // Circuit Breakers
  dailyLossLimit: number; // Stop trading if daily loss exceeds this %
  weeklyLossLimit: number; // Stop trading if weekly loss exceeds this %
  maxDrawdownLimit: number; // Stop trading if drawdown exceeds this %
}

export interface TradeProposal {
  id: string;
  asset: string;
  assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex';
  side: 'long' | 'short';
  size: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  urgency: 'immediate' | 'gradual' | 'patient';
  confidence: number;
  agentId: string;
}

export interface GuardrailCheck {
  passed: boolean;
  rule: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'blocker';
  action?: 'approve' | 'reduce' | 'reject' | 'require_hitl';
  adjustedSize?: number;
}

export interface HITLRequest {
  id: string;
  timestamp: number;
  tradeProposal: TradeProposal;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  expiresAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  approvedAt?: number;
}

export class OperationalGuardrails {
  private config: GuardrailConfig;
  private portfolioState: PortfolioState;
  private hitlQueue: Map<string, HITLRequest>;
  private correlationMatrix: Map<string, Map<string, number>>;
  private tradingHalted: boolean;
  private haltReason?: string;

  constructor(config?: Partial<GuardrailConfig>) {
    this.config = {
      maxRiskPerTrade: 0.02,
      maxRiskPerDay: 0.05,
      maxPositionSize: 0.10,
      maxSectorExposure: 0.25,
      maxAssetClassExposure: 0.40,
      correlationThreshold: 0.95,
      correlationReductionPercent: 0.50,
      hitlTradeThreshold: 100000,
      hitlDrawdownThreshold: 0.10,
      dailyLossLimit: 0.03,
      weeklyLossLimit: 0.07,
      maxDrawdownLimit: 0.15,
      ...config,
    };

    this.portfolioState = {
      totalCapital: 1000000,
      availableCapital: 1000000,
      positions: [],
      dailyPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
    };

    this.hitlQueue = new Map();
    this.correlationMatrix = new Map();
    this.tradingHalted = false;
  }

  /**
   * Validate a trade proposal against all guardrails
   */
  validateTrade(proposal: TradeProposal): {
    approved: boolean;
    checks: GuardrailCheck[];
    adjustedProposal?: TradeProposal;
    hitlRequired?: HITLRequest;
  } {
    const checks: GuardrailCheck[] = [];
    let adjustedSize = proposal.size;
    let hitlRequired: HITLRequest | undefined;

    // Check if trading is halted
    if (this.tradingHalted) {
      checks.push({
        passed: false,
        rule: 'trading_halt',
        message: `Trading halted: ${this.haltReason}`,
        severity: 'blocker',
        action: 'reject',
      });
      return { approved: false, checks };
    }

    // 1. Check 2% Rule
    const riskCheck = this.check2PercentRule(proposal);
    checks.push(riskCheck);
    if (riskCheck.adjustedSize) {
      adjustedSize = Math.min(adjustedSize, riskCheck.adjustedSize);
    }

    // 2. Check Position Limits
    const positionCheck = this.checkPositionLimits(proposal);
    checks.push(positionCheck);
    if (positionCheck.adjustedSize) {
      adjustedSize = Math.min(adjustedSize, positionCheck.adjustedSize);
    }

    // 3. Check Sector Exposure
    const sectorCheck = this.checkSectorExposure(proposal);
    checks.push(sectorCheck);

    // 4. Check Correlation Kill-Switch
    const correlationCheck = this.checkCorrelationKillSwitch(proposal);
    checks.push(correlationCheck);

    // 5. Check Circuit Breakers
    const circuitCheck = this.checkCircuitBreakers();
    checks.push(circuitCheck);

    // 6. Check HITL Requirements
    const hitlCheck = this.checkHITLRequirement(proposal);
    checks.push(hitlCheck);
    if (hitlCheck.action === 'require_hitl') {
      hitlRequired = this.createHITLRequest(proposal, hitlCheck.message);
    }

    // 7. Check Daily Risk Limit
    const dailyRiskCheck = this.checkDailyRiskLimit(proposal);
    checks.push(dailyRiskCheck);

    // Determine final approval
    const blockers = checks.filter(c => c.severity === 'blocker' && !c.passed);
    const criticals = checks.filter(c => c.severity === 'critical' && !c.passed);
    
    const approved = blockers.length === 0 && criticals.length === 0 && !hitlRequired;

    // Create adjusted proposal if size was modified
    let adjustedProposal: TradeProposal | undefined;
    if (adjustedSize !== proposal.size && adjustedSize > 0) {
      adjustedProposal = { ...proposal, size: adjustedSize };
    }

    return {
      approved,
      checks,
      adjustedProposal,
      hitlRequired,
    };
  }

  /**
   * Check 2% Rule - No single trade can risk more than 2% of capital
   */
  private check2PercentRule(proposal: TradeProposal): GuardrailCheck {
    const maxRisk = this.portfolioState.totalCapital * this.config.maxRiskPerTrade;
    
    // Calculate risk based on stop loss or default 5% adverse move
    const stopLossPercent = proposal.stopLoss || 0.05;
    const tradeRisk = proposal.size * stopLossPercent;

    if (tradeRisk > maxRisk) {
      const adjustedSize = maxRisk / stopLossPercent;
      return {
        passed: false,
        rule: '2_percent_rule',
        message: `Trade risk $${tradeRisk.toLocaleString()} exceeds 2% limit ($${maxRisk.toLocaleString()}). Reducing size.`,
        severity: 'warning',
        action: 'reduce',
        adjustedSize,
      };
    }

    return {
      passed: true,
      rule: '2_percent_rule',
      message: `Trade risk $${tradeRisk.toLocaleString()} within 2% limit`,
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Check Position Limits
   */
  private checkPositionLimits(proposal: TradeProposal): GuardrailCheck {
    const maxPosition = this.portfolioState.totalCapital * this.config.maxPositionSize;
    
    // Get existing position in same asset
    const existingPosition = this.portfolioState.positions.find(
      p => p.asset === proposal.asset && p.side === proposal.side
    );
    
    const totalExposure = (existingPosition?.size || 0) + proposal.size;

    if (totalExposure > maxPosition) {
      const adjustedSize = Math.max(0, maxPosition - (existingPosition?.size || 0));
      return {
        passed: false,
        rule: 'position_limit',
        message: `Total exposure $${totalExposure.toLocaleString()} exceeds ${this.config.maxPositionSize * 100}% limit`,
        severity: adjustedSize > 0 ? 'warning' : 'critical',
        action: adjustedSize > 0 ? 'reduce' : 'reject',
        adjustedSize: adjustedSize > 0 ? adjustedSize : undefined,
      };
    }

    return {
      passed: true,
      rule: 'position_limit',
      message: 'Position within limits',
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Check Sector Exposure
   */
  private checkSectorExposure(proposal: TradeProposal): GuardrailCheck {
    const maxSectorExposure = this.portfolioState.totalCapital * this.config.maxSectorExposure;
    
    // Calculate current sector exposure
    const sectorPositions = this.portfolioState.positions.filter(
      p => p.assetClass === proposal.assetClass
    );
    const currentExposure = sectorPositions.reduce((sum, p) => sum + p.size, 0);
    const totalExposure = currentExposure + proposal.size;

    if (totalExposure > maxSectorExposure) {
      return {
        passed: false,
        rule: 'sector_exposure',
        message: `${proposal.assetClass} exposure $${totalExposure.toLocaleString()} exceeds ${this.config.maxSectorExposure * 100}% limit`,
        severity: 'warning',
        action: 'reduce',
      };
    }

    return {
      passed: true,
      rule: 'sector_exposure',
      message: `${proposal.assetClass} exposure within limits`,
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Check Correlation Kill-Switch
   * If Gold and Crypto are moving 100% in sync, hedge is broken
   */
  private checkCorrelationKillSwitch(proposal: TradeProposal): GuardrailCheck {
    // Check correlations between asset classes
    const correlations = this.calculateAssetClassCorrelations();
    
    // Find any correlation above threshold
    const highCorrelations: { pair: string; correlation: number }[] = [];
    
    for (const [pair, correlation] of Array.from(correlations.entries())) {
      if (correlation >= this.config.correlationThreshold) {
        highCorrelations.push({ pair, correlation });
      }
    }

    if (highCorrelations.length > 0) {
      const worstCorrelation = highCorrelations.sort((a, b) => b.correlation - a.correlation)[0];
      
      return {
        passed: false,
        rule: 'correlation_kill_switch',
        message: `KILL SWITCH: ${worstCorrelation.pair} correlation at ${(worstCorrelation.correlation * 100).toFixed(1)}%. Hedges ineffective. Reducing all positions by ${this.config.correlationReductionPercent * 100}%`,
        severity: 'critical',
        action: 'reduce',
      };
    }

    return {
      passed: true,
      rule: 'correlation_kill_switch',
      message: 'Asset correlations within normal range',
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Calculate correlations between asset classes
   */
  private calculateAssetClassCorrelations(): Map<string, number> {
    const correlations = new Map<string, number>();
    
    // Simulated correlations (in production, calculate from price data)
    const assetClasses = ['crypto', 'stocks', 'commodities', 'forex'];
    
    for (let i = 0; i < assetClasses.length; i++) {
      for (let j = i + 1; j < assetClasses.length; j++) {
        const pair = `${assetClasses[i]}-${assetClasses[j]}`;
        // Simulate correlation with some randomness
        const baseCorrelation = Math.random() * 0.6 + 0.2;
        correlations.set(pair, baseCorrelation);
      }
    }

    return correlations;
  }

  /**
   * Check Circuit Breakers
   */
  private checkCircuitBreakers(): GuardrailCheck {
    const { dailyPnL, weeklyPnL, currentDrawdown, totalCapital } = this.portfolioState;
    
    const dailyLossPercent = -dailyPnL / totalCapital;
    const weeklyLossPercent = -weeklyPnL / totalCapital;

    if (dailyLossPercent >= this.config.dailyLossLimit) {
      this.haltTrading(`Daily loss limit reached: ${(dailyLossPercent * 100).toFixed(1)}%`);
      return {
        passed: false,
        rule: 'circuit_breaker_daily',
        message: `CIRCUIT BREAKER: Daily loss ${(dailyLossPercent * 100).toFixed(1)}% exceeds ${this.config.dailyLossLimit * 100}% limit`,
        severity: 'blocker',
        action: 'reject',
      };
    }

    if (weeklyLossPercent >= this.config.weeklyLossLimit) {
      this.haltTrading(`Weekly loss limit reached: ${(weeklyLossPercent * 100).toFixed(1)}%`);
      return {
        passed: false,
        rule: 'circuit_breaker_weekly',
        message: `CIRCUIT BREAKER: Weekly loss ${(weeklyLossPercent * 100).toFixed(1)}% exceeds ${this.config.weeklyLossLimit * 100}% limit`,
        severity: 'blocker',
        action: 'reject',
      };
    }

    if (currentDrawdown >= this.config.maxDrawdownLimit) {
      this.haltTrading(`Max drawdown reached: ${(currentDrawdown * 100).toFixed(1)}%`);
      return {
        passed: false,
        rule: 'circuit_breaker_drawdown',
        message: `CIRCUIT BREAKER: Drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds ${this.config.maxDrawdownLimit * 100}% limit`,
        severity: 'blocker',
        action: 'reject',
      };
    }

    return {
      passed: true,
      rule: 'circuit_breakers',
      message: 'All circuit breakers within limits',
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Check HITL Requirement
   */
  private checkHITLRequirement(proposal: TradeProposal): GuardrailCheck {
    // Check trade size threshold
    if (proposal.size >= this.config.hitlTradeThreshold) {
      return {
        passed: false,
        rule: 'hitl_trade_size',
        message: `Trade size $${proposal.size.toLocaleString()} requires human approval (threshold: $${this.config.hitlTradeThreshold.toLocaleString()})`,
        severity: 'warning',
        action: 'require_hitl',
      };
    }

    // Check drawdown threshold
    if (this.portfolioState.currentDrawdown >= this.config.hitlDrawdownThreshold) {
      return {
        passed: false,
        rule: 'hitl_drawdown',
        message: `Current drawdown ${(this.portfolioState.currentDrawdown * 100).toFixed(1)}% requires human approval for new trades`,
        severity: 'warning',
        action: 'require_hitl',
      };
    }

    return {
      passed: true,
      rule: 'hitl_check',
      message: 'No human approval required',
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Check Daily Risk Limit
   */
  private checkDailyRiskLimit(proposal: TradeProposal): GuardrailCheck {
    const maxDailyRisk = this.portfolioState.totalCapital * this.config.maxRiskPerDay;
    
    // Calculate today's risk exposure
    const todaysPositions = this.portfolioState.positions.filter(p => {
      const today = new Date();
      const positionDate = new Date(p.timestamp);
      return positionDate.toDateString() === today.toDateString();
    });
    
    const currentDailyRisk = todaysPositions.reduce((sum, p) => {
      const stopLoss = 0.05; // Assume 5% stop loss
      return sum + (p.size * stopLoss);
    }, 0);

    const proposedRisk = proposal.size * (proposal.stopLoss || 0.05);
    const totalDailyRisk = currentDailyRisk + proposedRisk;

    if (totalDailyRisk > maxDailyRisk) {
      return {
        passed: false,
        rule: 'daily_risk_limit',
        message: `Daily risk $${totalDailyRisk.toLocaleString()} would exceed ${this.config.maxRiskPerDay * 100}% limit`,
        severity: 'warning',
        action: 'reduce',
      };
    }

    return {
      passed: true,
      rule: 'daily_risk_limit',
      message: 'Daily risk within limits',
      severity: 'info',
      action: 'approve',
    };
  }

  /**
   * Create HITL request
   */
  private createHITLRequest(proposal: TradeProposal, reason: string): HITLRequest {
    const request: HITLRequest = {
      id: `hitl_${Date.now()}_${proposal.asset}`,
      timestamp: Date.now(),
      tradeProposal: proposal,
      reason,
      urgency: proposal.urgency === 'immediate' ? 'high' : proposal.urgency === 'gradual' ? 'medium' : 'low',
      expiresAt: Date.now() + (proposal.urgency === 'immediate' ? 300000 : 3600000), // 5 min or 1 hour
      status: 'pending',
    };

    this.hitlQueue.set(request.id, request);
    return request;
  }

  /**
   * Approve HITL request
   */
  approveHITL(requestId: string, approvedBy: string): boolean {
    const request = this.hitlQueue.get(requestId);
    if (!request || request.status !== 'pending') return false;
    
    if (Date.now() > request.expiresAt) {
      request.status = 'expired';
      return false;
    }

    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = Date.now();
    return true;
  }

  /**
   * Reject HITL request
   */
  rejectHITL(requestId: string, rejectedBy: string): boolean {
    const request = this.hitlQueue.get(requestId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'rejected';
    request.approvedBy = rejectedBy;
    request.approvedAt = Date.now();
    return true;
  }

  /**
   * Get pending HITL requests
   */
  getPendingHITLRequests(): HITLRequest[] {
    return Array.from(this.hitlQueue.values())
      .filter(r => r.status === 'pending' && Date.now() < r.expiresAt)
      .sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
  }

  /**
   * Halt trading
   */
  haltTrading(reason: string): void {
    this.tradingHalted = true;
    this.haltReason = reason;
  }

  /**
   * Resume trading
   */
  resumeTrading(): void {
    this.tradingHalted = false;
    this.haltReason = undefined;
  }

  /**
   * Update portfolio state
   */
  updatePortfolioState(state: Partial<PortfolioState>): void {
    this.portfolioState = { ...this.portfolioState, ...state };
  }

  /**
   * Add position
   */
  addPosition(position: Position): void {
    this.portfolioState.positions.push(position);
    this.portfolioState.availableCapital -= position.size;
  }

  /**
   * Close position
   */
  closePosition(positionId: string, exitPrice: number): number {
    const index = this.portfolioState.positions.findIndex(p => p.id === positionId);
    if (index === -1) return 0;

    const position = this.portfolioState.positions[index];
    const pnl = position.side === 'long'
      ? (exitPrice - position.entryPrice) / position.entryPrice * position.size
      : (position.entryPrice - exitPrice) / position.entryPrice * position.size;

    this.portfolioState.positions.splice(index, 1);
    this.portfolioState.availableCapital += position.size + pnl;
    this.portfolioState.dailyPnL += pnl;
    this.portfolioState.weeklyPnL += pnl;
    this.portfolioState.monthlyPnL += pnl;

    // Update drawdown
    if (pnl < 0) {
      this.portfolioState.currentDrawdown = Math.max(
        this.portfolioState.currentDrawdown,
        -pnl / this.portfolioState.totalCapital
      );
      this.portfolioState.maxDrawdown = Math.max(
        this.portfolioState.maxDrawdown,
        this.portfolioState.currentDrawdown
      );
    }

    return pnl;
  }

  /**
   * Get current guardrail status
   */
  getStatus(): {
    tradingHalted: boolean;
    haltReason?: string;
    portfolioState: PortfolioState;
    pendingHITL: number;
    config: GuardrailConfig;
  } {
    return {
      tradingHalted: this.tradingHalted,
      haltReason: this.haltReason,
      portfolioState: this.portfolioState,
      pendingHITL: this.getPendingHITLRequests().length,
      config: this.config,
    };
  }

  /**
   * Generate guardrail report
   */
  generateReport(): string {
    const status = this.getStatus();
    
    let report = `=== OPERATIONAL GUARDRAILS REPORT ===\n`;
    report += `Trading Status: ${status.tradingHalted ? '🔴 HALTED' : '🟢 ACTIVE'}\n`;
    if (status.haltReason) {
      report += `Halt Reason: ${status.haltReason}\n`;
    }
    report += `\n--- PORTFOLIO STATE ---\n`;
    report += `Total Capital: $${status.portfolioState.totalCapital.toLocaleString()}\n`;
    report += `Available Capital: $${status.portfolioState.availableCapital.toLocaleString()}\n`;
    report += `Open Positions: ${status.portfolioState.positions.length}\n`;
    report += `Daily P&L: $${status.portfolioState.dailyPnL.toLocaleString()}\n`;
    report += `Current Drawdown: ${(status.portfolioState.currentDrawdown * 100).toFixed(2)}%\n`;
    report += `\n--- LIMITS ---\n`;
    report += `Max Risk/Trade: ${status.config.maxRiskPerTrade * 100}%\n`;
    report += `Max Risk/Day: ${status.config.maxRiskPerDay * 100}%\n`;
    report += `HITL Threshold: $${status.config.hitlTradeThreshold.toLocaleString()}\n`;
    report += `\n--- PENDING APPROVALS ---\n`;
    report += `HITL Requests: ${status.pendingHITL}\n`;

    return report;
  }
}
