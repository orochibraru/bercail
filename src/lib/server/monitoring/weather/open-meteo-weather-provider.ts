import { CachedWeatherProvider } from "./cached-weather-provider";
import { WeatherConditionMapper } from "./weather-condition-mapper";
import type { GeoLocation, WeatherSnapshot } from "./weather-types";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface OpenMeteoResponse {
	current: {
		temperature_2m: number;
		apparent_temperature: number;
		weather_code: number;
	};
	daily: {
		time: string[];
		weather_code: number[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
	};
}

/** Free, no API key required - fits a self-hosted homelab dashboard. */
export class OpenMeteoWeatherProvider extends CachedWeatherProvider {
	private static readonly BASE_URL = "https://api.open-meteo.com/v1/forecast";
	private static readonly FORECAST_DAYS = 6; // today + 5 upcoming days

	constructor(
		private readonly location: GeoLocation,
		private readonly temperatureUnit: "celsius" | "fahrenheit" = "celsius",
		ttlMs?: number,
	) {
		super(ttlMs);
	}

	protected async fetchSnapshot(): Promise<WeatherSnapshot> {
		const url = new URL(OpenMeteoWeatherProvider.BASE_URL);
		url.searchParams.set("latitude", String(this.location.latitude));
		url.searchParams.set("longitude", String(this.location.longitude));
		url.searchParams.set(
			"current",
			"temperature_2m,apparent_temperature,weather_code",
		);
		url.searchParams.set(
			"daily",
			"temperature_2m_max,temperature_2m_min,weather_code",
		);
		url.searchParams.set(
			"forecast_days",
			String(OpenMeteoWeatherProvider.FORECAST_DAYS),
		);
		url.searchParams.set("timezone", "auto");
		url.searchParams.set("temperature_unit", this.temperatureUnit);

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Open-Meteo request failed with status ${response.status}`,
			);
		}

		return this.toSnapshot((await response.json()) as OpenMeteoResponse);
	}

	private toSnapshot(data: OpenMeteoResponse): WeatherSnapshot {
		// Index 0 of the daily arrays is today, already covered by `current`.
		const forecast = data.daily.time.slice(1).map((isoDate, i) => ({
			day: DAY_NAMES[new Date(isoDate).getUTCDay()],
			hi: Math.round(data.daily.temperature_2m_max[i + 1]),
			lo: Math.round(data.daily.temperature_2m_min[i + 1]),
			condition: WeatherConditionMapper.fromWmoCode(
				data.daily.weather_code[i + 1],
			),
		}));

		return {
			location: this.location.label,
			current: {
				temp: Math.round(data.current.temperature_2m),
				feelsLike: Math.round(data.current.apparent_temperature),
				hi: Math.round(data.daily.temperature_2m_max[0]),
				lo: Math.round(data.daily.temperature_2m_min[0]),
				condition: WeatherConditionMapper.fromWmoCode(
					data.current.weather_code,
				),
			},
			forecast,
		};
	}
}
