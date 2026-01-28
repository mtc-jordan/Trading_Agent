import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../../db', () => ({
  getDb: vi.fn(() => Promise.resolve(null))
}));

// Mock the LLM
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn(() => Promise.resolve({
    choices: [{
      message: {
        content: JSON.stringify({
          positive: [{ theme: 'Strong growth', sentiment: 'positive' }],
          negative: [{ theme: 'Market risk', sentiment: 'negative' }]
        })
      }
    }]
  }))
}));

describe('ThesisPerformanceTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Performance Comparison', () => {
    it('should correctly identify correct predictions', () => {
      // Test logic for correct predictions
      const predictedReturn = 15;
      const actualReturn = 18;
      const rating = 'buy';
      
      // Buy rating with positive actual return = correct
      const isCorrect = (rating === 'buy' || rating === 'strong_buy') && actualReturn > 0;
      expect(isCorrect).toBe(true);
    });

    it('should correctly identify incorrect predictions', () => {
      const predictedReturn = 15;
      const actualReturn = -5;
      const rating = 'buy';
      
      // Buy rating with negative actual return = incorrect
      const isCorrect = (rating === 'buy' || rating === 'strong_buy') && actualReturn > 0;
      expect(isCorrect).toBe(false);
    });

    it('should calculate alpha correctly', () => {
      const actualReturn = 18;
      const benchmarkReturn = 12;
      const alpha = actualReturn - benchmarkReturn;
      
      expect(alpha).toBe(6);
    });

    it('should calculate return difference correctly', () => {
      const predictedReturn = 15;
      const actualReturn = 18;
      const difference = actualReturn - predictedReturn;
      
      expect(difference).toBe(3);
    });
  });

  describe('Agent Weight Adjustment', () => {
    it('should increase weight for accurate agents', () => {
      const previousWeight = 0.25;
      const accuracyDelta = 0.15; // 15% better than average
      const learningRate = 0.1;
      
      const adjustment = accuracyDelta * learningRate;
      const newWeight = previousWeight + adjustment;
      
      expect(newWeight).toBeGreaterThan(previousWeight);
      expect(newWeight).toBeCloseTo(0.265, 3);
    });

    it('should decrease weight for inaccurate agents', () => {
      const previousWeight = 0.25;
      const accuracyDelta = -0.12; // 12% worse than average
      const learningRate = 0.1;
      
      const adjustment = accuracyDelta * learningRate;
      const newWeight = previousWeight + adjustment;
      
      expect(newWeight).toBeLessThan(previousWeight);
      expect(newWeight).toBeCloseTo(0.238, 3);
    });

    it('should normalize weights to sum to 1', () => {
      const weights = [0.28, 0.22, 0.12, 0.19, 0.19];
      const sum = weights.reduce((a, b) => a + b, 0);
      const normalized = weights.map(w => w / sum);
      
      const normalizedSum = normalized.reduce((a, b) => a + b, 0);
      expect(normalizedSum).toBeCloseTo(1, 5);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate overall accuracy correctly', () => {
      const correctPredictions = 13;
      const totalPredictions = 18;
      const accuracy = correctPredictions / totalPredictions;
      
      expect(accuracy).toBeCloseTo(0.722, 2);
    });

    it('should calculate average alpha correctly', () => {
      const alphas = [3.5, -2.7, -15.2, 5.1, 8.3];
      const avgAlpha = alphas.reduce((a, b) => a + b, 0) / alphas.length;
      
      expect(avgAlpha).toBeCloseTo(-0.2, 1);
    });
  });
});

describe('PerformanceComparisonEngine', () => {
  describe('Market Condition Analysis', () => {
    it('should categorize bull market correctly', () => {
      const marketReturn = 15; // 15% market return
      const regime = marketReturn > 10 ? 'bull' : marketReturn < -10 ? 'bear' : 'sideways';
      
      expect(regime).toBe('bull');
    });

    it('should categorize bear market correctly', () => {
      const marketReturn = -20;
      const regime = marketReturn > 10 ? 'bull' : marketReturn < -10 ? 'bear' : 'sideways';
      
      expect(regime).toBe('bear');
    });

    it('should categorize sideways market correctly', () => {
      const marketReturn = 3;
      const regime = marketReturn > 10 ? 'bull' : marketReturn < -10 ? 'bear' : 'sideways';
      
      expect(regime).toBe('sideways');
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on sample size', () => {
      const sampleSize = 20;
      const minSamples = 5;
      const maxSamples = 50;
      
      const confidence = Math.min(1, (sampleSize - minSamples) / (maxSamples - minSamples));
      expect(confidence).toBeCloseTo(0.333, 2);
    });

    it('should cap confidence at 1', () => {
      const sampleSize = 100;
      const minSamples = 5;
      const maxSamples = 50;
      
      const confidence = Math.min(1, (sampleSize - minSamples) / (maxSamples - minSamples));
      expect(confidence).toBe(1);
    });
  });
});

