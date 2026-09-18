import { describe, expect, test } from "bun:test";
import { formatUptime } from "./helpers";

describe("formatUptime", () => {
	test("formats days and hours once at least a day has passed", () => {
		expect(formatUptime(47 * 86_400 + 3 * 3600)).toBe("47d 3h");
	});

	test("falls back to hours and minutes under a day", () => {
		expect(formatUptime(2 * 3600 + 15 * 60)).toBe("2h 15m");
	});

	test("handles zero uptime", () => {
		expect(formatUptime(0)).toBe("0h 0m");
	});
});
