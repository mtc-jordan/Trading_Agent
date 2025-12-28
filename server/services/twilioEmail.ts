/**
 * Twilio SendGrid Email Service
 * Handles email delivery using Twilio SendGrid API
 */

import { getDb } from "../db";
import { emailQueue, userEmailPreferences } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";

// SendGrid API configuration
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

interface SendGridPersonalization {
  to: { email: string; name?: string }[];
  subject?: string;
  dynamic_template_data?: Record<string, unknown>;
}

interface SendGridContent {
  type: string;
  value: string;
}

interface SendGridMailRequest {
  personalizations: SendGridPersonalization[];
  from: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  subject?: string;
  content?: SendGridContent[];
  template_id?: string;
}

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface EmailPreferencesData {
  userId: number;
  botExecutionComplete: boolean;
  botExecutionError: boolean;
  priceTargetAlert: boolean;
  recommendationChange: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  marketingEmails: boolean;
  digestFrequency: "immediate" | "hourly" | "daily" | "weekly";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  isUnsubscribed: boolean;
}

/**
 * Send email using Twilio SendGrid API
 */
export async function sendEmailViaSendGrid(
  options: EmailOptions,
  apiKey: string,
  fromEmail: string = "noreply@tradoverse.com",
  fromName: string = "TradoVerse"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailRequest: SendGridMailRequest = {
      personalizations: [
        {
          to: [{ email: options.to, name: options.toName }],
          subject: options.subject,
          ...(options.templateData && { dynamic_template_data: options.templateData }),
        },
      ],
      from: { email: fromEmail, name: fromName },
    };

    if (options.templateId) {
      mailRequest.template_id = options.templateId;
    } else {
      mailRequest.content = [
        { type: "text/html", value: options.htmlContent },
      ];
      if (options.textContent) {
        mailRequest.content.unshift({ type: "text/plain", value: options.textContent });
      }
    }

    const response = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mailRequest),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get("X-Message-Id") || `sg-${Date.now()}`;
      return { success: true, messageId };
    } else {
      const errorBody = await response.text();
      console.error("[SendGrid] Error:", response.status, errorBody);
      return { success: false, error: `SendGrid error: ${response.status} - ${errorBody}` };
    }
  } catch (error) {
    console.error("[SendGrid] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get user email preferences
 */
export async function getUserEmailPreferences(userId: number): Promise<EmailPreferencesData | null> {
  const db = await getDb();
  if (!db) return null;
  const [prefs] = await db
    .select()
    .from(userEmailPreferences)
    .where(eq(userEmailPreferences.userId, userId))
    .limit(1);

  if (!prefs) return null;

  return {
    userId: prefs.userId,
    botExecutionComplete: prefs.botExecutionComplete,
    botExecutionError: prefs.botExecutionError,
    priceTargetAlert: prefs.priceTargetAlert,
    recommendationChange: prefs.recommendationChange,
    weeklyReport: prefs.weeklyReport,
    monthlyReport: prefs.monthlyReport,
    marketingEmails: prefs.marketingEmails,
    digestFrequency: prefs.digestFrequency as "immediate" | "hourly" | "daily" | "weekly",
    quietHoursStart: prefs.quietHoursStart ?? undefined,
    quietHoursEnd: prefs.quietHoursEnd ?? undefined,
    timezone: prefs.timezone,
    isUnsubscribed: prefs.isUnsubscribed,
  };
}

/**
 * Update user email preferences
 */
export async function updateUserEmailPreferences(
  userId: number,
  preferences: Partial<Omit<EmailPreferencesData, "userId">>
): Promise<EmailPreferencesData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if preferences exist
  const existing = await getUserEmailPreferences(userId);
  
  if (existing) {
    // Update existing preferences
    await db
      .update(userEmailPreferences)
      .set({
        botExecutionComplete: preferences.botExecutionComplete,
        botExecutionError: preferences.botExecutionError,
        priceTargetAlert: preferences.priceTargetAlert,
        recommendationChange: preferences.recommendationChange,
        weeklyReport: preferences.weeklyReport,
        monthlyReport: preferences.monthlyReport,
        marketingEmails: preferences.marketingEmails,
        digestFrequency: preferences.digestFrequency,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        isUnsubscribed: preferences.isUnsubscribed,
      })
      .where(eq(userEmailPreferences.userId, userId));
  } else {
    // Create new preferences
    await db.insert(userEmailPreferences).values({
      userId,
      botExecutionComplete: preferences.botExecutionComplete ?? true,
      botExecutionError: preferences.botExecutionError ?? true,
      priceTargetAlert: preferences.priceTargetAlert ?? true,
      recommendationChange: preferences.recommendationChange ?? true,
      weeklyReport: preferences.weeklyReport ?? true,
      monthlyReport: preferences.monthlyReport ?? true,
      marketingEmails: preferences.marketingEmails ?? false,
      digestFrequency: preferences.digestFrequency ?? "immediate",
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      timezone: preferences.timezone ?? "UTC",
      isUnsubscribed: preferences.isUnsubscribed ?? false,
    });
  }

  return (await getUserEmailPreferences(userId))!;
}

/**
 * Queue an email for delivery
 */
export async function queueEmail(
  userId: number,
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  priority: "low" | "normal" | "high" | "urgent" = "normal",
  scheduledAt?: Date
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(emailQueue).values({
    userId,
    toEmail,
    subject,
    htmlContent,
    textContent,
    priority,
    scheduledAt,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
  });

  return result[0].insertId;
}

/**
 * Process pending emails in the queue
 */
export async function processEmailQueue(
  apiKey: string,
  batchSize: number = 10
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, succeeded: 0, failed: 0 };
  
  // Get pending emails that haven't exceeded max attempts
  const pendingEmails = await db
    .select()
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.status, "pending")
      )
    )
    .limit(batchSize);

  // Filter emails that haven't exceeded max attempts
  const eligibleEmails = pendingEmails.filter(e => e.attempts < e.maxAttempts);

  let succeeded = 0;
  let failed = 0;

  for (const email of eligibleEmails) {
    const result = await sendEmailViaSendGrid(
      {
        to: email.toEmail,
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent ?? undefined,
      },
      apiKey
    );

    if (result.success) {
      await db
        .update(emailQueue)
        .set({
          status: "sent",
          sentAt: new Date(),
          lastAttemptAt: new Date(),
        })
        .where(eq(emailQueue.id, email.id));
      succeeded++;
    } else {
      const newAttempts = email.attempts + 1;
      await db
        .update(emailQueue)
        .set({
          status: newAttempts >= email.maxAttempts ? "failed" : "pending",
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
        })
        .where(eq(emailQueue.id, email.id));
      failed++;
    }
  }

  return { processed: eligibleEmails.length, succeeded, failed };
}

