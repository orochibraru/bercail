import {
	type GeoLocation,
	geoLocationSchema,
} from "#lib/server/monitoring/weather/weather-types.ts";
import { SettingsRepository } from "./settings-repository";

const WEATHER_LOCATION_KEY = "weatherLocation";

/** Persists the user's manually-chosen weather location, overriding WEATHER_LAT/WEATHER_LON. */
export class WeatherLocationSettings {
	constructor(
		private readonly repository: SettingsRepository = new SettingsRepository(),
	) {}

	get(): GeoLocation | null {
		const raw = this.repository.get(WEATHER_LOCATION_KEY);
		if (!raw) {
			return null;
		}

		try {
			const parsed = geoLocationSchema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	}

	set(location: GeoLocation): void {
		this.repository.set(WEATHER_LOCATION_KEY, JSON.stringify(location));
	}

	clear(): void {
		this.repository.delete(WEATHER_LOCATION_KEY);
	}
}
