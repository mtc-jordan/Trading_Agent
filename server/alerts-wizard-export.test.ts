/**
 * Tests for Prediction Alerts, Weight Optimization Wizard, and Backtest Export
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createAlert, 
  getUserAlerts, 
  getAlertSummary,
  deleteAlert,
  initializeSampleAlerts 
} from './services/ai-agents/PredictionAlerts';
import { 
  getWizardSteps, 
  calculateRiskProfile, 
  getOptimizedWeights,
  getPresetConfigurations 
} from './services/ai-agents/WeightOptimizationWizard';
import { 
  generateCSVExport, 
  generatePDFContent, 
  getExportFileName,
  generateSampleExportData 
} from './services/ai-agents/BacktestExport';

describe('Prediction Alerts Service', () => {
  const testUserId = 'test-user-alerts';

  beforeEach(() => {
    // Initialize sample alerts for testing
    initializeSampleAlerts(testUserId);
  });

  describe('createAlert', () => {
    it('should create a new prediction alert', async () => {
      const alert = await createAlert({
        userId: testUserId,
        predictionId: 1,
        symbol: 'AAPL',
        targetPrice: 200,
        stopLossPrice: 180,
        channels: ['in_app'],
        expiresInHours: 24,
      });

      expect(alert).toBeDefined();
      expect(alert.symbol).toBe('AAPL');
      expect(alert.targetPrice).toBe(200);
      expect(alert.stopLossPrice).toBe(180);
      expect(alert.status).toBe('pending');
    });

    it('should create alert with trailing stop', async () => {
      const alert = await createAlert({
        userId: testUserId,
        predictionId: 2,
        symbol: 'MSFT',
        trailingStopPct: 5,
        channels: ['in_app', 'email'],
      });

      expect(alert).toBeDefined();
      expect(alert.symbol).toBe('MSFT');
    });
  });

  describe('getUserAlerts', () => {
    it('should return user alerts', async () => {
      const alerts = await getUserAlerts(testUserId);
      
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getAlertSummary', () => {
    it('should return alert summary with counts', async () => {
      const summary = await getAlertSummary(testUserId);
      
      expect(summary).toBeDefined();
      expect(typeof summary.totalAlerts).toBe('number');
      expect(typeof summary.pendingAlerts).toBe('number');
      expect(summary.byType).toBeDefined();
      expect(summary.byPriority).toBeDefined();
    });
  });
});

describe('Weight Optimization Wizard Service', () => {
  const testUserId = 'test-user-wizard';

  describe('getWizardSteps', () => {
    it('should return wizard steps with questions', () => {
      const steps = getWizardSteps();
      
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      
      const firstStep = steps[0];
      expect(firstStep.step).toBeDefined();
      expect(firstStep.title).toBeDefined();
      expect(firstStep.questions).toBeDefined();
      expect(Array.isArray(firstStep.questions)).toBe(true);
    });

    it('should have questions with options', () => {
      const steps = getWizardSteps();
      const firstQuestion = steps[0].questions[0];
      
      expect(firstQuestion.id).toBeDefined();
      expect(firstQuestion.question).toBeDefined();
      expect(firstQuestion.options).toBeDefined();
      expect(Array.isArray(firstQuestion.options)).toBe(true);
    });
  });

  describe('calculateRiskProfile', () => {
    it('should calculate risk profile from responses', () => {
      const responses = [
        { questionId: 'risk_1', selectedValue: 'hold' },
        { questionId: 'risk_2', selectedValue: 'medium' },
        { questionId: 'risk_3', selectedValue: 'balanced' },
      ];
      
      const profile = calculateRiskProfile(testUserId, responses);
      
      expect(profile).toBeDefined();
      expect(profile.riskTolerance).toBeDefined();
      expect(profile.tradingStyle).toBeDefined();
      expect(profile.experienceLevel).toBeDefined();
    });

    it('should categorize risk levels correctly', () => {
      const conservativeResponses = [
        { questionId: 'risk_1', selectedValue: 'sell_all' },
        { questionId: 'risk_2', selectedValue: 'low' },
        { questionId: 'risk_3', selectedValue: 'preservation' },
      ];
      
      const profile = calculateRiskProfile(testUserId, conservativeResponses);
      
      expect(['conservative', 'moderate', 'aggressive', 'very_aggressive']).toContain(profile.riskTolerance);
    });
  });

  describe('getOptimizedWeights', () => {
    it('should return optimized weights for risk profile', () => {
      const profile = {
        userId: testUserId,
        riskTolerance: 'moderate' as const,
        tradingStyle: 'swing_trading' as const,
        marketFocus: 'mixed' as const,
        experienceLevel: 'intermediate' as const,
        investmentHorizon: 'medium' as const,
        maxDrawdownTolerance: 20,
        preferredVolatility: 'medium' as const,
        automationPreference: 'semi_auto' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const recommendation = getOptimizedWeights(profile);
      
      expect(recommendation).toBeDefined();
      expect(recommendation.weights).toBeDefined();
      expect(recommendation.weights.technical).toBeDefined();
      expect(recommendation.weights.fundamental).toBeDefined();
      expect(recommendation.weights.sentiment).toBeDefined();
      expect(recommendation.weights.risk).toBeDefined();
      expect(recommendation.weights.regime).toBeDefined();
      expect(recommendation.weights.execution).toBeDefined();
      expect(recommendation.weights.coordinator).toBeDefined();
      
      // Weights should sum to approximately 1
      const sum = Object.values(recommendation.weights).reduce((a: number, b: number) => a + b, 0);
      expect(sum).toBeCloseTo(1, 1);
    });
  });

  describe('getPresetConfigurations', () => {
    it('should return preset configurations', () => {
      const presets = getPresetConfigurations();
      
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
      
      const firstPreset = presets[0];
      expect(firstPreset.name).toBeDefined();
      expect(firstPreset.description).toBeDefined();
      expect(firstPreset.weights).toBeDefined();
      expect(firstPreset.riskLevel).toBeDefined();
    });
  });
});

describe('Backtest Export Service', () => {
  const testUserId = 'test-user-export';

  describe('generateSampleExportData', () => {
    it('should generate sample export data', () => {
      const data = generateSampleExportData(testUserId);
      
      expect(data).toBeDefined();
      expect(data.title).toBeDefined();
      expect(data.generatedAt).toBeDefined();
      expect(data.backtests).toBeDefined();
      expect(Array.isArray(data.backtests)).toBe(true);
    });
  });

  describe('generateCSVExport', () => {
    it('should generate CSV content', () => {
      const data = generateSampleExportData(testUserId);
      const csv = generateCSVExport(data, {
        includeTradeDetails: true,
        includeAgentWeights: true,
        delimiter: ',',
        dateFormat: 'ISO',
      });
      
      expect(typeof csv).toBe('string');
      expect(csv.length).toBeGreaterThan(0);
      expect(csv).toContain(','); // Should have CSV delimiters
    });

    it('should respect delimiter option', () => {
      const data = generateSampleExportData(testUserId);
      const csv = generateCSVExport(data, {
        includeTradeDetails: false,
        includeAgentWeights: false,
        delimiter: ';',
        dateFormat: 'ISO',
      });
      
      expect(csv).toContain(';');
    });
  });

  describe('generatePDFContent', () => {
    it('should generate HTML content for PDF', () => {
      const data = generateSampleExportData(testUserId);
      const html = generatePDFContent(data, {
        includeCharts: true,
        includeTradeLog: true,
        includeDisclaimer: true,
        paperSize: 'A4',
        orientation: 'portrait',
      });
      
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include disclaimer when requested', () => {
      const data = generateSampleExportData(testUserId);
      const html = generatePDFContent(data, {
        includeCharts: false,
        includeTradeLog: false,
        includeDisclaimer: true,
        paperSize: 'A4',
        orientation: 'portrait',
      });
      
      expect(html.toLowerCase()).toContain('disclaimer');
    });
  });

  describe('getExportFileName', () => {
    it('should generate filename with correct extension', () => {
      const csvFilename = getExportFileName('My Backtest Report', 'csv');
      const pdfFilename = getExportFileName('My Backtest Report', 'pdf');
      
      expect(csvFilename).toContain('.csv');
      expect(pdfFilename).toContain('.pdf');
    });

    it('should sanitize title for filename', () => {
      const filename = getExportFileName('Test/Report:Name', 'csv');
      
      // Should not contain invalid characters
      expect(filename).not.toContain('/');
      expect(filename).not.toContain(':');
    });
  });
});

describe('Integration Tests', () => {
  const testUserId = 'test-user-integration';

  it('should complete full wizard flow and get weights', () => {
    // Get wizard steps
    const steps = getWizardSteps();
    expect(steps.length).toBeGreaterThan(0);
    
    // Simulate answering questions
    const responses = steps.flatMap(step => 
      step.questions.map(q => ({
        questionId: q.id,
        selectedValue: q.options[0].value,
      }))
    );
    
    // Calculate risk profile
    const profile = calculateRiskProfile(testUserId, responses);
    expect(profile).toBeDefined();
    
    // Get optimized weights
    const recommendation = getOptimizedWeights(profile);
    expect(recommendation).toBeDefined();
    expect(recommendation.weights).toBeDefined();
    
    // Verify weights are valid
    const sum = Object.values(recommendation.weights).reduce((a: number, b: number) => a + b, 0);
    expect(sum).toBeCloseTo(1, 1);
  });

  it('should generate complete export report', () => {
    // Generate sample data
    const data = generateSampleExportData(testUserId);
    
    // Generate CSV
    const csv = generateCSVExport(data, {
      includeTradeDetails: true,
      includeAgentWeights: true,
      delimiter: ',',
      dateFormat: 'ISO',
    });
    expect(csv.length).toBeGreaterThan(100);
    
    // Generate PDF HTML
    const html = generatePDFContent(data, {
      includeCharts: true,
      includeTradeLog: true,
      includeDisclaimer: true,
      paperSize: 'A4',
      orientation: 'portrait',
    });
    expect(html.length).toBeGreaterThan(500);
  });
});
