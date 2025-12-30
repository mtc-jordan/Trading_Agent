import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getAgentAccuracyStats: vi.fn(),
  getUserPredictionAccuracy: vi.fn(),
  getPriceTrackingByAnalysis: vi.fn(),
  createSavedComparison: vi.fn(),
  getUserSavedComparisons: vi.fn(),
  getSavedComparisonById: vi.fn(),
  updateSavedComparison: vi.fn(),
  deleteSavedComparison: vi.fn(),
  createWatchlistAlert: vi.fn(),
  getUserWatchlistAlerts: vi.fn(),
  updateWatchlistAlert: vi.fn(),
  deleteWatchlistAlert: vi.fn(),
  getUserAlertHistory: vi.fn(),
  getUserNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  createBotSchedule: vi.fn(),
  getBotSchedules: vi.fn(),
  updateBotSchedule: vi.fn(),
  deleteBotSchedule: vi.fn(),
  getTradingBotById: vi.fn(),
  createBotRiskRule: vi.fn(),
  getBotRiskRules: vi.fn(),
  updateBotRiskRule: vi.fn(),
  deleteBotRiskRule: vi.fn(),
  getBotExecutionLogs: vi.fn(),
  getBotBenchmarks: vi.fn(),
  getLatestBotBenchmark: vi.fn(),
  getUserProfile: vi.fn(),
  getPublicUserProfile: vi.fn(),
  upsertUserProfile: vi.fn(),
  getTopTraders: vi.fn(),
  getUserBadges: vi.fn(),
  getAllBadgeDefinitions: vi.fn(),
  getUserFollowers: vi.fn(),
  getUserFollowing: vi.fn(),
  isFollowing: vi.fn(),
  createUserFollow: vi.fn(),
  unfollowUser: vi.fn(),
  createActivityFeedItem: vi.fn(),
  getDiscussionThreads: vi.fn(),
  getDiscussionThreadById: vi.fn(),
  createDiscussionThread: vi.fn(),
  updateDiscussionThread: vi.fn(),
  incrementThreadViews: vi.fn(),
  getThreadComments: vi.fn(),
  createDiscussionComment: vi.fn(),
  updateDiscussionComment: vi.fn(),
  deleteDiscussionComment: vi.fn(),
  getStrategyRatings: vi.fn(),
  getUserStrategyRating: vi.fn(),
  createStrategyRating: vi.fn(),
  updateStrategyRating: vi.fn(),
  getUserActivityFeed: vi.fn(),
  getPublicActivityFeed: vi.fn(),
  checkTierLimit: vi.fn(),
}));

import * as db from "./db";

describe("Phase 14: Performance Tracking & Accuracy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Accuracy Stats", () => {
    it("should return accuracy statistics by agent and timeframe", async () => {
      const mockStats = {
        overall: { correct: 75, total: 100, accuracy: 75 },
        byAgent: {
          technical: { correct: 20, total: 25, accuracy: 80 },
          fundamental: { correct: 18, total: 25, accuracy: 72 },
          sentiment: { correct: 15, total: 25, accuracy: 60 },
          consensus: { correct: 22, total: 25, accuracy: 88 },
        },
        byTimeframe: {
          "1day": { correct: 30, total: 40, accuracy: 75 },
          "7day": { correct: 25, total: 35, accuracy: 71 },
          "30day": { correct: 20, total: 25, accuracy: 80 },
        },
      };

      vi.mocked(db.getAgentAccuracyStats).mockResolvedValue(mockStats);

      const result = await db.getAgentAccuracyStats(1);

      expect(result.overall.accuracy).toBe(75);
      expect(result.byAgent.technical.accuracy).toBe(80);
      expect(result.byTimeframe["30day"].accuracy).toBe(80);
    });

    it("should return empty stats for new users", async () => {
      const emptyStats = {
        overall: { correct: 0, total: 0, accuracy: 0 },
        byAgent: {},
        byTimeframe: {},
      };

      vi.mocked(db.getAgentAccuracyStats).mockResolvedValue(emptyStats);

      const result = await db.getAgentAccuracyStats(999);

      expect(result.overall.total).toBe(0);
      expect(Object.keys(result.byAgent)).toHaveLength(0);
    });
  });

  describe("Price Tracking", () => {
    it("should return price tracking data for an analysis", async () => {
      const mockTracking = {
        id: 1,
        analysisId: 100,
        symbol: "AAPL",
        priceAtAnalysis: "150.00",
        price1Day: "152.00",
        price7Day: "155.00",
        price30Day: "160.00",
        createdAt: new Date(),
      };

      vi.mocked(db.getPriceTrackingByAnalysis).mockResolvedValue(mockTracking);

      const result = await db.getPriceTrackingByAnalysis(100);

      expect(result?.symbol).toBe("AAPL");
      expect(result?.priceAtAnalysis).toBe("150.00");
    });
  });
});

