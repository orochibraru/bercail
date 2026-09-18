type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

interface CachedStatus {
	online: Promise<boolean>;
	checkedAt: number;
}

/** Stateless reachability check: any HTTP response below 500 counts as online. */
export class LinkStatusService {
	private readonly cache = new Map<string, CachedStatus>();

	constructor(
		private readonly ttlMs = 30_000,
		private readonly timeoutMs = 5_000,
		private readonly fetcher: Fetcher = fetch,
	) {}

	async getStatuses(urls: string[]): Promise<Record<string, boolean>> {
		const uniqueUrls = [...new Set(urls)];
		const results = await Promise.all(
			uniqueUrls.map((url) => this.getStatus(url)),
		);
		return Object.fromEntries(
			uniqueUrls.map((url, index) => [url, results[index]]),
		);
	}

	private getStatus(url: string): Promise<boolean> {
		const cached = this.cache.get(url);
		if (cached && Date.now() - cached.checkedAt < this.ttlMs) {
			return cached.online;
		}
		const online = this.check(url);
		this.cache.set(url, { online, checkedAt: Date.now() });
		return online;
	}

	private async check(url: string): Promise<boolean> {
		try {
			const response = await this.fetcher(url, {
				method: "HEAD",
				redirect: "follow",
				signal: AbortSignal.timeout(this.timeoutMs),
				// Homelab services commonly run on self-signed certificates.
				tls: { rejectUnauthorized: false },
			} as RequestInit);
			return response.status < 500;
		} catch {
			return false;
		}
	}
}
