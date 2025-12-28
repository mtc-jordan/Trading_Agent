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
ALTER TABLE `alert_history` MODIFY COLUMN `alertType` enum('recommendation_change','confidence_change','price_target','bot_status','analysis_complete','price','regime','sentiment') NOT NULL;--> statement-breakpoint
ALTER TABLE `alert_history` MODIFY COLUMN `title` varchar(255);--> statement-breakpoint
ALTER TABLE `alert_history` ADD `uniqueId` varchar(64);--> statement-breakpoint
ALTER TABLE `alert_history` ADD `alertIdStr` varchar(64);--> statement-breakpoint
ALTER TABLE `alert_history` ADD `details` json;--> statement-breakpoint
ALTER TABLE `alert_history` ADD `isRead` boolean DEFAULT false NOT NULL;