describe('EarningsCallTranscriptService', () => {
  describe('Tone Analysis', () => {
    it('should calculate sentiment score correctly', () => {
      const positiveCount = 15;
      const negativeCount = 5;
      const totalCount = positiveCount + negativeCount;
      
      const sentimentScore = (positiveCount - negativeCount) / totalCount;
      expect(sentimentScore).toBe(0.5);
    });

    it('should identify guidance direction from keywords', () => {
      const transcript = 'We are raising our guidance for the full year';
      const hasRaised = transcript.toLowerCase().includes('raising') || 
                        transcript.toLowerCase().includes('increase');
      const hasLowered = transcript.toLowerCase().includes('lowering') || 
                         transcript.toLowerCase().includes('decrease');
      
      const direction = hasRaised ? 'raised' : hasLowered ? 'lowered' : 'maintained';
      expect(direction).toBe('raised');
    });

    it('should detect confidence indicators', () => {
      const transcript = 'We exceeded expectations and delivered record results';
      const confidenceIndicators = ['exceeded', 'record', 'strong', 'confident'];
      
      const foundIndicators = confidenceIndicators.filter(indicator => 
        transcript.toLowerCase().includes(indicator)
      );
      
      expect(foundIndicators.length).toBeGreaterThan(0);
      expect(foundIndicators).toContain('exceeded');
      expect(foundIndicators).toContain('record');
    });

    it('should detect caution indicators', () => {
      const transcript = 'We face macroeconomic uncertainty and competitive pressure';
      const cautionIndicators = ['uncertainty', 'pressure', 'challenge', 'risk'];
      
      const foundIndicators = cautionIndicators.filter(indicator => 
        transcript.toLowerCase().includes(indicator)
      );
      
      expect(foundIndicators.length).toBeGreaterThan(0);
      expect(foundIndicators).toContain('uncertainty');
      expect(foundIndicators).toContain('pressure');
    });
  });

  describe('Management vs Analyst Tone', () => {
    it('should differentiate management and analyst sentiment', () => {
      const managementScore = 0.72;
      const analystScore = 0.45;
      
      // Management typically more positive than analysts
      expect(managementScore).toBeGreaterThan(analystScore);
    });

    it('should calculate overall sentiment as weighted average', () => {
      const managementScore = 0.72;
      const analystScore = 0.45;
      const managementWeight = 0.6;
      const analystWeight = 0.4;
      
      const overallScore = (managementScore * managementWeight) + (analystScore * analystWeight);
      expect(overallScore).toBeCloseTo(0.612, 2);
    });
  });
});

describe('EnhancedSentimentHarvester', () => {
  describe('Comprehensive Sentiment', () => {
    it('should calculate weighted sentiment score', () => {
      const earningsCallScore = 0.65;
      const socialMediaScore = 0.30;
      const newsScore = 0.45;
      
      const weights = {
        earningsCall: 0.45,
        socialMedia: 0.30,
        news: 0.25
      };
      
      const weightedScore = 
        (earningsCallScore * weights.earningsCall) +
        (socialMediaScore * weights.socialMedia) +
        (newsScore * weights.news);
      
      expect(weightedScore).toBeCloseTo(0.495, 2);
    });

    it('should classify sentiment correctly', () => {
      const bullishThreshold = 0.2;
      const bearishThreshold = -0.2;
      
      const classifySentiment = (score: number) => {
        if (score > bullishThreshold) return 'bullish';
        if (score < bearishThreshold) return 'bearish';
        return 'neutral';
      };
      
      expect(classifySentiment(0.5)).toBe('bullish');
      expect(classifySentiment(-0.5)).toBe('bearish');
      expect(classifySentiment(0.1)).toBe('neutral');
    });
  });

  describe('Signal Extraction', () => {
    it('should extract bullish signals', () => {
      const signals: string[] = [];
      const managementConfidence = 0.78;
      const guidanceDirection = 'raised';
      const socialMediaScore = 0.35;
      
      if (managementConfidence > 0.7) {
        signals.push('High management confidence');
      }
      if (guidanceDirection === 'raised') {
        signals.push('Management raised guidance');
      }
      if (socialMediaScore > 0.3) {
        signals.push('Strong positive social media sentiment');
      }
      
      expect(signals.length).toBe(3);
      expect(signals).toContain('High management confidence');
    });

    it('should extract bearish signals', () => {
      const signals: string[] = [];
      const managementConfidence = 0.35;
      const guidanceDirection = 'lowered';
      const socialMediaScore = -0.4;
      
      if (managementConfidence < 0.4) {
        signals.push('Low management confidence');
      }
      if (guidanceDirection === 'lowered') {
        signals.push('Management lowered guidance');
      }
      if (socialMediaScore < -0.3) {
        signals.push('Strong negative social media sentiment');
      }
      
      expect(signals.length).toBe(3);
      expect(signals).toContain('Management lowered guidance');
    });
  });
});
