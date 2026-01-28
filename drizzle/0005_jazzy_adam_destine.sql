CREATE TABLE `user_routing_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`preferredStockBroker` enum('alpaca','interactive_brokers'),
	`preferredCryptoBroker` enum('binance','coinbase','alpaca'),
	`preferredForexBroker` enum('interactive_brokers'),
	`preferredOptionsBroker` enum('interactive_brokers'),
	`enableSmartRouting` boolean NOT NULL DEFAULT true,
	`prioritizeLowFees` boolean NOT NULL DEFAULT false,
	`prioritizeFastExecution` boolean NOT NULL DEFAULT false,
	`allowFallback` boolean NOT NULL DEFAULT true,
	`confirmBeforeRouting` boolean NOT NULL DEFAULT true,
	`showRoutingDecision` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_routing_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_routing_preferences_userId_unique` UNIQUE(`userId`)
);
