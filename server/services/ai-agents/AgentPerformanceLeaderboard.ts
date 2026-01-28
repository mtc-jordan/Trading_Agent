/**
 * Agent Performance Leaderboard
 * 
 * Creates a competitive leaderboard showing which agents perform best
 * in different market conditions, helping users understand agent strengths.
 */

// Types
export type MarketCondition = 
  | 'bull_market'
  | 'bear_market'
  | 'high_volatility'
  | 'low_volatility'
  | 'trending'
  | 'ranging'
  | 'crash'
  | 'recovery';

export type TimeFrame = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

export type AgentType = 
  | 'technical'
  | 'fundamental'
  | 'sentiment'
  | 'risk'
  | 'portfolio'
  | 'macro'
  | 'momentum';

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  description: string;
  
  // Overall metrics
  totalSignals: number;
  accurateSignals: number;
  accuracy: number;
  
  // Returns
  avgReturn: number;
  totalReturn: number;
  bestReturn: number;
  worstReturn: number;
  
  // Risk metrics
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  
  // Timing
  avgHoldingPeriod: number;
  avgTimeToProfit: number;
  
  // Rankings
  overallRank: number;
  conditionRanks: Record<MarketCondition, number>;
  
  // Badges
  badges: AgentBadge[];
  
  // Performance by condition
  conditionPerformance: Record<MarketCondition, ConditionPerformance>;
  
  // Recent activity
  recentSignals: RecentSignal[];
  
  // Trend
  performanceTrend: 'improving' | 'stable' | 'declining';
  trendChange: number;
}

export interface ConditionPerformance {
  condition: MarketCondition;
  signalCount: number;
  accuracy: number;
  avgReturn: number;
  sharpeRatio: number;
  rank: number;
}

export interface RecentSignal {
  timestamp: number;
  symbol: string;
  direction: 'buy' | 'sell' | 'hold';
  confidence: number;
  outcome: 'win' | 'loss' | 'pending';
  returnPercent?: number;
}

export interface AgentBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  rankChange: number;
  agent: AgentPerformance;
}

export interface LeaderboardFilters {
  timeFrame: TimeFrame;
  marketCondition?: MarketCondition;
  agentType?: AgentType;
  minSignals?: number;
}

// Badge definitions
const BADGES: Record<string, Omit<AgentBadge, 'earnedAt'>> = {
  accuracy_master: {
    id: 'accuracy_master',
    name: 'Accuracy Master',
    description: 'Achieved 80%+ accuracy over 100 signals',
    icon: '🎯',
    rarity: 'epic',
  },
  bull_specialist: {
    id: 'bull_specialist',
    name: 'Bull Specialist',
    description: 'Top performer in bull market conditions',
    icon: '🐂',
    rarity: 'rare',
  },
  bear_survivor: {
    id: 'bear_survivor',
    name: 'Bear Survivor',
    description: 'Positive returns during bear markets',
    icon: '🐻',
    rarity: 'epic',
  },
  volatility_hunter: {
    id: 'volatility_hunter',
    name: 'Volatility Hunter',
    description: 'Excels in high volatility conditions',
    icon: '⚡',
    rarity: 'rare',
  },
  consistent_performer: {
    id: 'consistent_performer',
    name: 'Consistent Performer',
    description: 'Maintained positive returns for 6 months',
    icon: '📈',
    rarity: 'legendary',
  },
  risk_manager: {
    id: 'risk_manager',
    name: 'Risk Manager',
    description: 'Sharpe ratio above 2.0',
    icon: '🛡️',
    rarity: 'epic',
  },
  quick_winner: {
    id: 'quick_winner',
    name: 'Quick Winner',
    description: 'Average time to profit under 24 hours',
    icon: '⏱️',
    rarity: 'rare',
  },
  profit_machine: {
    id: 'profit_machine',
    name: 'Profit Machine',
    description: 'Profit factor above 3.0',
    icon: '💰',
    rarity: 'legendary',
  },
  signal_volume: {
    id: 'signal_volume',
    name: 'Signal Volume',
    description: 'Generated 1000+ signals',
    icon: '📊',
    rarity: 'common',
  },
  comeback_king: {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Recovered from 20%+ drawdown',
    icon: '👑',
    rarity: 'epic',
  },
};

