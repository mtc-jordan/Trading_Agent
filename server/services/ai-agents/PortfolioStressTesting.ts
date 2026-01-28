/**
 * Portfolio Stress Testing Suite
 * 
 * Implements Monte Carlo simulations and historical crisis scenarios
 * (2008, COVID crash) to stress test portfolios.
 */

// Types
export type CrisisScenario = 
  | 'financial_crisis_2008'
  | 'covid_crash_2020'
  | 'dot_com_bubble_2000'
  | 'black_monday_1987'
  | 'flash_crash_2010'
  | 'european_debt_2011'
  | 'china_crash_2015'
  | 'volmageddon_2018'
  | 'custom';

export type StressTestType = 'monte_carlo' | 'historical' | 'sensitivity' | 'var';

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  weight: number;
  assetClass: string;
  beta: number;
  volatility: number;
}

export interface CrisisScenarioConfig {
  id: CrisisScenario;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  peakToTrough: number;
  recoveryDays: number;
  assetImpacts: Record<string, number>;
  characteristics: string[];
}

export interface MonteCarloConfig {
  simulations: number;
  timeHorizon: number; // days
  confidenceLevel: number;
  volatilityMultiplier: number;
  correlationMatrix?: number[][];
}

export interface StressTestResult {
  id: string;
  type: StressTestType;
  timestamp: number;
  portfolio: PortfolioHolding[];
  portfolioValue: number;
  
  // Results
  expectedLoss: number;
  expectedLossPercent: number;
  worstCase: number;
  worstCasePercent: number;
  bestCase: number;
  bestCasePercent: number;
  
  // Risk metrics
  valueAtRisk: number;
  conditionalVaR: number;
  maxDrawdown: number;
  recoveryTime: number;
  
  // Distribution
  distribution: Array<{
    percentile: number;
    value: number;
    loss: number;
  }>;
  
  // Asset breakdown
  assetImpacts: Array<{
    symbol: string;
    currentValue: number;
    stressedValue: number;
    loss: number;
    lossPercent: number;
    contribution: number;
  }>;
  
  // Scenario-specific
  scenario?: CrisisScenario;
  scenarioName?: string;
  
