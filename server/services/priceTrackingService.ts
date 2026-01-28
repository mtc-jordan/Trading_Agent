/**
 * Price Tracking Service
 * 
 * Tracks actual price movements after AI recommendations to measure prediction accuracy.
 * Runs as a background job to fetch prices at various intervals (1h, 4h, 24h, 7d).
 */

import { getDb } from "../db";
import { 
  priceTracking, 
  predictionAccuracy, 
  agentAnalyses,
  users
} from "../../drizzle/schema";
import { eq, and, isNull, lte, gte, sql, desc } from "drizzle-orm";
import { callDataApi } from "../_core/dataApi";

// Time intervals for price tracking (in milliseconds)
const TRACKING_INTERVALS = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '14d': 14 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

interface StockPrice {
  symbol: string;
  price: number;
  timestamp: Date;
}

interface TrackingResult {
  success: boolean;
  tracked: number;
  errors: number;
  details: string[];
}

interface AccuracyMetrics {
  totalPredictions: number;
  correctPredictions: number;
  accuracyRate: number;
  avgConfidence: number;
  avgReturn: number;
  buyAccuracy: number;
  sellAccuracy: number;
  holdAccuracy: number;
}

/**
 * Fetch current stock price from Yahoo Finance API
 */
async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
        region: 'US',
        interval: '1d',
        range: '1d',
        includeAdjustedClose: true
      }
    }) as any;

    if (response?.chart?.result?.[0]?.meta?.regularMarketPrice) {
      return {
        symbol: symbol.toUpperCase(),
        price: response.chart.result[0].meta.regularMarketPrice,
        timestamp: new Date()
      };
    }

    // Fallback to quote data if available
    if (response?.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
      const closes = response.chart.result[0].indicators.quote[0].close;
      const lastClose = closes.filter((c: number | null) => c !== null).pop();
      if (lastClose) {
        return {
          symbol: symbol.toUpperCase(),
          price: lastClose,
          timestamp: new Date()
        };
      }
    }

    console.warn(`[PriceTracking] No price data found for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`[PriceTracking] Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch prices for multiple symbols in batch
 */
async function fetchMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
  const prices = new Map<string, StockPrice>();
  
  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (symbol) => {
      const price = await fetchStockPrice(symbol);
      if (price) {
        prices.set(symbol.toUpperCase(), price);
      }
    }));
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return prices;
}

/**
 * Create price tracking records for new AI analyses
 */
export async function createPriceTrackingForNewAnalyses(): Promise<TrackingResult> {
  const db = await getDb();
  if (!db) return { success: false, tracked: 0, errors: 0, details: ["Database not available"] };

  const result: TrackingResult = { success: true, tracked: 0, errors: 0, details: [] };

  try {
    // Get analyses from the last 24 hours that don't have price tracking yet
    const oneDayAgo = new Date(Date.now() - TRACKING_INTERVALS['24h']);
    
    const newAnalyses = await db
      .select({
        id: agentAnalyses.id,
        symbol: agentAnalyses.symbol,
        consensusAction: agentAnalyses.consensusAction,
        confidence: agentAnalyses.confidence,
        createdAt: agentAnalyses.createdAt,
      })
      .from(agentAnalyses)
      .where(
        and(
          gte(agentAnalyses.createdAt, oneDayAgo),
          sql`${agentAnalyses.id} NOT IN (SELECT analysisId FROM price_tracking)`
        )
      )
      .limit(100);

    if (newAnalyses.length === 0) {
      result.details.push("No new analyses to track");
      return result;
    }

    // Get unique symbols
    const symbols = Array.from(new Set(newAnalyses.map(a => a.symbol)));
    
    // Fetch current prices
    const prices = await fetchMultipleStockPrices(symbols);

    // Create tracking records
    for (const analysis of newAnalyses) {
      const price = prices.get(analysis.symbol.toUpperCase());
      
      if (!price) {
        result.errors++;
        result.details.push(`No price data for ${analysis.symbol}`);
        continue;
      }

      try {
        await db.insert(priceTracking).values({
          analysisId: analysis.id,
          symbol: analysis.symbol.toUpperCase(),
          priceAtRecommendation: String(price.price),
          recommendedAction: analysis.consensusAction || 'hold',
          confidence: analysis.confidence || '0.5',
          recommendedAt: analysis.createdAt,
        });
        result.tracked++;
      } catch (error) {
        result.errors++;
        result.details.push(`Failed to create tracking for analysis ${analysis.id}: ${error}`);
      }
    }

    result.details.push(`Created ${result.tracked} new tracking records`);
    return result;
  } catch (error) {
    result.success = false;
    result.details.push(`Error: ${error}`);
    return result;
  }
}

