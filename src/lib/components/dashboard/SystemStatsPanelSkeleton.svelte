<script lang="ts">
	import Skeleton from '#lib/components/dashboard/Skeleton.svelte';
</script>

<div
	class="border-border bg-card grid grid-cols-2 items-center gap-x-6 gap-y-2.5 rounded-lg border px-4 py-2 sm:grid-cols-3 lg:grid-cols-5"
>
	{#each { length: 5 } as _, i (i)}
		<div class="flex items-center gap-2.5">
			<Skeleton class="size-11 flex-none rounded-full" />
			<div>
				<Skeleton class="h-3 w-14" />
				<Skeleton class="mt-1 h-2.5 w-20" />
			</div>
		</div>
	{/each}
</div>
