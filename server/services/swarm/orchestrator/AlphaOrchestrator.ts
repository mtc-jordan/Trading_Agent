/**
 * Alpha Orchestrator Agent (CIO) - Chief Investment Orchestrator
 * 
 * The "Super Brain" of the swarm intelligence system.
 * Manages specialized worker agents, coordinates multi-agent debates,
 * and makes final trading decisions based on consensus.
 * 
 * Implements LangGraph-style coordination with:
 * - Strategic decomposition for multi-asset analysis
 * - Adversarial synthesis for trade validation
 * - Cross-asset validation
 * - Self-correction for stale data
 */

export interface AgentTask {
  id: string;
  type: 'analysis' | 'validation' | 'critique' | 'execution';
  asset: string;
  assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex';
  priority: 'high' | 'medium' | 'low';
  deadline: number; // timestamp
  data: Record<string, unknown>;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  taskId: string;
  timestamp: number;
  isStale: boolean;
  confidence: number; // 0-100
  recommendation: 'buy' | 'sell' | 'hold' | 'avoid';
  reasoning: string[];
  risks: string[];
  data: Record<string, unknown>;
}

export interface OrchestratorDecision {
  id: string;
  timestamp: number;
  asset: string;
  assetClass: string;
  finalRecommendation: 'buy' | 'sell' | 'hold' | 'avoid';
  confidenceScore: number; // 0-100
  consensusReached: boolean;
  agentVotes: {
    agentId: string;
    vote: 'buy' | 'sell' | 'hold' | 'avoid';
    confidence: number;
  }[];
  devilsAdvocateScore: number; // 0-10
  crossAssetValidation: {
    passed: boolean;
    checks: { name: string; passed: boolean; value: number }[];
  };
  riskAssessment: {
    totalRisk: number;
    withinLimits: boolean;
    warnings: string[];
  };
  executionPlan?: {
    orderType: 'market' | 'limit' | 'stealth';
    fragments: number;
    totalSize: number;
    urgency: 'immediate' | 'gradual' | 'patient';
  };
  requiresHumanApproval: boolean;
  reasoning: string[];
}

export interface MarketRegime {
  type: 'risk-on' | 'risk-off' | 'transition';
  confidence: number;
  indicators: {
    vix: number;
    goldUsdCorrelation: number;
    btcNasdaqCorrelation: number;
    yieldCurve: number;
    creditSpreads: number;
  };
  recommendedStrategy: 'momentum' | 'preservation' | 'balanced';
}

export interface PortfolioState {
  totalValue: number;
  cashAvailable: number;
  positions: {
    asset: string;
    assetClass: string;
    size: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
  }[];
  riskMetrics: {
    totalExposure: number;
    maxDrawdown: number;
    sharpeRatio: number;
    correlationMatrix: Record<string, Record<string, number>>;
  };
}

export class AlphaOrchestrator {
  private readonly STALE_DATA_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_SINGLE_TRADE_RISK = 0.02; // 2%
  private readonly MAX_PORTFOLIO_RISK = 0.025; // 2.5%
  private readonly EXECUTION_CONFIDENCE_THRESHOLD = 85;
  private readonly DEVILS_ADVOCATE_VETO_THRESHOLD = 7;
  
  private marketRegime: MarketRegime;
  private portfolioState: PortfolioState;
  private pendingTasks: Map<string, AgentTask>;
  private agentResponses: Map<string, AgentResponse[]>;
  private decisionHistory: OrchestratorDecision[];

  constructor() {
    this.marketRegime = this.initializeMarketRegime();
    this.portfolioState = this.initializePortfolioState();
    this.pendingTasks = new Map();
    this.agentResponses = new Map();
    this.decisionHistory = [];
  }

  private initializeMarketRegime(): MarketRegime {
    return {
      type: 'balanced' as 'risk-on',
      confidence: 50,
      indicators: {
        vix: 20,
        goldUsdCorrelation: -0.3,
        btcNasdaqCorrelation: 0.6,
        yieldCurve: 0.5,
        creditSpreads: 1.5,
      },
      recommendedStrategy: 'balanced',
    };
  }

  private initializePortfolioState(): PortfolioState {
    return {
      totalValue: 1000000,
      cashAvailable: 500000,
      positions: [],
      riskMetrics: {
        totalExposure: 0.5,
        maxDrawdown: 0.05,
        sharpeRatio: 1.5,
        correlationMatrix: {},
      },
    };
  }

