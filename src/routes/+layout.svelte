<script lang="ts">
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { applyAppearance } from '#lib/appearance.ts';
	import Header from '#lib/components/Header.svelte';

	let { children, data } = $props();

	// A page the service worker painted from cache can carry an older appearance until data refreshes.
	$effect(() => applyAppearance(data.appearance));

	// Tells the new tab extension the dashboard loaded, and when it's navigated away, maybe to a sign-in page.
	onMount(() => {
		window.parent.postMessage('bercail:ready', '*');
		addEventListener('pagehide', () => window.parent.postMessage('bercail:leaving', '*'));
	});
</script>

<ModeWatcher themeColors={{ dark: 'dark', light: 'light' }} />
<Toaster position="bottom-right" richColors closeButton />
<div class="mx-auto p-6">
	<Header groups={data.dashboard.groups} />
	{@render children()}
</div>
