CREATE TABLE `feed_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text DEFAULT 'rss' NOT NULL,
	`topic_tags` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`tags` text,
	`source` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feed_source_id` integer,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`summary` text,
	`published_at` integer,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`feed_source_id`) REFERENCES `feed_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_items_url_unique` ON `news_items` (`url`);