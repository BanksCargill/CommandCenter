CREATE TABLE `chelsea_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text,
	`match_date` integer NOT NULL,
	`opponent` text NOT NULL,
	`competition` text NOT NULL,
	`venue` text DEFAULT 'home' NOT NULL,
	`result` text DEFAULT 'upcoming' NOT NULL,
	`score` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chelsea_matches_external_id_unique` ON `chelsea_matches` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_chelsea_date` ON `chelsea_matches` (`match_date`);