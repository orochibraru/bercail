<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import PenBoxIcon from '@lucide/svelte/icons/pen-box';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.ts';
	import { isUrlString } from '#lib/helpers.ts';
	import type { Item } from '#lib/model.ts';
	import { deleteModalState, itemModalState } from '#lib/store/modals.ts';

	type Props = {
		item: Item;
		online?: boolean;
	};

	const { item, online }: Props = $props();

	const initials = $derived(item.title.slice(0, 2).toUpperCase());

	function editItem() {
		$itemModalState = {
			open: true,
			item,
			action: 'edit'
		};
	}

	function deleteItem() {
		$deleteModalState = {
			open: true,
			id: item.id,
			name: item.title,
			type: 'item'
		};
	}
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger
		class="bg-muted/60 hover:bg-muted flex items-center gap-2.5 rounded-lg px-3.5 py-3 transition-colors"
	>
		<span
			use:dragHandle
			class="drag-handle text-muted-foreground hover:text-foreground flex-none cursor-grab active:cursor-grabbing"
			title="Drag to reorder"
			aria-label="Drag to reorder"
		>
			<GripVerticalIcon class="size-3.5" />
		</span>
		<!-- _top so same-tab links leave the extension's iframe too. -->
		<a
			target={item.target === '_self' ? '_top' : item.target}
			href={item.url}
			class="flex min-w-0 flex-1 items-center gap-2.5"
		>
			<div
				class="bg-card text-muted-foreground flex size-9 flex-none items-center justify-center overflow-hidden rounded-md p-1.5 text-[10px] font-extrabold"
			>
				{#if item.icon}
					{#if isUrlString(item.icon)}
						<img
							src={item.icon}
							alt={item.title}
							loading="lazy"
							class="h-full w-full object-contain"
						/>
					{:else}
						<img
							src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/{item.icon}.svg"
							alt={item.title}
							loading="lazy"
							class="h-full w-full object-contain"
						/>
					{/if}
				{:else}
					{initials}
				{/if}
			</div>
			<div class="min-w-0">
				<div class="text-foreground truncate text-[13px] font-semibold">
					{item.title}
				</div>
				<div class="text-muted-foreground truncate text-[11px]">
					{item.description}
				</div>
			</div>
		</a>

		<span
			class={[
				'size-2 flex-none rounded-full',
				online === undefined && 'bg-muted-foreground/40 animate-pulse',
				online === true && 'bg-green-500',
				online === false && 'bg-red-500'
			]}
			title={online === undefined ? 'Checking' : online ? 'Online' : 'Offline'}
			aria-label={online === undefined ? 'Checking' : online ? 'Online' : 'Offline'}
		></span>

		<div class="ml-2 flex flex-none gap-1">
			<button
				onclick={editItem}
				title="Edit link"
				aria-label="Edit link"
				class="text-muted-foreground hover:bg-card hover:text-foreground flex h-[22px] w-[22px] flex-none cursor-pointer items-center justify-center rounded"
			>
				<PenBoxIcon class="size-3" />
			</button>
			<button
				onclick={deleteItem}
				title="Delete link"
				aria-label="Delete link"
				class="hover:bg-card flex h-[22px] w-[22px] flex-none cursor-pointer items-center justify-center rounded text-red-600 dark:text-red-500"
			>
				<TrashIcon class="size-3" />
			</button>
		</div>
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<ContextMenu.Item onclick={editItem} class="cursor-pointer text-xs">
			<PenBoxIcon />
			Edit
		</ContextMenu.Item>
		<ContextMenu.Item
			onclick={deleteItem}
			class="cursor-pointer text-xs text-red-600 dark:text-red-500"
		>
			<TrashIcon />
			Delete
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
