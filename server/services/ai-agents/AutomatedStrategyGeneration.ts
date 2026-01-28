/**
 * Automated Strategy Generation Service
 * 
 * AI-powered system that generates custom trading strategies based on
 * user risk profiles, market conditions, and investment goals.
 */

// Types
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';
export type InvestmentHorizon = 'short_term' | 'medium_term' | 'long_term' | 'very_long_term';
export type TradingStyle = 'day_trading' | 'swing_trading' | 'position_trading' | 'buy_and_hold';
export type StrategyType = 'momentum' | 'mean_reversion' | 'breakout' | 'trend_following' | 'value' | 'growth' | 'dividend' | 'volatility' | 'pairs_trading' | 'arbitrage';
export type AssetClass = 'stocks' | 'crypto' | 'forex' | 'commodities' | 'etfs' | 'options';
export type MarketCondition = 'bull' | 'bear' | 'sideways' | 'volatile' | 'low_volatility';
export type IndicatorType = 'trend' | 'momentum' | 'volatility' | 'volume' | 'sentiment';

export interface RiskProfile {
  id: string;
  userId: string;
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  tradingStyle: TradingStyle;
  maxDrawdownTolerance: number; // percentage
  targetAnnualReturn: number; // percentage
  preferredAssetClasses: AssetClass[];
  capitalAllocation: number; // total capital
  maxPositionSize: number; // percentage of capital
  maxOpenPositions: number;
  tradingFrequency: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  emotionalTolerance: number; // 1-10 scale
  timeAvailability: 'minimal' | 'part_time' | 'full_time';
  createdAt: number;
  updatedAt: number;
}

export interface EntryRule {
  id: string;
  name: string;
  description: string;
  indicator: string;
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between';
  value: number | [number, number];
  timeframe: string;
  weight: number;
  isRequired: boolean;
}

export interface ExitRule {
  id: string;
  name: string;
  type: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'time_based' | 'indicator_based';
  description: string;
  value: number;
  isPercentage: boolean;
  indicator?: string;
  condition?: string;
}

export interface PositionSizing {
  method: 'fixed' | 'percent_of_capital' | 'risk_based' | 'volatility_adjusted' | 'kelly_criterion';
  baseSize: number;
  maxSize: number;
  riskPerTrade: number; // percentage of capital
  scalingFactor: number;
}

export interface StrategyIndicator {
  name: string;
  type: IndicatorType;
  parameters: Record<string, number | number[]>;
  weight: number;
  description: string;
}

export interface GeneratedStrategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  riskLevel: RiskTolerance;
  targetMarkets: AssetClass[];
  suitableConditions: MarketCondition[];
  
  // Entry/Exit Rules
  entryRules: EntryRule[];
  exitRules: ExitRule[];
  
  // Position Management
  positionSizing: PositionSizing;
  maxConcurrentPositions: number;
  
  // Indicators Used
  indicators: StrategyIndicator[];
  
  // Performance Expectations
  expectedWinRate: number;
  expectedRiskReward: number;
  expectedSharpeRatio: number;
  expectedMaxDrawdown: number;
  expectedAnnualReturn: number;
  
  // Backtesting Results
  backtestResults?: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    annualReturn: number;
    calmarRatio: number;
  };
  
  // Metadata
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  timeToImplement: string;
  maintenanceLevel: 'low' | 'medium' | 'high';
  createdAt: number;
  createdFor: string; // userId
}

export interface StrategyTemplate {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  suitableFor: RiskTolerance[];
  marketConditions: MarketCondition[];
  assetClasses: AssetClass[];
  baseIndicators: string[];
  expectedPerformance: {
    winRate: [number, number];
    riskReward: [number, number];
    drawdown: [number, number];
  };
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
}

export interface QuestionnaireQuestion {
  id: string;
  category: 'risk' | 'goals' | 'experience' | 'preferences' | 'constraints';
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'number';
  options?: Array<{ value: string | number; label: string; score?: number }>;
  min?: number;
  max?: number;
  required: boolean;
}

export interface QuestionnaireResponse {
  questionId: string;
  answer: string | number | string[];
}

