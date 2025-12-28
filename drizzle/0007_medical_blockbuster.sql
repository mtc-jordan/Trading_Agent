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
