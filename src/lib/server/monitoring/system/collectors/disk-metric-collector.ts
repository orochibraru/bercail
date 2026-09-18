import { ByteFormatter } from "#lib/byte-formatter.ts";
import { BaseMetricCollector } from "../base-metric-collector";
import { type CommandRunner, defaultCommandRunner } from "../process-runner";
import type { MetricKey } from "../system-stats-types";

export class DiskMetricCollector extends BaseMetricCollector {
	readonly key: MetricKey = "disk";
	readonly label = "DISK";

	constructor(
		private readonly path = "/",
		private readonly run: CommandRunner = defaultCommandRunner,
	) {
		super();
	}

	protected async collectRaw() {
		const { stdout, exitCode } = this.run("df", ["-kP", this.path]);
		if (exitCode !== 0) {
			throw new Error(`df exited with code ${exitCode}`);
		}

		// df -kP prints a header line then one line of space-separated columns:
		// Filesystem 1024-blocks Used Available Capacity Mounted-on
		const dataLine = stdout.trim().split("\n").at(-1);
		if (!dataLine) {
			throw new Error("df returned no data");
		}

		const columns = dataLine.trim().split(/\s+/);
		const totalKb = Number(columns[1]);
		const usedKb = Number(columns[2]);
		if (!Number.isFinite(totalKb) || totalKb <= 0) {
			throw new Error("Could not parse df output");
		}

		return {
			percent: Math.round((usedKb / totalKb) * 100),
			detail: `${ByteFormatter.format(usedKb * 1024)} / ${ByteFormatter.format(totalKb * 1024, 0)}`,
		};
	}
}
