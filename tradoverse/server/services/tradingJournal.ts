/**
 * Trading Journal Service
 * Document trades, emotions, and lessons learned with analytics
 */

import { getDb } from '../db';

// Types
export type EmotionType = 'confident' | 'anxious' | 'greedy' | 'fearful' | 'neutral' | 'excited' | 'frustrated' | 'calm';
export type TradeOutcome = 'win' | 'loss' | 'breakeven' | 'open';
export type TradeSetup = 'breakout' | 'pullback' | 'reversal' | 'trend_following' | 'range_bound' | 'news_based' | 'technical' | 'fundamental' | 'other';

export interface JournalEntry {
  id: string;
  userId: string;
  tradeId?: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate: Date;
  exitDate?: Date;
  setup: TradeSetup;
  emotionBefore: EmotionType;
  emotionDuring?: EmotionType;
  emotionAfter?: EmotionType;
  confidenceLevel: number; // 1-10
  planFollowed: boolean;
  notes: string;
  lessonsLearned?: string;
  mistakes?: string[];
  tags: string[];
  screenshots?: string[];
  outcome?: TradeOutcome;
  pnl?: number;
  pnlPercent?: number;
  riskRewardRatio?: number;
  holdingPeriod?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalStats {
  totalEntries: number;
  totalTrades: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  avgHoldingPeriod: number;
  avgConfidence: number;
  planFollowedRate: number;
  bestTrade: number;
  worstTrade: number;
  emotionBreakdown: Record<EmotionType, number>;
  setupBreakdown: Record<TradeSetup, { count: number; winRate: number; avgPnL: number }>;
  tagBreakdown: Record<string, { count: number; winRate: number }>;
  monthlyPnL: { month: string; pnl: number; trades: number }[];
}

export interface EmotionCorrelation {
  emotion: EmotionType;
  winRate: number;
  avgPnL: number;
  tradeCount: number;
  recommendation: string;
}

export interface JournalPattern {
  pattern: string;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  suggestion: string;
}

// In-memory storage (would be database in production)
const journalStore: Map<string, JournalEntry[]> = new Map();

/**
 * Create a new journal entry
 */
export async function createJournalEntry(
  userId: string,
  entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<JournalEntry> {
  const id = `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const journalEntry: JournalEntry = {
    id,
    userId,
    ...entry,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Calculate holding period if both dates exist
  if (entry.entryDate && entry.exitDate) {
    journalEntry.holdingPeriod = Math.floor(
      (new Date(entry.exitDate).getTime() - new Date(entry.entryDate).getTime()) / 60000
    );
  }
  
  // Calculate P&L if prices exist
  if (entry.entryPrice && entry.exitPrice) {
    const multiplier = entry.side === 'long' ? 1 : -1;
    journalEntry.pnl = (entry.exitPrice - entry.entryPrice) * entry.quantity * multiplier;
    journalEntry.pnlPercent = ((entry.exitPrice - entry.entryPrice) / entry.entryPrice) * 100 * multiplier;
    
    // Determine outcome
    if (journalEntry.pnl > 0) {
      journalEntry.outcome = 'win';
    } else if (journalEntry.pnl < 0) {
      journalEntry.outcome = 'loss';
    } else {
      journalEntry.outcome = 'breakeven';
    }
  } else {
    journalEntry.outcome = 'open';
  }
  
  const userEntries = journalStore.get(userId) || [];
  userEntries.push(journalEntry);
  journalStore.set(userId, userEntries);
  
  return journalEntry;
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(
  userId: string,
  entryId: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<JournalEntry | null> {
  const userEntries = journalStore.get(userId) || [];
  const index = userEntries.findIndex(e => e.id === entryId);
  
  if (index === -1) return null;
  
  const entry = userEntries[index];
  Object.assign(entry, updates, { updatedAt: new Date() });
  
  // Recalculate P&L if prices updated
  if (entry.entryPrice && entry.exitPrice) {
    const multiplier = entry.side === 'long' ? 1 : -1;
    entry.pnl = (entry.exitPrice - entry.entryPrice) * entry.quantity * multiplier;
    entry.pnlPercent = ((entry.exitPrice - entry.entryPrice) / entry.entryPrice) * 100 * multiplier;
    
    if (entry.pnl > 0) {
      entry.outcome = 'win';
    } else if (entry.pnl < 0) {
      entry.outcome = 'loss';
    } else {
      entry.outcome = 'breakeven';
    }
  }
  
  // Recalculate holding period
  if (entry.entryDate && entry.exitDate) {
    entry.holdingPeriod = Math.floor(
      (new Date(entry.exitDate).getTime() - new Date(entry.entryDate).getTime()) / 60000
    );
  }
  
  return entry;
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<boolean> {
  const userEntries = journalStore.get(userId) || [];
  const index = userEntries.findIndex(e => e.id === entryId);
  
  if (index === -1) return false;
  
  userEntries.splice(index, 1);
  return true;
}

/**
 * Get journal entry by ID
 */
export async function getJournalEntryById(
  userId: string,
  entryId: string
): Promise<JournalEntry | null> {
  const userEntries = journalStore.get(userId) || [];
  return userEntries.find(e => e.id === entryId) || null;
}

/**
 * Get user's journal entries with filtering
 */
export async function getUserJournalEntries(
  userId: string,
  filters?: {
    symbol?: string;
    setup?: TradeSetup;
    emotion?: EmotionType;
    outcome?: TradeOutcome;
    tags?: string[];
    startDate?: Date;
    endDate?: Date;
    minPnL?: number;
    maxPnL?: number;
  },
  limit: number = 50,
  offset: number = 0
): Promise<{ entries: JournalEntry[]; total: number }> {
  let entries = journalStore.get(userId) || [];
  
  // Apply filters
  if (filters) {
    if (filters.symbol) {
      entries = entries.filter(e => e.symbol.toLowerCase().includes(filters.symbol!.toLowerCase()));
    }
    if (filters.setup) {
      entries = entries.filter(e => e.setup === filters.setup);
    }
    if (filters.emotion) {
      entries = entries.filter(e => 
        e.emotionBefore === filters.emotion ||
        e.emotionDuring === filters.emotion ||
        e.emotionAfter === filters.emotion
      );
    }
    if (filters.outcome) {
      entries = entries.filter(e => e.outcome === filters.outcome);
    }
    if (filters.tags && filters.tags.length > 0) {
      entries = entries.filter(e => 
        filters.tags!.some(tag => e.tags.includes(tag))
      );
    }
    if (filters.startDate) {
      entries = entries.filter(e => new Date(e.entryDate) >= filters.startDate!);
    }
    if (filters.endDate) {
      entries = entries.filter(e => new Date(e.entryDate) <= filters.endDate!);
    }
    if (filters.minPnL !== undefined) {
      entries = entries.filter(e => (e.pnl || 0) >= filters.minPnL!);
    }
    if (filters.maxPnL !== undefined) {
      entries = entries.filter(e => (e.pnl || 0) <= filters.maxPnL!);
    }
  }
  
  // Sort by date descending
  entries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  
  const total = entries.length;
  const paginatedEntries = entries.slice(offset, offset + limit);
  
  return { entries: paginatedEntries, total };
}

/**
 * Get journal entries by date (calendar view)
 */
export async function getJournalEntriesByDate(
  userId: string,
  year: number,
  month: number
): Promise<Record<string, JournalEntry[]>> {
  const entries = journalStore.get(userId) || [];
  const result: Record<string, JournalEntry[]> = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.entryDate);
    if (date.getFullYear() === year && date.getMonth() === month - 1) {
      const dateKey = date.toISOString().split('T')[0];
      if (!result[dateKey]) {
        result[dateKey] = [];
      }
      result[dateKey].push(entry);
    }
  });
  
  return result;
}

/**
 * Get journal statistics
 */
export async function getJournalStats(
  userId: string,
  timeframe?: { startDate: Date; endDate: Date }
): Promise<JournalStats> {
  let entries = journalStore.get(userId) || [];
  
  if (timeframe) {
    entries = entries.filter(e => {
      const date = new Date(e.entryDate);
      return date >= timeframe.startDate && date <= timeframe.endDate;
    });
  }
  
  const closedTrades = entries.filter(e => e.outcome && e.outcome !== 'open');
  const wins = closedTrades.filter(e => e.outcome === 'win');
  
  // Calculate emotion breakdown
  const emotionBreakdown: Record<EmotionType, number> = {
    confident: 0,
    anxious: 0,
    greedy: 0,
    fearful: 0,
    neutral: 0,
    excited: 0,
    frustrated: 0,
    calm: 0,
  };
  
  entries.forEach(e => {
    emotionBreakdown[e.emotionBefore]++;
  });
  
  // Calculate setup breakdown
  const setupBreakdown: Record<TradeSetup, { count: number; winRate: number; avgPnL: number }> = {
    breakout: { count: 0, winRate: 0, avgPnL: 0 },
    pullback: { count: 0, winRate: 0, avgPnL: 0 },
    reversal: { count: 0, winRate: 0, avgPnL: 0 },
    trend_following: { count: 0, winRate: 0, avgPnL: 0 },
    range_bound: { count: 0, winRate: 0, avgPnL: 0 },
    news_based: { count: 0, winRate: 0, avgPnL: 0 },
    technical: { count: 0, winRate: 0, avgPnL: 0 },
    fundamental: { count: 0, winRate: 0, avgPnL: 0 },
    other: { count: 0, winRate: 0, avgPnL: 0 },
  };
  
  closedTrades.forEach(e => {
    const setup = setupBreakdown[e.setup];
    setup.count++;
    setup.avgPnL = (setup.avgPnL * (setup.count - 1) + (e.pnl || 0)) / setup.count;
  });
  
  // Calculate win rate per setup
  Object.keys(setupBreakdown).forEach(setup => {
    const setupTrades = closedTrades.filter(e => e.setup === setup);
    const setupWins = setupTrades.filter(e => e.outcome === 'win');
    setupBreakdown[setup as TradeSetup].winRate = 
      setupTrades.length > 0 ? (setupWins.length / setupTrades.length) * 100 : 0;
  });
  
  // Calculate tag breakdown
  const tagBreakdown: Record<string, { count: number; winRate: number }> = {};
  entries.forEach(e => {
    e.tags.forEach(tag => {
      if (!tagBreakdown[tag]) {
        tagBreakdown[tag] = { count: 0, winRate: 0 };
      }
      tagBreakdown[tag].count++;
    });
  });
  
  // Calculate tag win rates
  Object.keys(tagBreakdown).forEach(tag => {
    const tagTrades = closedTrades.filter(e => e.tags.includes(tag));
    const tagWins = tagTrades.filter(e => e.outcome === 'win');
    tagBreakdown[tag].winRate = tagTrades.length > 0 ? (tagWins.length / tagTrades.length) * 100 : 0;
  });
  
  // Calculate monthly P&L
  const monthlyPnL: { month: string; pnl: number; trades: number }[] = [];
  const monthlyData: Record<string, { pnl: number; trades: number }> = {};
  
  closedTrades.forEach(e => {
    const date = new Date(e.entryDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { pnl: 0, trades: 0 };
    }
    monthlyData[monthKey].pnl += e.pnl || 0;
    monthlyData[monthKey].trades++;
  });
  
  Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, data]) => {
      monthlyPnL.push({ month, ...data });
    });
  
  const pnls = closedTrades.map(e => e.pnl || 0);
  const totalPnL = pnls.reduce((sum, p) => sum + p, 0);
  const planFollowed = entries.filter(e => e.planFollowed);
  
  return {
    totalEntries: entries.length,
    totalTrades: closedTrades.length,
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    avgPnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
    totalPnL,
    avgHoldingPeriod: closedTrades.length > 0 
      ? closedTrades.reduce((sum, e) => sum + (e.holdingPeriod || 0), 0) / closedTrades.length 
      : 0,
    avgConfidence: entries.length > 0 
      ? entries.reduce((sum, e) => sum + e.confidenceLevel, 0) / entries.length 
      : 0,
    planFollowedRate: entries.length > 0 ? (planFollowed.length / entries.length) * 100 : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    emotionBreakdown,
    setupBreakdown,
    tagBreakdown,
    monthlyPnL,
  };
}

/**
 * Get emotion correlations with trading performance
 */
export async function getEmotionCorrelations(userId: string): Promise<EmotionCorrelation[]> {
  const entries = journalStore.get(userId) || [];
  const closedTrades = entries.filter(e => e.outcome && e.outcome !== 'open');
  
  const emotions: EmotionType[] = ['confident', 'anxious', 'greedy', 'fearful', 'neutral', 'excited', 'frustrated', 'calm'];
  
  return emotions.map(emotion => {
    const emotionTrades = closedTrades.filter(e => e.emotionBefore === emotion);
    const wins = emotionTrades.filter(e => e.outcome === 'win');
    const avgPnL = emotionTrades.length > 0 
      ? emotionTrades.reduce((sum, e) => sum + (e.pnl || 0), 0) / emotionTrades.length 
      : 0;
    const winRate = emotionTrades.length > 0 ? (wins.length / emotionTrades.length) * 100 : 0;
    
    let recommendation = '';
    if (emotion === 'anxious' || emotion === 'fearful') {
      recommendation = winRate < 50 
        ? 'Consider reducing position size when feeling this emotion' 
        : 'Your performance is stable despite this emotion';
    } else if (emotion === 'greedy' || emotion === 'excited') {
      recommendation = winRate < 50 
        ? 'Be cautious - this emotion may lead to overtrading' 
        : 'Channel this energy into disciplined execution';
    } else if (emotion === 'confident' || emotion === 'calm') {
      recommendation = winRate > 60 
        ? 'This is your optimal trading state - aim to trade more in this mindset' 
        : 'Even in good states, stick to your trading plan';
    } else {
      recommendation = 'Track more trades to identify patterns';
    }
    
    return {
      emotion,
      winRate,
      avgPnL,
      tradeCount: emotionTrades.length,
      recommendation,
    };
  });
}

/**
 * Detect trading patterns from journal
 */
export async function detectTradingPatterns(userId: string): Promise<JournalPattern[]> {
  const entries = journalStore.get(userId) || [];
  const closedTrades = entries.filter(e => e.outcome && e.outcome !== 'open');
  const patterns: JournalPattern[] = [];
  
  if (closedTrades.length < 5) {
    return [{
      pattern: 'Insufficient Data',
      description: 'Need at least 5 closed trades to detect patterns',
      frequency: 0,
      impact: 'neutral',
      suggestion: 'Continue journaling your trades to unlock pattern detection',
    }];
  }
  
  // Pattern: Revenge Trading
  const losses = closedTrades.filter(e => e.outcome === 'loss');
  let revengeTradingCount = 0;
  for (let i = 1; i < closedTrades.length; i++) {
    if (closedTrades[i - 1].outcome === 'loss' && 
        closedTrades[i].outcome === 'loss' &&
        (closedTrades[i].emotionBefore === 'frustrated' || closedTrades[i].emotionBefore === 'anxious')) {
      revengeTradingCount++;
    }
  }
  
  if (revengeTradingCount > 0) {
    patterns.push({
      pattern: 'Revenge Trading',
      description: `Detected ${revengeTradingCount} instances of trading while frustrated after a loss`,
      frequency: revengeTradingCount,
      impact: 'negative',
      suggestion: 'Take a break after losses. Set a rule to wait 30 minutes before the next trade.',
    });
  }
  
  // Pattern: Overtrading
  const dailyTrades: Record<string, number> = {};
  closedTrades.forEach(e => {
    const dateKey = new Date(e.entryDate).toISOString().split('T')[0];
    dailyTrades[dateKey] = (dailyTrades[dateKey] || 0) + 1;
  });
  
  const highTradeDays = Object.values(dailyTrades).filter(count => count > 5).length;
  if (highTradeDays > 0) {
    patterns.push({
      pattern: 'Overtrading',
      description: `${highTradeDays} days with more than 5 trades detected`,
      frequency: highTradeDays,
      impact: 'negative',
      suggestion: 'Quality over quantity. Set a daily trade limit and stick to your best setups.',
    });
  }
  
  // Pattern: Plan Deviation
  const planNotFollowed = entries.filter(e => !e.planFollowed);
  const planDeviationRate = (planNotFollowed.length / entries.length) * 100;
  
  if (planDeviationRate > 30) {
    patterns.push({
      pattern: 'Plan Deviation',
      description: `${planDeviationRate.toFixed(1)}% of trades deviated from the original plan`,
      frequency: planNotFollowed.length,
      impact: 'negative',
      suggestion: 'Review your trading plan. If deviations are profitable, update the plan.',
    });
  }
  
  // Pattern: Best Setup
  const setupPerformance: Record<string, { wins: number; total: number }> = {};
  closedTrades.forEach(e => {
    if (!setupPerformance[e.setup]) {
      setupPerformance[e.setup] = { wins: 0, total: 0 };
    }
    setupPerformance[e.setup].total++;
    if (e.outcome === 'win') {
      setupPerformance[e.setup].wins++;
    }
  });
  
  let bestSetup = '';
  let bestWinRate = 0;
  Object.entries(setupPerformance).forEach(([setup, data]) => {
    if (data.total >= 3) {
      const winRate = (data.wins / data.total) * 100;
      if (winRate > bestWinRate) {
        bestWinRate = winRate;
        bestSetup = setup;
      }
    }
  });
  
  if (bestSetup && bestWinRate > 60) {
    patterns.push({
      pattern: 'Winning Setup',
      description: `${bestSetup.replace('_', ' ')} setup has ${bestWinRate.toFixed(1)}% win rate`,
      frequency: setupPerformance[bestSetup].total,
      impact: 'positive',
      suggestion: `Focus more on ${bestSetup.replace('_', ' ')} setups - this is your edge.`,
    });
  }
  
  // Pattern: Emotional Trading
  const emotionalTrades = closedTrades.filter(e => 
    e.emotionBefore === 'greedy' || 
    e.emotionBefore === 'fearful' ||
    e.emotionBefore === 'anxious'
  );
  const emotionalLosses = emotionalTrades.filter(e => e.outcome === 'loss');
  
  if (emotionalTrades.length > 3 && (emotionalLosses.length / emotionalTrades.length) > 0.6) {
    patterns.push({
      pattern: 'Emotional Trading',
      description: `${((emotionalLosses.length / emotionalTrades.length) * 100).toFixed(1)}% loss rate when trading emotionally`,
      frequency: emotionalTrades.length,
      impact: 'negative',
      suggestion: 'Develop a pre-trade checklist to assess your emotional state.',
    });
  }
  
  // Pattern: Consistent Winner
  const wins = closedTrades.filter(e => e.outcome === 'win');
  const overallWinRate = (wins.length / closedTrades.length) * 100;
  
  if (overallWinRate > 55 && closedTrades.length >= 10) {
    patterns.push({
      pattern: 'Consistent Performance',
      description: `Maintaining ${overallWinRate.toFixed(1)}% win rate across ${closedTrades.length} trades`,
      frequency: closedTrades.length,
      impact: 'positive',
      suggestion: 'Great consistency! Consider gradually increasing position sizes.',
    });
  }
  
  return patterns;
}

/**
 * Get all unique tags used by user
 */
export async function getUserTags(userId: string): Promise<string[]> {
  const entries = journalStore.get(userId) || [];
  const tags = new Set<string>();
  
  entries.forEach(e => {
    e.tags.forEach(tag => tags.add(tag));
  });
  
  return Array.from(tags).sort();
}

/**
 * Search journal entries
 */
export async function searchJournalEntries(
  userId: string,
  query: string
): Promise<JournalEntry[]> {
  const entries = journalStore.get(userId) || [];
  const lowerQuery = query.toLowerCase();
  
  return entries.filter(e => 
    e.symbol.toLowerCase().includes(lowerQuery) ||
    e.notes.toLowerCase().includes(lowerQuery) ||
    (e.lessonsLearned && e.lessonsLearned.toLowerCase().includes(lowerQuery)) ||
    e.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export default {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getJournalEntryById,
  getUserJournalEntries,
  getJournalEntriesByDate,
  getJournalStats,
  getEmotionCorrelations,
  detectTradingPatterns,
  getUserTags,
  searchJournalEntries,
};