  // Recommendations
  recommendations: string[];
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface SensitivityAnalysis {
  factor: string;
  baseValue: number;
  impacts: Array<{
    change: number;
    portfolioChange: number;
    portfolioValue: number;
  }>;
}

// Historical crisis scenarios
export const CRISIS_SCENARIOS: Record<CrisisScenario, CrisisScenarioConfig> = {
  financial_crisis_2008: {
    id: 'financial_crisis_2008',
    name: '2008 Financial Crisis',
    description: 'Global financial crisis triggered by subprime mortgage collapse',
    startDate: '2008-09-15',
    endDate: '2009-03-09',
    peakToTrough: -56.8,
    recoveryDays: 1400,
    assetImpacts: {
      stock: -0.55,
      bond: 0.05,
      gold: 0.25,
      crypto: -0.80,
      real_estate: -0.35,
      commodity: -0.40,
    },
    characteristics: [
      'Credit market freeze',
      'Bank failures',
      'Housing market collapse',
      'Global contagion',
    ],
  },
  covid_crash_2020: {
    id: 'covid_crash_2020',
    name: 'COVID-19 Crash',
    description: 'Market crash due to global pandemic',
    startDate: '2020-02-19',
    endDate: '2020-03-23',
    peakToTrough: -33.9,
    recoveryDays: 148,
    assetImpacts: {
      stock: -0.35,
      bond: 0.08,
      gold: 0.10,
      crypto: -0.50,
      real_estate: -0.15,
      commodity: -0.60,
    },
    characteristics: [
      'Rapid decline',
      'V-shaped recovery',
      'Unprecedented stimulus',
      'Sector divergence',
    ],
  },
  dot_com_bubble_2000: {
    id: 'dot_com_bubble_2000',
    name: 'Dot-Com Bubble',
    description: 'Technology stock bubble burst',
    startDate: '2000-03-10',
    endDate: '2002-10-09',
    peakToTrough: -78.0,
    recoveryDays: 5000,
    assetImpacts: {
      stock: -0.50,
      tech_stock: -0.78,
      bond: 0.15,
      gold: 0.05,
      crypto: -0.90,
      real_estate: 0.10,
      commodity: -0.10,
    },
    characteristics: [
      'Tech sector devastation',
      'Prolonged bear market',
      'Value rotation',
      'IPO collapse',
    ],
  },
  black_monday_1987: {
    id: 'black_monday_1987',
    name: 'Black Monday 1987',
    description: 'Single-day market crash',
    startDate: '1987-10-19',
    endDate: '1987-10-19',
    peakToTrough: -22.6,
    recoveryDays: 450,
    assetImpacts: {
      stock: -0.23,
      bond: 0.03,
      gold: 0.02,
      crypto: -0.30,
      real_estate: -0.05,
      commodity: -0.10,
    },
    characteristics: [
      'Single-day crash',
      'Program trading',
      'Global contagion',
      'Quick recovery',
    ],
  },
  flash_crash_2010: {
    id: 'flash_crash_2010',
    name: 'Flash Crash 2010',
    description: 'Rapid intraday market crash',
    startDate: '2010-05-06',
    endDate: '2010-05-06',
    peakToTrough: -9.2,
    recoveryDays: 1,
    assetImpacts: {
      stock: -0.09,
      bond: 0.01,
      gold: 0.01,
      crypto: -0.15,
      real_estate: 0,
      commodity: -0.05,
    },
    characteristics: [
      'Algorithmic trading',
      'Liquidity crisis',
      'Rapid recovery',
      'Market structure issues',
    ],
  },
  european_debt_2011: {
    id: 'european_debt_2011',
    name: 'European Debt Crisis',
    description: 'Sovereign debt crisis in Europe',
    startDate: '2011-07-22',
    endDate: '2011-10-03',
    peakToTrough: -19.4,
    recoveryDays: 180,
    assetImpacts: {
      stock: -0.20,
      bond: -0.05,
      gold: 0.15,
      crypto: -0.40,
      real_estate: -0.10,
      commodity: -0.15,
    },
    characteristics: [
      'Sovereign debt concerns',
      'Banking stress',
      'Currency volatility',
      'Flight to safety',
    ],
  },
  china_crash_2015: {
    id: 'china_crash_2015',
    name: 'China Stock Crash 2015',
    description: 'Chinese stock market bubble burst',
    startDate: '2015-06-12',
    endDate: '2016-02-11',
    peakToTrough: -49.0,
    recoveryDays: 800,
    assetImpacts: {
      stock: -0.15,
      emerging_stock: -0.35,
      bond: 0.05,
      gold: 0.08,
      crypto: -0.25,
      commodity: -0.30,
    },
    characteristics: [
      'Emerging market contagion',
      'Currency devaluation',
      'Commodity collapse',
      'Global growth fears',
    ],
  },
  volmageddon_2018: {
    id: 'volmageddon_2018',
    name: 'Volmageddon 2018',
    description: 'Volatility spike causing short vol strategies to collapse',
    startDate: '2018-02-02',
    endDate: '2018-02-09',
    peakToTrough: -10.2,
    recoveryDays: 60,
    assetImpacts: {
      stock: -0.10,
      bond: 0.02,
      gold: 0.01,
      crypto: -0.20,
      volatility: 1.15,
      commodity: -0.05,
    },
    characteristics: [
      'Volatility spike',
      'Short vol blowup',
      'Algorithmic selling',
      'Quick recovery',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom Scenario',
    description: 'User-defined stress scenario',
    startDate: '',
    endDate: '',
    peakToTrough: 0,
    recoveryDays: 0,
    assetImpacts: {},
    characteristics: [],
  },
};

// Monte Carlo simulation
export function runMonteCarloSimulation(
  portfolio: PortfolioHolding[],
  config: MonteCarloConfig
): StressTestResult {
  const portfolioValue = portfolio.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  const simulations: number[] = [];
  
  // Run simulations
  for (let i = 0; i < config.simulations; i++) {
    let simulatedValue = portfolioValue;
    
    // Simulate each day
    for (let day = 0; day < config.timeHorizon; day++) {
      portfolio.forEach(holding => {
        const dailyReturn = generateRandomReturn(
          holding.volatility * config.volatilityMultiplier,
          0.0001 // Small positive drift
        );
        simulatedValue += simulatedValue * (holding.weight / 100) * dailyReturn;
      });
    }
    
    simulations.push(simulatedValue);
  }
  
  // Sort simulations
  simulations.sort((a, b) => a - b);
  
  // Calculate statistics
  const mean = simulations.reduce((a, b) => a + b, 0) / simulations.length;
  const worstCase = simulations[0];
  const bestCase = simulations[simulations.length - 1];
  
  // VaR at confidence level
  const varIndex = Math.floor((1 - config.confidenceLevel) * config.simulations);
  const valueAtRisk = portfolioValue - simulations[varIndex];
  
  // Conditional VaR (Expected Shortfall)
  const tailSimulations = simulations.slice(0, varIndex);
  const conditionalVaR = portfolioValue - (tailSimulations.reduce((a, b) => a + b, 0) / tailSimulations.length);
  
  // Distribution percentiles
  const distribution = [1, 5, 10, 25, 50, 75, 90, 95, 99].map(p => {
    const index = Math.floor((p / 100) * config.simulations);
    const value = simulations[index];
    return {
      percentile: p,
      value,
      loss: portfolioValue - value,
    };
  });
  
  // Asset impacts
  const assetImpacts = portfolio.map(holding => {
    const holdingValue = holding.quantity * holding.currentPrice;
    const expectedLoss = holdingValue * (1 - mean / portfolioValue);
    return {
      symbol: holding.symbol,
      currentValue: holdingValue,
      stressedValue: holdingValue - expectedLoss,
      loss: expectedLoss,
      lossPercent: (expectedLoss / holdingValue) * 100,
      contribution: (expectedLoss / (portfolioValue - mean)) * 100,
    };
  });
  
  // Determine risk level
  const lossPercent = ((portfolioValue - mean) / portfolioValue) * 100;
  let riskLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
  if (lossPercent > 30) riskLevel = 'extreme';
  else if (lossPercent > 20) riskLevel = 'high';
  else if (lossPercent > 10) riskLevel = 'moderate';
  
  // Generate recommendations
  const recommendations = generateRecommendations(portfolio, lossPercent, assetImpacts);
  
  return {
    id: `mc_${Date.now()}`,
    type: 'monte_carlo',
    timestamp: Date.now(),
    portfolio,
    portfolioValue,
    expectedLoss: portfolioValue - mean,
    expectedLossPercent: lossPercent,
    worstCase,
    worstCasePercent: ((portfolioValue - worstCase) / portfolioValue) * 100,
    bestCase,
    bestCasePercent: ((bestCase - portfolioValue) / portfolioValue) * 100,
    valueAtRisk,
    conditionalVaR,
    maxDrawdown: ((portfolioValue - worstCase) / portfolioValue) * 100,
    recoveryTime: Math.ceil(config.timeHorizon * (lossPercent / 10)),
    distribution,
    assetImpacts,
    recommendations,
    riskLevel,
  };
}

// Historical scenario stress test
export function runHistoricalScenario(
  portfolio: PortfolioHolding[],
  scenario: CrisisScenario
): StressTestResult {
  const config = CRISIS_SCENARIOS[scenario];
  const portfolioValue = portfolio.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  
  // Apply scenario impacts to each holding
  const assetImpacts = portfolio.map(holding => {
    const holdingValue = holding.quantity * holding.currentPrice;
    const impact = config.assetImpacts[holding.assetClass] || config.assetImpacts['stock'] || -0.30;
    const stressedValue = holdingValue * (1 + impact);
    const loss = holdingValue - stressedValue;
    
    return {
      symbol: holding.symbol,
      currentValue: holdingValue,
      stressedValue,
      loss,
      lossPercent: (loss / holdingValue) * 100,
      contribution: 0, // Will be calculated after
    };
  });
  
  // Calculate total loss and contributions
  const totalLoss = assetImpacts.reduce((sum, a) => sum + a.loss, 0);
  assetImpacts.forEach(a => {
    a.contribution = totalLoss > 0 ? (a.loss / totalLoss) * 100 : 0;
  });
  
  const stressedPortfolioValue = portfolioValue - totalLoss;
  const lossPercent = (totalLoss / portfolioValue) * 100;
  
  // Distribution based on scenario
  const distribution = [1, 5, 10, 25, 50, 75, 90, 95, 99].map(p => {
    const factor = 1 - (p / 100) * (totalLoss / portfolioValue);
    const value = portfolioValue * factor;
    return {
      percentile: p,
      value,
      loss: portfolioValue - value,
    };
  });
  
  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
  if (lossPercent > 40) riskLevel = 'extreme';
  else if (lossPercent > 25) riskLevel = 'high';
  else if (lossPercent > 15) riskLevel = 'moderate';
  
  // Generate recommendations
  const recommendations = generateRecommendations(portfolio, lossPercent, assetImpacts);
  
  return {
    id: `hist_${Date.now()}`,
    type: 'historical',
    timestamp: Date.now(),
    portfolio,
    portfolioValue,
    expectedLoss: totalLoss,
    expectedLossPercent: lossPercent,
    worstCase: stressedPortfolioValue * 0.85,
    worstCasePercent: lossPercent + 15,
    bestCase: stressedPortfolioValue * 1.1,
    bestCasePercent: Math.max(0, lossPercent - 10),
    valueAtRisk: totalLoss * 0.95,
    conditionalVaR: totalLoss * 1.2,
    maxDrawdown: Math.abs(config.peakToTrough),
    recoveryTime: config.recoveryDays,
    distribution,
    assetImpacts,
    scenario,
    scenarioName: config.name,
    recommendations,
    riskLevel,
  };
}

// Sensitivity analysis
export function runSensitivityAnalysis(
  portfolio: PortfolioHolding[],
  factors: string[]
): SensitivityAnalysis[] {
  const portfolioValue = portfolio.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  
  return factors.map(factor => {
    const changes = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    
    const impacts = changes.map(change => {
      let portfolioChange = 0;
      
      switch (factor) {
        case 'market':
          portfolioChange = change * 1.0;
          break;
        case 'interest_rate':
          // Bonds inversely related, stocks slightly negative
          portfolioChange = portfolio.reduce((sum, h) => {
            if (h.assetClass === 'bond') return sum - change * 0.5 * (h.weight / 100);
            if (h.assetClass === 'stock') return sum - change * 0.1 * (h.weight / 100);
            return sum;
          }, 0);
          break;
        case 'volatility':
          portfolioChange = change * -0.3;
          break;
        case 'currency':
          portfolioChange = change * 0.2;
          break;
        case 'inflation':
          portfolioChange = portfolio.reduce((sum, h) => {
            if (h.assetClass === 'commodity') return sum + change * 0.3 * (h.weight / 100);
            if (h.assetClass === 'bond') return sum - change * 0.4 * (h.weight / 100);
            return sum - change * 0.1 * (h.weight / 100);
          }, 0);
          break;
        default:
          portfolioChange = change * 0.5;
      }
      
      return {
        change,
        portfolioChange,
        portfolioValue: portfolioValue * (1 + portfolioChange / 100),
      };
    });
    
    return {
      factor,
      baseValue: portfolioValue,
      impacts,
    };
  });
}

// Value at Risk calculation
export function calculateVaR(
  portfolio: PortfolioHolding[],
  confidenceLevel: number = 0.95,
  timeHorizon: number = 1
): { var: number; varPercent: number; method: string } {
  const portfolioValue = portfolio.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  
  // Parametric VaR using portfolio volatility
  const portfolioVolatility = Math.sqrt(
    portfolio.reduce((sum, h) => sum + Math.pow(h.volatility * h.weight / 100, 2), 0)
  );
  
  // Z-score for confidence level
  const zScore = confidenceLevel === 0.99 ? 2.33 : confidenceLevel === 0.95 ? 1.65 : 1.28;
  
  const varAmount = portfolioValue * portfolioVolatility * zScore * Math.sqrt(timeHorizon / 252);
  
  return {
    var: varAmount,
    varPercent: (varAmount / portfolioValue) * 100,
    method: 'parametric',
  };
}

// Helper functions
function generateRandomReturn(volatility: number, drift: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return drift + volatility * z / Math.sqrt(252);
}

function generateRecommendations(
  portfolio: PortfolioHolding[],
  lossPercent: number,
  assetImpacts: Array<{ symbol: string; lossPercent: number; contribution: number }>
): string[] {
  const recommendations: string[] = [];
  
  // Check concentration
  const topContributor = assetImpacts.reduce((max, a) => a.contribution > max.contribution ? a : max);
  if (topContributor.contribution > 30) {
    recommendations.push(`Consider reducing exposure to ${topContributor.symbol} (${topContributor.contribution.toFixed(1)}% of risk)`);
  }
  
  // Check diversification
  const assetClasses = new Set(portfolio.map(h => h.assetClass));
  if (assetClasses.size < 3) {
    recommendations.push('Increase diversification across asset classes to reduce concentration risk');
  }
  
  // Check for hedging
  const hasDefensive = portfolio.some(h => h.assetClass === 'bond' || h.assetClass === 'gold');
  if (!hasDefensive && lossPercent > 15) {
    recommendations.push('Consider adding defensive assets (bonds, gold) to hedge downside risk');
  }
  
  // Check beta
  const avgBeta = portfolio.reduce((sum, h) => sum + h.beta * h.weight / 100, 0);
  if (avgBeta > 1.2) {
    recommendations.push(`Portfolio beta (${avgBeta.toFixed(2)}) is high. Consider lower-beta positions`);
  }
  
  // Check volatility
  const highVolAssets = portfolio.filter(h => h.volatility > 0.4);
  if (highVolAssets.length > portfolio.length / 2) {
    recommendations.push('High proportion of volatile assets. Consider rebalancing to lower volatility');
  }
  
  // Risk level specific
  if (lossPercent > 30) {
    recommendations.push('CRITICAL: Portfolio shows extreme stress vulnerability. Immediate risk reduction recommended');
  } else if (lossPercent > 20) {
    recommendations.push('Portfolio shows significant stress vulnerability. Review position sizing');
  }
  
  return recommendations;
}

// Get sample portfolio for testing
export function getSamplePortfolio(): PortfolioHolding[] {
  return [
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, currentPrice: 180, weight: 25, assetClass: 'stock', beta: 1.2, volatility: 0.28 },
    { symbol: 'MSFT', name: 'Microsoft', quantity: 30, currentPrice: 370, weight: 30, assetClass: 'stock', beta: 1.1, volatility: 0.25 },
    { symbol: 'GOOGL', name: 'Alphabet', quantity: 10, currentPrice: 140, weight: 10, assetClass: 'stock', beta: 1.15, volatility: 0.30 },
    { symbol: 'BND', name: 'Bond ETF', quantity: 100, currentPrice: 75, weight: 20, assetClass: 'bond', beta: 0.1, volatility: 0.05 },
    { symbol: 'GLD', name: 'Gold ETF', quantity: 25, currentPrice: 180, weight: 15, assetClass: 'gold', beta: 0.0, volatility: 0.15 },
  ];
}

// Get available crisis scenarios
export function getAvailableScenarios(): CrisisScenarioConfig[] {
  return Object.values(CRISIS_SCENARIOS).filter(s => s.id !== 'custom');
}

// Compare multiple stress test results
export function compareStressTests(results: StressTestResult[]): {
  comparison: Array<{
    id: string;
    type: string;
    scenario?: string;
    expectedLoss: number;
    worstCase: number;
    riskLevel: string;
  }>;
  summary: {
    averageLoss: number;
    maxLoss: number;
    minLoss: number;
    mostVulnerableScenario: string;
  };
} {
  const comparison = results.map(r => ({
    id: r.id,
    type: r.type,
    scenario: r.scenarioName,
    expectedLoss: r.expectedLossPercent,
    worstCase: r.worstCasePercent,
    riskLevel: r.riskLevel,
  }));
  
  const losses = results.map(r => r.expectedLossPercent);
  const maxLossResult = results.reduce((max, r) => r.expectedLossPercent > max.expectedLossPercent ? r : max);
  
  return {
    comparison,
    summary: {
      averageLoss: losses.reduce((a, b) => a + b, 0) / losses.length,
      maxLoss: Math.max(...losses),
      minLoss: Math.min(...losses),
      mostVulnerableScenario: maxLossResult.scenarioName || 'Monte Carlo',
    },
  };
}
