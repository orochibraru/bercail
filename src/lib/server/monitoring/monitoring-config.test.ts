import { describe, expect, test } from "bun:test";
import { MonitoringConfig } from "./monitoring-config";

describe("MonitoringConfig.fromEnv", () => {
	test("falls back to sensible defaults when nothing is set", () => {
		const config = MonitoringConfig.fromEnv({});

		// Left undefined unless DISK_STATS_PATH is set, so SystemStatsService
		// can apply its own platform-appropriate default (see its doc comment).
		expect(config.diskPath).toBeUndefined();
		expect(config.weatherLocation).toBeNull();
		expect(config.weatherUnits).toBe("celsius");
	});

	test("respects an explicit DISK_STATS_PATH", () => {
		expect(
			MonitoringConfig.fromEnv({ DISK_STATS_PATH: "/mnt/data" }).diskPath,
		).toBe("/mnt/data");
	});

	test("enables weather only when both lat and lon are valid numbers", () => {
		const withOnlyLat = MonitoringConfig.fromEnv({ WEATHER_LAT: "47.6" });
		expect(withOnlyLat.weatherLocation).toBeNull();

		const withBoth = MonitoringConfig.fromEnv({
			WEATHER_LAT: "47.6",
			WEATHER_LON: "-122.3",
			WEATHER_LOCATION_NAME: "Seattle, WA",
		});
		expect(withBoth.weatherLocation).toEqual({
			latitude: 47.6,
			longitude: -122.3,
			label: "Seattle, WA",
		});
	});

	test("reads fahrenheit only when explicitly requested", () => {
		expect(
			MonitoringConfig.fromEnv({ WEATHER_UNITS: "fahrenheit" }).weatherUnits,
		).toBe("fahrenheit");
		expect(
			MonitoringConfig.fromEnv({ WEATHER_UNITS: "bogus" }).weatherUnits,
		).toBe("celsius");
	});
});
