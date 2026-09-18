import { describe, expect, test } from "bun:test";
import type { ProcessResult } from "../process-runner";
import { GpuMetricCollector } from "./gpu-metric-collector";

describe("GpuMetricCollector", () => {
	test("parses nvidia-smi CSV output", async () => {
		const run = () =>
			({ stdout: "34, 3277, 8192\n", exitCode: 0 }) satisfies ProcessResult;

		const reading = await new GpuMetricCollector(run).collect();

		expect(reading.available).toBe(true);
		expect(reading.percent).toBe(34);
		expect(reading.detail).toBe("3.2GB VRAM used");
	});

	test("degrades to unavailable when nvidia-smi is missing", async () => {
		const run = () => ({ stdout: "", exitCode: 127 }) satisfies ProcessResult;

		const reading = await new GpuMetricCollector(run).collect();

		expect(reading.available).toBe(false);
		expect(reading.detail).toBe("Unavailable");
	});
});
