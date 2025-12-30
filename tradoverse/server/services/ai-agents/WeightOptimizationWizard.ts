/**
 * Weight Optimization Wizard Service
 * 
 * Guides users through fine-tuning agent weights based on
 * their risk tolerance and trading style preferences.
 */

// Types
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';
export type TradingStyle = 'day_trading' | 'swing_trading' | 'position_trading' | 'long_term_investing';
export type MarketFocus = 'stocks' | 'crypto' | 'forex' | 'mixed';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface RiskProfile {
  userId: string;
  riskTolerance: RiskTolerance;
  tradingStyle: TradingStyle;
  marketFocus: MarketFocus;
  experienceLevel: ExperienceLevel;
  investmentHorizon: 'short' | 'medium' | 'long';
  maxDrawdownTolerance: number; // percentage
  preferredVolatility: 'low' | 'medium' | 'high';
  automationPreference: 'manual' | 'semi_auto' | 'full_auto';
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionnaireQuestion {
  id: string;
  category: 'risk' | 'style' | 'experience' | 'goals';
  question: string;
  options: {
    value: string;
    label: string;
    description?: string;
    weight: number;
  }[];
}

export interface QuestionnaireResponse {
  questionId: string;
  selectedValue: string;
}

export interface OptimizedWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  risk: number;
  regime: number;
  execution: number;
  coordinator: number;
}

export interface WeightRecommendation {
  weights: OptimizedWeights;
  explanation: string;
  confidence: number;
  riskLevel: RiskTolerance;
  expectedVolatility: 'low' | 'medium' | 'high';
  suitableFor: string[];
  warnings: string[];
}

export interface WizardStep {
  step: number;
  title: string;
  description: string;
  questions: QuestionnaireQuestion[];
}

// Risk questionnaire
const riskQuestionnaire: QuestionnaireQuestion[] = [
  {
    id: 'risk_1',
    category: 'risk',
    question: 'How would you react if your portfolio dropped 20% in a week?',
    options: [
      { value: 'sell_all', label: 'Sell everything immediately', description: 'Cut losses and exit', weight: 1 },
      { value: 'sell_some', label: 'Sell some positions', description: 'Reduce exposure', weight: 2 },
      { value: 'hold', label: 'Hold and wait', description: 'Wait for recovery', weight: 3 },
      { value: 'buy_more', label: 'Buy more at lower prices', description: 'Opportunity to average down', weight: 4 },
    ],
  },
  {
    id: 'risk_2',
    category: 'risk',
    question: 'What is your primary investment goal?',
    options: [
      { value: 'preserve', label: 'Preserve capital', description: 'Minimize losses', weight: 1 },
      { value: 'income', label: 'Generate steady income', description: 'Dividends and interest', weight: 2 },
      { value: 'growth', label: 'Grow wealth over time', description: 'Long-term appreciation', weight: 3 },
      { value: 'maximize', label: 'Maximize returns', description: 'Aggressive growth', weight: 4 },
    ],
  },
  {
    id: 'risk_3',
    category: 'risk',
    question: 'What percentage of your portfolio can you afford to lose?',
    options: [
      { value: '5', label: 'Up to 5%', description: 'Very low risk tolerance', weight: 1 },
      { value: '15', label: 'Up to 15%', description: 'Low risk tolerance', weight: 2 },
      { value: '30', label: 'Up to 30%', description: 'Moderate risk tolerance', weight: 3 },
      { value: '50', label: 'More than 30%', description: 'High risk tolerance', weight: 4 },
    ],
  },
];

