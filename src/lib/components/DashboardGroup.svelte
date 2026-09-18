<script lang="ts">
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import PenBoxIcon from '@lucide/svelte/icons/pen-box';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import { flip } from 'svelte/animate';
	import {
		dragHandle,
		dragHandleZone,
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent
	} from 'svelte-dnd-action';
	import DashboardItem from '#lib/components/DashboardItem.svelte';
	import { newItem } from '#lib/factory.ts';
	import type { Group, Item } from '#lib/model.ts';
	import { deleteModalState, groupModalState, itemModalState } from '#lib/store/modals.ts';

	type Props = {
		group: Group;
		linkStatuses?: Record<string, boolean>;
		/** Live preview while dragging. */
		onConsider: (groupId: string, items: Item[]) => void;
		/** The drag ended with these items in this group. */
		onFinalize: (groupId: string, items: Item[]) => void;
	};

	let { group, linkStatuses, onConsider, onFinalize }: Props = $props();

	const flipDurationMs = 150;

	function isShadowItem(item: Item): boolean {
		return Boolean((item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
	}

	let linkCount = $derived(group.items.filter((item) => !isShadowItem(item)).length);

	function addItem() {
		$itemModalState = {
			open: true,
			item: { ...newItem(), groupId: group.id },
			action: 'create'
		};
	}

	function editGroup() {
		$groupModalState = {
			open: true,
			group,
			action: 'edit'
		};
	}

	function deleteGroup() {
		$deleteModalState = {
			open: true,
			id: group.id,
			name: group.title,
			type: 'group'
		};
	}
</script>

<section
	role="group"
	aria-label={group.title}
	class="border-border bg-card flex flex-col gap-2.5 rounded-lg border p-2.5"
>
	<div class="flex items-center justify-between gap-3.5 px-1">
		<div class="flex min-w-0 items-center gap-2">
			<span
				use:dragHandle
				class="text-muted-foreground hover:text-foreground flex-none cursor-grab active:cursor-grabbing"
				title="Drag to reorder group"
				aria-label="Drag to reorder group"
			>
				<GripVerticalIcon class="size-3.5" />
			</span>
			<div class="min-w-0">
				<h5 class="text-foreground truncate text-sm font-bold tracking-wide uppercase">
					{group.title}
				</h5>
				{#if group.description}
					<p class="text-muted-foreground truncate text-[11px]">{group.description}</p>
				{/if}
			</div>
		</div>
		<div class="flex flex-none items-center gap-3.5">
			<span class="text-muted-foreground text-[11px] tracking-wide">
				{linkCount} LINKS
			</span>
			<div class="flex gap-1.5">
				<button
					onclick={addItem}
					title="Add link"
					aria-label="Add link"
					class="text-muted-foreground hover:bg-muted hover:text-foreground flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded"
				>
					<PlusIcon class="size-3.5" />
				</button>
				<button
					onclick={editGroup}
					title="Rename group"
					aria-label="Rename group"
					class="text-muted-foreground hover:bg-muted hover:text-foreground flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded"
				>
					<PenBoxIcon class="size-3" />
				</button>
				<button
					onclick={deleteGroup}
					title="Delete group"
					aria-label="Delete group"
					class="hover:bg-muted flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded text-red-600 dark:text-red-500"
				>
					<TrashIcon class="size-3" />
				</button>
			</div>
		</div>
	</div>

	<div class="relative">
		{#if group.items.length === 0}
			<p
				class="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-[11.5px] tracking-wide uppercase"
			>
				No links yet
			</p>
		{/if}
		<div
			class="grid min-h-[60px] grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3"
			use:dragHandleZone={{
				items: group.items,
				type: 'link',
				flipDurationMs,
				dropTargetStyle: {},
				useCursorForDetection: true
			}}
			onconsider={(event: CustomEvent<DndEvent<Item>>) => onConsider(group.id, event.detail.items)}
			onfinalize={(event: CustomEvent<DndEvent<Item>>) => onFinalize(group.id, event.detail.items)}
		>
			{#each group.items as item (item.id)}
				<div animate:flip={{ duration: flipDurationMs }} class="relative">
					<DashboardItem {item} online={linkStatuses?.[item.url]} />
					{#if isShadowItem(item)}
						<!-- The library hides the placeholder slot, `visible` lets this outline show through. -->
						<div
							class="border-primary/60 bg-primary/5 visible absolute inset-0 rounded-lg border-2 border-dashed"
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
