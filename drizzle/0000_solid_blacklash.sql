CREATE TABLE `config_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_name` text NOT NULL,
	`app_description` text
);
--> statement-breakpoint
CREATE TABLE `groups_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `items_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`icon` text,
	`color` text,
	`groupId` integer NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `groups_table`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `search_engines_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`baseUrl` text NOT NULL,
	`queryParam` text NOT NULL
);
