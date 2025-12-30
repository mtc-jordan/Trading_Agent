import { describe, it, expect, beforeEach } from 'vitest';
import {
  runMonteCarloSimulation,
  runHistoricalScenario,
  runSensitivityAnalysis,
  calculateVaR,
  getSamplePortfolio,
  getAvailableScenarios,
  compareStressTests,
  CRISIS_SCENARIOS,
  type PortfolioHolding,
  type MonteCarloConfig,
} from './PortfolioStressTesting';

describe('PortfolioStressTesting', () => {
  let samplePortfolio: PortfolioHolding[];

  beforeEach(() => {
    samplePortfolio = getSamplePortfolio();
  });

  describe('getSamplePortfolio', () => {
    it('should return a valid portfolio', () => {
      const portfolio = getSamplePortfolio();
      expect(Array.isArray(portfolio)).toBe(true);
      expect(portfolio.length).toBeGreaterThan(0);
    });

    it('should have required holding properties', () => {
      const portfolio = getSamplePortfolio();
      portfolio.forEach(holding => {
        expect(holding.symbol).toBeDefined();
        expect(holding.name).toBeDefined();
        expect(holding.quantity).toBeGreaterThan(0);
        expect(holding.currentPrice).toBeGreaterThan(0);
        expect(holding.weight).toBeGreaterThan(0);
        expect(holding.assetClass).toBeDefined();
        expect(holding.beta).toBeDefined();
        expect(holding.volatility).toBeGreaterThan(0);
      });
    });

    it('should have weights that sum to approximately 100', () => {
      const portfolio = getSamplePortfolio();
      const totalWeight = portfolio.reduce((sum, h) => sum + h.weight, 0);
      expect(totalWeight).toBeCloseTo(100, 0);
    });
  });

  describe('runMonteCarloSimulation', () => {
    const config: MonteCarloConfig = {
      simulations: 100,
      timeHorizon: 30,
      confidenceLevel: 0.95,
      volatilityMultiplier: 1.0,
    };

    it('should return valid stress test result', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result).toBeDefined();
      expect(result.type).toBe('monte_carlo');
      expect(result.timestamp).toBeDefined();
    });

    it('should calculate expected loss', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result.expectedLoss).toBeDefined();
      expect(result.expectedLossPercent).toBeDefined();
      expect(typeof result.expectedLoss).toBe('number');
    });

    it('should calculate VaR', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result.valueAtRisk).toBeDefined();
      expect(result.valueAtRisk).toBeGreaterThan(0);
    });

    it('should calculate conditional VaR', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result.conditionalVaR).toBeDefined();
      expect(result.conditionalVaR).toBeGreaterThanOrEqual(result.valueAtRisk);
    });

    it('should generate distribution percentiles', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result.distribution).toBeDefined();
      expect(Array.isArray(result.distribution)).toBe(true);
      expect(result.distribution.length).toBeGreaterThan(0);
    });

    it('should calculate asset impacts', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result.assetImpacts).toBeDefined();
      expect(result.assetImpacts.length).toBe(samplePortfolio.length);
    });

    it('should generate recommendations', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should assign risk level', () => {
      const result = runMonteCarloSimulation(samplePortfolio, config);
      expect(['low', 'moderate', 'high', 'extreme']).toContain(result.riskLevel);
    });

    it('should handle different simulation counts', () => {
      const smallConfig = { ...config, simulations: 50 };
      const largeConfig = { ...config, simulations: 500 };
      
      const smallResult = runMonteCarloSimulation(samplePortfolio, smallConfig);
      const largeResult = runMonteCarloSimulation(samplePortfolio, largeConfig);
      
      expect(smallResult).toBeDefined();
      expect(largeResult).toBeDefined();
    });
  });

  describe('runHistoricalScenario', () => {
    it('should run 2008 financial crisis scenario', () => {
      const result = runHistoricalScenario(samplePortfolio, 'financial_crisis_2008');
      expect(result).toBeDefined();
      expect(result.type).toBe('historical');
      expect(result.scenario).toBe('financial_crisis_2008');
      expect(result.scenarioName).toBe('2008 Financial Crisis');
    });

    it('should run COVID crash scenario', () => {
      const result = runHistoricalScenario(samplePortfolio, 'covid_crash_2020');
      expect(result).toBeDefined();
      expect(result.scenario).toBe('covid_crash_2020');
    });

    it('should calculate appropriate losses for crisis', () => {
      const result = runHistoricalScenario(samplePortfolio, 'financial_crisis_2008');
      expect(result.expectedLossPercent).toBeGreaterThan(0);
      expect(result.maxDrawdown).toBeGreaterThan(20);
    });

    it('should include recovery time', () => {
      const result = runHistoricalScenario(samplePortfolio, 'financial_crisis_2008');
      expect(result.recoveryTime).toBeDefined();
      expect(result.recoveryTime).toBeGreaterThan(0);
    });

    it('should calculate asset-specific impacts', () => {
      const result = runHistoricalScenario(samplePortfolio, 'covid_crash_2020');
      expect(result.assetImpacts).toBeDefined();
      result.assetImpacts.forEach(impact => {
        expect(impact.symbol).toBeDefined();
        expect(impact.currentValue).toBeGreaterThan(0);
        expect(impact.stressedValue).toBeDefined();
        expect(impact.lossPercent).toBeDefined();
      });
    });

    it('should handle all available scenarios', () => {
      const scenarios = getAvailableScenarios();
      scenarios.forEach(scenario => {
        const result = runHistoricalScenario(samplePortfolio, scenario.id);
        expect(result).toBeDefined();
        expect(result.scenario).toBe(scenario.id);
      });
    });
  });

  describe('runSensitivityAnalysis', () => {
    it('should analyze market sensitivity', () => {
      const result = runSensitivityAnalysis(samplePortfolio, ['market']);
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].factor).toBe('market');
    });

    it('should analyze multiple factors', () => {
      const factors = ['market', 'interest_rate', 'volatility', 'inflation'];
      const result = runSensitivityAnalysis(samplePortfolio, factors);
      expect(result.length).toBe(factors.length);
    });

    it('should include impact values', () => {
      const result = runSensitivityAnalysis(samplePortfolio, ['market']);
      expect(result[0].impacts).toBeDefined();
      expect(Array.isArray(result[0].impacts)).toBe(true);
      expect(result[0].impacts.length).toBeGreaterThan(0);
    });

    it('should show portfolio changes at different factor levels', () => {
      const result = runSensitivityAnalysis(samplePortfolio, ['market']);
      const impacts = result[0].impacts;
      
      // Should have negative and positive changes
      const hasNegative = impacts.some(i => i.change < 0);
      const hasPositive = impacts.some(i => i.change > 0);
      expect(hasNegative).toBe(true);
      expect(hasPositive).toBe(true);
    });
  });

  describe('calculateVaR', () => {
    it('should calculate VaR at 95% confidence', () => {
      const result = calculateVaR(samplePortfolio, 0.95, 1);
      expect(result).toBeDefined();
      expect(result.var).toBeGreaterThan(0);
      expect(result.varPercent).toBeGreaterThan(0);
    });

    it('should calculate VaR at 99% confidence', () => {
      const result99 = calculateVaR(samplePortfolio, 0.99, 1);
      const result95 = calculateVaR(samplePortfolio, 0.95, 1);
      expect(result99.var).toBeGreaterThan(result95.var);
    });

    it('should scale with time horizon', () => {
      const result1d = calculateVaR(samplePortfolio, 0.95, 1);
      const result10d = calculateVaR(samplePortfolio, 0.95, 10);
      expect(result10d.var).toBeGreaterThan(result1d.var);
    });

    it('should include method information', () => {
      const result = calculateVaR(samplePortfolio, 0.95, 1);
      expect(result.method).toBeDefined();
      expect(result.method).toBe('parametric');
    });
  });

  describe('getAvailableScenarios', () => {
    it('should return available crisis scenarios', () => {
      const scenarios = getAvailableScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should not include custom scenario', () => {
      const scenarios = getAvailableScenarios();
      const hasCustom = scenarios.some(s => s.id === 'custom');
      expect(hasCustom).toBe(false);
    });

    it('should include required scenario properties', () => {
      const scenarios = getAvailableScenarios();
      scenarios.forEach(scenario => {
        expect(scenario.id).toBeDefined();
        expect(scenario.name).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.peakToTrough).toBeDefined();
        expect(scenario.recoveryDays).toBeDefined();
      });
    });
  });

  describe('compareStressTests', () => {
    it('should compare multiple stress test results', () => {
      const mcResult = runMonteCarloSimulation(samplePortfolio, {
        simulations: 100,
        timeHorizon: 30,
        confidenceLevel: 0.95,
        volatilityMultiplier: 1.0,
      });
      const histResult = runHistoricalScenario(samplePortfolio, 'covid_crash_2020');
      
      const comparison = compareStressTests([mcResult, histResult]);
      expect(comparison).toBeDefined();
      expect(comparison.comparison.length).toBe(2);
    });

    it('should provide summary statistics', () => {
      const results = [
        runHistoricalScenario(samplePortfolio, 'financial_crisis_2008'),
        runHistoricalScenario(samplePortfolio, 'covid_crash_2020'),
      ];
      
      const comparison = compareStressTests(results);
      expect(comparison.summary).toBeDefined();
      expect(comparison.summary.averageLoss).toBeDefined();
      expect(comparison.summary.maxLoss).toBeDefined();
      expect(comparison.summary.mostVulnerableScenario).toBeDefined();
    });
  });

  describe('CRISIS_SCENARIOS', () => {
    it('should have valid asset impacts', () => {
      Object.values(CRISIS_SCENARIOS).forEach(scenario => {
        if (scenario.id !== 'custom') {
          expect(scenario.assetImpacts).toBeDefined();
          expect(scenario.assetImpacts.stock).toBeDefined();
        }
      });
    });

    it('should have negative peak to trough for crashes', () => {
      const crashScenarios = ['financial_crisis_2008', 'covid_crash_2020', 'black_monday_1987'];
      crashScenarios.forEach(id => {
        const scenario = CRISIS_SCENARIOS[id as keyof typeof CRISIS_SCENARIOS];
        expect(scenario.peakToTrough).toBeLessThan(0);
      });
    });
  });
});
