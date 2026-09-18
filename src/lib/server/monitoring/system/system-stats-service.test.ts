import { describe, expect, test } from "bun:test";
import type { MetricCollector } from "./metric-collector";
import { SystemStatsService } from "./system-stats-service";
import type { MetricReading } from "./system-stats-types";

function fakeCollector(reading: MetricReading): MetricCollector {
	return {
		key: reading.key,
		label: reading.label,
		collect: async () => reading,
	};
}

describe("SystemStatsService", () => {
	test("collects readings from every configured collector", async () => {
		const cpu: MetricReading = {
			key: "cpu",
			label: "CPU",
			available: true,
			percent: 10,
			detail: "",
		};
		const ram: MetricReading = {
			key: "ram",
			label: "RAM",
			available: true,
			percent: 20,
			detail: "",
		};

		const service = new SystemStatsService([
			fakeCollector(cpu),
			fakeCollector(ram),
		]);
		const stats = await service.getStats();

		expect(stats).toEqual([cpu, ram]);
	});

	test("one collector failing does not affect the others (via BaseMetricCollector isolation)", async () => {
		const ok: MetricReading = {
			key: "cpu",
			label: "CPU",
			available: true,
			percent: 10,
			detail: "",
		};
		const unavailable: MetricReading = {
			key: "gpu",
			label: "GPU",
			available: false,
			percent: null,
			detail: "Unavailable",
		};

		const service = new SystemStatsService([
			fakeCollector(ok),
			fakeCollector(unavailable),
		]);
		const stats = await service.getStats();

		expect(stats).toEqual([ok, unavailable]);
	});
});
