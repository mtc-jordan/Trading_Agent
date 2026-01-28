/**
 * Real-Time Tone Analyzer for Live Earnings Calls
 * Provides streaming sentiment analysis, keyword detection, and management tone tracking
 */

import { invokeLLM } from '../../_core/llm';

interface SpeakerSegment {
  speaker: string;
  role: 'ceo' | 'cfo' | 'coo' | 'analyst' | 'operator' | 'other';
  text: string;
  timestamp: number;
}

interface RealTimeSentiment {
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
}

interface KeywordAlert {
  keyword: string;
  category: 'guidance' | 'risk' | 'growth' | 'concern' | 'beat' | 'miss';
  context: string;
  sentiment: number;
  timestamp: number;
}

interface ManagementToneMetrics {
  optimism: number; // 0-1
  defensiveness: number; // 0-1
  confidence: number; // 0-1
  uncertainty: number; // 0-1
  forwardLooking: number; // 0-1
  evasiveness: number; // 0-1
}

interface AnalystReactionMetrics {
  satisfaction: number; // 0-1
  skepticism: number; // 0-1
  followUpIntensity: number; // 0-1
}

interface RealTimeAnalysis {
  currentSentiment: RealTimeSentiment;
  sentimentHistory: { timestamp: number; sentiment: number }[];
  managementTone: ManagementToneMetrics;
  analystReaction: AnalystReactionMetrics;
  keywordAlerts: KeywordAlert[];
  topicFlow: { topic: string; startTime: number; endTime?: number }[];
  riskIndicators: string[];
  guidanceSignals: string[];
  momentumShift: 'improving' | 'declining' | 'stable';
}

// Keywords to watch for during earnings calls
const KEYWORD_CATEGORIES = {
  guidance: [
    'guidance', 'outlook', 'expect', 'forecast', 'anticipate', 'project',
    'full year', 'next quarter', 'going forward', 'target', 'goal'
  ],
  risk: [
    'headwind', 'challenge', 'difficult', 'uncertain', 'risk', 'concern',
    'pressure', 'decline', 'weakness', 'slowdown', 'macro'
  ],
  growth: [
    'growth', 'expand', 'increase', 'momentum', 'accelerate', 'strong',
    'record', 'outperform', 'beat', 'exceed', 'robust'
  ],
  concern: [
    'miss', 'below', 'shortfall', 'disappoint', 'underperform', 'soft',
    'weaker', 'lower', 'reduced', 'cut', 'pullback'
  ],
  beat: [
    'beat', 'exceeded', 'surpassed', 'outperformed', 'above expectations',
    'better than expected', 'strong results', 'record quarter'
  ],
  miss: [
    'missed', 'fell short', 'below expectations', 'disappointing',
    'weaker than expected', 'challenging quarter'
  ]
};

// Hedging language indicators
const HEDGING_PHRASES = [
  'we believe', 'we think', 'potentially', 'possibly', 'may', 'might',
  'could', 'should', 'approximately', 'roughly', 'around', 'about',
  'in the range of', 'somewhere between', 'give or take'
];

// Confidence indicators
const CONFIDENCE_PHRASES = [
  'we are confident', 'we are certain', 'definitely', 'absolutely',
  'without a doubt', 'clearly', 'certainly', 'undoubtedly', 'strong conviction'
];

export class RealTimeToneAnalyzer {
  private analysisState: RealTimeAnalysis;
  private segmentBuffer: SpeakerSegment[] = [];
  private lastAnalysisTime: number = 0;
  private analysisInterval: number = 5000; // Analyze every 5 seconds

  constructor() {
    this.analysisState = this.initializeState();
  }

  private initializeState(): RealTimeAnalysis {
    return {
      currentSentiment: { score: 0, confidence: 0.5, label: 'neutral' },
      sentimentHistory: [],
      managementTone: {
        optimism: 0.5,
        defensiveness: 0.3,
        confidence: 0.5,
        uncertainty: 0.3,
        forwardLooking: 0.5,
        evasiveness: 0.2
      },
      analystReaction: {
        satisfaction: 0.5,
        skepticism: 0.3,
        followUpIntensity: 0.3
      },
      keywordAlerts: [],
      topicFlow: [],
      riskIndicators: [],
      guidanceSignals: [],
      momentumShift: 'stable'
    };
  }

