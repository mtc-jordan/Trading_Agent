import { callDataApi } from "../_core/dataApi";
import { broadcastPriceUpdate, broadcastPriceUpdates, getActiveSymbolSubscriptions, PriceUpdate } from "../_core/websocket";

// Enhanced cache configuration
interface CachedPrice {
  data: PriceUpdate;
  timestamp: number;
  fetchCount: number;
  lastFetchAttempt: number;
}

interface CacheConfig {
  ttl: number;           // Time-to-live for fresh data
  staleTtl: number;      // Time-to-live for stale data (can still be used while revalidating)
  maxAge: number;        // Maximum age before data is considered expired
  minFetchInterval: number; // Minimum time between fetch attempts for same symbol
}

// Cache configuration - optimized to reduce API calls
const CACHE_CONFIG: CacheConfig = {
  ttl: 30000,            // 30 seconds - data is fresh
  staleTtl: 120000,      // 2 minutes - data is stale but usable
  maxAge: 300000,        // 5 minutes - data expires completely
  minFetchInterval: 15000, // 15 seconds minimum between fetches per symbol
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 30,  // Max API requests per minute
  burstLimit: 5,             // Max concurrent requests
  cooldownPeriod: 60000,     // Cooldown after hitting rate limit
  backoffMultiplier: 2,      // Exponential backoff multiplier
};

// Cache storage
const priceCache = new Map<string, CachedPrice>();
const pendingFetches = new Map<string, Promise<PriceUpdate | null>>();

// Rate limiting state
let requestCount = 0;
let lastRequestReset = Date.now();
let rateLimitCooldown = false;
let cooldownEndTime = 0;
let consecutiveErrors = 0;
let currentBackoff = RATE_LIMIT_CONFIG.cooldownPeriod;

// Service state
let marketDataInterval: NodeJS.Timeout | null = null;
let isRunning = false;

// Fetch interval - dynamically adjusted based on rate limits
let FETCH_INTERVAL = 30000; // Start with 30 seconds

/**
 * Check if we're within rate limits
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Check cooldown
  if (rateLimitCooldown && now < cooldownEndTime) {
    return false;
  }
  
  // Reset cooldown if expired
  if (rateLimitCooldown && now >= cooldownEndTime) {
    rateLimitCooldown = false;
    consecutiveErrors = 0;
    currentBackoff = RATE_LIMIT_CONFIG.cooldownPeriod;
    console.log("[MarketData] Rate limit cooldown ended, resuming requests");
  }
  
  // Reset request count every minute
  if (now - lastRequestReset >= 60000) {
    requestCount = 0;
    lastRequestReset = now;
  }
  
  return requestCount < RATE_LIMIT_CONFIG.maxRequestsPerMinute;
}

/**
 * Handle rate limit error
 */
function handleRateLimitError(): void {
  consecutiveErrors++;
  currentBackoff = Math.min(
    currentBackoff * RATE_LIMIT_CONFIG.backoffMultiplier,
    300000 // Max 5 minutes backoff
  );
  rateLimitCooldown = true;
  cooldownEndTime = Date.now() + currentBackoff;
  
  console.log(`[MarketData] Rate limit hit, backing off for ${currentBackoff / 1000}s (consecutive errors: ${consecutiveErrors})`);
  
  // Increase fetch interval to reduce future rate limit hits
  FETCH_INTERVAL = Math.min(FETCH_INTERVAL * 1.5, 120000); // Max 2 minutes
  console.log(`[MarketData] Adjusted fetch interval to ${FETCH_INTERVAL / 1000}s`);
}

/**
 * Handle successful request
 */
function handleSuccessfulRequest(): void {
  if (consecutiveErrors > 0) {
    consecutiveErrors = Math.max(0, consecutiveErrors - 1);
    // Gradually reduce fetch interval on success
    FETCH_INTERVAL = Math.max(FETCH_INTERVAL * 0.9, 30000); // Min 30 seconds
  }
}

/**
 * Get cache status for a symbol
 */
function getCacheStatus(symbol: string): 'fresh' | 'stale' | 'expired' | 'missing' {
  const cached = priceCache.get(symbol.toUpperCase());
  if (!cached) return 'missing';
  
  const age = Date.now() - cached.timestamp;
  if (age < CACHE_CONFIG.ttl) return 'fresh';
  if (age < CACHE_CONFIG.staleTtl) return 'stale';
  if (age < CACHE_CONFIG.maxAge) return 'expired';
  return 'missing';
}

