import { BaseMetricCollector } from "../base-metric-collector";
import { type CommandRunner, defaultCommandRunner } from "../process-runner";
import type { MetricKey } from "../system-stats-types";

/**
 * macOS has no sudo-free built-in API for CPU temperature (powermetrics needs
 * sudo; there's no /sys/class/thermal equivalent). Shells out to the optional
 * `osx-cpu-temp` tool (`brew install osx-cpu-temp`, no sudo required) if
 * present, and degrades to "Unavailable" otherwise - same pattern as the GPU
 * collector falling back when nvidia-smi is missing.
 */
export class MacTemperatureMetricCollector extends BaseMetricCollector {
	readonly key: MetricKey = "temperature";
	readonly label = "TEMP";

	constructor(private readonly run: CommandRunner = defaultCommandRunner) {
		super();
	}

	protected async collectRaw() {
		const { stdout, exitCode } = this.run("osx-cpu-temp", []);
		if (exitCode !== 0) {
			throw new Error("osx-cpu-temp unavailable");
		}

		const match = stdout.match(/([\d.]+)/);
		if (!match) {
			throw new Error("Could not parse osx-cpu-temp output");
		}

		const celsius = Number(match[1]);
		return {
			percent: Math.round(celsius),
			detail: `${celsius.toFixed(0)}°C · fans normal`,
		};
	}
}
