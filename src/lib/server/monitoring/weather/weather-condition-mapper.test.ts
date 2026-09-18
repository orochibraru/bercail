import { describe, expect, test } from "bun:test";
import { WeatherConditionMapper } from "./weather-condition-mapper";
import type { WeatherCondition } from "./weather-types";

describe("WeatherConditionMapper", () => {
	test.each([
		[0, "sun"],
		[1, "sun"],
		[2, "cloud"],
		[3, "cloud"],
		[45, "fog"],
		[48, "fog"],
		[61, "rain"],
		[82, "rain"],
		[71, "snow"],
		[86, "snow"],
		[95, "storm"],
		[99, "storm"],
		[9999, "cloud"],
	] satisfies Array<[number, WeatherCondition]>)(
		"maps WMO code %i to %s",
		(code, expected) => {
			expect(WeatherConditionMapper.fromWmoCode(code)).toBe(expected);
		},
	);
});
