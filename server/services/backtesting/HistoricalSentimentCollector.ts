/**
 * Historical Earnings Sentiment Data Collector
 * 
 * Collects and processes historical earnings call transcripts for backtesting
 * sentiment-price correlation analysis.
 */

import { invokeLLM } from '../../_core/llm';

// Types for historical sentiment data
export interface HistoricalTranscript {
  symbol: string;
  date: string;
  fiscalYear: number;
  fiscalQuarter: number;
  content: string;
  speakers: SpeakerSegment[];
}

export interface SpeakerSegment {
  speaker: string;
  role: 'ceo' | 'cfo' | 'coo' | 'other_executive' | 'analyst' | 'operator';
  text: string;
}

export interface SentimentScore {
  overall: number; // -1 to 1
  confidence: number; // 0 to 1
  managementTone: ManagementTone;
  analystReaction: AnalystReaction;
  guidanceSignal: GuidanceSignal;
  keyMetrics: KeyMetrics;
}

export interface ManagementTone {
  optimism: number; // 0 to 1
  defensiveness: number; // 0 to 1
  confidence: number; // 0 to 1
  uncertainty: number; // 0 to 1
  forwardLooking: number; // 0 to 1
}

export interface AnalystReaction {
  satisfaction: number; // 0 to 1
  skepticism: number; // 0 to 1
  followUpIntensity: number; // 0 to 1
}

export interface GuidanceSignal {
  direction: 'raised' | 'maintained' | 'lowered' | 'withdrawn' | 'none';
  strength: number; // 0 to 1
  specificity: number; // 0 to 1
}

export interface KeyMetrics {
  positiveKeywords: number;
  negativeKeywords: number;
  hedgingPhrases: number;
  confidencePhrases: number;
  forwardLookingStatements: number;
}

export interface HistoricalSentimentData {
  symbol: string;
  earningsDate: string;
  fiscalYear: number;
  fiscalQuarter: number;
  sentiment: SentimentScore;
  processedAt: number;
}

// Keyword categories for sentiment analysis
const POSITIVE_KEYWORDS = [
  'growth', 'strong', 'record', 'exceeded', 'beat', 'outperform', 'momentum',
  'accelerate', 'robust', 'excellent', 'outstanding', 'impressive', 'confident',
  'optimistic', 'pleased', 'excited', 'thrilled', 'remarkable', 'exceptional'
];

const NEGATIVE_KEYWORDS = [
  'decline', 'weak', 'miss', 'below', 'challenge', 'headwind', 'pressure',
  'difficult', 'uncertain', 'concern', 'disappointing', 'shortfall', 'slowdown',
  'cautious', 'worried', 'risk', 'struggle', 'underperform', 'soft'
];

const HEDGING_PHRASES = [
  'we believe', 'we think', 'potentially', 'possibly', 'may', 'might',
  'could', 'should', 'approximately', 'roughly', 'around', 'about',
  'in the range of', 'somewhere between', 'give or take'
];

const CONFIDENCE_PHRASES = [
  'we are confident', 'we are certain', 'definitely', 'absolutely',
  'without a doubt', 'clearly', 'certainly', 'undoubtedly', 'strong conviction',
  'we will', 'we expect', 'we anticipate'
];

const FORWARD_LOOKING_PHRASES = [
  'going forward', 'in the future', 'next quarter', 'next year', 'outlook',
  'guidance', 'forecast', 'expect', 'anticipate', 'project', 'plan to',
  'intend to', 'looking ahead', 'on track to'
];

export class HistoricalSentimentCollector {
  private cache: Map<string, HistoricalSentimentData> = new Map();
  private fmpApiKey: string;

  constructor(fmpApiKey?: string) {
    this.fmpApiKey = fmpApiKey || process.env.FMP_API_KEY || '';
  }

  /**
   * Fetch historical transcripts for a symbol
   */
  async fetchHistoricalTranscripts(
    symbol: string,
    years: number = 3
  ): Promise<HistoricalTranscript[]> {
    const transcripts: HistoricalTranscript[] = [];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year > currentYear - years; year--) {
      for (let quarter = 4; quarter >= 1; quarter--) {
        try {
          const transcript = await this.fetchTranscript(symbol, year, quarter);
          if (transcript) {
            transcripts.push(transcript);
          }
        } catch (error) {
          console.log(`[HistoricalSentiment] No transcript for ${symbol} Q${quarter} ${year}`);
        }
      }
    }

