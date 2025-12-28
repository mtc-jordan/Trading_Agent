/**
 * TradoVerse Advanced Technical Indicators
 * 
 * Comprehensive technical analysis library implementing:
 * - Trend indicators (EMA, MACD, ADX, Parabolic SAR)
 * - Momentum indicators (RSI, Stochastic, Williams %R, CCI)
 * - Volatility indicators (Bollinger Bands, ATR, Keltner Channels)
 * - Volume indicators (OBV, VWAP, A/D Line)
 * - Pattern recognition (candlestick patterns, chart patterns)
 */

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  value: number;
  signal?: 'bullish' | 'bearish' | 'neutral';
  strength?: number; // 0-100
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  
  const multiplier = 2 / (period + 1);
  const ema: number[] = [];
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);
  
  // Calculate remaining EMAs
  for (let i = period; i < data.length; i++) {
    ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
  }
  
  return ema;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  
  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }
  
  return sma;
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return [];
  
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // First average
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calculate RSI
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  // Align arrays
  const offset = slowPeriod - fastPeriod;
  const macd: number[] = [];
  
  for (let i = 0; i < slowEMA.length; i++) {
    macd.push(fastEMA[i + offset] - slowEMA[i]);
  }
  
  const signal = calculateEMA(macd, signalPeriod);
  const histogram: number[] = [];
  
  const signalOffset = signalPeriod - 1;
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[i + signalOffset] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const sma = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i - period + 1];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  
  return { upper, middle: sma, lower };
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(candles: OHLCV[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // First ATR is simple average
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrValues: number[] = [atr];
  
  // Subsequent ATRs use smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    atrValues.push(atr);
  }
  
  return atrValues;
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(
  candles: OHLCV[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number[]; d: number[] } {
  if (candles.length < kPeriod) return { k: [], d: [] };
  
  const kValues: number[] = [];
  
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));
    const current = candles[i].close;
    
    const k = highest === lowest ? 50 : ((current - lowest) / (highest - lowest)) * 100;
    kValues.push(k);
  }
  
  const dValues = calculateSMA(kValues, dPeriod);
  
  return { k: kValues, d: dValues };
}

/**
 * Williams %R
 */
export function calculateWilliamsR(candles: OHLCV[], period: number = 14): number[] {
  if (candles.length < period) return [];
  
  const values: number[] = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));
    const current = candles[i].close;
    
    const wr = highest === lowest ? -50 : ((highest - current) / (highest - lowest)) * -100;
    values.push(wr);
  }
  
  return values;
}

/**
 * Commodity Channel Index (CCI)
 */
export function calculateCCI(candles: OHLCV[], period: number = 20): number[] {
  if (candles.length < period) return [];
  
  const typicalPrices = candles.map(c => (c.high + c.low + c.close) / 3);
  const sma = calculateSMA(typicalPrices, period);
  const cci: number[] = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    const slice = typicalPrices.slice(i - period + 1, i + 1);
    const mean = sma[i - period + 1];
    const meanDeviation = slice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / period;
    
    const tp = typicalPrices[i];
    cci.push(meanDeviation === 0 ? 0 : (tp - mean) / (0.015 * meanDeviation));
  }
  
  return cci;
}

/**
 * Average Directional Index (ADX)
 */
export function calculateADX(candles: OHLCV[], period: number = 14): {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
} {
  if (candles.length < period * 2) return { adx: [], plusDI: [], minusDI: [] };
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;
    
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    tr.push(Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    ));
  }
  
  // Smooth the values
  const smoothedPlusDM = calculateEMA(plusDM, period);
  const smoothedMinusDM = calculateEMA(minusDM, period);
  const smoothedTR = calculateEMA(tr, period);
  
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  
  for (let i = 0; i < smoothedTR.length; i++) {
    const pdi = smoothedTR[i] === 0 ? 0 : (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    const mdi = smoothedTR[i] === 0 ? 0 : (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    
    plusDI.push(pdi);
    minusDI.push(mdi);
    
    const sum = pdi + mdi;
    dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100);
  }
  
  const adx = calculateEMA(dx, period);
  
  return { adx, plusDI, minusDI };
}

