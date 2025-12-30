import { broadcastPriceUpdate, broadcastPriceUpdates, getActiveSymbolSubscriptions, PriceUpdate } from "../_core/websocket";

// Cache for last known prices
const priceCache = new Map<string, PriceUpdate>();

// Simulated price update interval (in production, this would connect to a real data feed)
let priceUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Start the price feed service
 * In production, this would connect to a real-time market data provider
 */
export function startPriceFeed(): void {
  if (priceUpdateInterval) {
    console.log("[PriceFeed] Already running");
    return;
  }

  console.log("[PriceFeed] Starting price feed service");

  // Update prices every 5 seconds for subscribed symbols
  priceUpdateInterval = setInterval(() => {
    const activeSymbols = getActiveSymbolSubscriptions();
    
    if (activeSymbols.length === 0) {
      return;
    }

    const updates: PriceUpdate[] = [];

    activeSymbols.forEach((symbol) => {
      const lastPrice = priceCache.get(symbol);
      const basePrice = lastPrice?.price || getBasePrice(symbol);
      
      // Simulate price movement (±0.5%)
      const changePercent = (Math.random() - 0.5) * 1;
      const newPrice = basePrice * (1 + changePercent / 100);
      const change = newPrice - basePrice;
      
      const update: PriceUpdate = {
        symbol,
        price: Math.round(newPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        timestamp: Date.now(),
      };

      priceCache.set(symbol, update);
      updates.push(update);
    });

    if (updates.length > 0) {
      broadcastPriceUpdates(updates);
    }
  }, 5000);
}

/**
 * Stop the price feed service
 */
export function stopPriceFeed(): void {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
    console.log("[PriceFeed] Stopped price feed service");
  }
}

/**
 * Get base price for a symbol (simulated)
 */
function getBasePrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    AAPL: 178.50,
    GOOGL: 141.25,
    MSFT: 378.90,
    AMZN: 178.75,
    TSLA: 248.50,
    META: 505.25,
    NVDA: 495.80,
    JPM: 195.40,
    V: 275.60,
    JNJ: 156.30,
    WMT: 165.80,
    PG: 158.90,
    MA: 445.20,
    HD: 345.60,
    DIS: 112.40,
    NFLX: 478.90,
    PYPL: 62.50,
    INTC: 45.30,
    AMD: 145.80,
    CRM: 265.40,
  };

  return basePrices[symbol.toUpperCase()] || 100 + Math.random() * 200;
}

/**
 * Get current price for a symbol
 */
export function getCurrentPrice(symbol: string): PriceUpdate | null {
  return priceCache.get(symbol.toUpperCase()) || null;
}

/**
 * Manually trigger a price update (for testing or external data sources)
 */
export function updatePrice(update: PriceUpdate): void {
  priceCache.set(update.symbol.toUpperCase(), update);
  broadcastPriceUpdate(update);
}

/**
 * Get all cached prices
 */
export function getAllCachedPrices(): Map<string, PriceUpdate> {
  return new Map(priceCache);
}
