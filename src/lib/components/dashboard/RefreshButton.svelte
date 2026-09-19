<script lang="ts">
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { clearSectionCache } from '#lib/remote/monitoring.remote.ts';
	import type { CachedSection } from '#lib/server/monitoring/monitoring-service.ts';
	import { cn } from '#lib/utils.ts';

	type Props = {
		section: CachedSection;
		label: string;
	};

	let { section, label }: Props = $props();
	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			await clearSectionCache(section);
			await invalidate('app:monitoring');
		} catch {
			toast.error(`Failed to refresh ${label.toLowerCase()}`);
		} finally {
			refreshing = false;
		}
	}
</script>

<div class="-mb-1.5 flex justify-end">
	<Button
		variant="ghost"
		size="sm"
		class="text-muted-foreground h-6 text-xs"
		disabled={refreshing}
		onclick={refresh}
		aria-label="Refresh {label.toLowerCase()}"
	>
		<RefreshCwIcon data-icon="inline-start" class={cn(refreshing && 'animate-spin')} />
		{label}
	</Button>
</div>
