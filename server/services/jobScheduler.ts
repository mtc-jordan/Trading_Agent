import { getDb } from "../db";
import { 
  backgroundJobs, 
  jobHistory, 
  botSchedules, 
  botExecutionLogs,
  performanceReports,
  predictionAccuracy,
  priceTracking,
  tradingBots,
  users,
  agentAnalyses
} from "../../drizzle/schema";
import { eq, and, lte, gte, desc, sql } from "drizzle-orm";
import { emailService } from "./emailService";

type JobType = "bot_execution" | "price_tracking" | "accuracy_calculation" | "weekly_report" | "monthly_report" | "watchlist_check" | "email_send" | "cleanup";

interface JobPayload {
  botId?: number;
  userId?: number;
  scheduleId?: number;
  symbols?: string[];
  reportType?: "weekly" | "monthly";
  [key: string]: unknown;
}

interface JobResult {
  success: boolean;
  message?: string;
  data?: unknown;
  itemsProcessed?: number;
}

// Job processor functions
const jobProcessors: Record<JobType, (payload: JobPayload) => Promise<JobResult>> = {
  bot_execution: async (payload) => {
    const db = await getDb();
    if (!db) return { success: false, message: "Database not available" };

    const { botId, userId, scheduleId } = payload;
    if (!botId || !userId) {
      return { success: false, message: "Missing botId or userId" };
    }

    // Get bot configuration
    const [bot] = await db
      .select()
      .from(tradingBots)
      .where(eq(tradingBots.id, botId));

    if (!bot) {
      return { success: false, message: "Bot not found" };
    }

    // Log execution start
    const [logEntry] = await db
      .insert(botExecutionLogs)
      .values({
        botId,
        userId,
        scheduleId: scheduleId || null,
        executionType: scheduleId ? "scheduled" : "manual",
        status: "running",
        startedAt: new Date(),
      })
      .$returningId();

    try {
      // Simulate bot execution (in production, this would run the actual trading logic)
      const executionResult = await executeBotLogic(bot);

      // Update log with results
      await db
        .update(botExecutionLogs)
        .set({
          status: "completed",
          completedAt: new Date(),
          tradesExecuted: executionResult.tradesExecuted,
          pnlResult: String(executionResult.profitLoss),
          analysisResults: executionResult.details,
        })
        .where(eq(botExecutionLogs.id, logEntry.id));

      // Get user for email notification
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user?.email) {
        await emailService.sendBotExecutionComplete({
          userId,
          userEmail: user.email,
          botName: bot.name,
          executionTime: new Date().toISOString(),
          tradesExecuted: executionResult.tradesExecuted,
          profitLoss: `$${executionResult.profitLoss.toFixed(2)}`,
          status: "completed",
          dashboardUrl: "/dashboard/bots",
        });
      }

      return {
        success: true,
        message: `Bot ${bot.name} executed successfully`,
        data: executionResult,
        itemsProcessed: executionResult.tradesExecuted,
      };
    } catch (error) {
      // Update log with error
      await db
        .update(botExecutionLogs)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(botExecutionLogs.id, logEntry.id));

      // Get user for error notification
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user?.email) {
        await emailService.sendBotExecutionError({
          userId,
          userEmail: user.email,
          botName: bot.name,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          errorTime: new Date().toISOString(),
          dashboardUrl: "/dashboard/bots",
        });
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Bot execution failed",
      };
    }
  },

  price_tracking: async (_payload) => {
    // Use the comprehensive price tracking service
    const { runPriceTrackingJob } = await import('./priceTrackingService');
    const result = await runPriceTrackingJob();
    
    return {
      success: result.success,
      message: result.details.join('; '),
      itemsProcessed: result.tracked,
    };
  },

  accuracy_calculation: async (_payload) => {
    // Use the comprehensive price tracking service for accuracy calculation
    const { calculatePredictionAccuracy } = await import('./priceTrackingService');
    const result = await calculatePredictionAccuracy();
    
    return {
      success: result.success,
      message: result.details.join('; '),
      itemsProcessed: result.tracked,
    };
  },

  weekly_report: async (payload) => {
    const db = await getDb();
    if (!db) return { success: false, message: "Database not available" };

    const { userId } = payload;
    if (!userId) {
      return { success: false, message: "Missing userId" };
    }

    // Calculate weekly metrics
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Generate report (simplified - in production would calculate real metrics)
    const report = {
      totalTrades: Math.floor(Math.random() * 50),
      winRate: 0.5 + Math.random() * 0.3,
      netProfitLoss: (Math.random() - 0.5) * 10000,
      percentReturn: (Math.random() - 0.5) * 20,
      totalPredictions: Math.floor(Math.random() * 100),
      predictionAccuracy: 0.6 + Math.random() * 0.3,
    };

    // Save report
    const [reportEntry] = await db
      .insert(performanceReports)
      .values({
        userId,
        reportType: "weekly",
        periodStart: weekAgo,
        periodEnd: new Date(),
        totalTrades: report.totalTrades,
        winningTrades: Math.floor(report.totalTrades * report.winRate),
        losingTrades: Math.floor(report.totalTrades * (1 - report.winRate)),
        winRate: String(report.winRate),
        totalProfitLoss: String(report.netProfitLoss),
        percentageReturn: String(report.percentReturn),
        totalPredictions: report.totalPredictions,
        correctPredictions: Math.floor(report.totalPredictions * report.predictionAccuracy),
        predictionAccuracy: String(report.predictionAccuracy),
      })
      .$returningId();

    // Send email if user has email
    if (user.email) {
      await emailService.queueEmail({
        userId,
        toEmail: user.email,
        templateKey: "weekly_report",
        variables: {
          weekRange: `${weekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
          totalTrades: report.totalTrades,
          winRate: (report.winRate * 100).toFixed(1),
          netProfitLoss: `$${report.netProfitLoss.toFixed(2)}`,
          percentReturn: report.percentReturn.toFixed(2),
          totalPredictions: report.totalPredictions,
          predictionAccuracy: (report.predictionAccuracy * 100).toFixed(1),
          reportUrl: `/reports/${reportEntry.id}`,
        },
      });
    }

    return {
      success: true,
      message: "Weekly report generated",
      data: { reportId: reportEntry.id },
      itemsProcessed: 1,
    };
  },

  monthly_report: async (payload) => {
    const db = await getDb();
    if (!db) return { success: false, message: "Database not available" };

    const { userId } = payload;
    if (!userId) {
      return { success: false, message: "Missing userId" };
    }

    // Similar to weekly report but for monthly period
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const report = {
      totalTrades: Math.floor(Math.random() * 200),
      winRate: 0.5 + Math.random() * 0.3,
      netProfitLoss: (Math.random() - 0.5) * 50000,
      percentReturn: (Math.random() - 0.5) * 50,
      totalPredictions: Math.floor(Math.random() * 400),
      predictionAccuracy: 0.6 + Math.random() * 0.3,
      benchmarkReturn: (Math.random() - 0.5) * 10,
    };

    const [reportEntry] = await db
      .insert(performanceReports)
      .values({
        userId,
        reportType: "monthly",
        periodStart: monthAgo,
        periodEnd: new Date(),
        totalTrades: report.totalTrades,
        winningTrades: Math.floor(report.totalTrades * report.winRate),
        losingTrades: Math.floor(report.totalTrades * (1 - report.winRate)),
        winRate: String(report.winRate),
        totalProfitLoss: String(report.netProfitLoss),
        percentageReturn: String(report.percentReturn),
        totalPredictions: report.totalPredictions,
        correctPredictions: Math.floor(report.totalPredictions * report.predictionAccuracy),
        predictionAccuracy: String(report.predictionAccuracy),
        benchmarkReturn: String(report.benchmarkReturn),
        alphaGenerated: String(report.percentReturn - report.benchmarkReturn),
      })
      .$returningId();

    if (user.email) {
      await emailService.queueEmail({
        userId,
        toEmail: user.email,
        templateKey: "monthly_report",
        variables: {
          monthYear: monthAgo.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          totalTrades: report.totalTrades,
          winRate: (report.winRate * 100).toFixed(1),
          netProfitLoss: `$${report.netProfitLoss.toFixed(2)}`,
          percentReturn: report.percentReturn.toFixed(2),
          benchmarkComparison: `${report.percentReturn > report.benchmarkReturn ? "+" : ""}${(report.percentReturn - report.benchmarkReturn).toFixed(2)}%`,
          totalPredictions: report.totalPredictions,
          predictionAccuracy: (report.predictionAccuracy * 100).toFixed(1),
          bestAgent: "Technical Analyst",
          reportUrl: `/reports/${reportEntry.id}`,
        },
      });
    }

    return {
      success: true,
      message: "Monthly report generated",
      data: { reportId: reportEntry.id },
      itemsProcessed: 1,
    };
  },

  watchlist_check: async (payload) => {
    // Check watchlist alerts and trigger notifications
    return { success: true, message: "Watchlist check completed", itemsProcessed: 0 };
  },

  email_send: async () => {
    // Process email queue
    const results = await emailService.processEmailQueue(10);
    return {
      success: true,
      message: `Processed ${results.length} emails`,
      itemsProcessed: results.length,
    };
  },

  cleanup: async () => {
    const db = await getDb();
    if (!db) return { success: false, message: "Database not available" };

    // Clean up old job history (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await db
      .delete(jobHistory)
      .where(lte(jobHistory.createdAt, thirtyDaysAgo));

    return { success: true, message: "Cleanup completed", itemsProcessed: 1 };
  },
};

// Simulate bot execution logic
async function executeBotLogic(bot: typeof tradingBots.$inferSelect): Promise<{
  tradesExecuted: number;
  profitLoss: number;
  details: Record<string, unknown>;
}> {
  // In production, this would:
  // 1. Get current market data
  // 2. Run the bot's strategy
  // 3. Execute trades based on signals
  // 4. Calculate P/L

  // Simulated execution
  const tradesExecuted = Math.floor(Math.random() * 5);
  const profitLoss = (Math.random() - 0.5) * 1000;

  return {
    tradesExecuted,
    profitLoss,
    details: {
      strategy: bot.strategy,
      symbols: bot.symbols,
      executedAt: new Date().toISOString(),
    },
  };
}

// Job Scheduler Service
export class JobScheduler {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private workerId: string;

  constructor() {
    this.workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start the job scheduler
  start(intervalMs: number = 10000) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[JobScheduler] Starting with worker ID: ${this.workerId}`);

    this.pollInterval = setInterval(() => {
      this.processJobs();
    }, intervalMs);

    // Process immediately on start
    this.processJobs();
  }

  // Stop the job scheduler
  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log("[JobScheduler] Stopped");
  }

  // Process pending jobs
  async processJobs() {
    const db = await getDb();
    if (!db) return;

    const now = new Date();

    // Get pending jobs that are due
    const pendingJobs = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, "pending"),
          lte(backgroundJobs.scheduledAt, now)
        )
      )
      .orderBy(backgroundJobs.priority, backgroundJobs.scheduledAt)
      .limit(5);

    for (const job of pendingJobs) {
      await this.executeJob(job);
    }

    // Also check for scheduled bot executions
    await this.checkScheduledBots();
  }

  // Execute a single job
  async executeJob(job: typeof backgroundJobs.$inferSelect) {
    const db = await getDb();
    if (!db) return;

    const startTime = Date.now();

    try {
      // Mark job as running
      await db
        .update(backgroundJobs)
        .set({
          status: "running",
          startedAt: new Date(),
          workerId: this.workerId,
          attempts: job.attempts + 1,
        })
        .where(eq(backgroundJobs.id, job.id));

      // Get the processor for this job type
      const processor = jobProcessors[job.jobType as JobType];
      if (!processor) {
        throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Execute the job
      const result = await processor(job.payload as JobPayload);

      // Mark job as completed
      await db
        .update(backgroundJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          result,
        })
        .where(eq(backgroundJobs.id, job.id));

      // Log to history
      await db.insert(jobHistory).values({
        jobId: job.id,
        jobType: job.jobType,
        status: "completed",
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        payload: job.payload,
        result,
        itemsProcessed: result.itemsProcessed || 0,
      });

      console.log(`[JobScheduler] Job ${job.id} (${job.jobType}) completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check if we should retry
      const shouldRetry = job.attempts + 1 < job.maxAttempts;

      await db
        .update(backgroundJobs)
        .set({
          status: shouldRetry ? "pending" : "failed",
          completedAt: shouldRetry ? null : new Date(),
          errorMessage,
        })
        .where(eq(backgroundJobs.id, job.id));

      // Log to history
      await db.insert(jobHistory).values({
        jobId: job.id,
        jobType: job.jobType,
        status: "failed",
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        payload: job.payload,
        errorMessage,
        itemsProcessed: 0,
      });

      console.error(`[JobScheduler] Job ${job.id} (${job.jobType}) failed: ${errorMessage}`);
    }
  }

  // Check for scheduled bot executions
  async checkScheduledBots() {
    const db = await getDb();
    if (!db) return;

    const now = new Date();

    // Get active schedules that are due
    const dueSchedules = await db
      .select()
      .from(botSchedules)
      .where(
        and(
          eq(botSchedules.isActive, true),
          lte(botSchedules.nextRunAt, now)
        )
      );

    for (const schedule of dueSchedules) {
      // Create a job for this bot execution
      await this.scheduleJob("bot_execution", {
        botId: schedule.botId,
        userId: schedule.userId,
        scheduleId: schedule.id,
      });

      // Calculate next run time based on frequency
      const nextRun = this.calculateNextRun(schedule);
      
      await db
        .update(botSchedules)
        .set({
          lastRunAt: now,
          nextRunAt: nextRun,
          totalRuns: schedule.totalRuns + 1,
        })
        .where(eq(botSchedules.id, schedule.id));
    }
  }

  // Calculate next run time based on schedule frequency
  calculateNextRun(schedule: typeof botSchedules.$inferSelect): Date {
    const now = new Date();
    
    switch (schedule.scheduleType) {
      case "once":
        // One-time schedules don't have a next run
        return new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // Far future
      
      // Note: hourly is not in schema, using daily as fallback
      
      case "daily":
        const dailyNext = new Date(now);
        dailyNext.setDate(dailyNext.getDate() + 1);
        if (schedule.runTime) {
          const [hours, minutes] = schedule.runTime.split(":").map(Number);
          dailyNext.setHours(hours, minutes, 0, 0);
        }
        return dailyNext;
      
      case "weekly":
        const weeklyNext = new Date(now);
        weeklyNext.setDate(weeklyNext.getDate() + 7);
        if (schedule.runTime) {
          const [hours, minutes] = schedule.runTime.split(":").map(Number);
          weeklyNext.setHours(hours, minutes, 0, 0);
        }
        return weeklyNext;
      
      case "monthly":
        const monthlyNext = new Date(now);
        monthlyNext.setMonth(monthlyNext.getMonth() + 1);
        if (schedule.runTime) {
          const [hours, minutes] = schedule.runTime.split(":").map(Number);
          monthlyNext.setHours(hours, minutes, 0, 0);
        }
        return monthlyNext;
      
      case "cron":
        // For cron expressions, would need a cron parser
        // For now, default to daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // Schedule a new job
  async scheduleJob(
    jobType: JobType,
    payload: JobPayload,
    options: {
      scheduledAt?: Date;
      priority?: number;
      maxAttempts?: number;
    } = {}
  ) {
    const db = await getDb();
    if (!db) return null;

    const [result] = await db
      .insert(backgroundJobs)
      .values({
        jobType,
        payload,
        scheduledAt: options.scheduledAt || new Date(),
        priority: options.priority || 5,
        maxAttempts: options.maxAttempts || 3,
        status: "pending",
      })
      .$returningId();

    return result.id;
  }

  // Get job status
  async getJobStatus(jobId: number) {
    const db = await getDb();
    if (!db) return null;

    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, jobId));

    return job;
  }

  // Get recent job history
  async getJobHistory(limit: number = 50) {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(jobHistory)
      .orderBy(desc(jobHistory.createdAt))
      .limit(limit);
  }
}

// Export singleton instance
export const jobScheduler = new JobScheduler();
