import { expect, test } from "bun:test";
import type { SettingsRepository } from "./settings-repository";
import { parseDomains, UmamiSettings } from "./umami-settings";

function inMemorySettings() {
	const store = new Map<string, string>();
	const repository = {
		get: (key: string) => store.get(key) ?? null,
		set: (key: string, value: string) => store.set(key, value),
		delete: (key: string) => store.delete(key),
	};
	return {
		store,
		settings: new UmamiSettings(repository as unknown as SettingsRepository),
	};
}

test("UmamiSettings round-trips, clears, and ignores malformed values", () => {
	const { store, settings } = inMemorySettings();
	expect(settings.get()).toBeNull();

	const config = {
		host: "https://u.example",
		apiKey: "k",
		websites: ["a.com"],
	};
	settings.set(config);
	expect(settings.get()).toEqual(config);

	settings.clear();
	expect(settings.get()).toBeNull();

	store.set("umami", "not json");
	expect(settings.get()).toBeNull();
	store.set(
		"umami",
		JSON.stringify({ host: "not a url", apiKey: "k", websites: [] }),
	);
	expect(settings.get()).toBeNull();
});

test("parseDomains trims, lowercases and drops empty entries", () => {
	expect(parseDomains(" C.com, a.com,, ")).toEqual(["c.com", "a.com"]);
	expect(parseDomains("")).toEqual([]);
});