  /**
   * Strategic Decomposition
   * Breaks down a trading goal into sub-tasks for specialized agents
   */
  public decomposeTask(goal: string, asset: string, assetClass: 'crypto' | 'stocks' | 'commodities' | 'forex'): AgentTask[] {
    const baseId = `task_${Date.now()}`;
    const deadline = Date.now() + 30000; // 30 second deadline

    const tasks: AgentTask[] = [];

    // Technical Analysis Task
    tasks.push({
      id: `${baseId}_technical`,
      type: 'analysis',
      asset,
      assetClass,
      priority: 'high',
      deadline,
      data: { analysisType: 'technical', indicators: ['RSI', 'MACD', 'BB', 'EMA'] },
    });

    // Fundamental Analysis Task
    tasks.push({
      id: `${baseId}_fundamental`,
      type: 'analysis',
      asset,
      assetClass,
      priority: 'high',
      deadline,
      data: { analysisType: 'fundamental' },
    });

    // Asset-class specific tasks
    if (assetClass === 'crypto') {
      tasks.push({
        id: `${baseId}_onchain`,
        type: 'analysis',
        asset,
        assetClass,
        priority: 'high',
        deadline,
        data: { analysisType: 'onchain', metrics: ['whale_flow', 'exchange_balance', 'nvt'] },
      });
    }

    if (assetClass === 'stocks') {
      tasks.push({
        id: `${baseId}_earnings`,
        type: 'analysis',
        asset,
        assetClass,
        priority: 'medium',
        deadline,
        data: { analysisType: 'earnings', includeGuidance: true },
      });
    }

    // Macro Analysis Task
    tasks.push({
      id: `${baseId}_macro`,
      type: 'analysis',
      asset,
      assetClass,
      priority: 'medium',
      deadline,
      data: { analysisType: 'macro', factors: ['fed_policy', 'geopolitical', 'economic_data'] },
    });

    // Sentiment Analysis Task
    tasks.push({
      id: `${baseId}_sentiment`,
      type: 'analysis',
      asset,
      assetClass,
      priority: 'medium',
      deadline,
      data: { analysisType: 'sentiment', sources: ['social', 'news', 'institutional'] },
    });

    // Volatility Analysis Task
    tasks.push({
      id: `${baseId}_volatility`,
      type: 'analysis',
      asset,
      assetClass,
      priority: 'high',
      deadline,
      data: { analysisType: 'volatility', greeks: ['vanna', 'charm', 'vomma'] },
    });

    // Devil's Advocate Critique Task
    tasks.push({
      id: `${baseId}_critique`,
      type: 'critique',
      asset,
      assetClass,
      priority: 'high',
      deadline,
      data: { critiqueType: 'adversarial' },
    });

    // Validation Task
    tasks.push({
      id: `${baseId}_validation`,
      type: 'validation',
      asset,
      assetClass,
      priority: 'high',
      deadline,
      data: { validationType: 'cross_asset' },
    });

    // Store pending tasks
    for (const task of tasks) {
      this.pendingTasks.set(task.id, task);
    }

    return tasks;
  }

  /**
   * Receive and validate agent response
   */
  public receiveAgentResponse(response: AgentResponse): boolean {
    // Check for stale data
    const dataAge = Date.now() - response.timestamp;
    if (dataAge > this.STALE_DATA_THRESHOLD_MS) {
      response.isStale = true;
      console.warn(`[Orchestrator] Rejecting stale data from ${response.agentName} (${dataAge}ms old)`);
      return false;
    }

    // Store response
    const taskResponses = this.agentResponses.get(response.taskId) || [];
    taskResponses.push(response);
    this.agentResponses.set(response.taskId, taskResponses);

    return true;
  }

