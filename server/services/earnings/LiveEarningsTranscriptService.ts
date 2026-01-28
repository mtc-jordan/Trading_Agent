/**
 * Live Earnings Transcript Service
 * Integrates with Financial Modeling Prep (FMP) API for real-time earnings call transcripts
 * Provides live transcript fetching, polling, and real-time tone analysis integration
 */

import { getDb } from '../../db';
import { earningsCallTranscripts } from '../../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { invokeLLM } from '../../_core/llm';

// FMP API Configuration
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

interface FMPTranscript {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  content: string;
}

interface FMPLatestTranscript {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
}

interface TranscriptSection {
  speaker: string;
  role: 'executive' | 'analyst' | 'operator' | 'unknown';
  content: string;
  timestamp?: string;
}

interface LiveToneAnalysis {
  overallSentiment: number; // -1 to 1
  confidence: number; // 0 to 1
  managementTone: {
    optimism: number;
    defensiveness: number;
    uncertainty: number;
    forwardLooking: number;
  };
  keyPhrases: {
    positive: string[];
    negative: string[];
    guidance: string[];
  };
  riskIndicators: string[];
  sentimentBySection: {
    prepared: number;
    qa: number;
  };
}

interface LiveTranscriptUpdate {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  isLive: boolean;
  lastUpdated: Date;
  sections: TranscriptSection[];
  currentToneAnalysis: LiveToneAnalysis;
  progressPercent: number;
}

interface EarningsCalendarEntry {
  symbol: string;
  companyName: string;
  date: string;
  time: 'before_market' | 'after_market' | 'during_market';
  quarter: number;
  year: number;
  estimatedEPS?: number;
  actualEPS?: number;
  hasTranscript: boolean;
}

