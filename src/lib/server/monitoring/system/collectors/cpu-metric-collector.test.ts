import { describe, expect, test } from "bun:test";
import type { CpuInfo } from "node:os";
import { CpuMetricCollector } from "./cpu-metric-collector";

function makeCore(idle: number, user: number, speedMhz = 3600): CpuInfo {
	return {
		model: "test",
		speed: speedMhz,
		times: { idle, user, nice: 0, sys: 0, irq: 0 },
	};
}

describe("CpuMetricCollector", () => {
	test("computes usage percent from the delta between two samples", async () => {
		let call = 0;
		// Core busy the whole window: idle barely moves while user climbs a lot.
		const samples: CpuInfo[][] = [
			[makeCore(1000, 1000)],
			[makeCore(1010, 2000)], // idleDelta=10, totalDelta=1010 -> ~99% busy
		];

		const collector = new CpuMetricCollector(0, () => samples[call++]);
		const reading = await collector.collect();

		expect(reading.available).toBe(true);
		expect(reading.percent).toBe(99);
		expect(reading.detail).toBe("1 cores @ 3.6GHz avg");
	});

	test("reports 0% for a fully idle core", async () => {
		let call = 0;
		const samples: CpuInfo[][] = [[makeCore(1000, 0)], [makeCore(2000, 0)]];

		const collector = new CpuMetricCollector(0, () => samples[call++]);
		const reading = await collector.collect();

		expect(reading.percent).toBe(0);
	});
});
