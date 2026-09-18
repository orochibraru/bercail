<script lang="ts">
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { onDestroy } from 'svelte';
	import SearchBox from '#lib/components/SearchBox.svelte';
	import type { Group } from '#lib/model.ts';
	import { resolve } from '$app/paths';

	type Props = {
		groups: Group[];
	};

	let { groups }: Props = $props();

	let now = $state(new Date());
	const timer = setInterval(() => {
		now = new Date();
	}, 1000);
	onDestroy(() => clearInterval(timer));

	let dateStr = $derived(
		now.toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
	let timeStr = $derived(
		now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	);
</script>

<div class="mb-5 flex flex-wrap items-center gap-3 pb-4 md:gap-4">
	<a class="order-2 md:order-1" href={resolve('/')}>
		<div class="text-foreground text-3xl leading-none font-extrabold tabular-nums">
			{timeStr}
		</div>
		<div class="text-muted-foreground mt-1.5 text-sm font-medium capitalize">
			{dateStr}
		</div>
	</a>

	<div class="order-3 ml-auto flex items-center gap-2.5">
		<SearchBox {groups} />
		<a
			href="/settings"
			title="Open settings"
			aria-label="Open settings"
			class="bg-card text-foreground hover:bg-accent flex h-9.5 w-9.5 flex-none cursor-pointer items-center justify-center rounded-md transition-colors"
		>
			<SettingsIcon class="size-4" />
		</a>
	</div>
</div>
