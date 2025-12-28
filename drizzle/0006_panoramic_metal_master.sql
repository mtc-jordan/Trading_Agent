ALTER TABLE `marketplace_listings` ADD `accuracyScore` decimal(5,4);--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `totalPredictions` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `correctPredictions` int DEFAULT 0 NOT NULL;