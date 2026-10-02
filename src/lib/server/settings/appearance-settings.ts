import { type Appearance, normalizeAppearance } from "#lib/appearance.ts";
import { SettingsRepository } from "./settings-repository";

const APPEARANCE_KEY = "appearance";

/** Persists the accent, font and corners every device renders the dashboard with. */
export class AppearanceSettings {
	constructor(
		private readonly repository: SettingsRepository = new SettingsRepository(),
	) {}

	get(): Appearance {
		try {
			return normalizeAppearance(
				JSON.parse(this.repository.get(APPEARANCE_KEY) ?? "null"),
			);
		} catch {
			return normalizeAppearance(null);
		}
	}

	set(appearance: Appearance): void {
		this.repository.set(APPEARANCE_KEY, JSON.stringify(appearance));
	}
}
