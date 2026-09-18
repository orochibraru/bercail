import { describe, expect, test } from "bun:test";
import type { ProcessResult } from "../process-runner";
import { MemoryMetricCollector } from "./memory-metric-collector";

const VM_STAT_OUTPUT =
	"Mach Virtual Memory Statistics: (page size of 16384 bytes)\n" +
	"Pages free:                                     4068.\n" +
	"Pages active:                                 217313.\n" +
	"Pages inactive:                               214481.\n" +
	"Pages speculative:                              2131.\n" +
	"Pages throttled:                                   0.\n" +
	"Pages wired down:                             240210.\n" +
	"Pages purgeable:                                   2.\n" +
	"Pages occupied by compressor:                 336566.\n";

describe("MemoryMetricCollector", () => {
	test("on macOS, derives usage from vm_stat instead of the near-empty freemem() bucket", async () => {
		const run = () =>
			({ stdout: VM_STAT_OUTPUT, exitCode: 0 }) satisfies ProcessResult;

		const reading = await new MemoryMetricCollector("darwin", run).collect();

		expect(reading.available).toBe(true);
		// Reclaimable pages (free + inactive + speculative + purgeable) are
		// excluded from "used", so this should read well under the ~96% that
		// os.freemem() alone (which only counts "Pages free") would report.
		expect(reading.percent).toBeLessThan(90);
	});

	test("degrades to the generic os-module calc when vm_stat is unavailable on darwin", async () => {
		const run = () => ({ stdout: "", exitCode: 127 }) satisfies ProcessResult;

		const reading = await new MemoryMetricCollector("darwin", run).collect();

		expect(reading.available).toBe(true);
		expect(typeof reading.percent).toBe("number");
	});

	test("does not shell out to vm_stat off-macOS", async () => {
		let called = false;
		const run = () => {
			called = true;
			return { stdout: "", exitCode: 0 } satisfies ProcessResult;
		};

		await new MemoryMetricCollector("linux", run).collect();

		expect(called).toBe(false);
	});
});