/**
 * Check if user should receive a specific notification type
 */
export async function shouldSendNotification(
  userId: number,
  notificationType: keyof Pick<EmailPreferencesData, 
    "botExecutionComplete" | "botExecutionError" | "priceTargetAlert" | 
    "recommendationChange" | "weeklyReport" | "monthlyReport" | "marketingEmails">
): Promise<boolean> {
  const prefs = await getUserEmailPreferences(userId);
  if (!prefs) return true; // Default to sending if no preferences set
  if (prefs.isUnsubscribed) return false; // Don't send if unsubscribed
  return prefs[notificationType] ?? true;
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  userId: number,
  email: string,
  verificationToken: string,
  apiKey: string,
  baseUrl: string
): Promise<boolean> {
  const verificationLink = `${baseUrl}/api/email/verify?token=${verificationToken}&userId=${userId}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; }
        .logo { color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 24px; }
        h1 { color: #f5f5f5; font-size: 28px; margin-bottom: 16px; }
        p { color: #a1a1a1; line-height: 1.6; margin-bottom: 24px; }
        .button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #333; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">TradoVerse</div>
        <h1>Verify Your Email</h1>
        <p>Thanks for signing up! Please verify your email address to start receiving notifications about your trading activity.</p>
        <a href="${verificationLink}" class="button">Verify Email Address</a>
        <p style="margin-top: 24px; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <div class="footer">
          <p>This email was sent by TradoVerse. If you have questions, contact support@tradoverse.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await sendEmailViaSendGrid(
    {
      to: email,
      subject: "Verify your TradoVerse email",
      htmlContent,
      textContent: `Verify your email by visiting: ${verificationLink}`,
    },
    apiKey
  );

  return result.success;
}

/**
 * Get email queue statistics
 */
export async function getEmailQueueStats(): Promise<{
  pending: number;
  sent: number;
  failed: number;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, sent: 0, failed: 0, total: 0 };
  
  const allEmails = await db.select().from(emailQueue);
  
  return {
    pending: allEmails.filter((e) => e.status === "pending").length,
    sent: allEmails.filter((e) => e.status === "sent").length,
    failed: allEmails.filter((e) => e.status === "failed").length,
    total: allEmails.length,
  };
}

/**
 * Test SendGrid API key validity
 */
export async function testSendGridApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Use SendGrid's API key validation endpoint
    const response = await fetch("https://api.sendgrid.com/v3/scopes", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    } else {
      return { valid: false, error: `API error: ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Connection error" };
  }
}