const styleQuestionnaire: QuestionnaireQuestion[] = [
  {
    id: 'style_1',
    category: 'style',
    question: 'How often do you plan to trade?',
    options: [
      { value: 'daily', label: 'Multiple times per day', description: 'Day trading', weight: 4 },
      { value: 'weekly', label: 'Several times per week', description: 'Swing trading', weight: 3 },
      { value: 'monthly', label: 'A few times per month', description: 'Position trading', weight: 2 },
      { value: 'rarely', label: 'Rarely (buy and hold)', description: 'Long-term investing', weight: 1 },
    ],
  },
  {
    id: 'style_2',
    category: 'style',
    question: 'Which analysis method do you prefer?',
    options: [
      { value: 'technical', label: 'Technical analysis', description: 'Charts and indicators', weight: 4 },
      { value: 'fundamental', label: 'Fundamental analysis', description: 'Company financials', weight: 2 },
      { value: 'both', label: 'Both equally', description: 'Balanced approach', weight: 3 },
      { value: 'ai', label: 'AI-driven decisions', description: 'Let AI decide', weight: 3 },
    ],
  },
  {
    id: 'style_3',
    category: 'style',
    question: 'What is your preferred holding period?',
    options: [
      { value: 'minutes', label: 'Minutes to hours', description: 'Intraday', weight: 4 },
      { value: 'days', label: 'Days to weeks', description: 'Short-term', weight: 3 },
      { value: 'months', label: 'Weeks to months', description: 'Medium-term', weight: 2 },
      { value: 'years', label: 'Months to years', description: 'Long-term', weight: 1 },
    ],
  },
];

const experienceQuestionnaire: QuestionnaireQuestion[] = [
  {
    id: 'exp_1',
    category: 'experience',
    question: 'How long have you been trading?',
    options: [
      { value: 'new', label: 'Less than 1 year', description: 'Beginner', weight: 1 },
      { value: '1-3', label: '1-3 years', description: 'Some experience', weight: 2 },
      { value: '3-5', label: '3-5 years', description: 'Experienced', weight: 3 },
      { value: '5+', label: 'More than 5 years', description: 'Expert', weight: 4 },
    ],
  },
  {
    id: 'exp_2',
    category: 'experience',
    question: 'How familiar are you with technical indicators?',
    options: [
      { value: 'none', label: 'Not familiar at all', description: 'Never used them', weight: 1 },
      { value: 'basic', label: 'Know the basics', description: 'RSI, MACD, etc.', weight: 2 },
      { value: 'intermediate', label: 'Use them regularly', description: 'Multiple indicators', weight: 3 },
      { value: 'advanced', label: 'Expert level', description: 'Custom strategies', weight: 4 },
    ],
  },
];

const goalsQuestionnaire: QuestionnaireQuestion[] = [
  {
    id: 'goal_1',
    category: 'goals',
    question: 'What markets are you most interested in?',
    options: [
      { value: 'stocks', label: 'Stocks only', description: 'Traditional equities', weight: 2 },
      { value: 'crypto', label: 'Cryptocurrency only', description: 'Digital assets', weight: 4 },
      { value: 'forex', label: 'Forex only', description: 'Currency pairs', weight: 3 },
      { value: 'mixed', label: 'Multiple markets', description: 'Diversified', weight: 3 },
    ],
  },
  {
    id: 'goal_2',
    category: 'goals',
    question: 'How much automation do you want?',
    options: [
      { value: 'manual', label: 'Manual trading', description: 'I make all decisions', weight: 1 },
      { value: 'signals', label: 'AI signals only', description: 'I execute trades', weight: 2 },
      { value: 'semi', label: 'Semi-automated', description: 'AI suggests, I approve', weight: 3 },
      { value: 'full', label: 'Fully automated', description: 'AI handles everything', weight: 4 },
    ],
  },
];

// In-memory storage for profiles
const profileStore: Map<string, RiskProfile> = new Map();

/**
 * Get wizard steps
 */
export function getWizardSteps(): WizardStep[] {
  return [
    {
      step: 1,
      title: 'Risk Assessment',
      description: 'Help us understand your risk tolerance',
      questions: riskQuestionnaire,
    },
    {
      step: 2,
      title: 'Trading Style',
      description: 'Tell us about your trading preferences',
      questions: styleQuestionnaire,
    },
    {
      step: 3,
      title: 'Experience Level',
      description: 'Share your trading experience',
      questions: experienceQuestionnaire,
    },
    {
      step: 4,
      title: 'Goals & Preferences',
      description: 'Define your trading goals',
      questions: goalsQuestionnaire,
    },
  ];
}

/**
 * Calculate risk profile from questionnaire responses
 */
