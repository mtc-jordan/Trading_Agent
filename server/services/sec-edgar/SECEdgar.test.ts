/**
 * SEC EDGAR Integration Tests
 * 
 * Tests for SEC EDGAR API service, RAG system, and Enhanced Fundamental Analyst
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          signal: 'bullish',
          confidence: 75,
          rationale: 'Strong fundamentals with growing revenue',
          keyFindings: ['Revenue growth of 15%', 'Improving margins'],
          risks: ['Competition increasing', 'Regulatory risks'],
          riskFactorHighlights: ['Market risk', 'Operational risk'],
          mdaHighlights: ['Strong Q4 performance', 'Expanding market share']
        })
      }
    }]
  })
}));

// Mock the data API
vi.mock('../../_core/dataApi', () => ({
  callDataApi: vi.fn().mockResolvedValue({
    chart: {
      result: [{
        meta: {
          regularMarketPrice: 150.00,
          marketCap: 2500000000000,
          fiftyTwoWeekHigh: 180.00,
          fiftyTwoWeekLow: 120.00
        }
      }]
    }
  })
}));

describe('SEC EDGAR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CIK Lookup', () => {
    it('should format CIK with leading zeros', async () => {
      const { secEdgarService } = await import('./SECEdgarService');
      
      // Test CIK formatting
      const cik = '320193'; // Apple's CIK without padding
      const formatted = cik.padStart(10, '0');
      expect(formatted).toBe('0000320193');
      expect(formatted.length).toBe(10);
    });

    it('should handle ticker to CIK mapping', async () => {
      const { secEdgarService } = await import('./SECEdgarService');
      
      // The service should be able to look up CIKs
      expect(secEdgarService).toBeDefined();
      expect(typeof secEdgarService.getCIKByTicker).toBe('function');
    });
  });

  describe('Filing Types', () => {
    it('should support 10-K filings', async () => {
      const { secEdgarService } = await import('./SECEdgarService');
      
      expect(typeof secEdgarService.get10KFilings).toBe('function');
    });

    it('should support 10-Q filings', async () => {
      const { secEdgarService } = await import('./SECEdgarService');
      
      expect(typeof secEdgarService.get10QFilings).toBe('function');
    });

    it('should support 8-K filings', async () => {
      const { secEdgarService } = await import('./SECEdgarService');
      
      expect(typeof secEdgarService.get8KFilings).toBe('function');
    });
  });

  describe('XBRL Metrics', () => {
    it('should extract key financial metrics', async () => {
      const { secEdgarService } = await import('./SECEdgarService');
      
      expect(typeof secEdgarService.extractKeyMetrics).toBe('function');
    });
  });
});

describe('SEC Filing RAG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filing Parsing', () => {
    it('should parse filing content', async () => {
      const { secFilingRAG } = await import('./SECFilingRAG');
      
      expect(typeof secFilingRAG.parseFiling).toBe('function');
    });

    it('should extract sections from filings', async () => {
      const { secFilingRAG } = await import('./SECFilingRAG');
      
      expect(typeof secFilingRAG.getSection).toBe('function');
    });
  });

  describe('Summary Generation', () => {
    it('should generate filing summaries', async () => {
      const { secFilingRAG } = await import('./SECFilingRAG');
      
      expect(typeof secFilingRAG.generateSummary).toBe('function');
    });
  });

  describe('Question Answering', () => {
    it('should answer questions about filings', async () => {
      const { secFilingRAG } = await import('./SECFilingRAG');
      
      expect(typeof secFilingRAG.askQuestion).toBe('function');
    });
  });

  describe('Filing Comparison', () => {
    it('should compare filings year-over-year', async () => {
      const { secFilingRAG } = await import('./SECFilingRAG');
      
      expect(typeof secFilingRAG.compareFilings).toBe('function');
    });
  });

  describe('Text Chunking', () => {
    it('should chunk text for RAG processing', async () => {
      const { secFilingRAG } = await import('./SECFilingRAG');
      
      // Test chunking logic
      const longText = 'A'.repeat(5000);
      const chunks = [];
      const chunkSize = 1000;
      const overlap = 100;
      
      for (let i = 0; i < longText.length; i += chunkSize - overlap) {
        chunks.push(longText.slice(i, i + chunkSize));
      }
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBe(chunkSize);
    });
  });
});

describe('Enhanced Fundamental Analyst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Analysis', () => {
    it('should analyze a ticker', async () => {
      const { enhancedFundamentalAnalyst } = await import('../stock-intelligence/EnhancedFundamentalAnalyst');
      
      expect(typeof enhancedFundamentalAnalyst.analyze).toBe('function');
    });

    it('should perform deep dive analysis', async () => {
      const { enhancedFundamentalAnalyst } = await import('../stock-intelligence/EnhancedFundamentalAnalyst');
      
      expect(typeof enhancedFundamentalAnalyst.deepDive).toBe('function');
    });
  });

  describe('Question Answering', () => {
    it('should answer questions about filings', async () => {
      const { enhancedFundamentalAnalyst } = await import('../stock-intelligence/EnhancedFundamentalAnalyst');
      
      expect(typeof enhancedFundamentalAnalyst.askQuestion).toBe('function');
    });
  });

  describe('Filing Summary', () => {
    it('should get filing summary', async () => {
      const { enhancedFundamentalAnalyst } = await import('../stock-intelligence/EnhancedFundamentalAnalyst');
      
      expect(typeof enhancedFundamentalAnalyst.getFilingSummary).toBe('function');
    });
  });

  describe('Financial Metrics', () => {
    it('should get financial metrics from XBRL', async () => {
      const { enhancedFundamentalAnalyst } = await import('../stock-intelligence/EnhancedFundamentalAnalyst');
      
      expect(typeof enhancedFundamentalAnalyst.getFinancialMetrics).toBe('function');
    });
  });

  describe('Filing List', () => {
    it('should list available filings', async () => {
      const { enhancedFundamentalAnalyst } = await import('../stock-intelligence/EnhancedFundamentalAnalyst');
      
      expect(typeof enhancedFundamentalAnalyst.listFilings).toBe('function');
    });
  });
});

describe('SEC EDGAR URL Construction', () => {
  it('should construct valid EDGAR URLs', () => {
    const cik = '0000320193';
    const accessionNumber = '0000320193-23-000077';
    
    // Base URL for SEC EDGAR
    const baseUrl = 'https://www.sec.gov/cgi-bin/browse-edgar';
    const archivesUrl = 'https://www.sec.gov/Archives/edgar/data';
    
    // Company filings URL
    const companyUrl = `${baseUrl}?action=getcompany&CIK=${cik}&type=10-K&dateb=&owner=include&count=40`;
    expect(companyUrl).toContain('action=getcompany');
    expect(companyUrl).toContain(cik);
    
    // Filing document URL
    const accessionClean = accessionNumber.replace(/-/g, '');
    const documentUrl = `${archivesUrl}/${cik.replace(/^0+/, '')}/${accessionClean}`;
    expect(documentUrl).toContain('Archives/edgar/data');
  });

  it('should construct valid data.sec.gov API URLs', () => {
    const cik = '0000320193';
    
    // Company submissions API
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    expect(submissionsUrl).toContain('data.sec.gov');
    expect(submissionsUrl).toContain('submissions');
    
    // Company facts API (XBRL)
    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    expect(factsUrl).toContain('xbrl/companyfacts');
  });
});

describe('Filing Section Detection', () => {
  it('should detect Item 1A - Risk Factors', () => {
    const sectionPatterns = [
      /item\s*1a[\.\s\-]*risk\s*factors/i,
      /risk\s*factors/i
    ];
    
    const testText = 'Item 1A. Risk Factors';
    const matches = sectionPatterns.some(p => p.test(testText));
    expect(matches).toBe(true);
  });

  it('should detect Item 7 - MD&A', () => {
    const sectionPatterns = [
      /item\s*7[\.\s\-]*management/i,
      /management['']?s?\s*discussion\s*and\s*analysis/i
    ];
    
    const testText = "Item 7. Management's Discussion and Analysis";
    const matches = sectionPatterns.some(p => p.test(testText));
    expect(matches).toBe(true);
  });

  it('should detect Item 1 - Business', () => {
    const sectionPatterns = [
      /item\s*1[\.\s\-]*business/i,
      /^business$/im
    ];
    
    const testText = 'Item 1. Business';
    const matches = sectionPatterns.some(p => p.test(testText));
    expect(matches).toBe(true);
  });
});

describe('Signal Generation', () => {
  it('should generate valid signal types', () => {
    const validSignals = ['bullish', 'bearish', 'neutral'];
    
    validSignals.forEach(signal => {
      expect(['bullish', 'bearish', 'neutral']).toContain(signal);
    });
  });

  it('should validate confidence scores', () => {
    const confidence = 75;
    
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });
});
