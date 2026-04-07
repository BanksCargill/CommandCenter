ALTER TABLE `chelsea_matches` ADD `team` text DEFAULT 'chelsea' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_chelsea_team` ON `chelsea_matches` (`team`);