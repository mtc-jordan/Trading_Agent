/**
 * Options Greeks Calculator Service
 * 
 * Implements Black-Scholes options pricing model and Greeks calculations
 * for options trading strategies.
 * 
 * Greeks Calculated:
 * - Delta: Price sensitivity to underlying price changes
 * - Gamma: Rate of change of delta
 * - Theta: Time decay (daily)
 * - Vega: Sensitivity to volatility changes
 * - Rho: Sensitivity to interest rate changes
 * 
 * Additional Features:
 * - Implied volatility calculation
 * - Option pricing (calls and puts)
 * - Greeks visualization data
 * - Strategy analysis (covered calls, protective puts, etc.)
 */

import { callDataApi } from "../_core/dataApi";

// Types
export type OptionType = 'call' | 'put';

export interface OptionInput {
  underlyingPrice: number;      // Current stock price
  strikePrice: number;          // Option strike price
  timeToExpiry: number;         // Time to expiration in years
  riskFreeRate: number;         // Risk-free interest rate (decimal)
  volatility: number;           // Implied or historical volatility (decimal)
  optionType: OptionType;       // Call or put
  dividendYield?: number;       // Dividend yield (decimal)
}

export interface GreeksResult {
  // Option price
  price: number;
  intrinsicValue: number;
  timeValue: number;
  
  // Greeks
  delta: number;          // -1 to 1
  gamma: number;          // Always positive
  theta: number;          // Usually negative (daily)
  vega: number;           // Per 1% volatility change
  rho: number;            // Per 1% rate change
  
  // Additional metrics
  lambda: number;         // Leverage (elasticity)
  probability: {
    itm: number;          // Probability of finishing in-the-money
    otm: number;          // Probability of finishing out-of-the-money
  };
  
  // Breakeven
  breakeven: number;
  
  // Greeks per dollar
  deltaPerDollar: number;
  gammaPerDollar: number;
}

export interface GreeksVisualization {
  // Delta vs Price
  deltaVsPrice: Array<{ price: number; delta: number }>;
  // Gamma vs Price
  gammaVsPrice: Array<{ price: number; gamma: number }>;
  // Theta vs Time
  thetaVsTime: Array<{ daysToExpiry: number; theta: number }>;
  // Price vs Underlying
  priceVsUnderlying: Array<{ underlyingPrice: number; optionPrice: number }>;
  // Profit/Loss at Expiry
  profitLossAtExpiry: Array<{ underlyingPrice: number; profitLoss: number }>;
}

export interface OptionChain {
  symbol: string;
  underlyingPrice: number;
  expirationDate: string;
  strikes: Array<{
    strike: number;
    call: GreeksResult | null;
    put: GreeksResult | null;
  }>;
}

export interface StrategyAnalysis {
  name: string;
  description: string;
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakevens: number[];
  greeks: {
    netDelta: number;
    netGamma: number;
    netTheta: number;
    netVega: number;
  };
  profitLossCurve: Array<{ price: number; profitLoss: number }>;
}

