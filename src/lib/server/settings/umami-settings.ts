import { z } from "zod";
import { SettingsRepository } from "./settings-repository";

const UMAMI_KEY = "umami";

export const umamiConfigSchema = z.object({
	host: z.url().transform((host) => host.replace(/\/+$/, "")),
	apiKey: z.string().min(1),
	/** Domains to show, in order; empty shows every website. */
	websites: z.array(z.string()),
});
export type UmamiConfig = z.infer<typeof umamiConfigSchema>;

/** "a.com, B.com,," -> ["a.com", "b.com"] */
export function parseDomains(input: string): string[] {
	return input
		.split(",")
		.map((domain) => domain.trim().toLowerCase())
		.filter(Boolean);
}

/** Persists the Umami connection set through Settings. */
export class UmamiSettings {
	constructor(
		private readonly repository: SettingsRepository = new SettingsRepository(),
	) {}

	get(): UmamiConfig | null {
		const raw = this.repository.get(UMAMI_KEY);
		if (!raw) {
			return null;
		}

		try {
			const parsed = umamiConfigSchema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	}

	set(config: UmamiConfig): void {
		this.repository.set(UMAMI_KEY, JSON.stringify(config));
	}

	clear(): void {
		this.repository.delete(UMAMI_KEY);
	}
}
