import { z } from "zod";
import { SettingsRepository } from "./settings-repository";

const GITHUB_KEY = "github";

/** Ties the manifest round trip to github.com back to the browser that started it. */
export const GITHUB_STATE_COOKIE = "bercail_github_state";

export const githubConfigSchema = z.object({
	appId: z.number(),
	slug: z.string().min(1),
	/** The app's page on github.com, e.g. https://github.com/apps/my-bercail. */
	htmlUrl: z.url(),
	privateKey: z.string().min(1),
});
export type GithubConfig = z.infer<typeof githubConfigSchema>;

/** Persists the GitHub App registered from Settings through the manifest flow. */
export class GithubSettings {
	constructor(
		private readonly repository: SettingsRepository = new SettingsRepository(),
	) {}

	get(): GithubConfig | null {
		const raw = this.repository.get(GITHUB_KEY);
		if (!raw) {
			return null;
		}

		try {
			const parsed = githubConfigSchema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	}

	set(config: GithubConfig): void {
		this.repository.set(GITHUB_KEY, JSON.stringify(config));
	}

	clear(): void {
		this.repository.delete(GITHUB_KEY);
	}
}
