ALTER TABLE `groups_table` ADD `sortOrder` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `groups_table` SET `sortOrder` = rowid;