/**
 * Check if we should fetch new data for a symbol
 */
function shouldFetch(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  const cached = priceCache.get(upperSymbol);
  
  // Always fetch if no cache
  if (!cached) return true;
  
  // Check minimum fetch interval
  const timeSinceLastFetch = Date.now() - cached.lastFetchAttempt;
  if (timeSinceLastFetch < CACHE_CONFIG.minFetchInterval) {
    return false;
  }
  
  // Fetch if data is stale or expired
  const status = getCacheStatus(symbol);
  return status !== 'fresh';
}

/**
 * Fetch stock chart data from Yahoo Finance API with caching
 */
export async function fetchStockPrice(symbol: string): Promise<PriceUpdate | null> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check rate limit
  if (!checkRateLimit()) {
    // Return cached data if available (stale-while-revalidate)
    const cached = priceCache.get(upperSymbol);
    if (cached) {
      console.log(`[MarketData] Rate limited, returning cached data for ${upperSymbol}`);
      return cached.data;
    }
    return null;
  }
  
  // Check if there's already a pending fetch for this symbol
  const pendingFetch = pendingFetches.get(upperSymbol);
  if (pendingFetch) {
    return pendingFetch;
  }
  
  // Check if we should fetch (respects minimum fetch interval)
  if (!shouldFetch(upperSymbol)) {
    const cached = priceCache.get(upperSymbol);
    if (cached) {
      return cached.data;
    }
  }
  
  // Create fetch promise
  const fetchPromise = (async (): Promise<PriceUpdate | null> => {
    try {
      requestCount++;
      
      const response = await callDataApi("YahooFinance/get_stock_chart", {
        query: {
          symbol: upperSymbol,
          region: "US",
          interval: "1d",
          range: "1d",
        },
      }) as any;

      if (!response?.chart?.result?.[0]) {
        console.log(`[MarketData] No data for ${upperSymbol}`);
        return priceCache.get(upperSymbol)?.data || null;
      }

      const result = response.chart.result[0];
      const meta = result.meta;

      // Get the latest price data
      const currentPrice = meta.regularMarketPrice || 0;
      const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const priceUpdate: PriceUpdate = {
        symbol: upperSymbol,
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: meta.regularMarketVolume || 0,
        timestamp: Date.now(),
      };

      // Update cache
      const existingCache = priceCache.get(upperSymbol);
      priceCache.set(upperSymbol, {
        data: priceUpdate,
        timestamp: Date.now(),
        fetchCount: (existingCache?.fetchCount || 0) + 1,
        lastFetchAttempt: Date.now(),
      });

      handleSuccessfulRequest();
      return priceUpdate;
    } catch (error: any) {
      // Check for rate limit error
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        handleRateLimitError();
      }
      
      console.error(`[MarketData] Error fetching ${upperSymbol}:`, error);
      
      // Return cached data on error (stale-while-revalidate)
      const cached = priceCache.get(upperSymbol);
      if (cached) {
        // Update last fetch attempt to prevent immediate retry
        cached.lastFetchAttempt = Date.now();
        return cached.data;
      }
      
      return null;
    } finally {
      pendingFetches.delete(upperSymbol);
    }
  })();
  
  pendingFetches.set(upperSymbol, fetchPromise);
  return fetchPromise;
}

/**
 * Fetch multiple stock prices in batch with smart rate limiting
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<PriceUpdate[]> {
  const updates: PriceUpdate[] = [];
  const symbolsToFetch: string[] = [];
  
  // First, return cached data for symbols that don't need refresh
  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    const status = getCacheStatus(upperSymbol);
    
    if (status === 'fresh') {
      // Use fresh cached data
      const cached = priceCache.get(upperSymbol);
      if (cached) {
        updates.push(cached.data);
      }
    } else if (status === 'stale') {
      // Use stale data but queue for refresh
      const cached = priceCache.get(upperSymbol);
      if (cached) {
        updates.push(cached.data);
      }
      if (shouldFetch(upperSymbol)) {
        symbolsToFetch.push(upperSymbol);
      }
    } else {
      // Need to fetch
      if (shouldFetch(upperSymbol)) {
        symbolsToFetch.push(upperSymbol);
      }
    }
  }
  
  // If rate limited, return what we have
  if (!checkRateLimit()) {
    console.log(`[MarketData] Rate limited, returning ${updates.length} cached prices`);
    return updates;
  }
  
  // Fetch symbols that need refresh (with smaller batch size)
  const batchSize = Math.min(RATE_LIMIT_CONFIG.burstLimit, 3);
  
  for (let i = 0; i < symbolsToFetch.length; i += batchSize) {
    // Check rate limit before each batch
    if (!checkRateLimit()) {
      console.log(`[MarketData] Rate limit reached during batch fetch`);
      break;
    }
    
    const batch = symbolsToFetch.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(symbol => fetchStockPrice(symbol))
    );
    
    results.forEach((result, idx) => {
      if (result) {
        // Update or add to results
        const existingIdx = updates.findIndex(u => u.symbol === result.symbol);
        if (existingIdx >= 0) {
          updates[existingIdx] = result;
        } else {
          updates.push(result);
        }
      }
    });
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < symbolsToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches
    }
  }
  
  return updates;
}

/**
 * Get cached price (always returns cached data if available)
 */
