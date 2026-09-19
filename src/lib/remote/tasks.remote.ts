import { error } from "@sveltejs/kit";
import { z } from "zod";
import { CalDavClient } from "#lib/server/monitoring/caldav.ts";
import { monitoringService } from "#lib/server/monitoring/index.ts";
import {
	CalDavSettings,
	calDavConfigSchema,
	TASKS_ORG_CALDAV_URL,
} from "#lib/server/settings/caldav-settings.ts";
import { command, query } from "$app/server";

const calDavSettings = new CalDavSettings();

/** The password never leaves the server; the page only learns whether one is saved. */
export const getTasksSettings = query(() => {
	const config = calDavSettings.get();
	return config
		? { url: config.url, username: config.username, hasPassword: true }
		: { url: TASKS_ORG_CALDAV_URL, username: "", hasPassword: false };
});

export const saveTasksSettings = command(
	z.object({
		url: z.string(),
		username: z.string(),
		/** Blank keeps the saved password. */
		password: z.string(),
	}),
	async ({ url, username, password }) => {
		const parsed = calDavConfigSchema.safeParse({
			url: url.trim(),
			username: username.trim(),
			password: password.trim() || calDavSettings.get()?.password,
		});
		if (!parsed.success) {
			error(400, "Enter a valid URL, a username and a password");
		}

		try {
			await new CalDavClient(parsed.data, 0).getSnapshot();
		} catch (cause) {
			console.error("CalDAV connection test failed:", cause);
			error(400, "Couldn't read tasks with this URL, username and password");
		}
		calDavSettings.set(parsed.data);
	},
);

export const clearTasksSettings = command(() => {
	calDavSettings.clear();
});

export const addTask = command(
	z.object({
		listUrl: z.string(),
		title: z.string().trim().min(1).max(500),
		due: z.union([z.iso.date(), z.iso.datetime()]).nullable(),
		priority: z.number().int().min(0).max(9),
	}),
	async ({ listUrl, ...task }) => {
		try {
			await monitoringService.addTask(listUrl, task);
		} catch (cause) {
			console.error("Adding a task failed:", cause);
			error(502, "Couldn't add the task");
		}
	},
);
