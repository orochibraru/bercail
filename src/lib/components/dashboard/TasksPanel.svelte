<script lang="ts">
	import {
		fromDate,
		getLocalTimeZone,
		parseDate,
		toCalendarDate,
		today,
		type DateValue
	} from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ListTodoIcon from '@lucide/svelte/icons/list-todo';
	import PenBoxIcon from '@lucide/svelte/icons/pen-box';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import Undo2Icon from '@lucide/svelte/icons/undo-2';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.ts';
	import { DUE_PRESETS, presetDate, type DuePreset } from '#lib/due-presets.ts';
	import { addTask, completeTask, updateTask } from '#lib/remote/tasks.remote.ts';
	import type { Task, TasksSnapshot } from '#lib/server/monitoring/caldav.ts';
	import { deleteModalState } from '#lib/store/modals.ts';
	import { cn } from '#lib/utils.ts';

	type Props = {
		snapshot: TasksSnapshot;
	};

	let { snapshot }: Props = $props();
	let { lists, tasks } = $derived(snapshot);

	// Ticked off in this session: they keep their line, struck through, so a misclick can be undone.
	let done = $state<{ task: Task; index: number }[]>([]);
	let rows = $derived.by(() => {
		const isDone = (task: Task) => done.some((entry) => entry.task.uid === task.uid);
		const result = tasks.filter((task) => !isDone(task)).map((task) => ({ task, done: false }));
		for (const entry of done.toSorted((a, b) => a.index - b.index)) {
			result.splice(entry.index, 0, { task: entry.task, done: true });
		}
		return result;
	});
	let openCount = $derived(rows.filter((row) => !row.done).length);

	let adding = $state(false);
	let saving = $state(false);
	type Draft = {
		title: string;
		when: 'none' | DuePreset | 'custom';
		due: DateValue | undefined;
		time: string;
		priority: string;
		listUrl: string;
	};
	const emptyDraft = {
		title: '',
		when: 'none' as const,
		due: undefined,
		time: '',
		priority: '0'
	};
	let draft = $state<Draft>({ ...emptyDraft, listUrl: '' });
	let dueOpen = $state(false);
	let allOpen = $state(false);

	const priorities = [
		{ value: '1', label: 'High priority' },
		{ value: '5', label: 'Medium priority' },
		{ value: '9', label: 'Low priority' },
		{ value: '0', label: 'No priority' }
	];

	const shortDate = (date: Date) =>
		date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

	let whenItems = $derived([
		{ value: 'none', label: 'No due date', hint: '' },
		...DUE_PRESETS.map((preset) => ({
			value: preset.value,
			label: preset.label,
			hint: adding ? shortDate(presetDate(preset.value)) : ''
		})),
		{ value: 'custom', label: 'Custom', hint: '' }
	]);

	let listItems = $derived(lists.map((list) => ({ value: list.url, label: list.name })));

	let editing = $state<Task | null>(null);

	const priorityBucket = (priority: number) =>
		priority === 0 ? '0' : priority < 5 ? '1' : priority === 5 ? '5' : '9';

	async function openForm(task: Task | null = null) {
		editing = task;
		allOpen = false;
		adding = true;
		draft = { ...emptyDraft, listUrl: draft.listUrl || (lists[0]?.url ?? '') };
		if (task) {
			const timed = task.due !== null && task.due.length > 10;
			draft = {
				...draft,
				title: task.title,
				when: task.due ? 'custom' : 'none',
				due: !task.due
					? undefined
					: timed
						? toCalendarDate(fromDate(new Date(task.due), getLocalTimeZone()))
						: parseDate(task.due),
				time:
					task.due && timed
						? new Date(task.due).toLocaleTimeString('en-GB', { timeStyle: 'short' })
						: '',
				priority: priorityBucket(task.priority)
			};
		}
	}

	function closeForm() {
		adding = false;
		editing = null;
	}

	function confirmDelete(task: Task) {
		allOpen = false;
		deleteModalState.set({ open: true, type: 'task', id: task.uid, name: task.title });
	}

	const errorMessage = (error: unknown) => (error as { body?: { message?: string } }).body?.message;

	async function setDone(task: Task, value: boolean) {
		const forget = () => (done = done.filter((entry) => entry.task.uid !== task.uid));
		if (value) {
			done = [...done, { task, index: rows.findIndex((row) => row.task.uid === task.uid) }];
		}
		try {
			await completeTask({ uid: task.uid, done: value });
			await invalidate('app:monitoring');
			// Only now: the reopened task is back in the snapshot, so its line doesn't blink.
			if (!value) forget();
		} catch (error) {
			if (value) forget();
			toast.error(errorMessage(error) ?? `Failed to ${value ? 'complete' : 'reopen'} the task`);
			await invalidate('app:monitoring');
		}
	}

	async function duplicate(task: Task) {
		// ponytail: lists are matched by name; carry the list URL on Task if two lists share a name.
		const listUrl = lists.find((list) => list.name === task.list)?.url ?? '';
		try {
			await addTask({ listUrl, title: task.title, due: task.due, priority: task.priority });
			toast.success('Task duplicated');
		} catch (error) {
			toast.error(errorMessage(error) ?? 'Failed to duplicate the task');
		}
		await invalidate('app:monitoring');
	}

	function dueValue(): string | null {
		if (draft.when === 'none') return null;
		if (draft.when !== 'custom') return presetDate(draft.when).toISOString();
		if (!draft.due) return null;
		if (!draft.time) return draft.due.toString();
		const date = draft.due.toDate(getLocalTimeZone());
		const [hours, minutes] = draft.time.split(':').map(Number);
		date.setHours(hours, minutes);
		return date.toISOString();
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		const task = { title: draft.title, due: dueValue(), priority: Number(draft.priority) || 0 };
		try {
			if (editing) {
				// Keeps priorities like 3 from other apps when the colour wasn't changed.
				if (draft.priority === priorityBucket(editing.priority)) task.priority = editing.priority;
				await updateTask({ uid: editing.uid, ...task });
				toast.success('Task saved');
				closeForm();
			} else {
				await addTask({ listUrl: draft.listUrl, ...task });
				toast.success('Task added');
				closeForm();
			}
			await invalidate('app:monitoring');
		} catch (error) {
			toast.error(errorMessage(error) ?? `Failed to ${editing ? 'save' : 'add'} the task`);
			await invalidate('app:monitoring');
		} finally {
			saving = false;
		}
	}

	const shown = 8;
	const DAY_MS = 24 * 60 * 60 * 1000;

	/** "2026-09-18" is a local date, not UTC midnight. */
	function dueDate(due: string): Date {
		const [y, m, d] = due.split('-').map(Number);
		return due.length === 10 ? new Date(y, m - 1, d) : new Date(due);
	}

	function dueLabel(due: string): { text: string; overdue: boolean } {
		const date = dueDate(due);
		const allDay = due.length === 10;
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const days = Math.floor(
			(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - today.getTime()) /
				DAY_MS
		);
		const time = allDay ? '' : ` ${date.toLocaleTimeString([], { timeStyle: 'short' })}`;
		const overdue = allDay ? days < 0 : date < now;
		const day =
			days === 0
				? 'Today'
				: days === 1
					? 'Tomorrow'
					: days === -1
						? 'Yesterday'
						: days > 1 && days < 7
							? date.toLocaleDateString([], { weekday: 'long' })
							: date.toLocaleDateString([], { day: 'numeric', month: 'short' });
		return { text: day + time, overdue };
	}

	// Same colors as the tasks.org app: 1-4 high, 5 medium, 6-9 low.
	function priorityClass(priority: number, filled: boolean): string {
		if (priority === 0) return cn('border-muted-foreground/40', filled && 'bg-muted-foreground/40');
		if (priority < 5) return cn('border-red-500', filled && 'bg-red-500');
		if (priority === 5) return cn('border-amber-500', filled && 'bg-amber-500');
		return cn('border-sky-500', filled && 'bg-sky-500');
	}
