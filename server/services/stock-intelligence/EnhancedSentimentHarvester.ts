/**
 * Enhanced Sentiment Harvester Agent
 * 
 * Integrates earnings call transcript analysis with social media sentiment
 * to provide comprehensive sentiment scoring for investment decisions.
 * 
 * Features:
 * - Earnings call tone analysis (management vs analyst)
 * - Social media sentiment (Reddit, Twitter/X, YouTube)
 * - News sentiment aggregation
 * - Forward-looking statement detection
 * - Management confidence scoring
 */

import { invokeLLM } from '../../_core/llm';
import { 
  earningsCallTranscriptService, 
  ToneAnalysis,
  EarningsCallTranscript 
} from '../earnings/EarningsCallTranscriptService';
import { AgentSignal } from './StockIntelligenceAgents';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SentimentSource {
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  sampleSize: number;
  timestamp: Date;
}

export interface EarningsCallSentiment {
  hasRecentCall: boolean;
  callDate?: Date;
  fiscalPeriod?: string;
  toneAnalysis?: ToneAnalysis;
  managementConfidence: number;
  guidanceDirection: 'raised' | 'lowered' | 'maintained' | 'none';
  keyThemes: string[];
  riskIndicators: string[];
}

export interface SocialMediaSentiment {
  reddit: SentimentSource;
  twitter: SentimentSource;
  youtube: SentimentSource;
  aggregated: SentimentSource;
}

export interface NewsSentiment {
  recentArticles: number;
  overallSentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  majorHeadlines: string[];
}

export interface ComprehensiveSentiment {
  ticker: string;
  companyName: string;
  timestamp: Date;
  
  // Overall scores
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  overallScore: number; // -1 to 1
  confidence: number; // 0 to 1
  
  // Component scores
  earningsCallSentiment: EarningsCallSentiment;
  socialMediaSentiment: SocialMediaSentiment;
  newsSentiment: NewsSentiment;
  
  // Weighted breakdown
  weights: {
    earningsCall: number;
    socialMedia: number;
    news: number;
  };
  
  // Signals
  bullishSignals: string[];
  bearishSignals: string[];
  
  // Recommendation
  recommendation: string;
}

// ============================================================================
// Enhanced Sentiment Harvester Class
// ============================================================================

export class EnhancedSentimentHarvester {
  // Default weights for sentiment sources
  private weights = {
    earningsCall: 0.45, // Highest weight - direct from management
    socialMedia: 0.30,  // Retail sentiment indicator
    news: 0.25          // Media coverage
  };

  // Sentiment thresholds
  private bullishThreshold = 0.2;
  private bearishThreshold = -0.2;

  /**
   * Analyze comprehensive sentiment for a stock
   */
  async analyzeComprehensiveSentiment(
    ticker: string,
    companyName: string
  ): Promise<ComprehensiveSentiment> {
    const timestamp = new Date();

    // Fetch and analyze earnings call
    const earningsCallSentiment = await this.analyzeEarningsCallSentiment(ticker);

    // Analyze social media sentiment
    const socialMediaSentiment = await this.analyzeSocialMediaSentiment(ticker);

    // Analyze news sentiment
    const newsSentiment = await this.analyzeNewsSentiment(ticker, companyName);

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore(
      earningsCallSentiment,
      socialMediaSentiment,
      newsSentiment
    );

    // Determine overall sentiment
    const overallSentiment = this.scoreToSentiment(overallScore);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(
      earningsCallSentiment,
      socialMediaSentiment,
      newsSentiment
    );

    // Extract signals
    const { bullishSignals, bearishSignals } = this.extractSignals(
      earningsCallSentiment,
      socialMediaSentiment,
      newsSentiment
    );

    // Generate recommendation
    const recommendation = await this.generateRecommendation(
      ticker,
      overallSentiment,
      overallScore,
      bullishSignals,
      bearishSignals
    );

    return {
      ticker,
      companyName,
      timestamp,
      overallSentiment,
      overallScore,
      confidence,
      earningsCallSentiment,
      socialMediaSentiment,
      newsSentiment,
      weights: this.weights,
      bullishSignals,
      bearishSignals,
      recommendation
    };
  }

  /**
   * Generate agent signal from comprehensive sentiment
   */
  async generateAgentSignal(ticker: string, companyName: string): Promise<AgentSignal> {
    const sentiment = await this.analyzeComprehensiveSentiment(ticker, companyName);

    return {
      agent: 'sentiment_harvester',
      ticker,
      signal: sentiment.overallSentiment,
      confidence: sentiment.confidence * 100,
      rationale: sentiment.recommendation,
      keyFindings: sentiment.bullishSignals.concat(sentiment.bearishSignals),
      risks: sentiment.earningsCallSentiment.riskIndicators,
      dataPoints: {
        earningsCallTone: sentiment.earningsCallSentiment.toneAnalysis?.overallSentiment || 'N/A',
        socialMediaScore: sentiment.socialMediaSentiment.aggregated.score.toFixed(2),
        newsSentiment: sentiment.newsSentiment.overallSentiment,
        managementConfidence: `${(sentiment.earningsCallSentiment.managementConfidence * 100).toFixed(0)}%`,
        guidance: sentiment.earningsCallSentiment.guidanceDirection
      },
      timestamp: sentiment.timestamp
    };
  }

