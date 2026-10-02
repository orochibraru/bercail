<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { isOwnedByWidget } from '#lib/keyboard.ts';

	let open = $state(false);

	const shortcuts: [string[], string][] = [
		[['a–z', '/'], 'Search links, or the web, from anywhere'],
		[['⌘K', 'Ctrl K'], 'Open search'],
		[['↑', '↓', '←', '→'], 'Move between links and tasks'],
		[['Home', 'End'], 'First or last tile'],
		[['Enter'], 'Open the link, or tick the task off'],
		[['Tab'], "Reach a tile's edit and delete buttons"],
		[['Esc'], 'Close search or a dialog'],
		[['?'], 'This list']
	];

	function onkeydown(event: KeyboardEvent) {
		if (event.key === '?' && !isOwnedByWidget(event.target)) {
			event.preventDefault();
			open = true;
		}
	}
</script>

<svelte:document {onkeydown} />

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Keyboard shortcuts</Dialog.Title>
		</Dialog.Header>
		<dl class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2.5 text-sm">
			{#each shortcuts as [keys, action] (action)}
				<dt class="flex gap-1">
					{#each keys as key (key)}
						<kbd class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
					{/each}
				</dt>
				<dd class="text-muted-foreground">{action}</dd>
			{/each}
		</dl>
	</Dialog.Content>
</Dialog.Root>
