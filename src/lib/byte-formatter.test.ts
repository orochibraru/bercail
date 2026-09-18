import { describe, expect, test } from "bun:test";
import { ByteFormatter } from "./byte-formatter";

describe("ByteFormatter", () => {
	test("formats 0 bytes", () => {
		expect(ByteFormatter.format(0)).toBe("0B");
	});

	test("formats bytes under 1KB without a decimal", () => {
		expect(ByteFormatter.format(512)).toBe("512B");
	});

	test("formats gigabytes with one decimal by default", () => {
		expect(ByteFormatter.format(19.5 * 1024 ** 3)).toBe("19.5GB");
	});

	test("formats terabytes", () => {
		expect(ByteFormatter.format(1.36 * 1024 ** 4)).toBe("1.4TB");
	});

	test("respects a custom decimals count", () => {
		expect(ByteFormatter.format(32 * 1024 ** 3, 0)).toBe("32GB");
	});
});
