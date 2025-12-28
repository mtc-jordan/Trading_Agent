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
