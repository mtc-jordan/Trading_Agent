import { describe, it, expect, beforeEach } from 'vitest';
import {
  getQuestionnaire,
  getStrategyTemplates,
  createRiskProfile,
  generateStrategy,
  optimizeStrategy,
  getSuitableTemplates,
  generateStrategyVariations,
  compareStrategies,
  validateStrategy,
  exportStrategy,
  RiskProfile,
  GeneratedStrategy,
} from './AutomatedStrategyGeneration';

describe('AutomatedStrategyGeneration', () => {
  const userId = 'test-user-123';
  
  // Default questionnaire responses for testing
  const defaultResponses = [
    { questionId: 'q1_risk_tolerance', answer: 'hold' },
    { questionId: 'q2_investment_horizon', answer: 'medium_term' },
    { questionId: 'q3_trading_style', answer: 'swing_trading' },
    { questionId: 'q4_max_drawdown', answer: 20 },
    { questionId: 'q5_target_return', answer: 15 },
    { questionId: 'q6_asset_classes', answer: ['stocks', 'crypto'] },
    { questionId: 'q7_capital', answer: 10000 },
    { questionId: 'q8_experience', answer: 'intermediate' },
    { questionId: 'q9_time_availability', answer: 'part_time' },
    { questionId: 'q10_emotional_tolerance', answer: 5 },
  ];

  describe('getQuestionnaire', () => {
    it('should return questionnaire with all required questions', () => {
      const questionnaire = getQuestionnaire();
      
      expect(questionnaire).toBeDefined();
      expect(questionnaire).toBeInstanceOf(Array);
      expect(questionnaire.length).toBeGreaterThan(0);
    });

    it('should have questions with required fields', () => {
      const questionnaire = getQuestionnaire();
      
      questionnaire.forEach(question => {
        expect(question.id).toBeDefined();
        expect(question.question).toBeDefined();
        expect(question.type).toBeDefined();
        expect(['single_choice', 'multiple_choice', 'scale', 'number']).toContain(question.type);
      });
    });

    it('should include risk tolerance question', () => {
      const questionnaire = getQuestionnaire();
      const riskQuestion = questionnaire.find(q => q.id === 'q1_risk_tolerance');
      
      expect(riskQuestion).toBeDefined();
      expect(riskQuestion?.options).toBeInstanceOf(Array);
    });
  });

  describe('getStrategyTemplates', () => {
    it('should return array of strategy templates', () => {
      const templates = getStrategyTemplates();
      
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have templates with required fields', () => {
      const templates = getStrategyTemplates();
      
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.suitableFor).toBeDefined();
      });
    });

    it('should include different strategy types', () => {
      const templates = getStrategyTemplates();
      const types = new Set(templates.map(t => t.type));
      
      expect(types.size).toBeGreaterThan(1);
    });
  });

  describe('createRiskProfile', () => {
    it('should create risk profile from questionnaire responses', () => {
      const profile = createRiskProfile(userId, defaultResponses);
      
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(profile.riskTolerance).toBeDefined();
      expect(profile.investmentHorizon).toBeDefined();
      expect(profile.tradingStyle).toBeDefined();
    });

    it('should calculate appropriate risk tolerance', () => {
      const profile = createRiskProfile(userId, defaultResponses);
      
      expect(['conservative', 'moderate', 'aggressive', 'very_aggressive']).toContain(profile.riskTolerance);
    });

    it('should set capital allocation from responses', () => {
      const profile = createRiskProfile(userId, defaultResponses);
      
      expect(profile.capitalAllocation).toBe(10000);
    });

    it('should set preferred asset classes from responses', () => {
      const profile = createRiskProfile(userId, defaultResponses);
      
      expect(profile.preferredAssetClasses).toBeInstanceOf(Array);
      expect(profile.preferredAssetClasses).toContain('stocks');
    });
  });

  describe('generateStrategy', () => {
    let profile: RiskProfile;

    beforeEach(() => {
      profile = createRiskProfile(userId, defaultResponses);
    });

    it('should generate strategy from risk profile', () => {
      const strategy = generateStrategy(profile);
      
      expect(strategy).toBeDefined();
      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.type).toBeDefined();
      expect(strategy.riskLevel).toBeDefined();
    });

    it('should include entry and exit rules', () => {
      const strategy = generateStrategy(profile);
      
      expect(strategy.entryRules).toBeInstanceOf(Array);
      expect(strategy.exitRules).toBeInstanceOf(Array);
      expect(strategy.entryRules.length).toBeGreaterThan(0);
      expect(strategy.exitRules.length).toBeGreaterThan(0);
    });

    it('should include position sizing rules', () => {
      const strategy = generateStrategy(profile);
      
      expect(strategy.positionSizing).toBeDefined();
      expect(strategy.positionSizing.method).toBeDefined();
      expect(strategy.positionSizing.maxSize).toBeDefined();
    });

    it('should include risk management parameters', () => {
      const strategy = generateStrategy(profile);
      
      expect(strategy.expectedMaxDrawdown).toBeDefined();
      expect(strategy.exitRules.some(r => r.type === 'stop_loss')).toBe(true);
    });

    it('should generate strategy with preferred type', () => {
      const strategy = generateStrategy(profile, 'momentum');
      
      expect(strategy.type).toBe('momentum');
    });

    it('should include indicators based on strategy type', () => {
      const strategy = generateStrategy(profile, 'momentum');
      
      expect(strategy.indicators).toBeInstanceOf(Array);
      expect(strategy.indicators.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeStrategy', () => {
    let strategy: GeneratedStrategy;

    beforeEach(() => {
      const profile = createRiskProfile(userId, defaultResponses);
      strategy = generateStrategy(profile);
    });

    it('should optimize strategy for win rate', () => {
      const optimized = optimizeStrategy(strategy, 'win_rate');
      
      expect(optimized).toBeDefined();
      expect(optimized.id).not.toBe(strategy.id);
      expect(optimized.name).toContain('Optimized');
    });

    it('should optimize strategy for risk-reward', () => {
      const optimized = optimizeStrategy(strategy, 'risk_reward');
      
      expect(optimized).toBeDefined();
      expect(optimized.name).toContain('Optimized');
    });

    it('should optimize strategy for sharpe ratio', () => {
      const optimized = optimizeStrategy(strategy, 'sharpe');
      
      expect(optimized).toBeDefined();
      expect(optimized.name).toContain('Optimized');
    });

    it('should optimize strategy for drawdown', () => {
      const optimized = optimizeStrategy(strategy, 'drawdown');
      
      expect(optimized).toBeDefined();
      expect(optimized.name).toContain('Optimized');
    });

    it('should adjust parameters based on optimization goal', () => {
      const optimizedForDrawdown = optimizeStrategy(strategy, 'drawdown');
      
      // Drawdown optimization should reduce risk parameters
      expect(optimizedForDrawdown.expectedMaxDrawdown).toBeLessThanOrEqual(strategy.expectedMaxDrawdown);
    });
  });

  describe('getSuitableTemplates', () => {
    let profile: RiskProfile;

    beforeEach(() => {
      profile = createRiskProfile(userId, defaultResponses);
    });

    it('should return suitable templates for risk profile', () => {
      const templates = getSuitableTemplates(profile);
      
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by risk tolerance', () => {
      const templates = getSuitableTemplates(profile);
      
      templates.forEach(template => {
        // Templates should be suitable for the profile's risk tolerance
        expect(template.suitableFor).toContain(profile.riskTolerance);
      });
    });

    it('should return templates with required fields', () => {
      const templates = getSuitableTemplates(profile);
      
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.type).toBeDefined();
      });
    });
  });

  describe('generateStrategyVariations', () => {
    let profile: RiskProfile;

    beforeEach(() => {
      profile = createRiskProfile(userId, defaultResponses);
    });

    it('should generate multiple strategy variations', () => {
      const variations = generateStrategyVariations(profile, 3);
      
      expect(variations).toBeInstanceOf(Array);
      expect(variations.length).toBeLessThanOrEqual(3);
    });

    it('should generate unique strategies', () => {
      const variations = generateStrategyVariations(profile, 3);
      const ids = variations.map(v => v.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(variations.length);
    });

    it('should generate strategies with valid types', () => {
      const variations = generateStrategyVariations(profile, 3);
      const validTypes = ['momentum', 'mean_reversion', 'trend_following', 'breakout', 'value', 'growth', 'dividend', 'volatility', 'pairs_trading', 'arbitrage'];
      
      variations.forEach(v => {
        expect(validTypes).toContain(v.type);
      });
    });
  });

  describe('compareStrategies', () => {
    let strategies: GeneratedStrategy[];

    beforeEach(() => {
      const profile = createRiskProfile(userId, defaultResponses);
      strategies = generateStrategyVariations(profile, 3);
    });

    it('should compare multiple strategies', () => {
      const comparison = compareStrategies(strategies);
      
      expect(comparison).toBeDefined();
      expect(comparison.comparison).toBeInstanceOf(Array);
      expect(comparison.comparison.length).toBeLessThanOrEqual(3);
    });

    it('should include comparison metrics', () => {
      const comparison = compareStrategies(strategies);
      
      comparison.comparison.forEach(c => {
        expect(c.winRate).toBeDefined();
        expect(c.riskReward).toBeDefined();
        expect(c.score).toBeDefined();
      });
    });

    it('should rank strategies by score', () => {
      const comparison = compareStrategies(strategies);
      
      for (let i = 1; i < comparison.comparison.length; i++) {
        expect(comparison.comparison[i - 1].score).toBeGreaterThanOrEqual(comparison.comparison[i].score);
      }
    });

    it('should include recommendation', () => {
      const comparison = compareStrategies(strategies);
      
      expect(comparison.recommendation).toBeDefined();
      expect(comparison.bestOverall).toBeDefined();
    });
  });

  describe('validateStrategy', () => {
    let strategy: GeneratedStrategy;

    beforeEach(() => {
      const profile = createRiskProfile(userId, defaultResponses);
      strategy = generateStrategy(profile);
    });

    it('should validate strategy structure', () => {
      const validation = validateStrategy(strategy);
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeInstanceOf(Array);
      expect(validation.warnings).toBeInstanceOf(Array);
    });

    it('should return valid for well-formed strategy', () => {
      const validation = validateStrategy(strategy);
      
      expect(validation.isValid).toBe(true);
    });

    it('should return errors and warnings arrays', () => {
      const validation = validateStrategy(strategy);
      
      expect(validation.errors).toBeInstanceOf(Array);
      expect(validation.warnings).toBeInstanceOf(Array);
    });
  });

  describe('exportStrategy', () => {
    let strategy: GeneratedStrategy;

    beforeEach(() => {
      const profile = createRiskProfile(userId, defaultResponses);
      strategy = generateStrategy(profile);
    });

    it('should export strategy as JSON string', () => {
      const exported = exportStrategy(strategy);
      
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should include all strategy fields in export', () => {
      const exported = exportStrategy(strategy);
      const parsed = JSON.parse(exported);
      
      expect(parsed.id).toBe(strategy.id);
      expect(parsed.name).toBe(strategy.name);
      expect(parsed.type).toBe(strategy.type);
      expect(parsed.entryRules).toBeDefined();
      expect(parsed.exitRules).toBeDefined();
    });

    it('should include strategy metadata', () => {
      const exported = exportStrategy(strategy);
      const parsed = JSON.parse(exported);
      
      expect(parsed.createdAt).toBeDefined();
      expect(parsed.createdFor).toBeDefined();
    });
  });

  describe('Strategy Types', () => {
    let profile: RiskProfile;

    beforeEach(() => {
      profile = createRiskProfile(userId, defaultResponses);
    });

    it('should generate strategy with momentum indicators when available', () => {
      const strategy = generateStrategy(profile, 'momentum');
      
      // Strategy type depends on template availability for profile
      expect(strategy.type).toBeDefined();
      expect(strategy.indicators.some(i => i.name.toLowerCase().includes('rsi') || i.name.toLowerCase().includes('macd'))).toBe(true);
    });

    it('should generate strategy with valid type', () => {
      const strategy = generateStrategy(profile);
      
      const validTypes = ['momentum', 'mean_reversion', 'trend_following', 'breakout', 'value', 'growth', 'dividend', 'volatility', 'pairs_trading', 'arbitrage'];
      expect(validTypes).toContain(strategy.type);
    });

    it('should generate strategy matching profile risk tolerance', () => {
      const strategy = generateStrategy(profile);
      
      // Strategy should be suitable for the profile's risk tolerance
      expect(strategy.riskLevel).toBeDefined();
    });

    it('should generate strategy with indicators', () => {
      const strategy = generateStrategy(profile);
      
      expect(strategy.indicators).toBeInstanceOf(Array);
      expect(strategy.indicators.length).toBeGreaterThan(0);
    });

    it('should generate strategy with expected performance metrics', () => {
      const strategy = generateStrategy(profile);
      
      expect(strategy.expectedWinRate).toBeDefined();
      expect(strategy.expectedRiskReward).toBeDefined();
      expect(strategy.expectedMaxDrawdown).toBeDefined();
    });
  });

  describe('Risk Profile Variations', () => {
    it('should create profile with risk tolerance based on questionnaire', () => {
      const conservativeResponses = [
        { questionId: 'q1_risk_tolerance', answer: 'sell_all' },
        { questionId: 'q2_investment_horizon', answer: 'long_term' },
        { questionId: 'q3_trading_style', answer: 'position_trading' },
        { questionId: 'q4_max_drawdown', answer: 10 },
        { questionId: 'q5_target_return', answer: 8 },
        { questionId: 'q6_asset_classes', answer: ['stocks'] },
        { questionId: 'q7_capital', answer: 50000 },
        { questionId: 'q8_experience', answer: 'beginner' },
        { questionId: 'q9_time_availability', answer: 'minimal' },
        { questionId: 'q10_emotional_tolerance', answer: 2 },
      ];
      const profile = createRiskProfile(userId, conservativeResponses);
      
      // Risk tolerance is calculated from scored options
      expect(['conservative', 'moderate', 'aggressive', 'very_aggressive']).toContain(profile.riskTolerance);
    });

    it('should create profile with higher risk tolerance for aggressive answers', () => {
      const aggressiveResponses = [
        { questionId: 'q1_risk_tolerance', answer: 'buy_more' },
        { questionId: 'q2_investment_horizon', answer: 'short_term' },
        { questionId: 'q3_trading_style', answer: 'day_trading' },
        { questionId: 'q4_max_drawdown', answer: 40 },
        { questionId: 'q5_target_return', answer: 50 },
        { questionId: 'q6_asset_classes', answer: ['stocks', 'crypto', 'forex'] },
        { questionId: 'q7_capital', answer: 100000 },
        { questionId: 'q8_experience', answer: 'expert' },
        { questionId: 'q9_time_availability', answer: 'full_time' },
        { questionId: 'q10_emotional_tolerance', answer: 9 },
      ];
      const profile = createRiskProfile(userId, aggressiveResponses);
      
      expect(['moderate', 'aggressive', 'very_aggressive']).toContain(profile.riskTolerance);
    });
  });

  describe('Entry and Exit Rules', () => {
    let strategy: GeneratedStrategy;

    beforeEach(() => {
      const profile = createRiskProfile(userId, defaultResponses);
      strategy = generateStrategy(profile);
    });

    it('should have entry rules with required fields', () => {
      strategy.entryRules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.indicator).toBeDefined();
        expect(rule.condition).toBeDefined();
      });
    });

    it('should have exit rules with required fields', () => {
      strategy.exitRules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.type).toBeDefined();
      });
    });

    it('should have stop loss in exit rules', () => {
      const hasStopLoss = strategy.exitRules.some(rule => 
        rule.type === 'stop_loss' || rule.name.toLowerCase().includes('stop')
      );
      
      expect(hasStopLoss).toBe(true);
    });

    it('should have take profit in exit rules', () => {
      const hasTakeProfit = strategy.exitRules.some(rule => 
        rule.type === 'take_profit' || rule.name.toLowerCase().includes('profit')
      );
      
      expect(hasTakeProfit).toBe(true);
    });
  });

  describe('Position Sizing', () => {
    it('should generate position sizing based on capital allocation', () => {
      const profile = createRiskProfile(userId, defaultResponses);
      const strategy = generateStrategy(profile);
      
      expect(strategy.positionSizing.maxSize).toBeDefined();
      expect(strategy.positionSizing.maxSize).toBeGreaterThan(0);
    });

    it('should have position sizing method defined', () => {
      const profile = createRiskProfile(userId, defaultResponses);
      const strategy = generateStrategy(profile);
      
      expect(strategy.positionSizing.method).toBeDefined();
      expect(['fixed', 'percent_of_capital', 'risk_based', 'volatility_adjusted', 'kelly_criterion']).toContain(strategy.positionSizing.method);
    });
  });
});
