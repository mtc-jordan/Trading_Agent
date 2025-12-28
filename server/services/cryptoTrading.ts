/**
 * Crypto Trading Service
 * Provides cryptocurrency market data, crypto-specific indicators, and DeFi integration
 */

// Supported cryptocurrencies
export const SUPPORTED_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
  { symbol: 'BNB', name: 'BNB', coingeckoId: 'binancecoin' },
  { symbol: 'XRP', name: 'XRP', coingeckoId: 'ripple' },
  { symbol: 'ADA', name: 'Cardano', coingeckoId: 'cardano' },
  { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana' },
  { symbol: 'DOGE', name: 'Dogecoin', coingeckoId: 'dogecoin' },
  { symbol: 'DOT', name: 'Polkadot', coingeckoId: 'polkadot' },
  { symbol: 'MATIC', name: 'Polygon', coingeckoId: 'matic-network' },
  { symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2' },
  { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink' },
  { symbol: 'UNI', name: 'Uniswap', coingeckoId: 'uniswap' },
  { symbol: 'ATOM', name: 'Cosmos', coingeckoId: 'cosmos' },
  { symbol: 'LTC', name: 'Litecoin', coingeckoId: 'litecoin' },
  { symbol: 'NEAR', name: 'NEAR Protocol', coingeckoId: 'near' },
];

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  lastUpdated: Date;
}

export interface CryptoOHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoIndicators {
  // Traditional indicators
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  ema20: number;
  ema50: number;
  ema200: number;
  
  // Crypto-specific indicators
  nvtRatio: number; // Network Value to Transactions
  mvrvRatio: number; // Market Value to Realized Value
  sopr: number; // Spent Output Profit Ratio
  fearGreedIndex: number;
  hashRate?: number; // For Bitcoin
  activeAddresses: number;
  exchangeNetFlow: number; // Positive = inflow (bearish), Negative = outflow (bullish)
  fundingRate: number; // Perpetual futures funding rate
  openInterest: number;
  longShortRatio: number;
}

export interface DeFiProtocol {
  name: string;
  chain: string;
  tvl: number;
  tvlChange24h: number;
  apy: number;
  category: 'lending' | 'dex' | 'yield' | 'staking' | 'bridge' | 'derivatives';
  token?: string;
  tokenPrice?: number;
}

export interface CryptoAnalysis {
  symbol: string;
  price: CryptoPrice;
  indicators: CryptoIndicators;
  sentiment: {
    overall: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    score: number;
    signals: string[];
  };
  recommendation: {
    action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    confidence: number;
    reasoning: string[];
    priceTargets: {
      support: number[];
      resistance: number[];
    };
  };
}

// Cache for crypto prices
const priceCache = new Map<string, { data: CryptoPrice; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache for crypto (24/7 market)

/**
 * Fetch cryptocurrency price data
 */
export async function getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  const crypto = SUPPORTED_CRYPTOS.find(c => c.symbol === symbol.toUpperCase());
  if (!crypto) return null;

  // Check cache
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Simulate API call with realistic data
    // In production, this would call CoinGecko, Binance, or similar API
    const basePrice = getBaseCryptoPrice(symbol);
    const volatility = getCryptoVolatility(symbol);
    const randomChange = (Math.random() - 0.5) * volatility * basePrice;
    const price = basePrice + randomChange;
    
    const priceData: CryptoPrice = {
      symbol: crypto.symbol,
      name: crypto.name,
      price,
      priceChange24h: randomChange,
      priceChangePercent24h: (randomChange / basePrice) * 100,
      volume24h: basePrice * (1000000 + Math.random() * 10000000),
      marketCap: price * getCirculatingSupply(symbol),
      high24h: price * (1 + volatility / 2),
      low24h: price * (1 - volatility / 2),
      circulatingSupply: getCirculatingSupply(symbol),
      totalSupply: getTotalSupply(symbol),
      maxSupply: getMaxSupply(symbol),
      lastUpdated: new Date(),
    };

    priceCache.set(symbol, { data: priceData, timestamp: Date.now() });
    return priceData;
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple cryptocurrency prices
 */
export async function getCryptoPrices(symbols?: string[]): Promise<CryptoPrice[]> {
  const targetSymbols = symbols || SUPPORTED_CRYPTOS.map(c => c.symbol);
  const prices = await Promise.all(targetSymbols.map(getCryptoPrice));
  return prices.filter((p): p is CryptoPrice => p !== null);
}

/**
 * Fetch historical OHLCV data for a cryptocurrency
 */
export async function getCryptoOHLCV(
  symbol: string,
  interval: '1h' | '4h' | '1d' | '1w' = '1d',
  days: number = 30
): Promise<CryptoOHLCV[]> {
  const basePrice = getBaseCryptoPrice(symbol);
  const volatility = getCryptoVolatility(symbol);
  const data: CryptoOHLCV[] = [];
  
  const intervalMs = {
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  const periods = Math.floor((days * 24 * 60 * 60 * 1000) / intervalMs[interval]);
  let currentPrice = basePrice * (0.8 + Math.random() * 0.4);
  const now = Date.now();

  for (let i = periods - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs[interval];
    const change = (Math.random() - 0.48) * volatility * currentPrice; // Slight upward bias
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = basePrice * (100000 + Math.random() * 1000000);

    data.push({ timestamp, open, high, low, close, volume });
    currentPrice = close;
  }

  return data;
}

/**
 * Calculate crypto-specific technical indicators
 */
export async function getCryptoIndicators(symbol: string): Promise<CryptoIndicators> {
  const ohlcv = await getCryptoOHLCV(symbol, '1d', 200);
  const closes = ohlcv.map(d => d.close);
  const volumes = ohlcv.map(d => d.volume);
  
  // Traditional indicators
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bollingerBands = calculateBollingerBands(closes, 20, 2);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  // Crypto-specific indicators (simulated)
  const currentPrice = closes[closes.length - 1];
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  // NVT Ratio (Network Value to Transactions) - lower is better
  const nvtRatio = 50 + Math.random() * 100;
  
  // MVRV Ratio (Market Value to Realized Value) - above 3.5 is overvalued
  const mvrvRatio = 1 + Math.random() * 3;
  
  // SOPR (Spent Output Profit Ratio) - above 1 means profit taking
  const sopr = 0.95 + Math.random() * 0.15;
  
  // Fear & Greed Index (0-100)
  const fearGreedIndex = Math.floor(20 + Math.random() * 60);
  
  // Hash Rate (for Bitcoin, in EH/s)
  const hashRate = symbol === 'BTC' ? 400 + Math.random() * 200 : undefined;
  
  // Active Addresses
  const activeAddresses = Math.floor(500000 + Math.random() * 500000);
  
  // Exchange Net Flow (negative = bullish outflow)
  const exchangeNetFlow = (Math.random() - 0.5) * 10000;
  
  // Funding Rate (perpetual futures)
  const fundingRate = (Math.random() - 0.5) * 0.1;
  
  // Open Interest
  const openInterest = currentPrice * (10000000 + Math.random() * 50000000);
  
  // Long/Short Ratio
  const longShortRatio = 0.8 + Math.random() * 0.8;

  return {
    rsi,
    macd,
    bollingerBands,
    ema20,
    ema50,
    ema200,
    nvtRatio,
    mvrvRatio,
    sopr,
    fearGreedIndex,
    hashRate,
    activeAddresses,
    exchangeNetFlow,
    fundingRate,
    openInterest,
    longShortRatio,
  };
}

/**
 * Get DeFi protocol data
 */
export async function getDeFiProtocols(): Promise<DeFiProtocol[]> {
  // Simulated DeFi protocol data
  // In production, this would call DeFiLlama or similar API
  return [
    {
      name: 'Aave',
      chain: 'Ethereum',
      tvl: 10500000000 + Math.random() * 1000000000,
      tvlChange24h: (Math.random() - 0.5) * 5,
      apy: 2 + Math.random() * 8,
      category: 'lending',
      token: 'AAVE',
      tokenPrice: 80 + Math.random() * 20,
    },
    {
      name: 'Uniswap',
      chain: 'Ethereum',
      tvl: 5000000000 + Math.random() * 500000000,
      tvlChange24h: (Math.random() - 0.5) * 5,
      apy: 5 + Math.random() * 30,
      category: 'dex',
      token: 'UNI',
      tokenPrice: 6 + Math.random() * 2,
    },
    {
      name: 'Lido',
      chain: 'Ethereum',
      tvl: 15000000000 + Math.random() * 2000000000,
      tvlChange24h: (Math.random() - 0.5) * 3,
      apy: 3.5 + Math.random() * 1,
      category: 'staking',
      token: 'LDO',
      tokenPrice: 2 + Math.random() * 1,
    },
    {
      name: 'Compound',
      chain: 'Ethereum',
      tvl: 2000000000 + Math.random() * 300000000,
      tvlChange24h: (Math.random() - 0.5) * 4,
      apy: 1.5 + Math.random() * 6,
      category: 'lending',
      token: 'COMP',
      tokenPrice: 50 + Math.random() * 15,
    },
    {
      name: 'Curve',
      chain: 'Ethereum',
      tvl: 3500000000 + Math.random() * 500000000,
      tvlChange24h: (Math.random() - 0.5) * 4,
      apy: 2 + Math.random() * 15,
      category: 'dex',
      token: 'CRV',
      tokenPrice: 0.5 + Math.random() * 0.3,
    },
    {
      name: 'MakerDAO',
      chain: 'Ethereum',
      tvl: 7000000000 + Math.random() * 1000000000,
      tvlChange24h: (Math.random() - 0.5) * 3,
      apy: 5 + Math.random() * 3,
      category: 'lending',
      token: 'MKR',
      tokenPrice: 1500 + Math.random() * 300,
    },
    {
      name: 'PancakeSwap',
      chain: 'BSC',
      tvl: 1500000000 + Math.random() * 300000000,
      tvlChange24h: (Math.random() - 0.5) * 6,
      apy: 10 + Math.random() * 50,
      category: 'dex',
      token: 'CAKE',
      tokenPrice: 2 + Math.random() * 1,
    },
    {
      name: 'GMX',
      chain: 'Arbitrum',
      tvl: 500000000 + Math.random() * 100000000,
      tvlChange24h: (Math.random() - 0.5) * 5,
      apy: 15 + Math.random() * 20,
      category: 'derivatives',
      token: 'GMX',
      tokenPrice: 30 + Math.random() * 10,
    },
    {
      name: 'Stargate',
      chain: 'Multi-chain',
      tvl: 400000000 + Math.random() * 100000000,
      tvlChange24h: (Math.random() - 0.5) * 5,
      apy: 5 + Math.random() * 10,
      category: 'bridge',
      token: 'STG',
      tokenPrice: 0.4 + Math.random() * 0.2,
    },
    {
      name: 'Yearn Finance',
      chain: 'Ethereum',
      tvl: 300000000 + Math.random() * 50000000,
      tvlChange24h: (Math.random() - 0.5) * 4,
      apy: 5 + Math.random() * 15,
      category: 'yield',
      token: 'YFI',
      tokenPrice: 7000 + Math.random() * 1000,
    },
  ];
}

/**
 * Perform comprehensive crypto analysis
 */
export async function analyzeCrypto(symbol: string): Promise<CryptoAnalysis | null> {
  const price = await getCryptoPrice(symbol);
  if (!price) return null;

  const indicators = await getCryptoIndicators(symbol);
  
  // Analyze sentiment
  const sentimentSignals: string[] = [];
  let sentimentScore = 0;

  // RSI analysis
  if (indicators.rsi < 30) {
    sentimentSignals.push('RSI indicates oversold conditions');
    sentimentScore += 2;
  } else if (indicators.rsi > 70) {
    sentimentSignals.push('RSI indicates overbought conditions');
    sentimentScore -= 2;
  }

  // MACD analysis
  if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
    sentimentSignals.push('MACD shows bullish momentum');
    sentimentScore += 1;
  } else if (indicators.macd.histogram < 0) {
    sentimentSignals.push('MACD shows bearish momentum');
    sentimentScore -= 1;
  }

  // Fear & Greed analysis
  if (indicators.fearGreedIndex < 25) {
    sentimentSignals.push('Extreme fear in market - potential buying opportunity');
    sentimentScore += 2;
  } else if (indicators.fearGreedIndex > 75) {
    sentimentSignals.push('Extreme greed in market - potential selling opportunity');
    sentimentScore -= 2;
  }

  // Exchange flow analysis
  if (indicators.exchangeNetFlow < -5000) {
    sentimentSignals.push('Large exchange outflows - bullish accumulation');
    sentimentScore += 1;
  } else if (indicators.exchangeNetFlow > 5000) {
    sentimentSignals.push('Large exchange inflows - potential selling pressure');
    sentimentScore -= 1;
  }

  // Funding rate analysis
  if (indicators.fundingRate > 0.05) {
    sentimentSignals.push('High positive funding rate - overleveraged longs');
    sentimentScore -= 1;
  } else if (indicators.fundingRate < -0.05) {
    sentimentSignals.push('Negative funding rate - overleveraged shorts');
    sentimentScore += 1;
  }

  // MVRV analysis
  if (indicators.mvrvRatio > 3) {
    sentimentSignals.push('MVRV suggests overvaluation');
    sentimentScore -= 1;
  } else if (indicators.mvrvRatio < 1) {
    sentimentSignals.push('MVRV suggests undervaluation');
    sentimentScore += 1;
  }

  // Determine overall sentiment
  let overallSentiment: CryptoAnalysis['sentiment']['overall'];
  if (sentimentScore >= 4) overallSentiment = 'very_bullish';
  else if (sentimentScore >= 2) overallSentiment = 'bullish';
  else if (sentimentScore <= -4) overallSentiment = 'very_bearish';
  else if (sentimentScore <= -2) overallSentiment = 'bearish';
  else overallSentiment = 'neutral';

  // Generate recommendation
  const reasoning: string[] = [];
  let action: CryptoAnalysis['recommendation']['action'];
  let confidence: number;

  if (sentimentScore >= 4) {
    action = 'strong_buy';
    confidence = 0.8 + Math.random() * 0.15;
    reasoning.push('Multiple bullish signals aligned');
  } else if (sentimentScore >= 2) {
    action = 'buy';
    confidence = 0.65 + Math.random() * 0.15;
    reasoning.push('Moderately bullish conditions');
  } else if (sentimentScore <= -4) {
    action = 'strong_sell';
    confidence = 0.8 + Math.random() * 0.15;
    reasoning.push('Multiple bearish signals aligned');
  } else if (sentimentScore <= -2) {
    action = 'sell';
    confidence = 0.65 + Math.random() * 0.15;
    reasoning.push('Moderately bearish conditions');
  } else {
    action = 'hold';
    confidence = 0.5 + Math.random() * 0.2;
    reasoning.push('Mixed signals - wait for clearer direction');
  }

  // Calculate price targets
  const currentPrice = price.price;
  const support = [
    currentPrice * 0.95,
    currentPrice * 0.9,
    currentPrice * 0.85,
  ];
  const resistance = [
    currentPrice * 1.05,
    currentPrice * 1.1,
    currentPrice * 1.15,
  ];

  return {
    symbol,
    price,
    indicators,
    sentiment: {
      overall: overallSentiment,
      score: sentimentScore,
      signals: sentimentSignals,
    },
    recommendation: {
      action,
      confidence,
      reasoning,
      priceTargets: { support, resistance },
    },
  };
}

// Helper functions
function getBaseCryptoPrice(symbol: string): number {
  const prices: Record<string, number> = {
    BTC: 43000,
    ETH: 2300,
    BNB: 310,
    XRP: 0.55,
    ADA: 0.45,
    SOL: 100,
    DOGE: 0.08,
    DOT: 7,
    MATIC: 0.85,
    AVAX: 35,
    LINK: 14,
    UNI: 6.5,
    ATOM: 9,
    LTC: 70,
    NEAR: 5,
  };
  return prices[symbol.toUpperCase()] || 1;
}

function getCryptoVolatility(symbol: string): number {
  const volatility: Record<string, number> = {
    BTC: 0.03,
    ETH: 0.04,
    BNB: 0.04,
    XRP: 0.05,
    ADA: 0.05,
    SOL: 0.06,
    DOGE: 0.08,
    DOT: 0.05,
    MATIC: 0.06,
    AVAX: 0.06,
    LINK: 0.05,
    UNI: 0.05,
    ATOM: 0.05,
    LTC: 0.04,
    NEAR: 0.06,
  };
  return volatility[symbol.toUpperCase()] || 0.05;
}

function getCirculatingSupply(symbol: string): number {
  const supply: Record<string, number> = {
    BTC: 19500000,
    ETH: 120000000,
    BNB: 150000000,
    XRP: 53000000000,
    ADA: 35000000000,
    SOL: 430000000,
    DOGE: 142000000000,
    DOT: 1300000000,
    MATIC: 9300000000,
    AVAX: 370000000,
    LINK: 560000000,
    UNI: 750000000,
    ATOM: 290000000,
    LTC: 73000000,
    NEAR: 1000000000,
  };
  return supply[symbol.toUpperCase()] || 1000000000;
}

function getTotalSupply(symbol: string): number {
  const supply: Record<string, number> = {
    BTC: 21000000,
    ETH: 120000000,
    BNB: 200000000,
    XRP: 100000000000,
    ADA: 45000000000,
    SOL: 550000000,
    DOGE: 142000000000,
    DOT: 1400000000,
    MATIC: 10000000000,
    AVAX: 720000000,
    LINK: 1000000000,
    UNI: 1000000000,
    ATOM: 290000000,
    LTC: 84000000,
    NEAR: 1000000000,
  };
  return supply[symbol.toUpperCase()] || 1000000000;
}

function getMaxSupply(symbol: string): number | null {
  const supply: Record<string, number | null> = {
    BTC: 21000000,
    ETH: null,
    BNB: 200000000,
    XRP: 100000000000,
    ADA: 45000000000,
    SOL: null,
    DOGE: null,
    DOT: null,
    MATIC: 10000000000,
    AVAX: 720000000,
    LINK: 1000000000,
    UNI: 1000000000,
    ATOM: null,
    LTC: 84000000,
    NEAR: 1000000000,
  };
  return supply[symbol.toUpperCase()] ?? null;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // Simplified signal line
  const signal = macdLine * 0.9;
  const histogram = macdLine - signal;
  
  return { value: macdLine, signal, histogram };
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  
  return {
    upper: middle + stdDev * std,
    middle,
    lower: middle - stdDev * std,
  };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

export default {
  SUPPORTED_CRYPTOS,
  getCryptoPrice,
  getCryptoPrices,
  getCryptoOHLCV,
  getCryptoIndicators,
  getDeFiProtocols,
  analyzeCrypto,
};
