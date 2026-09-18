import type { UmamiConfig } from "#lib/server/settings/umami-settings.ts";

export interface UmamiWebsiteStats {
	id: string;
	name: string;
	domain: string;
	/** Visitors on the site right now (last 5 minutes, per Umami). */
	active: number;
	/** One entry per UMAMI_RANGES, in that order. */
	ranges: { label: string; visitors: number; pageviews: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rolling windows ending now; `null` means all time. */
const UMAMI_RANGES: { label: string; ms: number | null }[] = [
	{ label: "24 hours", ms: DAY_MS },
	{ label: "7 days", ms: 7 * DAY_MS },
	{ label: "30 days", ms: 30 * DAY_MS },
	{ label: "365 days", ms: 365 * DAY_MS },
	{ label: "All time", ms: null },
];

/** Talks to a self-hosted Umami v3 instance with an API key. */
export class UmamiClient {
	private cache: { stats: UmamiWebsiteStats[]; expiresAt: number } | null =
		null;

	constructor(
		private readonly config: UmamiConfig,
		private readonly ttlMs = 60 * 1000,
	) {}

	/** Every website when no domains are configured, otherwise only those, in the configured order. */
	selectWebsites<W extends { domain: string }>(websites: W[]): W[] {
		if (this.config.websites.length === 0) {
			return websites;
		}
		return this.config.websites.flatMap((domain) =>
			websites.filter((website) => website.domain.toLowerCase() === domain),
		);
	}

	/** Cached for ttlMs, and serves the last good result when Umami is unreachable. */
	async getStats(): Promise<UmamiWebsiteStats[]> {
		const now = Date.now();
		if (this.cache && this.cache.expiresAt > now) {
			return this.cache.stats;
		}
		try {
			const stats = await this.fetchStats(now);
			this.cache = { stats, expiresAt: now + this.ttlMs };
			return stats;
		} catch (error) {
			if (this.cache) {
				return this.cache.stats;
			}
			throw error;
		}
	}

	private async fetchStats(now: number): Promise<UmamiWebsiteStats[]> {
		const { data: websites } = await this.get<{
			data: { id: string; name: string; domain: string }[];
		}>("/api/websites?pageSize=100&includeTeams=true");

		return Promise.all(
			this.selectWebsites(websites).map(async ({ id, name, domain }) => {
				const [active, ...ranges] = await Promise.all([
					this.get<{ visitors: number }>(`/api/websites/${id}/active`),
					...UMAMI_RANGES.map(async ({ label, ms }) => {
						const startAt = ms === null ? 0 : now - ms;
						const { visitors, pageviews } = await this.get<{
							visitors: number;
							pageviews: number;
						}>(`/api/websites/${id}/stats?startAt=${startAt}&endAt=${now}`);
						return { label, visitors, pageviews };
					}),
				]);
				return { id, name, domain, active: active.visitors, ranges };
			}),
		);
	}

	private async get<T>(path: string): Promise<T> {
		const response = await fetch(this.config.host + path, {
			headers: { Authorization: `Bearer ${this.config.apiKey}` },
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) {
			throw new Error(`Umami ${path} failed with status ${response.status}`);
		}
		return response.json() as Promise<T>;
	}
}