/**
 * Update price tracking records with current prices at various intervals
 */
export async function updatePriceTrackingRecords(): Promise<TrackingResult> {
  const db = await getDb();
  if (!db) return { success: false, tracked: 0, errors: 0, details: ["Database not available"] };

  const result: TrackingResult = { success: true, tracked: 0, errors: 0, details: [] };
  const now = new Date();

  try {
    // Get all tracking records that need updates
    const trackingRecords = await db
      .select()
      .from(priceTracking)
      .where(
        sql`(
          (price1Day IS NULL AND recommendedAt <= DATE_SUB(NOW(), INTERVAL 1 DAY)) OR
          (price3Day IS NULL AND recommendedAt <= DATE_SUB(NOW(), INTERVAL 3 DAY)) OR
          (price7Day IS NULL AND recommendedAt <= DATE_SUB(NOW(), INTERVAL 7 DAY)) OR
          (price14Day IS NULL AND recommendedAt <= DATE_SUB(NOW(), INTERVAL 14 DAY)) OR
          (price30Day IS NULL AND recommendedAt <= DATE_SUB(NOW(), INTERVAL 30 DAY))
        )`
      )
      .limit(200);

    if (trackingRecords.length === 0) {
      result.details.push("No tracking records need updates");
      return result;
    }

    // Get unique symbols
    const symbols = Array.from(new Set(trackingRecords.map(t => t.symbol)));
    
    // Fetch current prices
    const prices = await fetchMultipleStockPrices(symbols);

    // Update tracking records
    for (const tracking of trackingRecords) {
      const price = prices.get(tracking.symbol.toUpperCase());
      
      if (!price) {
        result.errors++;
        continue;
      }

      const recommendedAt = new Date(tracking.recommendedAt!);
      const timeSinceRecommendation = now.getTime() - recommendedAt.getTime();
      const originalPrice = Number(tracking.priceAtRecommendation);
      const currentPrice = price.price;
      
      // Calculate return
      const calculateReturn = (current: number, original: number) => {
        return ((current - original) / original) * 100;
      };

      const updates: Record<string, string | null> = {};

      // Check which intervals need updating
      if (!tracking.price1Day && timeSinceRecommendation >= TRACKING_INTERVALS['1d']) {
        updates.price1Day = String(currentPrice);
        updates.return1Day = String(calculateReturn(currentPrice, originalPrice));
      }
      
      if (!tracking.price3Day && timeSinceRecommendation >= TRACKING_INTERVALS['3d']) {
        updates.price3Day = String(currentPrice);
        updates.return3Day = String(calculateReturn(currentPrice, originalPrice));
      }
      
      if (!tracking.price7Day && timeSinceRecommendation >= TRACKING_INTERVALS['7d']) {
        updates.price7Day = String(currentPrice);
        updates.return7Day = String(calculateReturn(currentPrice, originalPrice));
      }
      
      if (!tracking.price14Day && timeSinceRecommendation >= TRACKING_INTERVALS['14d']) {
        updates.price14Day = String(currentPrice);
        updates.return14Day = String(calculateReturn(currentPrice, originalPrice));
      }
      
      if (!tracking.price30Day && timeSinceRecommendation >= TRACKING_INTERVALS['30d']) {
        updates.price30Day = String(currentPrice);
        updates.return30Day = String(calculateReturn(currentPrice, originalPrice));
      }

      if (Object.keys(updates).length > 0) {
        try {
          // Determine if prediction was correct based on action and price movement
          const returnValue = calculateReturn(currentPrice, originalPrice);
          const action = tracking.recommendedAction;
          
          let isCorrect = false;
          if (action === 'strong_buy' || action === 'buy') {
            isCorrect = returnValue > 0;
          } else if (action === 'strong_sell' || action === 'sell') {
            isCorrect = returnValue < 0;
          } else {
            // Hold is correct if price stayed within ±5%
            isCorrect = Math.abs(returnValue) <= 5;
          }

          await db
            .update(priceTracking)
            .set({
              ...updates,
              wasAccurate1Day: updates.price1Day ? isCorrect : tracking.wasAccurate1Day,
              lastUpdatedAt: now,
            })
            .where(eq(priceTracking.id, tracking.id));

          result.tracked++;
        } catch (error) {
          result.errors++;
          result.details.push(`Failed to update tracking ${tracking.id}: ${error}`);
        }
      }
    }

    result.details.push(`Updated ${result.tracked} tracking records`);
    return result;
  } catch (error) {
    result.success = false;
    result.details.push(`Error: ${error}`);
    return result;
  }
}

