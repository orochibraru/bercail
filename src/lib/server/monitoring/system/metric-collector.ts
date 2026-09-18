import type { MetricKey, MetricReading } from "./system-stats-types";

export interface MetricCollector {
	readonly key: MetricKey;
	readonly label: string;
	collect(): Promise<MetricReading>;
}
