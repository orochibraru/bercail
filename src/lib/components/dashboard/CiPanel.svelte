<script lang="ts">
	import WorkflowIcon from '@lucide/svelte/icons/workflow';
	import RefreshButton from '#lib/components/dashboard/RefreshButton.svelte';
	import type { GithubRepoStatus, RunState } from '#lib/server/monitoring/github.ts';
	import { cn } from '#lib/utils.ts';

	type Props = {
		repos: GithubRepoStatus[];
	};

	let { repos }: Props = $props();

	const dotClass: Record<RunState, string> = {
		success: 'bg-emerald-500',
		failure: 'bg-red-500',
		running: 'bg-amber-500 animate-pulse',
		neutral: 'bg-muted-foreground/50'
	};

	let failing = $derived(
		repos.filter((repo) => repo.workflows.some((run) => run.state === 'failure')).length
	);
</script>

<div class="border-border bg-card min-w-0 rounded-lg border px-6 py-5">
	<div class="flex items-center gap-3">
		<WorkflowIcon class="text-primary size-9 flex-none" />
		<span class="text-foreground text-lg font-bold">CI</span>
		<span class="text-muted-foreground text-sm">
			{failing ? `${failing} failing` : 'All green'}
		</span>
		<RefreshButton section="ci" label="CI" class="ml-auto" />
	</div>
	{#if repos.length === 0}
		<p class="text-muted-foreground mt-3 text-sm">No repositories yet. Pick some from Settings.</p>
	{:else}
		<ul class="mt-3 flex flex-col">
			{#each repos as repo (repo.fullName)}
				{@const [owner, name] = repo.fullName.split('/')}
				{@const attention = repo.workflows.filter(
					(run) => run.state === 'failure' || run.state === 'running'
				)}
				<li class="border-border flex items-center gap-3 border-b py-1.5 last:border-b-0">
					<a
						href={repo.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-foreground min-w-0 flex-1 truncate text-sm hover:underline"
						title={repo.fullName}
						><span class="text-muted-foreground hidden sm:inline">{owner}/</span>{name}</a
					>
					<!-- Only what needs a look is spelled out; green runs are just dots. -->
					{#if attention.length > 0}
						<span
							class={cn(
								'max-w-[45%] truncate text-xs',
								attention.some((run) => run.state === 'failure')
									? 'text-red-600 dark:text-red-500'
									: 'text-amber-600 dark:text-amber-500'
							)}
						>
							{attention.map((run) => run.name).join(', ')}
						</span>
					{/if}
					<div class="flex flex-none items-center gap-1.5">
						{#each repo.workflows as run (run.url)}
							<a
								href={run.url}
								target="_blank"
								rel="noopener noreferrer"
								class="-m-1 p-1"
								title="{run.name}: {run.state}"
								aria-label="{run.name}: {run.state}"
							>
								<span class={cn('block size-2.5 rounded-full', dotClass[run.state])}></span>
							</a>
						{:else}
							<span class="text-muted-foreground text-xs">No runs</span>
						{/each}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