/**
 * Calculate and update prediction accuracy metrics
 */
export async function calculatePredictionAccuracy(): Promise<TrackingResult> {
  const db = await getDb();
  if (!db) return { success: false, tracked: 0, errors: 0, details: ["Database not available"] };

  const result: TrackingResult = { success: true, tracked: 0, errors: 0, details: [] };

  try {
    // Get all completed tracking records (those with at least 1-day price data)
    const completedTracking = await db
      .select()
      .from(priceTracking)
      .where(sql`price1Day IS NOT NULL`)
      .limit(1000);

    if (completedTracking.length === 0) {
      result.details.push("No completed tracking records to analyze");
      return result;
    }

    // Group by agent type and calculate metrics
    const agentTypes = ['technical', 'fundamental', 'sentiment', 'risk', 'microstructure', 'macro', 'quant', 'consensus'] as const;
    
    for (const agentType of agentTypes) {
      const metrics = calculateMetricsForAgent(completedTracking, agentType);
      
      if (metrics.totalPredictions === 0) continue;

      try {
        // Upsert accuracy record
        const existingRecord = await db
          .select()
          .from(predictionAccuracy)
          .where(
            and(
              eq(predictionAccuracy.agentType, agentType),
              eq(predictionAccuracy.timeframe, '1day'),
              isNull(predictionAccuracy.symbol)
            )
          )
          .limit(1);

        if (existingRecord.length > 0) {
          await db
            .update(predictionAccuracy)
            .set({
              totalPredictions: metrics.totalPredictions,
              correctPredictions: metrics.correctPredictions,
              accuracyRate: String(metrics.accuracyRate),
              avgConfidence: String(metrics.avgConfidence),
              avgReturn: String(metrics.avgReturn),
              buyAccuracy: String(metrics.buyAccuracy),
              sellAccuracy: String(metrics.sellAccuracy),
              holdAccuracy: String(metrics.holdAccuracy),
              periodEnd: new Date(),
            })
            .where(eq(predictionAccuracy.id, existingRecord[0].id));
        } else {
          await db.insert(predictionAccuracy).values({
            agentType,
            timeframe: '1day',
            totalPredictions: metrics.totalPredictions,
            correctPredictions: metrics.correctPredictions,
            accuracyRate: String(metrics.accuracyRate),
            avgConfidence: String(metrics.avgConfidence),
            avgReturn: String(metrics.avgReturn),
            buyAccuracy: String(metrics.buyAccuracy),
            sellAccuracy: String(metrics.sellAccuracy),
            holdAccuracy: String(metrics.holdAccuracy),
            periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(),
          });
        }

        result.tracked++;
      } catch (error) {
        result.errors++;
        result.details.push(`Failed to update accuracy for ${agentType}: ${error}`);
      }
    }

    result.details.push(`Updated accuracy metrics for ${result.tracked} agent types`);
    return result;
  } catch (error) {
    result.success = false;
    result.details.push(`Error: ${error}`);
    return result;
  }
}

/**
 * Calculate metrics for a specific agent type
 */
