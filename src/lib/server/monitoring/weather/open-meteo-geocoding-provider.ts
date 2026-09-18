import { z } from "zod";
import {
	GeocodingResultMapper,
	type OpenMeteoGeocodingApiResult,
} from "./geocoding-result-mapper";

export const geocodingResultSchema = z.object({
	label: z.string(),
	latitude: z.number(),
	longitude: z.number(),
});
export type GeocodingResult = z.infer<typeof geocodingResultSchema>;

interface OpenMeteoGeocodingResponse {
	results?: OpenMeteoGeocodingApiResult[];
}

/** Free, no API key required - same provider family as OpenMeteoWeatherProvider. */
export class OpenMeteoGeocodingProvider {
	private static readonly BASE_URL =
		"https://geocoding-api.open-meteo.com/v1/search";

	async search(query: string, limit = 5): Promise<GeocodingResult[]> {
		const url = new URL(OpenMeteoGeocodingProvider.BASE_URL);
		url.searchParams.set("name", query);
		url.searchParams.set("count", String(limit));

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Open-Meteo geocoding request failed with status ${response.status}`,
			);
		}

		const data = (await response.json()) as OpenMeteoGeocodingResponse;
		return (data.results ?? []).map(GeocodingResultMapper.fromApiResult);
	}
}
