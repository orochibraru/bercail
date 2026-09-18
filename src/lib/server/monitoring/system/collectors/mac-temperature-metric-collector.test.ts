import { describe, expect, test } from "bun:test";
import type { ProcessResult } from "../process-runner";
import { MacTemperatureMetricCollector } from "./mac-temperature-metric-collector";

describe("MacTemperatureMetricCollector", () => {
	test("parses osx-cpu-temp output", async () => {
		const run = () =>
			({ stdout: "55.8°C\n", exitCode: 0 }) satisfies ProcessResult;

		const reading = await new MacTemperatureMetricCollector(run).collect();

		expect(reading.available).toBe(true);
		expect(reading.percent).toBe(56);
		expect(reading.detail).toBe("56°C · fans normal");
	});

	test("degrades to unavailable when osx-cpu-temp isn't installed", async () => {
		const run = () => ({ stdout: "", exitCode: 127 }) satisfies ProcessResult;

		const reading = await new MacTemperatureMetricCollector(run).collect();

		expect(reading.available).toBe(false);
		expect(reading.detail).toBe("Unavailable");
	});
});
