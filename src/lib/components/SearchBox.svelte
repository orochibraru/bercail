<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import * as Command from '#lib/components/ui/command/index.ts';
	import { isUrlString } from '#lib/helpers.ts';
	import { isOwnedByWidget } from '#lib/keyboard.ts';
	import type { Group, Item } from '#lib/model.ts';
	import { searchEngines } from '#lib/search.ts';
	import { deleteModalState, groupModalState, itemModalState } from '#lib/store/modals.ts';

	type Props = {
		groups: Group[];
	};

	const { groups }: Props = $props();

	let open = $state(false);
	let searchValue = $state('');

	let searchKeyDownDisabled = $derived(
		$groupModalState.open || $itemModalState.open || $deleteModalState.open
	);

	function handleKeydown(e: KeyboardEvent) {
		if (searchKeyDownDisabled) {
			return;
		}

		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			open = !open;
			return;
		}

		// Typing anywhere searches: the first key opens the palette, and the ones typed before its
		// input takes focus are kept. `/` opens it empty, `?` is the shortcuts list.
		const printable = e.key.length === 1 && e.key !== ' ' && e.key !== '?';
		if (!printable || e.metaKey || e.ctrlKey || e.altKey || isOwnedByWidget(e.target)) {
			return;
		}
		e.preventDefault();
		if (!open) {
			searchValue = e.key === '/' ? '' : e.key;
			open = true;
		} else {
			searchValue += e.key;
		}
	}

	function customFilter(commandValue: string, search: string, commandKeywords?: string[]): number {
		if (commandValue.toLowerCase().includes('search')) {
			return 1;
		}

		if (commandValue.toLowerCase().includes(search.toLowerCase())) {
			return 1;
		}

		if (
			commandKeywords &&
			commandKeywords.length > 0 &&
			commandKeywords.includes(search.toLocaleLowerCase())
		) {
			return 1;
		}

		return 0;
	}
</script>

<svelte:document onkeydown={handleKeydown} />

<button
	type="button"
	onclick={() => (open = true)}
	class="border-border bg-card text-muted-foreground hover:text-foreground flex h-9.5 min-w-[220px] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors"
>
	<SearchIcon class="size-4" />
	Search
	<kbd class="bg-muted ml-auto rounded px-1.5 font-mono text-[11px]">/</kbd>
</button>

<!-- Cleared on close, so ⌘K never reopens on the last query with new keys tacked on. -->
<Command.Dialog
	bind:open
	filter={customFilter}
	onOpenChange={(value) => {
		if (!value) searchValue = '';
	}}
>
	<Command.Input bind:value={searchValue} placeholder="Type a command or search..." />
	<Command.List>
		<Command.Empty>No results found.</Command.Empty>
		{#each groups as group}
			<Command.Group heading={group.title}>
				{#each group.items as item}
					<Command.LinkItem href={item.url} title={item.title} target="_top">
						{#if item.icon}
							{#if isUrlString(item.icon)}
								<img src={item.icon} alt={item.title} class="h-5 w-5 rounded-full object-cover" />
							{:else}
								<img
									src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/{item.icon}.svg"
									alt={item.title}
									class="h-5 w-5 rounded-full object-cover"
								/>
							{/if}
						{/if}
						<span>{item.title}</span>
					</Command.LinkItem>
				{/each}
			</Command.Group>
			<Command.Separator />
		{/each}
		{#if searchValue.length > 0}
			<Command.Group heading="Web Search">
				{#each searchEngines as searchEngine}
					<Command.LinkItem
						href="{searchEngine.urlTemplate}{encodeURIComponent(searchValue)}"
						title={searchEngine.name}
						target="_top"
					>
						<img
							src={searchEngine.icon}
							alt="{searchEngine.name} icon"
							class="h-5 w-5 rounded-full object-cover"
						/>
						<span>
							Search "{searchValue}" on {searchEngine.name}
						</span>
					</Command.LinkItem>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
