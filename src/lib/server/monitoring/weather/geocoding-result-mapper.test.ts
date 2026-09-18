import { describe, expect, test } from "bun:test";
import { GeocodingResultMapper } from "./geocoding-result-mapper";

describe("GeocodingResultMapper.fromApiResult", () => {
	test("joins name, admin1 and country into the label", () => {
		const result = GeocodingResultMapper.fromApiResult({
			name: "Paris",
			admin1: "Ile-de-France",
			country: "France",
			latitude: 48.8566,
			longitude: 2.3522,
		});

		expect(result).toEqual({
			label: "Paris, Ile-de-France, France",
			latitude: 48.8566,
			longitude: 2.3522,
		});
	});

	test("omits missing admin1/country instead of leaving empty gaps", () => {
		const result = GeocodingResultMapper.fromApiResult({
			name: "Vatican City",
			latitude: 41.9,
			longitude: 12.45,
		});

		expect(result.label).toBe("Vatican City");
	});
});
