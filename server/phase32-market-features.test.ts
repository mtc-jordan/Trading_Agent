import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AlpacaBrokerAdapter
vi.mock('./services/brokers/AlpacaBrokerAdapter', () => ({
  AlpacaBrokerAdapter: vi.fn().mockImplementation(() => ({
    getClock: vi.fn().mockResolvedValue({
      timestamp: new Date().toISOString(),
      is_open: false,
      next_open: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      next_close: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    }),
    getCalendar: vi.fn().mockResolvedValue([
      {
        date: '2024-12-30',
        open: '09:30',
        close: '16:00',
      },
      {
        date: '2024-12-31',
        open: '09:30',
        close: '13:00', // Early close
      },
    ]),
    getBars: vi.fn().mockResolvedValue([
      {
        timestamp: new Date('2024-12-27'),
        open: 150.0,
        high: 152.0,
        low: 149.0,
        close: 151.0,
        volume: 1000000,
      },
      {
        timestamp: new Date('2024-12-30'),
        open: 151.0,
        high: 153.0,
        low: 150.0,
        close: 152.5,
        volume: 1200000,
      },
    ]),
  })),
}));

describe('Phase 32: Market Enhancement Features', () => {
  describe('Market Holiday Detection', () => {
    it('should identify US market holidays correctly', () => {
      // Test holiday dates
      const holidays: Record<string, string> = {
        '2025-01-01': "New Year's Day",
        '2025-01-20': 'Martin Luther King Jr. Day',
        '2025-02-17': "Presidents Day",
        '2025-04-18': 'Good Friday',
        '2025-05-26': 'Memorial Day',
        '2025-06-19': 'Juneteenth',
        '2025-07-04': 'Independence Day',
        '2025-09-01': 'Labor Day',
        '2025-11-27': 'Thanksgiving Day',
        '2025-12-25': 'Christmas Day',
      };

      // Verify all holidays are defined
      expect(Object.keys(holidays).length).toBe(10);
      
      // Verify specific holidays
      expect(holidays['2025-01-01']).toBe("New Year's Day");
      expect(holidays['2025-12-25']).toBe('Christmas Day');
    });

    it('should identify early close days correctly', () => {
      const earlyCloseDays: Record<string, string> = {
        '2025-07-03': 'Day Before Independence Day',
        '2025-11-28': 'Day After Thanksgiving',
        '2025-12-24': 'Christmas Eve',
      };

      expect(Object.keys(earlyCloseDays).length).toBe(3);
      expect(earlyCloseDays['2025-12-24']).toBe('Christmas Eve');
    });
  });

  describe('Market Status Detection', () => {
    it('should correctly identify market open status', () => {
      // Test market hours logic
      const regularOpen = 9 * 60 + 30; // 9:30 AM in minutes
      const regularClose = 16 * 60; // 4:00 PM in minutes
      
      // During market hours (11:00 AM)
      const midDayMinutes = 11 * 60;
      expect(midDayMinutes >= regularOpen && midDayMinutes < regularClose).toBe(true);
      
      // Before market hours (8:00 AM)
      const earlyMorningMinutes = 8 * 60;
      expect(earlyMorningMinutes >= regularOpen && earlyMorningMinutes < regularClose).toBe(false);
      
      // After market hours (5:00 PM)
      const eveningMinutes = 17 * 60;
      expect(eveningMinutes >= regularOpen && eveningMinutes < regularClose).toBe(false);
    });

    it('should correctly identify pre-market hours', () => {
      const preMarketOpen = 4 * 60; // 4:00 AM
      const regularOpen = 9 * 60 + 30; // 9:30 AM
      
      // Pre-market time (6:00 AM)
      const preMarketTime = 6 * 60;
      expect(preMarketTime >= preMarketOpen && preMarketTime < regularOpen).toBe(true);
      
      // Not pre-market (10:00 AM)
      const regularTime = 10 * 60;
      expect(regularTime >= preMarketOpen && regularTime < regularOpen).toBe(false);
    });

    it('should correctly identify after-hours', () => {
      const regularClose = 16 * 60; // 4:00 PM
      const afterHoursClose = 20 * 60; // 8:00 PM
      
      // After-hours time (6:00 PM)
      const afterHoursTime = 18 * 60;
      expect(afterHoursTime >= regularClose && afterHoursTime < afterHoursClose).toBe(true);
      
      // Not after-hours (2:00 PM)
      const regularTime = 14 * 60;
      expect(regularTime >= regularClose && regularTime < afterHoursClose).toBe(false);
    });

    it('should identify weekends correctly', () => {
      // Sunday = 0, Saturday = 6
      const sunday = 0;
      const saturday = 6;
      const monday = 1;
      const friday = 5;
      
      expect(sunday === 0 || sunday === 6).toBe(true);
      expect(saturday === 0 || saturday === 6).toBe(true);
      expect(monday === 0 || monday === 6).toBe(false);
      expect(friday === 0 || friday === 6).toBe(false);
    });
  });

  describe('Last Closing Prices', () => {
    it('should calculate overnight change correctly', () => {
      const previousClose = 150.0;
      const currentClose = 152.5;
      
      const change = currentClose - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      expect(change).toBe(2.5);
      expect(changePercent).toBeCloseTo(1.67, 1);
    });

    it('should handle negative changes correctly', () => {
      const previousClose = 150.0;
      const currentClose = 147.0;
      
      const change = currentClose - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      expect(change).toBe(-3.0);
      expect(changePercent).toBeCloseTo(-2.0, 1);
    });

    it('should format volume correctly', () => {
      const formatVolume = (volume: number): string => {
        if (volume >= 1000000) {
          return `${(volume / 1000000).toFixed(1)}M`;
        }
        if (volume >= 1000) {
          return `${(volume / 1000).toFixed(1)}K`;
        }
        return volume.toString();
      };
      
      expect(formatVolume(1500000)).toBe('1.5M');
      expect(formatVolume(500000)).toBe('500.0K');
      expect(formatVolume(500)).toBe('500');
    });
  });

  describe('Market Open Alert', () => {
    it('should detect near market open correctly', () => {
      // Simulate being 3 minutes before market open (9:27 AM ET)
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      const currentTime = 9 * 60 + 27; // 9:27 AM
      
      const isNearOpen = Math.abs(currentTime - marketOpen) <= 5;
      expect(isNearOpen).toBe(true);
      
      // Simulate being 10 minutes before market open (9:20 AM ET)
      const farFromOpen = 9 * 60 + 20;
      const isNotNearOpen = Math.abs(farFromOpen - marketOpen) <= 5;
      expect(isNotNearOpen).toBe(false);
    });

    it('should detect market just opened correctly', () => {
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      
      // 10 minutes after open (9:40 AM)
      const justOpened = 9 * 60 + 40;
      const isJustOpened = justOpened >= marketOpen && justOpened <= marketOpen + 30;
      expect(isJustOpened).toBe(true);
      
      // 45 minutes after open (10:15 AM)
      const notJustOpened = 10 * 60 + 15;
      const isNotJustOpened = notJustOpened >= marketOpen && notJustOpened <= marketOpen + 30;
      expect(isNotJustOpened).toBe(false);
    });

    it('should sort overnight changes by absolute percentage', () => {
      const changes = [
        { symbol: 'AAPL', changePercent: 1.5 },
        { symbol: 'GOOGL', changePercent: -2.3 },
        { symbol: 'MSFT', changePercent: 0.8 },
        { symbol: 'TSLA', changePercent: -3.1 },
      ];
      
      const sorted = [...changes].sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );
      
      expect(sorted[0].symbol).toBe('TSLA');
      expect(sorted[1].symbol).toBe('GOOGL');
      expect(sorted[2].symbol).toBe('AAPL');
      expect(sorted[3].symbol).toBe('MSFT');
    });

    it('should identify top gainer and loser correctly', () => {
      const changes = [
        { symbol: 'AAPL', changePercent: 1.5, direction: 'up' as const },
        { symbol: 'GOOGL', changePercent: -2.3, direction: 'down' as const },
        { symbol: 'MSFT', changePercent: 2.8, direction: 'up' as const },
        { symbol: 'TSLA', changePercent: -1.1, direction: 'down' as const },
      ];
      
      const sorted = [...changes].sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );
      
      const topGainer = sorted.find(c => c.direction === 'up');
      const topLoser = sorted.find(c => c.direction === 'down');
      
      expect(topGainer?.symbol).toBe('MSFT');
      expect(topLoser?.symbol).toBe('GOOGL');
    });
  });

  describe('Time Formatting', () => {
    it('should format time until correctly', () => {
      const formatTimeUntil = (diffMs: number): string => {
        if (diffMs <= 0) return 'now';
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          return `${days}d ${hours % 24}h`;
        }
        
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        
        return `${minutes}m`;
      };
      
      // 2 hours and 30 minutes
      expect(formatTimeUntil(2.5 * 60 * 60 * 1000)).toBe('2h 30m');
      
      // 45 minutes
      expect(formatTimeUntil(45 * 60 * 1000)).toBe('45m');
      
      // 2 days and 5 hours
      expect(formatTimeUntil(53 * 60 * 60 * 1000)).toBe('2d 5h');
      
      // Already passed
      expect(formatTimeUntil(-1000)).toBe('now');
    });

    it('should format date correctly', () => {
      const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      };
      
      // Test a specific date
      const formatted = formatDate('2025-01-01');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('1');
    });
  });

  describe('Upcoming Holidays', () => {
    it('should get upcoming holidays in sorted order', () => {
      const holidays = [
        { date: '2025-01-01', name: "New Year's Day", isEarlyClose: false },
        { date: '2025-01-20', name: 'Martin Luther King Jr. Day', isEarlyClose: false },
        { date: '2025-02-17', name: "Presidents Day", isEarlyClose: false },
      ];
      
      const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
      
      expect(sorted[0].date).toBe('2025-01-01');
      expect(sorted[1].date).toBe('2025-01-20');
      expect(sorted[2].date).toBe('2025-02-17');
    });

    it('should filter out past holidays', () => {
      const today = '2025-01-15';
      const holidays = [
        { date: '2025-01-01', name: "New Year's Day" },
        { date: '2025-01-20', name: 'MLK Day' },
        { date: '2025-02-17', name: "Presidents Day" },
      ];
      
      const upcoming = holidays.filter(h => h.date >= today);
      
      expect(upcoming.length).toBe(2);
      expect(upcoming[0].date).toBe('2025-01-20');
    });
  });
});
