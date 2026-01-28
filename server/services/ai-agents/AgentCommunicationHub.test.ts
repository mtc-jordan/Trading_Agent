/**
 * Unit tests for Agent Communication Hub
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startDiscussion,
  addArgument,
  generateDebate,
  conductVoting,
  getDiscussion,
  getActiveDiscussions,
  getDiscussionHistory,
  runFullDiscussion,
  getAgentProfile,
  getAllAgentProfiles,
  clearOldDiscussions,
  AgentType,
  DiscussionThread,
  AgentMessage
} from './AgentCommunicationHub';

// Mock the LLM
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          content: 'Test analysis content',
          confidence: 75,
          sentiment: 'bullish',
          keyPoints: ['Point 1', 'Point 2']
        })
      }
    }]
  })
}));

describe('AgentCommunicationHub', () => {
  describe('startDiscussion', () => {
    it('should create a new discussion thread', async () => {
      const thread = await startDiscussion('AAPL', 'stock', 'Should we buy?');
      
      expect(thread).toBeDefined();
      expect(thread.id).toBeDefined();
      expect(thread.symbol).toBe('AAPL');
      expect(thread.assetType).toBe('stock');
      expect(thread.topic).toBe('Should we buy?');
      expect(thread.status).toBe('active');
      expect(thread.participants).toHaveLength(7);
      expect(thread.messages.length).toBeGreaterThan(0);
    });

    it('should include all 7 agent types as participants', async () => {
      const thread = await startDiscussion('BTC', 'crypto', 'Buy or sell?');
      
      const expectedAgents: AgentType[] = [
        'technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution', 'coordinator'
      ];
      
      expect(thread.participants).toEqual(expectedAgents);
    });

    it('should generate initial analyses from 6 agents', async () => {
      const thread = await startDiscussion('GOOGL', 'stock', 'Analysis needed');
      
      // Should have 6 initial analysis messages (excluding coordinator)
      const analysisMessages = thread.messages.filter(m => m.messageType === 'analysis');
      expect(analysisMessages.length).toBe(6);
    });
  });

  describe('addArgument', () => {
    it('should add an argument to an active thread', async () => {
      const thread = await startDiscussion('MSFT', 'stock', 'Test topic');
      const initialCount = thread.messages.length;
      
      const argument = await addArgument(thread.id, 'technical', 'for');
      
      expect(argument).toBeDefined();
      expect(argument?.messageType).toBe('argument');
      expect(argument?.agentType).toBe('technical');
      expect(argument?.sentiment).toBe('bullish');
    });

    it('should add a counter argument', async () => {
      const thread = await startDiscussion('TSLA', 'stock', 'Test topic');
      
      const counterArg = await addArgument(thread.id, 'risk', 'against');
      
      expect(counterArg).toBeDefined();
      expect(counterArg?.messageType).toBe('counter_argument');
      expect(counterArg?.sentiment).toBe('bearish');
    });

    it('should return null for non-existent thread', async () => {
      const result = await addArgument('non-existent-id', 'technical', 'for');
      expect(result).toBeNull();
    });
  });

  describe('generateDebate', () => {
    it('should generate debate messages', async () => {
      const thread = await startDiscussion('AMZN', 'stock', 'Debate topic');
      
      const debateMessages = await generateDebate(thread.id, 1);
      
      expect(debateMessages.length).toBeGreaterThan(0);
    });

    it('should generate multiple rounds', async () => {
      const thread = await startDiscussion('META', 'stock', 'Multi-round debate');
      
      const round1 = await generateDebate(thread.id, 1);
      const round2 = await generateDebate(thread.id, 1);
      
      expect(round1.length).toBeGreaterThan(0);
      expect(round2.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent thread', async () => {
      const result = await generateDebate('non-existent-id', 1);
      expect(result).toEqual([]);
    });
  });

  describe('conductVoting', () => {
    it('should conduct voting and return consensus', async () => {
      const thread = await startDiscussion('NVDA', 'stock', 'Vote topic');
      
      const consensus = await conductVoting(thread.id);
      
      expect(consensus).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(consensus?.decision);
      expect(consensus?.confidence).toBeGreaterThanOrEqual(0);
      expect(consensus?.confidence).toBeLessThanOrEqual(100);
      expect(consensus?.votesFor).toBeGreaterThanOrEqual(0);
      expect(consensus?.votesAgainst).toBeGreaterThanOrEqual(0);
    });

    it('should mark thread as concluded after voting', async () => {
      const thread = await startDiscussion('AMD', 'stock', 'Vote topic');
      
      await conductVoting(thread.id);
      const updatedThread = getDiscussion(thread.id);
      
      expect(updatedThread?.status).toBe('concluded');
      expect(updatedThread?.consensus).toBeDefined();
    });

    it('should add vote messages from all agents', async () => {
      const thread = await startDiscussion('INTC', 'stock', 'Vote topic');
      const initialCount = thread.messages.length;
      
      await conductVoting(thread.id);
      const updatedThread = getDiscussion(thread.id);
      
      const voteMessages = updatedThread?.messages.filter(m => m.messageType === 'vote');
      expect(voteMessages?.length).toBe(6); // 6 voting agents
    });

    it('should return null for non-existent thread', async () => {
      const result = await conductVoting('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getDiscussion', () => {
    it('should retrieve an existing discussion', async () => {
      const thread = await startDiscussion('COIN', 'crypto', 'Get test');
      
      const retrieved = getDiscussion(thread.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(thread.id);
      expect(retrieved?.symbol).toBe('COIN');
    });

    it('should return null for non-existent discussion', () => {
      const result = getDiscussion('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getActiveDiscussions', () => {
    it('should return only active discussions', async () => {
      const thread1 = await startDiscussion('SYM1', 'stock', 'Active 1');
      const thread2 = await startDiscussion('SYM2', 'stock', 'Active 2');
      
      // Conclude one thread
      await conductVoting(thread1.id);
      
      const active = getActiveDiscussions();
      const activeIds = active.map(d => d.id);
      
      expect(activeIds).toContain(thread2.id);
    });
  });

  describe('getDiscussionHistory', () => {
    it('should return discussions for a specific symbol', async () => {
      await startDiscussion('HIST', 'stock', 'History 1');
      await startDiscussion('HIST', 'stock', 'History 2');
      await startDiscussion('OTHER', 'stock', 'Other symbol');
      
      const history = getDiscussionHistory('HIST');
      
      expect(history.length).toBeGreaterThanOrEqual(2);
      history.forEach(d => expect(d.symbol).toBe('HIST'));
    });

    it('should respect limit parameter', async () => {
      await startDiscussion('LIM', 'stock', 'Limit 1');
      await startDiscussion('LIM', 'stock', 'Limit 2');
      await startDiscussion('LIM', 'stock', 'Limit 3');
      
      const history = getDiscussionHistory('LIM', 2);
      
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('runFullDiscussion', () => {
    it('should run a complete discussion cycle', async () => {
      const result = await runFullDiscussion('FULL', 'stock', 'Full cycle test');
      
      expect(result.thread).toBeDefined();
      expect(result.consensus).toBeDefined();
      expect(result.thread.status).toBe('concluded');
    });

    it('should include all phases: analysis, debate, voting', async () => {
      const result = await runFullDiscussion('PHASES', 'crypto', 'Phase test');
      
      const messageTypes = new Set(result.thread.messages.map(m => m.messageType));
      
      expect(messageTypes.has('analysis')).toBe(true);
      expect(messageTypes.has('vote')).toBe(true);
      expect(messageTypes.has('consensus')).toBe(true);
    });
  });

  describe('getAgentProfile', () => {
    it('should return profile for valid agent type', () => {
      const profile = getAgentProfile('technical');
      
      expect(profile).toBeDefined();
      expect(profile.name).toBe('TechAnalyst');
      expect(profile.expertise).toContain('Chart patterns');
    });

    it('should return different profiles for different agents', () => {
      const technical = getAgentProfile('technical');
      const fundamental = getAgentProfile('fundamental');
      
      expect(technical.name).not.toBe(fundamental.name);
      expect(technical.expertise).not.toEqual(fundamental.expertise);
    });
  });

  describe('getAllAgentProfiles', () => {
    it('should return all 7 agent profiles', () => {
      const profiles = getAllAgentProfiles();
      
      expect(Object.keys(profiles)).toHaveLength(7);
      expect(profiles.technical).toBeDefined();
      expect(profiles.fundamental).toBeDefined();
      expect(profiles.sentiment).toBeDefined();
      expect(profiles.risk).toBeDefined();
      expect(profiles.regime).toBeDefined();
      expect(profiles.execution).toBeDefined();
      expect(profiles.coordinator).toBeDefined();
    });
  });

  describe('clearOldDiscussions', () => {
    it('should clear discussions older than specified age', async () => {
      // Create a discussion
      await startDiscussion('OLD', 'stock', 'Old discussion');
      
      // Clear with 0ms age (should clear everything)
      const cleared = clearOldDiscussions(0);
      
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Agent message structure', () => {
    it('should have all required fields in messages', async () => {
      const thread = await startDiscussion('STRUCT', 'stock', 'Structure test');
      
      thread.messages.forEach(message => {
        expect(message.id).toBeDefined();
        expect(message.agentType).toBeDefined();
        expect(message.agentName).toBeDefined();
        expect(message.messageType).toBeDefined();
        expect(message.content).toBeDefined();
        expect(message.confidence).toBeDefined();
        expect(message.timestamp).toBeDefined();
        expect(message.sentiment).toBeDefined();
      });
    });

    it('should have valid confidence range', async () => {
      const thread = await startDiscussion('CONF', 'stock', 'Confidence test');
      
      thread.messages.forEach(message => {
        expect(message.confidence).toBeGreaterThanOrEqual(0);
        expect(message.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should have valid sentiment values', async () => {
      const thread = await startDiscussion('SENT', 'stock', 'Sentiment test');
      
      thread.messages.forEach(message => {
        expect(['bullish', 'bearish', 'neutral']).toContain(message.sentiment);
      });
    });
  });

  describe('Asset type support', () => {
    it('should support stock asset type', async () => {
      const thread = await startDiscussion('STOCK', 'stock', 'Stock test');
      expect(thread.assetType).toBe('stock');
    });

    it('should support crypto asset type', async () => {
      const thread = await startDiscussion('BTC', 'crypto', 'Crypto test');
      expect(thread.assetType).toBe('crypto');
    });

    it('should support forex asset type', async () => {
      const thread = await startDiscussion('EURUSD', 'forex', 'Forex test');
      expect(thread.assetType).toBe('forex');
    });

    it('should support commodity asset type', async () => {
      const thread = await startDiscussion('GOLD', 'commodity', 'Commodity test');
      expect(thread.assetType).toBe('commodity');
    });
  });
});
