import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { itemsTable } from "#lib/server/db/schema.ts";

// Database schemas derived from Drizzle
export const itemSchema = createInsertSchema(itemsTable, {
	id: (schema) => schema.min(1, "Missing item ID."),
	title: (schema) => schema.min(1, "Please enter a title."),
	url: (schema) =>
		schema.min(1, "Please enter a URL.").url("The url is badly formatted."),
	target: (schema) => schema.min(1, "Please select a target."),
	groupId: (schema) => schema.min(1, "Missing Group"),
});

export type Item = z.infer<typeof itemSchema>;

export const groupSchema = z.object({
	id: z.string().min(1, "Missing item ID."),
	title: z.string().min(1, "Please enter a title"),
	description: z.string().optional(),
	items: z.array(itemSchema),
});

export type Group = z.infer<typeof groupSchema>;

const optionalText = z.string().trim().optional();

// Form submissions only carry strings, so these mirror the editable fields rather than the table.
export const groupFormSchema = z.object({
	action: z.enum(["create", "edit"]),
	id: z.string().min(1, "Missing group ID."),
	title: z.string().trim().min(1, "Please enter a title."),
	description: optionalText,
});

export const itemFormSchema = z.object({
	action: z.enum(["create", "edit"]),
	id: z.string().min(1, "Missing item ID."),
	groupId: z.string().min(1, "Missing group."),
	title: z.string().trim().min(1, "Please enter a title."),
	url: z.url("The URL is badly formatted."),
	description: optionalText,
	target: z.enum(["_self", "_blank"]),
	icon: optionalText,
});

export const backupFileSchema = z.object({
	version: z.string(),
	timestamp: z.string(),
	data: z.object({ groups: z.array(groupSchema) }),
});

export type BackupFile = z.infer<typeof backupFileSchema>;

export const restoreResultSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	groupsRestored: z.number(),
	itemsRestored: z.number(),
});

export type RestoreResult = z.infer<typeof restoreResultSchema>;

export const reorderPayloadSchema = z.object({
	groups: z.array(
		z.object({
			groupId: z.string(),
			itemIds: z.array(z.string()),
		}),
	),
});

export type ReorderPayload = z.infer<typeof reorderPayloadSchema>;

export const reorderGroupsSchema = z.array(z.string().min(1));