// Strategy Templates
export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'momentum_breakout',
    name: 'Momentum Breakout',
    type: 'momentum',
    description: 'Captures strong price movements when assets break out of consolidation patterns with high momentum.',
    suitableFor: ['moderate', 'aggressive', 'very_aggressive'],
    marketConditions: ['bull', 'volatile'],
    assetClasses: ['stocks', 'crypto', 'forex'],
    baseIndicators: ['RSI', 'MACD', 'Volume', 'ATR', 'Bollinger Bands'],
    expectedPerformance: {
      winRate: [0.45, 0.55],
      riskReward: [2.0, 3.5],
      drawdown: [0.15, 0.30],
    },
    complexity: 'moderate',
  },
  {
    id: 'mean_reversion_rsi',
    name: 'RSI Mean Reversion',
    type: 'mean_reversion',
    description: 'Trades oversold/overbought conditions expecting price to revert to the mean.',
    suitableFor: ['conservative', 'moderate'],
    marketConditions: ['sideways', 'low_volatility'],
    assetClasses: ['stocks', 'etfs', 'forex'],
    baseIndicators: ['RSI', 'Bollinger Bands', 'SMA', 'Stochastic'],
    expectedPerformance: {
      winRate: [0.55, 0.65],
      riskReward: [1.2, 1.8],
      drawdown: [0.08, 0.15],
    },
    complexity: 'simple',
  },
  {
    id: 'trend_following_ma',
    name: 'Moving Average Trend Following',
    type: 'trend_following',
    description: 'Follows established trends using moving average crossovers and trend strength indicators.',
    suitableFor: ['moderate', 'aggressive'],
    marketConditions: ['bull', 'bear'],
    assetClasses: ['stocks', 'crypto', 'commodities', 'forex'],
    baseIndicators: ['EMA', 'SMA', 'ADX', 'MACD', 'Parabolic SAR'],
    expectedPerformance: {
      winRate: [0.40, 0.50],
      riskReward: [2.5, 4.0],
      drawdown: [0.20, 0.35],
    },
    complexity: 'moderate',
  },
  {
    id: 'breakout_volume',
    name: 'Volume Breakout',
    type: 'breakout',
    description: 'Identifies breakouts confirmed by significant volume increases.',
    suitableFor: ['aggressive', 'very_aggressive'],
    marketConditions: ['bull', 'volatile'],
    assetClasses: ['stocks', 'crypto'],
    baseIndicators: ['Volume', 'OBV', 'ATR', 'Bollinger Bands', 'VWAP'],
    expectedPerformance: {
      winRate: [0.35, 0.45],
      riskReward: [3.0, 5.0],
      drawdown: [0.25, 0.40],
    },
    complexity: 'moderate',
  },
  {
    id: 'value_investing',
    name: 'Value Investing',
    type: 'value',
    description: 'Long-term strategy focusing on undervalued assets with strong fundamentals.',
    suitableFor: ['conservative', 'moderate'],
    marketConditions: ['bear', 'sideways'],
    assetClasses: ['stocks', 'etfs'],
    baseIndicators: ['P/E Ratio', 'P/B Ratio', 'Dividend Yield', 'ROE', 'Debt/Equity'],
    expectedPerformance: {
      winRate: [0.55, 0.70],
      riskReward: [1.5, 2.5],
      drawdown: [0.10, 0.25],
    },
    complexity: 'moderate',
  },
  {
    id: 'growth_momentum',
    name: 'Growth Momentum',
    type: 'growth',
    description: 'Targets high-growth companies with strong earnings momentum.',
    suitableFor: ['aggressive', 'very_aggressive'],
    marketConditions: ['bull'],
    assetClasses: ['stocks'],
    baseIndicators: ['Revenue Growth', 'EPS Growth', 'RSI', 'MACD', 'Volume'],
    expectedPerformance: {
      winRate: [0.45, 0.55],
      riskReward: [2.0, 4.0],
      drawdown: [0.25, 0.45],
    },
    complexity: 'complex',
  },
  {
    id: 'dividend_income',
    name: 'Dividend Income',
    type: 'dividend',
    description: 'Focuses on stable dividend-paying stocks for consistent income.',
    suitableFor: ['conservative'],
    marketConditions: ['bull', 'sideways', 'bear'],
    assetClasses: ['stocks', 'etfs'],
    baseIndicators: ['Dividend Yield', 'Payout Ratio', 'Dividend Growth', 'P/E Ratio'],
    expectedPerformance: {
      winRate: [0.60, 0.75],
      riskReward: [1.0, 1.5],
      drawdown: [0.05, 0.15],
    },
    complexity: 'simple',
  },
  {
    id: 'volatility_trading',
    name: 'Volatility Trading',
    type: 'volatility',
    description: 'Profits from volatility expansion and contraction patterns.',
    suitableFor: ['aggressive', 'very_aggressive'],
    marketConditions: ['volatile', 'sideways'],
    assetClasses: ['stocks', 'options', 'crypto'],
    baseIndicators: ['ATR', 'Bollinger Bands', 'VIX', 'Historical Volatility', 'IV Rank'],
    expectedPerformance: {
      winRate: [0.50, 0.60],
      riskReward: [1.5, 2.5],
      drawdown: [0.20, 0.35],
    },
    complexity: 'advanced',
  },
  {
    id: 'pairs_trading',
    name: 'Statistical Pairs Trading',
    type: 'pairs_trading',
    description: 'Market-neutral strategy trading correlated asset pairs.',
    suitableFor: ['moderate', 'aggressive'],
    marketConditions: ['sideways', 'low_volatility', 'volatile'],
    assetClasses: ['stocks', 'etfs', 'forex'],
    baseIndicators: ['Correlation', 'Z-Score', 'Spread', 'Cointegration'],
    expectedPerformance: {
      winRate: [0.55, 0.65],
      riskReward: [1.2, 2.0],
      drawdown: [0.08, 0.18],
    },
    complexity: 'advanced',
  },
  {
    id: 'scalping',
    name: 'High-Frequency Scalping',
    type: 'momentum',
    description: 'Quick trades capturing small price movements with high frequency.',
    suitableFor: ['very_aggressive'],
    marketConditions: ['volatile', 'bull', 'bear'],
    assetClasses: ['forex', 'crypto'],
    baseIndicators: ['VWAP', 'Order Flow', 'Tick Volume', 'Spread', 'EMA'],
    expectedPerformance: {
      winRate: [0.55, 0.70],
      riskReward: [0.8, 1.2],
      drawdown: [0.05, 0.15],
    },
    complexity: 'advanced',
  },
];