// Standard normal distribution functions
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Black-Scholes calculations
function calculateD1(
  S: number,  // Underlying price
  K: number,  // Strike price
  T: number,  // Time to expiry
  r: number,  // Risk-free rate
  sigma: number, // Volatility
  q: number = 0  // Dividend yield
): number {
  return (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

function calculateD2(d1: number, sigma: number, T: number): number {
  return d1 - sigma * Math.sqrt(T);
}

// Option pricing
export function calculateOptionPrice(input: OptionInput): number {
  const { underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma, optionType, dividendYield: q = 0 } = input;
  
  if (T <= 0) {
    // At expiration
    if (optionType === 'call') {
      return Math.max(0, S - K);
    } else {
      return Math.max(0, K - S);
    }
  }
  
  const d1 = calculateD1(S, K, T, r, sigma, q);
  const d2 = calculateD2(d1, sigma, T);
  
  if (optionType === 'call') {
    return S * Math.exp(-q * T) * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * Math.exp(-q * T) * normalCDF(-d1);
  }
}

// Greeks calculations
export function calculateGreeks(input: OptionInput): GreeksResult {
  const { underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma, optionType, dividendYield: q = 0 } = input;
  
  // Handle edge cases
  if (T <= 0) {
    const intrinsicValue = optionType === 'call' 
      ? Math.max(0, S - K) 
      : Math.max(0, K - S);
    
    return {
      price: intrinsicValue,
      intrinsicValue,
      timeValue: 0,
      delta: optionType === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      lambda: 0,
      probability: {
        itm: optionType === 'call' ? (S > K ? 1 : 0) : (S < K ? 1 : 0),
        otm: optionType === 'call' ? (S <= K ? 1 : 0) : (S >= K ? 1 : 0),
      },
      breakeven: optionType === 'call' ? K + intrinsicValue : K - intrinsicValue,
      deltaPerDollar: 0,
      gammaPerDollar: 0,
    };
  }
  
  const d1 = calculateD1(S, K, T, r, sigma, q);
  const d2 = calculateD2(d1, sigma, T);
  const sqrtT = Math.sqrt(T);
  
  // Option price
  const price = calculateOptionPrice(input);
  
  // Intrinsic and time value
  const intrinsicValue = optionType === 'call' 
    ? Math.max(0, S - K) 
    : Math.max(0, K - S);
  const timeValue = price - intrinsicValue;
  
  // Delta
  let delta: number;
  if (optionType === 'call') {
    delta = Math.exp(-q * T) * normalCDF(d1);
  } else {
    delta = Math.exp(-q * T) * (normalCDF(d1) - 1);
  }
  
  // Gamma (same for calls and puts)
  const gamma = Math.exp(-q * T) * normalPDF(d1) / (S * sigma * sqrtT);
  
  // Theta (daily)
  let theta: number;
  const term1 = -S * normalPDF(d1) * sigma * Math.exp(-q * T) / (2 * sqrtT);
  if (optionType === 'call') {
    theta = term1 - r * K * Math.exp(-r * T) * normalCDF(d2) + q * S * Math.exp(-q * T) * normalCDF(d1);
  } else {
    theta = term1 + r * K * Math.exp(-r * T) * normalCDF(-d2) - q * S * Math.exp(-q * T) * normalCDF(-d1);
  }
  theta = theta / 365; // Convert to daily
  
  // Vega (per 1% change in volatility)
  const vega = S * Math.exp(-q * T) * normalPDF(d1) * sqrtT / 100;
  
  // Rho (per 1% change in interest rate)
  let rho: number;
  if (optionType === 'call') {
    rho = K * T * Math.exp(-r * T) * normalCDF(d2) / 100;
  } else {
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  }
  
  // Lambda (leverage)
  const lambda = price > 0 ? delta * S / price : 0;
  
  // Probability ITM
  const probITM = optionType === 'call' ? normalCDF(d2) : normalCDF(-d2);
  
  // Breakeven
  const breakeven = optionType === 'call' ? K + price : K - price;
  
  return {
    price,
    intrinsicValue,
    timeValue,
    delta,
    gamma,
    theta,
    vega,
    rho,
    lambda,
    probability: {
      itm: probITM,
      otm: 1 - probITM,
    },
    breakeven,
    deltaPerDollar: price > 0 ? delta / price : 0,
    gammaPerDollar: price > 0 ? gamma / price : 0,
  };
}

// Implied volatility calculation using Newton-Raphson
export function calculateImpliedVolatility(
  marketPrice: number,
  underlyingPrice: number,
  strikePrice: number,
  timeToExpiry: number,
  riskFreeRate: number,
  optionType: OptionType,
  dividendYield: number = 0
): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  
  // Initial guess using Brenner-Subrahmanyam approximation
  let sigma = Math.sqrt(2 * Math.PI / timeToExpiry) * marketPrice / underlyingPrice;
  sigma = Math.max(0.01, Math.min(sigma, 5)); // Clamp between 1% and 500%
  
  for (let i = 0; i < maxIterations; i++) {
    const input: OptionInput = {
      underlyingPrice,
      strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility: sigma,
      optionType,
      dividendYield,
    };
    
    const price = calculateOptionPrice(input);
    const vega = calculateGreeks(input).vega * 100; // Convert back from per 1%
    
    const diff = price - marketPrice;
    
    if (Math.abs(diff) < tolerance) {
      return sigma;
    }
    
    if (vega < 0.0001) {
      // Vega too small, can't converge
      break;
    }
    
    sigma = sigma - diff / vega;
    sigma = Math.max(0.01, Math.min(sigma, 5)); // Keep in reasonable range
  }
  
  return sigma;
}

// Generate visualization data
export function generateGreeksVisualization(input: OptionInput): GreeksVisualization {
  const { underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma, optionType, dividendYield: q = 0 } = input;
  
  // Price range: 50% to 150% of current price
  const priceRange = Array.from({ length: 51 }, (_, i) => S * (0.5 + i * 0.02));
  
  // Delta vs Price
  const deltaVsPrice = priceRange.map(price => ({
    price,
    delta: calculateGreeks({ ...input, underlyingPrice: price }).delta,
  }));
  
  // Gamma vs Price
  const gammaVsPrice = priceRange.map(price => ({
    price,
    gamma: calculateGreeks({ ...input, underlyingPrice: price }).gamma,
  }));
  
  // Theta vs Time (from now to expiry)
  const daysToExpiry = Math.ceil(T * 365);
  const thetaVsTime = Array.from({ length: Math.min(daysToExpiry, 90) + 1 }, (_, i) => {
    const remainingDays = daysToExpiry - i;
    const remainingT = remainingDays / 365;
    return {
      daysToExpiry: remainingDays,
      theta: remainingT > 0 ? calculateGreeks({ ...input, timeToExpiry: remainingT }).theta : 0,
    };
  });
  
  // Price vs Underlying
  const priceVsUnderlying = priceRange.map(price => ({
    underlyingPrice: price,
    optionPrice: calculateOptionPrice({ ...input, underlyingPrice: price }),
  }));
  
  // Profit/Loss at Expiry
  const premium = calculateOptionPrice(input);
  const profitLossAtExpiry = priceRange.map(price => {
    let payoff: number;
    if (optionType === 'call') {
      payoff = Math.max(0, price - K);
    } else {
      payoff = Math.max(0, K - price);
    }
    return {
      underlyingPrice: price,
      profitLoss: payoff - premium,
    };
  });
  
  return {
    deltaVsPrice,
    gammaVsPrice,
    thetaVsTime,
    priceVsUnderlying,
    profitLossAtExpiry,
  };
}

// Generate option chain
export async function generateOptionChain(
  symbol: string,
  expirationDays: number,
  numStrikes: number = 11
): Promise<OptionChain> {
  // Fetch current price
  let underlyingPrice = 150; // Default
  
  try {
    interface YahooChartResponse {
      chart?: {
        result?: Array<{
          meta: {
            regularMarketPrice: number;
          };
        }>;
      };
    }
    
    const response = await callDataApi('YahooFinance/get_stock_chart', {
      query: {
        symbol,
        interval: '1d',
        range: '5d',
      },
    }) as YahooChartResponse;
    
    if (response?.chart?.result?.[0]?.meta?.regularMarketPrice) {
      underlyingPrice = response.chart.result[0].meta.regularMarketPrice;
    }
  } catch (error) {
    console.error('Error fetching price:', error);
  }
  
  const timeToExpiry = expirationDays / 365;
  const riskFreeRate = 0.05; // 5% default
  const volatility = 0.25; // 25% default
  
  // Generate strikes around current price
  const strikeInterval = underlyingPrice * 0.025; // 2.5% intervals
  const strikes: OptionChain['strikes'] = [];
  
  const halfStrikes = Math.floor(numStrikes / 2);
  for (let i = -halfStrikes; i <= halfStrikes; i++) {
    const strike = Math.round((underlyingPrice + i * strikeInterval) * 100) / 100;
    
    const callInput: OptionInput = {
      underlyingPrice,
      strikePrice: strike,
      timeToExpiry,
      riskFreeRate,
      volatility,
      optionType: 'call',
    };
    
    const putInput: OptionInput = {
      ...callInput,
      optionType: 'put',
    };
    
    strikes.push({
      strike,
      call: calculateGreeks(callInput),
      put: calculateGreeks(putInput),
    });
  }
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expirationDays);
  
  return {
    symbol,
    underlyingPrice,
    expirationDate: expirationDate.toISOString().split('T')[0],
    strikes,
  };
}

