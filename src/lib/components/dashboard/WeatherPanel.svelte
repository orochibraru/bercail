<script lang="ts">
	import CloudFogIcon from '@lucide/svelte/icons/cloud-fog';
	import CloudLightningIcon from '@lucide/svelte/icons/cloud-lightning';
	import CloudRainIcon from '@lucide/svelte/icons/cloud-rain';
	import CloudSnowIcon from '@lucide/svelte/icons/cloud-snow';
	import CloudIcon from '@lucide/svelte/icons/cloud';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { onDestroy } from 'svelte';
	import { getWeatherAt } from '#lib/remote/weather.remote.ts';
	import type {
		WeatherCondition,
		WeatherSnapshot
	} from '#lib/server/monitoring/weather/weather-types.ts';

	type Props = {
		weather: WeatherSnapshot | null;
		/** False when the server has no WEATHER_LAT/WEATHER_LON configured. */
		locationConfigured: boolean;
	};

	let { weather: configuredWeather, locationConfigured }: Props = $props();

	const BROWSER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

	type LocationState = 'idle' | 'requesting' | 'denied' | 'unsupported';

	let browserWeather = $state<WeatherSnapshot | null>(null);
	let locationState = $state<LocationState>('idle');
	let coords: { latitude: number; longitude: number } | null = null;
	let refreshTimer: ReturnType<typeof setInterval> | undefined;

	$effect(() => {
		if (!locationConfigured && locationState === 'idle') {
			requestBrowserLocation();
		}
	});

	async function requestBrowserLocation() {
		if (!('geolocation' in navigator)) {
			locationState = 'unsupported';
			return;
		}

		locationState = 'requesting';
		try {
			const position = await new Promise<GeolocationPosition>((resolve, reject) =>
				navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000 })
			);
			coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
			locationState = 'idle';
			await fetchBrowserWeather();
			refreshTimer = setInterval(fetchBrowserWeather, BROWSER_REFRESH_INTERVAL_MS);
		} catch {
			locationState = 'denied';
		}
	}

	async function fetchBrowserWeather() {
		if (!coords) return;
		try {
			const weatherQuery = getWeatherAt(coords);
			await weatherQuery.refresh();
			browserWeather = await weatherQuery;
		} catch {
			// keep showing the last known-good browser weather on a transient failure
		}
	}

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
	});

	let weather = $derived(configuredWeather ?? browserWeather);

	const icons: Record<WeatherCondition, typeof SunIcon> = {
		sun: SunIcon,
		cloud: CloudIcon,
		rain: CloudRainIcon,
		snow: CloudSnowIcon,
		storm: CloudLightningIcon,
		fog: CloudFogIcon
	};
</script>

<div
	class="border-border bg-card flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-2.5"
>
	{#if weather}
		{@const CurrentIcon = icons[weather.current.condition]}
		<div class="flex items-center gap-3">
			<CurrentIcon class="text-primary size-7 flex-none" />
			<span class="text-foreground text-2xl leading-none font-extrabold">
				{weather.current.temp}°
			</span>
			<div class="leading-tight">
				<div class="text-foreground text-xs font-semibold capitalize">
					{weather.current.condition} · {weather.location}
				</div>
				<div class="text-muted-foreground text-[10.5px]">
					H:{weather.current.hi}° L:{weather.current.lo}° · Feels {weather.current.feelsLike}°
				</div>
			</div>
		</div>

		<div class="ml-auto hidden items-center gap-5 sm:flex">
			{#each weather.forecast as day (day.day)}
				{@const DayIcon = icons[day.condition]}
				<div class="flex items-center gap-1.5">
					<span class="text-muted-foreground text-[11px] tracking-wide">{day.day}</span>
					<DayIcon class="text-muted-foreground size-4" />
					<span class="text-foreground text-xs font-bold">{day.hi}°</span>
					<span class="text-muted-foreground text-[10.5px]">{day.lo}°</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground text-xs">
			{#if locationConfigured}
				Weather is temporarily unavailable.
			{:else if locationState === 'requesting'}
				Requesting your location…
			{:else if locationState === 'denied'}
				Location permission was denied. Allow location access, or set a location in Settings.
			{:else if locationState === 'unsupported'}
				Your browser doesn't support geolocation. Set a location in Settings to enable weather.
			{:else}
				Weather isn't configured. Set a location in Settings to enable it.
			{/if}
		</p>
	{/if}
</div>
