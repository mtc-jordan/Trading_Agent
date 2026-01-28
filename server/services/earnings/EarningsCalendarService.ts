/**
 * Earnings Calendar Service
 * Provides earnings call scheduling, calendar management, and alert notifications
 */

import { getDb } from '../../db';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';

// Types
interface EarningsEvent {
  id: string;
  symbol: string;
  companyName: string;
  date: Date;
  time: string; // 'BMO' (Before Market Open), 'AMC' (After Market Close), 'DMH' (During Market Hours)
  fiscalQuarter: string;
  fiscalYear: number;
  estimatedEPS: number | null;
  actualEPS: number | null;
  estimatedRevenue: number | null;
  actualRevenue: number | null;
  status: 'upcoming' | 'live' | 'completed';
  conferenceCallUrl?: string;
  webcastUrl?: string;
}

interface CalendarAlert {
  id: string;
  userId: number;
  symbol: string;
  eventId: string;
  alertType: 'pre_call' | 'call_start' | 'results_released' | 'transcript_available';
  alertTime: Date;
  notificationMethod: 'email' | 'push' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
}

interface WatchlistItem {
  symbol: string;
  alertPreferences: {
    preCallMinutes: number; // Minutes before call to alert
    alertOnResults: boolean;
    alertOnTranscript: boolean;
  };
}

// FMP API for earnings calendar
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

