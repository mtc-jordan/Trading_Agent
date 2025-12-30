/**
 * Simulation Templates Service
 * Pre-configured simulation templates for common trading strategies
 */

// Generate unique ID
function generateId(): string {
  return 'template-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Types
export interface SimulationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sector_rotation' | 'dividend_growth' | 'momentum' | 'value' | 'defensive' | 'growth' | 'balanced' | 'custom';
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  targetAllocation: TemplateAllocation[];
  rebalanceFrequency: 'monthly' | 'quarterly' | 'annually' | 'never';
  estimatedVolatility: number; // Annualized
  estimatedReturn: number; // Annualized expected return
  minInvestment: number;
  tags: string[];
  createdAt: string;
  isBuiltIn: boolean;
}

export interface TemplateAllocation {
  symbol: string;
  name: string;
  targetPercent: number;
  sector: string;
  assetClass: 'stock' | 'etf' | 'bond' | 'reit' | 'commodity' | 'crypto';
}

export interface TemplateTrade {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedPrice: number;
  targetPercent: number;
}

// Built-in templates
const BUILT_IN_TEMPLATES: SimulationTemplate[] = [
  // Sector Rotation Templates
  {
    id: 'sector-tech-heavy',
    name: 'Tech-Heavy Growth',
    description: 'Concentrated technology sector exposure with high growth potential. Suitable for investors with high risk tolerance seeking maximum growth.',
    category: 'sector_rotation',
    riskLevel: 'aggressive',
    targetAllocation: [
      { symbol: 'AAPL', name: 'Apple Inc.', targetPercent: 20, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corp.', targetPercent: 20, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', targetPercent: 15, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', targetPercent: 15, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'META', name: 'Meta Platforms', targetPercent: 10, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com', targetPercent: 10, sector: 'Consumer Discretionary', assetClass: 'stock' },
      { symbol: 'QQQ', name: 'Nasdaq 100 ETF', targetPercent: 10, sector: 'Technology', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'quarterly',
    estimatedVolatility: 0.35,
    estimatedReturn: 0.15,
    minInvestment: 5000,
    tags: ['technology', 'growth', 'high-risk', 'sector-rotation'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'sector-healthcare',
    name: 'Healthcare Sector Focus',
    description: 'Defensive healthcare sector allocation with pharmaceutical and biotech exposure. Lower volatility with steady growth potential.',
    category: 'sector_rotation',
    riskLevel: 'moderate',
    targetAllocation: [
      { symbol: 'JNJ', name: 'Johnson & Johnson', targetPercent: 20, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'UNH', name: 'UnitedHealth Group', targetPercent: 18, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'PFE', name: 'Pfizer Inc.', targetPercent: 15, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'ABBV', name: 'AbbVie Inc.', targetPercent: 15, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'MRK', name: 'Merck & Co.', targetPercent: 12, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'XLV', name: 'Health Care Select ETF', targetPercent: 20, sector: 'Healthcare', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'quarterly',
    estimatedVolatility: 0.18,
    estimatedReturn: 0.09,
    minInvestment: 3000,
    tags: ['healthcare', 'defensive', 'moderate-risk', 'sector-rotation'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'sector-financials',
    name: 'Financial Sector Play',
    description: 'Banking and financial services exposure. Benefits from rising interest rates and economic growth.',
    category: 'sector_rotation',
    riskLevel: 'moderate',
    targetAllocation: [
      { symbol: 'JPM', name: 'JPMorgan Chase', targetPercent: 20, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'BAC', name: 'Bank of America', targetPercent: 15, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'WFC', name: 'Wells Fargo', targetPercent: 12, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'GS', name: 'Goldman Sachs', targetPercent: 13, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'MS', name: 'Morgan Stanley', targetPercent: 10, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', targetPercent: 15, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'XLF', name: 'Financial Select ETF', targetPercent: 15, sector: 'Financials', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'quarterly',
    estimatedVolatility: 0.25,
    estimatedReturn: 0.10,
    minInvestment: 4000,
    tags: ['financials', 'banks', 'moderate-risk', 'sector-rotation'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },

  // Dividend Growth Templates
  {
    id: 'dividend-aristocrats',
    name: 'Dividend Aristocrats',
    description: 'Companies with 25+ years of consecutive dividend increases. Focus on income and capital preservation with steady growth.',
    category: 'dividend_growth',
    riskLevel: 'conservative',
    targetAllocation: [
      { symbol: 'JNJ', name: 'Johnson & Johnson', targetPercent: 15, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'PG', name: 'Procter & Gamble', targetPercent: 15, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'KO', name: 'Coca-Cola Co.', targetPercent: 12, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'PEP', name: 'PepsiCo Inc.', targetPercent: 12, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'MMM', name: '3M Company', targetPercent: 10, sector: 'Industrials', assetClass: 'stock' },
      { symbol: 'ABT', name: 'Abbott Laboratories', targetPercent: 12, sector: 'Healthcare', assetClass: 'stock' },
      { symbol: 'CL', name: 'Colgate-Palmolive', targetPercent: 10, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'NOBL', name: 'Dividend Aristocrats ETF', targetPercent: 14, sector: 'Diversified', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'annually',
    estimatedVolatility: 0.14,
    estimatedReturn: 0.08,
    minInvestment: 5000,
    tags: ['dividend', 'income', 'conservative', 'blue-chip'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'high-yield-dividend',
    name: 'High Yield Income',
    description: 'Focus on high dividend yield stocks and REITs for maximum current income. Higher risk due to yield concentration.',
    category: 'dividend_growth',
    riskLevel: 'moderate',
    targetAllocation: [
      { symbol: 'VZ', name: 'Verizon Communications', targetPercent: 15, sector: 'Communication Services', assetClass: 'stock' },
      { symbol: 'T', name: 'AT&T Inc.', targetPercent: 12, sector: 'Communication Services', assetClass: 'stock' },
      { symbol: 'MO', name: 'Altria Group', targetPercent: 10, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'O', name: 'Realty Income Corp.', targetPercent: 15, sector: 'Real Estate', assetClass: 'reit' },
      { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', targetPercent: 15, sector: 'Real Estate', assetClass: 'etf' },
      { symbol: 'SCHD', name: 'Schwab US Dividend ETF', targetPercent: 18, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'DVY', name: 'iShares Select Dividend', targetPercent: 15, sector: 'Diversified', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'quarterly',
    estimatedVolatility: 0.18,
    estimatedReturn: 0.07,
    minInvestment: 3000,
    tags: ['dividend', 'high-yield', 'income', 'reits'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },

  // Momentum Templates
  {
    id: 'momentum-leaders',
    name: 'Momentum Leaders',
    description: 'Stocks with strong price momentum and relative strength. Higher turnover strategy following market trends.',
    category: 'momentum',
    riskLevel: 'aggressive',
    targetAllocation: [
      { symbol: 'NVDA', name: 'NVIDIA Corp.', targetPercent: 18, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', targetPercent: 15, sector: 'Consumer Discretionary', assetClass: 'stock' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', targetPercent: 12, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'AVGO', name: 'Broadcom Inc.', targetPercent: 12, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'CRM', name: 'Salesforce Inc.', targetPercent: 10, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'NOW', name: 'ServiceNow Inc.', targetPercent: 8, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'MTUM', name: 'iShares Momentum ETF', targetPercent: 25, sector: 'Diversified', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'monthly',
    estimatedVolatility: 0.40,
    estimatedReturn: 0.18,
    minInvestment: 5000,
    tags: ['momentum', 'growth', 'high-risk', 'trend-following'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'momentum-factor',
    name: 'Factor Momentum',
    description: 'ETF-based momentum strategy with diversified factor exposure. Lower single-stock risk while capturing momentum premium.',
    category: 'momentum',
    riskLevel: 'moderate',
    targetAllocation: [
      { symbol: 'MTUM', name: 'iShares Momentum ETF', targetPercent: 35, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'QUAL', name: 'iShares Quality ETF', targetPercent: 25, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'VUG', name: 'Vanguard Growth ETF', targetPercent: 25, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'QQQ', name: 'Nasdaq 100 ETF', targetPercent: 15, sector: 'Technology', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'monthly',
    estimatedVolatility: 0.25,
    estimatedReturn: 0.12,
    minInvestment: 2000,
    tags: ['momentum', 'factor', 'etf', 'diversified'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },

  // Value Templates
  {
    id: 'deep-value',
    name: 'Deep Value',
    description: 'Undervalued stocks trading below intrinsic value. Contrarian approach with long-term horizon.',
    category: 'value',
    riskLevel: 'moderate',
    targetAllocation: [
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', targetPercent: 20, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'CVX', name: 'Chevron Corp.', targetPercent: 12, sector: 'Energy', assetClass: 'stock' },
      { symbol: 'XOM', name: 'Exxon Mobil', targetPercent: 12, sector: 'Energy', assetClass: 'stock' },
      { symbol: 'INTC', name: 'Intel Corp.', targetPercent: 10, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'VFC', name: 'VF Corporation', targetPercent: 8, sector: 'Consumer Discretionary', assetClass: 'stock' },
      { symbol: 'VTV', name: 'Vanguard Value ETF', targetPercent: 20, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'VLUE', name: 'iShares Value Factor', targetPercent: 18, sector: 'Diversified', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'quarterly',
    estimatedVolatility: 0.20,
    estimatedReturn: 0.09,
    minInvestment: 4000,
    tags: ['value', 'contrarian', 'long-term', 'undervalued'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },

  // Defensive Templates
  {
    id: 'defensive-staples',
    name: 'Defensive Staples',
    description: 'Consumer staples and utilities for capital preservation. Low volatility with steady dividends.',
    category: 'defensive',
    riskLevel: 'conservative',
    targetAllocation: [
      { symbol: 'PG', name: 'Procter & Gamble', targetPercent: 18, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'KO', name: 'Coca-Cola Co.', targetPercent: 15, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'WMT', name: 'Walmart Inc.', targetPercent: 15, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'COST', name: 'Costco Wholesale', targetPercent: 12, sector: 'Consumer Staples', assetClass: 'stock' },
      { symbol: 'NEE', name: 'NextEra Energy', targetPercent: 10, sector: 'Utilities', assetClass: 'stock' },
      { symbol: 'XLU', name: 'Utilities Select ETF', targetPercent: 15, sector: 'Utilities', assetClass: 'etf' },
      { symbol: 'XLP', name: 'Consumer Staples ETF', targetPercent: 15, sector: 'Consumer Staples', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'annually',
    estimatedVolatility: 0.12,
    estimatedReturn: 0.06,
    minInvestment: 3000,
    tags: ['defensive', 'low-volatility', 'staples', 'utilities'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },

  // Growth Templates
  {
    id: 'aggressive-growth',
    name: 'Aggressive Growth',
    description: 'High-growth companies with strong revenue growth. Maximum capital appreciation potential with higher risk.',
    category: 'growth',
    riskLevel: 'aggressive',
    targetAllocation: [
      { symbol: 'NVDA', name: 'NVIDIA Corp.', targetPercent: 15, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', targetPercent: 12, sector: 'Consumer Discretionary', assetClass: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com', targetPercent: 12, sector: 'Consumer Discretionary', assetClass: 'stock' },
      { symbol: 'NFLX', name: 'Netflix Inc.', targetPercent: 10, sector: 'Communication Services', assetClass: 'stock' },
      { symbol: 'SHOP', name: 'Shopify Inc.', targetPercent: 8, sector: 'Technology', assetClass: 'stock' },
      { symbol: 'SQ', name: 'Block Inc.', targetPercent: 8, sector: 'Financials', assetClass: 'stock' },
      { symbol: 'ARKK', name: 'ARK Innovation ETF', targetPercent: 20, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'VUG', name: 'Vanguard Growth ETF', targetPercent: 15, sector: 'Diversified', assetClass: 'etf' },
    ],
    rebalanceFrequency: 'quarterly',
    estimatedVolatility: 0.45,
    estimatedReturn: 0.20,
    minInvestment: 5000,
    tags: ['growth', 'aggressive', 'high-risk', 'innovation'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },

  // Balanced Templates
  {
    id: 'classic-60-40',
    name: 'Classic 60/40',
    description: 'Traditional balanced portfolio with 60% stocks and 40% bonds. Time-tested allocation for moderate risk tolerance.',
    category: 'balanced',
    riskLevel: 'moderate',
    targetAllocation: [
      { symbol: 'VTI', name: 'Vanguard Total Stock', targetPercent: 40, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'VXUS', name: 'Vanguard Intl Stock', targetPercent: 20, sector: 'International', assetClass: 'etf' },
      { symbol: 'BND', name: 'Vanguard Total Bond', targetPercent: 30, sector: 'Fixed Income', assetClass: 'bond' },
      { symbol: 'BNDX', name: 'Vanguard Intl Bond', targetPercent: 10, sector: 'Fixed Income', assetClass: 'bond' },
    ],
    rebalanceFrequency: 'annually',
    estimatedVolatility: 0.12,
    estimatedReturn: 0.07,
    minInvestment: 1000,
    tags: ['balanced', '60-40', 'diversified', 'classic'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'all-weather',
    name: 'All-Weather Portfolio',
    description: 'Ray Dalio-inspired portfolio designed to perform in any economic environment. Balanced across asset classes.',
    category: 'balanced',
    riskLevel: 'conservative',
    targetAllocation: [
      { symbol: 'VTI', name: 'Vanguard Total Stock', targetPercent: 30, sector: 'Diversified', assetClass: 'etf' },
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury', targetPercent: 40, sector: 'Fixed Income', assetClass: 'bond' },
      { symbol: 'IEI', name: 'iShares 3-7 Year Treasury', targetPercent: 15, sector: 'Fixed Income', assetClass: 'bond' },
      { symbol: 'GLD', name: 'SPDR Gold Shares', targetPercent: 7.5, sector: 'Commodities', assetClass: 'commodity' },
      { symbol: 'DBC', name: 'Invesco DB Commodity', targetPercent: 7.5, sector: 'Commodities', assetClass: 'commodity' },
    ],
    rebalanceFrequency: 'annually',
    estimatedVolatility: 0.10,
    estimatedReturn: 0.06,
    minInvestment: 2000,
    tags: ['all-weather', 'balanced', 'risk-parity', 'diversified'],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
];

// Get all templates
export function getAllTemplates(): SimulationTemplate[] {
  return BUILT_IN_TEMPLATES;
}

// Get template by ID
export function getTemplateById(id: string): SimulationTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

// Get templates by category
export function getTemplatesByCategory(category: SimulationTemplate['category']): SimulationTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.category === category);
}

// Get templates by risk level
export function getTemplatesByRiskLevel(riskLevel: SimulationTemplate['riskLevel']): SimulationTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.riskLevel === riskLevel);
}

// Search templates
export function searchTemplates(query: string): SimulationTemplate[] {
  const lowerQuery = query.toLowerCase();
  return BUILT_IN_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Generate trades from template
export function generateTradesFromTemplate(
  template: SimulationTemplate,
  portfolioValue: number,
  currentPositions: { symbol: string; quantity: number; currentPrice: number }[],
  currentCash: number
): TemplateTrade[] {
  const trades: TemplateTrade[] = [];
  const totalValue = portfolioValue;
  
  // Create map of current positions
  const positionMap = new Map<string, { quantity: number; currentPrice: number }>();
  for (const pos of currentPositions) {
    positionMap.set(pos.symbol, { quantity: pos.quantity, currentPrice: pos.currentPrice });
  }
  
  // Calculate trades needed to reach target allocation
  for (const allocation of template.targetAllocation) {
    const targetValue = totalValue * (allocation.targetPercent / 100);
    const currentPosition = positionMap.get(allocation.symbol);
    const currentValue = currentPosition 
      ? currentPosition.quantity * currentPosition.currentPrice 
      : 0;
    
    const difference = targetValue - currentValue;
    const estimatedPrice = currentPosition?.currentPrice || getEstimatedPrice(allocation.symbol);
    
    if (Math.abs(difference) < 100) continue; // Skip small differences
    
    const quantity = Math.abs(Math.floor(difference / estimatedPrice));
    if (quantity === 0) continue;
    
    trades.push({
      symbol: allocation.symbol,
      side: difference > 0 ? 'buy' : 'sell',
      quantity,
      estimatedPrice,
      targetPercent: allocation.targetPercent,
    });
  }
  
  // Add sells for positions not in template
  for (const [symbol, position] of Array.from(positionMap.entries())) {
    const inTemplate = template.targetAllocation.some(a => a.symbol === symbol);
    if (!inTemplate && position.quantity > 0) {
      trades.push({
        symbol,
        side: 'sell',
        quantity: position.quantity,
        estimatedPrice: position.currentPrice,
        targetPercent: 0,
      });
    }
  }
  
  return trades;
}

// Get estimated price for a symbol (fallback prices)
function getEstimatedPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'AAPL': 175,
    'MSFT': 375,
    'NVDA': 480,
    'GOOGL': 140,
    'META': 350,
    'AMZN': 155,
    'TSLA': 250,
    'JPM': 170,
    'JNJ': 160,
    'PG': 155,
    'KO': 60,
    'PEP': 175,
    'VZ': 40,
    'T': 18,
    'XOM': 105,
    'CVX': 150,
    'BRK.B': 360,
    'UNH': 530,
    'PFE': 28,
    'ABBV': 165,
    'MRK': 115,
    'BAC': 35,
    'WFC': 50,
    'GS': 380,
    'MS': 90,
    'AMD': 145,
    'AVGO': 130,
    'CRM': 270,
    'NOW': 700,
    'NFLX': 480,
    'SHOP': 75,
    'SQ': 70,
    'INTC': 45,
    'WMT': 165,
    'COST': 580,
    'NEE': 75,
    'O': 55,
    'MMM': 100,
    'ABT': 110,
    'CL': 85,
    'MO': 45,
    'VFC': 18,
    // ETFs
    'QQQ': 400,
    'SPY': 475,
    'VTI': 240,
    'VXUS': 55,
    'VUG': 320,
    'VTV': 150,
    'BND': 75,
    'BNDX': 50,
    'TLT': 95,
    'IEI': 115,
    'GLD': 185,
    'DBC': 22,
    'XLV': 140,
    'XLF': 40,
    'XLU': 70,
    'XLP': 75,
    'VNQ': 85,
    'SCHD': 78,
    'DVY': 120,
    'NOBL': 95,
    'MTUM': 175,
    'QUAL': 150,
    'VLUE': 100,
    'ARKK': 50,
  };
  
  return prices[symbol] || 100;
}

// Create custom template
export function createCustomTemplate(
  name: string,
  description: string,
  allocations: TemplateAllocation[],
  riskLevel: SimulationTemplate['riskLevel'],
  rebalanceFrequency: SimulationTemplate['rebalanceFrequency']
): SimulationTemplate {
  // Calculate estimated volatility and return based on allocations
  const volatilities: Record<string, number> = {
    'stock': 0.25,
    'etf': 0.18,
    'bond': 0.08,
    'reit': 0.22,
    'commodity': 0.20,
    'crypto': 0.60,
  };
  
  const returns: Record<string, number> = {
    'stock': 0.10,
    'etf': 0.08,
    'bond': 0.04,
    'reit': 0.07,
    'commodity': 0.05,
    'crypto': 0.15,
  };
  
  let estimatedVolatility = 0;
  let estimatedReturn = 0;
  
  for (const alloc of allocations) {
    const weight = alloc.targetPercent / 100;
    estimatedVolatility += weight * (volatilities[alloc.assetClass] || 0.20);
    estimatedReturn += weight * (returns[alloc.assetClass] || 0.08);
  }
  
  return {
    id: generateId(),
    name,
    description,
    category: 'custom',
    riskLevel,
    targetAllocation: allocations,
    rebalanceFrequency,
    estimatedVolatility,
    estimatedReturn,
    minInvestment: 1000,
    tags: ['custom', riskLevel],
    createdAt: new Date().toISOString(),
    isBuiltIn: false,
  };
}
