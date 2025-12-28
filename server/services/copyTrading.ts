/**
 * Copy Trading Service
 * Allows users to automatically copy trades from top-performing traders
 */

import { getDb } from '../db';
import { eq, desc, and, sql, gte } from 'drizzle-orm';

// Types
export type AllocationMode = 'fixed' | 'percentage' | 'proportional';
export type CopyStatus = 'active' | 'paused' | 'stopped';

export interface CopyTrader {
  id: string;
  name: string;
  avatar?: string;
  totalReturn: number;
  winRate: number;
  totalTrades: number;
  followers: number;
  riskScore: number; // 1-10
  sharpeRatio: number;
  maxDrawdown: number;
  avgTradeSize: number;
  tradingStyle: 'day_trader' | 'swing_trader' | 'position_trader' | 'scalper';
  preferredAssets: string[];
  monthlyReturn: number;
  isVerified: boolean;
  joinedAt: Date;
}

export interface CopySettings {
  id: string;
  followerId: string;
  traderId: string;
  allocationMode: AllocationMode;
  allocationAmount: number; // Fixed $ or percentage
  maxPositionSize: number;
  maxDailyLoss: number;
  copyStopLoss: boolean;
  copyTakeProfit: boolean;
  excludeSymbols: string[];
  status: CopyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CopyTrade {
  id: string;
  copySettingsId: string;
  originalTradeId: string;
  followerId: string;
  traderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  originalQuantity: number;
  copiedQuantity: number;
  originalPrice: number;
  copiedPrice: number;
  slippage: number;
  pnl?: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  executedAt?: Date;
  createdAt: Date;
}

export interface CopyPerformance {
  totalCopiedTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalPnL: number;
  totalReturn: number;
  avgSlippage: number;
  bestTrade: number;
  worstTrade: number;
  winRate: number;
}

// Simulated top traders data
const SIMULATED_TRADERS: CopyTrader[] = [
  {
    id: 'trader_1',
    name: 'AlphaTrader',
    avatar: undefined,
    totalReturn: 156.8,
    winRate: 72.5,
    totalTrades: 1247,
    followers: 892,
    riskScore: 6,
    sharpeRatio: 2.34,
    maxDrawdown: 12.5,
    avgTradeSize: 5000,
    tradingStyle: 'swing_trader',
    preferredAssets: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
    monthlyReturn: 8.5,
    isVerified: true,
    joinedAt: new Date('2023-01-15'),
  },
  {
    id: 'trader_2',
    name: 'CryptoKing',
    avatar: undefined,
    totalReturn: 234.2,
    winRate: 65.8,
    totalTrades: 2156,
    followers: 1543,
    riskScore: 8,
    sharpeRatio: 1.89,
    maxDrawdown: 25.3,
    avgTradeSize: 8000,
    tradingStyle: 'day_trader',
    preferredAssets: ['BTC', 'ETH', 'SOL', 'AVAX'],
    monthlyReturn: 12.3,
    isVerified: true,
    joinedAt: new Date('2022-08-20'),
  },
  {
    id: 'trader_3',
    name: 'ValueHunter',
    avatar: undefined,
    totalReturn: 89.4,
    winRate: 78.2,
    totalTrades: 456,
    followers: 567,
    riskScore: 3,
    sharpeRatio: 2.78,
    maxDrawdown: 8.2,
    avgTradeSize: 15000,
    tradingStyle: 'position_trader',
    preferredAssets: ['AAPL', 'JNJ', 'PG', 'KO'],
    monthlyReturn: 4.2,
    isVerified: true,
    joinedAt: new Date('2023-03-10'),
  },
  {
    id: 'trader_4',
    name: 'MomentumMaster',
    avatar: undefined,
    totalReturn: 178.9,
    winRate: 68.4,
    totalTrades: 3421,
    followers: 1234,
    riskScore: 7,
    sharpeRatio: 2.12,
    maxDrawdown: 18.7,
    avgTradeSize: 3000,
    tradingStyle: 'scalper',
    preferredAssets: ['SPY', 'QQQ', 'TSLA', 'AMD'],
    monthlyReturn: 9.8,
    isVerified: true,
    joinedAt: new Date('2022-11-05'),
  },
  {
    id: 'trader_5',
    name: 'TechGuru',
    avatar: undefined,
    totalReturn: 145.6,
    winRate: 71.2,
    totalTrades: 987,
    followers: 789,
    riskScore: 5,
    sharpeRatio: 2.45,
    maxDrawdown: 14.3,
    avgTradeSize: 6500,
    tradingStyle: 'swing_trader',
    preferredAssets: ['NVDA', 'AMD', 'INTC', 'QCOM'],
    monthlyReturn: 7.6,
    isVerified: true,
    joinedAt: new Date('2023-02-28'),
  },
  {
    id: 'trader_6',
    name: 'DeFiWhale',
    avatar: undefined,
    totalReturn: 312.5,
    winRate: 62.1,
    totalTrades: 1876,
    followers: 2134,
    riskScore: 9,
    sharpeRatio: 1.67,
    maxDrawdown: 32.1,
    avgTradeSize: 12000,
    tradingStyle: 'day_trader',
    preferredAssets: ['ETH', 'UNI', 'AAVE', 'LINK'],
    monthlyReturn: 15.8,
    isVerified: true,
    joinedAt: new Date('2022-06-15'),
  },
  {
    id: 'trader_7',
    name: 'SafeHaven',
    avatar: undefined,
    totalReturn: 45.8,
    winRate: 82.3,
    totalTrades: 234,
    followers: 345,
    riskScore: 2,
    sharpeRatio: 3.12,
    maxDrawdown: 5.4,
    avgTradeSize: 20000,
    tradingStyle: 'position_trader',
    preferredAssets: ['GLD', 'TLT', 'VTI', 'BND'],
    monthlyReturn: 2.8,
    isVerified: true,
    joinedAt: new Date('2023-05-01'),
  },
  {
    id: 'trader_8',
    name: 'OptionsWizard',
    avatar: undefined,
    totalReturn: 198.3,
    winRate: 69.7,
    totalTrades: 1543,
    followers: 987,
    riskScore: 7,
    sharpeRatio: 2.01,
    maxDrawdown: 21.5,
    avgTradeSize: 4500,
    tradingStyle: 'swing_trader',
    preferredAssets: ['SPY', 'AAPL', 'TSLA', 'AMZN'],
    monthlyReturn: 10.2,
    isVerified: true,
    joinedAt: new Date('2022-09-12'),
  },
];

// In-memory storage for copy settings (would be database in production)
const copySettingsStore: Map<string, CopySettings> = new Map();
const copyTradesStore: Map<string, CopyTrade[]> = new Map();

/**
 * Get top traders for copy trading
 */
export async function getTopTraders(
  sortBy: 'return' | 'winRate' | 'followers' | 'sharpe' = 'return',
  limit: number = 10
): Promise<CopyTrader[]> {
  let sorted = [...SIMULATED_TRADERS];
  
  switch (sortBy) {
    case 'return':
      sorted.sort((a, b) => b.totalReturn - a.totalReturn);
      break;
    case 'winRate':
      sorted.sort((a, b) => b.winRate - a.winRate);
      break;
    case 'followers':
      sorted.sort((a, b) => b.followers - a.followers);
      break;
    case 'sharpe':
      sorted.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
      break;
  }
  
  return sorted.slice(0, limit);
}

/**
 * Get trader by ID
 */
export async function getTraderById(traderId: string): Promise<CopyTrader | null> {
  return SIMULATED_TRADERS.find(t => t.id === traderId) || null;
}

/**
 * Search traders by name or style
 */
export async function searchTraders(
  query: string,
  filters?: {
    minReturn?: number;
    maxRisk?: number;
    tradingStyle?: CopyTrader['tradingStyle'];
    minWinRate?: number;
  }
): Promise<CopyTrader[]> {
  let results = SIMULATED_TRADERS.filter(t => 
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.preferredAssets.some(a => a.toLowerCase().includes(query.toLowerCase()))
  );
  
  if (filters) {
    if (filters.minReturn !== undefined) {
      results = results.filter(t => t.totalReturn >= filters.minReturn!);
    }
    if (filters.maxRisk !== undefined) {
      results = results.filter(t => t.riskScore <= filters.maxRisk!);
    }
    if (filters.tradingStyle) {
      results = results.filter(t => t.tradingStyle === filters.tradingStyle);
    }
    if (filters.minWinRate !== undefined) {
      results = results.filter(t => t.winRate >= filters.minWinRate!);
    }
  }
  
  return results;
}

/**
 * Start copying a trader
 */
export async function startCopyTrading(
  followerId: string,
  traderId: string,
  settings: {
    allocationMode: AllocationMode;
    allocationAmount: number;
    maxPositionSize?: number;
    maxDailyLoss?: number;
    copyStopLoss?: boolean;
    copyTakeProfit?: boolean;
    excludeSymbols?: string[];
  }
): Promise<CopySettings> {
  const id = `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const copySettings: CopySettings = {
    id,
    followerId,
    traderId,
    allocationMode: settings.allocationMode,
    allocationAmount: settings.allocationAmount,
    maxPositionSize: settings.maxPositionSize || 10000,
    maxDailyLoss: settings.maxDailyLoss || 500,
    copyStopLoss: settings.copyStopLoss ?? true,
    copyTakeProfit: settings.copyTakeProfit ?? true,
    excludeSymbols: settings.excludeSymbols || [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  copySettingsStore.set(id, copySettings);
  
  // Update trader's follower count
  const trader = SIMULATED_TRADERS.find(t => t.id === traderId);
  if (trader) {
    trader.followers += 1;
  }
  
  return copySettings;
}

/**
 * Stop copying a trader
 */
export async function stopCopyTrading(copySettingsId: string): Promise<boolean> {
  const settings = copySettingsStore.get(copySettingsId);
  if (!settings) return false;
  
  settings.status = 'stopped';
  settings.updatedAt = new Date();
  
  // Update trader's follower count
  const trader = SIMULATED_TRADERS.find(t => t.id === settings.traderId);
  if (trader && trader.followers > 0) {
    trader.followers -= 1;
  }
  
  return true;
}

/**
 * Pause copy trading
 */
export async function pauseCopyTrading(copySettingsId: string): Promise<boolean> {
  const settings = copySettingsStore.get(copySettingsId);
  if (!settings) return false;
  
  settings.status = 'paused';
  settings.updatedAt = new Date();
  
  return true;
}

/**
 * Resume copy trading
 */
export async function resumeCopyTrading(copySettingsId: string): Promise<boolean> {
  const settings = copySettingsStore.get(copySettingsId);
  if (!settings) return false;
  
  settings.status = 'active';
  settings.updatedAt = new Date();
  
  return true;
}

/**
 * Update copy settings
 */
export async function updateCopySettings(
  copySettingsId: string,
  updates: Partial<Omit<CopySettings, 'id' | 'followerId' | 'traderId' | 'createdAt'>>
): Promise<CopySettings | null> {
  const settings = copySettingsStore.get(copySettingsId);
  if (!settings) return null;
  
  Object.assign(settings, updates, { updatedAt: new Date() });
  
  return settings;
}

/**
 * Get user's copy trading settings
 */
export async function getUserCopySettings(userId: string): Promise<CopySettings[]> {
  const results: CopySettings[] = [];
  
  copySettingsStore.forEach(settings => {
    if (settings.followerId === userId) {
      results.push(settings);
    }
  });
  
  return results;
}

/**
 * Get copy settings by ID
 */
export async function getCopySettingsById(id: string): Promise<CopySettings | null> {
  return copySettingsStore.get(id) || null;
}

/**
 * Simulate copying a trade
 */
export async function copyTrade(
  copySettingsId: string,
  originalTrade: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  }
): Promise<CopyTrade | null> {
  const settings = copySettingsStore.get(copySettingsId);
  if (!settings || settings.status !== 'active') return null;
  
  // Check if symbol is excluded
  if (settings.excludeSymbols.includes(originalTrade.symbol)) {
    return null;
  }
  
  // Calculate copied quantity based on allocation mode
  let copiedQuantity: number;
  
  switch (settings.allocationMode) {
    case 'fixed':
      copiedQuantity = Math.floor(settings.allocationAmount / originalTrade.price);
      break;
    case 'percentage':
      copiedQuantity = Math.floor((originalTrade.quantity * settings.allocationAmount) / 100);
      break;
    case 'proportional':
      // Proportional to trader's position size
      copiedQuantity = Math.floor(originalTrade.quantity * (settings.allocationAmount / 10000));
      break;
    default:
      copiedQuantity = 1;
  }
  
  // Ensure minimum quantity
  copiedQuantity = Math.max(1, copiedQuantity);
  
  // Check max position size
  const positionValue = copiedQuantity * originalTrade.price;
  if (positionValue > settings.maxPositionSize) {
    copiedQuantity = Math.floor(settings.maxPositionSize / originalTrade.price);
  }
  
  // Simulate slippage (0.01% to 0.1%)
  const slippagePercent = 0.0001 + Math.random() * 0.0009;
  const slippage = originalTrade.price * slippagePercent;
  const copiedPrice = originalTrade.side === 'buy' 
    ? originalTrade.price + slippage 
    : originalTrade.price - slippage;
  
  const copyTrade: CopyTrade = {
    id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    copySettingsId,
    originalTradeId: originalTrade.id,
    followerId: settings.followerId,
    traderId: settings.traderId,
    symbol: originalTrade.symbol,
    side: originalTrade.side,
    originalQuantity: originalTrade.quantity,
    copiedQuantity,
    originalPrice: originalTrade.price,
    copiedPrice,
    slippage: slippagePercent * 100,
    status: 'executed',
    executedAt: new Date(),
    createdAt: new Date(),
  };
  
  // Store the copy trade
  const userTrades = copyTradesStore.get(settings.followerId) || [];
  userTrades.push(copyTrade);
  copyTradesStore.set(settings.followerId, userTrades);
  
  return copyTrade;
}

/**
 * Get user's copy trade history
 */
export async function getUserCopyTrades(
  userId: string,
  limit: number = 50
): Promise<CopyTrade[]> {
  const trades = copyTradesStore.get(userId) || [];
  return trades.slice(-limit).reverse();
}

/**
 * Get copy trading performance
 */
export async function getCopyPerformance(userId: string): Promise<CopyPerformance> {
  const trades = copyTradesStore.get(userId) || [];
  
  if (trades.length === 0) {
    return {
      totalCopiedTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalPnL: 0,
      totalReturn: 0,
      avgSlippage: 0,
      bestTrade: 0,
      worstTrade: 0,
      winRate: 0,
    };
  }
  
  const executedTrades = trades.filter(t => t.status === 'executed');
  const failedTrades = trades.filter(t => t.status === 'failed');
  
  // Simulate P&L for each trade
  const tradesWithPnL = executedTrades.map(t => {
    // Simulate random P&L based on market movement
    const pnlPercent = (Math.random() - 0.45) * 10; // Slight positive bias
    const pnl = t.copiedQuantity * t.copiedPrice * (pnlPercent / 100);
    return { ...t, pnl };
  });
  
  const totalPnL = tradesWithPnL.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = tradesWithPnL.filter(t => (t.pnl || 0) > 0);
  const avgSlippage = executedTrades.reduce((sum, t) => sum + t.slippage, 0) / executedTrades.length;
  
  const pnls = tradesWithPnL.map(t => t.pnl || 0);
  
  return {
    totalCopiedTrades: trades.length,
    successfulTrades: executedTrades.length,
    failedTrades: failedTrades.length,
    totalPnL,
    totalReturn: (totalPnL / 10000) * 100, // Assuming $10k base
    avgSlippage,
    bestTrade: Math.max(...pnls, 0),
    worstTrade: Math.min(...pnls, 0),
    winRate: executedTrades.length > 0 ? (wins.length / executedTrades.length) * 100 : 0,
  };
}

/**
 * Get leaderboard of traders
 */
export async function getCopyTradingLeaderboard(
  timeframe: '7d' | '30d' | '90d' | 'all' = '30d',
  limit: number = 10
): Promise<CopyTrader[]> {
  // In production, this would filter by timeframe
  // For now, return top traders sorted by return
  return getTopTraders('return', limit);
}

export default {
  getTopTraders,
  getTraderById,
  searchTraders,
  startCopyTrading,
  stopCopyTrading,
  pauseCopyTrading,
  resumeCopyTrading,
  updateCopySettings,
  getUserCopySettings,
  getCopySettingsById,
  copyTrade,
  getUserCopyTrades,
  getCopyPerformance,
  getCopyTradingLeaderboard,
};
