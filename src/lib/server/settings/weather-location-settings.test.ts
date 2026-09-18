import { describe, expect, test } from "bun:test";
import type { SettingsRepository } from "./settings-repository";
import { WeatherLocationSettings } from "./weather-location-settings";

class InMemorySettingsRepository
	implements Pick<SettingsRepository, "get" | "set" | "delete">
{
	private store = new Map<string, string>();

	get(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	set(key: string, value: string): void {
		this.store.set(key, value);
	}

	delete(key: string): void {
		this.store.delete(key);
	}
}

describe("WeatherLocationSettings", () => {
	test("returns null when nothing is stored", () => {
		const settings = new WeatherLocationSettings(
			new InMemorySettingsRepository() as unknown as SettingsRepository,
		);
		expect(settings.get()).toBeNull();
	});

	test("round-trips a stored location", () => {
		const settings = new WeatherLocationSettings(
			new InMemorySettingsRepository() as unknown as SettingsRepository,
		);
		const location = {
			latitude: 48.8566,
			longitude: 2.3522,
			label: "Paris, France",
		};

		settings.set(location);

		expect(settings.get()).toEqual(location);
	});

	test("clear removes the stored location", () => {
		const settings = new WeatherLocationSettings(
			new InMemorySettingsRepository() as unknown as SettingsRepository,
		);
		settings.set({ latitude: 1, longitude: 2, label: "Nowhere" });

		settings.clear();

		expect(settings.get()).toBeNull();
	});

	test("ignores malformed stored JSON instead of throwing", () => {
		const repository = new InMemorySettingsRepository();
		repository.set("weatherLocation", "not json");
		const settings = new WeatherLocationSettings(
			repository as unknown as SettingsRepository,
		);

		expect(settings.get()).toBeNull();
	});

	test("ignores a stored value missing required fields", () => {
		const repository = new InMemorySettingsRepository();
		repository.set("weatherLocation", JSON.stringify({ latitude: 1 }));
		const settings = new WeatherLocationSettings(
			repository as unknown as SettingsRepository,
		);

		expect(settings.get()).toBeNull();
	});
});
