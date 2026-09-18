import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const groupsTable = sqliteTable("groups_table", {
	id: text().primaryKey(),
	title: text().notNull(),
	description: text(),
	sortOrder: int().notNull().default(0),
});

export const itemsTable = sqliteTable("items_table", {
	id: text().primaryKey(),
	title: text().notNull(),
	description: text(),
	url: text().notNull(),
	target: text().notNull(),
	icon: text(),
	color: text(),
	groupId: text()
		.notNull()
		.references(() => groupsTable.id, { onDelete: "cascade" }),
	sortOrder: int().notNull().default(0),
});

export const settingsTable = sqliteTable("settings_table", {
	key: text().primaryKey(),
	value: text().notNull(),
});
