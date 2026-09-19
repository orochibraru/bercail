import { error } from "@sveltejs/kit";
import { z } from "zod";
import { SECTIONS } from "#lib/layout.ts";
import {
	backupFileSchema,
	groupFormSchema,
	itemFormSchema,
	reorderGroupsSchema,
	reorderPayloadSchema,
} from "#lib/model.ts";
import { Dashboard } from "#lib/server/dashboard.ts";
import { LayoutSettings } from "#lib/server/settings/layout-settings.ts";
import { command, form } from "$app/server";

const dashboard = new Dashboard();

export const saveGroup = form(groupFormSchema, ({ action, ...group }) => {
	if (action === "edit") {
		dashboard.editGroupInfo(group);
	} else {
		dashboard.createGroup({ ...group, items: [] });
	}
});

export const saveItem = form(itemFormSchema, ({ action, ...item }) => {
	if (action === "edit") {
		dashboard.editItem(item);
	} else {
		dashboard.createItem(item);
	}
});

export const deleteGroup = command(z.string().min(1), (groupId) => {
	dashboard.deleteGroup({ groupId });
});

export const deleteItem = command(z.string().min(1), (itemId) => {
	dashboard.deleteItem({ itemId });
});

export const reorderItems = command(reorderPayloadSchema, ({ groups }) => {
	dashboard.reorderItems(groups);
});

export const reorderGroups = command(reorderGroupsSchema, (groupIds) => {
	dashboard.reorderGroups(groupIds);
});

export const exportBackup = command(() => ({
	version: "1.0",
	timestamp: new Date().toISOString(),
	data: dashboard.getFullDashboard(),
}));

export const restoreBackup = command(backupFileSchema, (backup) => {
	try {
		return dashboard.restoreBackup(backup);
	} catch (cause) {
		console.error("Restore failed:", cause);
		error(500, "Failed to restore backup");
	}
});

export const saveLayout = command(z.array(z.enum(SECTIONS)), (layout) => {
	new LayoutSettings().set(layout);
});
