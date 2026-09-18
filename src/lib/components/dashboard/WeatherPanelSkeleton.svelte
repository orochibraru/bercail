<script lang="ts">
	import Skeleton from '#lib/components/dashboard/Skeleton.svelte';
</script>

<div
	class="border-border bg-card flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-2.5"
>
	<div class="flex items-center gap-3">
		<Skeleton class="size-7 flex-none" />
		<Skeleton class="h-6 w-12" />
		<div>
			<Skeleton class="h-3 w-28" />
			<Skeleton class="mt-1 h-2.5 w-36" />
		</div>
	</div>

	<div class="ml-auto hidden items-center gap-5 sm:flex">
		{#each { length: 5 } as _, i (i)}
			<Skeleton class="h-4 w-20" />
		{/each}
	</div>
</div>
