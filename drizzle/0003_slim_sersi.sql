ALTER TABLE `project_items` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `project_items` ADD `archived` integer DEFAULT false NOT NULL;