export class EarningsCalendarService {
  private apiKey: string;
  private alertQueue: CalendarAlert[] = [];
  private watchlist: Map<number, WatchlistItem[]> = new Map();

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
  }

  /**
   * Fetch earnings calendar for a date range
   */
  async getEarningsCalendar(
    startDate: Date,
    endDate: Date
  ): Promise<EarningsEvent[]> {
    try {
      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `${FMP_BASE_URL}/earning-calendar?from=${fromDate}&to=${toDate}&apikey=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.map((item: any) => ({
        id: `${item.symbol}-${item.date}`,
        symbol: item.symbol,
        companyName: item.symbol, // FMP doesn't always return company name
        date: new Date(item.date),
        time: item.time || 'TBD',
        fiscalQuarter: `Q${item.fiscalDateEnding ? new Date(item.fiscalDateEnding).getMonth() / 3 + 1 : 0}`,
        fiscalYear: item.fiscalDateEnding ? new Date(item.fiscalDateEnding).getFullYear() : new Date().getFullYear(),
        estimatedEPS: item.epsEstimated,
        actualEPS: item.eps,
        estimatedRevenue: item.revenueEstimated,
        actualRevenue: item.revenue,
        status: this.determineEventStatus(new Date(item.date), item.eps),
        conferenceCallUrl: item.conferenceCallUrl,
        webcastUrl: item.webcastUrl
      }));
    } catch (error) {
      console.error('[EarningsCalendar] Error fetching calendar:', error);
      return [];
    }
  }

  /**
   * Get earnings events for specific symbols
   */
  async getEarningsForSymbols(symbols: string[]): Promise<EarningsEvent[]> {
    const events: EarningsEvent[] = [];
    
    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `${FMP_BASE_URL}/historical/earning_calendar/${symbol}?apikey=${this.apiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Get upcoming and recent events
          const symbolEvents = data.slice(0, 5).map((item: any) => ({
            id: `${item.symbol}-${item.date}`,
            symbol: item.symbol,
            companyName: item.symbol,
            date: new Date(item.date),
            time: item.time || 'TBD',
            fiscalQuarter: `Q${Math.ceil((new Date(item.date).getMonth() + 1) / 3)}`,
            fiscalYear: new Date(item.date).getFullYear(),
            estimatedEPS: item.epsEstimated,
            actualEPS: item.eps,
            estimatedRevenue: item.revenueEstimated,
            actualRevenue: item.revenue,
            status: this.determineEventStatus(new Date(item.date), item.eps)
          }));
          
          events.push(...symbolEvents);
        }
      } catch (error) {
        console.error(`[EarningsCalendar] Error fetching for ${symbol}:`, error);
      }
    }
    
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Determine event status based on date and results
   */
  private determineEventStatus(date: Date, actualEPS: number | null): EarningsEvent['status'] {
    const now = new Date();
    const eventDate = new Date(date);
    
    if (actualEPS !== null) {
      return 'completed';
    }
    
    // Check if event is today
    if (eventDate.toDateString() === now.toDateString()) {
      return 'live';
    }
    
    return eventDate > now ? 'upcoming' : 'completed';
  }

  /**
   * Add symbol to user's watchlist
   */
  async addToWatchlist(
    userId: number,
    symbol: string,
    preferences: WatchlistItem['alertPreferences']
  ): Promise<void> {
    const userWatchlist = this.watchlist.get(userId) || [];
    
    // Check if already exists
    const existingIndex = userWatchlist.findIndex(w => w.symbol === symbol);
    if (existingIndex >= 0) {
      userWatchlist[existingIndex].alertPreferences = preferences;
    } else {
      userWatchlist.push({ symbol, alertPreferences: preferences });
    }
    
    this.watchlist.set(userId, userWatchlist);
    
    // Schedule alerts for upcoming earnings
    await this.scheduleAlertsForSymbol(userId, symbol, preferences);
  }

  /**
   * Remove symbol from watchlist
   */
  removeFromWatchlist(userId: number, symbol: string): void {
    const userWatchlist = this.watchlist.get(userId) || [];
    const filtered = userWatchlist.filter(w => w.symbol !== symbol);
    this.watchlist.set(userId, filtered);
    
    // Remove pending alerts
    this.alertQueue = this.alertQueue.filter(
      a => !(a.userId === userId && a.symbol === symbol && a.status === 'pending')
    );
  }

  /**
   * Get user's watchlist
   */
  getWatchlist(userId: number): WatchlistItem[] {
    return this.watchlist.get(userId) || [];
  }

  /**
   * Schedule alerts for a symbol
   */
  private async scheduleAlertsForSymbol(
    userId: number,
    symbol: string,
    preferences: WatchlistItem['alertPreferences']
  ): Promise<void> {
    // Get upcoming earnings for this symbol
    const events = await this.getEarningsForSymbols([symbol]);
    const upcomingEvents = events.filter(e => e.status === 'upcoming');
    
    for (const event of upcomingEvents) {
      // Pre-call alert
      if (preferences.preCallMinutes > 0) {
        const alertTime = new Date(event.date.getTime() - preferences.preCallMinutes * 60 * 1000);
        
        if (alertTime > new Date()) {
          this.alertQueue.push({
            id: `${userId}-${event.id}-pre`,
            userId,
            symbol,
            eventId: event.id,
            alertType: 'pre_call',
            alertTime,
            notificationMethod: 'in_app',
            status: 'pending',
            createdAt: new Date()
          });
        }
      }
      
      // Call start alert
      this.alertQueue.push({
        id: `${userId}-${event.id}-start`,
        userId,
        symbol,
        eventId: event.id,
        alertType: 'call_start',
        alertTime: event.date,
        notificationMethod: 'in_app',
        status: 'pending',
        createdAt: new Date()
      });
    }
  }

  /**
   * Get pending alerts for a user
   */
  getPendingAlerts(userId: number): CalendarAlert[] {
    return this.alertQueue.filter(
      a => a.userId === userId && a.status === 'pending'
    ).sort((a, b) => a.alertTime.getTime() - b.alertTime.getTime());
  }

  /**
   * Get alerts due now
   */
  getAlertsDue(): CalendarAlert[] {
    const now = new Date();
    return this.alertQueue.filter(
      a => a.status === 'pending' && a.alertTime <= now
    );
  }

  /**
   * Mark alert as sent
   */
  markAlertSent(alertId: string): void {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'sent';
    }
  }

  /**
   * Get today's earnings events
   */
  async getTodaysEarnings(): Promise<EarningsEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.getEarningsCalendar(today, tomorrow);
  }

  /**
   * Get this week's earnings events
   */
  async getWeekEarnings(): Promise<EarningsEvent[]> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return this.getEarningsCalendar(startOfWeek, endOfWeek);
  }

  /**
   * Get earnings surprise analysis
   */
  async getEarningsSurprises(symbol: string, quarters: number = 8): Promise<{
    quarter: string;
    estimatedEPS: number;
    actualEPS: number;
    surprise: number;
    surprisePercent: number;
  }[]> {
    try {
      const response = await fetch(
        `${FMP_BASE_URL}/earnings-surprises/${symbol}?apikey=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.slice(0, quarters).map((item: any) => ({
        quarter: item.date,
        estimatedEPS: item.estimatedEarning || 0,
        actualEPS: item.actualEarningResult || 0,
        surprise: (item.actualEarningResult || 0) - (item.estimatedEarning || 0),
        surprisePercent: item.estimatedEarning 
          ? ((item.actualEarningResult - item.estimatedEarning) / Math.abs(item.estimatedEarning)) * 100
          : 0
      }));
    } catch (error) {
      console.error('[EarningsCalendar] Error fetching surprises:', error);
      return [];
    }
  }

  /**
   * Get earnings beat/miss statistics
   */
  async getEarningsStats(symbol: string): Promise<{
    totalQuarters: number;
    beats: number;
    misses: number;
    meets: number;
    beatRate: number;
    avgSurprise: number;
    avgSurprisePercent: number;
  }> {
    const surprises = await this.getEarningsSurprises(symbol, 20);
    
    let beats = 0;
    let misses = 0;
    let meets = 0;
    let totalSurprise = 0;
    let totalSurprisePercent = 0;
    
    for (const s of surprises) {
      if (s.surprise > 0.01) beats++;
      else if (s.surprise < -0.01) misses++;
      else meets++;
      
      totalSurprise += s.surprise;
      totalSurprisePercent += s.surprisePercent;
    }
    
    return {
      totalQuarters: surprises.length,
      beats,
      misses,
      meets,
      beatRate: surprises.length > 0 ? (beats / surprises.length) * 100 : 0,
      avgSurprise: surprises.length > 0 ? totalSurprise / surprises.length : 0,
      avgSurprisePercent: surprises.length > 0 ? totalSurprisePercent / surprises.length : 0
    };
  }

  /**
   * Get upcoming high-impact earnings (large cap companies)
   */
  async getHighImpactEarnings(days: number = 7): Promise<EarningsEvent[]> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    
    const allEvents = await this.getEarningsCalendar(today, endDate);
    
    // Filter for major companies (this is a simplified approach)
    // In production, you'd check market cap or use a predefined list
    const majorSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'BRK.B',
      'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'DIS', 'PYPL', 'NFLX',
      'ADBE', 'CRM', 'INTC', 'AMD', 'QCOM', 'TXN', 'AVGO', 'CSCO'
    ];
    
    return allEvents.filter(e => majorSymbols.includes(e.symbol));
  }

  /**
   * Get earnings calendar summary
   */
  async getCalendarSummary(): Promise<{
    todayCount: number;
    thisWeekCount: number;
    upcomingHighImpact: number;
    recentBeats: number;
    recentMisses: number;
  }> {
    const [todayEvents, weekEvents, highImpact] = await Promise.all([
      this.getTodaysEarnings(),
      this.getWeekEarnings(),
      this.getHighImpactEarnings()
    ]);
    
    const completedThisWeek = weekEvents.filter(e => e.status === 'completed');
    const beats = completedThisWeek.filter(e => 
      e.actualEPS !== null && e.estimatedEPS !== null && e.actualEPS > e.estimatedEPS
    ).length;
    const misses = completedThisWeek.filter(e => 
      e.actualEPS !== null && e.estimatedEPS !== null && e.actualEPS < e.estimatedEPS
    ).length;
    
    return {
      todayCount: todayEvents.length,
      thisWeekCount: weekEvents.length,
      upcomingHighImpact: highImpact.filter(e => e.status === 'upcoming').length,
      recentBeats: beats,
      recentMisses: misses
    };
  }
}

// Factory function
export function createEarningsCalendarService(): EarningsCalendarService {
  return new EarningsCalendarService();
}

// Export types
export type { EarningsEvent, CalendarAlert, WatchlistItem };