// Agent definitions with simulated performance data
const AGENT_DEFINITIONS: Array<{
  id: string;
  name: string;
  type: AgentType;
  description: string;
  strengths: MarketCondition[];
  baseAccuracy: number;
  baseReturn: number;
}> = [
  {
    id: 'technical_agent',
    name: 'Technical Analysis Agent',
    type: 'technical',
    description: 'Uses chart patterns, indicators, and price action for trading signals',
    strengths: ['trending', 'high_volatility'],
    baseAccuracy: 0.68,
    baseReturn: 0.12,
  },
  {
    id: 'fundamental_agent',
    name: 'Fundamental Analysis Agent',
    type: 'fundamental',
    description: 'Analyzes financial statements, valuations, and company metrics',
    strengths: ['bull_market', 'recovery'],
    baseAccuracy: 0.72,
    baseReturn: 0.15,
  },
  {
    id: 'sentiment_agent',
    name: 'Sentiment Analysis Agent',
    type: 'sentiment',
    description: 'Monitors social media, news, and market sentiment',
    strengths: ['high_volatility', 'crash'],
    baseAccuracy: 0.65,
    baseReturn: 0.10,
  },
  {
    id: 'risk_agent',
    name: 'Risk Management Agent',
    type: 'risk',
    description: 'Focuses on position sizing, stop-losses, and risk-adjusted returns',
    strengths: ['bear_market', 'crash'],
    baseAccuracy: 0.75,
    baseReturn: 0.08,
  },
  {
    id: 'portfolio_agent',
    name: 'Portfolio Optimization Agent',
    type: 'portfolio',
    description: 'Optimizes asset allocation and portfolio diversification',
    strengths: ['ranging', 'low_volatility'],
    baseAccuracy: 0.70,
    baseReturn: 0.11,
  },
  {
    id: 'macro_agent',
    name: 'Macro Economic Agent',
    type: 'macro',
    description: 'Analyzes economic indicators, interest rates, and global trends',
    strengths: ['bull_market', 'bear_market'],
    baseAccuracy: 0.67,
    baseReturn: 0.13,
  },
  {
    id: 'momentum_agent',
    name: 'Momentum Trading Agent',
    type: 'momentum',
    description: 'Identifies and rides market momentum and trends',
    strengths: ['trending', 'bull_market'],
    baseAccuracy: 0.63,
    baseReturn: 0.18,
  },
];

