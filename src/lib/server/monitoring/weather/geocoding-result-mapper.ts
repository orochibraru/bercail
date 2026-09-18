import type { GeocodingResult } from "./open-meteo-geocoding-provider";

export interface OpenMeteoGeocodingApiResult {
	name: string;
	latitude: number;
	longitude: number;
	admin1?: string;
	country?: string;
}

/** Pure mapping logic, kept free of I/O so it's easy to unit test. */
// biome-ignore lint/complexity/noStaticOnlyClass: kept as a class namespace to match this module's OOP style
export class GeocodingResultMapper {
	static fromApiResult(result: OpenMeteoGeocodingApiResult): GeocodingResult {
		return {
			label: [result.name, result.admin1, result.country]
				.filter(Boolean)
				.join(", "),
			latitude: result.latitude,
			longitude: result.longitude,
		};
	}
}
