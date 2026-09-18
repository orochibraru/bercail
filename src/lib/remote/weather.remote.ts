import { error } from "@sveltejs/kit";
import { z } from "zod";
import { MonitoringConfig } from "#lib/server/monitoring/monitoring-config.ts";
import { OpenMeteoGeocodingProvider } from "#lib/server/monitoring/weather/open-meteo-geocoding-provider.ts";
import { OpenMeteoWeatherProvider } from "#lib/server/monitoring/weather/open-meteo-weather-provider.ts";
import { geoLocationSchema } from "#lib/server/monitoring/weather/weather-types.ts";
import { WeatherLocationSettings } from "#lib/server/settings/weather-location-settings.ts";
import { command, query } from "$app/server";

const weatherLocationSettings = new WeatherLocationSettings();
const geocoder = new OpenMeteoGeocodingProvider();
const { weatherUnits } = MonitoringConfig.fromEnv();

// Reused across calls so the provider cache avoids re-hitting Open-Meteo for the same rounded location.
const providersByLocation = new Map<string, OpenMeteoWeatherProvider>();

export const getWeatherLocation = query(() => weatherLocationSettings.get());

export const setWeatherLocation = command(geoLocationSchema, (location) => {
	weatherLocationSettings.set(location);
});

export const clearWeatherLocation = command(() => {
	weatherLocationSettings.clear();
});

export const searchLocations = query(z.string(), async (search) => {
	const trimmed = search.trim();
	if (!trimmed) {
		return [];
	}
	try {
		return await geocoder.search(trimmed);
	} catch (cause) {
		console.error("Geocoding search failed:", cause);
		error(502, "Location search failed");
	}
});

/** Weather for the browser's own coordinates, used when no location is configured server-side. */
export const getWeatherAt = query(
	z.object({ latitude: z.number(), longitude: z.number() }),
	async ({ latitude, longitude }) => {
		const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
		let provider = providersByLocation.get(key);
		if (!provider) {
			provider = new OpenMeteoWeatherProvider(
				{ latitude, longitude, label: "Your location" },
				weatherUnits,
			);
			providersByLocation.set(key, provider);
		}
		try {
			return await provider.getSnapshot();
		} catch (cause) {
			console.error("Failed to fetch weather for browser location:", cause);
			error(502, "Failed to fetch weather");
		}
	},
);
