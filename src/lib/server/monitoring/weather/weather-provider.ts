import type { WeatherSnapshot } from "./weather-types";

export interface WeatherProvider {
	getSnapshot(): Promise<WeatherSnapshot>;
}
