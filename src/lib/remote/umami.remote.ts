import { error } from "@sveltejs/kit";
import { z } from "zod";
import { UmamiClient } from "#lib/server/monitoring/umami.ts";
import {
	parseDomains,
	UmamiSettings,
	umamiConfigSchema,
} from "#lib/server/settings/umami-settings.ts";
import { command, query } from "$app/server";

const umamiSettings = new UmamiSettings();

/** The API key never leaves the server; the page only learns whether one is saved. */
export const getUmamiSettings = query(() => {
	const config = umamiSettings.get();
	return config
		? {
				host: config.host,
				websites: config.websites.join(", "),
				hasApiKey: true,
			}
		: null;
});

export const saveUmamiSettings = command(
	z.object({
		host: z.string(),
		/** Blank keeps the saved key. */
		apiKey: z.string(),
		websites: z.string(),
	}),
	async ({ host, apiKey, websites }) => {
		const parsed = umamiConfigSchema.safeParse({
			host: host.trim(),
			apiKey: apiKey.trim() || umamiSettings.get()?.apiKey,
			websites: parseDomains(websites),
		});
		if (!parsed.success) {
			error(400, "Enter a valid URL and an API key");
		}

		try {
			await new UmamiClient(parsed.data, 0).getStats();
		} catch (cause) {
			console.error("Umami connection test failed:", cause);
			error(400, "Couldn't reach Umami with this URL and API key");
		}
		umamiSettings.set(parsed.data);
	},
);

export const clearUmamiSettings = command(() => {
	umamiSettings.clear();
});
