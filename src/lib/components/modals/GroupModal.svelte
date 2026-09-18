<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { saveGroup } from '#lib/remote/dashboard.remote.ts';
	import { groupModalState } from '#lib/store/modals.ts';

	let group = $derived($groupModalState.group);
	let action = $derived($groupModalState.action);
	let groupForm = $derived(saveGroup.for(group.id));
</script>

<Dialog.Root bind:open={$groupModalState.open}>
	<Dialog.Content class="sm:max-w-[425px]">
		<h3 class="text-lg font-semibold">
			{action === 'edit' ? 'Edit' : 'New'} Group
		</h3>
		<form
			class="flex flex-col gap-6"
			{...groupForm.enhance(async (submission) => {
				try {
					if (await submission.submit()) {
						toast.success(action === 'edit' ? 'Group saved' : 'Group created');
						$groupModalState.open = false;
					}
				} catch {
					toast.error('Failed to save the group');
				}
			})}
		>
			<input {...groupForm.fields.action.as('hidden', action)} />
			<input {...groupForm.fields.id.as('hidden', group.id)} />

			<div class="flex flex-col gap-2">
				<Label for="group-title">Title</Label>
				<Input id="group-title" {...groupForm.fields.title.as('text', group.title)} />
				{#each groupForm.fields.title.issues() ?? [] as issue (issue.message)}
					<p class="invalid">{issue.message}</p>
				{/each}
			</div>

			<div class="flex flex-col gap-2">
				<Label for="group-description">Description</Label>
				<Input
					id="group-description"
					{...groupForm.fields.description.as('text', group.description ?? '')}
				/>
			</div>

			<Button loading={groupForm.pending > 0} type="submit" class="w-full">Save</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
