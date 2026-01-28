import { AgentSignal, SignalStrength, RiskLevel } from "./SpecializedTradingAgents";

export interface PortfolioPosition { symbol: string; assetClass: "stock" | "crypto" | "commodity" | "options" | "forex"; quantity: number; currentPrice: number; avgCost: number; weight: number; volatility: number; beta: number; }

export interface OptionsMarketData { symbol: string; atmIV: number; otmPutIV: number; otmCallIV: number; ivSkew: number; putCallRatio: number; vix: number; }

export interface CorrelationMatrix { assets: string[]; matrix: number[][]; avgCorrelation: number; maxCorrelation: number; correlationConvergence: boolean; }

export interface VaRResult { var95: number; var99: number; expectedShortfall: number; maxDrawdown: number; timeHorizon: string; }

export interface KillSwitchStatus { isTriggered: boolean; triggerReason: string; severity: "warning" | "critical" | "emergency"; recommendedAction: string; exposureReduction: number; affectedAssets: string[]; }

export interface RiskMetrics { portfolioVaR: VaRResult; ivSkewAlert: boolean; correlationAlert: boolean; overallRiskScore: number; killSwitchStatus: KillSwitchStatus; }

export class KillSwitchAgent {
  private name = "KillSwitch";
  private varThreshold95 = 0.05;
  private varThreshold99 = 0.10;
  private ivSkewThreshold = 0.15;
  private correlationConvergenceThreshold = 0.8;
  private vixPanicLevel = 30;
  calculateVaR(positions: PortfolioPosition[], confidenceLevel: number = 0.95, timeHorizon: number = 1): VaRResult {
    if (positions.length === 0) return { var95: 0, var99: 0, expectedShortfall: 0, maxDrawdown: 0, timeHorizon: timeHorizon + " day(s)" };
    const portfolioValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
    const weightedVolatility = positions.reduce((sum, p) => sum + p.weight * p.volatility, 0);
    const var95 = portfolioValue * weightedVolatility * 1.645 * Math.sqrt(timeHorizon);
    const var99 = portfolioValue * weightedVolatility * 2.326 * Math.sqrt(timeHorizon);
    return { var95, var99, expectedShortfall: var99 * 1.2, maxDrawdown: var99 * 1.5, timeHorizon: timeHorizon + " day(s)" };
  }
  analyzeIVSkew(optionsData: OptionsMarketData[]): { skewAlert: boolean; avgSkew: number; fearLevel: number } {
    if (optionsData.length === 0) return { skewAlert: false, avgSkew: 0, fearLevel: 0 };
    const avgSkew = optionsData.reduce((sum, o) => sum + o.ivSkew, 0) / optionsData.length;
    const avgVix = optionsData.reduce((sum, o) => sum + o.vix, 0) / optionsData.length;
    const skewAlert = avgSkew > this.ivSkewThreshold || avgVix > this.vixPanicLevel;
    const fearLevel = Math.min(1, avgSkew / 0.3 + avgVix / 50);
    return { skewAlert, avgSkew, fearLevel };
  }
  async analyze(positions: PortfolioPosition[], optionsData: OptionsMarketData[], returns: Map<string, number[]>): Promise<{ signal: AgentSignal; metrics: RiskMetrics }> {
    const portfolioValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
    const varResult = this.calculateVaR(positions, 0.95, 1);
    const ivAnalysis = this.analyzeIVSkew(optionsData);
    const overallRiskScore = Math.min(1, (varResult.var99 / portfolioValue) / 0.15) * 0.4 + ivAnalysis.fearLevel * 0.35;
    const killSwitchStatus: KillSwitchStatus = { isTriggered: overallRiskScore > 0.7, triggerReason: overallRiskScore > 0.7 ? "High risk detected" : "None", severity: overallRiskScore > 0.8 ? "emergency" : overallRiskScore > 0.6 ? "critical" : "warning", recommendedAction: overallRiskScore > 0.7 ? "Reduce exposure" : "Normal operations", exposureReduction: overallRiskScore > 0.7 ? 0.3 : 0, affectedAssets: [] };
    const metrics: RiskMetrics = { portfolioVaR: varResult, ivSkewAlert: ivAnalysis.skewAlert, correlationAlert: false, overallRiskScore, killSwitchStatus };
    const signal: SignalStrength = killSwitchStatus.severity === "emergency" ? "strong_sell" : killSwitchStatus.severity === "critical" ? "sell" : "hold";
    const riskLevel: RiskLevel = overallRiskScore > 0.7 ? "extreme" : overallRiskScore > 0.5 ? "high" : overallRiskScore > 0.3 ? "medium" : "low";
    return { signal: { agent: this.name, assetClass: "portfolio", signal, confidence: 0.8, reasoning: killSwitchStatus.isTriggered ? "KILL-SWITCH: " + killSwitchStatus.triggerReason : "Risk normal", indicators: { var95: varResult.var95, var99: varResult.var99, ivSkew: ivAnalysis.avgSkew, fearLevel: ivAnalysis.fearLevel, overallRiskScore }, timestamp: new Date(), targetAssets: [], riskLevel }, metrics };
  }
}

export const createKillSwitchAgent = () => new KillSwitchAgent();
