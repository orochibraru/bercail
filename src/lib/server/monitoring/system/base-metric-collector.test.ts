import { describe, expect, test } from "bun:test";
import { BaseMetricCollector } from "./base-metric-collector";
import type { MetricKey } from "./system-stats-types";

class WorkingCollector extends BaseMetricCollector {
	readonly key: MetricKey = "cpu";
	readonly label = "CPU";

	protected async collectRaw() {
		return { percent: 42, detail: "ok" };
	}
}

class FailingCollector extends BaseMetricCollector {
	readonly key: MetricKey = "gpu";
	readonly label = "GPU";

	protected async collectRaw(): Promise<never> {
		throw new Error("nvidia-smi not found");
	}
}

describe("BaseMetricCollector", () => {
	test("returns the raw reading enriched with key/label/available on success", async () => {
		const reading = await new WorkingCollector().collect();
		expect(reading).toEqual({
			key: "cpu",
			label: "CPU",
			available: true,
			percent: 42,
			detail: "ok",
		});
	});

	test("degrades to an unavailable reading instead of throwing", async () => {
		const reading = await new FailingCollector().collect();
		expect(reading).toEqual({
			key: "gpu",
			label: "GPU",
			available: false,
			percent: null,
			detail: "Unavailable",
		});
	});
});
