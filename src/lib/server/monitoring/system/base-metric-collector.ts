import type { MetricCollector } from "./metric-collector";
import type { MetricKey, MetricReading } from "./system-stats-types";

type RawReading = Omit<MetricReading, "key" | "label" | "available">;

/**
 * Template method: subclasses only implement collectRaw(). A single sensor
 * being missing (no /sys/class/thermal on this host, no nvidia-smi, no
 * permission to shell out) must never take down the rest of the panel, so
 * failures are caught here once instead of in every collector.
 */
export abstract class BaseMetricCollector implements MetricCollector {
	abstract readonly key: MetricKey;
	abstract readonly label: string;

	protected abstract collectRaw(): Promise<RawReading>;

	async collect(): Promise<MetricReading> {
		try {
			const raw = await this.collectRaw();
			return { key: this.key, label: this.label, available: true, ...raw };
		} catch {
			return {
				key: this.key,
				label: this.label,
				available: false,
				percent: null,
				detail: "Unavailable",
			};
		}
	}
}
