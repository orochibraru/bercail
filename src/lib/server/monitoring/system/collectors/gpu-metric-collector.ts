import { BaseMetricCollector } from "../base-metric-collector";
import { type CommandRunner, defaultCommandRunner } from "../process-runner";
import type { MetricKey } from "../system-stats-types";

/** NVIDIA-only for now (nvidia-smi). Hosts without a GPU report "Unavailable" via BaseMetricCollector. */
export class GpuMetricCollector extends BaseMetricCollector {
	readonly key: MetricKey = "gpu";
	readonly label = "GPU";

	constructor(private readonly run: CommandRunner = defaultCommandRunner) {
		super();
	}

	protected async collectRaw() {
		const { stdout, exitCode } = this.run("nvidia-smi", [
			"--query-gpu=utilization.gpu,memory.used,memory.total",
			"--format=csv,noheader,nounits",
		]);
		if (exitCode !== 0) {
			throw new Error("nvidia-smi unavailable");
		}

		const firstLine = stdout.trim().split("\n")[0];
		if (!firstLine) {
			throw new Error("nvidia-smi returned no data");
		}

		const [utilPercent, usedMib, totalMib] = firstLine
			.split(",")
			.map((part) => Number(part.trim()));
		if (![utilPercent, usedMib, totalMib].every(Number.isFinite)) {
			throw new Error("Could not parse nvidia-smi output");
		}

		return {
			percent: Math.round(utilPercent),
			detail: `${(usedMib / 1024).toFixed(1)}GB VRAM used`,
		};
	}
}
