<script lang="ts">
	import ChartLineIcon from '@lucide/svelte/icons/chart-line';
	import type { UmamiWebsiteStats } from '#lib/server/monitoring/umami.ts';

	type Props = {
		websites: UmamiWebsiteStats[];
	};

	let { websites }: Props = $props();

	// 20189 -> "20.2K", so every tile fits at any width; the exact count is in the tooltip.
	const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
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
						<div
							class="text-primary mt-2 text-3xl leading-none font-extrabold"
							title="{range.visitors} visitors"
						>
							{compact.format(range.visitors)}
						</div>
						<div class="text-primary/80 mt-1 text-sm">visitors</div>
						<div class="mt-1.5 flex items-baseline gap-1.5" title="{range.pageviews} views">
							<span class="text-lg leading-none font-bold text-sky-600 dark:text-sky-400"
								>{compact.format(range.pageviews)}</span
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
