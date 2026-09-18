import { describe, expect, test } from "bun:test";
import { CachedWeatherProvider } from "./cached-weather-provider";
import type { WeatherSnapshot } from "./weather-types";

function snapshot(temp: number): WeatherSnapshot {
	return {
		location: "Test City",
		current: { temp, condition: "sun", hi: temp, lo: temp, feelsLike: temp },
		forecast: [],
	};
}

class FakeProvider extends CachedWeatherProvider {
	fetchCount = 0;
	nextResult: (() => Promise<WeatherSnapshot>) | null = null;

	protected async fetchSnapshot(): Promise<WeatherSnapshot> {
		this.fetchCount += 1;
		if (this.nextResult) {
			return this.nextResult();
		}
		return snapshot(this.fetchCount);
	}
}

describe("CachedWeatherProvider", () => {
	test("serves a cached snapshot within the TTL instead of refetching", async () => {
		const provider = new FakeProvider(60_000);

		const first = await provider.getSnapshot();
		const second = await provider.getSnapshot();

		expect(first).toBe(second);
		expect(provider.fetchCount).toBe(1);
	});

	test("refetches once the TTL has elapsed", async () => {
		const provider = new FakeProvider(0);

		const first = await provider.getSnapshot();
		const second = await provider.getSnapshot();

		expect(first).not.toBe(second);
		expect(provider.fetchCount).toBe(2);
	});

	test("serves the last-known-good snapshot when a refetch fails", async () => {
		const provider = new FakeProvider(0);

		const first = await provider.getSnapshot();
		provider.nextResult = () => Promise.reject(new Error("network down"));
		const second = await provider.getSnapshot();

		expect(second).toBe(first);
	});

	test("propagates the error when there is no prior snapshot to fall back on", async () => {
		const provider = new FakeProvider(0);
		provider.nextResult = () => Promise.reject(new Error("network down"));

		await expect(provider.getSnapshot()).rejects.toThrow("network down");
	});
});
