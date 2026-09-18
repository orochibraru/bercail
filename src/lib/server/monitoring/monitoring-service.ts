import { uptime } from "node:os";
import { UmamiSettings } from "#lib/server/settings/umami-settings.ts";
import { WeatherLocationSettings } from "#lib/server/settings/weather-location-settings.ts";
import { dev } from "$app/env";
import { LinkStatusService } from "./links/link-status-service";
import { MonitoringConfig } from "./monitoring-config";
import { SystemStatsService } from "./system/system-stats-service";
import type { MetricReading } from "./system/system-stats-types";
import { UmamiClient, type UmamiWebsiteStats } from "./umami";
import { OpenMeteoWeatherProvider } from "./weather/open-meteo-weather-provider";
import type { WeatherSnapshot } from "./weather/weather-types";

export interface DashboardSnapshot {
	system: MetricReading[];
	weather: {
		configured: boolean;
		snapshot: WeatherSnapshot | null;
	};
	hostUptimeSeconds: number;
}

/** Composition root: wires the system, weather and link status subsystems behind one call for the page load. */
export class MonitoringService {
	private readonly systemStats: SystemStatsService;
	private readonly weatherLocationSettings: WeatherLocationSettings;
	private readonly linkStatus = new LinkStatusService();
	private readonly umamiSettings = new UmamiSettings();
	// Rebuilt whenever the settings change, like the weather provider below.
	private umami: UmamiClient | null = null;
	private umamiKey: string | null = null;

	// Weather providers own a cache (CachedWeatherProvider), so we keep reusing
	// the same instance while the resolved location doesn't change, and only
	// rebuild it when the user picks a different city in Settings.
	private cachedWeatherProvider: OpenMeteoWeatherProvider | null = null;
	private cachedWeatherProviderKey: string | null = null;

	constructor(private readonly config: MonitoringConfig) {
		this.systemStats = SystemStatsService.createDefault(config.diskPath);
		this.weatherLocationSettings = new WeatherLocationSettings();
	}

	static fromEnv(): MonitoringService {
		return new MonitoringService(MonitoringConfig.fromEnv());
	}

	async getWeatherSnapshot(): Promise<{
		configured: boolean;
		snapshot: WeatherSnapshot | null;
	}> {
		const weatherProvider = this.resolveWeatherProvider();
		if (weatherProvider === null) {
			return {
				configured: false,
				snapshot: null,
			};
		}
		const snapshot = await weatherProvider.getSnapshot().catch(() => null);
		return {
			configured: true,
			snapshot: snapshot ?? null,
		};
	}

	async getSystemSnapshot(): Promise<MetricReading[]> {
		return this.systemStats.getStats();
	}

	getLinkStatuses(urls: string[]): Promise<Record<string, boolean>> {
		return this.linkStatus.getStatuses(urls);
	}

	/** Null when Umami isn't configured, so the panel stays hidden. */
	async getAnalyticsSnapshot(): Promise<UmamiWebsiteStats[] | null> {
		const config = this.umamiSettings.get();
		if (!config) {
			return null;
		}
		const key = JSON.stringify(config);
		if (!this.umami || this.umamiKey !== key) {
			// No cache in dev, so changes in Umami show up on the next refresh.
			this.umami = new UmamiClient(config, dev ? 0 : undefined);
			this.umamiKey = key;
		}
		return this.umami.getStats();
	}

	getUptimeSnapshot(): number {
		return uptime();
	}

	/** Manually-set (DB) location takes precedence over WEATHER_LAT/WEATHER_LON. */
	private resolveWeatherProvider(): OpenMeteoWeatherProvider | null {
		const location =
			this.weatherLocationSettings.get() ?? this.config.weatherLocation;
		if (!location) {
			this.cachedWeatherProvider = null;
			this.cachedWeatherProviderKey = null;
			return null;
		}

		const key = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
		if (this.cachedWeatherProviderKey !== key) {
			this.cachedWeatherProvider = new OpenMeteoWeatherProvider(
				location,
				this.config.weatherUnits,
			);
			this.cachedWeatherProviderKey = key;
		}

		return this.cachedWeatherProvider;
	}
}