// Generate simulated performance data
function generateAgentPerformance(
  agentDef: typeof AGENT_DEFINITIONS[0],
  timeFrame: TimeFrame
): AgentPerformance {
  const timeMultiplier = getTimeMultiplier(timeFrame);
  const baseSignals = Math.floor(50 * timeMultiplier);
  
  // Add some randomness
  const randomFactor = 0.9 + Math.random() * 0.2;
  const accuracy = Math.min(0.95, agentDef.baseAccuracy * randomFactor);
  const avgReturn = agentDef.baseReturn * randomFactor;
  
  const totalSignals = baseSignals + Math.floor(Math.random() * 20);
  const accurateSignals = Math.floor(totalSignals * accuracy);
  
  // Generate condition performance
  const conditionPerformance: Record<MarketCondition, ConditionPerformance> = {} as any;
  const conditionRanks: Record<MarketCondition, number> = {} as any;
  
  const conditions: MarketCondition[] = [
    'bull_market', 'bear_market', 'high_volatility', 'low_volatility',
    'trending', 'ranging', 'crash', 'recovery'
  ];
  
  conditions.forEach((condition, index) => {
    const isStrength = agentDef.strengths.includes(condition);
    const conditionAccuracy = isStrength 
      ? accuracy * (1.05 + Math.random() * 0.1)
      : accuracy * (0.85 + Math.random() * 0.1);
    
    conditionPerformance[condition] = {
      condition,
      signalCount: Math.floor(totalSignals / conditions.length * (0.8 + Math.random() * 0.4)),
      accuracy: Math.min(0.95, conditionAccuracy),
      avgReturn: isStrength ? avgReturn * 1.2 : avgReturn * 0.8,
      sharpeRatio: isStrength ? 1.5 + Math.random() * 1.5 : 0.5 + Math.random() * 1.0,
      rank: isStrength ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 5) + 3,
    };
    
    conditionRanks[condition] = conditionPerformance[condition].rank;
  });
  
  // Generate recent signals
  const recentSignals: RecentSignal[] = [];
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN'];
  
  for (let i = 0; i < 10; i++) {
    const isWin = Math.random() < accuracy;
    recentSignals.push({
      timestamp: Date.now() - i * 3600000 * (1 + Math.random() * 23),
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      direction: Math.random() > 0.3 ? 'buy' : Math.random() > 0.5 ? 'sell' : 'hold',
      confidence: 0.6 + Math.random() * 0.35,
      outcome: i < 2 ? 'pending' : isWin ? 'win' : 'loss',
      returnPercent: i < 2 ? undefined : isWin 
        ? Math.random() * avgReturn * 200 
        : -Math.random() * avgReturn * 100,
    });
  }
  
  // Determine badges
  const badges: AgentBadge[] = [];
  
  if (accuracy >= 0.80 && totalSignals >= 100) {
    badges.push({ ...BADGES.accuracy_master, earnedAt: Date.now() - Math.random() * 30 * 24 * 3600000 });
  }
  if (agentDef.strengths.includes('bull_market') && conditionPerformance.bull_market.rank <= 2) {
    badges.push({ ...BADGES.bull_specialist, earnedAt: Date.now() - Math.random() * 60 * 24 * 3600000 });
  }
  if (agentDef.strengths.includes('bear_market') && conditionPerformance.bear_market.avgReturn > 0) {
    badges.push({ ...BADGES.bear_survivor, earnedAt: Date.now() - Math.random() * 90 * 24 * 3600000 });
  }
  if (agentDef.strengths.includes('high_volatility')) {
    badges.push({ ...BADGES.volatility_hunter, earnedAt: Date.now() - Math.random() * 45 * 24 * 3600000 });
  }
  if (totalSignals >= 1000) {
    badges.push({ ...BADGES.signal_volume, earnedAt: Date.now() - Math.random() * 180 * 24 * 3600000 });
  }
  
  const sharpeRatio = 0.8 + Math.random() * 2.0;
  if (sharpeRatio >= 2.0) {
    badges.push({ ...BADGES.risk_manager, earnedAt: Date.now() - Math.random() * 30 * 24 * 3600000 });
  }
  
  const profitFactor = 1.2 + Math.random() * 2.5;
  if (profitFactor >= 3.0) {
    badges.push({ ...BADGES.profit_machine, earnedAt: Date.now() - Math.random() * 60 * 24 * 3600000 });
  }
  
  // Performance trend
  const trendRandom = Math.random();
  const performanceTrend: 'improving' | 'stable' | 'declining' = 
    trendRandom > 0.6 ? 'improving' : trendRandom > 0.3 ? 'stable' : 'declining';
  
  return {
    agentId: agentDef.id,
    agentName: agentDef.name,
    agentType: agentDef.type,
    description: agentDef.description,
    totalSignals,
    accurateSignals,
    accuracy,
    avgReturn,
    totalReturn: avgReturn * timeMultiplier,
    bestReturn: avgReturn * 3 + Math.random() * avgReturn * 2,
    worstReturn: -(avgReturn * 2 + Math.random() * avgReturn),
    sharpeRatio,
    sortinoRatio: sharpeRatio * (1.1 + Math.random() * 0.3),
    maxDrawdown: 0.05 + Math.random() * 0.15,
    winRate: accuracy,
    profitFactor,
    avgHoldingPeriod: 1 + Math.random() * 10,
    avgTimeToProfit: 0.5 + Math.random() * 3,
    overallRank: 0, // Will be set later
    conditionRanks,
    badges,
    conditionPerformance,
    recentSignals,
    performanceTrend,
    trendChange: performanceTrend === 'improving' ? Math.random() * 15 
      : performanceTrend === 'declining' ? -Math.random() * 10 
      : Math.random() * 5 - 2.5,
  };
}

function getTimeMultiplier(timeFrame: TimeFrame): number {
  switch (timeFrame) {
    case '1d': return 1;
    case '1w': return 7;
    case '1m': return 30;
    case '3m': return 90;
    case '6m': return 180;
    case '1y': return 365;
    case 'all': return 730;
    default: return 30;
  }
}

// Get leaderboard
export function getLeaderboard(filters: LeaderboardFilters): LeaderboardEntry[] {
  const performances = AGENT_DEFINITIONS.map(def => 
    generateAgentPerformance(def, filters.timeFrame)
  );
  
  // Filter by agent type if specified
  let filtered = performances;
  if (filters.agentType) {
    filtered = filtered.filter(p => p.agentType === filters.agentType);
  }
  
  // Filter by minimum signals
  if (filters.minSignals) {
    const minSignals = filters.minSignals;
    filtered = filtered.filter(p => p.totalSignals >= minSignals);
  }
  
  // Sort by market condition performance or overall
  if (filters.marketCondition) {
    filtered.sort((a, b) => {
      const aPerf = a.conditionPerformance[filters.marketCondition!];
      const bPerf = b.conditionPerformance[filters.marketCondition!];
      return (bPerf.avgReturn * bPerf.accuracy) - (aPerf.avgReturn * aPerf.accuracy);
    });
  } else {
    // Sort by composite score
    filtered.sort((a, b) => {
      const aScore = a.accuracy * 0.3 + a.avgReturn * 0.3 + a.sharpeRatio * 0.2 + a.winRate * 0.2;
      const bScore = b.accuracy * 0.3 + b.avgReturn * 0.3 + b.sharpeRatio * 0.2 + b.winRate * 0.2;
      return bScore - aScore;
    });
  }
  
  // Assign ranks
  return filtered.map((agent, index) => {
    agent.overallRank = index + 1;
    const previousRank = index + 1 + Math.floor(Math.random() * 3) - 1;
    return {
      rank: index + 1,
      previousRank,
      rankChange: previousRank - (index + 1),
      agent,
    };
  });
}

