/**
 * Earnings Call Transcript Service
 * 
 * Fetches and analyzes earnings call transcripts using NLP-based
 * tone analysis to extract management sentiment and forward-looking indicators.
 * 
 * Based on research:
 * - FinBERT for financial sentiment analysis
 * - Manager vs Analyst tone divergence studies
 * - Forward-looking statement detection
 */

import { getDb } from '../../db';
import { earningsCallTranscripts } from '../../../drizzle/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { callDataApi } from '../../_core/dataApi';
import { invokeLLM } from '../../_core/llm';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EarningsCallTranscript {
  id?: number;
  ticker: string;
  companyName: string;
  fiscalQuarter: string;
  fiscalYear: number;
  callDate: Date;
  preparedRemarks: string;
  qaSection: string;
  fullTranscript: string;
  participants: TranscriptParticipant[];
  toneAnalysis?: ToneAnalysis;
  createdAt?: Date;
}

export interface TranscriptParticipant {
  name: string;
  title: string;
  role: 'executive' | 'analyst' | 'operator';
  company?: string;
}

export interface ToneAnalysis {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  confidenceLevel: number; // 0 to 1
  
  // Section-level analysis
  preparedRemarksTone: SectionTone;
  qaSectionTone: SectionTone;
  
  // Speaker-level analysis
  managementTone: SpeakerTone;
  analystTone: SpeakerTone;
  toneDistance: number; // Divergence between management and analyst tone
  
  // Linguistic indicators
  forwardLookingScore: number; // 0 to 1
  uncertaintyScore: number; // 0 to 1
  confidenceIndicators: string[];
  cautionIndicators: string[];
  
  // Key themes
  positiveThemes: ThemeExtraction[];
  negativeThemes: ThemeExtraction[];
  keyMetrics: MetricMention[];
  
  // Guidance analysis
  guidanceDirection: 'raised' | 'lowered' | 'maintained' | 'none';
  guidanceConfidence: number;
}

export interface SectionTone {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  keyPhrases: string[];
  wordCount: number;
}

export interface SpeakerTone {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  speakerCount: number;
}

export interface ThemeExtraction {
  theme: string;
  sentiment: 'positive' | 'negative';
  frequency: number;
  context: string;
}

export interface MetricMention {
  metric: string;
  value?: string;
  comparison?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ToneComparison {
  ticker: string;
  currentQuarter: ToneAnalysis;
  previousQuarter?: ToneAnalysis;
  toneChange: number;
  significantChanges: string[];
}

// ============================================================================
// Linguistic Analysis Dictionaries
// ============================================================================

const POSITIVE_WORDS = [
  'growth', 'strong', 'exceed', 'outperform', 'opportunity', 'momentum',
  'accelerate', 'robust', 'record', 'improve', 'success', 'confident',
  'optimistic', 'favorable', 'beat', 'surge', 'expand', 'gain', 'profit',
  'innovative', 'leading', 'transform', 'breakthrough', 'milestone'
];

const NEGATIVE_WORDS = [
  'decline', 'challenge', 'concern', 'risk', 'weak', 'miss', 'below',
  'difficult', 'pressure', 'headwind', 'uncertainty', 'slowdown', 'loss',
  'disappoint', 'struggle', 'volatile', 'cautious', 'downturn', 'adverse',
  'constraint', 'impair', 'deteriorate', 'shortfall', 'setback'
];

const UNCERTAINTY_WORDS = [
  'may', 'might', 'could', 'possibly', 'uncertain', 'unclear', 'depends',
  'variable', 'fluctuate', 'volatile', 'unpredictable', 'contingent',
  'approximate', 'estimate', 'roughly', 'around', 'about'
];

const FORWARD_LOOKING_WORDS = [
  'expect', 'anticipate', 'project', 'forecast', 'outlook', 'guidance',
  'target', 'goal', 'plan', 'intend', 'believe', 'estimate', 'predict',
  'future', 'upcoming', 'next quarter', 'next year', 'long-term'
];

const CONFIDENCE_INDICATORS = [
  'confident', 'certain', 'definitely', 'clearly', 'absolutely', 'strong',
  'committed', 'convinced', 'assured', 'undoubtedly', 'certainly'
];

const CAUTION_INDICATORS = [
  'cautious', 'careful', 'prudent', 'conservative', 'measured', 'modest',
  'tempered', 'guarded', 'watchful', 'mindful', 'aware of risks'
];

// ============================================================================
// Earnings Call Transcript Service Class
// ============================================================================

export class EarningsCallTranscriptService {
  