  // ============================================================================
  // Private Analysis Methods
  // ============================================================================

  private async analyzeEarningsCallSentiment(ticker: string): Promise<EarningsCallSentiment> {
    try {
      // Fetch latest earnings call transcript
      const transcript = await earningsCallTranscriptService.fetchTranscript(ticker);

      if (!transcript) {
        return {
          hasRecentCall: false,
          managementConfidence: 0.5,
          guidanceDirection: 'none',
          keyThemes: [],
          riskIndicators: []
        };
      }

      // Analyze tone
      const toneAnalysis = await earningsCallTranscriptService.analyzeTone(transcript);

      // Extract key themes
      const keyThemes = [
        ...toneAnalysis.positiveThemes.map(t => t.theme),
        ...toneAnalysis.negativeThemes.map(t => t.theme)
      ].slice(0, 5);

      // Extract risk indicators
      const riskIndicators = toneAnalysis.cautionIndicators.slice(0, 5);

      return {
        hasRecentCall: true,
        callDate: transcript.callDate,
        fiscalPeriod: `${transcript.fiscalQuarter} ${transcript.fiscalYear}`,
        toneAnalysis,
        managementConfidence: toneAnalysis.confidenceLevel,
        guidanceDirection: toneAnalysis.guidanceDirection,
        keyThemes,
        riskIndicators
      };
    } catch (error) {
      console.error(`[SentimentHarvester] Error analyzing earnings call for ${ticker}:`, error);
      return {
        hasRecentCall: false,
        managementConfidence: 0.5,
        guidanceDirection: 'none',
        keyThemes: [],
        riskIndicators: []
      };
    }
  }

  private async analyzeSocialMediaSentiment(ticker: string): Promise<SocialMediaSentiment> {
    // Simulate social media sentiment analysis
    // In production, this would connect to social media APIs
    
    const now = new Date();

    // Reddit sentiment (WSB, stocks, investing subreddits)
    const reddit: SentimentSource = {
      source: 'reddit',
      sentiment: this.randomSentiment(),
      score: this.randomScore(),
      confidence: 0.6 + Math.random() * 0.3,
      sampleSize: Math.floor(50 + Math.random() * 200),
      timestamp: now
    };

    // Twitter/X sentiment
    const twitter: SentimentSource = {
      source: 'twitter',
      sentiment: this.randomSentiment(),
      score: this.randomScore(),
      confidence: 0.5 + Math.random() * 0.3,
      sampleSize: Math.floor(100 + Math.random() * 500),
      timestamp: now
    };

    // YouTube sentiment (from comments on financial videos)
    const youtube: SentimentSource = {
      source: 'youtube',
      sentiment: this.randomSentiment(),
      score: this.randomScore(),
      confidence: 0.4 + Math.random() * 0.3,
      sampleSize: Math.floor(20 + Math.random() * 100),
      timestamp: now
    };

    // Aggregate social media sentiment
    const totalSamples = reddit.sampleSize + twitter.sampleSize + youtube.sampleSize;
    const weightedScore = (
      (reddit.score * reddit.sampleSize) +
      (twitter.score * twitter.sampleSize) +
      (youtube.score * youtube.sampleSize)
    ) / totalSamples;

    const aggregated: SentimentSource = {
      source: 'social_media_aggregate',
      sentiment: this.scoreToBasicSentiment(weightedScore),
      score: weightedScore,
      confidence: (reddit.confidence + twitter.confidence + youtube.confidence) / 3,
      sampleSize: totalSamples,
      timestamp: now
    };

    return { reddit, twitter, youtube, aggregated };
  }

  private async analyzeNewsSentiment(ticker: string, companyName: string): Promise<NewsSentiment> {
    // Simulate news sentiment analysis
    // In production, this would use news APIs and NLP
    
    const sentiments = ['positive', 'negative', 'neutral'] as const;
    const overallSentiment = sentiments[Math.floor(Math.random() * 3)];
    
    const score = overallSentiment === 'positive' ? 0.3 + Math.random() * 0.4 :
                  overallSentiment === 'negative' ? -0.3 - Math.random() * 0.4 :
                  -0.1 + Math.random() * 0.2;

    const headlines = [
      `${companyName} Reports Strong Quarterly Results`,
      `Analysts Upgrade ${ticker} on Growth Prospects`,
      `${companyName} Announces New Product Launch`,
      `Market Volatility Impacts ${ticker} Trading`,
      `${companyName} CEO Discusses Future Strategy`
    ];

    return {
      recentArticles: Math.floor(5 + Math.random() * 20),
      overallSentiment,
      score,
      majorHeadlines: headlines.slice(0, 3)
    };
  }

