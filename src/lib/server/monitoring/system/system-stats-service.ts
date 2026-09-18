import { CpuMetricCollector } from "./collectors/cpu-metric-collector";
import { DiskMetricCollector } from "./collectors/disk-metric-collector";
import { GpuMetricCollector } from "./collectors/gpu-metric-collector";
import { LinuxTemperatureMetricCollector } from "./collectors/linux-temperature-metric-collector";
import { MacTemperatureMetricCollector } from "./collectors/mac-temperature-metric-collector";
import { MemoryMetricCollector } from "./collectors/memory-metric-collector";
import type { MetricCollector } from "./metric-collector";
import type { MetricReading } from "./system-stats-types";

export class SystemStatsService {
	constructor(private readonly collectors: MetricCollector[]) {}

	static createDefault(
		diskPath?: string,
		platform: NodeJS.Platform = process.platform,
	): SystemStatsService {
		// On macOS, "/" is the sealed, read-only System volume - actual usage
		// (apps, user files) lives on the Data volume mounted alongside it.
		const resolvedDiskPath =
			diskPath ?? (platform === "darwin" ? "/System/Volumes/Data" : "/");

		return new SystemStatsService([
			new CpuMetricCollector(),
			new MemoryMetricCollector(platform),
			new DiskMetricCollector(resolvedDiskPath),
			platform === "darwin"
				? new MacTemperatureMetricCollector()
				: new LinuxTemperatureMetricCollector(),
			new GpuMetricCollector(),
		]);
	}

	async getStats(): Promise<MetricReading[]> {
		return Promise.all(this.collectors.map((collector) => collector.collect()));
	}
}
