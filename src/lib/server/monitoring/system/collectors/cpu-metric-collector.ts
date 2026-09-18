import { type CpuInfo, cpus } from "node:os";
import { BaseMetricCollector } from "../base-metric-collector";
import type { MetricKey } from "../system-stats-types";

export type CpuInfoProvider = () => CpuInfo[];

interface CpuTimeSample {
	idle: number;
	total: number;
}

function sampleCpuTimes(cpuInfo: CpuInfo[]): CpuTimeSample[] {
	return cpuInfo.map(({ times }) => ({
		idle: times.idle,
		total: times.idle + times.user + times.nice + times.sys + times.irq,
	}));
}

/**
 * os.cpus() only exposes cumulative counters, so usage % requires two
 * samples a short interval apart and a delta between them.
 */
export class CpuMetricCollector extends BaseMetricCollector {
	readonly key: MetricKey = "cpu";
	readonly label = "CPU";

	constructor(
		private readonly sampleWindowMs = 200,
		private readonly cpuInfoProvider: CpuInfoProvider = cpus,
	) {
		super();
	}

	protected async collectRaw() {
		const beforeInfo = this.cpuInfoProvider();
		const before = sampleCpuTimes(beforeInfo);
		await new Promise((resolve) => setTimeout(resolve, this.sampleWindowMs));
		const afterInfo = this.cpuInfoProvider();
		const after = sampleCpuTimes(afterInfo);

		const coreUsages = before.map((b, i) => {
			const a = after[i];
			const totalDelta = a.total - b.total;
			const idleDelta = a.idle - b.idle;
			return totalDelta > 0 ? 1 - idleDelta / totalDelta : 0;
		});

		const percent = Math.round(
			(coreUsages.reduce((sum, usage) => sum + usage, 0) / coreUsages.length) *
				100,
		);
		const avgGhz = (
			afterInfo.reduce((sum, core) => sum + core.speed, 0) /
			coreUsages.length /
			1000
		).toFixed(1);

		return {
			percent,
			detail: `${coreUsages.length} cores @ ${avgGhz}GHz avg`,
		};
	}
}