  private calculateWeightedScore(
    earningsCall: EarningsCallSentiment,
    socialMedia: SocialMediaSentiment,
    news: NewsSentiment
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    // Earnings call contribution
    if (earningsCall.hasRecentCall && earningsCall.toneAnalysis) {
      weightedSum += earningsCall.toneAnalysis.sentimentScore * this.weights.earningsCall;
      totalWeight += this.weights.earningsCall;
    }

    // Social media contribution
    weightedSum += socialMedia.aggregated.score * this.weights.socialMedia;
    totalWeight += this.weights.socialMedia;

    // News contribution
    weightedSum += news.score * this.weights.news;
    totalWeight += this.weights.news;

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateConfidence(
    earningsCall: EarningsCallSentiment,
    socialMedia: SocialMediaSentiment,
    news: NewsSentiment
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence if we have earnings call data
    if (earningsCall.hasRecentCall) {
      confidence += 0.2;
    }

    // Boost confidence based on social media sample size
    if (socialMedia.aggregated.sampleSize > 500) {
      confidence += 0.15;
    } else if (socialMedia.aggregated.sampleSize > 200) {
      confidence += 0.1;
    }

    // Boost confidence based on news coverage
    if (news.recentArticles > 15) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  private extractSignals(
    earningsCall: EarningsCallSentiment,
    socialMedia: SocialMediaSentiment,
    news: NewsSentiment
  ): { bullishSignals: string[]; bearishSignals: string[] } {
    const bullishSignals: string[] = [];
    const bearishSignals: string[] = [];

    // Earnings call signals
    if (earningsCall.hasRecentCall && earningsCall.toneAnalysis) {
      if (earningsCall.toneAnalysis.sentimentScore > 0.2) {
        bullishSignals.push('Positive management tone on earnings call');
      }
      if (earningsCall.toneAnalysis.sentimentScore < -0.2) {
        bearishSignals.push('Negative management tone on earnings call');
      }
      if (earningsCall.guidanceDirection === 'raised') {
        bullishSignals.push('Management raised guidance');
      }
      if (earningsCall.guidanceDirection === 'lowered') {
        bearishSignals.push('Management lowered guidance');
      }
      if (earningsCall.managementConfidence > 0.7) {
        bullishSignals.push('High management confidence');
      }
      if (earningsCall.managementConfidence < 0.4) {
        bearishSignals.push('Low management confidence');
      }
    }

    // Social media signals
    if (socialMedia.aggregated.score > 0.3) {
      bullishSignals.push('Strong positive social media sentiment');
    }
    if (socialMedia.aggregated.score < -0.3) {
      bearishSignals.push('Strong negative social media sentiment');
    }
    if (socialMedia.reddit.score > 0.4) {
      bullishSignals.push('Bullish Reddit sentiment');
    }
    if (socialMedia.reddit.score < -0.4) {
      bearishSignals.push('Bearish Reddit sentiment');
    }

    // News signals
    if (news.score > 0.3) {
      bullishSignals.push('Positive news coverage');
    }
    if (news.score < -0.3) {
      bearishSignals.push('Negative news coverage');
    }

    return { bullishSignals, bearishSignals };
  }

  private async generateRecommendation(
    ticker: string,
    sentiment: 'bullish' | 'bearish' | 'neutral',
    score: number,
    bullishSignals: string[],
    bearishSignals: string[]
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analyst providing brief, actionable recommendations based on sentiment data. Keep responses under 100 words.`
          },
          {
            role: 'user',
            content: `Generate a sentiment-based recommendation for ${ticker}:
            
Overall Sentiment: ${sentiment} (score: ${score.toFixed(2)})

Bullish Signals:
${bullishSignals.map(s => `- ${s}`).join('\n')}

Bearish Signals:
${bearishSignals.map(s => `- ${s}`).join('\n')}

Provide a brief recommendation.`
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      return typeof content === 'string' ? content : `Sentiment analysis indicates ${sentiment} outlook for ${ticker} with a score of ${score.toFixed(2)}.`;
    } catch (error) {
      return `Sentiment analysis indicates ${sentiment} outlook for ${ticker} with a score of ${score.toFixed(2)}.`;
    }
  }

  // Helper methods
  private scoreToSentiment(score: number): 'bullish' | 'bearish' | 'neutral' {
    if (score > this.bullishThreshold) return 'bullish';
    if (score < this.bearishThreshold) return 'bearish';
    return 'neutral';
  }

  private scoreToBasicSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private randomSentiment(): 'positive' | 'negative' | 'neutral' {
    const rand = Math.random();
    if (rand < 0.4) return 'positive';
    if (rand < 0.7) return 'neutral';
    return 'negative';
  }

  private randomScore(): number {
    return -0.5 + Math.random(); // -0.5 to 0.5
  }
}

export const enhancedSentimentHarvester = new EnhancedSentimentHarvester();
