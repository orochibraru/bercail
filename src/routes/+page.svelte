<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dragHandleZone, type DndEvent } from 'svelte-dnd-action';
	import { invalidate, refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { reorderGroups, reorderItems } from '#lib/remote/dashboard.remote.ts';
	import RefreshButton from '#lib/components/dashboard/RefreshButton.svelte';
	import SystemStatsPanel from '#lib/components/dashboard/SystemStatsPanel.svelte';
	import SystemStatsPanelSkeleton from '#lib/components/dashboard/SystemStatsPanelSkeleton.svelte';
	import TasksPanel from '#lib/components/dashboard/TasksPanel.svelte';
	import UmamiPanel from '#lib/components/dashboard/UmamiPanel.svelte';
	import WeatherPanel from '#lib/components/dashboard/WeatherPanel.svelte';
	import WeatherPanelSkeleton from '#lib/components/dashboard/WeatherPanelSkeleton.svelte';
	import DashboardGroup from '#lib/components/DashboardGroup.svelte';
	import EmptyGroup from '#lib/components/EmptyGroup.svelte';
	import DeleteModal from '#lib/components/modals/DeleteModal.svelte';
	import GroupModal from '#lib/components/modals/GroupModal.svelte';
	import ItemModal from '#lib/components/modals/ItemModal.svelte';
	import { formatUptime } from '#lib/helpers.ts';
	import type { Group, Item } from '#lib/model.ts';
	import type { WeatherData } from '#lib/server/monitoring/weather/weather-types.ts';
	import type { TasksSnapshot } from '#lib/server/monitoring/caldav.ts';
	import type { UmamiWebsiteStats } from '#lib/server/monitoring/umami.ts';
	import type { MetricReading } from '#lib/server/monitoring/system/system-stats-types.ts';

	const { data } = $props();

	// Paused mid-drag: a reload would reset the live order and snap the dragged link back.
	let isDragging = false;
	const refreshTimer = setInterval(() => {
		if (!isDragging) invalidate('app:monitoring');
	}, 5000);
	onDestroy(() => clearInterval(refreshTimer));
	// The service worker painted this page from cache, so catch up right away.
	onMount(() => {
		if (navigator.serviceWorker?.controller) refreshAll();
	});

	// Follows the server data, but is overwritten while dragging so links move live.
	let groups = $derived<Group[]>(data.dashboard.groups);

	function replaceGroupItems(groupId: string, items: Item[]) {
		groups = groups.map((group) =>
			group.id === groupId
				? { ...group, items: items.map((item) => ({ ...item, groupId })) }
				: group
		);
	}

	function handleConsider(groupId: string, items: Item[]) {
		isDragging = true;
		replaceGroupItems(groupId, items);
	}

	// A move between groups finalizes both of them in a row, so they're saved together.
	const pendingGroupIds = new Set<string>();

	function handleFinalize(groupId: string, items: Item[]) {
		replaceGroupItems(groupId, items);
		pendingGroupIds.add(groupId);
		if (pendingGroupIds.size === 1) {
			setTimeout(persistOrder);
		}
	}

	async function persistOrder() {
		const payload = [...pendingGroupIds].map((groupId) => ({
			groupId,
			itemIds: groups.find((group) => group.id === groupId)?.items.map((item) => item.id) ?? []
		}));
		pendingGroupIds.clear();

		try {
			await reorderItems({ groups: payload });
		} catch {
			toast.error('Failed to save the new order');
		}
		// Reloads the layout data too, so the header search and later refreshes see the saved order.
		await refreshAll();
		isDragging = false;
	}

	const groupFlipDurationMs = 150;

	function handleGroupConsider(event: CustomEvent<DndEvent<Group>>) {
		isDragging = true;
		groups = event.detail.items;
	}

	async function handleGroupFinalize(event: CustomEvent<DndEvent<Group>>) {
		groups = event.detail.items;
		try {
			await reorderGroups(groups.map((group) => group.id));
		} catch {
			toast.error('Failed to save the new order');
		}
		await refreshAll();
		isDragging = false;
	}

	let weather: {
		lastUpdated: number;
		data: WeatherData | null;
	} = $state({
		lastUpdated: 0,
		data: null
	});
	let system: {
		lastUpdated: number;
		data: MetricReading[] | null;
	} = $state({
		lastUpdated: 0,
		data: null
	});

	// Kept across refreshes so the panel doesn't flicker; stays null (hidden) when Umami is off or failing.
	let analytics: UmamiWebsiteStats[] | null = $state(null);
	let tasks: TasksSnapshot | null = $state(null);

	let linkStatuses: Record<string, boolean> | undefined = $state();

	$effect(() => {
		data.weather.then((data) => {
			weather = { lastUpdated: Date.now(), data };
		});

		data.linkStatuses.then((statuses) => {
			linkStatuses = statuses;
		});

		data.analytics.then(
			(data) => {
				analytics = data;
			},
			() => {}
		);

		data.tasks.then(
			(data) => {
				tasks = data;
			},
			() => {}
		);

		data.system.then((data) => {
			system = { lastUpdated: Date.now(), data };
		});
	});
</script>

<svelte:head>
	<title>{data.config.appTitle} - Dashboard</title>
</svelte:head>

<main class="flex flex-col gap-4.5">
	<div class="flex flex-col gap-2.5">
		{#if weather.data}
			<RefreshButton section="weather" label="Weather" />
			<WeatherPanel weather={weather.data.snapshot} locationConfigured={weather.data.configured} />
		{:else}
			{#await data.weather}
				<WeatherPanelSkeleton />
			{:catch}
				<p>Failed to load weather</p>
			{/await}
		{/if}
		{#if system.data}
			<SystemStatsPanel stats={system.data} lastUpdated={system.lastUpdated} />
		{:else}
			{#await data.system}
				<SystemStatsPanelSkeleton />
			{:catch}
				<p>Failed to load system stats</p>
			{/await}
		{/if}
		{#if analytics}
			<RefreshButton section="analytics" label="Analytics" />
			<UmamiPanel websites={analytics} />
		{/if}
		{#if tasks}
			<RefreshButton section="tasks" label="Tasks" />
			<TasksPanel snapshot={tasks} />
		{/if}
	</div>

	<RefreshButton section="links" label="Links" />
	<div
		class="flex flex-col gap-4.5"
		use:dragHandleZone={{
			items: groups,
			type: 'group',
			flipDurationMs: groupFlipDurationMs,
			dropTargetStyle: {}
		}}
		onconsider={handleGroupConsider}
		onfinalize={handleGroupFinalize}
	>
		{#each groups as group (group.id)}
			<div animate:flip={{ duration: groupFlipDurationMs }}>
				<DashboardGroup
					{group}
					{linkStatuses}
					onConsider={handleConsider}
					onFinalize={handleFinalize}
				/>
			</div>
		{/each}
	</div>
	<EmptyGroup />
</main>

<div class="text-muted-foreground mt-5 text-center text-[11px]">
	{#if data.uptime}
		Uptime {formatUptime(data.uptime)} ·
	{/if}
	Refreshed every 5s
</div>

<GroupModal />

<ItemModal />

<DeleteModal />
