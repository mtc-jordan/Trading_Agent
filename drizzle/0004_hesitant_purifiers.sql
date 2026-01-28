CREATE TABLE `broker_activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`connectionId` varchar(64),
	`activityType` enum('connect','disconnect','order_placed','order_filled','order_cancelled','order_rejected','position_opened','position_closed','deposit','withdrawal','dividend','split','error') NOT NULL,
	`symbol` varchar(50),
	`orderId` varchar(64),
	`description` text,
	`metadata` json,
	`success` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broker_activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broker_watchlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`connectionId` varchar(64),
	`name` varchar(100) NOT NULL,
	`symbols` json NOT NULL,
	`brokerWatchlistId` varchar(100),
	`isSynced` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broker_watchlists_id` PRIMARY KEY(`id`)
);
