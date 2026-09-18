<script>
	import { page } from '$app/state';
	import Button from '#lib/components/ui/button/button.svelte';
</script>

<svelte:head>
	<title>{page.status} - error</title>
</svelte:head>

<div class="flex h-screen w-full items-center justify-center">
	<div class="max-w-xl text-center">
		<h1 class="mb-4 text-5xl font-extrabold">
			{page.status}
		</h1>
		<p class="mb-3 text-xl font-medium">{page.error?.message}</p>
		<Button
			onclick={(e) => {
				e.preventDefault();
				window.history.back();
			}}
		>
			Go Back
		</Button>
	</div>
</div>