export function calculateRiskProfile(
  userId: string,
  responses: QuestionnaireResponse[]
): RiskProfile {
  const allQuestions = [
    ...riskQuestionnaire,
    ...styleQuestionnaire,
    ...experienceQuestionnaire,
    ...goalsQuestionnaire,
  ];
  
  let riskScore = 0;
  let styleScore = 0;
  let experienceScore = 0;
  let riskCount = 0;
  let styleCount = 0;
  let experienceCount = 0;
  
  let marketFocus: MarketFocus = 'mixed';
  let automationPreference: 'manual' | 'semi_auto' | 'full_auto' = 'semi_auto';
  
  for (const response of responses) {
    const question = allQuestions.find(q => q.id === response.questionId);
    if (!question) continue;
    
    const option = question.options.find(o => o.value === response.selectedValue);
    if (!option) continue;
    
    if (question.category === 'risk') {
      riskScore += option.weight;
      riskCount++;
    } else if (question.category === 'style') {
      styleScore += option.weight;
      styleCount++;
    } else if (question.category === 'experience') {
      experienceScore += option.weight;
      experienceCount++;
    } else if (question.category === 'goals') {
      if (question.id === 'goal_1') {
        marketFocus = response.selectedValue as MarketFocus;
      } else if (question.id === 'goal_2') {
        if (response.selectedValue === 'manual') automationPreference = 'manual';
        else if (response.selectedValue === 'full') automationPreference = 'full_auto';
        else automationPreference = 'semi_auto';
      }
    }
  }
  
  // Calculate averages
  const avgRisk = riskCount > 0 ? riskScore / riskCount : 2.5;
  const avgStyle = styleCount > 0 ? styleScore / styleCount : 2.5;
  const avgExperience = experienceCount > 0 ? experienceScore / experienceCount : 2;
  
  // Determine risk tolerance
  let riskTolerance: RiskTolerance;
  if (avgRisk <= 1.5) riskTolerance = 'conservative';
  else if (avgRisk <= 2.5) riskTolerance = 'moderate';
  else if (avgRisk <= 3.5) riskTolerance = 'aggressive';
  else riskTolerance = 'very_aggressive';
  
  // Determine trading style
  let tradingStyle: TradingStyle;
  if (avgStyle >= 3.5) tradingStyle = 'day_trading';
  else if (avgStyle >= 2.5) tradingStyle = 'swing_trading';
  else if (avgStyle >= 1.5) tradingStyle = 'position_trading';
  else tradingStyle = 'long_term_investing';
  
  // Determine experience level
  let experienceLevel: ExperienceLevel;
  if (avgExperience <= 1.5) experienceLevel = 'beginner';
  else if (avgExperience <= 2.5) experienceLevel = 'intermediate';
  else if (avgExperience <= 3.5) experienceLevel = 'advanced';
  else experienceLevel = 'expert';
  
  // Determine investment horizon
  let investmentHorizon: 'short' | 'medium' | 'long';
  if (tradingStyle === 'day_trading' || tradingStyle === 'swing_trading') {
    investmentHorizon = 'short';
  } else if (tradingStyle === 'position_trading') {
    investmentHorizon = 'medium';
  } else {
    investmentHorizon = 'long';
  }
  
  // Calculate max drawdown tolerance
  const maxDrawdownTolerance = avgRisk * 10; // 10-40%
  
  // Determine preferred volatility
  let preferredVolatility: 'low' | 'medium' | 'high';
  if (avgRisk <= 2) preferredVolatility = 'low';
  else if (avgRisk <= 3) preferredVolatility = 'medium';
  else preferredVolatility = 'high';
  
  const profile: RiskProfile = {
    userId,
    riskTolerance,
    tradingStyle,
    marketFocus,
    experienceLevel,
    investmentHorizon,
    maxDrawdownTolerance,
    preferredVolatility,
    automationPreference,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  profileStore.set(userId, profile);
  return profile;
}

/**
 * Get optimized weights based on risk profile
 */
export function getOptimizedWeights(profile: RiskProfile): WeightRecommendation {
  let weights: OptimizedWeights;
  let explanation: string;
  let warnings: string[] = [];
  let suitableFor: string[] = [];
  
  // Base weights by risk tolerance
  if (profile.riskTolerance === 'conservative') {
    weights = {
      technical: 0.10,
      fundamental: 0.25,
      sentiment: 0.10,
      risk: 0.25,
      regime: 0.15,
      execution: 0.05,
      coordinator: 0.10,
    };
    explanation = 'Conservative weights prioritize risk management and fundamental analysis for capital preservation.';
    suitableFor = ['Capital preservation', 'Steady income', 'Low volatility'];
    warnings = ['May miss high-growth opportunities', 'Lower potential returns'];
  } else if (profile.riskTolerance === 'moderate') {
    weights = {
      technical: 0.18,
      fundamental: 0.20,
      sentiment: 0.15,
      risk: 0.18,
      regime: 0.14,
      execution: 0.07,
      coordinator: 0.08,
    };
    explanation = 'Balanced weights provide a mix of growth potential and risk management.';
    suitableFor = ['Balanced growth', 'Moderate risk', 'Diversification'];
    warnings = ['May underperform in strong bull markets'];
  } else if (profile.riskTolerance === 'aggressive') {
    weights = {
      technical: 0.22,
      fundamental: 0.15,
      sentiment: 0.20,
      risk: 0.12,
      regime: 0.12,
      execution: 0.10,
      coordinator: 0.09,
    };
    explanation = 'Aggressive weights emphasize technical and sentiment analysis for higher returns.';
    suitableFor = ['Growth investing', 'Active trading', 'Higher returns'];
    warnings = ['Higher volatility expected', 'Larger potential drawdowns'];
  } else {
    weights = {
      technical: 0.25,
      fundamental: 0.10,
      sentiment: 0.25,
      risk: 0.08,
      regime: 0.10,
      execution: 0.12,
      coordinator: 0.10,
    };
    explanation = 'Very aggressive weights maximize technical and sentiment signals for maximum returns.';
    suitableFor = ['Day trading', 'Momentum trading', 'High-risk/high-reward'];
    warnings = ['Significant risk of large losses', 'Requires active monitoring', 'Not suitable for beginners'];
  }
  
  // Adjust for trading style
  if (profile.tradingStyle === 'day_trading') {
    weights.technical += 0.05;
    weights.execution += 0.03;
    weights.fundamental -= 0.05;
    weights.regime -= 0.03;
  } else if (profile.tradingStyle === 'long_term_investing') {
    weights.fundamental += 0.05;
    weights.regime += 0.03;
    weights.technical -= 0.05;
    weights.execution -= 0.03;
  }
  
  // Adjust for market focus
  if (profile.marketFocus === 'crypto') {
    weights.sentiment += 0.05;
    weights.technical += 0.03;
    weights.fundamental -= 0.05;
    weights.risk -= 0.03;
    warnings.push('Crypto markets are highly volatile');
  }
  
  // Adjust for experience level
  if (profile.experienceLevel === 'beginner') {
    weights.risk += 0.05;
    weights.coordinator += 0.03;
    weights.technical -= 0.05;
    weights.sentiment -= 0.03;
    warnings.push('Consider paper trading first');
  }
  
  // Normalize weights to sum to 1
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(weights) as (keyof OptimizedWeights)[]) {
    weights[key] = Math.max(0.05, weights[key] / total); // Minimum 5% per agent
  }
  
  // Re-normalize after minimum enforcement
  const newTotal = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(weights) as (keyof OptimizedWeights)[]) {
    weights[key] = weights[key] / newTotal;
  }
  
  return {
    weights,
    explanation,
    confidence: profile.experienceLevel === 'beginner' ? 0.7 : 0.85,
    riskLevel: profile.riskTolerance,
    expectedVolatility: profile.preferredVolatility,
    suitableFor,
    warnings,
  };
}

