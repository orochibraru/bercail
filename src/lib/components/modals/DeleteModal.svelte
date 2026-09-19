<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import { deleteGroup, deleteItem } from '#lib/remote/dashboard.remote.ts';
	import { deleteTask } from '#lib/remote/tasks.remote.ts';
	import { deleteModalState } from '#lib/store/modals.ts';

	const deleteRequests = {
		group: deleteGroup,
		item: deleteItem,
		task: deleteTask
	} as const;

	async function deleteHandler() {
		if (!$deleteModalState.id) {
			throw new Error('Missing Entity ID');
		}

		await deleteRequests[$deleteModalState.type]($deleteModalState.id);

		$deleteModalState.open = false;
		await refreshAll();
	}

	async function handleDelete() {
		return toast.promise(deleteHandler, {
			loading: `Deleting "${$deleteModalState.name}""`,
			success: `"${$deleteModalState.name}" deleted`,
			error: (error) =>
				(error as { body?: { message?: string } }).body?.message ??
				`Failed to delete "${$deleteModalState.name}"`
		});
	}
</script>

<AlertDialog.Root bind:open={$deleteModalState.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title
				>Delete "{$deleteModalState.name}". Are you absolutely sure?</AlertDialog.Title
			>
			<AlertDialog.Description>
				This action cannot be undone. This will permanently delete "{$deleteModalState.name}".
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action class="bg-red-600 text-white" onclick={() => handleDelete()}
				>Continue</AlertDialog.Action
			>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
