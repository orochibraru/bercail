<script lang="ts">
	import ChartLineIcon from '@lucide/svelte/icons/chart-line';
	import type { UmamiWebsiteStats } from '#lib/server/monitoring/umami.ts';

	type Props = {
		websites: UmamiWebsiteStats[];
	};

	let { websites }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
	{#each websites as site (site.id)}
		<div class="border-border bg-card min-w-0 rounded-lg border px-6 py-5">
			<div class="flex items-center gap-3">
				<ChartLineIcon class="text-primary size-9 flex-none" />
				<a
					href={site.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-foreground truncate text-lg font-bold hover:underline">{site.name}</a
				>
				{#if site.active > 0}
					<span class="text-primary text-sm font-medium">● {site.active} online</span>
				{/if}
			</div>
			<div class="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
				{#each site.ranges as range (range.label)}
					<div class="bg-muted/60 min-w-0 rounded-lg px-3.5 py-3 leading-tight">
						<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							{range.label}
						</div>
						<div class="mt-2 flex items-baseline gap-1.5">
							<span class="text-primary text-3xl leading-none font-extrabold">
								{range.visitors}
							</span>
							<span class="text-primary/80 text-sm">visitors</span>
						</div>
						<div class="mt-1.5 flex items-baseline gap-1.5">
							<span class="text-lg leading-none font-bold text-sky-600 dark:text-sky-400"
								>{range.pageviews}</span
							>
							<span class="text-sm text-sky-600/80 dark:text-sky-400/80">views</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="border-border bg-card text-muted-foreground rounded-lg border px-6 py-5 text-sm">
			No websites in Umami yet.
		</p>
	{/each}
</div>
