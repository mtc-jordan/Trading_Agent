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
