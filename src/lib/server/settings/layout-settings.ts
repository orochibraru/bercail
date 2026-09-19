import { normalizeLayout, type Section } from "#lib/layout.ts";
import { SettingsRepository } from "./settings-repository";

const LAYOUT_KEY = "layout";

/** Persists the dashboard section order picked by drag and drop. */
export class LayoutSettings {
	constructor(
		private readonly repository: SettingsRepository = new SettingsRepository(),
	) {}

	get(): Section[] {
		try {
			return normalizeLayout(
				JSON.parse(this.repository.get(LAYOUT_KEY) ?? "[]"),
			);
		} catch {
			return normalizeLayout([]);
		}
	}

	set(layout: Section[]): void {
		this.repository.set(LAYOUT_KEY, JSON.stringify(normalizeLayout(layout)));
	}
}
