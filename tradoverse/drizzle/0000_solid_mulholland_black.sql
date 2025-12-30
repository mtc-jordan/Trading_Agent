CREATE TABLE `activity_feed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('trade','analysis','strategy_share','follow','comment','like','achievement','bot_created') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`symbol` varchar(20),
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_feed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`botId` int,
	`symbol` varchar(20) NOT NULL,
	`technicalScore` decimal(5,4),
	`fundamentalScore` decimal(5,4),
	`sentimentScore` decimal(5,4),
	`riskScore` decimal(5,4),
	`microstructureScore` decimal(5,4),
	`macroScore` decimal(5,4),
	`quantScore` decimal(5,4),
	`consensusScore` decimal(5,4),
	`consensusAction` enum('strong_buy','buy','hold','sell','strong_sell'),
	`confidence` decimal(5,4),
	`analysisDetails` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uniqueId` varchar(64),
	`userId` int NOT NULL,
	`alertId` int NOT NULL,
	`alertIdStr` varchar(64),
	`symbol` varchar(20) NOT NULL,
	`alertType` enum('recommendation_change','confidence_change','price_target','bot_status','analysis_complete','price','regime','sentiment') NOT NULL,
	`title` varchar(255),
	`message` text NOT NULL,
	`previousValue` varchar(100),
	`newValue` varchar(100),
	`details` json,
	`isRead` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`pushSent` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `background_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` enum('bot_execution','price_tracking','accuracy_calculation','weekly_report','monthly_report','watchlist_check','email_send','cleanup') NOT NULL,
	`payload` json NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`priority` int NOT NULL DEFAULT 5,
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`result` json,
	`errorMessage` text,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`nextRetryAt` timestamp,
	`workerId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `background_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtest_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`initialCapital` decimal(18,2) NOT NULL,
	`strategyType` enum('standard','enhanced','rl','custom') NOT NULL,
	`strategyConfig` json,
	`finalCapital` decimal(18,2),
	`totalReturn` decimal(10,4),
	`annualizedReturn` decimal(10,4),
	`sharpeRatio` decimal(10,4),
	`sortinoRatio` decimal(10,4),
	`maxDrawdown` decimal(10,4),
	`winRate` decimal(5,4),
	`profitFactor` decimal(10,4),
	`totalTrades` int NOT NULL DEFAULT 0,
	`winningTrades` int NOT NULL DEFAULT 0,
	`losingTrades` int NOT NULL DEFAULT 0,
	`avgWin` decimal(18,6),
	`avgLoss` decimal(18,6),
	`equityCurve` json,
	`trades` json,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `backtest_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`botId` int,
	`name` varchar(255) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`strategy` json NOT NULL,
	`symbols` json NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`initialCapital` decimal(18,2) NOT NULL,
	`finalCapital` decimal(18,2),
	`totalReturn` decimal(10,4),
	`sharpeRatio` decimal(10,4),
	`maxDrawdown` decimal(10,4),
	`winRate` decimal(10,4),
	`profitFactor` decimal(10,4),
	`totalTrades` int,
	`results` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backtests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botId` int NOT NULL,
	`userId` int NOT NULL,
	`benchmarkSymbol` varchar(20) NOT NULL DEFAULT 'SPY',
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`periodDays` int NOT NULL,
	`botReturn` decimal(10,4) NOT NULL,
	`botSharpe` decimal(10,4),
	`botMaxDrawdown` decimal(10,4),
	`botWinRate` decimal(5,4),
	`botTotalTrades` int,
	`benchmarkReturn` decimal(10,4) NOT NULL,
	`benchmarkSharpe` decimal(10,4),
	`benchmarkMaxDrawdown` decimal(10,4),
	`alpha` decimal(10,4),
	`beta` decimal(10,4),
	`informationRatio` decimal(10,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bot_benchmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_copies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalBotId` int NOT NULL,
	`copiedBotId` int NOT NULL,
	`userId` int NOT NULL,
	`listingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bot_copies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botId` int NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` int,
	`executionType` enum('scheduled','manual','triggered') NOT NULL,
	`status` enum('running','completed','failed','timeout','cancelled') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`durationMs` int,
	`symbolsAnalyzed` json,
	`tradesExecuted` int DEFAULT 0,
	`ordersPlaced` int DEFAULT 0,
	`analysisResults` json,
	`errorMessage` text,
	`errorStack` text,
	`pnlResult` decimal(18,6),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bot_execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_risk_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`ruleType` enum('stop_loss','take_profit','trailing_stop','max_position','max_daily_loss','max_drawdown','position_sizing') NOT NULL,
	`triggerValue` decimal(18,6),
	`triggerType` enum('percentage','absolute','atr_multiple') DEFAULT 'percentage',
	`positionSizeType` enum('fixed','percentage','risk_based'),
	`positionSizeValue` decimal(18,6),
	`maxPositionSize` decimal(18,6),
	`actionOnTrigger` enum('close_position','reduce_position','pause_bot','notify_only') DEFAULT 'close_position',
	`reduceByPercentage` decimal(5,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`triggeredCount` int NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_risk_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`scheduleType` enum('once','daily','weekly','monthly','cron') NOT NULL,
	`cronExpression` varchar(100),
	`runTime` varchar(10),
	`daysOfWeek` json,
	`dayOfMonth` int,
	`timezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`maxExecutionTime` int DEFAULT 300,
	`retryOnFailure` boolean NOT NULL DEFAULT true,
	`maxRetries` int DEFAULT 3,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastRunStatus` enum('success','failed','timeout','skipped'),
	`lastRunError` text,
	`totalRuns` int NOT NULL DEFAULT 0,
	`successfulRuns` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copy_settings` (
	`id` varchar(64) NOT NULL,
	`followerId` varchar(64) NOT NULL,
	`traderId` varchar(64) NOT NULL,
	`allocationMode` enum('fixed','percentage','proportional') NOT NULL DEFAULT 'fixed',
	`allocationAmount` decimal(18,2) NOT NULL DEFAULT '1000',
	`maxPositionSize` decimal(18,2) NOT NULL DEFAULT '10000',
	`maxDailyLoss` decimal(18,2) NOT NULL DEFAULT '500',
	`copyStopLoss` boolean NOT NULL DEFAULT true,
	`copyTakeProfit` boolean NOT NULL DEFAULT true,
	`excludeSymbols` json,
	`status` enum('active','paused','stopped') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copy_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copy_traders` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`bio` text,
	`totalReturn` decimal(10,2) NOT NULL DEFAULT '0',
	`winRate` decimal(5,2) NOT NULL DEFAULT '0',
	`totalTrades` int NOT NULL DEFAULT 0,
	`followers` int NOT NULL DEFAULT 0,
	`riskScore` int NOT NULL DEFAULT 5,
	`sharpeRatio` decimal(6,3) NOT NULL DEFAULT '0',
	`maxDrawdown` decimal(6,2) NOT NULL DEFAULT '0',
	`tradingStyle` enum('day_trader','swing_trader','position_trader','scalper') NOT NULL DEFAULT 'swing_trader',
	`isVerified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copy_traders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copy_trades` (
	`id` varchar(64) NOT NULL,
	`copySettingsId` varchar(64) NOT NULL,
	`originalTradeId` varchar(64),
	`followerId` varchar(64) NOT NULL,
	`traderId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`originalQuantity` decimal(18,8) NOT NULL,
	`copiedQuantity` decimal(18,8) NOT NULL,
	`originalPrice` decimal(18,8) NOT NULL,
	`copiedPrice` decimal(18,8) NOT NULL,
	`slippage` decimal(8,4) NOT NULL DEFAULT '0',
	`pnl` decimal(18,2),
	`status` enum('pending','executed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `copy_trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crypto_watchlist` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`notes` text,
	`targetBuyPrice` decimal(18,8),
	`targetSellPrice` decimal(18,8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crypto_watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discussion_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`userId` int NOT NULL,
	`parentCommentId` int,
	`content` text NOT NULL,
	`likeCount` int NOT NULL DEFAULT 0,
	`isEdited` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discussion_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discussion_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`threadType` enum('analysis','strategy','bot','general','market') NOT NULL,
	`relatedEntityId` int,
	`symbol` varchar(20),
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`likeCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discussion_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sendgridApiKey` text,
	`senderEmail` varchar(320),
	`senderName` varchar(255),
	`replyToEmail` varchar(320),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`dailyLimit` int DEFAULT 1000,
	`testMode` boolean NOT NULL DEFAULT true,
	`testEmail` varchar(320),
	`emailsSentToday` int DEFAULT 0,
	`lastResetAt` timestamp,
	`configuredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`toEmail` varchar(320) NOT NULL,
	`templateId` int,
	`subject` varchar(500) NOT NULL,
	`htmlContent` text NOT NULL,
	`textContent` text,
	`templateVariables` json,
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`scheduledAt` timestamp,
	`status` enum('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`lastAttemptAt` timestamp,
	`sentAt` timestamp,
	`errorMessage` text,
	`messageId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`htmlContent` text NOT NULL,
	`textContent` text,
	`variables` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_templateKey_unique` UNIQUE(`templateKey`)
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`resendCount` int DEFAULT 0,
	`lastResendAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verifications_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `exchange_connections` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`exchange` enum('binance','coinbase','alpaca','interactive_brokers') NOT NULL,
	`status` enum('connected','disconnected','error','pending') NOT NULL DEFAULT 'pending',
	`apiKeyEncrypted` text,
	`apiSecretEncrypted` text,
	`passphraseEncrypted` text,
	`accountId` varchar(64),
	`permissions` json,
	`error` text,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchange_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchange_orders` (
	`id` varchar(64) NOT NULL,
	`connectionId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`exchangeOrderId` varchar(128),
	`exchange` enum('binance','coinbase','alpaca','interactive_brokers') NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`orderType` enum('market','limit','stop','stop_limit') NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`price` decimal(18,8),
	`stopPrice` decimal(18,8),
	`filledQuantity` decimal(18,8) NOT NULL DEFAULT '0',
	`avgFillPrice` decimal(18,8),
	`status` enum('pending','open','filled','partially_filled','cancelled','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchange_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`jobType` varchar(50) NOT NULL,
	`status` enum('completed','failed') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp NOT NULL,
	`durationMs` int NOT NULL,
	`payload` json,
	`result` json,
	`errorMessage` text,
	`itemsProcessed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`tradeId` varchar(64),
	`symbol` varchar(20) NOT NULL,
	`side` enum('long','short') NOT NULL,
	`entryPrice` decimal(18,8) NOT NULL,
	`exitPrice` decimal(18,8),
	`quantity` decimal(18,8) NOT NULL,
	`entryDate` timestamp NOT NULL,
	`exitDate` timestamp,
	`setup` enum('breakout','pullback','reversal','trend_following','range_bound','news_based','technical','fundamental','other') NOT NULL DEFAULT 'other',
	`emotionBefore` enum('confident','anxious','greedy','fearful','neutral','excited','frustrated','calm') NOT NULL DEFAULT 'neutral',
	`emotionDuring` enum('confident','anxious','greedy','fearful','neutral','excited','frustrated','calm'),
	`emotionAfter` enum('confident','anxious','greedy','fearful','neutral','excited','frustrated','calm'),
	`confidenceLevel` int NOT NULL DEFAULT 5,
	`planFollowed` boolean NOT NULL DEFAULT true,
	`notes` text NOT NULL,
	`lessonsLearned` text,
	`mistakes` json,
	`tags` json,
	`screenshots` json,
	`outcome` enum('win','loss','breakeven','open') DEFAULT 'open',
	`pnl` decimal(18,2),
	`pnlPercent` decimal(8,4),
	`riskRewardRatio` decimal(6,2),
	`holdingPeriod` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('openai','deepseek','claude','gemini') NOT NULL,
	`model` varchar(100) NOT NULL,
	`promptTokens` int NOT NULL,
	`completionTokens` int NOT NULL,
	`totalTokens` int NOT NULL,
	`costCents` int NOT NULL,
	`analysisType` enum('technical','fundamental','sentiment','risk','microstructure','macro','quant','consensus'),
	`symbol` varchar(20),
	`wasFallback` boolean NOT NULL DEFAULT false,
	`originalProvider` enum('openai','deepseek','claude','gemini'),
	`fallbackReason` varchar(255),
	`responseTimeMs` int,
	`success` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `llm_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('momentum','mean_reversion','trend_following','arbitrage','ml_based','other') NOT NULL,
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`subscriptionPrice` decimal(10,2),
	`totalCopies` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(18,2) NOT NULL DEFAULT '0.00',
	`rating` decimal(3,2),
	`reviewCount` int NOT NULL DEFAULT 0,
	`monthlyReturn` decimal(10,4),
	`monthlyTrades` int,
	`winRate` decimal(10,4),
	`accuracyScore` decimal(5,4),
	`totalPredictions` int NOT NULL DEFAULT 0,
	`correctPredictions` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_trading_accounts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`initialBalance` decimal(18,2) NOT NULL,
	`currentBalance` decimal(18,2) NOT NULL,
	`totalEquity` decimal(18,2) NOT NULL,
	`totalPnL` decimal(18,2) NOT NULL DEFAULT '0',
	`totalPnLPercent` decimal(10,4) NOT NULL DEFAULT '0',
	`totalTrades` int NOT NULL DEFAULT 0,
	`winningTrades` int NOT NULL DEFAULT 0,
	`losingTrades` int NOT NULL DEFAULT 0,
	`winRate` decimal(10,4) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_trading_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_trading_history` (
	`id` varchar(64) NOT NULL,
	`accountId` varchar(64) NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` enum('stock','crypto') NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`price` decimal(18,8) NOT NULL,
	`commission` decimal(18,8) NOT NULL,
	`pnl` decimal(18,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_trading_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_trading_orders` (
	`id` varchar(64) NOT NULL,
	`accountId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` enum('stock','crypto') NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`type` enum('market','limit','stop_loss','take_profit','stop_limit') NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`price` decimal(18,8),
	`stopPrice` decimal(18,8),
	`takeProfitPrice` decimal(18,8),
	`stopLossPrice` decimal(18,8),
	`status` enum('pending','filled','partially_filled','cancelled','expired','rejected') NOT NULL DEFAULT 'pending',
	`filledQuantity` decimal(18,8) NOT NULL DEFAULT '0',
	`filledPrice` decimal(18,8),
	`commission` decimal(18,8) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp,
	CONSTRAINT `paper_trading_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_trading_positions` (
	`id` varchar(64) NOT NULL,
	`accountId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` enum('stock','crypto') NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`averagePrice` decimal(18,8) NOT NULL,
	`currentPrice` decimal(18,8) NOT NULL,
	`marketValue` decimal(18,2) NOT NULL,
	`unrealizedPnL` decimal(18,2) NOT NULL,
	`unrealizedPnLPercent` decimal(10,4) NOT NULL,
	`realizedPnL` decimal(18,2) NOT NULL DEFAULT '0',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_trading_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportType` enum('weekly','monthly','quarterly','annual') NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`totalTrades` int NOT NULL DEFAULT 0,
	`winningTrades` int NOT NULL DEFAULT 0,
	`losingTrades` int NOT NULL DEFAULT 0,
	`winRate` decimal(5,4),
	`totalProfitLoss` decimal(18,2),
	`percentageReturn` decimal(8,4),
	`maxDrawdown` decimal(8,4),
	`sharpeRatio` decimal(6,4),
	`totalPredictions` int NOT NULL DEFAULT 0,
	`correctPredictions` int NOT NULL DEFAULT 0,
	`predictionAccuracy` decimal(5,4),
	`benchmarkReturn` decimal(8,4),
	`alphaGenerated` decimal(8,4),
	`summaryHtml` text,
	`detailedJson` json,
	`emailSent` boolean NOT NULL DEFAULT false,
	`emailSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`totalValue` decimal(18,2) NOT NULL,
	`cashBalance` decimal(18,2) NOT NULL,
	`positions` json NOT NULL,
	`dailyPnl` decimal(18,2),
	`dailyReturn` decimal(10,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_value_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`totalValue` decimal(18,2) NOT NULL,
	`cashBalance` decimal(18,2) NOT NULL,
	`positionsValue` decimal(18,2) NOT NULL,
	`valueChange` decimal(18,2),
	`percentChange` decimal(8,4),
	`snapshotType` enum('realtime','hourly','daily','weekly') NOT NULL DEFAULT 'realtime',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_value_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prediction_accuracy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`agentType` enum('technical','fundamental','sentiment','risk','microstructure','macro','quant','consensus'),
	`symbol` varchar(20),
	`timeframe` enum('1day','7day','30day') NOT NULL,
	`totalPredictions` int NOT NULL DEFAULT 0,
	`correctPredictions` int NOT NULL DEFAULT 0,
	`accuracyRate` decimal(5,4),
	`avgConfidence` decimal(5,4),
	`avgReturn` decimal(10,4),
	`buyAccuracy` decimal(5,4),
	`sellAccuracy` decimal(5,4),
	`holdAccuracy` decimal(5,4),
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prediction_accuracy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` enum('stock','crypto') NOT NULL,
	`alertType` enum('price_above','price_below','percent_change','volume_spike') NOT NULL,
	`targetValue` decimal(18,8) NOT NULL,
	`currentValue` decimal(18,8),
	`message` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`isTriggered` boolean NOT NULL DEFAULT false,
	`triggeredAt` timestamp,
	`notifyEmail` boolean NOT NULL DEFAULT true,
	`notifyPush` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`priceAtRecommendation` decimal(18,6) NOT NULL,
	`recommendedAction` enum('strong_buy','buy','hold','sell','strong_sell') NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`price1Day` decimal(18,6),
	`price3Day` decimal(18,6),
	`price7Day` decimal(18,6),
	`price14Day` decimal(18,6),
	`price30Day` decimal(18,6),
	`return1Day` decimal(10,4),
	`return3Day` decimal(10,4),
	`return7Day` decimal(10,4),
	`return14Day` decimal(10,4),
	`return30Day` decimal(10,4),
	`wasAccurate1Day` boolean,
	`wasAccurate7Day` boolean,
	`wasAccurate30Day` boolean,
	`recommendedAt` timestamp NOT NULL,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realtime_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`socketId` varchar(100),
	`subscriptionType` enum('price','portfolio','bot_status','analysis','notifications') NOT NULL,
	`symbols` json,
	`botIds` json,
	`accountIds` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastHeartbeat` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `realtime_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regime_alerts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`fromRegime` enum('bull','bear','sideways','volatile'),
	`toRegime` enum('bull','bear','sideways','volatile') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`isTriggered` boolean NOT NULL DEFAULT false,
	`triggeredAt` timestamp,
	`notifyEmail` boolean NOT NULL DEFAULT true,
	`notifyPush` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regime_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rl_agent_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`modelData` json NOT NULL,
	`config` json,
	`totalEpisodes` int NOT NULL DEFAULT 0,
	`avgReward` decimal(18,6),
	`bestReward` decimal(18,6),
	`winRate` decimal(5,4),
	`sharpeRatio` decimal(10,4),
	`status` enum('training','ready','deployed','archived') NOT NULL DEFAULT 'training',
	`lastTrainedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rl_agent_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rl_experiences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`state` json NOT NULL,
	`action` int NOT NULL,
	`reward` decimal(18,6) NOT NULL,
	`nextState` json NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`symbol` varchar(20),
	`price` decimal(18,6),
	CONSTRAINT `rl_experiences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rl_training_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`episode` int NOT NULL,
	`totalReward` decimal(18,6) NOT NULL,
	`avgLoss` decimal(18,6),
	`steps` int NOT NULL,
	`trades` int NOT NULL DEFAULT 0,
	`winningTrades` int NOT NULL DEFAULT 0,
	`totalReturn` decimal(10,4),
	`maxDrawdown` decimal(10,4),
	`epsilon` decimal(5,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rl_training_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_comparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`analysisIds` json NOT NULL,
	`symbolsIncluded` json,
	`dateRange` json,
	`isPinned` boolean NOT NULL DEFAULT false,
	`lastViewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_comparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sentiment_alerts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`alertType` enum('sentiment_bullish','sentiment_bearish','fear_greed_extreme','sentiment_shift') NOT NULL,
	`threshold` decimal(10,4),
	`isActive` boolean NOT NULL DEFAULT true,
	`isTriggered` boolean NOT NULL DEFAULT false,
	`triggeredAt` timestamp,
	`notifyEmail` boolean NOT NULL DEFAULT true,
	`notifyPush` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sentiment_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_comparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`symbol` varchar(20) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`initialCapital` decimal(18,2) NOT NULL,
	`strategies` json NOT NULL,
	`results` json,
	`winner` varchar(50),
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `strategy_comparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`helpfulCount` int NOT NULL DEFAULT 0,
	`isVerifiedPurchase` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategy_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`botId` int,
	`symbol` varchar(20) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`type` enum('market','limit','stop','stop_limit') NOT NULL,
	`status` enum('pending','filled','partial','canceled','rejected') NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`price` decimal(18,8),
	`filledPrice` decimal(18,8),
	`filledQuantity` decimal(18,8),
	`pnl` decimal(18,2),
	`fees` decimal(18,4) DEFAULT '0.00',
	`agentAnalysis` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`filledAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('paper','live') NOT NULL DEFAULT 'paper',
	`balance` decimal(18,2) NOT NULL DEFAULT '100000.00',
	`initialBalance` decimal(18,2) NOT NULL DEFAULT '100000.00',
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`isActive` boolean NOT NULL DEFAULT true,
	`brokerConnection` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_bots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','paused','stopped','error') NOT NULL DEFAULT 'stopped',
	`strategy` json NOT NULL,
	`symbols` json NOT NULL,
	`riskSettings` json NOT NULL,
	`totalTrades` int NOT NULL DEFAULT 0,
	`winningTrades` int NOT NULL DEFAULT 0,
	`totalPnl` decimal(18,2) NOT NULL DEFAULT '0.00',
	`sharpeRatio` decimal(10,4),
	`maxDrawdown` decimal(10,4),
	`isPublic` boolean NOT NULL DEFAULT false,
	`copyCount` int NOT NULL DEFAULT 0,
	`rating` decimal(3,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_bots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeId` varchar(50) NOT NULL,
	`badgeName` varchar(100) NOT NULL,
	`badgeDescription` text,
	`badgeIcon` varchar(100),
	`badgeColor` varchar(20),
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	`earnedReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_email_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`botExecutionComplete` boolean NOT NULL DEFAULT true,
	`botExecutionError` boolean NOT NULL DEFAULT true,
	`priceTargetAlert` boolean NOT NULL DEFAULT true,
	`recommendationChange` boolean NOT NULL DEFAULT true,
	`weeklyReport` boolean NOT NULL DEFAULT true,
	`monthlyReport` boolean NOT NULL DEFAULT true,
	`marketingEmails` boolean NOT NULL DEFAULT false,
	`digestFrequency` enum('immediate','hourly','daily','weekly') NOT NULL DEFAULT 'immediate',
	`quietHoursStart` varchar(5),
	`quietHoursEnd` varchar(5),
	`timezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`isUnsubscribed` boolean NOT NULL DEFAULT false,
	`unsubscribedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_email_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_fallback_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fallbackEnabled` boolean NOT NULL DEFAULT true,
	`fallbackPriority` json,
	`maxRetries` int DEFAULT 2,
	`retryDelayMs` int DEFAULT 1000,
	`notifyOnFallback` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_fallback_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_fallback_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`notifyOnTrade` boolean NOT NULL DEFAULT false,
	`notifyOnAnalysis` boolean NOT NULL DEFAULT true,
	`notifyOnStrategy` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_llm_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activeProvider` enum('openai','deepseek','claude','gemini') NOT NULL DEFAULT 'openai',
	`openaiApiKey` text,
	`deepseekApiKey` text,
	`claudeApiKey` text,
	`geminiApiKey` text,
	`openaiModel` varchar(100) DEFAULT 'gpt-4-turbo',
	`deepseekModel` varchar(100) DEFAULT 'deepseek-reasoner',
	`claudeModel` varchar(100) DEFAULT 'claude-sonnet-4-20250514',
	`geminiModel` varchar(100) DEFAULT 'gemini-2.0-flash',
	`temperature` decimal(3,2) DEFAULT '0.7',
	`maxTokens` int DEFAULT 4096,
	`totalTokensUsed` int DEFAULT 0,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_llm_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_llm_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('info','success','warning','error','alert','trade','analysis','social') NOT NULL,
	`category` enum('system','trading','analysis','social','billing') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`actionUrl` varchar(500),
	`actionLabel` varchar(100),
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`isPinned` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`bio` text,
	`avatarUrl` varchar(500),
	`location` varchar(100),
	`website` varchar(255),
	`twitterHandle` varchar(50),
	`isPublic` boolean NOT NULL DEFAULT true,
	`showTradingStats` boolean NOT NULL DEFAULT true,
	`showPortfolio` boolean NOT NULL DEFAULT false,
	`allowFollowers` boolean NOT NULL DEFAULT true,
	`totalTrades` int NOT NULL DEFAULT 0,
	`winRate` decimal(5,4),
	`totalReturn` decimal(10,4),
	`avgReturn` decimal(10,4),
	`bestTrade` decimal(10,4),
	`worstTrade` decimal(10,4),
	`sharpeRatio` decimal(10,4),
	`followersCount` int NOT NULL DEFAULT 0,
	`followingCount` int NOT NULL DEFAULT 0,
	`strategiesShared` int NOT NULL DEFAULT 0,
	`reputationScore` int NOT NULL DEFAULT 0,
	`badges` json,
	`lastActiveAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`subscriptionTier` enum('free','starter','pro','elite') NOT NULL DEFAULT 'free',
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`subscriptionStatus` enum('active','canceled','past_due','trialing','incomplete') DEFAULT 'active',
	`subscriptionEndsAt` timestamp,
	`isEmailVerified` boolean NOT NULL DEFAULT false,
	`emailVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `watchlist_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`alertOnRecommendationChange` boolean NOT NULL DEFAULT true,
	`alertOnConfidenceChange` boolean NOT NULL DEFAULT false,
	`confidenceThreshold` decimal(5,4) DEFAULT '0.1',
	`alertOnPriceTarget` boolean NOT NULL DEFAULT false,
	`priceTargetHigh` decimal(18,6),
	`priceTargetLow` decimal(18,6),
	`emailNotification` boolean NOT NULL DEFAULT true,
	`pushNotification` boolean NOT NULL DEFAULT true,
	`lastRecommendation` enum('strong_buy','buy','hold','sell','strong_sell'),
	`lastConfidence` decimal(5,4),
	`lastPrice` decimal(18,6),
	`lastAlertAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `watchlist_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`symbols` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `watchlists_id` PRIMARY KEY(`id`)
);
