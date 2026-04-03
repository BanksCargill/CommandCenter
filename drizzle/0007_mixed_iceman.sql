CREATE INDEX `idx_news_published` ON `news_items` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_news_source` ON `news_items` (`feed_source_id`);--> statement-breakpoint
CREATE INDEX `idx_news_fetched` ON `news_items` (`fetched_at`);--> statement-breakpoint
CREATE INDEX `idx_items_project` ON `project_items` (`project_id`);