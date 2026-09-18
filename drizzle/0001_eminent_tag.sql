PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_items_table` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`target` text NOT NULL,
	`icon` text,
	`color` text,
	`groupId` text NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `groups_table`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_items_table`("id", "title", "description", "url", "target", "icon", "color", "groupId") SELECT "id", "title", "description", "url", "target", "icon", "color", "groupId" FROM `items_table`;--> statement-breakpoint
DROP TABLE `items_table`;--> statement-breakpoint
ALTER TABLE `__new_items_table` RENAME TO `items_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_config_table` (
	`id` text PRIMARY KEY NOT NULL,
	`app_title` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_config_table`("id", "app_title") SELECT "id", "app_title" FROM `config_table`;--> statement-breakpoint
DROP TABLE `config_table`;--> statement-breakpoint
ALTER TABLE `__new_config_table` RENAME TO `config_table`;--> statement-breakpoint
CREATE TABLE `__new_groups_table` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_groups_table`("id", "title", "description") SELECT "id", "title", "description" FROM `groups_table`;--> statement-breakpoint
DROP TABLE `groups_table`;--> statement-breakpoint
ALTER TABLE `__new_groups_table` RENAME TO `groups_table`;--> statement-breakpoint
CREATE TABLE `__new_search_engines_table` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_search_engines_table`("id", "name") SELECT "id", "name" FROM `search_engines_table`;--> statement-breakpoint
DROP TABLE `search_engines_table`;--> statement-breakpoint
ALTER TABLE `__new_search_engines_table` RENAME TO `search_engines_table`;