/**
 * Get user's risk profile
 */
export function getUserProfile(userId: string): RiskProfile | null {
  return profileStore.get(userId) || null;
}

/**
 * Update user's risk profile
 */
export function updateUserProfile(
  userId: string,
  updates: Partial<RiskProfile>
): RiskProfile | null {
  const profile = profileStore.get(userId);
  if (!profile) return null;
  
  const updatedProfile = {
    ...profile,
    ...updates,
    updatedAt: new Date(),
  };
  
  profileStore.set(userId, updatedProfile);
  return updatedProfile;
}

/**
 * Compare weight configurations
 */
export function compareWeightConfigs(
  config1: OptimizedWeights,
  config2: OptimizedWeights
): {
  differences: Record<string, number>;
  totalDifference: number;
  recommendation: string;
} {
  const differences: Record<string, number> = {};
  let totalDiff = 0;
  
  for (const key of Object.keys(config1) as (keyof OptimizedWeights)[]) {
    const diff = Math.abs(config1[key] - config2[key]);
    differences[key] = diff;
    totalDiff += diff;
  }
  
  let recommendation: string;
  if (totalDiff < 0.1) {
    recommendation = 'Configurations are very similar. Minor adjustments only.';
  } else if (totalDiff < 0.3) {
    recommendation = 'Moderate differences. Consider gradual transition.';
  } else {
    recommendation = 'Significant differences. Test with paper trading first.';
  }
  
  return {
    differences,
    totalDifference: totalDiff,
    recommendation,
  };
}

