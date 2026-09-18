<script lang="ts">
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import GaugeIcon from '@lucide/svelte/icons/gauge';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import MemoryStickIcon from '@lucide/svelte/icons/memory-stick';
	import ThermometerIcon from '@lucide/svelte/icons/thermometer';
	import type {
		MetricKey,
		MetricReading
	} from '#lib/server/monitoring/system/system-stats-types.ts';

	type Props = {
		stats: MetricReading[];
		lastUpdated: number;
	};

	let { stats, lastUpdated }: Props = $props();

	const icons: Record<MetricKey, typeof CpuIcon> = {
		cpu: CpuIcon,
		ram: MemoryStickIcon,
		disk: HardDriveIcon,
		temperature: ThermometerIcon,
		gpu: GaugeIcon
	};

	// The gauge is a 270° arc: the track covers 75% of the circle, opening at the bottom.
	const ARC_LENGTH = 75;

	function gaugeColorClass(stat: MetricReading): string {
		const value = stat.key === 'temperature' ? (stat.percent ?? 0) + 20 : (stat.percent ?? 0);
		if (value >= 85) return 'text-red-600';
		if (value >= 65) return 'text-yellow-600';
		return 'text-blue-600';
	}
</script>

<div
	class="border-border bg-card grid grid-cols-2 items-center gap-x-6 gap-y-2.5 rounded-lg border px-4 py-2 sm:grid-cols-3 lg:grid-cols-5"
	title="Last updated: {new Date(lastUpdated).toLocaleString()}"
>
	{#each stats as stat (stat.key)}
		{@const Icon = icons[stat.key]}
		{@const percent = Math.min(100, Math.max(0, stat.percent ?? 0))}
		<div class="flex min-w-0 items-center gap-2.5" title={stat.detail}>
			<div class="relative size-11 flex-none">
				<svg viewBox="0 0 40 40" class="size-full rotate-135" aria-hidden="true">
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						pathLength="100"
						stroke-width="4"
						stroke-linecap="round"
						stroke-dasharray="{ARC_LENGTH} 100"
						class="stroke-muted"
					/>
					{#if stat.available}
						<circle
							cx="20"
							cy="20"
							r="16"
							fill="none"
							pathLength="100"
							stroke="currentColor"
							stroke-width="4"
							stroke-linecap="round"
							stroke-dasharray="{(percent / 100) * ARC_LENGTH} 100"
							class={[
								'transition-[stroke-dasharray,color] duration-700 ease-out',
								gaugeColorClass(stat)
							]}
						/>
					{/if}
				</svg>
				<span
					class="text-foreground absolute inset-0 flex items-center justify-center text-[10px] font-bold"
				>
					{stat.available ? `${stat.percent}${stat.key === 'temperature' ? '°' : '%'}` : 'N/A'}
				</span>
			</div>
			<div class="min-w-0 leading-tight">
				<div class="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold">
					<Icon class="size-3.5 flex-none" />
					{stat.label}
				</div>
				<div class="text-muted-foreground truncate text-[10.5px]">{stat.detail}</div>
			</div>
		</div>
	{/each}
</div>
