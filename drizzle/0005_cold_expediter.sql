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
CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`alertType` enum('recommendation_change','confidence_change','price_target','bot_status','analysis_complete') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`previousValue` varchar(100),
	`newValue` varchar(100),
	`emailSent` boolean NOT NULL DEFAULT false,
	`pushSent` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_history_id` PRIMARY KEY(`id`)
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
