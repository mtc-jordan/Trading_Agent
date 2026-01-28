import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLeaderboard,
  getAgentDetails,
  compareAgents,
  getTopPerformersByCondition,
  getAgentRankingsHistory,
  getAllBadges,
  getMarketConditions,
  getAgentTypes,
  getLeaderboardStats,
  type LeaderboardFilters,
  type TimeFrame,
  type MarketCondition,
  type AgentType,
} from './AgentPerformanceLeaderboard';

describe('AgentPerformanceLeaderboard', () => {
  describe('getLeaderboard', () => {
    it('should return leaderboard entries', () => {
      const filters: LeaderboardFilters = { timeFrame: '1m' };
      const result = getLeaderboard(filters);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include rank information', () => {
      const result = getLeaderboard({ timeFrame: '1m' });
      result.forEach((entry, index) => {
        expect(entry.rank).toBe(index + 1);
        expect(entry.previousRank).toBeDefined();
        expect(entry.rankChange).toBeDefined();
      });
    });

    it('should include agent performance data', () => {
      const result = getLeaderboard({ timeFrame: '1m' });
      result.forEach(entry => {
        expect(entry.agent).toBeDefined();
        expect(entry.agent.agentId).toBeDefined();
        expect(entry.agent.agentName).toBeDefined();
        expect(entry.agent.accuracy).toBeDefined();
        expect(entry.agent.avgReturn).toBeDefined();
      });
    });

    it('should filter by agent type', () => {
      const result = getLeaderboard({ timeFrame: '1m', agentType: 'technical' });
      result.forEach(entry => {
        expect(entry.agent.agentType).toBe('technical');
      });
    });

    it('should filter by market condition', () => {
      const result = getLeaderboard({ timeFrame: '1m', marketCondition: 'bull_market' });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by minimum signals', () => {
      const result = getLeaderboard({ timeFrame: '1m', minSignals: 10 });
      result.forEach(entry => {
        expect(entry.agent.totalSignals).toBeGreaterThanOrEqual(10);
      });
    });

    it('should handle different time frames', () => {
      const timeFrames: TimeFrame[] = ['1d', '1w', '1m', '3m', '6m', '1y', 'all'];
      timeFrames.forEach(tf => {
        const result = getLeaderboard({ timeFrame: tf });
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAgentDetails', () => {
    it('should return agent details', () => {
      const result = getAgentDetails('technical_agent');
      expect(result).toBeDefined();
      expect(result?.agentId).toBe('technical_agent');
    });

    it('should return null for invalid agent', () => {
      const result = getAgentDetails('invalid_agent');
      expect(result).toBeNull();
    });

    it('should include performance metrics', () => {
      const result = getAgentDetails('fundamental_agent');
      expect(result?.accuracy).toBeDefined();
      expect(result?.avgReturn).toBeDefined();
      expect(result?.sharpeRatio).toBeDefined();
      expect(result?.winRate).toBeDefined();
    });

    it('should include condition performance', () => {
      const result = getAgentDetails('sentiment_agent');
      expect(result?.conditionPerformance).toBeDefined();
      expect(result?.conditionPerformance.bull_market).toBeDefined();
      expect(result?.conditionPerformance.bear_market).toBeDefined();
    });

    it('should include badges', () => {
      const result = getAgentDetails('risk_agent');
      expect(result?.badges).toBeDefined();
      expect(Array.isArray(result?.badges)).toBe(true);
    });

    it('should include recent signals', () => {
      const result = getAgentDetails('momentum_agent');
      expect(result?.recentSignals).toBeDefined();
      expect(Array.isArray(result?.recentSignals)).toBe(true);
      if (result?.recentSignals.length) {
        expect(result.recentSignals[0].symbol).toBeDefined();
        expect(result.recentSignals[0].direction).toBeDefined();
        expect(result.recentSignals[0].outcome).toBeDefined();
      }
    });

    it('should include performance trend', () => {
      const result = getAgentDetails('portfolio_agent');
      expect(result?.performanceTrend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(result?.performanceTrend);
    });
  });

  describe('compareAgents', () => {
    it('should compare multiple agents', () => {
      const result = compareAgents(['technical_agent', 'fundamental_agent']);
      expect(result.length).toBe(2);
    });

    it('should return performance data for each agent', () => {
      const result = compareAgents(['sentiment_agent', 'risk_agent', 'momentum_agent']);
      result.forEach(agent => {
        expect(agent.agentId).toBeDefined();
        expect(agent.accuracy).toBeDefined();
        expect(agent.avgReturn).toBeDefined();
      });
    });

    it('should filter out invalid agents', () => {
      const result = compareAgents(['technical_agent', 'invalid_agent']);
      expect(result.length).toBe(1);
    });
  });

  describe('getTopPerformersByCondition', () => {
    it('should return top performers for bull market', () => {
      const result = getTopPerformersByCondition('bull_market', 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should return top performers for bear market', () => {
      const result = getTopPerformersByCondition('bear_market', 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should return top performers for high volatility', () => {
      const result = getTopPerformersByCondition('high_volatility', 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should rank by condition performance', () => {
      const result = getTopPerformersByCondition('trending', 5);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].rank).toBeLessThanOrEqual(result[i].rank);
      }
    });
  });

  describe('getAgentRankingsHistory', () => {
    it('should return rankings history', () => {
      const result = getAgentRankingsHistory('technical_agent', 30);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include date and rank', () => {
      const result = getAgentRankingsHistory('fundamental_agent', 7);
      result.forEach(entry => {
        expect(entry.date).toBeDefined();
        expect(entry.rank).toBeDefined();
        expect(entry.accuracy).toBeDefined();
        expect(entry.returns).toBeDefined();
      });
    });

    it('should respect days parameter', () => {
      const result7 = getAgentRankingsHistory('sentiment_agent', 7);
      const result30 = getAgentRankingsHistory('sentiment_agent', 30);
      expect(result30.length).toBeGreaterThan(result7.length);
    });
  });

  describe('getAllBadges', () => {
    it('should return all available badges', () => {
      const result = getAllBadges();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include badge properties', () => {
      const result = getAllBadges();
      result.forEach(badge => {
        expect(badge.id).toBeDefined();
        expect(badge.name).toBeDefined();
        expect(badge.description).toBeDefined();
        expect(badge.icon).toBeDefined();
        expect(badge.rarity).toBeDefined();
      });
    });

    it('should have valid rarity levels', () => {
      const result = getAllBadges();
      const validRarities = ['common', 'rare', 'epic', 'legendary'];
      result.forEach(badge => {
        expect(validRarities).toContain(badge.rarity);
      });
    });
  });

  describe('getMarketConditions', () => {
    it('should return market conditions', () => {
      const result = getMarketConditions();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include condition properties', () => {
      const result = getMarketConditions();
      result.forEach(condition => {
        expect(condition.id).toBeDefined();
        expect(condition.name).toBeDefined();
        expect(condition.description).toBeDefined();
      });
    });

    it('should include key market conditions', () => {
      const result = getMarketConditions();
      const ids = result.map(c => c.id);
      expect(ids).toContain('bull_market');
      expect(ids).toContain('bear_market');
      expect(ids).toContain('high_volatility');
    });
  });

  describe('getAgentTypes', () => {
    it('should return agent types', () => {
      const result = getAgentTypes();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include type properties', () => {
      const result = getAgentTypes();
      result.forEach(type => {
        expect(type.id).toBeDefined();
        expect(type.name).toBeDefined();
      });
    });

    it('should include key agent types', () => {
      const result = getAgentTypes();
      const ids = result.map(t => t.id);
      expect(ids).toContain('technical');
      expect(ids).toContain('fundamental');
      expect(ids).toContain('sentiment');
    });
  });

  describe('getLeaderboardStats', () => {
    it('should return leaderboard statistics', () => {
      const result = getLeaderboardStats();
      expect(result).toBeDefined();
    });

    it('should include total agents', () => {
      const result = getLeaderboardStats();
      expect(result.totalAgents).toBeDefined();
      expect(result.totalAgents).toBeGreaterThan(0);
    });

    it('should include total signals', () => {
      const result = getLeaderboardStats();
      expect(result.totalSignals).toBeDefined();
      expect(result.totalSignals).toBeGreaterThan(0);
    });

    it('should include average accuracy', () => {
      const result = getLeaderboardStats();
      expect(result.avgAccuracy).toBeDefined();
      expect(result.avgAccuracy).toBeGreaterThan(0);
      expect(result.avgAccuracy).toBeLessThanOrEqual(1);
    });

    it('should include top performer', () => {
      const result = getLeaderboardStats();
      expect(result.topPerformer).toBeDefined();
      expect(typeof result.topPerformer).toBe('string');
    });
  });

  describe('Agent Performance Metrics', () => {
    it('should have accuracy between 0 and 1', () => {
      const leaderboard = getLeaderboard({ timeFrame: '1m' });
      leaderboard.forEach(entry => {
        expect(entry.agent.accuracy).toBeGreaterThanOrEqual(0);
        expect(entry.agent.accuracy).toBeLessThanOrEqual(1);
      });
    });

    it('should have positive total signals', () => {
      const leaderboard = getLeaderboard({ timeFrame: '1m' });
      leaderboard.forEach(entry => {
        expect(entry.agent.totalSignals).toBeGreaterThan(0);
      });
    });

    it('should have valid sharpe ratio', () => {
      const leaderboard = getLeaderboard({ timeFrame: '1m' });
      leaderboard.forEach(entry => {
        expect(typeof entry.agent.sharpeRatio).toBe('number');
        expect(isNaN(entry.agent.sharpeRatio)).toBe(false);
      });
    });

    it('should have max drawdown between 0 and 1', () => {
      const leaderboard = getLeaderboard({ timeFrame: '1m' });
      leaderboard.forEach(entry => {
        expect(entry.agent.maxDrawdown).toBeGreaterThanOrEqual(0);
        expect(entry.agent.maxDrawdown).toBeLessThanOrEqual(1);
      });
    });
  });
});
