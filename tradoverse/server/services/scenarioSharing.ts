/**
 * Scenario Sharing Service
 * 
 * Handles sharing, importing, and community features for trading scenarios.
 */

import { getDb } from '../db';
import { sharedScenarios, scenarioLikes, scenarioImports, users } from '../../drizzle/schema';
import { eq, desc, and, like, sql, or } from 'drizzle-orm';

export interface SharedScenarioData {
  name: string;
  description?: string;
  trades: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    estimatedPrice: number;
  }>;
  positions?: Array<{
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
  }>;
  cash?: number;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface ScenarioFilters {
  category?: string;
  search?: string;
  sortBy?: 'likes' | 'imports' | 'recent';
  limit?: number;
  offset?: number;
}

/**
 * Share a scenario with the community
 */
export async function shareScenario(
  userId: number,
  data: SharedScenarioData
): Promise<{ id: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const scenarioData = {
    trades: data.trades,
    positions: data.positions || [],
    cash: data.cash || 0,
    createdAt: new Date().toISOString(),
  };

  const result = await db.insert(sharedScenarios).values({
    userId,
    name: data.name,
    description: data.description || '',
    scenarioData: JSON.stringify(scenarioData),
    trades: JSON.stringify(data.trades),
    positions: data.positions ? JSON.stringify(data.positions) : null,
    cash: String(data.cash || 0),
    category: data.category || 'general',
    tags: data.tags ? JSON.stringify(data.tags) : null,
    isPublic: data.isPublic !== false,
  });

  return { id: Number((result as any)[0]?.insertId || 0), success: true };
}

/**
 * Get community scenarios with filtering
 */
export async function getCommunityScenarios(
  filters: ScenarioFilters = {}
): Promise<Array<{
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  likesCount: number;
  importsCount: number;
  viewsCount: number;
  authorName: string;
  authorId: number;
  createdAt: Date;
  trades: any[];
}>> {
  const db = await getDb();
  if (!db) return [];

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  // Build query
  let query = db
    .select({
      id: sharedScenarios.id,
      name: sharedScenarios.name,
      description: sharedScenarios.description,
      category: sharedScenarios.category,
      tags: sharedScenarios.tags,
      likesCount: sharedScenarios.likesCount,
      importsCount: sharedScenarios.importsCount,
      viewsCount: sharedScenarios.viewsCount,
      trades: sharedScenarios.trades,
      createdAt: sharedScenarios.createdAt,
      userId: sharedScenarios.userId,
      authorName: users.name,
    })
    .from(sharedScenarios)
    .leftJoin(users, eq(sharedScenarios.userId, users.id))
    .where(eq(sharedScenarios.isPublic, true))
    .limit(limit)
    .offset(offset);

  // Apply sorting
  if (filters.sortBy === 'likes') {
    query = query.orderBy(desc(sharedScenarios.likesCount)) as typeof query;
  } else if (filters.sortBy === 'imports') {
    query = query.orderBy(desc(sharedScenarios.importsCount)) as typeof query;
  } else {
    query = query.orderBy(desc(sharedScenarios.createdAt)) as typeof query;
  }

  const results = await query;

  return results.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    category: r.category || 'general',
    tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
    likesCount: r.likesCount || 0,
    importsCount: r.importsCount || 0,
    viewsCount: r.viewsCount || 0,
    authorName: r.authorName || 'Anonymous',
    authorId: r.userId,
    createdAt: r.createdAt,
    trades: r.trades ? (typeof r.trades === 'string' ? JSON.parse(r.trades) : r.trades) : [],
  }));
}

/**
 * Get a single scenario by ID
 */
export async function getScenarioById(
  scenarioId: number,
  incrementView: boolean = true
): Promise<{
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  trades: any[];
  positions: any[];
  cash: number;
  likesCount: number;
  importsCount: number;
  viewsCount: number;
  authorName: string;
  authorId: number;
  createdAt: Date;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Increment view count
  if (incrementView) {
    await db
      .update(sharedScenarios)
      .set({ viewsCount: sql`${sharedScenarios.viewsCount} + 1` })
      .where(eq(sharedScenarios.id, scenarioId));
  }

  const results = await db
    .select({
      id: sharedScenarios.id,
      name: sharedScenarios.name,
      description: sharedScenarios.description,
      category: sharedScenarios.category,
      tags: sharedScenarios.tags,
      trades: sharedScenarios.trades,
      positions: sharedScenarios.positions,
      cash: sharedScenarios.cash,
      likesCount: sharedScenarios.likesCount,
      importsCount: sharedScenarios.importsCount,
      viewsCount: sharedScenarios.viewsCount,
      createdAt: sharedScenarios.createdAt,
      userId: sharedScenarios.userId,
      authorName: users.name,
    })
    .from(sharedScenarios)
    .leftJoin(users, eq(sharedScenarios.userId, users.id))
    .where(eq(sharedScenarios.id, scenarioId))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    category: r.category || 'general',
    tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
    trades: r.trades ? (typeof r.trades === 'string' ? JSON.parse(r.trades) : r.trades) : [],
    positions: r.positions ? (typeof r.positions === 'string' ? JSON.parse(r.positions) : r.positions) : [],
    cash: Number(r.cash) || 0,
    likesCount: r.likesCount || 0,
    importsCount: r.importsCount || 0,
    viewsCount: r.viewsCount || 0,
    authorName: r.authorName || 'Anonymous',
    authorId: r.userId,
    createdAt: r.createdAt,
  };
}