/**
 * On-Balance Volume (OBV)
 */
export function calculateOBV(candles: OHLCV[]): number[] {
  if (candles.length < 2) return [];
  
  const obv: number[] = [0];
  
  for (let i = 1; i < candles.length; i++) {
    const prevOBV = obv[obv.length - 1];
    const volume = candles[i].volume;
    
    if (candles[i].close > candles[i - 1].close) {
      obv.push(prevOBV + volume);
    } else if (candles[i].close < candles[i - 1].close) {
      obv.push(prevOBV - volume);
    } else {
      obv.push(prevOBV);
    }
  }
  
  return obv;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: OHLCV[]): number[] {
  const vwap: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    
    vwap.push(cumulativeVolume === 0 ? typicalPrice : cumulativeTPV / cumulativeVolume);
  }
  
  return vwap;
}

/**
 * Parabolic SAR
 */
export function calculateParabolicSAR(
  candles: OHLCV[],
  step: number = 0.02,
  maxStep: number = 0.2
): number[] {
  if (candles.length < 2) return [];
  
  const sar: number[] = [];
  let isUptrend = candles[1].close > candles[0].close;
  let af = step;
  let ep = isUptrend ? candles[0].high : candles[0].low;
  let sarValue = isUptrend ? candles[0].low : candles[0].high;
  
  sar.push(sarValue);
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    
    // Calculate new SAR
    sarValue = sarValue + af * (ep - sarValue);
    
    // Check for reversal
    if (isUptrend) {
      if (low < sarValue) {
        isUptrend = false;
        sarValue = ep;
        ep = low;
        af = step;
      } else {
        if (high > ep) {
          ep = high;
          af = Math.min(af + step, maxStep);
        }
        // SAR can't be above prior two lows
        if (i >= 2) {
          sarValue = Math.min(sarValue, candles[i - 1].low, candles[i - 2].low);
        }
      }
    } else {
      if (high > sarValue) {
        isUptrend = true;
        sarValue = ep;
        ep = high;
        af = step;
      } else {
        if (low < ep) {
          ep = low;
          af = Math.min(af + step, maxStep);
        }
        // SAR can't be below prior two highs
        if (i >= 2) {
          sarValue = Math.max(sarValue, candles[i - 1].high, candles[i - 2].high);
        }
      }
    }
    
    sar.push(sarValue);
  }
  
  return sar;
}

/**
 * Keltner Channels
 */
export function calculateKeltnerChannels(
  candles: OHLCV[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  multiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const closes = candles.map(c => c.close);
  const ema = calculateEMA(closes, emaPeriod);
  const atr = calculateATR(candles, atrPeriod);
  
  const upper: number[] = [];
  const lower: number[] = [];
  
  // Align arrays
  const offset = Math.max(emaPeriod, atrPeriod) - 1;
  const minLength = Math.min(ema.length, atr.length);
  
  for (let i = 0; i < minLength; i++) {
    upper.push(ema[i] + multiplier * atr[i]);
    lower.push(ema[i] - multiplier * atr[i]);
  }
  
  return { upper, middle: ema.slice(0, minLength), lower };
}

/**
 * Candlestick Pattern Recognition
 */
export interface CandlestickPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: 'high' | 'medium' | 'low';
  index: number;
}

