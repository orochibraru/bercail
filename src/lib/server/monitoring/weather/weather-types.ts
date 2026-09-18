import { z } from "zod";

export const weatherConditionSchema = z.enum([
	"sun",
	"cloud",
	"rain",
	"snow",
	"storm",
	"fog",
]);
export type WeatherCondition = z.infer<typeof weatherConditionSchema>;

export const currentWeatherSchema = z.object({
	temp: z.number(),
	condition: weatherConditionSchema,
	hi: z.number(),
	lo: z.number(),
	feelsLike: z.number(),
});
export type CurrentWeather = z.infer<typeof currentWeatherSchema>;

export const forecastDaySchema = z.object({
	day: z.string(),
	hi: z.number(),
	lo: z.number(),
	condition: weatherConditionSchema,
});
export type ForecastDay = z.infer<typeof forecastDaySchema>;

export const weatherSnapshotSchema = z.object({
	location: z.string(),
	current: currentWeatherSchema,
	forecast: z.array(forecastDaySchema),
});
export type WeatherSnapshot = z.infer<typeof weatherSnapshotSchema>;

export interface WeatherData {
	configured: boolean;
	snapshot: WeatherSnapshot | null;
}

export const geoLocationSchema = z.object({
	latitude: z.number(),
	longitude: z.number(),
	label: z.string(),
});
export type GeoLocation = z.infer<typeof geoLocationSchema>;
