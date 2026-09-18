<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { isUrlString } from '#lib/helpers.ts';
	import { saveItem } from '#lib/remote/dashboard.remote.ts';
	import { itemModalState } from '#lib/store/modals.ts';

	type LinkTarget = '_self' | '_blank';

	const targetOptions: { value: LinkTarget; name: string }[] = [
		{ value: '_self', name: 'Current tab' },
		{ value: '_blank', name: 'New tab' }
	];

	let item = $derived($itemModalState.item);
	let action = $derived($itemModalState.action);
	let itemForm = $derived(saveItem.for(item.id));
	let icon = $derived(itemForm.fields.icon.value() ?? item.icon ?? '');
</script>

{#snippet issues(messages: { message: string }[] | undefined)}
	{#each messages ?? [] as issue (issue.message)}
		<p class="invalid">{issue.message}</p>
	{/each}
{/snippet}

<Dialog.Root bind:open={$itemModalState.open}>
	<Dialog.Content>
		<h3 class="text-lg font-semibold">
			{action === 'edit' ? 'Edit' : 'New'} Link
		</h3>
		{#if icon}
			<div class="size-12 rounded-md p-1">
				<img
					src={isUrlString(icon)
						? icon
						: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${icon}.svg`}
					alt=""
					class="h-full w-full object-contain"
				/>
			</div>
		{/if}
		<form
			class="flex flex-col gap-4"
			{...itemForm.enhance(async (submission) => {
				try {
					if (await submission.submit()) {
						toast.success(action === 'edit' ? 'Link saved' : 'Link created');
						$itemModalState.open = false;
					}
				} catch {
					toast.error('Failed to save the link');
				}
			})}
		>
			<input {...itemForm.fields.action.as('hidden', action)} />
			<input {...itemForm.fields.id.as('hidden', item.id)} />
			<input {...itemForm.fields.groupId.as('hidden', item.groupId)} />

			<div class="flex flex-col gap-2">
				<Label for="item-title">Title</Label>
				<Input id="item-title" {...itemForm.fields.title.as('text', item.title)} />
				{@render issues(itemForm.fields.title.issues())}
			</div>

			<div class="flex flex-col gap-2">
				<Label for="item-url">URL</Label>
				<Input id="item-url" {...itemForm.fields.url.as('url', item.url)} />
				{@render issues(itemForm.fields.url.issues())}
			</div>

			<div class="flex flex-col gap-2">
				<Label for="item-description">Description</Label>
				<Input
					id="item-description"
					{...itemForm.fields.description.as('text', item.description ?? '')}
				/>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="item-target">Opens in</Label>
				<select
					id="item-target"
					class="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
					{...itemForm.fields.target.as('select', item.target as LinkTarget)}
				>
					{#each targetOptions as option (option.value)}
						<option value={option.value}>{option.name}</option>
					{/each}
				</select>
				{@render issues(itemForm.fields.target.issues())}
			</div>

			<div class="flex flex-col gap-2">
				<Label for="item-icon">Icon</Label>
				<Input id="item-icon" {...itemForm.fields.icon.as('text', item.icon ?? '')} />
				<p class="text-muted-foreground text-xs">
					URL or icon name from
					<a
						target="_blank"
						href="https://dashboardicons.com/icons"
						class="text-primary font-medium hover:underline"
					>
						Dashboard Icons
					</a>
				</p>
			</div>

			<Button type="submit" class="w-full" loading={itemForm.pending > 0}>Save</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
