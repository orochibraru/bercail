import { describe, expect, test } from "bun:test";
import type { ProcessResult } from "../process-runner";
import { DiskMetricCollector } from "./disk-metric-collector";

describe("DiskMetricCollector", () => {
	test("parses df output into a percent and human sizes", async () => {
		const dfOutput =
			"Filesystem     1024-blocks      Used Available Capacity Mounted on\n" +
			"/dev/sda1       2147483648 1459617792 687865856      68% /\n";
		const run = () =>
			({ stdout: dfOutput, exitCode: 0 }) satisfies ProcessResult;

		const collector = new DiskMetricCollector("/", run);
		const reading = await collector.collect();

		expect(reading.available).toBe(true);
		expect(reading.percent).toBe(68);
		expect(reading.detail).toBe("1.4TB / 2TB");
	});

	test("degrades to unavailable when df exits non-zero", async () => {
		const run = () => ({ stdout: "", exitCode: 1 }) satisfies ProcessResult;

		const reading = await new DiskMetricCollector("/", run).collect();

		expect(reading.available).toBe(false);
		expect(reading.percent).toBeNull();
	});
});
