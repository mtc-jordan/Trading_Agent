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
	`isActive` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
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
CREATE TABLE `watchlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`symbols` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `watchlists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','starter','pro','elite') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing','incomplete') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionEndsAt` timestamp;