/**
 * Like a scenario
 */
export async function likeScenario(
  scenarioId: number,
  userId: number
): Promise<{ success: boolean; liked: boolean }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if already liked
  const existing = await db
    .select()
    .from(scenarioLikes)
    .where(and(
      eq(scenarioLikes.scenarioId, scenarioId),
      eq(scenarioLikes.userId, userId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Unlike
    await db
      .delete(scenarioLikes)
      .where(and(
        eq(scenarioLikes.scenarioId, scenarioId),
        eq(scenarioLikes.userId, userId)
      ));
    
    await db
      .update(sharedScenarios)
      .set({ likesCount: sql`${sharedScenarios.likesCount} - 1` })
      .where(eq(sharedScenarios.id, scenarioId));

    return { success: true, liked: false };
  } else {
    // Like
    await db.insert(scenarioLikes).values({
      scenarioId,
      userId,
    });

    await db
      .update(sharedScenarios)
      .set({ likesCount: sql`${sharedScenarios.likesCount} + 1` })
      .where(eq(sharedScenarios.id, scenarioId));

    return { success: true, liked: true };
  }
}

/**
 * Import a scenario
 */
export async function importScenario(
  scenarioId: number,
  userId: number
): Promise<{
  success: boolean;
  trades: any[];
  positions: any[];
  cash: number;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const scenario = await getScenarioById(scenarioId, false);
  if (!scenario) throw new Error('Scenario not found');

  // Record the import
  await db.insert(scenarioImports).values({
    scenarioId,
    userId,
  });

  // Increment import count
  await db
    .update(sharedScenarios)
    .set({ importsCount: sql`${sharedScenarios.importsCount} + 1` })
    .where(eq(sharedScenarios.id, scenarioId));

  return {
    success: true,
    trades: scenario.trades,
    positions: scenario.positions,
    cash: scenario.cash,
  };
}

/**
 * Get user's shared scenarios
 */
export async function getUserScenarios(
  userId: number
): Promise<Array<{
  id: number;
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
  likesCount: number;
  importsCount: number;
  viewsCount: number;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(sharedScenarios)
    .where(eq(sharedScenarios.userId, userId))
    .orderBy(desc(sharedScenarios.createdAt));

  return results.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    category: r.category || 'general',
    isPublic: r.isPublic || false,
    likesCount: r.likesCount || 0,
    importsCount: r.importsCount || 0,
    viewsCount: r.viewsCount || 0,
    createdAt: r.createdAt,
  }));
}

/**
 * Delete a shared scenario
 */
export async function deleteScenario(
  scenarioId: number,
  userId: number
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verify ownership
  const scenario = await db
    .select()
    .from(sharedScenarios)
    .where(and(
      eq(sharedScenarios.id, scenarioId),
      eq(sharedScenarios.userId, userId)
    ))
    .limit(1);

  if (scenario.length === 0) {
    throw new Error('Scenario not found or not owned by user');
  }

  // Delete likes
  await db
    .delete(scenarioLikes)
    .where(eq(scenarioLikes.scenarioId, scenarioId));

  // Delete imports
  await db
    .delete(scenarioImports)
    .where(eq(scenarioImports.scenarioId, scenarioId));

  // Delete scenario
  await db
    .delete(sharedScenarios)
    .where(eq(sharedScenarios.id, scenarioId));

  return { success: true };
}

/**
 * Check if user has liked a scenario
 */
export async function hasUserLiked(
  scenarioId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const existing = await db
    .select()
    .from(scenarioLikes)
    .where(and(
      eq(scenarioLikes.scenarioId, scenarioId),
      eq(scenarioLikes.userId, userId)
    ))
    .limit(1);

  return existing.length > 0;
}

/**
 * Get scenario categories with counts
 */
export async function getScenarioCategories(): Promise<Array<{
  category: string;
  count: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      category: sharedScenarios.category,
      count: sql<number>`COUNT(*)`,
    })
    .from(sharedScenarios)
    .where(eq(sharedScenarios.isPublic, true))
    .groupBy(sharedScenarios.category);

  return results.map(r => ({
    category: r.category || 'general',
    count: Number(r.count),
  }));
}
