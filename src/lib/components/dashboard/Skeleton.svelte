<script lang="ts">
	import { cn } from '#lib/utils.ts';

	type Props = {
		class?: string;
	};

	let { class: className = '' }: Props = $props();
</script>

<div class={cn('bg-muted animate-pulse rounded-md', className)}></div>
