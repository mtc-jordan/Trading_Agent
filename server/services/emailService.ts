import { getDb } from "../db";
import { emailQueue, emailTemplates, userEmailPreferences, alertHistory } from "../../drizzle/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// Email template types
export type EmailTemplateKey = 
  | "bot_execution_complete"
  | "bot_execution_error"
  | "price_target_alert"
  | "recommendation_change"
  | "weekly_report"
  | "monthly_report"
  | "welcome"
  | "password_reset";

// Default email templates
const defaultTemplates: Record<EmailTemplateKey, { subject: string; html: string; text: string; variables: string[] }> = {
  bot_execution_complete: {
    subject: "✅ Bot Execution Complete: {{botName}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Bot Execution Complete</h2>
        <p>Your trading bot <strong>{{botName}}</strong> has completed its scheduled execution.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Execution Time:</strong> {{executionTime}}</p>
          <p><strong>Trades Executed:</strong> {{tradesExecuted}}</p>
          <p><strong>Profit/Loss:</strong> {{profitLoss}}</p>
          <p><strong>Status:</strong> {{status}}</p>
        </div>
        <a href="{{dashboardUrl}}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Details</a>
      </div>
    `,
    text: "Bot Execution Complete: {{botName}}\n\nYour trading bot has completed its scheduled execution.\n\nExecution Time: {{executionTime}}\nTrades Executed: {{tradesExecuted}}\nProfit/Loss: {{profitLoss}}\nStatus: {{status}}\n\nView details at: {{dashboardUrl}}",
    variables: ["botName", "executionTime", "tradesExecuted", "profitLoss", "status", "dashboardUrl"]
  },
  bot_execution_error: {
    subject: "⚠️ Bot Execution Error: {{botName}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Bot Execution Error</h2>
        <p>Your trading bot <strong>{{botName}}</strong> encountered an error during execution.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
          <p><strong>Error:</strong> {{errorMessage}}</p>
          <p><strong>Time:</strong> {{errorTime}}</p>
        </div>
        <p>Please review your bot configuration and try again.</p>
        <a href="{{dashboardUrl}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Bot</a>
      </div>
    `,
    text: "Bot Execution Error: {{botName}}\n\nYour trading bot encountered an error during execution.\n\nError: {{errorMessage}}\nTime: {{errorTime}}\n\nPlease review your bot configuration at: {{dashboardUrl}}",
    variables: ["botName", "errorMessage", "errorTime", "dashboardUrl"]
  },
  price_target_alert: {
    subject: "🎯 Price Alert: {{symbol}} hit {{targetType}} target",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Price Target Alert</h2>
        <p><strong>{{symbol}}</strong> has hit your {{targetType}} price target!</p>
        <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Current Price:</strong> $" + "{{currentPrice}}</p>
          <p><strong>Target Price:</strong> $" + "{{targetPrice}}</p>
          <p><strong>Change:</strong> {{priceChange}}%</p>
        </div>
        <a href="{{analysisUrl}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Analysis</a>
      </div>
    `,
    text: "Price Target Alert: {{symbol}}\n\n{{symbol}} has hit your {{targetType}} price target!\n\nCurrent Price: ${{currentPrice}}\nTarget Price: ${{targetPrice}}\nChange: {{priceChange}}%\n\nView analysis at: {{analysisUrl}}",
    variables: ["symbol", "targetType", "currentPrice", "targetPrice", "priceChange", "analysisUrl"]
  },
  recommendation_change: {
    subject: "📊 Recommendation Change: {{symbol}} - {{newRecommendation}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">AI Recommendation Changed</h2>
        <p>The AI consensus for <strong>{{symbol}}</strong> has changed.</p>
        <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Previous:</strong> {{previousRecommendation}} ({{previousConfidence}}% confidence)</p>
          <p><strong>New:</strong> {{newRecommendation}} ({{newConfidence}}% confidence)</p>
        </div>
        <p>Key factors:</p>
        <ul>
          {{#factors}}
          <li>{{.}}</li>
          {{/factors}}
        </ul>
        <a href="{{analysisUrl}}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Full Analysis</a>
      </div>
    `,
    text: "AI Recommendation Changed: {{symbol}}\n\nPrevious: {{previousRecommendation}} ({{previousConfidence}}% confidence)\nNew: {{newRecommendation}} ({{newConfidence}}% confidence)\n\nView full analysis at: {{analysisUrl}}",
    variables: ["symbol", "previousRecommendation", "previousConfidence", "newRecommendation", "newConfidence", "factors", "analysisUrl"]
  },
  weekly_report: {
    subject: "📈 Your Weekly Trading Report - {{weekRange}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Weekly Performance Report</h2>
        <p>Here's your trading performance for {{weekRange}}</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Performance Summary</h3>
          <p><strong>Total Trades:</strong> {{totalTrades}}</p>
          <p><strong>Win Rate:</strong> {{winRate}}%</p>
          <p><strong>Net P/L:</strong> {{netProfitLoss}}</p>
          <p><strong>Return:</strong> {{percentReturn}}%</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>AI Accuracy</h3>
          <p><strong>Predictions:</strong> {{totalPredictions}}</p>
          <p><strong>Accuracy:</strong> {{predictionAccuracy}}%</p>
        </div>
        <a href="{{reportUrl}}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Full Report</a>
      </div>
    `,
    text: "Weekly Performance Report - {{weekRange}}\n\nTotal Trades: {{totalTrades}}\nWin Rate: {{winRate}}%\nNet P/L: {{netProfitLoss}}\nReturn: {{percentReturn}}%\n\nAI Accuracy: {{predictionAccuracy}}%\n\nView full report at: {{reportUrl}}",
    variables: ["weekRange", "totalTrades", "winRate", "netProfitLoss", "percentReturn", "totalPredictions", "predictionAccuracy", "reportUrl"]
  },
  monthly_report: {
    subject: "📊 Your Monthly Trading Report - {{monthYear}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Monthly Performance Report</h2>
        <p>Here's your trading performance for {{monthYear}}</p>
        <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Performance Summary</h3>
          <p><strong>Total Trades:</strong> {{totalTrades}}</p>
          <p><strong>Win Rate:</strong> {{winRate}}%</p>
          <p><strong>Net P/L:</strong> {{netProfitLoss}}</p>
          <p><strong>Return:</strong> {{percentReturn}}%</p>
          <p><strong>vs S&P 500:</strong> {{benchmarkComparison}}</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>AI Performance</h3>
          <p><strong>Predictions:</strong> {{totalPredictions}}</p>
          <p><strong>Accuracy:</strong> {{predictionAccuracy}}%</p>
          <p><strong>Best Agent:</strong> {{bestAgent}}</p>
        </div>
        <a href="{{reportUrl}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Full Report</a>
      </div>
    `,
    text: "Monthly Performance Report - {{monthYear}}\n\nTotal Trades: {{totalTrades}}\nWin Rate: {{winRate}}%\nNet P/L: {{netProfitLoss}}\nReturn: {{percentReturn}}%\nvs S&P 500: {{benchmarkComparison}}\n\nAI Accuracy: {{predictionAccuracy}}%\nBest Agent: {{bestAgent}}\n\nView full report at: {{reportUrl}}",
    variables: ["monthYear", "totalTrades", "winRate", "netProfitLoss", "percentReturn", "benchmarkComparison", "totalPredictions", "predictionAccuracy", "bestAgent", "reportUrl"]
  },
  welcome: {
    subject: "🚀 Welcome to TradoVerse!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Welcome to TradoVerse!</h2>
        <p>Hi {{userName}},</p>
        <p>Welcome to the future of AI-powered trading! You now have access to our 7-agent AI consensus system.</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Getting Started</h3>
          <ol>
            <li>Run your first AI analysis</li>
            <li>Create a trading bot</li>
            <li>Set up price alerts</li>
            <li>Explore the marketplace</li>
          </ol>
        </div>
        <a href="{{dashboardUrl}}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
      </div>
    `,
    text: "Welcome to TradoVerse!\n\nHi {{userName}},\n\nWelcome to the future of AI-powered trading!\n\nGetting Started:\n1. Run your first AI analysis\n2. Create a trading bot\n3. Set up price alerts\n4. Explore the marketplace\n\nGo to dashboard: {{dashboardUrl}}",
    variables: ["userName", "dashboardUrl"]
  },
  password_reset: {
    subject: "🔐 Reset Your TradoVerse Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Password Reset Request</h2>
        <p>We received a request to reset your password.</p>
        <a href="{{resetUrl}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
        <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: "Password Reset Request\n\nWe received a request to reset your password.\n\nReset your password at: {{resetUrl}}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.",
    variables: ["resetUrl"]
  }
};

// Replace template variables
function replaceVariables(template: string, variables: Record<string, string | number | string[]>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (Array.isArray(value)) {
      // Handle array variables (for lists)
      const listHtml = value.map(item => `<li>${item}</li>`).join("");
      result = result.replace(new RegExp(`{{#${key}}}[\\s\\S]*?{{/${key}}}`, "g"), listHtml);
    } else {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }
  }
  return result;
}

// Email service class
export class EmailService {
  // Get user email preferences
  async getUserPreferences(userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [prefs] = await db
      .select()
      .from(userEmailPreferences)
      .where(eq(userEmailPreferences.userId, userId));
    
    if (!prefs) {
      // Create default preferences
      const [newPrefs] = await db
        .insert(userEmailPreferences)
        .values({ userId })
        .$returningId();
      
      return {
        id: newPrefs.id,
        userId,
        botExecutionComplete: true,
        botExecutionError: true,
        priceTargetAlert: true,
        recommendationChange: true,
        weeklyReport: true,
        monthlyReport: true,
        marketingEmails: false,
        digestFrequency: "immediate" as const,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: "UTC",
        isUnsubscribed: false,
      };
    }
    
    return prefs;
  }

  // Update user email preferences
  async updateUserPreferences(userId: number, updates: Partial<typeof userEmailPreferences.$inferInsert>) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db
      .update(userEmailPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userEmailPreferences.userId, userId));
  }

  // Queue an email
  async queueEmail(params: {
    userId: number;
    toEmail: string;
    templateKey: EmailTemplateKey;
    variables: Record<string, string | number | string[]>;
    priority?: "low" | "normal" | "high" | "urgent";
    scheduledAt?: Date;
  }) {
    const template = defaultTemplates[params.templateKey];
    if (!template) {
      throw new Error(`Unknown email template: ${params.templateKey}`);
    }

    const subject = replaceVariables(template.subject, params.variables);
    const htmlContent = replaceVariables(template.html, params.variables);
    const textContent = replaceVariables(template.text, params.variables);

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [result] = await db
      .insert(emailQueue)
      .values({
        userId: params.userId,
        toEmail: params.toEmail,
        subject,
        htmlContent,
        textContent,
        templateVariables: params.variables,
        priority: params.priority || "normal",
        scheduledAt: params.scheduledAt || new Date(),
        status: "pending",
      })
      .$returningId();

    return result.id;
  }

  // Send bot execution complete notification
  async sendBotExecutionComplete(params: {
    userId: number;
    userEmail: string;
    botName: string;
    executionTime: string;
    tradesExecuted: number;
    profitLoss: string;
    status: string;
    dashboardUrl: string;
  }) {
    const prefs = await this.getUserPreferences(params.userId);
    if (!prefs.botExecutionComplete || prefs.isUnsubscribed) return;

    return this.queueEmail({
      userId: params.userId,
      toEmail: params.userEmail,
      templateKey: "bot_execution_complete",
      variables: {
        botName: params.botName,
        executionTime: params.executionTime,
        tradesExecuted: params.tradesExecuted,
        profitLoss: params.profitLoss,
        status: params.status,
        dashboardUrl: params.dashboardUrl,
      },
      priority: "normal",
    });
  }

  // Send bot execution error notification
  async sendBotExecutionError(params: {
    userId: number;
    userEmail: string;
    botName: string;
    errorMessage: string;
    errorTime: string;
    dashboardUrl: string;
  }) {
    const prefs = await this.getUserPreferences(params.userId);
    if (!prefs.botExecutionError || prefs.isUnsubscribed) return;

    return this.queueEmail({
      userId: params.userId,
      toEmail: params.userEmail,
      templateKey: "bot_execution_error",
      variables: {
        botName: params.botName,
        errorMessage: params.errorMessage,
        errorTime: params.errorTime,
        dashboardUrl: params.dashboardUrl,
      },
      priority: "high",
    });
  }

  // Send price target alert
  async sendPriceTargetAlert(params: {
    userId: number;
    userEmail: string;
    symbol: string;
    targetType: "high" | "low";
    currentPrice: number;
    targetPrice: number;
    priceChange: number;
    analysisUrl: string;
  }) {
    const prefs = await this.getUserPreferences(params.userId);
    if (!prefs.priceTargetAlert || prefs.isUnsubscribed) return;

    // Record in alert history
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db.insert(alertHistory).values({
      userId: params.userId,
      alertId: 0, // System-generated alert
      alertType: "price_target",
      symbol: params.symbol,
      title: `Price ${params.targetType} target hit for ${params.symbol}`,
      message: `${params.symbol} hit your ${params.targetType} price target of $${params.targetPrice}. Current price: $${params.currentPrice}`,
      previousValue: String(params.targetPrice),
      newValue: String(params.currentPrice),
      emailSent: true,
    });

    return this.queueEmail({
      userId: params.userId,
      toEmail: params.userEmail,
      templateKey: "price_target_alert",
      variables: {
        symbol: params.symbol,
        targetType: params.targetType,
        currentPrice: params.currentPrice.toFixed(2),
        targetPrice: params.targetPrice.toFixed(2),
        priceChange: params.priceChange.toFixed(2),
        analysisUrl: params.analysisUrl,
      },
      priority: "high",
    });
  }

  // Send recommendation change alert
  async sendRecommendationChange(params: {
    userId: number;
    userEmail: string;
    symbol: string;
    previousRecommendation: string;
    previousConfidence: number;
    newRecommendation: string;
    newConfidence: number;
    factors: string[];
    analysisUrl: string;
  }) {
    const prefs = await this.getUserPreferences(params.userId);
    if (!prefs.recommendationChange || prefs.isUnsubscribed) return;

    // Record in alert history
    const db2 = await getDb();
    if (!db2) throw new Error("Database not available");
    
    await db2.insert(alertHistory).values({
      userId: params.userId,
      alertId: 0, // System-generated alert
      alertType: "recommendation_change",
      symbol: params.symbol,
      title: `Recommendation changed for ${params.symbol}`,
      message: `AI recommendation for ${params.symbol} changed from ${params.previousRecommendation} to ${params.newRecommendation}`,
      previousValue: params.previousRecommendation,
      newValue: params.newRecommendation,
      emailSent: true,
    });

    return this.queueEmail({
      userId: params.userId,
      toEmail: params.userEmail,
      templateKey: "recommendation_change",
      variables: {
        symbol: params.symbol,
        previousRecommendation: params.previousRecommendation,
        previousConfidence: Math.round(params.previousConfidence * 100),
        newRecommendation: params.newRecommendation,
        newConfidence: Math.round(params.newConfidence * 100),
        factors: params.factors,
        analysisUrl: params.analysisUrl,
      },
      priority: "normal",
    });
  }

  // Process email queue (called by background job)
  async processEmailQueue(batchSize: number = 10) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const now = new Date();
    
    // Get pending emails that are due
    const pendingEmails = await db
      .select()
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.status, "pending"),
          lte(emailQueue.scheduledAt, now)
        )
      )
      .limit(batchSize);

    const results = [];
    
    for (const email of pendingEmails) {
      try {
        // Mark as processing
        await db
          .update(emailQueue)
          .set({ status: "processing", lastAttemptAt: now })
          .where(eq(emailQueue.id, email.id));

        // In production, this would call an actual email service (SendGrid, SES, etc.)
        // For now, we'll use the notification system as a fallback
        const sent = await notifyOwner({
          title: `Email: ${email.subject}`,
          content: email.textContent || email.htmlContent,
        });

        if (sent) {
          await db
            .update(emailQueue)
            .set({ 
              status: "sent", 
              sentAt: now,
              attempts: email.attempts + 1 
            })
            .where(eq(emailQueue.id, email.id));
          
          results.push({ id: email.id, status: "sent" });
        } else {
          throw new Error("Failed to send notification");
        }
      } catch (error) {
        const attempts = email.attempts + 1;
        const status = attempts >= email.maxAttempts ? "failed" : "pending";
        
        await db
          .update(emailQueue)
          .set({ 
            status,
            attempts,
            lastAttemptAt: now,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(emailQueue.id, email.id));
        
        results.push({ id: email.id, status, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return results;
  }

  // Get email queue status
  async getQueueStatus() {
    const db = await getDb();
    if (!db) return { pending: 0, processing: 0, failed: 0 };
    
    const { count } = await import("drizzle-orm");
    
    const [pending] = await db
      .select({ count: count() })
      .from(emailQueue)
      .where(eq(emailQueue.status, "pending"));

    const [processing] = await db
      .select({ count: count() })
      .from(emailQueue)
      .where(eq(emailQueue.status, "processing"));

    const [failed] = await db
      .select({ count: count() })
      .from(emailQueue)
      .where(eq(emailQueue.status, "failed"));

    return {
      pending: pending?.count || 0,
      processing: processing?.count || 0,
      failed: failed?.count || 0,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
