CREATE TABLE `uptime_checks_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitorKey` text NOT NULL,
	`checkedAt` integer NOT NULL,
	`isUp` integer NOT NULL,
	`latencyMs` integer
);
--> statement-breakpoint
CREATE INDEX `uptime_checks_monitor_time_idx` ON `uptime_checks_table` (`monitorKey`,`checkedAt`);