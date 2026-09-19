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
		class?: string;
	};

	let { section, label, class: className }: Props = $props();
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

<Button
	variant="ghost"
	size="icon"
	class={cn('text-muted-foreground size-7 flex-none', className)}
	disabled={refreshing}
	onclick={refresh}
	title="Refresh {label.toLowerCase()}"
	aria-label="Refresh {label.toLowerCase()}"
>
	<RefreshCwIcon class={cn('size-3.5', refreshing && 'animate-spin')} />
</Button>