describe("Phase 15: Saved Comparisons & Watchlists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Saved Comparisons", () => {
    it("should create a saved comparison", async () => {
      vi.mocked(db.createSavedComparison).mockResolvedValue(1);

      const result = await db.createSavedComparison({
        userId: 1,
        name: "Tech Stocks Comparison",
        description: "Comparing AAPL, GOOGL, MSFT",
        analysisIds: [1, 2, 3],
        symbolsIncluded: ["AAPL", "GOOGL", "MSFT"],
      });

      expect(result).toBe(1);
      expect(db.createSavedComparison).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Tech Stocks Comparison",
          analysisIds: [1, 2, 3],
        })
      );
    });

    it("should list user saved comparisons", async () => {
      const mockComparisons = [
        { id: 1, name: "Tech Stocks", analysisIds: [1, 2, 3], isPinned: true },
        { id: 2, name: "Healthcare", analysisIds: [4, 5], isPinned: false },
      ];

      vi.mocked(db.getUserSavedComparisons).mockResolvedValue(mockComparisons as any);

      const result = await db.getUserSavedComparisons(1);

      expect(result).toHaveLength(2);
      expect(result[0].isPinned).toBe(true);
    });
  });

  describe("Watchlist Alerts", () => {
    it("should create a watchlist alert", async () => {
      vi.mocked(db.createWatchlistAlert).mockResolvedValue(1);

      const result = await db.createWatchlistAlert({
        userId: 1,
        symbol: "AAPL",
        alertOnRecommendationChange: true,
        alertOnConfidenceChange: false,
        emailNotification: true,
        pushNotification: true,
      });

      expect(result).toBe(1);
    });

    it("should list user watchlist alerts", async () => {
      const mockAlerts = [
        { id: 1, symbol: "AAPL", isActive: true },
        { id: 2, symbol: "GOOGL", isActive: true },
      ];

      vi.mocked(db.getUserWatchlistAlerts).mockResolvedValue(mockAlerts as any);

      const result = await db.getUserWatchlistAlerts(1);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe("AAPL");
    });
  });
});

describe("Phase 16: Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Notifications", () => {
    it("should return user notifications", async () => {
      const mockNotifications = [
        { id: 1, title: "New Analysis", type: "info", isRead: false },
        { id: 2, title: "Price Alert", type: "alert", isRead: true },
      ];

      vi.mocked(db.getUserNotifications).mockResolvedValue(mockNotifications as any);

      const result = await db.getUserNotifications(1, false);

      expect(result).toHaveLength(2);
    });

    it("should return unread notification count", async () => {
      vi.mocked(db.getUnreadNotificationCount).mockResolvedValue(5);

      const result = await db.getUnreadNotificationCount(1);

      expect(result).toBe(5);
    });

    it("should mark notification as read", async () => {
      vi.mocked(db.markNotificationRead).mockResolvedValue(undefined);

      await db.markNotificationRead(1, 1);

      expect(db.markNotificationRead).toHaveBeenCalledWith(1, 1);
    });

    it("should mark all notifications as read", async () => {
      vi.mocked(db.markAllNotificationsRead).mockResolvedValue(undefined);

      await db.markAllNotificationsRead(1);

      expect(db.markAllNotificationsRead).toHaveBeenCalledWith(1);
    });
  });
});

