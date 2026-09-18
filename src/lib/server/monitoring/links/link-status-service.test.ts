import { describe, expect, test } from "bun:test";
import { LinkStatusService } from "./link-status-service";

function fakeFetcher(statusByUrl: Record<string, number | Error>) {
	const calls: string[] = [];
	const fetcher = async (url: string) => {
		calls.push(url);
		const status = statusByUrl[url];
		if (status instanceof Error) {
			throw status;
		}
		return new Response(null, { status });
	};
	return { calls, fetcher };
}

describe("LinkStatusService", () => {
	test("treats responses below 500 as online and errors as offline", async () => {
		const { fetcher } = fakeFetcher({
			"https://ok.local": 200,
			"https://auth.local": 401,
			"https://broken.local": 502,
			"https://down.local": new Error("ECONNREFUSED"),
		});
		const service = new LinkStatusService(30_000, 5_000, fetcher);

		expect(
			await service.getStatuses([
				"https://ok.local",
				"https://auth.local",
				"https://broken.local",
				"https://down.local",
			]),
		).toEqual({
			"https://ok.local": true,
			"https://auth.local": true,
			"https://broken.local": false,
			"https://down.local": false,
		});
	});

	test("checks each url once within the TTL", async () => {
		const { calls, fetcher } = fakeFetcher({ "https://ok.local": 200 });
		const service = new LinkStatusService(30_000, 5_000, fetcher);

		await service.getStatuses(["https://ok.local", "https://ok.local"]);
		await service.getStatuses(["https://ok.local"]);

		expect(calls).toEqual(["https://ok.local"]);
	});

	test("rechecks once the TTL has expired", async () => {
		const { calls, fetcher } = fakeFetcher({ "https://ok.local": 200 });
		const service = new LinkStatusService(0, 5_000, fetcher);

		await service.getStatuses(["https://ok.local"]);
		await service.getStatuses(["https://ok.local"]);

		expect(calls).toHaveLength(2);
	});
});