  /**
   * Process a new segment from the live transcript
   */
  async processSegment(segment: SpeakerSegment): Promise<RealTimeAnalysis> {
    this.segmentBuffer.push(segment);
    
    // Detect keywords immediately
    this.detectKeywords(segment);
    
    // Update speaker-specific metrics
    if (this.isExecutive(segment.role)) {
      await this.updateManagementTone(segment);
    } else if (segment.role === 'analyst') {
      await this.updateAnalystReaction(segment);
    }
    
    // Perform full analysis periodically
    const now = Date.now();
    if (now - this.lastAnalysisTime > this.analysisInterval) {
      await this.performFullAnalysis();
      this.lastAnalysisTime = now;
    }
    
    return this.analysisState;
  }

  /**
   * Detect keywords in a segment
   */
  private detectKeywords(segment: SpeakerSegment): void {
    const text = segment.text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          // Extract context around the keyword
          const keywordIndex = text.indexOf(keyword);
          const contextStart = Math.max(0, keywordIndex - 50);
          const contextEnd = Math.min(text.length, keywordIndex + keyword.length + 50);
          const context = segment.text.substring(contextStart, contextEnd);
          
          // Calculate local sentiment
          const sentiment = this.calculateLocalSentiment(context, category as keyof typeof KEYWORD_CATEGORIES);
          
          this.analysisState.keywordAlerts.push({
            keyword,
            category: category as KeywordAlert['category'],
            context,
            sentiment,
            timestamp: segment.timestamp
          });
          
          // Add to risk indicators or guidance signals
          if (category === 'risk' || category === 'concern' || category === 'miss') {
            if (!this.analysisState.riskIndicators.includes(context)) {
              this.analysisState.riskIndicators.push(context);
            }
          } else if (category === 'guidance') {
            if (!this.analysisState.guidanceSignals.includes(context)) {
              this.analysisState.guidanceSignals.push(context);
            }
          }
        }
      }
    }
  }

  /**
   * Calculate local sentiment based on context and category
   */
  private calculateLocalSentiment(context: string, category: keyof typeof KEYWORD_CATEGORIES): number {
    const lowerContext = context.toLowerCase();
    
    // Base sentiment by category
    let baseSentiment = 0;
    switch (category) {
      case 'growth':
      case 'beat':
        baseSentiment = 0.6;
        break;
      case 'risk':
      case 'concern':
      case 'miss':
        baseSentiment = -0.6;
        break;
      default:
        baseSentiment = 0;
    }
    
    // Adjust for negation
    const negationWords = ['not', 'no', "don't", "doesn't", "didn't", 'never', 'without'];
    for (const negation of negationWords) {
      if (lowerContext.includes(negation)) {
        baseSentiment *= -0.7; // Partial negation effect
        break;
      }
    }
    
    // Adjust for intensifiers
    const intensifiers = ['very', 'extremely', 'significantly', 'substantially', 'dramatically'];
    for (const intensifier of intensifiers) {
      if (lowerContext.includes(intensifier)) {
        baseSentiment *= 1.3;
        break;
      }
    }
    
    return Math.max(-1, Math.min(1, baseSentiment));
  }

  /**
   * Update management tone metrics
   */
  private async updateManagementTone(segment: SpeakerSegment): Promise<void> {
    const text = segment.text.toLowerCase();
    
    // Check for hedging language (increases uncertainty)
    let hedgingCount = 0;
    for (const phrase of HEDGING_PHRASES) {
      if (text.includes(phrase)) hedgingCount++;
    }
    
    // Check for confidence language
    let confidenceCount = 0;
    for (const phrase of CONFIDENCE_PHRASES) {
      if (text.includes(phrase)) confidenceCount++;
    }
    
    // Update metrics with exponential moving average
    const alpha = 0.3; // Smoothing factor
    
    // Uncertainty based on hedging
    const newUncertainty = Math.min(1, hedgingCount * 0.15);
    this.analysisState.managementTone.uncertainty = 
      alpha * newUncertainty + (1 - alpha) * this.analysisState.managementTone.uncertainty;
    
    // Confidence based on confidence phrases
    const newConfidence = Math.min(1, 0.5 + confidenceCount * 0.15);
    this.analysisState.managementTone.confidence = 
      alpha * newConfidence + (1 - alpha) * this.analysisState.managementTone.confidence;
    
    // Forward-looking based on future-oriented language
    const forwardPhrases = ['going forward', 'next quarter', 'next year', 'future', 'plan to', 'expect to'];
    let forwardCount = 0;
    for (const phrase of forwardPhrases) {
      if (text.includes(phrase)) forwardCount++;
    }
    const newForwardLooking = Math.min(1, 0.3 + forwardCount * 0.2);
    this.analysisState.managementTone.forwardLooking = 
      alpha * newForwardLooking + (1 - alpha) * this.analysisState.managementTone.forwardLooking;
    
    // Evasiveness based on non-answers
    const evasivePhrases = ['as i mentioned', 'as we discussed', 'i think we covered', 'let me redirect'];
    let evasiveCount = 0;
    for (const phrase of evasivePhrases) {
      if (text.includes(phrase)) evasiveCount++;
    }
    const newEvasiveness = Math.min(1, evasiveCount * 0.25);
    this.analysisState.managementTone.evasiveness = 
      alpha * newEvasiveness + (1 - alpha) * this.analysisState.managementTone.evasiveness;
  }

  /**
   * Update analyst reaction metrics
   */
  private async updateAnalystReaction(segment: SpeakerSegment): Promise<void> {
    const text = segment.text.toLowerCase();
    
    const alpha = 0.3;
    
    // Skepticism indicators
    const skepticalPhrases = ['but', 'however', 'concerned', 'worried', 'surprised', 'unexpected'];
    let skepticismCount = 0;
    for (const phrase of skepticalPhrases) {
      if (text.includes(phrase)) skepticismCount++;
    }
    const newSkepticism = Math.min(1, skepticismCount * 0.2);
    this.analysisState.analystReaction.skepticism = 
      alpha * newSkepticism + (1 - alpha) * this.analysisState.analystReaction.skepticism;
    
    // Follow-up intensity (multiple questions, probing)
    const questionCount = (text.match(/\?/g) || []).length;
    const newFollowUp = Math.min(1, questionCount * 0.25);
    this.analysisState.analystReaction.followUpIntensity = 
      alpha * newFollowUp + (1 - alpha) * this.analysisState.analystReaction.followUpIntensity;
    
    // Satisfaction indicators
    const satisfiedPhrases = ['thank you', 'great', 'helpful', 'clear', 'appreciate'];
    let satisfactionCount = 0;
    for (const phrase of satisfiedPhrases) {
      if (text.includes(phrase)) satisfactionCount++;
    }
    const newSatisfaction = Math.min(1, 0.3 + satisfactionCount * 0.2);
    this.analysisState.analystReaction.satisfaction = 
      alpha * newSatisfaction + (1 - alpha) * this.analysisState.analystReaction.satisfaction;
  }

  /**
   * Perform full analysis using LLM
   */
  private async performFullAnalysis(): Promise<void> {
    if (this.segmentBuffer.length === 0) return;
    
    // Get recent segments for analysis
    const recentSegments = this.segmentBuffer.slice(-10);
    const recentText = recentSegments.map(s => `${s.speaker}: ${s.text}`).join('\n');
    
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are an expert financial analyst specializing in real-time earnings call analysis. 
Analyze the following transcript segment and provide sentiment scores.
Return a JSON object with:
- sentiment: number from -1 (very negative) to 1 (very positive)
- confidence: number from 0 to 1
- optimism: number from 0 to 1
- defensiveness: number from 0 to 1`
          },
          {
            role: 'user',
            content: recentText.substring(0, 3000)
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'sentiment_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                sentiment: { type: 'number' },
                confidence: { type: 'number' },
                optimism: { type: 'number' },
                defensiveness: { type: 'number' }
              },
              required: ['sentiment', 'confidence', 'optimism', 'defensiveness'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        const analysis = JSON.parse(content);
        
        // Update current sentiment
        this.analysisState.currentSentiment = {
          score: analysis.sentiment,
          confidence: analysis.confidence,
          label: this.getSentimentLabel(analysis.sentiment)
        };
        
        // Add to history
        this.analysisState.sentimentHistory.push({
          timestamp: Date.now(),
          sentiment: analysis.sentiment
        });
        
        // Keep only last 100 history points
        if (this.analysisState.sentimentHistory.length > 100) {
          this.analysisState.sentimentHistory = this.analysisState.sentimentHistory.slice(-100);
        }
        
        // Update management tone
        this.analysisState.managementTone.optimism = 
          0.5 * analysis.optimism + 0.5 * this.analysisState.managementTone.optimism;
        this.analysisState.managementTone.defensiveness = 
          0.5 * analysis.defensiveness + 0.5 * this.analysisState.managementTone.defensiveness;
        
        // Calculate momentum shift
        this.calculateMomentumShift();
      }
    } catch (error) {
      console.error('[RealTimeTone] Error in full analysis:', error);
    }
  }

  /**
   * Get sentiment label from score
   */
  private getSentimentLabel(score: number): RealTimeSentiment['label'] {
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    if (score <= 0.2) return 'neutral';
    if (score <= 0.6) return 'positive';
    return 'very_positive';
  }

  /**
   * Calculate momentum shift based on sentiment history
   */
  private calculateMomentumShift(): void {
    const history = this.analysisState.sentimentHistory;
    if (history.length < 5) {
      this.analysisState.momentumShift = 'stable';
      return;
    }
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, h) => sum + h.sentiment, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, h) => sum + h.sentiment, 0) / older.length 
      : recentAvg;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.15) {
      this.analysisState.momentumShift = 'improving';
    } else if (diff < -0.15) {
      this.analysisState.momentumShift = 'declining';
    } else {
      this.analysisState.momentumShift = 'stable';
    }
  }

  /**
   * Check if role is an executive
   */
  private isExecutive(role: SpeakerSegment['role']): boolean {
    return ['ceo', 'cfo', 'coo'].includes(role);
  }

  /**
   * Get current analysis state
   */
  getAnalysis(): RealTimeAnalysis {
    return { ...this.analysisState };
  }

  /**
   * Get summary for display
   */
  getSummary(): {
    sentiment: string;
    sentimentScore: number;
    managementConfidence: string;
    analystSatisfaction: string;
    momentum: string;
    keyAlerts: number;
    riskCount: number;
  } {
    return {
      sentiment: this.analysisState.currentSentiment.label.replace('_', ' '),
      sentimentScore: this.analysisState.currentSentiment.score,
      managementConfidence: this.analysisState.managementTone.confidence > 0.6 ? 'High' :
                           this.analysisState.managementTone.confidence > 0.4 ? 'Medium' : 'Low',
      analystSatisfaction: this.analysisState.analystReaction.satisfaction > 0.6 ? 'Satisfied' :
                          this.analysisState.analystReaction.satisfaction > 0.4 ? 'Neutral' : 'Skeptical',
      momentum: this.analysisState.momentumShift,
      keyAlerts: this.analysisState.keywordAlerts.length,
      riskCount: this.analysisState.riskIndicators.length
    };
  }

  /**
   * Reset analyzer for new call
   */
  reset(): void {
    this.analysisState = this.initializeState();
    this.segmentBuffer = [];
    this.lastAnalysisTime = 0;
  }
}

// Factory function
export function createRealTimeToneAnalyzer(): RealTimeToneAnalyzer {
  return new RealTimeToneAnalyzer();
}

// Export types
export type {
  SpeakerSegment,
  RealTimeSentiment,
  KeywordAlert,
  ManagementToneMetrics,
  AnalystReactionMetrics,
  RealTimeAnalysis
};