export function detectCandlestickPatterns(candles: OHLCV[]): CandlestickPattern[] {
  const patterns: CandlestickPattern[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];
    
    const bodySize = Math.abs(current.close - current.open);
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const range = current.high - current.low;
    
    // Doji
    if (bodySize < range * 0.1) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        reliability: 'medium',
        index: i,
      });
    }
    
    // Hammer (bullish reversal)
    if (
      lowerWick > bodySize * 2 &&
      upperWick < bodySize * 0.5 &&
      prev.close < prev.open // Previous was bearish
    ) {
      patterns.push({
        name: 'Hammer',
        type: 'bullish',
        reliability: 'high',
        index: i,
      });
    }
    
    // Shooting Star (bearish reversal)
    if (
      upperWick > bodySize * 2 &&
      lowerWick < bodySize * 0.5 &&
      prev.close > prev.open // Previous was bullish
    ) {
      patterns.push({
        name: 'Shooting Star',
        type: 'bearish',
        reliability: 'high',
        index: i,
      });
    }
    
    // Engulfing patterns
    const prevBodySize = Math.abs(prev.close - prev.open);
    
    // Bullish Engulfing
    if (
      prev.close < prev.open && // Previous was bearish
      current.close > current.open && // Current is bullish
      current.open < prev.close &&
      current.close > prev.open
    ) {
      patterns.push({
        name: 'Bullish Engulfing',
        type: 'bullish',
        reliability: 'high',
        index: i,
      });
    }
    
    // Bearish Engulfing
    if (
      prev.close > prev.open && // Previous was bullish
      current.close < current.open && // Current is bearish
      current.open > prev.close &&
      current.close < prev.open
    ) {
      patterns.push({
        name: 'Bearish Engulfing',
        type: 'bearish',
        reliability: 'high',
        index: i,
      });
    }
    
    // Morning Star (3-candle bullish reversal)
    if (i >= 2) {
      const first = prev2;
      const second = prev;
      const third = current;
      
      const firstBody = Math.abs(first.close - first.open);
      const secondBody = Math.abs(second.close - second.open);
      const thirdBody = Math.abs(third.close - third.open);
      
      if (
        first.close < first.open && // First is bearish
        secondBody < firstBody * 0.3 && // Second is small
        third.close > third.open && // Third is bullish
        third.close > (first.open + first.close) / 2 // Third closes above first's midpoint
      ) {
        patterns.push({
          name: 'Morning Star',
          type: 'bullish',
          reliability: 'high',
          index: i,
        });
      }
      
      // Evening Star (3-candle bearish reversal)
      if (
        first.close > first.open && // First is bullish
        secondBody < firstBody * 0.3 && // Second is small
        third.close < third.open && // Third is bearish
        third.close < (first.open + first.close) / 2 // Third closes below first's midpoint
      ) {
        patterns.push({
          name: 'Evening Star',
          type: 'bearish',
          reliability: 'high',
          index: i,
        });
      }
    }
    
    // Three White Soldiers (bullish)
    if (i >= 2) {
      if (
        prev2.close > prev2.open &&
        prev.close > prev.open &&
        current.close > current.open &&
        prev.open > prev2.open &&
        current.open > prev.open &&
        prev.close > prev2.close &&
        current.close > prev.close
      ) {
        patterns.push({
          name: 'Three White Soldiers',
          type: 'bullish',
          reliability: 'high',
          index: i,
        });
      }
      
      // Three Black Crows (bearish)
      if (
        prev2.close < prev2.open &&
        prev.close < prev.open &&
        current.close < current.open &&
        prev.open < prev2.open &&
        current.open < prev.open &&
        prev.close < prev2.close &&
        current.close < prev.close
      ) {
        patterns.push({
          name: 'Three Black Crows',
          type: 'bearish',
          reliability: 'high',
          index: i,
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Calculate all indicators for a given dataset
 */
export function calculateAllIndicators(candles: OHLCV[]): {
  ema: { ema8: number[]; ema21: number[]; ema50: number[]; ema200: number[] };
  rsi: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  atr: number[];
  stochastic: { k: number[]; d: number[] };
  williamsR: number[];
  cci: number[];
  adx: { adx: number[]; plusDI: number[]; minusDI: number[] };
  obv: number[];
  vwap: number[];
  parabolicSar: number[];
  patterns: CandlestickPattern[];
} {
  const closes = candles.map(c => c.close);
  
  return {
    ema: {
      ema8: calculateEMA(closes, 8),
      ema21: calculateEMA(closes, 21),
      ema50: calculateEMA(closes, 50),
      ema200: calculateEMA(closes, 200),
    },
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    bollinger: calculateBollingerBands(closes),
    atr: calculateATR(candles),
    stochastic: calculateStochastic(candles),
    williamsR: calculateWilliamsR(candles),
    cci: calculateCCI(candles),
    adx: calculateADX(candles),
    obv: calculateOBV(candles),
    vwap: calculateVWAP(candles),
    parabolicSar: calculateParabolicSAR(candles),
    patterns: detectCandlestickPatterns(candles),
  };
}