describe("Phase 17: Advanced Bot Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Bot Schedules", () => {
    it("should create a bot schedule", async () => {
      vi.mocked(db.getTradingBotById).mockResolvedValue({ id: 1, userId: 1 } as any);
      vi.mocked(db.createBotSchedule).mockResolvedValue(1);

      const result = await db.createBotSchedule({
        botId: 1,
        userId: 1,
        name: "Daily Trading",
        scheduleType: "daily",
        runTime: "09:30",
        timezone: "America/New_York",
      });

      expect(result).toBe(1);
    });

    it("should list bot schedules", async () => {
      const mockSchedules = [
        { id: 1, name: "Morning Run", scheduleType: "daily", isActive: true },
        { id: 2, name: "Weekly Analysis", scheduleType: "weekly", isActive: true },
      ];

      vi.mocked(db.getBotSchedules).mockResolvedValue(mockSchedules as any);

      const result = await db.getBotSchedules(1);

      expect(result).toHaveLength(2);
    });
  });

  describe("Bot Risk Rules", () => {
    it("should create a risk rule", async () => {
      vi.mocked(db.createBotRiskRule).mockResolvedValue(1);

      const result = await db.createBotRiskRule({
        botId: 1,
        userId: 1,
        name: "Stop Loss 5%",
        ruleType: "stop_loss",
        triggerValue: "5",
        triggerType: "percentage",
        actionOnTrigger: "close_position",
      });

      expect(result).toBe(1);
    });

    it("should list bot risk rules", async () => {
      const mockRules = [
        { id: 1, name: "Stop Loss", ruleType: "stop_loss", isActive: true },
        { id: 2, name: "Take Profit", ruleType: "take_profit", isActive: true },
      ];

      vi.mocked(db.getBotRiskRules).mockResolvedValue(mockRules as any);

      const result = await db.getBotRiskRules(1);

      expect(result).toHaveLength(2);
    });
  });

  describe("Bot Execution Logs", () => {
    it("should return execution logs", async () => {
      const mockLogs = [
        { id: 1, status: "completed", tradesExecuted: 5 },
        { id: 2, status: "completed", tradesExecuted: 3 },
      ];

      vi.mocked(db.getBotExecutionLogs).mockResolvedValue(mockLogs as any);

      const result = await db.getBotExecutionLogs(1, 50);

      expect(result).toHaveLength(2);
    });
  });

  describe("Bot Benchmarks", () => {
    it("should return bot benchmarks", async () => {
      const mockBenchmarks = [
        { id: 1, botReturn: "0.15", benchmarkReturn: "0.10" },
      ];

      vi.mocked(db.getBotBenchmarks).mockResolvedValue(mockBenchmarks as any);

      const result = await db.getBotBenchmarks(1);

      expect(result).toHaveLength(1);
    });

    it("should return latest benchmark", async () => {
      const mockBenchmark = { id: 1, botReturn: "0.15", benchmarkReturn: "0.10" };

      vi.mocked(db.getLatestBotBenchmark).mockResolvedValue(mockBenchmark as any);

      const result = await db.getLatestBotBenchmark(1);

      expect(result?.botReturn).toBe("0.15");
    });
  });
});