  /**
   * Adversarial Synthesis
   * Forces Devil's Advocate critique and validates trade recommendations
   */
  public performAdversarialSynthesis(
    bullishResponses: AgentResponse[],
    bearishResponse: AgentResponse
  ): { approved: boolean; critiqueScore: number; reasoning: string[] } {
    const critiqueScore = bearishResponse.confidence / 10; // Convert to 0-10 scale
    const reasoning: string[] = [];

    // Check if critique score exceeds veto threshold
    if (critiqueScore > this.DEVILS_ADVOCATE_VETO_THRESHOLD) {
      reasoning.push(`Devil's Advocate critique score (${critiqueScore.toFixed(1)}/10) exceeds veto threshold (${this.DEVILS_ADVOCATE_VETO_THRESHOLD}/10)`);
      reasoning.push(...bearishResponse.risks);
      return { approved: false, critiqueScore, reasoning };
    }

    // Analyze bullish vs bearish arguments
    const avgBullishConfidence = bullishResponses.reduce((sum, r) => sum + r.confidence, 0) / bullishResponses.length;
    
    if (avgBullishConfidence < 60) {
      reasoning.push(`Average bullish confidence (${avgBullishConfidence.toFixed(1)}%) is below threshold`);
      return { approved: false, critiqueScore, reasoning };
    }

    reasoning.push(`Trade approved with critique score ${critiqueScore.toFixed(1)}/10`);
    reasoning.push(`Average bullish confidence: ${avgBullishConfidence.toFixed(1)}%`);

    return { approved: true, critiqueScore, reasoning };
  }

  /**
   * Cross-Asset Validation
   * Validates trade against correlated assets
   */
  public performCrossAssetValidation(
    asset: string,
    assetClass: string,
    recommendation: 'buy' | 'sell' | 'hold' | 'avoid'
  ): { passed: boolean; checks: { name: string; passed: boolean; value: number }[] } {
    const checks: { name: string; passed: boolean; value: number }[] = [];

    // VIX Check for stocks
    if (assetClass === 'stocks') {
      const vixCheck = this.marketRegime.indicators.vix < 30;
      checks.push({
        name: 'VIX Level',
        passed: recommendation === 'buy' ? vixCheck : true,
        value: this.marketRegime.indicators.vix,
      });
    }

    // Gold/USD Correlation for crypto
    if (assetClass === 'crypto') {
      const goldCorrelation = Math.abs(this.marketRegime.indicators.goldUsdCorrelation);
      const correlationCheck = goldCorrelation < 0.8;
      checks.push({
        name: 'Gold/USD Correlation',
        passed: correlationCheck,
        value: this.marketRegime.indicators.goldUsdCorrelation,
      });
    }

    // BTC/Nasdaq Correlation
    if (assetClass === 'crypto' || assetClass === 'stocks') {
      const btcNasdaqCorrelation = this.marketRegime.indicators.btcNasdaqCorrelation;
      checks.push({
        name: 'BTC/Nasdaq Correlation',
        passed: true, // Informational
        value: btcNasdaqCorrelation,
      });
    }

    // Yield Curve Check
    const yieldCurveCheck = this.marketRegime.indicators.yieldCurve > -0.5;
    checks.push({
      name: 'Yield Curve',
      passed: yieldCurveCheck,
      value: this.marketRegime.indicators.yieldCurve,
    });

    // Credit Spreads Check
    const creditSpreadsCheck = this.marketRegime.indicators.creditSpreads < 3;
    checks.push({
      name: 'Credit Spreads',
      passed: creditSpreadsCheck,
      value: this.marketRegime.indicators.creditSpreads,
    });

    const allPassed = checks.every(c => c.passed);
    return { passed: allPassed, checks };
  }

