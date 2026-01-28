/**
 * Enhanced Fundamental Analyst Agent with SEC EDGAR RAG Integration
 * 
 * Integrates live SEC filings with RAG-based analysis for deep
 * fundamental research on 10-K, 10-Q, and 8-K filings.
 */

import { invokeLLM } from '../../_core/llm';
import { callDataApi } from '../../_core/dataApi';
import { secEdgarService, SECFiling, CompanyFacts } from '../sec-edgar/SECEdgarService';
import { secFilingRAG, ParsedFiling, FilingSummary, FilingQAResult } from '../sec-edgar/SECFilingRAG';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EnhancedFundamentalSignal {
  agent: string;
  ticker: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  rationale: string;
  keyFindings: string[];
  risks: string[];
  timestamp: Date;
  dataPoints: Record<string, any>;
  secAnalysis: {
    latestFilingDate: string;
    latestFilingType: string;
    filingSummary?: FilingSummary;
    riskFactorChanges?: string[];
    mdaHighlights?: string[];
    financialMetrics: Record<string, any>;
  };
}

export interface DeepDiveRequest {
  ticker: string;
  focusAreas?: ('risk_factors' | 'mda' | 'business' | 'financials' | 'compensation')[];
  compareYoY?: boolean;
  specificQuestions?: string[];
}

export interface DeepDiveResult {
  ticker: string;
  filingDate: string;
  filingType: string;
  summary: FilingSummary;
  sectionAnalysis: {
    section: string;
    analysis: string;
    keyPoints: string[];
    concerns: string[];
  }[];
  yoyComparison?: {
    area: string;
    changes: string[];
    significance: 'high' | 'medium' | 'low';
  }[];
  questionAnswers?: FilingQAResult[];
  overallAssessment: {
    signal: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    investmentThesis: string;
  };
}

// ============================================================================
// Enhanced Fundamental Analyst Agent
// ============================================================================

