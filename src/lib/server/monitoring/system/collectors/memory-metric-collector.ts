import { readFile } from "node:fs/promises";
import { freemem, totalmem } from "node:os";
import { ByteFormatter } from "#lib/byte-formatter.ts";
import { BaseMetricCollector } from "../base-metric-collector";
import { type CommandRunner, defaultCommandRunner } from "../process-runner";
import type { MetricKey } from "../system-stats-types";

interface AvailableMemInfo {
	totalBytes: number;
	availableBytes: number;
}

/**
 * os.freemem() counts reclaimable page cache as "used", which is misleading
 * on Linux. /proc/meminfo's MemAvailable is the number `free -h`/`top` show,
 * so we prefer it and only fall back to the os module off-Linux.
 */
async function readProcMemInfo(): Promise<AvailableMemInfo | null> {
	try {
		const raw = await readFile("/proc/meminfo", "utf8");
		const total = raw.match(/^MemTotal:\s+(\d+)/m);
		const available = raw.match(/^MemAvailable:\s+(\d+)/m);
		if (!total || !available) {
			return null;
		}

		return {
			totalBytes: Number(total[1]) * 1024,
			availableBytes: Number(available[1]) * 1024,
		};
	} catch {
		return null;
	}
}

/**
 * Same problem as Linux, worse: os.freemem() on macOS only counts the tiny
 * "Pages free" bucket, ignoring inactive/purgeable/compressed pages the
 * kernel reclaims on demand - so it reports near-100% used even at idle.
 * vm_stat exposes the breakdown Activity Monitor uses, so we derive
 * "available" the same way: free + inactive + speculative + purgeable.
 */
function readMacMemInfo(
	run: CommandRunner,
	totalBytes: number,
): AvailableMemInfo | null {
	const { stdout, exitCode } = run("vm_stat", []);
	if (exitCode !== 0) {
		return null;
	}

	const pageSizeMatch = stdout.match(/page size of (\d+) bytes/);
	if (!pageSizeMatch) {
		return null;
	}
	const pageSize = Number(pageSizeMatch[1]);

	const pages = (label: string): number | null => {
		const match = stdout.match(new RegExp(`^${label}:\\s+(\\d+)\\.`, "m"));
		return match ? Number(match[1]) : null;
	};

	const free = pages("Pages free");
	const inactive = pages("Pages inactive");
	const speculative = pages("Pages speculative");
	const purgeable = pages("Pages purgeable");
	if (
		free === null ||
		inactive === null ||
		speculative === null ||
		purgeable === null
	) {
		return null;
	}

	return {
		totalBytes,
		availableBytes: (free + inactive + speculative + purgeable) * pageSize,
	};
}

export class MemoryMetricCollector extends BaseMetricCollector {
	readonly key: MetricKey = "ram";
	readonly label = "RAM";

	constructor(
		private readonly platform: NodeJS.Platform = process.platform,
		private readonly run: CommandRunner = defaultCommandRunner,
	) {
		super();
	}

	protected async collectRaw() {
		const totalBytes = totalmem();
		const proc = await readProcMemInfo();
		const mac =
			proc || this.platform !== "darwin"
				? null
				: readMacMemInfo(this.run, totalBytes);
		const availableBytes =
			proc?.availableBytes ?? mac?.availableBytes ?? freemem();
		const usedBytes = totalBytes - availableBytes;

		return {
			percent: Math.round((usedBytes / totalBytes) * 100),
			detail: `${ByteFormatter.format(usedBytes)} / ${ByteFormatter.format(totalBytes, 0)}`,
		};
	}
}
