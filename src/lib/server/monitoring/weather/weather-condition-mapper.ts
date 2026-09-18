import type { WeatherCondition } from "./weather-types";

const FOG_CODES = new Set([45, 48]);
const RAIN_CODES = new Set([
	51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82,
]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const STORM_CODES = new Set([95, 96, 99]);

/** Maps Open-Meteo's WMO weather codes to the small icon-set our UI understands. */
// biome-ignore lint/complexity/noStaticOnlyClass: kept as a class namespace to match this module's OOP style
export class WeatherConditionMapper {
	static fromWmoCode(code: number): WeatherCondition {
		if (code === 0 || code === 1) {
			return "sun";
		}
		if (FOG_CODES.has(code)) {
			return "fog";
		}
		if (RAIN_CODES.has(code)) {
			return "rain";
		}
		if (SNOW_CODES.has(code)) {
			return "snow";
		}
		if (STORM_CODES.has(code)) {
			return "storm";
		}
		return "cloud";
	}
}
