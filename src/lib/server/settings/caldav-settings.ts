import { z } from "zod";
import { SettingsRepository } from "./settings-repository";

const CALDAV_KEY = "caldav";

export const TASKS_ORG_CALDAV_URL = "https://caldav.tasks.org";

export const calDavConfigSchema = z.object({
	url: z.url().transform((url) => url.replace(/\/+$/, "")),
	username: z.string().min(1),
	password: z.string().min(1),
});
export type CalDavConfig = z.infer<typeof calDavConfigSchema>;

/** Persists the CalDAV account (tasks.org or any other server) set through Settings. */
export class CalDavSettings {
	constructor(
		private readonly repository: SettingsRepository = new SettingsRepository(),
	) {}

	get(): CalDavConfig | null {
		const raw = this.repository.get(CALDAV_KEY);
		if (!raw) {
			return null;
		}

		try {
			const parsed = calDavConfigSchema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	}

	set(config: CalDavConfig): void {
		this.repository.set(CALDAV_KEY, JSON.stringify(config));
	}

	clear(): void {
		this.repository.delete(CALDAV_KEY);
	}
}
