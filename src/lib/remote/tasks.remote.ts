import { error } from "@sveltejs/kit";
import { z } from "zod";
import { CalDavClient, CalDavError } from "#lib/server/monitoring/caldav.ts";
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

const taskSchema = z.object({
	title: z.string().trim().min(1).max(500),
	due: z.union([z.iso.date(), z.iso.datetime()]).nullable(),
	priority: z.number().int().min(0).max(9),
});

async function writeTask(action: string, write: () => Promise<void>) {
	try {
		await write();
	} catch (cause) {
		console.error(`Couldn't ${action} the task:`, cause);
		if (cause instanceof CalDavError && cause.status === 412) {
			monitoringService.clearCache("tasks");
			error(
				409,
				"This task changed on another device. The list is refreshed, try again",
			);
		}
		error(502, `Couldn't ${action} the task`);
	}
}

export const addTask = command(
	taskSchema.extend({ listUrl: z.string() }),
	({ listUrl, ...task }) =>
		writeTask("add", () => monitoringService.addTask(listUrl, task)),
);

export const updateTask = command(
	taskSchema.extend({ uid: z.string() }),
	({ uid, ...task }) =>
		writeTask("update", () => monitoringService.updateTask(uid, task)),
);

export const deleteTask = command(z.string(), (uid) =>
	writeTask("delete", () => monitoringService.deleteTask(uid)),
);
