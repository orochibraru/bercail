<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { newGroup } from '#lib/factory.ts';
	import { groupModalState } from '#lib/store/modals.ts';

	function addGroup() {
		$groupModalState = {
			open: true,
			group: newGroup(),
			action: 'create'
		};
	}
</script>

<button
	onclick={addGroup}
	class="bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground flex cursor-pointer items-center justify-center gap-1.5 rounded-lg p-3 text-xs font-bold tracking-wide uppercase transition-colors"
>
	<PlusIcon class="size-4" />
	New group
</button>