// Risk Profile Questionnaire
export const QUESTIONNAIRE: QuestionnaireQuestion[] = [
  {
    id: 'q1_risk_tolerance',
    category: 'risk',
    question: 'How would you react if your portfolio dropped 20% in a month?',
    type: 'single_choice',
    options: [
      { value: 'sell_all', label: 'Sell everything immediately', score: 1 },
      { value: 'sell_some', label: 'Sell some positions to reduce risk', score: 2 },
      { value: 'hold', label: 'Hold and wait for recovery', score: 3 },
      { value: 'buy_more', label: 'Buy more at lower prices', score: 4 },
    ],
    required: true,
  },
  {
    id: 'q2_investment_horizon',
    category: 'goals',
    question: 'What is your primary investment time horizon?',
    type: 'single_choice',
    options: [
      { value: 'short_term', label: 'Less than 1 year', score: 1 },
      { value: 'medium_term', label: '1-3 years', score: 2 },
      { value: 'long_term', label: '3-10 years', score: 3 },
      { value: 'very_long_term', label: 'More than 10 years', score: 4 },
    ],
    required: true,
  },
  {
    id: 'q3_trading_style',
    category: 'preferences',
    question: 'Which trading style appeals to you most?',
    type: 'single_choice',
    options: [
      { value: 'day_trading', label: 'Day Trading (multiple trades per day)' },
      { value: 'swing_trading', label: 'Swing Trading (days to weeks)' },
      { value: 'position_trading', label: 'Position Trading (weeks to months)' },
      { value: 'buy_and_hold', label: 'Buy and Hold (months to years)' },
    ],
    required: true,
  },
  {
    id: 'q4_max_drawdown',
    category: 'risk',
    question: 'What is the maximum portfolio drawdown you can tolerate?',
    type: 'single_choice',
    options: [
      { value: 5, label: '5% - Very Conservative', score: 1 },
      { value: 10, label: '10% - Conservative', score: 2 },
      { value: 20, label: '20% - Moderate', score: 3 },
      { value: 30, label: '30% - Aggressive', score: 4 },
      { value: 50, label: '50%+ - Very Aggressive', score: 5 },
    ],
    required: true,
  },
  {
    id: 'q5_target_return',
    category: 'goals',
    question: 'What annual return are you targeting?',
    type: 'single_choice',
    options: [
      { value: 5, label: '5-10% (Conservative)', score: 1 },
      { value: 15, label: '10-20% (Moderate)', score: 2 },
      { value: 30, label: '20-40% (Aggressive)', score: 3 },
      { value: 50, label: '40%+ (Very Aggressive)', score: 4 },
    ],
    required: true,
  },
  {
    id: 'q6_asset_classes',
    category: 'preferences',
    question: 'Which asset classes are you interested in trading?',
    type: 'multiple_choice',
    options: [
      { value: 'stocks', label: 'Stocks' },
      { value: 'crypto', label: 'Cryptocurrency' },
      { value: 'forex', label: 'Forex' },
      { value: 'commodities', label: 'Commodities' },
      { value: 'etfs', label: 'ETFs' },
      { value: 'options', label: 'Options' },
    ],
    required: true,
  },
  {
    id: 'q7_capital',
    category: 'constraints',
    question: 'How much capital do you plan to allocate to trading?',
    type: 'single_choice',
    options: [
      { value: 1000, label: 'Under $1,000' },
      { value: 5000, label: '$1,000 - $10,000' },
      { value: 25000, label: '$10,000 - $50,000' },
      { value: 100000, label: '$50,000 - $250,000' },
      { value: 500000, label: '$250,000+' },
    ],
    required: true,
  },
  {
    id: 'q8_experience',
    category: 'experience',
    question: 'How would you describe your trading experience?',
    type: 'single_choice',
    options: [
      { value: 'beginner', label: 'Beginner (less than 1 year)', score: 1 },
      { value: 'intermediate', label: 'Intermediate (1-3 years)', score: 2 },
      { value: 'advanced', label: 'Advanced (3-7 years)', score: 3 },
      { value: 'expert', label: 'Expert (7+ years)', score: 4 },
    ],
    required: true,
  },
  {
    id: 'q9_time_availability',
    category: 'constraints',
    question: 'How much time can you dedicate to trading daily?',
    type: 'single_choice',
    options: [
      { value: 'minimal', label: 'Minimal (check once a day)' },
      { value: 'part_time', label: 'Part-time (1-3 hours)' },
      { value: 'full_time', label: 'Full-time (4+ hours)' },
    ],
    required: true,
  },
  {
    id: 'q10_emotional_tolerance',
    category: 'risk',
    question: 'On a scale of 1-10, how well do you handle financial stress?',
    type: 'scale',
    min: 1,
    max: 10,
    required: true,
  },
];

