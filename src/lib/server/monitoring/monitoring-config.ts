import type { GeoLocation } from "./weather/weather-types";

type Env = Record<string, string | undefined>;

interface MonitoringConfigValues {
	diskPath: string | undefined;
	weatherLocation: GeoLocation | null;
	weatherUnits: "celsius" | "fahrenheit";
}

/**
 * Reads monitoring config from environment variables:
 * - DISK_STATS_PATH (default: "/System/Volumes/Data" on macOS - "/" is just the sealed,
 *   read-only System volume there - or "/" elsewhere)
 * - WEATHER_LAT / WEATHER_LON / WEATHER_LOCATION_NAME (weather stays disabled unless lat+lon are
 *   set, and is overridden by a location set through Settings)
 * - WEATHER_UNITS ("celsius" | "fahrenheit", default "celsius")
 */
export class MonitoringConfig {
	public readonly diskPath: string | undefined;
	public readonly weatherLocation: GeoLocation | null;
	public readonly weatherUnits: "celsius" | "fahrenheit";

	private constructor(values: MonitoringConfigValues) {
		this.diskPath = values.diskPath;
		this.weatherLocation = values.weatherLocation;
		this.weatherUnits = values.weatherUnits;
	}

	static fromEnv(env: Env = process.env): MonitoringConfig {
		return new MonitoringConfig({
			// Left undefined unless explicitly set, so SystemStatsService can pick a
			// platform-appropriate default (see its own doc comment for why).
			diskPath: env.DISK_STATS_PATH || undefined,
			weatherLocation: MonitoringConfig.parseWeatherLocation(env),
			weatherUnits:
				env.WEATHER_UNITS === "fahrenheit" ? "fahrenheit" : "celsius",
		});
	}

	private static parseWeatherLocation(env: Env): GeoLocation | null {
		const latitude = Number(env.WEATHER_LAT);
		const longitude = Number(env.WEATHER_LON);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return null;
		}

		return { latitude, longitude, label: env.WEATHER_LOCATION_NAME || "Home" };
	}
}
