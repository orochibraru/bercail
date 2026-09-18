<script lang="ts">
	import ListTodoIcon from '@lucide/svelte/icons/list-todo';
	import type { Task } from '#lib/server/monitoring/caldav.ts';

	type Props = {
		tasks: Task[];
	};

	let { tasks }: Props = $props();

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
	function priorityClass(priority: number): string {
		if (priority === 0) return 'border-muted-foreground/40';
		if (priority < 5) return 'border-red-500';
		if (priority === 5) return 'border-amber-500';
		return 'border-sky-500';
	}
</script>

<div class="border-border bg-card min-w-0 rounded-lg border px-6 py-5">
	<div class="flex items-center gap-3">
		<ListTodoIcon class="text-primary size-9 flex-none" />
		<span class="text-foreground text-lg font-bold">Tasks</span>
		<span class="text-muted-foreground text-sm">{tasks.length} open</span>
	</div>
	{#if tasks.length === 0}
		<p class="text-muted-foreground mt-3 text-sm">Nothing to do.</p>
	{:else}
		<ul class="mt-3 flex flex-col">
			{#each tasks.slice(0, shown) as task (task.uid)}
				{@const due = task.due ? dueLabel(task.due) : null}
				<li class="border-border flex items-center gap-3 border-b py-1.5 last:border-b-0">
					<span
						class="size-3.5 flex-none rounded-full border-2 {priorityClass(task.priority)}"
						aria-hidden="true"
					></span>
					<span class="text-foreground min-w-0 flex-1 truncate text-sm" title={task.title}
						>{task.title}</span
					>
					<span class="text-muted-foreground hidden flex-none text-xs sm:inline">{task.list}</span>
					{#if due}
						<span
							class="w-28 flex-none text-right text-xs whitespace-nowrap {due.overdue
								? 'font-semibold text-red-600 dark:text-red-400'
								: 'text-muted-foreground'}">{due.text}</span
						>
					{/if}
				</li>
			{/each}
		</ul>
		{#if tasks.length > shown}
			<p class="text-muted-foreground mt-2 text-xs">and {tasks.length - shown} more</p>
		{/if}
	{/if}
</div>
