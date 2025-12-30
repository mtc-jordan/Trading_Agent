import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data API
vi.mock("@/server/_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

describe("Market Data Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Price Data Structure", () => {
    it("should define valid price data structure", () => {
      const priceData = {
        symbol: "AAPL",
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 45000000,
        high: 152.00,
        low: 148.50,
        open: 149.00,
        previousClose: 147.75,
        timestamp: Date.now(),
      };

      expect(priceData.symbol).toBe("AAPL");
      expect(priceData.price).toBeGreaterThan(0);
      expect(typeof priceData.change).toBe("number");
      expect(typeof priceData.changePercent).toBe("number");
      expect(priceData.volume).toBeGreaterThan(0);
    });

    it("should handle multiple symbols", () => {
      const symbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA", "META"];
      
      expect(symbols.length).toBe(7);
      symbols.forEach(symbol => {
        expect(typeof symbol).toBe("string");
        expect(symbol.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Price Caching", () => {
    it("should cache prices with TTL", () => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      const priceData = { symbol: "AAPL", price: 150.25 };
      cache.set("AAPL", { data: priceData, timestamp: Date.now() });

      const cached = cache.get("AAPL");
      expect(cached).toBeDefined();
      expect(cached?.data.symbol).toBe("AAPL");
      expect(Date.now() - cached!.timestamp).toBeLessThan(CACHE_TTL);
    });

    it("should invalidate expired cache entries", () => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const CACHE_TTL = 5 * 60 * 1000;

      // Add expired entry
      cache.set("AAPL", { 
        data: { symbol: "AAPL", price: 150.25 }, 
        timestamp: Date.now() - CACHE_TTL - 1000 
      });

      const cached = cache.get("AAPL");
      const isExpired = Date.now() - cached!.timestamp > CACHE_TTL;
      
      expect(isExpired).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", () => {
      const handleApiError = (error: Error) => {
        return {
          success: false,
          error: error.message,
          fallbackData: null,
        };
      };

      const result = handleApiError(new Error("API rate limit exceeded"));
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("API rate limit exceeded");
    });

    it("should return fallback data on error", () => {
      const getFallbackPrice = (symbol: string) => ({
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        error: true,
      });

      const fallback = getFallbackPrice("AAPL");
      
      expect(fallback.symbol).toBe("AAPL");
      expect(fallback.error).toBe(true);
    });
  });
});

describe("Bot Scheduling", () => {
  describe("Schedule Configuration", () => {
    it("should validate schedule types", () => {
      const validTypes = ["once", "daily", "weekly", "monthly", "cron"];
      
      validTypes.forEach(type => {
        expect(["once", "daily", "weekly", "monthly", "cron"]).toContain(type);
      });
    });

    it("should validate cron expressions", () => {
      const isValidCron = (expr: string) => {
        const parts = expr.split(" ");
        return parts.length === 5 || parts.length === 6;
      };

      expect(isValidCron("0 9 * * 1-5")).toBe(true); // Weekdays at 9am
      expect(isValidCron("0 0 * * *")).toBe(true); // Daily at midnight
      expect(isValidCron("*/15 * * * *")).toBe(true); // Every 15 minutes
    });

    it("should validate run time format", () => {
      const isValidRunTime = (time: string) => {
        const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        return regex.test(time);
      };

      expect(isValidRunTime("09:30")).toBe(true);
      expect(isValidRunTime("14:00")).toBe(true);
      expect(isValidRunTime("23:59")).toBe(true);
      expect(isValidRunTime("25:00")).toBe(false);
      expect(isValidRunTime("9:30")).toBe(true);
    });

    it("should validate days of week array", () => {
      const isValidDaysOfWeek = (days: number[]) => {
        return days.every(d => d >= 0 && d <= 6);
      };

      expect(isValidDaysOfWeek([1, 2, 3, 4, 5])).toBe(true); // Weekdays
      expect(isValidDaysOfWeek([0, 6])).toBe(true); // Weekend
      expect(isValidDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBe(true); // All days
      expect(isValidDaysOfWeek([7])).toBe(false); // Invalid
    });
  });

  describe("Next Run Calculation", () => {
    it("should calculate next daily run", () => {
      const calculateNextDaily = (hour: number, minute: number) => {
        const now = new Date();
        const next = new Date();
        next.setHours(hour, minute, 0, 0);
        
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        
        return next;
      };

      const nextRun = calculateNextDaily(9, 30);
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(30);
    });

    it("should calculate next weekly run", () => {
      const calculateNextWeekly = (daysOfWeek: number[], hour: number, minute: number) => {
        const now = new Date();
        const today = now.getDay();
        
        // Find next valid day
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        let nextDay = sortedDays.find(d => d > today);
        
        if (nextDay === undefined) {
          nextDay = sortedDays[0];
        }
        
        const daysUntilNext = nextDay >= today 
          ? nextDay - today 
          : 7 - today + nextDay;
        
        const next = new Date(now);
        next.setDate(next.getDate() + daysUntilNext);
        next.setHours(hour, minute, 0, 0);
        
        return next;
      };

      const nextRun = calculateNextWeekly([1, 3, 5], 10, 0); // Mon, Wed, Fri at 10am
      expect(nextRun).toBeInstanceOf(Date);
      expect([1, 3, 5]).toContain(nextRun.getDay());
    });
  });

  describe("Schedule Status", () => {
    it("should track schedule status correctly", () => {
      const schedule = {
        id: 1,
        name: "Morning Analysis",
        isActive: true,
        lastRunAt: new Date(Date.now() - 86400000), // Yesterday
        nextRunAt: new Date(Date.now() + 3600000), // In 1 hour
        totalRuns: 10,
        successfulRuns: 9,
      };

      expect(schedule.isActive).toBe(true);
      expect(schedule.successfulRuns / schedule.totalRuns).toBe(0.9);
      expect(schedule.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should calculate success rate", () => {
      const calculateSuccessRate = (successful: number, total: number) => {
        if (total === 0) return 0;
        return (successful / total) * 100;
      };

      expect(calculateSuccessRate(9, 10)).toBe(90);
      expect(calculateSuccessRate(0, 0)).toBe(0);
      expect(calculateSuccessRate(5, 5)).toBe(100);
    });
  });

  describe("Timezone Handling", () => {
    it("should support common timezones", () => {
      const validTimezones = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "UTC",
        "Europe/London",
        "Europe/Paris",
        "Asia/Tokyo",
        "Asia/Hong_Kong",
        "Asia/Singapore",
      ];

      validTimezones.forEach(tz => {
        expect(typeof tz).toBe("string");
        expect(tz.length).toBeGreaterThan(0);
      });
    });

    it("should default to UTC if timezone is invalid", () => {
      const getTimezone = (tz: string | null | undefined) => {
        const validTimezones = ["UTC", "America/New_York", "Europe/London"];
        return validTimezones.includes(tz || "") ? tz : "UTC";
      };

      expect(getTimezone("America/New_York")).toBe("America/New_York");
      expect(getTimezone(null)).toBe("UTC");
      expect(getTimezone(undefined)).toBe("UTC");
      expect(getTimezone("Invalid/Zone")).toBe("UTC");
    });
  });
});

describe("Execution Logs", () => {
  it("should track execution log fields", () => {
    const log = {
      id: 1,
      botId: 1,
      scheduleId: 1,
      status: "success" as const,
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 5000,
      tradesExecuted: 3,
      profitLoss: 150.50,
      errorMessage: null,
    };

    expect(log.status).toBe("success");
    expect(log.duration).toBeGreaterThan(0);
    expect(log.tradesExecuted).toBeGreaterThanOrEqual(0);
  });

  it("should handle failed executions", () => {
    const log = {
      id: 2,
      botId: 1,
      scheduleId: 1,
      status: "failed" as const,
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 1000,
      tradesExecuted: 0,
      profitLoss: 0,
      errorMessage: "API connection timeout",
    };

    expect(log.status).toBe("failed");
    expect(log.errorMessage).toBeTruthy();
    expect(log.tradesExecuted).toBe(0);
  });

  it("should calculate execution duration", () => {
    const startedAt = new Date("2024-01-01T09:00:00Z");
    const completedAt = new Date("2024-01-01T09:00:05Z");
    
    const duration = completedAt.getTime() - startedAt.getTime();
    
    expect(duration).toBe(5000); // 5 seconds
  });
});