export function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = priceCache.get(symbol.toUpperCase());
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.maxAge) {
    return cached.data;
  }
  return null;
}

/**
 * Get all cached prices
 */
export function getAllCachedPrices(): Map<string, PriceUpdate> {
  const result = new Map<string, PriceUpdate>();
  const now = Date.now();
  
  priceCache.forEach((cached, symbol) => {
    if (now - cached.timestamp < CACHE_CONFIG.maxAge) {
      result.set(symbol, cached.data);
    }
  });
  
  return result;
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  totalCached: number;
  freshCount: number;
  staleCount: number;
  expiredCount: number;
  rateLimited: boolean;
  cooldownRemaining: number;
  fetchInterval: number;
  requestsThisMinute: number;
} {
  let freshCount = 0;
  let staleCount = 0;
  let expiredCount = 0;
  
  priceCache.forEach((_, symbol) => {
    const status = getCacheStatus(symbol);
    if (status === 'fresh') freshCount++;
    else if (status === 'stale') staleCount++;
    else if (status === 'expired') expiredCount++;
  });
  
  return {
    totalCached: priceCache.size,
    freshCount,
    staleCount,
    expiredCount,
    rateLimited: rateLimitCooldown,
    cooldownRemaining: Math.max(0, cooldownEndTime - Date.now()),
    fetchInterval: FETCH_INTERVAL,
    requestsThisMinute: requestCount,
  };
}

/**
 * Start the real-time market data service
 */
export function startMarketDataService(): void {
  if (isRunning) {
    console.log("[MarketData] Service already running");
    return;
  }

  isRunning = true;
  console.log("[MarketData] Starting real-time market data service with enhanced caching");

  // Initial fetch for common symbols (with delay to avoid immediate rate limit)
  const defaultSymbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "META"];
  
  // Stagger initial fetches
  setTimeout(async () => {
    const updates = await fetchMultipleStockPrices(defaultSymbols);
    if (updates.length > 0) {
      broadcastPriceUpdates(updates);
      console.log(`[MarketData] Initial fetch: ${updates.length} symbols`);
    }
  }, 2000);

  // Set up interval for continuous updates
  const runUpdateCycle = async () => {
    const activeSymbols = getActiveSymbolSubscriptions();
    
    if (activeSymbols.length === 0) {
      return;
    }

    // Log cache stats periodically
    const stats = getCacheStats();
    if (stats.rateLimited) {
      console.log(`[MarketData] Rate limited, cooldown: ${Math.round(stats.cooldownRemaining / 1000)}s`);
    }

    try {
      const updates = await fetchMultipleStockPrices(activeSymbols);
      
      if (updates.length > 0) {
        broadcastPriceUpdates(updates);
      }
    } catch (error) {
      console.error("[MarketData] Error in update cycle:", error);
    }
    
    // Schedule next update with dynamic interval
    marketDataInterval = setTimeout(runUpdateCycle, FETCH_INTERVAL);
  };
  
  // Start the update cycle
  marketDataInterval = setTimeout(runUpdateCycle, FETCH_INTERVAL);
}

/**
 * Stop the market data service
 */
export function stopMarketDataService(): void {
  if (marketDataInterval) {
    clearTimeout(marketDataInterval);
    marketDataInterval = null;
  }
  isRunning = false;
  console.log("[MarketData] Service stopped");
}

/**
 * Get stock quote with additional details (uses cache)
 */