</script>

{#snippet priorityRing(priority: number, filled = false)}
	<span
		class={cn('size-3.5 flex-none rounded-full border-2', priorityClass(priority, filled))}
		aria-hidden="true"
	></span>
{/snippet}

{#snippet taskList(items: typeof rows)}
	<ul class="mt-3 flex flex-col">
		{#each items as { task, done: isDone } (task.uid)}
			{@const due = task.due ? dueLabel(task.due) : null}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet child({ props })}
						<li
							{...props}
							class="border-border flex items-center gap-3 border-b py-1 last:border-b-0"
						>
							<button
								onclick={() => setDone(task, !isDone)}
								title={isDone ? 'Mark as not done' : 'Mark as done'}
								aria-label="{isDone ? 'Mark as not done' : 'Mark as done'}: {task.title}"
								aria-pressed={isDone}
								class="group -m-1 flex flex-none cursor-pointer items-center justify-center rounded-full p-1"
							>
								<span
									class={cn(
										'flex size-4 items-center justify-center rounded-full border-2',
										priorityClass(task.priority, isDone)
									)}
								>
									<CheckIcon
										class={cn(
											'size-2.5 stroke-[4] text-white',
											!isDone &&
												'group-hover:text-muted-foreground opacity-0 group-hover:opacity-100'
										)}
									/>
								</span>
							</button>
							<span
								class={cn(
									'min-w-0 flex-1 truncate text-sm',
									isDone ? 'text-muted-foreground line-through' : 'text-foreground'
								)}
								title={task.title}>{task.title}</span
							>
							<span class="text-muted-foreground hidden flex-none text-xs sm:inline"
								>{task.list}</span
							>
							<span
								class={cn(
									'w-28 flex-none text-right text-xs whitespace-nowrap',
									due?.overdue && !isDone
										? 'font-semibold text-red-600 dark:text-red-400'
										: 'text-muted-foreground'
								)}>{due?.text}</span
							>
							<div class="flex w-20 flex-none justify-end gap-1">
								{#if isDone}
									<Button
										variant="ghost"
										size="sm"
										class="h-7"
										onclick={() => setDone(task, false)}
									>
										<Undo2Icon />
										Cancel
									</Button>
								{:else}
									<button
										onclick={() => openForm(task)}
										title="Edit task"
										aria-label="Edit {task.title}"
										class="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded"
									>
										<PenBoxIcon class="size-4" />
									</button>
									<button
										onclick={() => confirmDelete(task)}
										title="Delete task"
										aria-label="Delete {task.title}"
										class="hover:bg-muted flex size-7 cursor-pointer items-center justify-center rounded text-red-600 dark:text-red-500"
									>
										<TrashIcon class="size-4" />
									</button>
								{/if}
							</div>
						</li>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Content>
					<ContextMenu.Item onclick={() => setDone(task, !isDone)} class="cursor-pointer text-xs">
						{#if isDone}<Undo2Icon />Mark as not done{:else}<CheckIcon />Mark as done{/if}
					</ContextMenu.Item>
					<ContextMenu.Item onclick={() => openForm(task)} class="cursor-pointer text-xs">
						<PenBoxIcon />
						Edit
					</ContextMenu.Item>
					<ContextMenu.Item onclick={() => duplicate(task)} class="cursor-pointer text-xs">
						<CopyIcon />
						Duplicate
					</ContextMenu.Item>
					<ContextMenu.Item
						onclick={() => confirmDelete(task)}
						class="cursor-pointer text-xs text-red-600 dark:text-red-500"
					>
						<TrashIcon />
						Delete
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/each}
	</ul>
{/snippet}

<Dialog.Root bind:open={allOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>All tasks</Dialog.Title>
			<Dialog.Description>{openCount} open</Dialog.Description>
		</Dialog.Header>
		<div class="-mx-6 max-h-[70vh] overflow-y-auto px-6">
			{@render taskList(rows)}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={() => adding, (open) => !open && closeForm()}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{editing ? 'Edit task' : 'New task'}</Dialog.Title>
		</Dialog.Header>
		<form class="grid gap-4" onsubmit={submit}>
			<div class="grid gap-2">
				<Label for="task-title">Title</Label>
				<Input
					id="task-title"
					bind:value={draft.title}
					placeholder="What needs doing?"
					maxlength={500}
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label>Due</Label>
				<div class="flex flex-wrap gap-2">
					<Select.Root type="single" items={whenItems} bind:value={draft.when}>
						<Select.Trigger aria-label="Due" class="w-40">
							{whenItems.find((item) => item.value === draft.when)?.label}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each whenItems as item (item.value)}
									<Select.Item value={item.value} label={item.label}>
										{item.label}
										{#if item.hint}
											<span class="text-muted-foreground ml-auto text-xs">{item.hint}</span>
										{/if}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
					{#if draft.when === 'custom'}
						<Popover.Root bind:open={dueOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class={cn(
											'w-40 justify-start font-normal',
											!draft.due && 'text-muted-foreground'
										)}
									>
										<CalendarIcon data-icon="inline-start" />
										{draft.due
											? draft.due.toDate(getLocalTimeZone()).toLocaleDateString([], {
													weekday: 'short',
													day: 'numeric',
													month: 'short'
												})
											: 'Due date'}
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0" align="start">
								<Calendar
									type="single"
									bind:value={draft.due}
									minValue={editing ? undefined : today(getLocalTimeZone())}
									onValueChange={() => (dueOpen = false)}
								/>
							</Popover.Content>
						</Popover.Root>
						<Input
							bind:value={draft.time}
							type="time"
							aria-label="Due time"
							disabled={!draft.due}
							class="w-28"
						/>
					{/if}
				</div>
			</div>
			<div class="grid gap-2">
				<Label>Priority</Label>
				<ToggleGroup.Root
					type="single"
					variant="outline"
					bind:value={draft.priority}
					aria-label="Priority"
					class="justify-start"
				>
					{#each priorities as priority (priority.value)}
						<ToggleGroup.Item
							value={priority.value}
							aria-label={priority.label}
							title={priority.label}
						>
							{@render priorityRing(Number(priority.value), draft.priority === priority.value)}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>
			{#if !editing}
				<div class="grid gap-2">
					<Label>List</Label>
					<Select.Root type="single" items={listItems} bind:value={draft.listUrl}>
						<Select.Trigger aria-label="List" class="w-full">
							{listItems.find((item) => item.value === draft.listUrl)?.label ?? 'List'}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each listItems as item (item.value)}
									<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			<Dialog.Footer>
				<Button variant="ghost" onclick={closeForm}>Cancel</Button>
				<Button type="submit" loading={saving}>{editing ? 'Save' : 'Add'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<div class="border-border bg-card min-w-0 rounded-lg border px-6 py-5">
	<div class="flex items-center gap-3">
		<ListTodoIcon class="text-primary size-9 flex-none" />
		<span class="text-foreground text-lg font-bold">Tasks</span>
		<span class="text-muted-foreground text-sm">{openCount} open</span>
		{#if lists.length > 0}
			<Button
				variant="ghost"
				size="sm"
				class="ml-auto"
				aria-label="Add task"
				onclick={() => openForm()}
			>
				<PlusIcon />
				Add
			</Button>
		{/if}
	</div>
	{#if rows.length === 0}
		<p class="text-muted-foreground mt-3 text-sm">Nothing to do.</p>
	{:else}
		{@render taskList(rows.slice(0, shown))}
		{#if rows.length > shown}
			<Button variant="link" size="sm" class="mt-1 px-0" onclick={() => (allOpen = true)}>
				and {rows.length - shown} more
			</Button>
		{/if}
	{/if}
</div>
