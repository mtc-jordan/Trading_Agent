import { callDataApi } from "../_core/dataApi";
import { broadcastPriceUpdate, broadcastPriceUpdates, getActiveSymbolSubscriptions, PriceUpdate } from "../_core/websocket";

// Cache for market data with TTL
interface CachedPrice {
  data: PriceUpdate;
  timestamp: number;
}

const priceCache = new Map<string, CachedPrice>();
const CACHE_TTL = 10000; // 10 seconds cache TTL
const FETCH_INTERVAL = 15000; // Fetch every 15 seconds (to respect rate limits)

let marketDataInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Fetch stock chart data from Yahoo Finance API
 */
export async function fetchStockPrice(symbol: string): Promise<PriceUpdate | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
        region: "US",
        interval: "1d",
        range: "1d",
      },
    }) as any;

    if (!response?.chart?.result?.[0]) {
      console.log(`[MarketData] No data for ${symbol}`);
      return null;
    }

    const result = response.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];

    // Get the latest price data
    const currentPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    const priceUpdate: PriceUpdate = {
      symbol: symbol.toUpperCase(),
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      timestamp: Date.now(),
    };

    // Update cache
    priceCache.set(symbol.toUpperCase(), {
      data: priceUpdate,
      timestamp: Date.now(),
    });

    return priceUpdate;
  } catch (error) {
    console.error(`[MarketData] Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stock prices in batch
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<PriceUpdate[]> {
  const updates: PriceUpdate[] = [];
  
  // Fetch in parallel with rate limiting (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(symbol => fetchStockPrice(symbol))
    );
    
    results.forEach(result => {
      if (result) {
        updates.push(result);
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return updates;
}

/**
 * Get cached price or fetch if stale
 */
export function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = priceCache.get(symbol.toUpperCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
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
    if (now - cached.timestamp < CACHE_TTL * 6) { // Keep slightly stale data for display
      result.set(symbol, cached.data);
    }
  });
  
  return result;
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
  console.log("[MarketData] Starting real-time market data service");

  // Initial fetch for common symbols
  const defaultSymbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "META"];
  fetchMultipleStockPrices(defaultSymbols).then(updates => {
    if (updates.length > 0) {
      broadcastPriceUpdates(updates);
      console.log(`[MarketData] Initial fetch: ${updates.length} symbols`);
    }
  });

  // Set up interval for continuous updates
  marketDataInterval = setInterval(async () => {
    const activeSymbols = getActiveSymbolSubscriptions();
    
    if (activeSymbols.length === 0) {
      return;
    }

    try {
      const updates = await fetchMultipleStockPrices(activeSymbols);
      
      if (updates.length > 0) {
        broadcastPriceUpdates(updates);
      }
    } catch (error) {
      console.error("[MarketData] Error in update cycle:", error);
    }
  }, FETCH_INTERVAL);
}

/**
 * Stop the market data service
 */
export function stopMarketDataService(): void {
  if (marketDataInterval) {
    clearInterval(marketDataInterval);
    marketDataInterval = null;
  }
  isRunning = false;
  console.log("[MarketData] Service stopped");
}

/**
 * Get stock quote with additional details
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
} | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
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

    return {
      symbol: symbol.toUpperCase(),
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
    };
  } catch (error) {
    console.error(`[MarketData] Error fetching quote for ${symbol}:`, error);
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
