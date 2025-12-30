/**
 * TradoVerse API Client
 * 
 * Client for communicating with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to get token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string) =>
      this.request<{ access_token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    
    register: (data: { email: string; password: string; name: string }) =>
      this.request<{ access_token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: data,
      }),
    
    me: () => this.request<User>('/auth/me'),
    
    logout: () => this.request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  };

  // User endpoints
  users = {
    getProfile: () => this.request<User>('/users/me'),
    updateProfile: (data: Partial<User>) =>
      this.request<User>('/users/me', { method: 'PUT', body: data }),
  };

  // Trading accounts
  accounts = {
    list: () => this.request<TradingAccount[]>('/accounts'),
    create: (data: CreateAccountData) =>
      this.request<TradingAccount>('/accounts', { method: 'POST', body: data }),
    get: (id: number) => this.request<TradingAccount>(`/accounts/${id}`),
    update: (id: number, data: Partial<TradingAccount>) =>
      this.request<TradingAccount>(`/accounts/${id}`, { method: 'PUT', body: data }),
    delete: (id: number) =>
      this.request<{ success: boolean }>(`/accounts/${id}`, { method: 'DELETE' }),
    reset: (id: number) =>
      this.request<{ success: boolean; balance: number }>(`/accounts/${id}/reset`, { method: 'POST' }),
  };

  // Trading bots
  bots = {
    list: (params?: { account_id?: number; status?: string }) => {
      const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<TradingBot[]>(`/bots${query}`);
    },
    create: (data: CreateBotData) =>
      this.request<TradingBot>('/bots', { method: 'POST', body: data }),
    get: (id: number) => this.request<TradingBot>(`/bots/${id}`),
    update: (id: number, data: Partial<TradingBot>) =>
      this.request<TradingBot>(`/bots/${id}`, { method: 'PUT', body: data }),
    delete: (id: number) =>
      this.request<{ success: boolean }>(`/bots/${id}`, { method: 'DELETE' }),
    start: (id: number) =>
      this.request<{ success: boolean; status: string }>(`/bots/${id}/start`, { method: 'POST' }),
    stop: (id: number) =>
      this.request<{ success: boolean; status: string }>(`/bots/${id}/stop`, { method: 'POST' }),
    pause: (id: number) =>
      this.request<{ success: boolean; status: string }>(`/bots/${id}/pause`, { method: 'POST' }),
  };

  // AI Analysis
  analysis = {
    consensus: (data: { symbol: string; agents?: string[] }) =>
      this.request<ConsensusResponse>('/analysis/consensus', { method: 'POST', body: data }),
    single: (data: { symbol: string }, agentType: string) =>
      this.request<AgentAnalysisResult>(`/analysis/single?agent_type=${agentType}`, {
        method: 'POST',
        body: data,
      }),
    history: (params?: { symbol?: string; agent_type?: string; limit?: number }) => {
      const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<AnalysisHistory[]>(`/analysis/history${query}`);
    },
    agents: () => this.request<AvailableAgents>('/analysis/agents'),
  };

  // Backtesting
  backtest = {
    list: (params?: { bot_id?: number; status?: string; limit?: number }) => {
      const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<Backtest[]>(`/backtest${query}`);
    },
    create: (data: CreateBacktestData) =>
      this.request<Backtest>('/backtest', { method: 'POST', body: data }),
    get: (id: number) => this.request<Backtest>(`/backtest/${id}`),
    results: (id: number) => this.request<BacktestResults>(`/backtest/${id}/results`),
    delete: (id: number) =>
      this.request<{ success: boolean }>(`/backtest/${id}`, { method: 'DELETE' }),
  };

  // Portfolio
  portfolio = {
    summary: (accountId: number) =>
      this.request<PortfolioSummary>(`/portfolio/summary/${accountId}`),
    analytics: (accountId: number) =>
      this.request<PortfolioAnalytics>(`/portfolio/analytics/${accountId}`),
    history: (accountId: number, days?: number) => {
      const query = days ? `?days=${days}` : '';
      return this.request<PortfolioHistory[]>(`/portfolio/history/${accountId}${query}`);
    },
  };

  // Marketplace
  marketplace = {
    listings: (params?: { category?: string; sort_by?: string; limit?: number }) => {
      const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<MarketplaceListing[]>(`/marketplace/listings${query}`);
    },
    create: (data: CreateListingData) =>
      this.request<MarketplaceListing>('/marketplace/listings', { method: 'POST', body: data }),
    get: (id: number) => this.request<MarketplaceListingDetail>(`/marketplace/listings/${id}`),
    copy: (id: number, accountId: number) =>
      this.request<{ success: boolean; bot_id: number }>(`/marketplace/listings/${id}/copy?account_id=${accountId}`, {
        method: 'POST',
      }),
    delete: (id: number) =>
      this.request<{ success: boolean }>(`/marketplace/listings/${id}`, { method: 'DELETE' }),
    leaderboard: (period?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (limit) params.set('limit', limit.toString());
      const query = params.toString() ? '?' + params.toString() : '';
      return this.request<LeaderboardEntry[]>(`/marketplace/leaderboard${query}`);
    },
    categories: () => this.request<Category[]>('/marketplace/categories'),
  };

  // Market Data
  market = {
    quote: (symbol: string) => this.request<StockQuote>(`/market/quote/${symbol}`),
    chart: (symbol: string, interval?: string, range?: string) => {
      const params = new URLSearchParams();
      if (interval) params.set('interval', interval);
      if (range) params.set('range_str', range);
      const query = params.toString() ? '?' + params.toString() : '';
      return this.request<StockChart>(`/market/chart/${symbol}${query}`);
    },
    insights: (symbol: string) => this.request<StockInsights>(`/market/insights/${symbol}`),
    search: (query: string) => this.request<SearchResults>(`/market/search?query=${query}`),
    trending: () => this.request<TrendingStocks>('/market/trending'),
    status: () => this.request<MarketStatus>('/market/market-status'),
  };

  // Subscriptions
  subscriptions = {
    tiers: () => this.request<{ tiers: SubscriptionTier[] }>('/subscriptions/tiers'),
    current: () => this.request<CurrentSubscription>('/subscriptions/current'),
    checkout: (data: { tier: string; success_url: string; cancel_url: string }, period?: string) => {
      const query = period ? `?billing_period=${period}` : '';
      return this.request<{ session_id: string; url: string }>(`/subscriptions/checkout${query}`, {
        method: 'POST',
        body: data,
      });
    },
    portal: (returnUrl: string) =>
      this.request<{ url: string }>(`/subscriptions/portal?return_url=${encodeURIComponent(returnUrl)}`, {
        method: 'POST',
      }),
    cancel: () => this.request<{ success: boolean }>('/subscriptions/cancel', { method: 'POST' }),
  };

  // Admin
  admin = {
    stats: () => this.request<AdminStats>('/admin/stats'),
    users: (params?: { role?: string; tier?: string; search?: string; limit?: number }) => {
      const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<User[]>(`/admin/users${query}`);
    },
    getUser: (id: number) => this.request<User>(`/admin/users/${id}`),
    updateUser: (id: number, data: { role?: string; subscription_tier?: string }) =>
      this.request<User>(`/admin/users/${id}`, { method: 'PUT', body: data }),
    deleteUser: (id: number) =>
      this.request<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
    activity: (limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return this.request<AdminActivity>(`/admin/activity${query}`);
    },
  };
}

// Types
export interface User {
  id: number;
  open_id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface TradingAccount {
  id: number;
  user_id: number;
  name: string;
  account_type: 'paper' | 'live';
  balance: number;
  initial_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateAccountData {
  name: string;
  account_type: 'paper' | 'live';
  initial_balance: number;
  currency?: string;
}

export interface TradingBot {
  id: number;
  user_id: number;
  account_id: number;
  name: string;
  description: string | null;
  strategy: string;
  symbols: string[];
  risk_settings: Record<string, unknown>;
  status: 'active' | 'paused' | 'stopped';
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  win_rate?: number;
  avg_trade_pnl?: number;
  created_at: string;
}

export interface CreateBotData {
  account_id: number;
  name: string;
  description?: string;
  strategy: string;
  symbols: string[];
  risk_settings?: {
    max_position_size?: number;
    stop_loss_percent?: number;
    take_profit_percent?: number;
    max_daily_loss?: number;
  };
}

export interface ConsensusResponse {
  id: number;
  symbol: string;
  final_recommendation: string;
  consensus_confidence: number;
  reasoning_summary: string;
  vote_breakdown: Record<string, number>;
  agent_analyses: AgentAnalysisResult[];
  created_at: string;
}

export interface AgentAnalysisResult {
  agent_type: string;
  recommendation: string;
  confidence: number;
  reasoning: string;
  data_points: Record<string, unknown>;
}

export interface AnalysisHistory {
  id: number;
  symbol: string;
  agent_type: string;
  recommendation: string;
  confidence: number;
  reasoning: string;
  created_at: string;
}

export interface AvailableAgents {
  available_agents: { type: string; name: string; description: string }[];
  locked_agents: { type: string; name: string; description: string }[];
  max_agents: number;
  tier: string;
}

export interface Backtest {
  id: number;
  user_id: number;
  bot_id: number | null;
  name: string;
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number | null;
  strategy: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_return: number | null;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  win_rate: number | null;
  created_at: string;
}

export interface CreateBacktestData {
  bot_id?: number;
  name: string;
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  strategy: string;
  parameters?: Record<string, unknown>;
}

export interface BacktestResults {
  status: string;
  summary?: {
    total_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    win_rate: number;
    profit_factor: number;
    total_trades: number;
  };
  details?: Record<string, unknown>;
  error?: string;
}

export interface PortfolioSummary {
  total_value: number;
  cash_balance: number;
  positions_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  daily_pnl: number;
  positions: PortfolioPosition[];
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

export interface PortfolioAnalytics {
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  avg_trade_duration: number;
  total_trades: number;
  best_trade: number;
  worst_trade: number;
  avg_win: number;
  avg_loss: number;
}

export interface PortfolioHistory {
  date: string;
  total_value: number;
  cash_balance: number;
  positions_value: number;
  daily_pnl: number;
}

export interface MarketplaceListing {
  id: number;
  bot_id: number;
  seller_id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  total_copies: number;
  rating: number;
  total_reviews: number;
  is_featured: boolean;
  created_at: string;
  bot?: TradingBot;
  seller_name?: string;
}

export interface MarketplaceListingDetail {
  listing: MarketplaceListing;
  bot: TradingBot;
  seller_name: string;
}

export interface CreateListingData {
  bot_id: number;
  title: string;
  description: string;
  price: number;
  category: string;
}

export interface LeaderboardEntry {
  rank: number;
  bot_id: number;
  bot_name: string;
  user_name: string;
  total_return: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  high?: number;
  low?: number;
  open?: number;
  previous_close?: number;
}

export interface StockChart {
  symbol: string;
  timestamps: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface StockInsights {
  [key: string]: unknown;
}

export interface SearchResults {
  results: { symbol: string; name: string }[];
}

export interface TrendingStocks {
  trending: StockQuote[];
}

export interface MarketStatus {
  is_open: boolean;
  current_time: string;
  market_open: string;
  market_close: string;
  next_open: string | null;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: Record<string, unknown>;
  feature_list: string[];
}

export interface CurrentSubscription {
  tier: string;
  tier_info: SubscriptionTier;
  features: Record<string, unknown>;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_bots: number;
  active_bots: number;
  total_trades: number;
  total_revenue: number;
  users_by_tier: Record<string, number>;
  new_users_today: number;
  new_users_week: number;
}

export interface AdminActivity {
  recent_trades: unknown[];
  recent_users: unknown[];
  recent_bots: unknown[];
}

// Create and export singleton instance
export const api = new ApiClient(API_BASE_URL);

export default api;