  /**
   * Calculate final confidence score from all agent responses
   */
  public calculateConfidenceScore(responses: AgentResponse[]): number {
    if (responses.length === 0) return 0;

    // Weight responses by agent type
    const weights: Record<string, number> = {
      technical: 0.2,
      fundamental: 0.15,
      onchain: 0.15,
      macro: 0.15,
      sentiment: 0.1,
      volatility: 0.15,
      momentum: 0.1,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const response of responses) {
      const agentType = response.agentId.split('_')[0];
      const weight = weights[agentType] || 0.1;
      weightedSum += response.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Assess risk for proposed trade
   */
  public assessRisk(
    asset: string,
    proposedSize: number,
    direction: 'long' | 'short'
  ): { totalRisk: number; withinLimits: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Calculate single trade risk
    const singleTradeRisk = proposedSize / this.portfolioState.totalValue;
    
    if (singleTradeRisk > this.MAX_SINGLE_TRADE_RISK) {
      warnings.push(`Single trade risk (${(singleTradeRisk * 100).toFixed(2)}%) exceeds 2% limit`);
    }

    // Calculate total portfolio risk after trade
    const currentExposure = this.portfolioState.riskMetrics.totalExposure;
    const additionalExposure = proposedSize / this.portfolioState.totalValue;
    const totalRisk = currentExposure + additionalExposure;

    if (totalRisk > this.MAX_PORTFOLIO_RISK) {
      warnings.push(`Total portfolio risk (${(totalRisk * 100).toFixed(2)}%) would exceed 2.5% limit`);
    }

    // Check correlation with existing positions
    const existingPosition = this.portfolioState.positions.find(p => p.asset === asset);
    if (existingPosition) {
      warnings.push(`Already have position in ${asset} (${existingPosition.size} units)`);
    }

    const withinLimits = singleTradeRisk <= this.MAX_SINGLE_TRADE_RISK && 
                         totalRisk <= this.MAX_PORTFOLIO_RISK;

    return { totalRisk, withinLimits, warnings };
  }

  /**
   * Detect current market regime
   */
  public detectMarketRegime(): MarketRegime {
    const { vix, goldUsdCorrelation, btcNasdaqCorrelation, yieldCurve, creditSpreads } = this.marketRegime.indicators;

    let riskScore = 0;

    // VIX scoring
    if (vix < 15) riskScore += 2;
    else if (vix < 20) riskScore += 1;
    else if (vix < 25) riskScore += 0;
    else if (vix < 30) riskScore -= 1;
    else riskScore -= 2;

    // Yield curve scoring
    if (yieldCurve > 1) riskScore += 1;
    else if (yieldCurve > 0) riskScore += 0;
    else riskScore -= 1;

    // Credit spreads scoring
    if (creditSpreads < 1.5) riskScore += 1;
    else if (creditSpreads < 2.5) riskScore += 0;
    else riskScore -= 1;

    // Determine regime
    let type: 'risk-on' | 'risk-off' | 'transition';
    let recommendedStrategy: 'momentum' | 'preservation' | 'balanced';

    if (riskScore >= 2) {
      type = 'risk-on';
      recommendedStrategy = 'momentum';
    } else if (riskScore <= -2) {
      type = 'risk-off';
      recommendedStrategy = 'preservation';
    } else {
      type = 'transition';
      recommendedStrategy = 'balanced';
    }

    const confidence = Math.min(100, Math.abs(riskScore) * 25 + 50);

    this.marketRegime = {
      type,
      confidence,
      indicators: this.marketRegime.indicators,
      recommendedStrategy,
    };

    return this.marketRegime;
  }

  /**
   * Create execution plan for approved trade
   */
  public createExecutionPlan(
    asset: string,
    size: number,
    urgency: 'immediate' | 'gradual' | 'patient'
  ): { orderType: 'market' | 'limit' | 'stealth'; fragments: number; totalSize: number; urgency: 'immediate' | 'gradual' | 'patient' } {
    // Determine order type based on size and urgency
    let orderType: 'market' | 'limit' | 'stealth';
    let fragments: number;

    if (size > 100000) {
      // Large order - use stealth execution
      orderType = 'stealth';
      fragments = Math.ceil(size / 10000); // Fragment into $10k chunks
    } else if (urgency === 'immediate') {
      orderType = 'market';
      fragments = 1;
    } else {
      orderType = 'limit';
      fragments = urgency === 'patient' ? Math.ceil(size / 25000) : 1;
    }

    return {
      orderType,
      fragments,
      totalSize: size,
      urgency,
    };
  }

  /**
   * Make final orchestrator decision
   */
  public makeDecision(
    asset: string,
    assetClass: string,
    agentResponses: AgentResponse[],
    devilsAdvocateResponse: AgentResponse,
    proposedSize: number
  ): OrchestratorDecision {
    const decisionId = `decision_${Date.now()}`;
    
    // Separate bullish and bearish responses
    const bullishResponses = agentResponses.filter(r => r.recommendation === 'buy');
    const bearishResponses = agentResponses.filter(r => r.recommendation === 'sell' || r.recommendation === 'avoid');

    // Perform adversarial synthesis
    const adversarialResult = this.performAdversarialSynthesis(bullishResponses, devilsAdvocateResponse);

    // Perform cross-asset validation
    const crossAssetResult = this.performCrossAssetValidation(
      asset,
      assetClass,
      bullishResponses.length > bearishResponses.length ? 'buy' : 'sell'
    );

    // Assess risk
    const riskAssessment = this.assessRisk(asset, proposedSize, 'long');

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(agentResponses);

    // Determine final recommendation
    let finalRecommendation: 'buy' | 'sell' | 'hold' | 'avoid';
    let consensusReached = false;
    const reasoning: string[] = [];

    if (!adversarialResult.approved) {
      finalRecommendation = 'avoid';
      reasoning.push('Trade vetoed by Devil\'s Advocate');
      reasoning.push(...adversarialResult.reasoning);
    } else if (!crossAssetResult.passed) {
      finalRecommendation = 'hold';
      reasoning.push('Cross-asset validation failed');
      const failedChecks = crossAssetResult.checks.filter(c => !c.passed);
      reasoning.push(...failedChecks.map(c => `${c.name}: ${c.value}`));
    } else if (!riskAssessment.withinLimits) {
      finalRecommendation = 'hold';
      reasoning.push('Risk limits exceeded');
      reasoning.push(...riskAssessment.warnings);
    } else if (confidenceScore >= this.EXECUTION_CONFIDENCE_THRESHOLD) {
      // Determine buy/sell based on majority vote
      const buyVotes = agentResponses.filter(r => r.recommendation === 'buy').length;
      const sellVotes = agentResponses.filter(r => r.recommendation === 'sell').length;
      
      if (buyVotes > sellVotes) {
        finalRecommendation = 'buy';
        consensusReached = true;
        reasoning.push(`Consensus reached: ${buyVotes} buy vs ${sellVotes} sell`);
      } else if (sellVotes > buyVotes) {
        finalRecommendation = 'sell';
        consensusReached = true;
        reasoning.push(`Consensus reached: ${sellVotes} sell vs ${buyVotes} buy`);
      } else {
        finalRecommendation = 'hold';
        reasoning.push('No clear consensus between agents');
      }
    } else {
      finalRecommendation = 'hold';
      reasoning.push(`Confidence score (${confidenceScore.toFixed(1)}%) below threshold (${this.EXECUTION_CONFIDENCE_THRESHOLD}%)`);
    }

    // Create execution plan if approved
    let executionPlan;
    if (finalRecommendation === 'buy' || finalRecommendation === 'sell') {
      executionPlan = this.createExecutionPlan(
        asset,
        proposedSize,
        confidenceScore > 95 ? 'immediate' : confidenceScore > 90 ? 'gradual' : 'patient'
      );
    }

    // Determine if human approval is required
    const requiresHumanApproval = proposedSize > 50000 || confidenceScore < 90;

    const decision: OrchestratorDecision = {
      id: decisionId,
      timestamp: Date.now(),
      asset,
      assetClass,
      finalRecommendation,
      confidenceScore,
      consensusReached,
      agentVotes: agentResponses.map(r => ({
        agentId: r.agentId,
        vote: r.recommendation,
        confidence: r.confidence,
      })),
      devilsAdvocateScore: adversarialResult.critiqueScore,
      crossAssetValidation: crossAssetResult,
      riskAssessment,
      executionPlan,
      requiresHumanApproval,
      reasoning,
    };

    // Store decision in history
    this.decisionHistory.push(decision);

    return decision;
  }

  /**
   * Update market regime indicators
   */
  public updateMarketIndicators(indicators: Partial<MarketRegime['indicators']>): void {
    this.marketRegime.indicators = {
      ...this.marketRegime.indicators,
      ...indicators,
    };
    this.detectMarketRegime();
  }

  /**
   * Update portfolio state
   */
  public updatePortfolioState(state: Partial<PortfolioState>): void {
    this.portfolioState = {
      ...this.portfolioState,
      ...state,
    };
  }

  /**
   * Get current market regime
   */
  public getMarketRegime(): MarketRegime {
    return this.marketRegime;
  }

  /**
   * Get portfolio state
   */
  public getPortfolioState(): PortfolioState {
    return this.portfolioState;
  }

  /**
   * Get decision history
   */
  public getDecisionHistory(): OrchestratorDecision[] {
    return this.decisionHistory;
  }

  /**
   * Generate orchestrator status report
   */
  public generateStatusReport(): {
    marketRegime: MarketRegime;
    portfolioState: PortfolioState;
    pendingTasks: number;
    recentDecisions: OrchestratorDecision[];
    systemHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const recentDecisions = this.decisionHistory.slice(-10);
    
    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    const recentLosses = recentDecisions.filter(d => 
      d.finalRecommendation === 'avoid' || !d.consensusReached
    ).length;

    if (recentLosses > 7) {
      systemHealth = 'critical';
    } else if (recentLosses > 4) {
      systemHealth = 'degraded';
    }

    return {
      marketRegime: this.marketRegime,
      portfolioState: this.portfolioState,
      pendingTasks: this.pendingTasks.size,
      recentDecisions,
      systemHealth,
    };
  }
}
