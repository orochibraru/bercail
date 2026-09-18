export type MetricKey = "cpu" | "ram" | "disk" | "temperature" | "gpu";

export interface MetricReading {
	key: MetricKey;
	label: string;
	available: boolean;
	/** 0-100. For "temperature" this is the raw Celsius value, not a ratio. */
	percent: number | null;
	detail: string;
}
