<script lang="ts">
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ListTodoIcon from '@lucide/svelte/icons/list-todo';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.ts';
	import { DUE_PRESETS, presetDate, type DuePreset } from '#lib/due-presets.ts';
	import { addTask } from '#lib/remote/tasks.remote.ts';
	import type { Task, TasksSnapshot } from '#lib/server/monitoring/caldav.ts';
	import { cn } from '#lib/utils.ts';

	type Props = {
		snapshot: TasksSnapshot;
	};

	let { snapshot }: Props = $props();
	let { lists, tasks } = $derived(snapshot);

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
	let titleInput: HTMLInputElement | null = $state(null);

	async function openForm() {
		adding = true;
		draft = { ...emptyDraft, listUrl: draft.listUrl || (lists[0]?.url ?? '') };
		await tick();
		titleInput?.focus();
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
		try {
			await addTask({
				listUrl: draft.listUrl,
				title: draft.title,
				due: dueValue(),
				priority: Number(draft.priority) || 0
			});
			await invalidate('app:monitoring');
			toast.success('Task added');
			draft = { ...emptyDraft, listUrl: draft.listUrl };
			titleInput?.focus();
		} catch (error) {
			const message = (error as { body?: { message?: string } }).body?.message;
			toast.error(message ?? 'Failed to add the task');
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

{#snippet taskList(items: Task[])}
	<ul class="mt-3 flex flex-col">
		{#each items as task (task.uid)}
			{@const due = task.due ? dueLabel(task.due) : null}
			<li class="border-border flex items-center gap-3 border-b py-1.5 last:border-b-0">
				{@render priorityRing(task.priority)}
				<span class="text-foreground min-w-0 flex-1 truncate text-sm" title={task.title}
					>{task.title}</span
				>
				<span class="text-muted-foreground hidden flex-none text-xs sm:inline">{task.list}</span>
				{#if due}
					<span
						class={cn(
							'w-28 flex-none text-right text-xs whitespace-nowrap',
							due.overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground'
						)}>{due.text}</span
					>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<Dialog.Root bind:open={allOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>All tasks</Dialog.Title>
			<Dialog.Description>{tasks.length} open</Dialog.Description>
		</Dialog.Header>
		<div class="-mx-6 max-h-[70vh] overflow-y-auto px-6">
			{@render taskList(tasks)}
		</div>
	</Dialog.Content>
</Dialog.Root>

<div class="border-border bg-card min-w-0 rounded-lg border px-6 py-5">
	<div class="flex items-center gap-3">
		<ListTodoIcon class="text-primary size-9 flex-none" />
		<span class="text-foreground text-lg font-bold">Tasks</span>
		<span class="text-muted-foreground text-sm">{tasks.length} open</span>
		{#if !adding && lists.length > 0}
			<Button variant="ghost" size="sm" class="ml-auto" aria-label="Add task" onclick={openForm}>
				<PlusIcon />
				Add
			</Button>
		{/if}
	</div>
	{#if adding}
		<form class="mt-3 flex flex-wrap items-center gap-2" onsubmit={submit}>
			<Input
				bind:ref={titleInput}
				bind:value={draft.title}
				onkeydown={(event) => event.key === 'Escape' && (adding = false)}
				placeholder="New task"
				aria-label="Task title"
				maxlength={500}
				required
				class="min-w-48 flex-1"
			/>
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
								class={cn('w-40 justify-start font-normal', !draft.due && 'text-muted-foreground')}
							>
								<CalendarIcon data-icon="inline-start" />
								{draft.due
									? draft.due
											.toDate(getLocalTimeZone())
											.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
									: 'Due date'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							bind:value={draft.due}
							minValue={today(getLocalTimeZone())}
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
			<ToggleGroup.Root
				type="single"
				variant="outline"
				bind:value={draft.priority}
				aria-label="Priority"
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
			<Select.Root type="single" items={listItems} bind:value={draft.listUrl}>
				<Select.Trigger aria-label="List" class="w-40">
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
			<Button type="submit" loading={saving}>Add</Button>
			<Button variant="ghost" onclick={() => (adding = false)}>Cancel</Button>
		</form>
	{/if}
	{#if tasks.length === 0}
		<p class="text-muted-foreground mt-3 text-sm">Nothing to do.</p>
	{:else}
		{@render taskList(tasks.slice(0, shown))}
		{#if tasks.length > shown}
			<Button variant="link" size="sm" class="mt-1 px-0" onclick={() => (allOpen = true)}>
				and {tasks.length - shown} more
			</Button>
		{/if}
	{/if}
</div>
