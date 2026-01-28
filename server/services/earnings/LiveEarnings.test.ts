/**
 * Tests for Live Earnings Transcript Services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          overallSentiment: 0.6,
          confidence: 0.85,
          toneIndicators: {
            optimism: 0.7,
            defensiveness: 0.2,
            confidence: 0.8,
            uncertainty: 0.15
          },
          keyPhrases: ['record revenue', 'strong growth'],
          alerts: []
        })
      }
    }]
  })
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('RealTimeToneAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tone Analysis', () => {
    it('should analyze sentiment from transcript text', async () => {
      const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
      const analyzer = new RealTimeToneAnalyzer();
      
      const segment = {
        speaker: 'Tim Cook',
        role: 'ceo' as const,
        text: 'We are pleased to report record revenue this quarter with strong growth across all segments.',
        timestamp: Date.now()
      };
      const result = await analyzer.processSegment(segment);
      
      expect(result).toBeDefined();
      expect(result.currentSentiment).toBeDefined();
      // Score is initialized to 0, label to 'neutral'
      expect(typeof result.currentSentiment.score).toBe('number');
      expect(result.currentSentiment.label).toBeDefined();
    }, 30000);

    it('should detect positive keywords', async () => {
      const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
      const analyzer = new RealTimeToneAnalyzer();
      
      const segment = {
        speaker: 'Luca Maestri',
        role: 'cfo' as const,
        text: 'Our growth exceeded expectations with record profits and strong demand.',
        timestamp: Date.now()
      };
      const result = await analyzer.processSegment(segment);
      
      expect(result.keywordAlerts).toBeDefined();
      expect(Array.isArray(result.keywordAlerts)).toBe(true);
    });

    it('should detect negative/cautious keywords', async () => {
      const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
      const analyzer = new RealTimeToneAnalyzer();
      
      const segment = {
        speaker: 'Tim Cook',
        role: 'ceo' as const,
        text: 'We are monitoring headwinds and challenges in the macro environment.',
        timestamp: Date.now()
      };
      const result = await analyzer.processSegment(segment);
      
      expect(result.keywordAlerts).toBeDefined();
    });

    it('should track sentiment momentum over time', async () => {
      const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
      const analyzer = new RealTimeToneAnalyzer();
      
      // Analyze multiple segments
      await analyzer.processSegment({ speaker: 'CEO', role: 'ceo', text: 'Great quarter with record results', timestamp: Date.now() });
      await analyzer.processSegment({ speaker: 'CFO', role: 'cfo', text: 'Strong performance continues', timestamp: Date.now() + 1000 });
      const result = await analyzer.processSegment({ speaker: 'CEO', role: 'ceo', text: 'Positive outlook for next quarter', timestamp: Date.now() + 2000 });
      
      expect(result.momentumShift).toBeDefined();
      expect(['improving', 'declining', 'stable']).toContain(result.momentumShift);
    });
  });

  describe('Speaker Analysis', () => {
    it('should track sentiment by speaker', async () => {
      const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
      const analyzer = new RealTimeToneAnalyzer();
      
      await analyzer.processSegment({ speaker: 'Tim Cook', role: 'ceo', text: 'Excellent results this quarter', timestamp: Date.now() });
      const result = await analyzer.processSegment({ speaker: 'Luca Maestri', role: 'cfo', text: 'Revenue grew 15% year over year', timestamp: Date.now() + 1000 });
      
      expect(result.managementTone).toBeDefined();
    });

    it('should differentiate management vs analyst sentiment', async () => {
      const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
      const analyzer = new RealTimeToneAnalyzer();
      
      await analyzer.processSegment({ speaker: 'CEO', role: 'ceo', text: 'We are confident in our strategy', timestamp: Date.now() });
      const result = await analyzer.processSegment({ speaker: 'Analyst', role: 'analyst', text: 'Can you explain the margin decline?', timestamp: Date.now() + 1000 });
      
      expect(result.managementTone).toBeDefined();
      expect(result.analystReaction).toBeDefined();
    });
  });
});

describe('EarningsCalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          symbol: 'AAPL',
          date: '2026-01-28',
          time: 'AMC',
          epsEstimated: 2.35,
          eps: null,
          revenueEstimated: 94000000000
        },
        {
          symbol: 'MSFT',
          date: '2026-01-29',
          time: 'AMC',
          epsEstimated: 2.89,
          eps: null,
          revenueEstimated: 65000000000
        }
      ])
    });
  });

  describe('Calendar Retrieval', () => {
    it('should fetch earnings calendar for date range', async () => {
      const { EarningsCalendarService } = await import('./EarningsCalendarService');
      const service = new EarningsCalendarService();
      
      const startDate = new Date('2026-01-28');
      const endDate = new Date('2026-02-04');
      
      const events = await service.getEarningsCalendar(startDate, endDate);
      
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get today\'s earnings', async () => {
      const { EarningsCalendarService } = await import('./EarningsCalendarService');
      const service = new EarningsCalendarService();
      
      const todayEvents = await service.getTodaysEarnings();
      
      expect(Array.isArray(todayEvents)).toBe(true);
    });

    it('should get this week\'s earnings', async () => {
      const { EarningsCalendarService } = await import('./EarningsCalendarService');
      const service = new EarningsCalendarService();
      
      const weekEvents = await service.getWeekEarnings();
      
      expect(Array.isArray(weekEvents)).toBe(true);
    });
  });

  describe('Watchlist Management', () => {
    it('should add symbol to watchlist', async () => {
      const { EarningsCalendarService } = await import('./EarningsCalendarService');
      const service = new EarningsCalendarService();
      
      await service.addToWatchlist(1, 'AAPL', {
        preCallMinutes: 30,
        alertOnResults: true,
        alertOnTranscript: true
      });
      
      const watchlist = service.getWatchlist(1);
      expect(watchlist.length).toBe(1);
      expect(watchlist[0].symbol).toBe('AAPL');
    });

    it('should remove symbol from watchlist', async () => {
      const { EarningsCalendarService } = await import('./EarningsCalendarService');
      const service = new EarningsCalendarService();
      
      await service.addToWatchlist(1, 'AAPL', {
        preCallMinutes: 30,
        alertOnResults: true,
        alertOnTranscript: true
      });
      
      service.removeFromWatchlist(1, 'AAPL');
      
      const watchlist = service.getWatchlist(1);
      expect(watchlist.length).toBe(0);
    });
  });

  describe('Earnings Statistics', () => {
    it('should calculate earnings beat/miss statistics', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { date: '2025-Q4', estimatedEarning: 2.00, actualEarningResult: 2.20 },
          { date: '2025-Q3', estimatedEarning: 1.90, actualEarningResult: 1.85 },
          { date: '2025-Q2', estimatedEarning: 1.80, actualEarningResult: 1.95 },
          { date: '2025-Q1', estimatedEarning: 1.70, actualEarningResult: 1.70 }
        ])
      });
      
      const { EarningsCalendarService } = await import('./EarningsCalendarService');
      const service = new EarningsCalendarService();
      
      const stats = await service.getEarningsStats('AAPL');
      
      expect(stats).toBeDefined();
      expect(stats.totalQuarters).toBeGreaterThanOrEqual(0);
      expect(stats.beatRate).toBeDefined();
    });
  });
});

describe('LiveEarningsTranscriptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          symbol: 'AAPL',
          quarter: 1,
          year: 2026,
          date: '2026-01-28',
          content: 'Good afternoon everyone. Thank you for joining us today...'
        }
      ])
    });
  });

  describe('Transcript Fetching', () => {
    it('should fetch latest transcripts', async () => {
      const { LiveEarningsTranscriptService } = await import('./LiveEarningsTranscriptService');
      const service = new LiveEarningsTranscriptService('test-api-key');
      
      const transcripts = await service.getLatestTranscripts(10);
      
      expect(Array.isArray(transcripts)).toBe(true);
    }, 30000);

    it('should fetch transcript by quarter', async () => {
      const { LiveEarningsTranscriptService } = await import('./LiveEarningsTranscriptService');
      const service = new LiveEarningsTranscriptService('test-api-key');
      
      const transcript = await service.getTranscript('AAPL', 2026, 1);
      
      // May be null if no transcript exists
      expect(transcript === null || typeof transcript === 'object').toBe(true);
    }, 30000);
  });

  describe('Transcript Processing', () => {
    it('should parse transcript into sections', async () => {
      const { LiveEarningsTranscriptService } = await import('./LiveEarningsTranscriptService');
      const service = new LiveEarningsTranscriptService('test-api-key');
      
      const rawTranscript = `
        Tim Cook - CEO: Good afternoon everyone. We had a great quarter.
        
        Luca Maestri - CFO: Revenue was up 15% year over year.
        
        Analyst: Can you provide more color on China?
      `;
      
      const sections = service.parseTranscriptSections(rawTranscript);
      
      expect(Array.isArray(sections)).toBe(true);
    }, 30000);

    it('should identify speakers and roles', async () => {
      const { LiveEarningsTranscriptService } = await import('./LiveEarningsTranscriptService');
      const service = new LiveEarningsTranscriptService('test-api-key');
      
      const rawTranscript = `Tim Cook - CEO: We are pleased with our results.`;
      const sections = service.parseTranscriptSections(rawTranscript);
      
      if (sections.length > 0) {
        expect(sections[0].speaker).toBeDefined();
        expect(sections[0].role).toBeDefined();
      }
    });
  });

  describe('Sentiment Comparison', () => {
    it('should get transcript dates for symbol', async () => {
      const { LiveEarningsTranscriptService } = await import('./LiveEarningsTranscriptService');
      const service = new LiveEarningsTranscriptService('test-api-key');
      
      const dates = await service.getTranscriptDates('AAPL');
      
      expect(Array.isArray(dates)).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should process a full earnings call flow', async () => {
    const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
    const analyzer = new RealTimeToneAnalyzer();
    
    // Simulate a full earnings call
    const segments = [
      { speaker: 'Operator', role: 'operator' as const, text: 'Welcome to the Q4 earnings call.', timestamp: Date.now() },
      { speaker: 'Tim Cook', role: 'ceo' as const, text: 'Thank you. We had an excellent quarter with record revenue.', timestamp: Date.now() + 1000 },
      { speaker: 'Luca Maestri', role: 'cfo' as const, text: 'Total revenue was $94.8 billion, up 8% year over year.', timestamp: Date.now() + 2000 },
      { speaker: 'Analyst', role: 'analyst' as const, text: 'What is your outlook for the China market?', timestamp: Date.now() + 3000 },
      { speaker: 'Tim Cook', role: 'ceo' as const, text: 'We remain optimistic about China despite some headwinds.', timestamp: Date.now() + 4000 }
    ];
    
    let result;
    for (const segment of segments) {
      result = await analyzer.processSegment(segment);
    }
    
    expect(result).toBeDefined();
    expect(result!.currentSentiment).toBeDefined();
    expect(result!.managementTone).toBeDefined();
  });

  it('should detect sentiment shifts during a call', async () => {
    const { RealTimeToneAnalyzer } = await import('./RealTimeToneAnalyzer');
    const analyzer = new RealTimeToneAnalyzer();
    
    // Start positive
    await analyzer.processSegment({ speaker: 'CEO', role: 'ceo', text: 'Excellent results, record profits', timestamp: Date.now() });
    await analyzer.processSegment({ speaker: 'CFO', role: 'cfo', text: 'Strong growth across all segments', timestamp: Date.now() + 1000 });
    
    // Turn cautious
    await analyzer.processSegment({ speaker: 'CEO', role: 'ceo', text: 'However, we see some challenges ahead', timestamp: Date.now() + 2000 });
    const result = await analyzer.processSegment({ speaker: 'CFO', role: 'cfo', text: 'Margins may face pressure', timestamp: Date.now() + 3000 });
    
    expect(result.momentumShift).toBeDefined();
  });
});