// Strategy analysis
export function analyzeStrategy(
  legs: Array<{
    optionType: OptionType;
    strikePrice: number;
    quantity: number; // Positive for long, negative for short
    premium: number;
  }>,
  underlyingPrice: number,
  timeToExpiry: number,
  riskFreeRate: number = 0.05,
  volatility: number = 0.25
): StrategyAnalysis {
  // Calculate net Greeks
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;
  let totalPremium = 0;
  
  for (const leg of legs) {
    const greeks = calculateGreeks({
      underlyingPrice,
      strikePrice: leg.strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility,
      optionType: leg.optionType,
    });
    
    netDelta += greeks.delta * leg.quantity;
    netGamma += greeks.gamma * leg.quantity;
    netTheta += greeks.theta * leg.quantity;
    netVega += greeks.vega * leg.quantity;
    totalPremium += leg.premium * leg.quantity;
  }
  
  // Generate profit/loss curve
  const priceRange = Array.from({ length: 51 }, (_, i) => underlyingPrice * (0.5 + i * 0.02));
  const profitLossCurve = priceRange.map(price => {
    let payoff = 0;
    for (const leg of legs) {
      let legPayoff: number;
      if (leg.optionType === 'call') {
        legPayoff = Math.max(0, price - leg.strikePrice);
      } else {
        legPayoff = Math.max(0, leg.strikePrice - price);
      }
      payoff += legPayoff * leg.quantity;
    }
    return {
      price,
      profitLoss: payoff - totalPremium,
    };
  });
  
  // Calculate max profit/loss
  const profits = profitLossCurve.map(p => p.profitLoss);
  const maxProfit = Math.max(...profits);
  const minProfit = Math.min(...profits);
  
  // Find breakevens
  const breakevens: number[] = [];
  for (let i = 1; i < profitLossCurve.length; i++) {
    const prev = profitLossCurve[i - 1];
    const curr = profitLossCurve[i];
    if ((prev.profitLoss < 0 && curr.profitLoss >= 0) || 
        (prev.profitLoss >= 0 && curr.profitLoss < 0)) {
      // Linear interpolation
      const breakeven = prev.price + (curr.price - prev.price) * 
        Math.abs(prev.profitLoss) / (Math.abs(prev.profitLoss) + Math.abs(curr.profitLoss));
      breakevens.push(Math.round(breakeven * 100) / 100);
    }
  }
  
  // Determine strategy name
  let name = 'Custom Strategy';
  let description = 'Custom options strategy';
  
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.quantity > 0) {
      name = leg.optionType === 'call' ? 'Long Call' : 'Long Put';
      description = leg.optionType === 'call' 
        ? 'Bullish strategy with unlimited upside potential'
        : 'Bearish strategy with significant downside potential';
    } else {
      name = leg.optionType === 'call' ? 'Short Call' : 'Short Put';
      description = leg.optionType === 'call'
        ? 'Neutral to bearish strategy with limited profit'
        : 'Neutral to bullish strategy with limited profit';
    }
  } else if (legs.length === 2) {
    const [leg1, leg2] = legs;
    if (leg1.optionType === 'call' && leg2.optionType === 'put' && 
        leg1.quantity > 0 && leg2.quantity > 0 &&
        leg1.strikePrice === leg2.strikePrice) {
      name = 'Long Straddle';
      description = 'Volatility strategy profiting from large price moves in either direction';
    } else if (leg1.optionType === leg2.optionType && 
               leg1.quantity > 0 && leg2.quantity < 0) {
      name = leg1.optionType === 'call' ? 'Bull Call Spread' : 'Bear Put Spread';
      description = leg1.optionType === 'call'
        ? 'Moderately bullish strategy with limited risk and reward'
        : 'Moderately bearish strategy with limited risk and reward';
    }
  }
  
  return {
    name,
    description,
    maxProfit: maxProfit === profits[profits.length - 1] ? 'unlimited' : maxProfit,
    maxLoss: minProfit === profits[0] ? 'unlimited' : Math.abs(minProfit),
    breakevens,
    greeks: {
      netDelta,
      netGamma,
      netTheta,
      netVega,
    },
    profitLossCurve,
  };
}

