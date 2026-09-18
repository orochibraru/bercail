<script lang="ts">
	import { SaveIcon, UploadIcon } from '@lucide/svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ComputerIcon from '@lucide/svelte/icons/computer';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import XIcon from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { exportBackup, restoreBackup } from '#lib/remote/dashboard.remote.ts';
	import {
		clearTasksSettings,
		getTasksSettings,
		saveTasksSettings
	} from '#lib/remote/tasks.remote.ts';
	import {
		clearUmamiSettings,
		getUmamiSettings,
		saveUmamiSettings
	} from '#lib/remote/umami.remote.ts';
	import {
		clearWeatherLocation as clearSavedWeatherLocation,
		getWeatherLocation,
		searchLocations,
		setWeatherLocation
	} from '#lib/remote/weather.remote.ts';

	let loading: boolean = $state(false);
	let backupLoading: boolean = $state(false);
	let restoreLoading: boolean = $state(false);
	let fileInputElement: HTMLInputElement | undefined = $state();

	type ThemeButtonProps = {
		icon: typeof SunIcon;
		theme: 'dark' | 'light' | 'system';
		text: string;
	};

	type GeoLocation = { latitude: number; longitude: number; label: string };
	type GeocodingResult = { label: string; latitude: number; longitude: number };

	let weatherLocation = $state<GeoLocation | null>(null);
	let weatherQuery = $state('');
	let weatherResults = $state<GeocodingResult[]>([]);
	let weatherSearching = $state(false);
	let weatherSearchTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		loadWeatherLocation();
	});

	async function loadWeatherLocation() {
		try {
			weatherLocation = await getWeatherLocation();
		} catch (error) {
			console.error('Failed to load weather location:', error);
		}
	}

	function onWeatherQueryInput() {
		clearTimeout(weatherSearchTimer);
		if (!weatherQuery.trim()) {
			weatherResults = [];
			return;
		}
		weatherSearchTimer = setTimeout(searchWeatherLocations, 300);
	}

	async function searchWeatherLocations() {
		weatherSearching = true;
		try {
			weatherResults = await searchLocations(weatherQuery.trim());
		} catch (error) {
			console.error('Weather location search failed:', error);
			weatherResults = [];
		} finally {
			weatherSearching = false;
		}
	}

	async function selectWeatherLocation(result: GeocodingResult) {
		try {
			await setWeatherLocation(result);
			weatherLocation = result;
			weatherQuery = '';
			weatherResults = [];
			toast.success(`Weather location set to ${result.label}`);
		} catch (error) {
			console.error('Failed to set weather location:', error);
			toast.error('Failed to set weather location');
		}
	}

	async function clearWeatherLocation() {
		try {
			await clearSavedWeatherLocation();
			weatherLocation = null;
			toast.success('Weather location cleared');
		} catch (error) {
			console.error('Failed to clear weather location:', error);
			toast.error('Failed to clear weather location');
		}
	}

	let umami = $state({ host: '', apiKey: '', websites: '' });
	let umamiHasApiKey = $state(false);
	let umamiSaving = $state(false);

	$effect(() => {
		loadUmamiSettings();
	});

	async function loadUmamiSettings() {
		try {
			const saved = await getUmamiSettings();
			umami = { host: saved?.host ?? '', apiKey: '', websites: saved?.websites ?? '' };
			umamiHasApiKey = saved?.hasApiKey ?? false;
		} catch (error) {
			console.error('Failed to load Umami settings:', error);
		}
	}

	async function saveUmami(event: SubmitEvent) {
		event.preventDefault();
		umamiSaving = true;
		try {
			await saveUmamiSettings(umami);
			await getUmamiSettings().refresh();
			await loadUmamiSettings();
			toast.success('Umami connected');
		} catch (error) {
			const message = (error as { body?: { message?: string } }).body?.message;
			toast.error(message ?? 'Failed to save Umami settings');
		} finally {
			umamiSaving = false;
		}
	}

	async function removeUmami() {
		try {
			await clearUmamiSettings();
			await getUmamiSettings().refresh();
			await loadUmamiSettings();
			toast.success('Umami disconnected');
		} catch (error) {
			console.error('Failed to clear Umami settings:', error);
			toast.error('Failed to remove Umami settings');
		}
	}

	let caldav = $state({ url: '', username: '', password: '' });
	let caldavHasPassword = $state(false);
	let caldavSaving = $state(false);

	$effect(() => {
		loadTasksSettings();
	});

	async function loadTasksSettings() {
		try {
			const saved = await getTasksSettings();
			caldav = { url: saved.url, username: saved.username, password: '' };
			caldavHasPassword = saved.hasPassword;
		} catch (error) {
			console.error('Failed to load tasks settings:', error);
		}
	}

	async function saveTasks(event: SubmitEvent) {
		event.preventDefault();
		caldavSaving = true;
		try {
			await saveTasksSettings(caldav);
			await getTasksSettings().refresh();
			await loadTasksSettings();
			toast.success('Tasks connected');
		} catch (error) {
			const message = (error as { body?: { message?: string } }).body?.message;
			toast.error(message ?? 'Failed to save tasks settings');
		} finally {
			caldavSaving = false;
		}
	}

	async function removeTasks() {
		try {
			await clearTasksSettings();
			await getTasksSettings().refresh();
			await loadTasksSettings();
			toast.success('Tasks disconnected');
		} catch (error) {
			console.error('Failed to clear tasks settings:', error);
			toast.error('Failed to remove tasks settings');
		}
	}

	async function downloadBackup() {
		backupLoading = true;
		try {
			const data = await exportBackup();
			const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			// Create a temporary anchor element to trigger the download
			const a = document.createElement('a');
			a.href = url;
			a.download = `bercail-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();

			// Clean up
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success('Backup downloaded successfully');
		} catch (error) {
			console.error('Backup error:', error);
			toast.error('Failed to download backup');
		} finally {
			backupLoading = false;
		}
	}

	async function handleRestoreFile(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		restoreLoading = true;
		try {
			const fileContent = await file.text();
			const backupData = JSON.parse(fileContent);

			const result = await restoreBackup(backupData);

			toast.success(
				`Backup restored successfully! ${result.groupsRestored} groups and ${result.itemsRestored} items restored.`
			);

			// Reload the page to show the restored data
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			console.error('Restore error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to restore backup');
		} finally {
			restoreLoading = false;
			// Reset the file input
			if (target) {
				target.value = '';
			}
		}
	}

	function triggerFileInput() {
		fileInputElement?.click();
	}
</script>

<svelte:head>
	<title>Settings - Bercail</title>
</svelte:head>

{#snippet section(title: string, description: string, content: Snippet)}
	<section
		class="border-border bg-card grid gap-4 rounded-lg border p-5 md:grid-cols-[14rem_1fr] md:gap-8"
	>
		<div>
			<h2 class="text-foreground font-semibold">{title}</h2>
			<p class="text-muted-foreground mt-1 text-sm">{description}</p>
		</div>
		<div class="min-w-0">
			{@render content()}
		</div>
	</section>
{/snippet}

{#snippet themeButton({ icon, theme, text }: ThemeButtonProps)}
	{@const Icon = icon}
	<Button
		class="flex-1"
		variant={userPrefersMode.current === theme ? 'default' : 'outline'}
		onclick={() => setMode(theme)}
	>
		<Icon class="h-4 w-4" />
		{text}
	</Button>
{/snippet}

{#snippet themeControls()}
	<div class="flex flex-wrap gap-2">
		{@render themeButton({ icon: ComputerIcon, theme: 'system', text: 'System' })}
		{@render themeButton({ icon: SunIcon, theme: 'light', text: 'Light' })}
		{@render themeButton({ icon: MoonIcon, theme: 'dark', text: 'Dark' })}
	</div>
{/snippet}

{#snippet weatherControls()}
	<div class="flex flex-col gap-3">
		{#if weatherLocation}
			<div
				class="bg-muted/60 flex items-center justify-between gap-2 rounded-lg py-1.5 pr-1.5 pl-3 text-sm"
			>
				<span class="flex min-w-0 items-center gap-2 font-medium">
					<MapPinIcon class="text-primary h-4 w-4 flex-none" />
					<span class="truncate">{weatherLocation.label}</span>
				</span>
				<Button
					size="sm"
					variant="ghost"
					onclick={clearWeatherLocation}
					title="Clear weather location"
					aria-label="Clear weather location"
				>
					<XIcon class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<div class="relative">
			<Input
				bind:value={weatherQuery}
				oninput={onWeatherQueryInput}
				placeholder={weatherLocation ? 'Change city...' : 'Search for a city...'}
			/>
			{#if weatherSearching}
				<p class="text-muted-foreground mt-1 text-xs">Searching…</p>
			{:else if weatherQuery.trim() && weatherResults.length === 0}
				<p class="text-muted-foreground mt-1 text-xs">No matching cities found.</p>
			{/if}
			{#if weatherResults.length > 0}
				<div class="bg-popover absolute z-10 mt-1 w-full rounded-md border shadow-md">
					{#each weatherResults as result (result.label + result.latitude)}
						<button
							type="button"
							onclick={() => selectWeatherLocation(result)}
							class="hover:bg-accent flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-left text-sm first:rounded-t-md last:rounded-b-md"
						>
							<MapPinIcon class="h-3.5 w-3.5 flex-none" />
							{result.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet umamiControls()}
	<form class="flex flex-col gap-3" onsubmit={saveUmami}>
		<label class="flex flex-col gap-1.5 text-sm font-medium">
			Instance URL
			<Input bind:value={umami.host} type="url" placeholder="https://umami.example.com" required />
		</label>
		<label class="flex flex-col gap-1.5 text-sm font-medium">
			API key
			<Input
				bind:value={umami.apiKey}
				type="password"
				autocomplete="off"
				placeholder={umamiHasApiKey ? 'Saved, leave blank to keep it' : 'Your Umami API key'}
				required={!umamiHasApiKey}
			/>
		</label>
		<label class="flex flex-col gap-1.5 text-sm font-medium">
			Websites
			<Input bind:value={umami.websites} placeholder="example.com, blog.example.com" />
			<span class="text-muted-foreground text-xs font-normal">
				Comma-separated domains, in display order. Leave empty to show every website.
			</span>
		</label>
		<div class="flex flex-wrap gap-2">
			<Button type="submit" loading={umamiSaving} class="flex-1">
				{#if !umamiSaving}<SaveIcon />{/if}
				Save
			</Button>
			{#if umamiHasApiKey}
				<Button variant="outline" onclick={removeUmami} class="flex-1">
					<XIcon />
					Disconnect
				</Button>
			{/if}
		</div>
	</form>
{/snippet}

{#snippet tasksControls()}
	<form class="flex flex-col gap-3" onsubmit={saveTasks}>
		<label class="flex flex-col gap-1.5 text-sm font-medium">
			CalDAV URL
			<Input bind:value={caldav.url} type="url" placeholder="https://caldav.tasks.org" required />
		</label>
		<label class="flex flex-col gap-1.5 text-sm font-medium">
			Username
			<Input bind:value={caldav.username} autocomplete="off" required />
		</label>
		<label class="flex flex-col gap-1.5 text-sm font-medium">
			App password
			<Input
				bind:value={caldav.password}
				type="password"
				autocomplete="off"
				placeholder={caldavHasPassword ? 'Saved, leave blank to keep it' : 'Your app password'}
				required={!caldavHasPassword}
			/>
			<span class="text-muted-foreground text-xs font-normal">
				In the tasks.org app, open Settings, then Synchronization, then your Tasks.org account and
				generate an app password.
			</span>
		</label>
		<div class="flex flex-wrap gap-2">
			<Button type="submit" loading={caldavSaving} class="flex-1">
				{#if !caldavSaving}<SaveIcon />{/if}
				Save
			</Button>
			{#if caldavHasPassword}
				<Button variant="outline" onclick={removeTasks} class="flex-1">
					<XIcon />
					Disconnect
				</Button>
			{/if}
		</div>
	</form>
{/snippet}

{#snippet backupControls()}
	<div class="flex flex-wrap gap-2">
		<Button
			loading={backupLoading}
			onclick={() => downloadBackup()}
			variant="outline"
			class="flex-1"
		>
			{#if !backupLoading}<SaveIcon />{/if}
			Download backup
		</Button>
		<Button loading={restoreLoading} onclick={triggerFileInput} variant="outline" class="flex-1">
			{#if !restoreLoading}<UploadIcon />{/if}
			Restore backup
		</Button>
		<input
			bind:this={fileInputElement}
			type="file"
			accept="application/json,.json"
			onchange={handleRestoreFile}
			class="hidden"
		/>
	</div>
{/snippet}

<div class="mx-auto flex max-w-3xl flex-col gap-4">
	<div class="mb-2">
		<a
			href="/"
			class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
		>
			<ArrowLeftIcon class="size-4" />
			Back to dashboard
		</a>
		<h1 class="text-foreground mt-3 text-3xl font-extrabold">Settings</h1>
	</div>

	{@render section('Theme', 'How the dashboard looks on this device.', themeControls)}
	{@render section(
		'Weather location',
		'The city used for the weather panel. Without one, the dashboard asks for your browser location.',
		weatherControls
	)}
	{@render section(
		'Analytics',
		'Connect a self-hosted Umami instance to show visitor stats on the dashboard. The connection is tested before saving.',
		umamiControls
	)}
	{@render section(
		'Tasks',
		'Show your open tasks from tasks.org, or from any CalDAV server like Nextcloud. The connection is tested before saving.',
		tasksControls
	)}
	{@render section(
		'Backup & restore',
		'Export your groups and links to JSON, or import them back. Restoring replaces what you have now.',
		backupControls
	)}
</div>