/**
 * Get preset weight configurations
 */
export function getPresetConfigurations(): {
  name: string;
  description: string;
  weights: OptimizedWeights;
  riskLevel: RiskTolerance;
}[] {
  return [
    {
      name: 'Conservative Income',
      description: 'Focus on capital preservation and steady income',
      weights: {
        technical: 0.10,
        fundamental: 0.30,
        sentiment: 0.08,
        risk: 0.25,
        regime: 0.12,
        execution: 0.05,
        coordinator: 0.10,
      },
      riskLevel: 'conservative',
    },
    {
      name: 'Balanced Growth',
      description: 'Mix of growth and stability',
      weights: {
        technical: 0.18,
        fundamental: 0.20,
        sentiment: 0.15,
        risk: 0.18,
        regime: 0.14,
        execution: 0.07,
        coordinator: 0.08,
      },
      riskLevel: 'moderate',
    },
    {
      name: 'Aggressive Growth',
      description: 'Maximize returns with higher risk',
      weights: {
        technical: 0.22,
        fundamental: 0.12,
        sentiment: 0.22,
        risk: 0.10,
        regime: 0.12,
        execution: 0.12,
        coordinator: 0.10,
      },
      riskLevel: 'aggressive',
    },
    {
      name: 'Day Trader',
      description: 'Optimized for short-term trading',
      weights: {
        technical: 0.28,
        fundamental: 0.05,
        sentiment: 0.25,
        risk: 0.10,
        regime: 0.08,
        execution: 0.14,
        coordinator: 0.10,
      },
      riskLevel: 'very_aggressive',
    },
    {
      name: 'Crypto Focus',
      description: 'Tailored for cryptocurrency markets',
      weights: {
        technical: 0.25,
        fundamental: 0.08,
        sentiment: 0.28,
        risk: 0.12,
        regime: 0.10,
        execution: 0.10,
        coordinator: 0.07,
      },
      riskLevel: 'aggressive',
    },
    {
      name: 'Value Investor',
      description: 'Long-term fundamental approach',
      weights: {
        technical: 0.08,
        fundamental: 0.35,
        sentiment: 0.10,
        risk: 0.18,
        regime: 0.15,
        execution: 0.04,
        coordinator: 0.10,
      },
      riskLevel: 'moderate',
    },
  ];
}

/**
 * Initialize sample profile for testing
 */
export function initializeSampleProfile(userId: string): RiskProfile {
  const profile: RiskProfile = {
    userId,
    riskTolerance: 'moderate',
    tradingStyle: 'swing_trading',
    marketFocus: 'mixed',
    experienceLevel: 'intermediate',
    investmentHorizon: 'medium',
    maxDrawdownTolerance: 20,
    preferredVolatility: 'medium',
    automationPreference: 'semi_auto',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  profileStore.set(userId, profile);
  return profile;
}
