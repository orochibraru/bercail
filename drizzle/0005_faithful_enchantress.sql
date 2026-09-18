CREATE TABLE `settings_table` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `items_table` ADD `isUptimeMonitor` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `items_table` ADD `uptimeCheckUrl` text;