export class LiveEarningsTranscriptService {
  private apiKey: string;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private transcriptCache: Map<string, LiveTranscriptUpdate> = new Map();
  private subscribers: Map<string, ((update: LiveTranscriptUpdate) => void)[]> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FMP_API_KEY || '';
  }

  /**
   * Fetch the latest earnings transcripts across all companies
   */
  async getLatestTranscripts(limit: number = 50, page: number = 0): Promise<FMPLatestTranscript[]> {
    try {
      const url = `${FMP_BASE_URL}/earning-call-transcript-latest?limit=${limit}&page=${page}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as FMPLatestTranscript[];
    } catch (error) {
      console.error('[LiveEarnings] Error fetching latest transcripts:', error);
      return [];
    }
  }

  /**
   * Fetch full transcript for a specific company and quarter
   */
  async getTranscript(symbol: string, year: number, quarter: number): Promise<FMPTranscript | null> {
    try {
      const url = `${FMP_BASE_URL}/earning-call-transcript?symbol=${symbol}&year=${year}&quarter=${quarter}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error(`[LiveEarnings] Error fetching transcript for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get available transcript dates for a symbol
   */
  async getTranscriptDates(symbol: string): Promise<{ year: number; quarter: number; date: string }[]> {
    try {
      const url = `${FMP_BASE_URL}/earning-call-transcript?symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data as FMPTranscript[]).map(t => ({
        year: t.year,
        quarter: t.quarter,
        date: t.date
      }));
    } catch (error) {
      console.error(`[LiveEarnings] Error fetching transcript dates for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Parse transcript content into structured sections
   */
  parseTranscriptSections(content: string): TranscriptSection[] {
    const sections: TranscriptSection[] = [];
    
    // Common patterns for speaker identification
    const speakerPatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–—:]\s*(.+)$/gm,
      /^([A-Z][a-z]+ [A-Z][a-z]+),\s*(CEO|CFO|COO|President|VP|Analyst|Director|Manager)[:]\s*(.+)$/gm,
      /^(Operator|Moderator)[:]\s*(.+)$/gm,
      /^\[([^\]]+)\]\s*(.+)$/gm
    ];

    // Split by common delimiters
    const paragraphs = content.split(/\n\n+/);
    
    let currentSpeaker = 'Unknown';
    let currentRole: TranscriptSection['role'] = 'unknown';
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      // Check for speaker change
      const speakerMatch = trimmed.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[-–—:]/);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
        currentRole = this.inferRole(trimmed);
      }

      // Check for operator
      if (trimmed.toLowerCase().startsWith('operator')) {
        currentSpeaker = 'Operator';
        currentRole = 'operator';
      }

      sections.push({
        speaker: currentSpeaker,
        role: currentRole,
        content: trimmed
      });
    }

    return sections;
  }

  /**
   * Infer speaker role from context
   */
  private inferRole(text: string): TranscriptSection['role'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('ceo') || lowerText.includes('chief executive') ||
        lowerText.includes('cfo') || lowerText.includes('chief financial') ||
        lowerText.includes('president') || lowerText.includes('chairman')) {
      return 'executive';
    }
    
    if (lowerText.includes('analyst') || lowerText.includes('research') ||
        lowerText.includes('morgan stanley') || lowerText.includes('goldman') ||
        lowerText.includes('jpmorgan') || lowerText.includes('bank of america')) {
      return 'analyst';
    }
    
    if (lowerText.includes('operator') || lowerText.includes('moderator')) {
      return 'operator';
    }
    
    return 'unknown';
  }

  /**
   * Perform real-time tone analysis on transcript content
   */
  async analyzeToneLive(sections: TranscriptSection[]): Promise<LiveToneAnalysis> {
    // Separate prepared remarks from Q&A
    const preparedSections = sections.filter(s => 
      s.role === 'executive' && !sections.some(prev => prev.role === 'analyst')
    );
    const qaSections = sections.filter(s => 
      sections.indexOf(s) > sections.findIndex(prev => prev.role === 'analyst')
    );

    const preparedContent = preparedSections.map(s => s.content).join('\n');
    const qaContent = qaSections.map(s => s.content).join('\n');
    const fullContent = sections.map(s => s.content).join('\n');

    // Use LLM for comprehensive tone analysis
    const analysisPrompt = `Analyze the following earnings call transcript for tone and sentiment.

Transcript:
${fullContent.substring(0, 8000)}

Provide a JSON response with:
1. overallSentiment: number from -1 (very negative) to 1 (very positive)
2. confidence: number from 0 to 1 indicating analysis confidence
3. managementTone: object with optimism, defensiveness, uncertainty, forwardLooking (each 0-1)
4. keyPhrases: object with arrays of positive, negative, and guidance phrases
5. riskIndicators: array of risk-related statements or concerns
6. sentimentBySection: object with prepared and qa sentiment scores (-1 to 1)

Return ONLY valid JSON, no other text.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a financial analyst specializing in earnings call analysis. Provide precise, quantitative sentiment analysis.' },
          { role: 'user', content: analysisPrompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tone_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                overallSentiment: { type: 'number' },
                confidence: { type: 'number' },
                managementTone: {
                  type: 'object',
                  properties: {
                    optimism: { type: 'number' },
                    defensiveness: { type: 'number' },
                    uncertainty: { type: 'number' },
                    forwardLooking: { type: 'number' }
                  },
                  required: ['optimism', 'defensiveness', 'uncertainty', 'forwardLooking'],
                  additionalProperties: false
                },
                keyPhrases: {
                  type: 'object',
                  properties: {
                    positive: { type: 'array', items: { type: 'string' } },
                    negative: { type: 'array', items: { type: 'string' } },
                    guidance: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['positive', 'negative', 'guidance'],
                  additionalProperties: false
                },
                riskIndicators: { type: 'array', items: { type: 'string' } },
                sentimentBySection: {
                  type: 'object',
                  properties: {
                    prepared: { type: 'number' },
                    qa: { type: 'number' }
                  },
                  required: ['prepared', 'qa'],
                  additionalProperties: false
                }
              },
              required: ['overallSentiment', 'confidence', 'managementTone', 'keyPhrases', 'riskIndicators', 'sentimentBySection'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        return JSON.parse(content) as LiveToneAnalysis;
      }
    } catch (error) {
      console.error('[LiveEarnings] Error in tone analysis:', error);
    }

    // Return default analysis on error
    return {
      overallSentiment: 0,
      confidence: 0.5,
      managementTone: {
        optimism: 0.5,
        defensiveness: 0.3,
        uncertainty: 0.3,
        forwardLooking: 0.5
      },
      keyPhrases: {
        positive: [],
        negative: [],
        guidance: []
      },
      riskIndicators: [],
      sentimentBySection: {
        prepared: 0,
        qa: 0
      }
    };
  }

  /**
   * Start polling for live transcript updates
   */
  startLivePolling(
    symbol: string,
    year: number,
    quarter: number,
    intervalMs: number = 30000,
    onUpdate?: (update: LiveTranscriptUpdate) => void
  ): void {
    const key = `${symbol}-${year}-Q${quarter}`;
    
    // Clear existing polling if any
    this.stopLivePolling(symbol, year, quarter);

    // Add subscriber
    if (onUpdate) {
      const subscribers = this.subscribers.get(key) || [];
      subscribers.push(onUpdate);
      this.subscribers.set(key, subscribers);
    }

    // Initial fetch
    this.fetchAndUpdateTranscript(symbol, year, quarter);

    // Start polling
    const interval = setInterval(async () => {
      await this.fetchAndUpdateTranscript(symbol, year, quarter);
    }, intervalMs);

    this.pollingIntervals.set(key, interval);
    console.log(`[LiveEarnings] Started polling for ${key} every ${intervalMs}ms`);
  }

  /**
   * Stop polling for a specific transcript
   */
  stopLivePolling(symbol: string, year: number, quarter: number): void {
    const key = `${symbol}-${year}-Q${quarter}`;
    
    const interval = this.pollingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
      console.log(`[LiveEarnings] Stopped polling for ${key}`);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const [key, interval] of Array.from(this.pollingIntervals.entries())) {
      clearInterval(interval);
      console.log(`[LiveEarnings] Stopped polling for ${key}`);
    }
    this.pollingIntervals.clear();
  }

  /**
   * Fetch and update transcript with analysis
   */
  private async fetchAndUpdateTranscript(symbol: string, year: number, quarter: number): Promise<void> {
    const key = `${symbol}-${year}-Q${quarter}`;
    
    try {
      const transcript = await this.getTranscript(symbol, year, quarter);
      
      if (!transcript) {
        console.log(`[LiveEarnings] No transcript available for ${key}`);
        return;
      }

      const previousUpdate = this.transcriptCache.get(key);
      const sections = this.parseTranscriptSections(transcript.content);
      
      // Check if content has changed
      const contentHash = this.hashContent(transcript.content);
      const previousHash = previousUpdate ? this.hashContent(
        previousUpdate.sections.map(s => s.content).join('\n')
      ) : '';

      if (contentHash !== previousHash) {
        // Content changed, perform new analysis
        const toneAnalysis = await this.analyzeToneLive(sections);
        
        const update: LiveTranscriptUpdate = {
          symbol,
          quarter,
          year,
          date: transcript.date,
          isLive: this.isRecentTranscript(transcript.date),
          lastUpdated: new Date(),
          sections,
          currentToneAnalysis: toneAnalysis,
          progressPercent: this.estimateProgress(sections)
        };

        this.transcriptCache.set(key, update);

        // Notify subscribers
        const subscribers = this.subscribers.get(key) || [];
        for (const callback of subscribers) {
          callback(update);
        }

        // Save to database
        await this.saveTranscriptToDb(update);

        console.log(`[LiveEarnings] Updated transcript for ${key}, sentiment: ${toneAnalysis.overallSentiment.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`[LiveEarnings] Error updating transcript for ${key}:`, error);
    }
  }

  /**
   * Check if transcript is recent (within last 24 hours)
   */
  private isRecentTranscript(dateStr: string): boolean {
    const transcriptDate = new Date(dateStr);
    const now = new Date();
    const hoursDiff = (now.getTime() - transcriptDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  }

  /**
   * Estimate progress of earnings call
   */
  private estimateProgress(sections: TranscriptSection[]): number {
    // Typical earnings call structure:
    // - Operator intro (5%)
    // - Prepared remarks (40%)
    // - Q&A (50%)
    // - Closing (5%)
    
    const hasOperator = sections.some(s => s.role === 'operator');
    const hasExecutive = sections.some(s => s.role === 'executive');
    const hasAnalyst = sections.some(s => s.role === 'analyst');
    
    const executiveCount = sections.filter(s => s.role === 'executive').length;
    const analystCount = sections.filter(s => s.role === 'analyst').length;
    
    // Check for closing remarks
    const lastSection = sections[sections.length - 1];
    const hasClosing = lastSection?.content.toLowerCase().includes('thank you') ||
                       lastSection?.content.toLowerCase().includes('concludes');

    if (hasClosing) return 100;
    if (analystCount > 5) return 80 + Math.min(analystCount, 10);
    if (hasAnalyst) return 50 + Math.min(analystCount * 5, 30);
    if (executiveCount > 3) return 30 + Math.min(executiveCount * 5, 20);
    if (hasExecutive) return 10 + Math.min(executiveCount * 5, 20);
    if (hasOperator) return 5;
    
    return 0;
  }

  /**
   * Simple content hash for change detection
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Save transcript to database
   */
  private async saveTranscriptToDb(update: LiveTranscriptUpdate): Promise<void> {
    const db = await getDb();
    if (!db) {
      console.error('[LiveEarnings] Database not available');
      return;
    }
    
    try {
      // Check if exists
      const existing = await db.select()
        .from(earningsCallTranscripts)
        .where(and(
          eq(earningsCallTranscripts.ticker, update.symbol),
          eq(earningsCallTranscripts.fiscalQuarter, `Q${update.quarter}`),
          eq(earningsCallTranscripts.fiscalYear, update.year)
        ))
        .limit(1);

      const transcriptData = {
        ticker: update.symbol,
        fiscalQuarter: `Q${update.quarter}`,
        fiscalYear: update.year,
        callDate: new Date(update.date),
        fullTranscript: JSON.stringify(update.sections),
        overallSentiment: String(update.currentToneAnalysis.overallSentiment),
        managementTone: String(update.currentToneAnalysis.managementTone.optimism - update.currentToneAnalysis.managementTone.defensiveness),
        analystTone: String(update.currentToneAnalysis.sentimentBySection.qa),
        keyPhrases: update.currentToneAnalysis.keyPhrases,
        sentimentBreakdown: update.currentToneAnalysis,
        updatedAt: new Date()
      };

      if (existing.length > 0) {
        await db.update(earningsCallTranscripts)
          .set(transcriptData)
          .where(eq(earningsCallTranscripts.id, existing[0].id));
      } else {
        await db.insert(earningsCallTranscripts).values({
          ...transcriptData,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('[LiveEarnings] Error saving transcript to DB:', error);
    }
  }

  /**
   * Get cached live update
   */
  getLiveUpdate(symbol: string, year: number, quarter: number): LiveTranscriptUpdate | null {
    const key = `${symbol}-${year}-Q${quarter}`;
    return this.transcriptCache.get(key) || null;
  }

  /**
   * Get earnings calendar for upcoming calls
   */
  async getEarningsCalendar(
    symbols?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<EarningsCalendarEntry[]> {
    const calendar: EarningsCalendarEntry[] = [];
    
    try {
      // Fetch latest transcripts to identify recent earnings
      const latest = await this.getLatestTranscripts(100);
      
      for (const transcript of latest) {
        // Filter by symbols if provided
        if (symbols && !symbols.includes(transcript.symbol)) continue;
        
        const transcriptDate = new Date(transcript.date);
        
        // Filter by date range if provided
        if (startDate && transcriptDate < startDate) continue;
        if (endDate && transcriptDate > endDate) continue;
        
        calendar.push({
          symbol: transcript.symbol,
          companyName: transcript.symbol, // Would need company info API for full name
          date: transcript.date,
          time: 'after_market', // Default, would need more data for accuracy
          quarter: transcript.quarter,
          year: transcript.year,
          hasTranscript: true
        });
      }
      
      // Sort by date descending
      calendar.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    } catch (error) {
      console.error('[LiveEarnings] Error fetching earnings calendar:', error);
    }
    
    return calendar;
  }

  /**
   * Subscribe to live updates for a transcript
   */
  subscribe(
    symbol: string,
    year: number,
    quarter: number,
    callback: (update: LiveTranscriptUpdate) => void
  ): () => void {
    const key = `${symbol}-${year}-Q${quarter}`;
    
    const subscribers = this.subscribers.get(key) || [];
    subscribers.push(callback);
    this.subscribers.set(key, subscribers);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key) || [];
      const index = subs.indexOf(callback);
      if (index > -1) {
        subs.splice(index, 1);
        this.subscribers.set(key, subs);
      }
    };
  }

  /**
   * Get real-time sentiment comparison (current vs historical)
   */
  async getSentimentComparison(symbol: string): Promise<{
    current: LiveToneAnalysis | null;
    historical: { quarter: string; sentiment: number }[];
    trend: 'improving' | 'declining' | 'stable';
  }> {
    const db = await getDb();
    if (!db) {
      return { current: null, historical: [], trend: 'stable' };
    }
    
    try {
      // Get historical transcripts from DB
      const historical = await db.select()
        .from(earningsCallTranscripts)
        .where(eq(earningsCallTranscripts.ticker, symbol))
        .orderBy(desc(earningsCallTranscripts.fiscalYear), desc(earningsCallTranscripts.fiscalQuarter))
        .limit(8);

      const historicalData = historical.map((h: any) => ({
        quarter: `${h.fiscalQuarter} ${h.fiscalYear}`,
        sentiment: parseFloat(h.overallSentiment) || 0
      }));

      // Get current live update if any
      let current: LiveToneAnalysis | null = null;
      for (const [key, update] of Array.from(this.transcriptCache.entries())) {
        if (key.startsWith(symbol)) {
          current = update.currentToneAnalysis;
          break;
        }
      }

      // Calculate trend
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (historicalData.length >= 2) {
        const recent = historicalData.slice(0, 4).reduce((sum: number, h: { quarter: string; sentiment: number }) => sum + h.sentiment, 0) / Math.min(4, historicalData.length);
        const older = historicalData.slice(4).reduce((sum: number, h: { quarter: string; sentiment: number }) => sum + h.sentiment, 0) / Math.max(1, historicalData.length - 4);
        
        if (recent > older + 0.1) trend = 'improving';
        else if (recent < older - 0.1) trend = 'declining';
      }

      return { current, historical: historicalData, trend };
    } catch (error) {
      console.error('[LiveEarnings] Error getting sentiment comparison:', error);
      return { current: null, historical: [], trend: 'stable' };
    }
  }
}

// Factory function
export function createLiveEarningsTranscriptService(apiKey?: string): LiveEarningsTranscriptService {
  return new LiveEarningsTranscriptService(apiKey);
}

// Export types
export type {
  FMPTranscript,
  FMPLatestTranscript,
  TranscriptSection,
  LiveToneAnalysis,
  LiveTranscriptUpdate,
  EarningsCalendarEntry
};