// Get agent details
export function getAgentDetails(agentId: string, timeFrame: TimeFrame = '1m'): AgentPerformance | null {
  const agentDef = AGENT_DEFINITIONS.find(a => a.id === agentId);
  if (!agentDef) return null;
  return generateAgentPerformance(agentDef, timeFrame);
}

// Get performance comparison
export function compareAgents(
  agentIds: string[],
  timeFrame: TimeFrame = '1m'
): AgentPerformance[] {
  return agentIds
    .map(id => getAgentDetails(id, timeFrame))
    .filter((a): a is AgentPerformance => a !== null);
}

// Get top performers by condition
export function getTopPerformersByCondition(
  condition: MarketCondition,
  limit: number = 3
): LeaderboardEntry[] {
  return getLeaderboard({
    timeFrame: '1m',
    marketCondition: condition,
  }).slice(0, limit);
}

// Get agent rankings history
export function getAgentRankingsHistory(
  agentId: string,
  days: number = 30
): Array<{ date: number; rank: number; accuracy: number; returns: number }> {
  const history: Array<{ date: number; rank: number; accuracy: number; returns: number }> = [];
  
  for (let i = days; i >= 0; i--) {
    const date = Date.now() - i * 24 * 3600000;
    history.push({
      date,
      rank: Math.floor(Math.random() * 5) + 1,
      accuracy: 0.6 + Math.random() * 0.25,
      returns: -0.05 + Math.random() * 0.15,
    });
  }
  
  return history;
}

// Get all available badges
export function getAllBadges(): Array<Omit<AgentBadge, 'earnedAt'>> {
  return Object.values(BADGES);
}

// Get market conditions
export function getMarketConditions(): Array<{ id: MarketCondition; name: string; description: string }> {
  return [
    { id: 'bull_market', name: 'Bull Market', description: 'Rising prices, positive sentiment' },
    { id: 'bear_market', name: 'Bear Market', description: 'Falling prices, negative sentiment' },
    { id: 'high_volatility', name: 'High Volatility', description: 'Large price swings, uncertainty' },
    { id: 'low_volatility', name: 'Low Volatility', description: 'Stable prices, low uncertainty' },
    { id: 'trending', name: 'Trending', description: 'Clear directional movement' },
    { id: 'ranging', name: 'Ranging', description: 'Sideways movement, consolidation' },
    { id: 'crash', name: 'Market Crash', description: 'Rapid decline, panic selling' },
    { id: 'recovery', name: 'Recovery', description: 'Bounce back from lows' },
  ];
}

// Get agent types
export function getAgentTypes(): Array<{ id: AgentType; name: string }> {
  return [
    { id: 'technical', name: 'Technical Analysis' },
    { id: 'fundamental', name: 'Fundamental Analysis' },
    { id: 'sentiment', name: 'Sentiment Analysis' },
    { id: 'risk', name: 'Risk Management' },
    { id: 'portfolio', name: 'Portfolio Optimization' },
    { id: 'macro', name: 'Macro Economic' },
    { id: 'momentum', name: 'Momentum Trading' },
  ];
}

// Get leaderboard stats
export function getLeaderboardStats(): {
  totalAgents: number;
  totalSignals: number;
  avgAccuracy: number;
  topPerformer: string;
  mostImproved: string;
} {
  const leaderboard = getLeaderboard({ timeFrame: '1m' });
  
  return {
    totalAgents: leaderboard.length,
    totalSignals: leaderboard.reduce((sum, e) => sum + e.agent.totalSignals, 0),
    avgAccuracy: leaderboard.reduce((sum, e) => sum + e.agent.accuracy, 0) / leaderboard.length,
    topPerformer: leaderboard[0]?.agent.agentName || 'N/A',
    mostImproved: leaderboard.find(e => e.agent.performanceTrend === 'improving')?.agent.agentName || 'N/A',
  };
}