export async function getStockQuote(symbol: string): Promise<{
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52Week: number;
  low52Week: number;
  dayHigh: number;
  dayLow: number;
  exchange: string;
  currency: string;
  cached: boolean;
  cacheAge: number;
} | null> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check rate limit first
  if (!checkRateLimit()) {
    // Return cached data if available
    const cached = priceCache.get(upperSymbol);
    if (cached) {
      return {
        symbol: upperSymbol,
        name: upperSymbol,
        price: cached.data.price,
        change: cached.data.change,
        changePercent: cached.data.changePercent,
        volume: cached.data.volume,
        marketCap: 0,
        high52Week: 0,
        low52Week: 0,
        dayHigh: 0,
        dayLow: 0,
        exchange: "",
        currency: "USD",
        cached: true,
        cacheAge: Date.now() - cached.timestamp,
      };
    }
    return null;
  }
  
  try {
    requestCount++;
    
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: upperSymbol,
        region: "US",
        interval: "1d",
        range: "1d",
      },
    }) as any;

    if (!response?.chart?.result?.[0]) {
      return null;
    }

    const meta = response.chart.result[0].meta;
    const currentPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    // Update cache
    const priceUpdate: PriceUpdate = {
      symbol: upperSymbol,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      timestamp: Date.now(),
    };
    
    const existingCache = priceCache.get(upperSymbol);
    priceCache.set(upperSymbol, {
      data: priceUpdate,
      timestamp: Date.now(),
      fetchCount: (existingCache?.fetchCount || 0) + 1,
      lastFetchAttempt: Date.now(),
    });

    handleSuccessfulRequest();

    return {
      symbol: upperSymbol,
      name: meta.longName || meta.shortName || symbol,
      price: currentPrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
      high52Week: meta.fiftyTwoWeekHigh || 0,
      low52Week: meta.fiftyTwoWeekLow || 0,
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      exchange: meta.exchangeName || "",
      currency: meta.currency || "USD",
      cached: false,
      cacheAge: 0,
    };
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      handleRateLimitError();
    }
    console.error(`[MarketData] Error fetching quote for ${symbol}:`, error);
    
    // Return cached data on error
    const cached = priceCache.get(upperSymbol);
    if (cached) {
      return {
        symbol: upperSymbol,
        name: upperSymbol,
        price: cached.data.price,
        change: cached.data.change,
        changePercent: cached.data.changePercent,
        volume: cached.data.volume,
        marketCap: 0,
        high52Week: 0,
        low52Week: 0,
        dayHigh: 0,
        dayLow: 0,
        exchange: "",
        currency: "USD",
        cached: true,
        cacheAge: Date.now() - cached.timestamp,
      };
    }
    
    return null;
  }
}

/**
 * Search for stocks by query
 */
export async function searchStocks(query: string): Promise<Array<{
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}>> {
  // For now, return a static list of popular stocks that match the query
  // In production, you would use a search API
  const popularStocks = [
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", type: "Equity" },
    { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", type: "Equity" },
    { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", type: "Equity" },
    { symbol: "V", name: "Visa Inc.", exchange: "NYSE", type: "Equity" },
    { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE", type: "Equity" },
    { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE", type: "Equity" },
    { symbol: "PG", name: "Procter & Gamble Co.", exchange: "NYSE", type: "Equity" },
    { symbol: "MA", name: "Mastercard Inc.", exchange: "NYSE", type: "Equity" },
    { symbol: "HD", name: "Home Depot Inc.", exchange: "NYSE", type: "Equity" },
    { symbol: "DIS", name: "Walt Disney Co.", exchange: "NYSE", type: "Equity" },
    { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "PYPL", name: "PayPal Holdings Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ", type: "Equity" },
    { symbol: "AMD", name: "Advanced Micro Devices Inc.", exchange: "NASDAQ", type: "Equity" },
    { symbol: "CRM", name: "Salesforce Inc.", exchange: "NYSE", type: "Equity" },
  ];

  const lowerQuery = query.toLowerCase();
  return popularStocks.filter(
    stock =>
      stock.symbol.toLowerCase().includes(lowerQuery) ||
      stock.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Force refresh a symbol (bypasses cache)
 */
export async function forceRefresh(symbol: string): Promise<PriceUpdate | null> {
  const upperSymbol = symbol.toUpperCase();
  
  // Remove from cache to force refresh
  priceCache.delete(upperSymbol);
  
  return fetchStockPrice(upperSymbol);
}

/**
 * Prefetch symbols into cache
 */
export async function prefetchSymbols(symbols: string[]): Promise<void> {
  console.log(`[MarketData] Prefetching ${symbols.length} symbols`);
  await fetchMultipleStockPrices(symbols);
}