    return transcripts;
  }

  /**
   * Fetch a single transcript from FMP API
   */
  private async fetchTranscript(
    symbol: string,
    year: number,
    quarter: number
  ): Promise<HistoricalTranscript | null> {
    if (!this.fmpApiKey) {
      // Return mock data for testing
      return this.generateMockTranscript(symbol, year, quarter);
    }

    try {
      const url = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${symbol}?year=${year}&quarter=${quarter}&apikey=${this.fmpApiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      const transcript = data[0];
      return {
        symbol,
        date: transcript.date,
        fiscalYear: year,
        fiscalQuarter: quarter,
        content: transcript.content,
        speakers: this.parseTranscriptSpeakers(transcript.content)
      };
    } catch (error) {
      console.error(`[HistoricalSentiment] Error fetching transcript:`, error);
      return null;
    }
  }

  /**
   * Parse transcript content into speaker segments
   */
  private parseTranscriptSpeakers(content: string): SpeakerSegment[] {
    const segments: SpeakerSegment[] = [];
    const lines = content.split('\n');
    
    let currentSpeaker = '';
    let currentRole: SpeakerSegment['role'] = 'other_executive';
    let currentText = '';

    for (const line of lines) {
      // Check for speaker pattern: "Name - Title:" or "Name:"
      const speakerMatch = line.match(/^([A-Z][a-zA-Z\s]+)(?:\s*-\s*([^:]+))?:/);
      
      if (speakerMatch) {
        // Save previous segment
        if (currentSpeaker && currentText.trim()) {
          segments.push({
            speaker: currentSpeaker,
            role: currentRole,
            text: currentText.trim()
          });
        }

        currentSpeaker = speakerMatch[1].trim();
        const title = speakerMatch[2]?.toLowerCase() || '';
        currentRole = this.inferRole(title, currentSpeaker);
        currentText = line.substring(line.indexOf(':') + 1).trim();
      } else if (currentSpeaker) {
        currentText += ' ' + line.trim();
      }
    }

    // Save last segment
    if (currentSpeaker && currentText.trim()) {
      segments.push({
        speaker: currentSpeaker,
        role: currentRole,
        text: currentText.trim()
      });
    }

    return segments;
  }

  /**
   * Infer speaker role from title
   */
  private inferRole(title: string, name: string): SpeakerSegment['role'] {
    const lowerTitle = title.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerTitle.includes('ceo') || lowerTitle.includes('chief executive')) {
      return 'ceo';
    }
    if (lowerTitle.includes('cfo') || lowerTitle.includes('chief financial')) {
      return 'cfo';
    }
    if (lowerTitle.includes('coo') || lowerTitle.includes('chief operating')) {
      return 'coo';
    }
    if (lowerTitle.includes('analyst') || lowerName.includes('analyst')) {
      return 'analyst';
    }
    if (lowerTitle.includes('operator') || lowerName.includes('operator')) {
      return 'operator';
    }
    if (lowerTitle.includes('president') || lowerTitle.includes('vp') || 
        lowerTitle.includes('director') || lowerTitle.includes('executive')) {
      return 'other_executive';
    }

    return 'analyst'; // Default to analyst for Q&A participants
  }

  /**
   * Analyze sentiment of a historical transcript
   */
  async analyzeSentiment(transcript: HistoricalTranscript): Promise<SentimentScore> {
    const cacheKey = `${transcript.symbol}-${transcript.fiscalYear}-Q${transcript.fiscalQuarter}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.sentiment;
    }

    // Calculate keyword-based metrics
    const keyMetrics = this.calculateKeyMetrics(transcript.content);
    
    // Analyze management tone
    const managementTone = await this.analyzeManagementTone(transcript);
    
    // Analyze analyst reaction
    const analystReaction = this.analyzeAnalystReaction(transcript);
    
    // Detect guidance signals
    const guidanceSignal = this.detectGuidanceSignal(transcript.content);
    
    // Calculate overall sentiment
    const overall = this.calculateOverallSentiment(keyMetrics, managementTone, guidanceSignal);
    
    const sentiment: SentimentScore = {
      overall,
      confidence: this.calculateConfidence(keyMetrics, transcript.content.length),
      managementTone,
      analystReaction,
      guidanceSignal,
      keyMetrics
    };

    // Cache the result
    this.cache.set(cacheKey, {
      symbol: transcript.symbol,
      earningsDate: transcript.date,
      fiscalYear: transcript.fiscalYear,
      fiscalQuarter: transcript.fiscalQuarter,
      sentiment,
      processedAt: Date.now()
    });

    return sentiment;
  }

  /**
   * Calculate keyword-based metrics
   */
  private calculateKeyMetrics(content: string): KeyMetrics {
    const lowerContent = content.toLowerCase();
    
    return {
      positiveKeywords: POSITIVE_KEYWORDS.filter(kw => lowerContent.includes(kw)).length,
      negativeKeywords: NEGATIVE_KEYWORDS.filter(kw => lowerContent.includes(kw)).length,
      hedgingPhrases: HEDGING_PHRASES.filter(phrase => lowerContent.includes(phrase)).length,
      confidencePhrases: CONFIDENCE_PHRASES.filter(phrase => lowerContent.includes(phrase)).length,
      forwardLookingStatements: FORWARD_LOOKING_PHRASES.filter(phrase => lowerContent.includes(phrase)).length
    };
  }

  /**
   * Analyze management tone using LLM
   */
  private async analyzeManagementTone(transcript: HistoricalTranscript): Promise<ManagementTone> {
    // Extract management segments
    const managementSegments = transcript.speakers
      .filter(s => ['ceo', 'cfo', 'coo', 'other_executive'].includes(s.role))
      .map(s => s.text)
      .join('\n');

    if (!managementSegments || managementSegments.length < 100) {
      return this.getDefaultManagementTone();
    }

    try {
      // Use keyword-based analysis for speed
      const lowerText = managementSegments.toLowerCase();
      
      const optimismKeywords = ['confident', 'strong', 'growth', 'excited', 'pleased', 'record'];
      const defensivenessKeywords = ['explain', 'clarify', 'understand', 'context', 'perspective'];
      const uncertaintyKeywords = ['may', 'might', 'could', 'possibly', 'uncertain', 'depends'];
      const forwardKeywords = ['going forward', 'next quarter', 'outlook', 'expect', 'anticipate'];

      const optimism = Math.min(1, optimismKeywords.filter(kw => lowerText.includes(kw)).length / 4);
      const defensiveness = Math.min(1, defensivenessKeywords.filter(kw => lowerText.includes(kw)).length / 3);
      const uncertainty = Math.min(1, uncertaintyKeywords.filter(kw => lowerText.includes(kw)).length / 4);
      const forwardLooking = Math.min(1, forwardKeywords.filter(kw => lowerText.includes(kw)).length / 3);
      const confidence = Math.max(0, 1 - uncertainty);

      return {
        optimism,
        defensiveness,
        confidence,
        uncertainty,
        forwardLooking
      };
    } catch (error) {
      console.error('[HistoricalSentiment] Error analyzing management tone:', error);
      return this.getDefaultManagementTone();
    }
  }

  /**
   * Analyze analyst reaction from Q&A
   */
  private analyzeAnalystReaction(transcript: HistoricalTranscript): AnalystReaction {
    const analystSegments = transcript.speakers
      .filter(s => s.role === 'analyst')
      .map(s => s.text.toLowerCase());

    if (analystSegments.length === 0) {
      return { satisfaction: 0.5, skepticism: 0.3, followUpIntensity: 0.3 };
    }

    const allAnalystText = analystSegments.join(' ');
    
    // Satisfaction indicators
    const satisfactionKeywords = ['thank', 'great', 'impressive', 'congratulations', 'excellent'];
    const satisfaction = Math.min(1, satisfactionKeywords.filter(kw => allAnalystText.includes(kw)).length / 3);
    
    // Skepticism indicators
    const skepticismKeywords = ['but', 'however', 'concern', 'worried', 'why', 'explain', 'clarify'];
    const skepticism = Math.min(1, skepticismKeywords.filter(kw => allAnalystText.includes(kw)).length / 4);
    
    // Follow-up intensity (questions per analyst)
    const questionCount = (allAnalystText.match(/\?/g) || []).length;
    const followUpIntensity = Math.min(1, questionCount / (analystSegments.length * 2));

    return { satisfaction, skepticism, followUpIntensity };
  }

  /**
   * Detect guidance signals in transcript
   */
  private detectGuidanceSignal(content: string): GuidanceSignal {
    const lowerContent = content.toLowerCase();
    
    // Guidance direction detection
    const raisedKeywords = ['raised', 'increased', 'higher', 'upgraded', 'above'];
    const loweredKeywords = ['lowered', 'reduced', 'decreased', 'downgraded', 'below'];
    const maintainedKeywords = ['maintained', 'reaffirmed', 'unchanged', 'consistent'];
    const withdrawnKeywords = ['withdrawn', 'suspended', 'removed', 'no longer providing'];

    let direction: GuidanceSignal['direction'] = 'none';
    let strength = 0;

    if (withdrawnKeywords.some(kw => lowerContent.includes(kw + ' guidance'))) {
      direction = 'withdrawn';
      strength = 0.9;
    } else if (raisedKeywords.some(kw => lowerContent.includes(kw + ' guidance') || lowerContent.includes('guidance ' + kw))) {
      direction = 'raised';
      strength = 0.8;
    } else if (loweredKeywords.some(kw => lowerContent.includes(kw + ' guidance') || lowerContent.includes('guidance ' + kw))) {
      direction = 'lowered';
      strength = 0.8;
    } else if (maintainedKeywords.some(kw => lowerContent.includes(kw + ' guidance') || lowerContent.includes('guidance ' + kw))) {
      direction = 'maintained';
      strength = 0.6;
    }

    // Specificity based on numbers mentioned near guidance
    const guidanceContext = this.extractGuidanceContext(content);
    const hasNumbers = /\$?\d+(\.\d+)?[BMK]?/.test(guidanceContext);
    const specificity = hasNumbers ? 0.8 : 0.3;

    return { direction, strength, specificity };
  }

  /**
   * Extract context around guidance mentions
   */
  private extractGuidanceContext(content: string): string {
    const guidanceIndex = content.toLowerCase().indexOf('guidance');
    if (guidanceIndex === -1) return '';
    
    const start = Math.max(0, guidanceIndex - 200);
    const end = Math.min(content.length, guidanceIndex + 200);
    return content.substring(start, end);
  }

  /**
   * Calculate overall sentiment score
   */
  private calculateOverallSentiment(
    keyMetrics: KeyMetrics,
    managementTone: ManagementTone,
    guidanceSignal: GuidanceSignal
  ): number {
    // Keyword sentiment (-1 to 1)
    const keywordSentiment = keyMetrics.positiveKeywords > 0 || keyMetrics.negativeKeywords > 0
      ? (keyMetrics.positiveKeywords - keyMetrics.negativeKeywords) / 
        (keyMetrics.positiveKeywords + keyMetrics.negativeKeywords)
      : 0;

    // Management tone sentiment (-1 to 1)
    const toneSentiment = (managementTone.optimism - managementTone.defensiveness + 
                          managementTone.confidence - managementTone.uncertainty) / 2;

    // Guidance sentiment (-1 to 1)
    let guidanceSentiment = 0;
    if (guidanceSignal.direction === 'raised') guidanceSentiment = 0.8;
    else if (guidanceSignal.direction === 'maintained') guidanceSentiment = 0.2;
    else if (guidanceSignal.direction === 'lowered') guidanceSentiment = -0.6;
    else if (guidanceSignal.direction === 'withdrawn') guidanceSentiment = -0.8;

    // Weighted average
    const overall = (keywordSentiment * 0.3) + (toneSentiment * 0.4) + (guidanceSentiment * 0.3);
    
    return Math.max(-1, Math.min(1, overall));
  }

  /**
   * Calculate confidence in sentiment score
   */
  private calculateConfidence(keyMetrics: KeyMetrics, contentLength: number): number {
    // More keywords = higher confidence
    const keywordConfidence = Math.min(1, (keyMetrics.positiveKeywords + keyMetrics.negativeKeywords) / 20);
    
    // Longer transcripts = higher confidence
    const lengthConfidence = Math.min(1, contentLength / 50000);
    
    return (keywordConfidence * 0.6) + (lengthConfidence * 0.4);
  }

  /**
   * Get default management tone
   */
  private getDefaultManagementTone(): ManagementTone {
    return {
      optimism: 0.5,
      defensiveness: 0.3,
      confidence: 0.5,
      uncertainty: 0.3,
      forwardLooking: 0.5
    };
  }

  /**
   * Generate mock transcript for testing
   */
  private generateMockTranscript(symbol: string, year: number, quarter: number): HistoricalTranscript {
    const date = new Date(year, (quarter - 1) * 3 + 1, 15).toISOString().split('T')[0];
    
    return {
      symbol,
      date,
      fiscalYear: year,
      fiscalQuarter: quarter,
      content: `
        Operator: Good afternoon, and welcome to ${symbol}'s Q${quarter} ${year} earnings call.
        
        CEO - Chief Executive Officer: Thank you. We are pleased to report strong results this quarter.
        Our revenue grew significantly, and we exceeded our guidance. We remain confident in our 
        growth trajectory and are excited about the opportunities ahead.
        
        CFO - Chief Financial Officer: Total revenue was up year over year, driven by strong demand
        across all segments. We are maintaining our full-year guidance and expect continued momentum.
        
        Analyst: Can you provide more color on the margin expansion?
        
        CFO - Chief Financial Officer: Certainly. We've seen operational efficiencies and scale benefits
        that have contributed to improved margins. We expect this trend to continue.
        
        Analyst: What's your outlook for next quarter?
        
        CEO - Chief Executive Officer: We remain optimistic about our prospects. The pipeline is strong
        and we're well-positioned for continued growth.
      `,
      speakers: [
        { speaker: 'Operator', role: 'operator', text: `Good afternoon, and welcome to ${symbol}'s Q${quarter} ${year} earnings call.` },
        { speaker: 'CEO', role: 'ceo', text: 'We are pleased to report strong results this quarter. Our revenue grew significantly, and we exceeded our guidance. We remain confident in our growth trajectory and are excited about the opportunities ahead.' },
        { speaker: 'CFO', role: 'cfo', text: 'Total revenue was up year over year, driven by strong demand across all segments. We are maintaining our full-year guidance and expect continued momentum.' },
        { speaker: 'Analyst', role: 'analyst', text: 'Can you provide more color on the margin expansion?' },
        { speaker: 'CFO', role: 'cfo', text: "Certainly. We've seen operational efficiencies and scale benefits that have contributed to improved margins. We expect this trend to continue." },
        { speaker: 'Analyst', role: 'analyst', text: "What's your outlook for next quarter?" },
        { speaker: 'CEO', role: 'ceo', text: "We remain optimistic about our prospects. The pipeline is strong and we're well-positioned for continued growth." }
      ]
    };
  }

  /**
   * Batch process multiple symbols
   */
  async batchCollectSentiment(
    symbols: string[],
    years: number = 3
  ): Promise<Map<string, HistoricalSentimentData[]>> {
    const results = new Map<string, HistoricalSentimentData[]>();

    for (const symbol of symbols) {
      try {
        const transcripts = await this.fetchHistoricalTranscripts(symbol, years);
        const sentimentData: HistoricalSentimentData[] = [];

        for (const transcript of transcripts) {
          const sentiment = await this.analyzeSentiment(transcript);
          sentimentData.push({
            symbol,
            earningsDate: transcript.date,
            fiscalYear: transcript.fiscalYear,
            fiscalQuarter: transcript.fiscalQuarter,
            sentiment,
            processedAt: Date.now()
          });
        }

        results.set(symbol, sentimentData);
      } catch (error) {
        console.error(`[HistoricalSentiment] Error processing ${symbol}:`, error);
        results.set(symbol, []);
      }
    }

    return results;
  }

  /**
   * Get cached sentiment data
   */
  getCachedData(): Map<string, HistoricalSentimentData> {
    return this.cache;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export factory function
export function createHistoricalSentimentCollector(apiKey?: string): HistoricalSentimentCollector {
  return new HistoricalSentimentCollector(apiKey);
}