// Predefined strategies
export function getCoveredCallAnalysis(
  underlyingPrice: number,
  strikePrice: number,
  premium: number,
  timeToExpiry: number
): StrategyAnalysis {
  // Long 100 shares + short 1 call
  const strategy = analyzeStrategy(
    [
      {
        optionType: 'call',
        strikePrice,
        quantity: -1,
        premium,
      },
    ],
    underlyingPrice,
    timeToExpiry
  );
  
  // Adjust for stock position
  strategy.name = 'Covered Call';
  strategy.description = 'Income strategy: Long stock + short call. Generates premium but caps upside.';
  strategy.greeks.netDelta += 1; // Add delta from stock
  
  return strategy;
}

export function getProtectivePutAnalysis(
  underlyingPrice: number,
  strikePrice: number,
  premium: number,
  timeToExpiry: number
): StrategyAnalysis {
  // Long 100 shares + long 1 put
  const strategy = analyzeStrategy(
    [
      {
        optionType: 'put',
        strikePrice,
        quantity: 1,
        premium,
      },
    ],
    underlyingPrice,
    timeToExpiry
  );
  
  // Adjust for stock position
  strategy.name = 'Protective Put';
  strategy.description = 'Insurance strategy: Long stock + long put. Protects against downside.';
  strategy.greeks.netDelta += 1; // Add delta from stock
  
  return strategy;
}