function calculateMetricsForAgent(
  trackingRecords: typeof priceTracking.$inferSelect[],
  agentType: string
): AccuracyMetrics {
  // For now, we use consensus metrics for all agent types
  // In a full implementation, we would have separate tracking per agent
  
  const records = trackingRecords.filter(t => t.wasAccurate1Day !== null);
  
  if (records.length === 0) {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracyRate: 0,
      avgConfidence: 0,
      avgReturn: 0,
      buyAccuracy: 0,
      sellAccuracy: 0,
      holdAccuracy: 0,
    };
  }

  const totalPredictions = records.length;
  const correctPredictions = records.filter(r => r.wasAccurate1Day).length;
  const accuracyRate = correctPredictions / totalPredictions;
  
  const avgConfidence = records.reduce((sum, r) => sum + Number(r.confidence || 0), 0) / totalPredictions;
  const avgReturn = records.reduce((sum, r) => sum + Number(r.return1Day || 0), 0) / totalPredictions;

  // Calculate accuracy by action type
  const buyRecords = records.filter(r => r.recommendedAction === 'buy' || r.recommendedAction === 'strong_buy');
  const sellRecords = records.filter(r => r.recommendedAction === 'sell' || r.recommendedAction === 'strong_sell');
  const holdRecords = records.filter(r => r.recommendedAction === 'hold');

  const buyAccuracy = buyRecords.length > 0 
    ? buyRecords.filter(r => r.wasAccurate1Day).length / buyRecords.length 
    : 0;
  const sellAccuracy = sellRecords.length > 0 
    ? sellRecords.filter(r => r.wasAccurate1Day).length / sellRecords.length 
    : 0;
  const holdAccuracy = holdRecords.length > 0 
    ? holdRecords.filter(r => r.wasAccurate1Day).length / holdRecords.length 
    : 0;

  return {
    totalPredictions,
    correctPredictions,
    accuracyRate,
    avgConfidence,
    avgReturn,
    buyAccuracy,
    sellAccuracy,
    holdAccuracy,
  };
}

/**
 * Main job function - runs all price tracking tasks
 */
export async function runPriceTrackingJob(): Promise<TrackingResult> {
  console.log('[PriceTracking] Starting price tracking job...');
  
  const results: TrackingResult = {
    success: true,
    tracked: 0,
    errors: 0,
    details: [],
  };

  // Step 1: Create tracking for new analyses
  const createResult = await createPriceTrackingForNewAnalyses();
  results.tracked += createResult.tracked;
  results.errors += createResult.errors;
  results.details.push(...createResult.details.map(d => `[Create] ${d}`));
  if (!createResult.success) results.success = false;

  // Step 2: Update existing tracking records
  const updateResult = await updatePriceTrackingRecords();
  results.tracked += updateResult.tracked;
  results.errors += updateResult.errors;
  results.details.push(...updateResult.details.map(d => `[Update] ${d}`));
  if (!updateResult.success) results.success = false;

  // Step 3: Calculate accuracy metrics
  const accuracyResult = await calculatePredictionAccuracy();
  results.tracked += accuracyResult.tracked;
  results.errors += accuracyResult.errors;
  results.details.push(...accuracyResult.details.map(d => `[Accuracy] ${d}`));
  if (!accuracyResult.success) results.success = false;

  console.log(`[PriceTracking] Job completed: ${results.tracked} tracked, ${results.errors} errors`);
  return results;
}

/**
 * Get accuracy statistics for a specific symbol or overall
 */
export async function getAccuracyStats(symbol?: string): Promise<AccuracyMetrics | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const records = await db
      .select()
      .from(predictionAccuracy)
      .where(
        symbol 
          ? eq(predictionAccuracy.symbol, symbol.toUpperCase())
          : isNull(predictionAccuracy.symbol)
      )
      .orderBy(desc(predictionAccuracy.periodEnd))
      .limit(1);

    if (records.length === 0) return null;

    const record = records[0];
    return {
      totalPredictions: record.totalPredictions,
      correctPredictions: record.correctPredictions,
      accuracyRate: Number(record.accuracyRate || 0),
      avgConfidence: Number(record.avgConfidence || 0),
      avgReturn: Number(record.avgReturn || 0),
      buyAccuracy: Number(record.buyAccuracy || 0),
      sellAccuracy: Number(record.sellAccuracy || 0),
      holdAccuracy: Number(record.holdAccuracy || 0),
    };
  } catch (error) {
    console.error('[PriceTracking] Error getting accuracy stats:', error);
    return null;
  }
}

// Alias for backward compatibility
export const createPriceTrackingRecord = createPriceTrackingForNewAnalyses;