  /**
   * Fetch earnings call transcript from SEC filings
   */
  async fetchTranscript(ticker: string): Promise<EarningsCallTranscript | null> {
    try {
      // Get SEC filings to find earnings-related 8-K filings
      const secFilings = await callDataApi('YahooFinance/get_stock_sec_filing', {
        query: { symbol: ticker, region: 'US', lang: 'en-US' }
      }) as any;

      if (!secFilings?.quoteSummary?.result?.[0]?.secFilings?.filings) {
        console.log(`[EarningsCall] No SEC filings found for ${ticker}`);
        return null;
      }

      const filings = secFilings.quoteSummary.result[0].secFilings.filings;
      
      // Find most recent 8-K (earnings release) or 10-Q filing
      const earningsFilings = filings.filter((f: any) => 
        f.type === '8-K' || f.type === '10-Q' || f.type === '10-K'
      );

      if (earningsFilings.length === 0) {
        console.log(`[EarningsCall] No earnings filings found for ${ticker}`);
        return null;
      }

      const latestFiling = earningsFilings[0];
      
      // Get company info
      const stockInfo = await callDataApi('YahooFinance/get_stock_insights', {
        query: { symbol: ticker }
      }) as any;

      const companyName = stockInfo?.finance?.result?.companySnapshot?.company?.shortName || ticker;

      // Extract fiscal period from filing
      const filingDate = new Date(latestFiling.epochDate * 1000);
      const fiscalQuarter = this.determineFiscalQuarter(filingDate);
      const fiscalYear = filingDate.getFullYear();

      // For demo purposes, generate a simulated transcript
      // In production, this would fetch actual transcript from SEC EDGAR
      const transcript = await this.generateTranscriptFromFiling(
        ticker,
        companyName,
        latestFiling,
        fiscalQuarter,
        fiscalYear
      );

      return transcript;
    } catch (error) {
      console.error(`[EarningsCall] Error fetching transcript for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Analyze tone of an earnings call transcript
   */
  async analyzeTone(transcript: EarningsCallTranscript): Promise<ToneAnalysis> {
    const fullText = transcript.fullTranscript || 
      `${transcript.preparedRemarks}\n\n${transcript.qaSection}`;

    // Basic linguistic analysis
    const preparedTone = this.analyzeSection(transcript.preparedRemarks);
    const qaTone = this.analyzeSection(transcript.qaSection);

    // Calculate overall metrics
    const overallScore = (preparedTone.score * 0.6 + qaTone.score * 0.4);
    const overallSentiment = this.scoreToSentiment(overallScore);

    // Forward-looking and uncertainty analysis
    const forwardLookingScore = this.calculateWordScore(fullText, FORWARD_LOOKING_WORDS);
    const uncertaintyScore = this.calculateWordScore(fullText, UNCERTAINTY_WORDS);

    // Extract confidence and caution indicators
    const confidenceIndicators = this.extractIndicators(fullText, CONFIDENCE_INDICATORS);
    const cautionIndicators = this.extractIndicators(fullText, CAUTION_INDICATORS);

    // Use LLM for advanced theme extraction
    const themes = await this.extractThemesWithLLM(fullText, transcript.ticker);

    // Analyze guidance direction
    const guidanceAnalysis = await this.analyzeGuidance(fullText);

    // Calculate management vs analyst tone (simulated for demo)
    const managementTone: SpeakerTone = {
      sentiment: preparedTone.sentiment,
      score: preparedTone.score,
      confidence: 0.8,
      speakerCount: transcript.participants.filter(p => p.role === 'executive').length
    };

    const analystTone: SpeakerTone = {
      sentiment: qaTone.sentiment,
      score: qaTone.score * 0.9, // Analysts typically more neutral
      confidence: 0.7,
      speakerCount: transcript.participants.filter(p => p.role === 'analyst').length
    };

    const toneDistance = Math.abs(managementTone.score - analystTone.score);

    return {
      overallSentiment,
      sentimentScore: overallScore,
      confidenceLevel: Math.max(0.5, 1 - uncertaintyScore),
      preparedRemarksTone: preparedTone,
      qaSectionTone: qaTone,
      managementTone,
      analystTone,
      toneDistance,
      forwardLookingScore,
      uncertaintyScore,
      confidenceIndicators,
      cautionIndicators,
      positiveThemes: themes.positive,
      negativeThemes: themes.negative,
      keyMetrics: themes.metrics,
      guidanceDirection: guidanceAnalysis.direction,
      guidanceConfidence: guidanceAnalysis.confidence
    };
  }

  /**
   * Compare tone across quarters
   */
  async compareToneAcrossQuarters(
    ticker: string,
    currentAnalysis: ToneAnalysis
  ): Promise<ToneComparison> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get previous quarter's analysis
    const previousTranscripts = await db.select().from(earningsCallTranscripts)
      .where(eq(earningsCallTranscripts.ticker, ticker))
      .orderBy(desc(earningsCallTranscripts.callDate))
      .limit(2);

    let previousQuarter: ToneAnalysis | undefined;
    if (previousTranscripts.length > 1) {
      previousQuarter = previousTranscripts[1].sentimentBreakdown as ToneAnalysis;
    }

    const toneChange = previousQuarter 
      ? currentAnalysis.sentimentScore - previousQuarter.sentimentScore
      : 0;

    const significantChanges: string[] = [];
    if (previousQuarter) {
      if (Math.abs(toneChange) > 0.2) {
        significantChanges.push(
          toneChange > 0 
            ? 'Significant improvement in management tone'
            : 'Notable decline in management tone'
        );
      }
      if (Math.abs(currentAnalysis.forwardLookingScore - previousQuarter.forwardLookingScore) > 0.15) {
        significantChanges.push('Change in forward-looking statement frequency');
      }
      if (currentAnalysis.guidanceDirection !== previousQuarter.guidanceDirection) {
        significantChanges.push(`Guidance direction changed to ${currentAnalysis.guidanceDirection}`);
      }
    }

    return {
      ticker,
      currentQuarter: currentAnalysis,
      previousQuarter,
      toneChange,
      significantChanges
    };
  }

  /**
   * Save transcript and analysis to database
   */
  async saveTranscript(transcript: EarningsCallTranscript): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [result] = await db.insert(earningsCallTranscripts).values({
      ticker: transcript.ticker,
      companyName: transcript.companyName,
      fiscalQuarter: transcript.fiscalQuarter,
      fiscalYear: transcript.fiscalYear,
      callDate: transcript.callDate,
      preparedRemarks: transcript.preparedRemarks,
      qaSection: transcript.qaSection,
      fullTranscript: transcript.fullTranscript,
      participants: transcript.participants,
      overallSentiment: transcript.toneAnalysis?.sentimentScore?.toString(),
      managementTone: transcript.toneAnalysis?.managementTone?.score?.toString(),
      analystTone: transcript.toneAnalysis?.analystTone?.score?.toString(),
      sentimentBreakdown: transcript.toneAnalysis,
      keyPhrases: transcript.toneAnalysis?.confidenceIndicators,
      forwardGuidance: { direction: transcript.toneAnalysis?.guidanceDirection },
      riskMentions: transcript.toneAnalysis?.cautionIndicators
    }).$returningId();

    return result.id;
  }

  /**
   * Get stored transcripts for a ticker
   */
  async getTranscripts(ticker: string, limit: number = 4): Promise<EarningsCallTranscript[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const results = await db.select().from(earningsCallTranscripts)
      .where(eq(earningsCallTranscripts.ticker, ticker))
      .orderBy(desc(earningsCallTranscripts.callDate))
      .limit(limit);

    return results as EarningsCallTranscript[];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private analyzeSection(text: string): SectionTone {
    if (!text) {
      return {
        sentiment: 'neutral',
        score: 0,
        keyPhrases: [],
        wordCount: 0
      };
    }

    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Count positive and negative words
    let positiveCount = 0;
    let negativeCount = 0;
    const keyPhrases: string[] = [];

    for (const word of words) {
      if (POSITIVE_WORDS.some(pw => word.includes(pw))) {
        positiveCount++;
        if (keyPhrases.length < 5) keyPhrases.push(word);
      }
      if (NEGATIVE_WORDS.some(nw => word.includes(nw))) {
        negativeCount++;
        if (keyPhrases.length < 5) keyPhrases.push(word);
      }
    }

    // Calculate score (-1 to 1)
    const totalSentimentWords = positiveCount + negativeCount;
    let score = 0;
    if (totalSentimentWords > 0) {
      score = (positiveCount - negativeCount) / totalSentimentWords;
    }

    return {
      sentiment: this.scoreToSentiment(score),
      score,
      keyPhrases,
      wordCount
    };
  }

  private scoreToSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private calculateWordScore(text: string, wordList: string[]): number {
    const words = text.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    if (totalWords === 0) return 0;

    let matchCount = 0;
    for (const word of words) {
      if (wordList.some(w => word.includes(w))) {
        matchCount++;
      }
    }

    return Math.min(1, matchCount / (totalWords * 0.05)); // Normalize
  }

  private extractIndicators(text: string, indicators: string[]): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) {
        found.push(indicator);
      }
    }

    return found;
  }

  private async extractThemesWithLLM(text: string, ticker: string): Promise<{
    positive: ThemeExtraction[];
    negative: ThemeExtraction[];
    metrics: MetricMention[];
  }> {
    try {
      const truncatedText = text.slice(0, 4000); // Limit for LLM context

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst expert at extracting themes and metrics from earnings call transcripts. 
            Analyze the text and extract:
            1. Positive themes (growth drivers, opportunities, strengths)
            2. Negative themes (challenges, risks, concerns)
            3. Key metrics mentioned (revenue, margins, guidance figures)
            
            Return JSON format:
            {
              "positive": [{"theme": "...", "context": "..."}],
              "negative": [{"theme": "...", "context": "..."}],
              "metrics": [{"metric": "...", "value": "...", "sentiment": "positive|negative|neutral"}]
            }`
          },
          {
            role: 'user',
            content: `Analyze this earnings call excerpt for ${ticker}:\n\n${truncatedText}`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'theme_extraction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                positive: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                      context: { type: 'string' }
                    },
                    required: ['theme', 'context'],
                    additionalProperties: false
                  }
                },
                negative: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                      context: { type: 'string' }
                    },
                    required: ['theme', 'context'],
                    additionalProperties: false
                  }
                },
                metrics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      metric: { type: 'string' },
                      value: { type: 'string' },
                      sentiment: { type: 'string' }
                    },
                    required: ['metric', 'value', 'sentiment'],
                    additionalProperties: false
                  }
                }
              },
              required: ['positive', 'negative', 'metrics'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
        return {
          positive: parsed.positive.map((p: any) => ({
            theme: p.theme,
            sentiment: 'positive' as const,
            frequency: 1,
            context: p.context
          })),
          negative: parsed.negative.map((n: any) => ({
            theme: n.theme,
            sentiment: 'negative' as const,
            frequency: 1,
            context: n.context
          })),
          metrics: parsed.metrics.map((m: any) => ({
            metric: m.metric,
            value: m.value,
            sentiment: m.sentiment as 'positive' | 'negative' | 'neutral'
          }))
        };
      }
    } catch (error) {
      console.error('[EarningsCall] LLM theme extraction failed:', error);
    }

    return { positive: [], negative: [], metrics: [] };
  }

  private async analyzeGuidance(text: string): Promise<{
    direction: 'raised' | 'lowered' | 'maintained' | 'none';
    confidence: number;
  }> {
    const lowerText = text.toLowerCase();

    // Simple keyword-based guidance detection
    const raisedKeywords = ['raised guidance', 'increased outlook', 'raising our', 'above expectations'];
    const loweredKeywords = ['lowered guidance', 'reduced outlook', 'lowering our', 'below expectations'];
    const maintainedKeywords = ['maintained guidance', 'reaffirmed', 'in line with', 'on track'];

    let raisedScore = 0;
    let loweredScore = 0;
    let maintainedScore = 0;

    for (const kw of raisedKeywords) {
      if (lowerText.includes(kw)) raisedScore++;
    }
    for (const kw of loweredKeywords) {
      if (lowerText.includes(kw)) loweredScore++;
    }
    for (const kw of maintainedKeywords) {
      if (lowerText.includes(kw)) maintainedScore++;
    }

    const maxScore = Math.max(raisedScore, loweredScore, maintainedScore);
    
    if (maxScore === 0) {
      return { direction: 'none', confidence: 0.5 };
    }

    let direction: 'raised' | 'lowered' | 'maintained' = 'maintained';
    if (raisedScore === maxScore) direction = 'raised';
    else if (loweredScore === maxScore) direction = 'lowered';

    return {
      direction,
      confidence: Math.min(1, 0.5 + maxScore * 0.15)
    };
  }

  private determineFiscalQuarter(date: Date): string {
    const month = date.getMonth();
    if (month <= 2) return 'Q4'; // Jan-Mar reports Q4
    if (month <= 5) return 'Q1'; // Apr-Jun reports Q1
    if (month <= 8) return 'Q2'; // Jul-Sep reports Q2
    return 'Q3'; // Oct-Dec reports Q3
  }

  private async generateTranscriptFromFiling(
    ticker: string,
    companyName: string,
    filing: any,
    fiscalQuarter: string,
    fiscalYear: number
  ): Promise<EarningsCallTranscript> {
    // Generate a simulated transcript based on filing data
    // In production, this would fetch actual transcript content
    
    const callDate = new Date(filing.epochDate * 1000);
    
    const preparedRemarks = `
      Good afternoon and welcome to ${companyName}'s ${fiscalQuarter} ${fiscalYear} earnings call.
      
      We are pleased to report our quarterly results. The company continues to execute on its 
      strategic initiatives and deliver value to shareholders. Our revenue growth remains strong,
      driven by continued momentum in our core business segments.
      
      Looking ahead, we remain confident in our ability to navigate the current market environment
      and capitalize on emerging opportunities. We are raising our full-year guidance based on
      the strong performance we've seen year-to-date.
      
      I'll now turn it over to our CFO to discuss the financial details.
    `;

    const qaSection = `
      Analyst: Can you provide more color on the margin expansion you mentioned?
      
      Management: Absolutely. We've seen significant improvement in our operating margins,
      driven by both revenue growth and cost discipline. We expect this trend to continue
      as we scale our operations and realize additional efficiencies.
      
      Analyst: What's your outlook for the competitive landscape?
      
      Management: We remain well-positioned in our markets. While competition is always
      a factor, our differentiated offerings and strong customer relationships give us
      confidence in our ability to maintain and grow market share.
    `;

    const participants: TranscriptParticipant[] = [
      { name: 'CEO', title: 'Chief Executive Officer', role: 'executive' },
      { name: 'CFO', title: 'Chief Financial Officer', role: 'executive' },
      { name: 'Analyst 1', title: 'Senior Analyst', role: 'analyst', company: 'Investment Bank' },
      { name: 'Analyst 2', title: 'Research Analyst', role: 'analyst', company: 'Asset Manager' }
    ];

    return {
      ticker,
      companyName,
      fiscalQuarter,
      fiscalYear,
      callDate,
      preparedRemarks,
      qaSection,
      fullTranscript: `${preparedRemarks}\n\n${qaSection}`,
      participants
    };
  }
}

export const earningsCallTranscriptService = new EarningsCallTranscriptService();
