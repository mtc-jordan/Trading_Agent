CREATE TABLE `scenario_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`userId` int NOT NULL,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenario_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenario_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenario_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shared_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`scenarioData` json NOT NULL,
	`trades` json NOT NULL,
	`positions` json,
	`cash` decimal(18,2) DEFAULT '0',
	`category` varchar(50) DEFAULT 'general',
	`tags` json,
	`isPublic` boolean DEFAULT true,
	`likesCount` int DEFAULT 0,
	`importsCount` int DEFAULT 0,
	`viewsCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shared_scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` varchar(100) NOT NULL,
	`snapshotDate` date NOT NULL,
	`portfolioValue` decimal(18,2) NOT NULL,
	`dailyReturn` decimal(10,6),
	`cumulativeReturn` decimal(10,6),
	`volatility` decimal(10,6),
	`sharpeRatio` decimal(10,4),
	`maxDrawdown` decimal(10,6),
	`winRate` decimal(10,4),
	`totalTrades` int DEFAULT 0,
	`positions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_performance_id` PRIMARY KEY(`id`)
);
