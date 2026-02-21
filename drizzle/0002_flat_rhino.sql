CREATE TABLE `match_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`identity` enum('customer','merchant') NOT NULL,
	`messages` text NOT NULL,
	`collectedInfo` text,
	`isMatched` boolean NOT NULL DEFAULT false,
	`matchResult` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`identity` enum('customer','merchant') NOT NULL DEFAULT 'customer',
	`name` varchar(100),
	`area` varchar(200),
	`profileJson` text,
	`needsHistory` text,
	`matchHistory` text,
	`totalMatches` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_phone_unique` UNIQUE(`phone`)
);