export class EnhancedFundamentalAnalyst {
  private name = 'Enhanced Fundamental Analyst';
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = `You are an elite Fundamental Analyst with expertise in SEC filings analysis.
You have access to actual 10-K, 10-Q, and 8-K filings from SEC EDGAR.
Your analysis goes beyond surface-level metrics to uncover:

1. **Hidden Risks in Footnotes**: Identify off-balance-sheet liabilities, contingent obligations, 
   and accounting policy changes that could materially impact the company.

2. **Revenue Quality Assessment**: Evaluate revenue recognition policies, customer concentration,
   contract terms, and deferred revenue trends.

3. **Cash Flow Analysis**: Distinguish between operating cash flow quality, capex requirements,
   working capital trends, and free cash flow sustainability.

4. **Debt & Liquidity**: Analyze debt maturities, covenant compliance, credit facility availability,
   and refinancing risks.

5. **Management Signals**: Decode MD&A language changes, guidance tone shifts, and executive
   compensation alignment with shareholder interests.

6. **Competitive Position**: Assess market share trends, pricing power, and competitive moats
   from business description changes.

Always cite specific sections and provide page references when possible.
Be skeptical and look for what management is NOT saying.`;
  }

  /**
   * Perform enhanced fundamental analysis with live SEC filings
   */
  async analyze(ticker: string): Promise<EnhancedFundamentalSignal> {
    console.log(`[${this.name}] Starting enhanced analysis for ${ticker}`);

    // Fetch company data in parallel
    const [cik, yahooData, xbrlMetrics] = await Promise.all([
      secEdgarService.getCIKByTicker(ticker),
      this.fetchYahooData(ticker),
      secEdgarService.extractKeyMetrics(ticker)
    ]);

    if (!cik) {
      console.warn(`[${this.name}] Could not find CIK for ${ticker}`);
      return this.createDefaultSignal(ticker, 'Unable to find SEC filings');
    }

    // Get recent filings
    const [filings10K, filings10Q] = await Promise.all([
      secEdgarService.get10KFilings(ticker, 2),
      secEdgarService.get10QFilings(ticker, 4)
    ]);

    const latestFiling = filings10K[0] || filings10Q[0];
    if (!latestFiling) {
      return this.createDefaultSignal(ticker, 'No recent SEC filings found');
    }

    // Parse and analyze the latest filing
    const parsedFiling = await secFilingRAG.parseFiling(ticker, latestFiling);
    if (!parsedFiling) {
      return this.createDefaultSignal(ticker, 'Failed to parse SEC filing');
    }

    // Generate filing summary
    const filingSummary = await secFilingRAG.generateSummary(parsedFiling);

    // Extract key sections for analysis
    const riskSection = secFilingRAG.getSection(parsedFiling, 'Risk Factors');
    const mdaSection = secFilingRAG.getSection(parsedFiling, 'MD&A');
    const businessSection = secFilingRAG.getSection(parsedFiling, 'Business');

    // Perform deep analysis with LLM
    const analysisPrompt = this.buildAnalysisPrompt(
      ticker,
      filingSummary,
      riskSection?.content.substring(0, 5000),
      mdaSection?.content.substring(0, 5000),
      businessSection?.content.substring(0, 3000),
      xbrlMetrics,
      yahooData
    );

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: analysisPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'fundamental_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
              confidence: { type: 'number' },
              rationale: { type: 'string' },
              keyFindings: { type: 'array', items: { type: 'string' } },
              risks: { type: 'array', items: { type: 'string' } },
              riskFactorHighlights: { type: 'array', items: { type: 'string' } },
              mdaHighlights: { type: 'array', items: { type: 'string' } }
            },
            required: ['signal', 'confidence', 'rationale', 'keyFindings', 'risks', 'riskFactorHighlights', 'mdaHighlights'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    let analysis = {
      signal: 'neutral' as const,
      confidence: 50,
      rationale: 'Analysis not available',
      keyFindings: [] as string[],
      risks: [] as string[],
      riskFactorHighlights: [] as string[],
      mdaHighlights: [] as string[]
    };

    if (content) {
      try {
        analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      } catch {
        // Keep defaults
      }
    }

    return {
      agent: this.name,
      ticker,
      signal: analysis.signal,
      confidence: analysis.confidence,
      rationale: analysis.rationale,
      keyFindings: analysis.keyFindings,
      risks: analysis.risks,
      timestamp: new Date(),
      dataPoints: xbrlMetrics || {},
      secAnalysis: {
        latestFilingDate: latestFiling.filingDate,
        latestFilingType: latestFiling.form,
        filingSummary,
        riskFactorChanges: analysis.riskFactorHighlights,
        mdaHighlights: analysis.mdaHighlights,
        financialMetrics: xbrlMetrics || {}
      }
    };
  }

  /**
   * Perform deep dive analysis on specific areas
   */
  async deepDive(request: DeepDiveRequest): Promise<DeepDiveResult> {
    const { ticker, focusAreas = ['risk_factors', 'mda'], compareYoY = false, specificQuestions = [] } = request;

    // Get filings
    const filings10K = await secEdgarService.get10KFilings(ticker, 2);
    const latestFiling = filings10K[0];

    if (!latestFiling) {
      throw new Error(`No 10-K filings found for ${ticker}`);
    }

    // Parse filing
    const parsedFiling = await secFilingRAG.parseFiling(ticker, latestFiling);
    if (!parsedFiling) {
      throw new Error(`Failed to parse filing for ${ticker}`);
    }

    // Generate summary
    const summary = await secFilingRAG.generateSummary(parsedFiling);

    // Analyze each focus area
    const sectionAnalysis: DeepDiveResult['sectionAnalysis'] = [];

    for (const area of focusAreas) {
      const sectionName = this.mapAreaToSection(area);
      const section = secFilingRAG.getSection(parsedFiling, sectionName);

      if (section) {
        const analysis = await this.analyzeSectionDeep(ticker, section.title, section.content);
        sectionAnalysis.push(analysis);
      }
    }

    // YoY comparison if requested
    let yoyComparison: DeepDiveResult['yoyComparison'];
    if (compareYoY && filings10K.length >= 2) {
      const previousFiling = await secFilingRAG.parseFiling(ticker, filings10K[1]);
      if (previousFiling) {
        const comparison = await secFilingRAG.compareFilings(
          previousFiling,
          parsedFiling,
          'risk factors'
        );
        yoyComparison = comparison.changes.map(c => ({
          area: c.area,
          changes: [c.change],
          significance: c.significance
        }));
      }
    }

    // Answer specific questions
    let questionAnswers: FilingQAResult[] | undefined;
    if (specificQuestions.length > 0) {
      questionAnswers = await Promise.all(
        specificQuestions.map(q => secFilingRAG.askQuestion(parsedFiling, q))
      );
    }

    // Generate overall assessment
    const overallAssessment = await this.generateOverallAssessment(
      ticker,
      summary,
      sectionAnalysis,
      yoyComparison
    );

    return {
      ticker,
      filingDate: latestFiling.filingDate,
      filingType: latestFiling.form,
      summary,
      sectionAnalysis,
      yoyComparison,
      questionAnswers,
      overallAssessment
    };
  }

  /**
   * Ask a specific question about a company's filings
   */
  async askQuestion(ticker: string, question: string): Promise<FilingQAResult> {
    const filings10K = await secEdgarService.get10KFilings(ticker, 1);
    const filings10Q = await secEdgarService.get10QFilings(ticker, 1);
    
    const latestFiling = filings10K[0] || filings10Q[0];
    if (!latestFiling) {
      return {
        question,
        answer: `No SEC filings found for ${ticker}`,
        sources: [],
        confidence: 0
      };
    }

    const parsedFiling = await secFilingRAG.parseFiling(ticker, latestFiling);
    if (!parsedFiling) {
      return {
        question,
        answer: `Failed to parse SEC filing for ${ticker}`,
        sources: [],
        confidence: 0
      };
    }

    return secFilingRAG.askQuestion(parsedFiling, question);
  }

  /**
   * Get filing summary for a ticker
   */
  async getFilingSummary(ticker: string, filingType: '10-K' | '10-Q' = '10-K'): Promise<FilingSummary | null> {
    const filings = filingType === '10-K' 
      ? await secEdgarService.get10KFilings(ticker, 1)
      : await secEdgarService.get10QFilings(ticker, 1);

    if (filings.length === 0) return null;

    const parsedFiling = await secFilingRAG.parseFiling(ticker, filings[0]);
    if (!parsedFiling) return null;

    return secFilingRAG.generateSummary(parsedFiling);
  }

  /**
   * Get key financial metrics from XBRL
   */
  async getFinancialMetrics(ticker: string): Promise<Record<string, any> | null> {
    return secEdgarService.extractKeyMetrics(ticker);
  }

  /**
   * List available SEC filings for a ticker
   */
  async listFilings(ticker: string, limit: number = 20): Promise<SECFiling[]> {
    const cik = await secEdgarService.getCIKByTicker(ticker);
    if (!cik) return [];

    const submissions = await secEdgarService.getCompanySubmissions(cik);
    if (!submissions) return [];

    return submissions.filings
      .filter(f => ['10-K', '10-Q', '8-K', '10-K/A', '10-Q/A'].includes(f.form))
      .slice(0, limit);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildAnalysisPrompt(
    ticker: string,
    summary: FilingSummary,
    riskFactors?: string,
    mda?: string,
    business?: string,
    xbrlMetrics?: Record<string, any> | null,
    yahooData?: any
  ): string {
    return `Analyze ${ticker} based on the following SEC filing data:

## FILING SUMMARY
- Form: ${summary.form}
- Filing Date: ${summary.filingDate}
- Executive Summary: ${summary.executiveSummary}

## KEY HIGHLIGHTS
${summary.keyHighlights.map(h => `- ${h}`).join('\n')}

## RISK FACTORS (from filing)
${summary.riskFactors.map(r => `- ${r}`).join('\n')}

## MANAGEMENT OUTLOOK
${summary.managementOutlook}

${riskFactors ? `## RISK FACTORS SECTION (excerpt)
${riskFactors.substring(0, 3000)}...` : ''}

${mda ? `## MD&A SECTION (excerpt)
${mda.substring(0, 3000)}...` : ''}

${business ? `## BUSINESS SECTION (excerpt)
${business.substring(0, 2000)}...` : ''}

${xbrlMetrics ? `## XBRL FINANCIAL METRICS
${Object.entries(xbrlMetrics).map(([k, v]: [string, any]) => 
  `- ${k}: ${v.value?.toLocaleString() || 'N/A'} (${v.period || 'N/A'})`
).join('\n')}` : ''}

${yahooData ? `## MARKET DATA
- Current Price: $${yahooData.currentPrice || 'N/A'}
- Market Cap: $${yahooData.marketCap?.toLocaleString() || 'N/A'}
- P/E Ratio: ${yahooData.peRatio || 'N/A'}
- 52-Week Range: $${yahooData.fiftyTwoWeekLow || 'N/A'} - $${yahooData.fiftyTwoWeekHigh || 'N/A'}` : ''}

Based on this comprehensive analysis of actual SEC filings:
1. What is your investment signal (bullish/bearish/neutral)?
2. What is your confidence level (0-100)?
3. What are the key findings that support your thesis?
4. What are the main risks investors should be aware of?
5. What specific risk factors from the filing are most concerning?
6. What are the key highlights from the MD&A section?`;
  }

  private async fetchYahooData(ticker: string): Promise<any> {
    try {
      const result = await callDataApi('YahooFinance/get_stock_chart', {
        query: { symbol: ticker, range: '1d', interval: '1d' }
      }) as any;

      const meta = result?.chart?.result?.[0]?.meta;
      if (meta) {
        return {
          currentPrice: meta.regularMarketPrice,
          marketCap: meta.marketCap,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow
        };
      }
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch Yahoo data:`, error);
    }
    return null;
  }

  private mapAreaToSection(area: string): string {
    const mapping: Record<string, string> = {
      'risk_factors': 'Risk Factors',
      'mda': 'MD&A',
      'business': 'Business',
      'financials': 'Financial Statements',
      'compensation': 'Executive Compensation'
    };
    return mapping[area] || area;
  }

  private async analyzeSectionDeep(
    ticker: string,
    sectionTitle: string,
    content: string
  ): Promise<{ section: string; analysis: string; keyPoints: string[]; concerns: string[] }> {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are analyzing the ${sectionTitle} section of a SEC filing for ${ticker}.
Provide a detailed analysis focusing on material information for investors.`
        },
        {
          role: 'user',
          content: `Analyze this ${sectionTitle} section:

${content.substring(0, 8000)}

Provide:
1. A summary analysis
2. Key points investors should know
3. Any concerns or red flags`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'section_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              analysis: { type: 'string' },
              keyPoints: { type: 'array', items: { type: 'string' } },
              concerns: { type: 'array', items: { type: 'string' } }
            },
            required: ['analysis', 'keyPoints', 'concerns'],
            additionalProperties: false
          }
        }
      }
    });

    const responseContent = response.choices[0]?.message?.content;
    let parsed = { analysis: 'Analysis not available', keyPoints: [] as string[], concerns: [] as string[] };

    if (responseContent) {
      try {
        parsed = JSON.parse(typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent));
      } catch {
        // Keep defaults
      }
    }

    return {
      section: sectionTitle,
      ...parsed
    };
  }

  private async generateOverallAssessment(
    ticker: string,
    summary: FilingSummary,
    sectionAnalysis: DeepDiveResult['sectionAnalysis'],
    yoyComparison?: DeepDiveResult['yoyComparison']
  ): Promise<DeepDiveResult['overallAssessment']> {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are generating an overall investment assessment for ${ticker} based on SEC filing analysis.`
        },
        {
          role: 'user',
          content: `Based on the following analysis:

SUMMARY:
${summary.executiveSummary}

SECTION ANALYSES:
${sectionAnalysis.map(s => `${s.section}: ${s.analysis}`).join('\n\n')}

${yoyComparison ? `YOY CHANGES:
${yoyComparison.map(c => `- ${c.area}: ${c.changes.join(', ')} (${c.significance})`).join('\n')}` : ''}

Provide an overall investment assessment with signal, confidence, and thesis.`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'overall_assessment',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
              confidence: { type: 'number' },
              investmentThesis: { type: 'string' }
            },
            required: ['signal', 'confidence', 'investmentThesis'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    let parsed = {
      signal: 'neutral' as const,
      confidence: 50,
      investmentThesis: 'Assessment not available'
    };

    if (content) {
      try {
        parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      } catch {
        // Keep defaults
      }
    }

    return parsed;
  }

  private createDefaultSignal(ticker: string, reason: string): EnhancedFundamentalSignal {
    return {
      agent: this.name,
      ticker,
      signal: 'neutral',
      confidence: 0,
      rationale: reason,
      keyFindings: [],
      risks: [reason],
      timestamp: new Date(),
      dataPoints: {},
      secAnalysis: {
        latestFilingDate: '',
        latestFilingType: '',
        financialMetrics: {}
      }
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEnhancedFundamentalAnalyst(): EnhancedFundamentalAnalyst {
  return new EnhancedFundamentalAnalyst();
}

// Export singleton instance
export const enhancedFundamentalAnalyst = new EnhancedFundamentalAnalyst();
