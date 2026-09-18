import type { WeatherProvider } from "./weather-provider";
import type { WeatherSnapshot } from "./weather-types";

interface CacheEntry {
	snapshot: WeatherSnapshot;
	expiresAt: number;
}

/**
 * Template method: subclasses only implement fetchSnapshot(). Weather barely
 * changes minute to minute, so this avoids hitting the API on every page
 * load, and serves the last-known-good snapshot instead of failing the
 * dashboard when a refetch errors (network blip, upstream outage...).
 */
export abstract class CachedWeatherProvider implements WeatherProvider {
	private cache: CacheEntry | null = null;

	constructor(private readonly ttlMs = 10 * 60 * 1000) {}

	protected abstract fetchSnapshot(): Promise<WeatherSnapshot>;

	async getSnapshot(): Promise<WeatherSnapshot> {
		const now = Date.now();
		if (this.cache && this.cache.expiresAt > now) {
			return this.cache.snapshot;
		}

		try {
			const snapshot = await this.fetchSnapshot();
			this.cache = { snapshot, expiresAt: now + this.ttlMs };
			return snapshot;
		} catch (error) {
			if (this.cache) {
				return this.cache.snapshot;
			}
			throw error;
		}
	}
}
