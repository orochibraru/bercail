import { expect, test } from "bun:test";
import { presetDate } from "./due-presets";

const local = (month: number, day: number, hour = 9) =>
	new Date(2026, month - 1, day, hour);

test("presets land at 9:00 on the right day", () => {
	const friday = local(9, 18, 15);
	expect(presetDate("tomorrow", friday)).toEqual(local(9, 19));
	expect(presetDate("next-week", friday)).toEqual(local(9, 21));
	expect(presetDate("next-weekend", friday)).toEqual(local(9, 19));

	const saturday = local(9, 19, 10);
	expect(presetDate("next-weekend", saturday)).toEqual(local(9, 26));
	expect(presetDate("next-week", local(9, 21, 8))).toEqual(local(9, 28));
	expect(presetDate("tomorrow", local(9, 30))).toEqual(local(10, 1));
});