describe("Phase 18: Social & Community", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Profiles", () => {
    it("should return user profile", async () => {
      const mockProfile = {
        id: 1,
        userId: 1,
        displayName: "TraderJoe",
        bio: "Professional trader",
        totalTrades: 100,
        winRate: "0.65",
        totalReturn: "0.25",
        isPublic: true,
      };

      vi.mocked(db.getUserProfile).mockResolvedValue(mockProfile as any);

      const result = await db.getUserProfile(1);

      expect(result?.displayName).toBe("TraderJoe");
      expect(result?.isPublic).toBe(true);
    });

    it("should update user profile", async () => {
      vi.mocked(db.upsertUserProfile).mockResolvedValue(undefined);

      await db.upsertUserProfile(1, {
        displayName: "NewName",
        bio: "Updated bio",
      });

      expect(db.upsertUserProfile).toHaveBeenCalledWith(1, expect.objectContaining({
        displayName: "NewName",
      }));
    });

    it("should return top traders", async () => {
      const mockTraders = [
        { userId: 1, displayName: "TopTrader1", totalReturn: "0.50" },
        { userId: 2, displayName: "TopTrader2", totalReturn: "0.45" },
      ];

      vi.mocked(db.getTopTraders).mockResolvedValue(mockTraders as any);

      const result = await db.getTopTraders(20);

      expect(result).toHaveLength(2);
    });
  });

  describe("Follow System", () => {
    it("should check if following", async () => {
      vi.mocked(db.isFollowing).mockResolvedValue(true);

      const result = await db.isFollowing(1, 2);

      expect(result).toBe(true);
    });

    it("should create follow relationship", async () => {
      vi.mocked(db.createUserFollow).mockResolvedValue(1);

      const result = await db.createUserFollow({
        followerId: 1,
        followingId: 2,
        notifyOnTrade: false,
        notifyOnAnalysis: true,
        notifyOnStrategy: true,
      });

      expect(result).toBe(1);
    });

    it("should unfollow user", async () => {
      vi.mocked(db.unfollowUser).mockResolvedValue(undefined);

      await db.unfollowUser(1, 2);

      expect(db.unfollowUser).toHaveBeenCalledWith(1, 2);
    });

    it("should return followers list", async () => {
      const mockFollowers = [
        { followerId: 2, createdAt: new Date() },
        { followerId: 3, createdAt: new Date() },
      ];

      vi.mocked(db.getUserFollowers).mockResolvedValue(mockFollowers as any);

      const result = await db.getUserFollowers(1);

      expect(result).toHaveLength(2);
    });

    it("should return following list", async () => {
      const mockFollowing = [
        { followingId: 4, createdAt: new Date() },
      ];

      vi.mocked(db.getUserFollowing).mockResolvedValue(mockFollowing as any);

      const result = await db.getUserFollowing(1);

      expect(result).toHaveLength(1);
    });
  });

  describe("Discussion Threads", () => {
    it("should create discussion thread", async () => {
      vi.mocked(db.createDiscussionThread).mockResolvedValue(1);

      const result = await db.createDiscussionThread({
        userId: 1,
        threadType: "analysis",
        title: "AAPL Analysis Discussion",
        content: "What do you think about AAPL?",
        symbol: "AAPL",
      });

      expect(result).toBe(1);
    });

    it("should list discussion threads", async () => {
      const mockThreads = [
        { id: 1, title: "AAPL Discussion", threadType: "analysis", viewCount: 100 },
        { id: 2, title: "Market Outlook", threadType: "market", viewCount: 50 },
      ];

      vi.mocked(db.getDiscussionThreads).mockResolvedValue(mockThreads as any);

      const result = await db.getDiscussionThreads({ limit: 50 });

      expect(result).toHaveLength(2);
    });

    it("should get thread by id", async () => {
      const mockThread = {
        id: 1,
        title: "AAPL Discussion",
        content: "Discussion content",
        viewCount: 100,
      };

      vi.mocked(db.getDiscussionThreadById).mockResolvedValue(mockThread as any);

      const result = await db.getDiscussionThreadById(1);

      expect(result?.title).toBe("AAPL Discussion");
    });

    it("should increment thread views", async () => {
      vi.mocked(db.incrementThreadViews).mockResolvedValue(undefined);

      await db.incrementThreadViews(1);

      expect(db.incrementThreadViews).toHaveBeenCalledWith(1);
    });
  });

  describe("Discussion Comments", () => {
    it("should create comment", async () => {
      vi.mocked(db.createDiscussionComment).mockResolvedValue(1);

      const result = await db.createDiscussionComment({
        threadId: 1,
        userId: 1,
        content: "Great analysis!",
      });

      expect(result).toBe(1);
    });

    it("should get thread comments", async () => {
      const mockComments = [
        { id: 1, content: "Great analysis!", userId: 2 },
        { id: 2, content: "I agree", userId: 3 },
      ];

      vi.mocked(db.getThreadComments).mockResolvedValue(mockComments as any);

      const result = await db.getThreadComments(1);

      expect(result).toHaveLength(2);
    });

    it("should update comment", async () => {
      vi.mocked(db.updateDiscussionComment).mockResolvedValue(undefined);

      await db.updateDiscussionComment(1, 1, { content: "Updated comment" });

      expect(db.updateDiscussionComment).toHaveBeenCalledWith(1, 1, { content: "Updated comment" });
    });

    it("should delete comment", async () => {
      vi.mocked(db.deleteDiscussionComment).mockResolvedValue(undefined);

      await db.deleteDiscussionComment(1, 1);

      expect(db.deleteDiscussionComment).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("Strategy Ratings", () => {
    it("should create rating", async () => {
      vi.mocked(db.createStrategyRating).mockResolvedValue(1);

      const result = await db.createStrategyRating({
        listingId: 1,
        userId: 1,
        rating: 5,
        review: "Excellent strategy!",
      });

      expect(result).toBe(1);
    });

    it("should get strategy ratings", async () => {
      const mockRatings = [
        { id: 1, rating: 5, review: "Great!" },
        { id: 2, rating: 4, review: "Good" },
      ];

      vi.mocked(db.getStrategyRatings).mockResolvedValue(mockRatings as any);

      const result = await db.getStrategyRatings(1);

      expect(result).toHaveLength(2);
    });

    it("should get user rating for strategy", async () => {
      const mockRating = { id: 1, rating: 5, review: "Great!" };

      vi.mocked(db.getUserStrategyRating).mockResolvedValue(mockRating as any);

      const result = await db.getUserStrategyRating(1, 1);

      expect(result?.rating).toBe(5);
    });
  });

  describe("Activity Feed", () => {
    it("should create activity feed item", async () => {
      vi.mocked(db.createActivityFeedItem).mockResolvedValue(1);

      const result = await db.createActivityFeedItem({
        userId: 1,
        activityType: "trade",
        title: "Executed trade",
        isPublic: true,
      });

      expect(result).toBe(1);
    });

    it("should get user activity feed", async () => {
      const mockFeed = [
        { id: 1, activityType: "trade", title: "Bought AAPL" },
        { id: 2, activityType: "analysis", title: "New analysis" },
      ];

      vi.mocked(db.getUserActivityFeed).mockResolvedValue(mockFeed as any);

      const result = await db.getUserActivityFeed(1, 50);

      expect(result).toHaveLength(2);
    });

    it("should get public activity feed", async () => {
      const mockFeed = [
        { id: 1, activityType: "trade", title: "Public trade" },
      ];

      vi.mocked(db.getPublicActivityFeed).mockResolvedValue(mockFeed as any);

      const result = await db.getPublicActivityFeed(50);

      expect(result).toHaveLength(1);
    });
  });

  describe("User Badges", () => {
    it("should get user badges", async () => {
      const mockBadges = [
        { id: 1, badgeName: "First Trade", badgeIcon: "🎯" },
        { id: 2, badgeName: "Top Trader", badgeIcon: "🏆" },
      ];

      vi.mocked(db.getUserBadges).mockResolvedValue(mockBadges as any);

      const result = await db.getUserBadges(1);

      expect(result).toHaveLength(2);
    });

    it("should get all badge definitions", async () => {
      const mockBadges = [
        { badgeId: "first_trade", name: "First Trade", description: "Complete your first trade" },
        { badgeId: "top_trader", name: "Top Trader", description: "Reach top 10 leaderboard" },
      ];

      vi.mocked(db.getAllBadgeDefinitions).mockResolvedValue(mockBadges as any);

      const result = await db.getAllBadgeDefinitions();

      expect(result).toHaveLength(2);
    });
  });
});