// Helper Functions
function generateId(): string {
  return `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateRiskScore(responses: QuestionnaireResponse[]): number {
  let totalScore = 0;
  let count = 0;
  
  responses.forEach(response => {
    const question = QUESTIONNAIRE.find(q => q.id === response.questionId);
    if (question && question.options) {
      const option = question.options.find(o => o.value === response.answer);
      if (option && option.score !== undefined) {
        totalScore += option.score;
        count++;
      }
    }
  });
  
  return count > 0 ? totalScore / count : 2.5;
}

function determineRiskTolerance(score: number): RiskTolerance {
  if (score <= 1.5) return 'conservative';
  if (score <= 2.5) return 'moderate';
  if (score <= 3.5) return 'aggressive';
  return 'very_aggressive';
}

function determineInvestmentHorizon(responses: QuestionnaireResponse[]): InvestmentHorizon {
  const horizonResponse = responses.find(r => r.questionId === 'q2_investment_horizon');
  return (horizonResponse?.answer as InvestmentHorizon) || 'medium_term';
}

function determineTradingStyle(responses: QuestionnaireResponse[]): TradingStyle {
  const styleResponse = responses.find(r => r.questionId === 'q3_trading_style');
  return (styleResponse?.answer as TradingStyle) || 'swing_trading';
}

function getPreferredAssetClasses(responses: QuestionnaireResponse[]): AssetClass[] {
  const assetsResponse = responses.find(r => r.questionId === 'q6_asset_classes');
  if (assetsResponse && Array.isArray(assetsResponse.answer)) {
    return assetsResponse.answer as AssetClass[];
  }
  return ['stocks'];
}

// Generate Entry Rules based on strategy type
function generateEntryRules(strategyType: StrategyType, riskTolerance: RiskTolerance): EntryRule[] {
  const rules: EntryRule[] = [];
  
  switch (strategyType) {
    case 'momentum':
      rules.push(
        {
          id: 'entry_1',
          name: 'RSI Momentum',
          description: 'Enter when RSI shows strong momentum',
          indicator: 'RSI',
          condition: riskTolerance === 'conservative' ? 'above' : 'crosses_above',
          value: riskTolerance === 'conservative' ? 55 : 50,
          timeframe: '1D',
          weight: 0.3,
          isRequired: true,
        },
        {
          id: 'entry_2',
          name: 'MACD Signal',
          description: 'MACD line crosses above signal line',
          indicator: 'MACD',
          condition: 'crosses_above',
          value: 0,
          timeframe: '1D',
          weight: 0.25,
          isRequired: true,
        },
        {
          id: 'entry_3',
          name: 'Volume Confirmation',
          description: 'Volume above 20-day average',
          indicator: 'Volume',
          condition: 'above',
          value: 1.2, // 120% of average
          timeframe: '1D',
          weight: 0.2,
          isRequired: false,
        },
        {
          id: 'entry_4',
          name: 'Price Above EMA',
          description: 'Price above 20 EMA',
          indicator: 'EMA_20',
          condition: 'above',
          value: 0,
          timeframe: '1D',
          weight: 0.25,
          isRequired: false,
        }
      );
      break;
      
    case 'mean_reversion':
      rules.push(
        {
          id: 'entry_1',
          name: 'RSI Oversold',
          description: 'RSI indicates oversold condition',
          indicator: 'RSI',
          condition: 'below',
          value: riskTolerance === 'conservative' ? 25 : 30,
          timeframe: '1D',
          weight: 0.35,
          isRequired: true,
        },
        {
          id: 'entry_2',
          name: 'Bollinger Band Touch',
          description: 'Price touches lower Bollinger Band',
          indicator: 'BB_Lower',
          condition: 'below',
          value: 0,
          timeframe: '1D',
          weight: 0.3,
          isRequired: true,
        },
        {
          id: 'entry_3',
          name: 'Stochastic Oversold',
          description: 'Stochastic below 20',
          indicator: 'Stochastic',
          condition: 'below',
          value: 20,
          timeframe: '1D',
          weight: 0.2,
          isRequired: false,
        },
        {
          id: 'entry_4',
          name: 'Support Level',
          description: 'Near historical support',
          indicator: 'Support',
          condition: 'below',
          value: 1.02, // Within 2% of support
          timeframe: '1D',
          weight: 0.15,
          isRequired: false,
        }
      );
      break;
      
    case 'trend_following':
      rules.push(
        {
          id: 'entry_1',
          name: 'EMA Crossover',
          description: '20 EMA crosses above 50 EMA',
          indicator: 'EMA_20_50',
          condition: 'crosses_above',
          value: 0,
          timeframe: '1D',
          weight: 0.35,
          isRequired: true,
        },
        {
          id: 'entry_2',
          name: 'ADX Trend Strength',
          description: 'ADX above 25 indicating strong trend',
          indicator: 'ADX',
          condition: 'above',
          value: 25,
          timeframe: '1D',
          weight: 0.25,
          isRequired: true,
        },
        {
          id: 'entry_3',
          name: 'Price Above 200 SMA',
          description: 'Long-term uptrend confirmation',
          indicator: 'SMA_200',
          condition: 'above',
          value: 0,
          timeframe: '1D',
          weight: 0.2,
          isRequired: false,
        },
        {
          id: 'entry_4',
          name: 'Parabolic SAR',
          description: 'SAR below price (bullish)',
          indicator: 'PSAR',
          condition: 'below',
          value: 0,
          timeframe: '1D',
          weight: 0.2,
          isRequired: false,
        }
      );
      break;
      
    case 'breakout':
      rules.push(
        {
          id: 'entry_1',
          name: 'Resistance Breakout',
          description: 'Price breaks above resistance',
          indicator: 'Resistance',
          condition: 'above',
          value: 1.01, // 1% above resistance
          timeframe: '1D',
          weight: 0.35,
          isRequired: true,
        },
        {
          id: 'entry_2',
          name: 'Volume Surge',
          description: 'Volume 150%+ of average',
          indicator: 'Volume',
          condition: 'above',
          value: 1.5,
          timeframe: '1D',
          weight: 0.3,
          isRequired: true,
        },
        {
          id: 'entry_3',
          name: 'ATR Expansion',
          description: 'Volatility expanding',
          indicator: 'ATR',
          condition: 'above',
          value: 1.2, // 120% of average ATR
          timeframe: '1D',
          weight: 0.2,
          isRequired: false,
        },
        {
          id: 'entry_4',
          name: 'Momentum Confirmation',
          description: 'RSI above 50',
          indicator: 'RSI',
          condition: 'above',
          value: 50,
          timeframe: '1D',
          weight: 0.15,
          isRequired: false,
        }
      );
      break;
      
    default:
      // Generic entry rules
      rules.push(
        {
          id: 'entry_1',
          name: 'Trend Confirmation',
          description: 'Price above 50 SMA',
          indicator: 'SMA_50',
          condition: 'above',
          value: 0,
          timeframe: '1D',
          weight: 0.4,
          isRequired: true,
        },
        {
          id: 'entry_2',
          name: 'Momentum Check',
          description: 'RSI between 40-70',
          indicator: 'RSI',
          condition: 'between',
          value: [40, 70],
          timeframe: '1D',
          weight: 0.3,
          isRequired: false,
        },
        {
          id: 'entry_3',
          name: 'Volume Confirmation',
          description: 'Above average volume',
          indicator: 'Volume',
          condition: 'above',
          value: 1.0,
          timeframe: '1D',
          weight: 0.3,
          isRequired: false,
        }
      );
  }
  
  return rules;
}

// Generate Exit Rules based on strategy and risk tolerance
function generateExitRules(strategyType: StrategyType, riskTolerance: RiskTolerance): ExitRule[] {
  const rules: ExitRule[] = [];
  
  // Stop Loss
  const stopLossPercent = {
    conservative: 3,
    moderate: 5,
    aggressive: 8,
    very_aggressive: 12,
  }[riskTolerance];
  
  rules.push({
    id: 'exit_sl',
    name: 'Stop Loss',
    type: 'stop_loss',
    description: `Exit if price drops ${stopLossPercent}% from entry`,
    value: stopLossPercent,
    isPercentage: true,
  });
  
  // Take Profit
  const takeProfitMultiplier = {
    conservative: 1.5,
    moderate: 2.0,
    aggressive: 2.5,
    very_aggressive: 3.0,
  }[riskTolerance];
  
  rules.push({
    id: 'exit_tp',
    name: 'Take Profit',
    type: 'take_profit',
    description: `Exit at ${stopLossPercent * takeProfitMultiplier}% profit`,
    value: stopLossPercent * takeProfitMultiplier,
    isPercentage: true,
  });
  
  // Trailing Stop
  if (strategyType === 'trend_following' || strategyType === 'momentum') {
    rules.push({
      id: 'exit_ts',
      name: 'Trailing Stop',
      type: 'trailing_stop',
      description: `Trail stop at ${stopLossPercent * 1.5}% from high`,
      value: stopLossPercent * 1.5,
      isPercentage: true,
    });
  }
  
  // Indicator-based exits
  if (strategyType === 'mean_reversion') {
    rules.push({
      id: 'exit_rsi',
      name: 'RSI Overbought Exit',
      type: 'indicator_based',
      description: 'Exit when RSI reaches overbought',
      value: 70,
      isPercentage: false,
      indicator: 'RSI',
      condition: 'above',
    });
  }
  
  // Time-based exit for swing trading
  if (strategyType === 'breakout' || strategyType === 'momentum') {
    rules.push({
      id: 'exit_time',
      name: 'Time-Based Exit',
      type: 'time_based',
      description: 'Exit after 10 trading days if no target hit',
      value: 10,
      isPercentage: false,
    });
  }
  
  return rules;
}

// Generate Position Sizing
function generatePositionSizing(riskTolerance: RiskTolerance, capital: number): PositionSizing {
  const riskPerTrade = {
    conservative: 0.5,
    moderate: 1.0,
    aggressive: 2.0,
    very_aggressive: 3.0,
  }[riskTolerance];
  
  const maxSize = {
    conservative: 5,
    moderate: 10,
    aggressive: 15,
    very_aggressive: 25,
  }[riskTolerance];
  
  return {
    method: riskTolerance === 'conservative' ? 'percent_of_capital' : 'risk_based',
    baseSize: capital * (riskPerTrade / 100),
    maxSize: capital * (maxSize / 100),
    riskPerTrade,
    scalingFactor: 1.0,
  };
}

// Generate Strategy Indicators
function generateIndicators(strategyType: StrategyType): StrategyIndicator[] {
  const indicators: StrategyIndicator[] = [];
  
  switch (strategyType) {
    case 'momentum':
      indicators.push(
        { name: 'RSI', type: 'momentum', parameters: { period: 14 }, weight: 0.25, description: 'Relative Strength Index' },
        { name: 'MACD', type: 'momentum', parameters: { fast: 12, slow: 26, signal: 9 }, weight: 0.25, description: 'Moving Average Convergence Divergence' },
        { name: 'EMA', type: 'trend', parameters: { period: 20 }, weight: 0.2, description: '20-period Exponential Moving Average' },
        { name: 'Volume', type: 'volume', parameters: { period: 20 }, weight: 0.15, description: 'Volume with 20-day average' },
        { name: 'ATR', type: 'volatility', parameters: { period: 14 }, weight: 0.15, description: 'Average True Range' }
      );
      break;
      
    case 'mean_reversion':
      indicators.push(
        { name: 'RSI', type: 'momentum', parameters: { period: 14 }, weight: 0.3, description: 'Relative Strength Index' },
        { name: 'Bollinger Bands', type: 'volatility', parameters: { period: 20, stdDev: 2 }, weight: 0.25, description: 'Bollinger Bands' },
        { name: 'Stochastic', type: 'momentum', parameters: { k: 14, d: 3 }, weight: 0.2, description: 'Stochastic Oscillator' },
        { name: 'SMA', type: 'trend', parameters: { period: 50 }, weight: 0.15, description: '50-period Simple Moving Average' },
        { name: 'Volume', type: 'volume', parameters: { period: 20 }, weight: 0.1, description: 'Volume analysis' }
      );
      break;
      
    case 'trend_following':
      indicators.push(
        { name: 'EMA', type: 'trend', parameters: { periods: [20, 50, 200] }, weight: 0.3, description: 'Multiple EMAs' },
        { name: 'ADX', type: 'trend', parameters: { period: 14 }, weight: 0.25, description: 'Average Directional Index' },
        { name: 'MACD', type: 'momentum', parameters: { fast: 12, slow: 26, signal: 9 }, weight: 0.2, description: 'MACD' },
        { name: 'Parabolic SAR', type: 'trend', parameters: { step: 0.02, max: 0.2 }, weight: 0.15, description: 'Parabolic SAR' },
        { name: 'ATR', type: 'volatility', parameters: { period: 14 }, weight: 0.1, description: 'Average True Range' }
      );
      break;
      
    case 'breakout':
      indicators.push(
        { name: 'Volume', type: 'volume', parameters: { period: 20 }, weight: 0.3, description: 'Volume analysis' },
        { name: 'ATR', type: 'volatility', parameters: { period: 14 }, weight: 0.25, description: 'Average True Range' },
        { name: 'Bollinger Bands', type: 'volatility', parameters: { period: 20, stdDev: 2 }, weight: 0.2, description: 'Bollinger Bands' },
        { name: 'OBV', type: 'volume', parameters: {}, weight: 0.15, description: 'On-Balance Volume' },
        { name: 'RSI', type: 'momentum', parameters: { period: 14 }, weight: 0.1, description: 'RSI for confirmation' }
      );
      break;
      
    default:
      indicators.push(
        { name: 'SMA', type: 'trend', parameters: { period: 50 }, weight: 0.25, description: 'Simple Moving Average' },
        { name: 'RSI', type: 'momentum', parameters: { period: 14 }, weight: 0.25, description: 'Relative Strength Index' },
        { name: 'Volume', type: 'volume', parameters: { period: 20 }, weight: 0.25, description: 'Volume analysis' },
        { name: 'ATR', type: 'volatility', parameters: { period: 14 }, weight: 0.25, description: 'Average True Range' }
      );
  }
  
  return indicators;
}

// Main Functions

/**
 * Process questionnaire responses and create a risk profile
 */
export function createRiskProfile(userId: string, responses: QuestionnaireResponse[]): RiskProfile {
  const riskScore = calculateRiskScore(responses);
  const riskTolerance = determineRiskTolerance(riskScore);
  const investmentHorizon = determineInvestmentHorizon(responses);
  const tradingStyle = determineTradingStyle(responses);
  const preferredAssetClasses = getPreferredAssetClasses(responses);
  
  const maxDrawdownResponse = responses.find(r => r.questionId === 'q4_max_drawdown');
  const targetReturnResponse = responses.find(r => r.questionId === 'q5_target_return');
  const capitalResponse = responses.find(r => r.questionId === 'q7_capital');
  const experienceResponse = responses.find(r => r.questionId === 'q8_experience');
  const timeResponse = responses.find(r => r.questionId === 'q9_time_availability');
  const emotionalResponse = responses.find(r => r.questionId === 'q10_emotional_tolerance');
  
  return {
    id: `profile_${Date.now()}`,
    userId,
    riskTolerance,
    investmentHorizon,
    tradingStyle,
    maxDrawdownTolerance: (maxDrawdownResponse?.answer as number) || 20,
    targetAnnualReturn: (targetReturnResponse?.answer as number) || 15,
    preferredAssetClasses,
    capitalAllocation: (capitalResponse?.answer as number) || 10000,
    maxPositionSize: riskTolerance === 'conservative' ? 5 : riskTolerance === 'moderate' ? 10 : 15,
    maxOpenPositions: riskTolerance === 'conservative' ? 5 : riskTolerance === 'moderate' ? 10 : 15,
    tradingFrequency: tradingStyle === 'day_trading' ? 'very_high' : tradingStyle === 'swing_trading' ? 'medium' : 'low',
    experienceLevel: (experienceResponse?.answer as RiskProfile['experienceLevel']) || 'intermediate',
    emotionalTolerance: (emotionalResponse?.answer as number) || 5,
    timeAvailability: (timeResponse?.answer as RiskProfile['timeAvailability']) || 'part_time',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Generate a custom trading strategy based on risk profile
 */
export function generateStrategy(profile: RiskProfile, preferredType?: StrategyType): GeneratedStrategy {
  // Find suitable templates
  const suitableTemplates = STRATEGY_TEMPLATES.filter(t => 
    t.suitableFor.includes(profile.riskTolerance) &&
    t.assetClasses.some(a => profile.preferredAssetClasses.includes(a))
  );
  
  // Select template based on preference or best match
  let selectedTemplate: StrategyTemplate;
  if (preferredType) {
    selectedTemplate = suitableTemplates.find(t => t.type === preferredType) || suitableTemplates[0];
  } else {
    // Score templates based on profile match
    const scoredTemplates = suitableTemplates.map(t => ({
      template: t,
      score: calculateTemplateScore(t, profile),
    })).sort((a, b) => b.score - a.score);
    
    selectedTemplate = scoredTemplates[0]?.template || STRATEGY_TEMPLATES[0];
  }
  
  // Generate strategy components
  const entryRules = generateEntryRules(selectedTemplate.type, profile.riskTolerance);
  const exitRules = generateExitRules(selectedTemplate.type, profile.riskTolerance);
  const positionSizing = generatePositionSizing(profile.riskTolerance, profile.capitalAllocation);
  const indicators = generateIndicators(selectedTemplate.type);
  
  // Calculate expected performance
  const [minWinRate, maxWinRate] = selectedTemplate.expectedPerformance.winRate;
  const [minRR, maxRR] = selectedTemplate.expectedPerformance.riskReward;
  const [minDD, maxDD] = selectedTemplate.expectedPerformance.drawdown;
  
  const expectedWinRate = (minWinRate + maxWinRate) / 2;
  const expectedRiskReward = (minRR + maxRR) / 2;
  const expectedMaxDrawdown = (minDD + maxDD) / 2;
  
  // Calculate expected return based on win rate and risk/reward
  const avgWin = positionSizing.riskPerTrade * expectedRiskReward;
  const avgLoss = positionSizing.riskPerTrade;
  const expectedPerTrade = (expectedWinRate * avgWin) - ((1 - expectedWinRate) * avgLoss);
  const tradesPerYear = profile.tradingStyle === 'day_trading' ? 200 : profile.tradingStyle === 'swing_trading' ? 50 : 20;
  const expectedAnnualReturn = expectedPerTrade * tradesPerYear;
  
  // Calculate Sharpe ratio estimate
  const expectedSharpeRatio = expectedAnnualReturn / (expectedMaxDrawdown * 2);
  
  return {
    id: generateId(),
    name: `${profile.riskTolerance.charAt(0).toUpperCase() + profile.riskTolerance.slice(1)} ${selectedTemplate.name}`,
    description: `${selectedTemplate.description} Customized for ${profile.riskTolerance} risk tolerance with ${profile.tradingStyle.replace('_', ' ')} approach.`,
    type: selectedTemplate.type,
    riskLevel: profile.riskTolerance,
    targetMarkets: profile.preferredAssetClasses,
    suitableConditions: selectedTemplate.marketConditions,
    entryRules,
    exitRules,
    positionSizing,
    maxConcurrentPositions: profile.maxOpenPositions,
    indicators,
    expectedWinRate,
    expectedRiskReward,
    expectedSharpeRatio: Math.round(expectedSharpeRatio * 100) / 100,
    expectedMaxDrawdown,
    expectedAnnualReturn: Math.round(expectedAnnualReturn * 100) / 100,
    confidence: calculateStrategyConfidence(profile, selectedTemplate),
    complexity: selectedTemplate.complexity,
    timeToImplement: selectedTemplate.complexity === 'simple' ? '1-2 days' : selectedTemplate.complexity === 'moderate' ? '3-5 days' : '1-2 weeks',
    maintenanceLevel: selectedTemplate.complexity === 'simple' ? 'low' : selectedTemplate.complexity === 'moderate' ? 'medium' : 'high',
    createdAt: Date.now(),
    createdFor: profile.userId,
  };
}

function calculateTemplateScore(template: StrategyTemplate, profile: RiskProfile): number {
  let score = 0;
  
  // Risk tolerance match
  const riskIndex = template.suitableFor.indexOf(profile.riskTolerance);
  score += riskIndex >= 0 ? (4 - riskIndex) * 10 : 0;
  
  // Asset class match
  const assetMatches = template.assetClasses.filter(a => profile.preferredAssetClasses.includes(a)).length;
  score += assetMatches * 5;
  
  // Complexity vs experience match
  const complexityScore = { simple: 1, moderate: 2, complex: 3, advanced: 4 };
  const experienceScore = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const complexityMatch = Math.abs(complexityScore[template.complexity] - experienceScore[profile.experienceLevel]);
  score += (4 - complexityMatch) * 3;
  
  // Time availability match
  if (template.complexity === 'advanced' && profile.timeAvailability === 'minimal') {
    score -= 10;
  }
  
  return score;
}

function calculateStrategyConfidence(profile: RiskProfile, template: StrategyTemplate): number {
  let confidence = 0.7; // Base confidence
  
  // Experience bonus
  if (profile.experienceLevel === 'advanced' || profile.experienceLevel === 'expert') {
    confidence += 0.1;
  }
  
  // Template match bonus
  if (template.suitableFor[0] === profile.riskTolerance) {
    confidence += 0.05;
  }
  
  // Time availability bonus
  if (profile.timeAvailability === 'full_time' && template.complexity !== 'simple') {
    confidence += 0.05;
  }
  
  // Emotional tolerance bonus
  if (profile.emotionalTolerance >= 7) {
    confidence += 0.05;
  }
  
  return Math.min(0.95, Math.round(confidence * 100) / 100);
}

/**
 * Get all available strategy templates
 */
export function getStrategyTemplates(): StrategyTemplate[] {
  return STRATEGY_TEMPLATES;
}

/**
 * Get templates suitable for a specific risk profile
 */
export function getSuitableTemplates(profile: RiskProfile): StrategyTemplate[] {
  return STRATEGY_TEMPLATES.filter(t => 
    t.suitableFor.includes(profile.riskTolerance) &&
    t.assetClasses.some(a => profile.preferredAssetClasses.includes(a))
  ).sort((a, b) => calculateTemplateScore(b, profile) - calculateTemplateScore(a, profile));
}

/**
 * Get the questionnaire questions
 */
export function getQuestionnaire(): QuestionnaireQuestion[] {
  return QUESTIONNAIRE;
}

/**
 * Optimize an existing strategy
 */
export function optimizeStrategy(strategy: GeneratedStrategy, optimizationGoal: 'win_rate' | 'risk_reward' | 'sharpe' | 'drawdown'): GeneratedStrategy {
  const optimized = { ...strategy };
  
  switch (optimizationGoal) {
    case 'win_rate':
      // Tighten entry rules
      optimized.entryRules = strategy.entryRules.map(rule => ({
        ...rule,
        isRequired: true,
        weight: rule.weight * 1.1,
      }));
      optimized.expectedWinRate = Math.min(0.75, strategy.expectedWinRate * 1.1);
      optimized.expectedRiskReward = strategy.expectedRiskReward * 0.9;
      break;
      
    case 'risk_reward':
      // Widen take profit, tighten stop loss
      optimized.exitRules = strategy.exitRules.map(rule => {
        if (rule.type === 'take_profit') {
          return { ...rule, value: rule.value * 1.3 };
        }
        if (rule.type === 'stop_loss') {
          return { ...rule, value: rule.value * 0.8 };
        }
        return rule;
      });
      optimized.expectedRiskReward = strategy.expectedRiskReward * 1.2;
      optimized.expectedWinRate = strategy.expectedWinRate * 0.95;
      break;
      
    case 'sharpe':
      // Balance risk/reward
      optimized.positionSizing = {
        ...strategy.positionSizing,
        riskPerTrade: strategy.positionSizing.riskPerTrade * 0.8,
      };
      optimized.expectedSharpeRatio = strategy.expectedSharpeRatio * 1.15;
      break;
      
    case 'drawdown':
      // Reduce position size and add stricter stops
      optimized.positionSizing = {
        ...strategy.positionSizing,
        maxSize: strategy.positionSizing.maxSize * 0.7,
        riskPerTrade: strategy.positionSizing.riskPerTrade * 0.7,
      };
      optimized.exitRules = strategy.exitRules.map(rule => {
        if (rule.type === 'stop_loss') {
          return { ...rule, value: rule.value * 0.7 };
        }
        return rule;
      });
      optimized.expectedMaxDrawdown = strategy.expectedMaxDrawdown * 0.7;
      break;
  }
  
  optimized.id = generateId();
  optimized.name = `${strategy.name} (Optimized for ${optimizationGoal.replace('_', ' ')})`;
  
  return optimized;
}

/**
 * Compare multiple strategies
 */
export function compareStrategies(strategies: GeneratedStrategy[]): {
  comparison: Array<{
    strategyId: string;
    name: string;
    winRate: number;
    riskReward: number;
    sharpe: number;
    maxDrawdown: number;
    expectedReturn: number;
    score: number;
  }>;
  recommendation: string;
  bestOverall: string;
  bestForRisk: string;
  bestForReturn: string;
} {
  const comparison = strategies.map(s => {
    const score = (s.expectedWinRate * 25) + 
                  (s.expectedRiskReward * 15) + 
                  (s.expectedSharpeRatio * 20) + 
                  ((1 - s.expectedMaxDrawdown) * 20) + 
                  (s.expectedAnnualReturn / 100 * 20);
    
    return {
      strategyId: s.id,
      name: s.name,
      winRate: s.expectedWinRate,
      riskReward: s.expectedRiskReward,
      sharpe: s.expectedSharpeRatio,
      maxDrawdown: s.expectedMaxDrawdown,
      expectedReturn: s.expectedAnnualReturn,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
  
  const bestOverall = comparison[0]?.strategyId || '';
  const bestForRisk = [...comparison].sort((a, b) => a.maxDrawdown - b.maxDrawdown)[0]?.strategyId || '';
  const bestForReturn = [...comparison].sort((a, b) => b.expectedReturn - a.expectedReturn)[0]?.strategyId || '';
  
  let recommendation = `Based on comprehensive analysis, "${comparison[0]?.name}" offers the best overall balance. `;
  if (bestForRisk !== bestOverall) {
    const riskStrategy = strategies.find(s => s.id === bestForRisk);
    recommendation += `For risk-averse traders, consider "${riskStrategy?.name}". `;
  }
  if (bestForReturn !== bestOverall) {
    const returnStrategy = strategies.find(s => s.id === bestForReturn);
    recommendation += `For maximum returns, "${returnStrategy?.name}" shows the highest potential.`;
  }
  
  return {
    comparison,
    recommendation,
    bestOverall,
    bestForRisk,
    bestForReturn,
  };
}

/**
 * Generate multiple strategy variations
 */
export function generateStrategyVariations(profile: RiskProfile, count: number = 3): GeneratedStrategy[] {
  const suitableTemplates = getSuitableTemplates(profile);
  const variations: GeneratedStrategy[] = [];
  
  for (let i = 0; i < Math.min(count, suitableTemplates.length); i++) {
    const strategy = generateStrategy(profile, suitableTemplates[i].type);
    variations.push(strategy);
  }
  
  return variations;
}

/**
 * Export strategy as JSON
 */
export function exportStrategy(strategy: GeneratedStrategy): string {
  return JSON.stringify(strategy, null, 2);
}

/**
 * Validate strategy rules
 */
export function validateStrategy(strategy: GeneratedStrategy): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check entry rules
  if (strategy.entryRules.length === 0) {
    errors.push('Strategy must have at least one entry rule');
  }
  
  const requiredEntryRules = strategy.entryRules.filter(r => r.isRequired);
  if (requiredEntryRules.length === 0) {
    warnings.push('Consider marking at least one entry rule as required');
  }
  
  // Check exit rules
  const hasStopLoss = strategy.exitRules.some(r => r.type === 'stop_loss');
  const hasTakeProfit = strategy.exitRules.some(r => r.type === 'take_profit');
  
  if (!hasStopLoss) {
    errors.push('Strategy must have a stop loss rule');
  }
  
  if (!hasTakeProfit) {
    warnings.push('Consider adding a take profit rule');
  }
  
  // Check position sizing
  if (strategy.positionSizing.riskPerTrade > 5) {
    warnings.push('Risk per trade exceeds 5% - consider reducing for better risk management');
  }
  
  if (strategy.positionSizing.maxSize > 25) {
    warnings.push('Maximum position size exceeds 25% - high concentration risk');
  }
  
  // Check indicators
  if (strategy.indicators.length < 2) {
    warnings.push('Consider using multiple indicators for confirmation');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
