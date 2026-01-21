<script lang="ts">
	import { specStore, specInfo } from '$lib/stores/spec';
	import { responseStore } from '$lib/stores/response';
	import type { SpecState, ApiResponse } from '$lib/types';

	let specInfoState = $state<{ title: string; version: string; description?: string; baseUrl: string } | null>(null);
	let specState = $state<SpecState | null>(null);
	let responseState = $state<{ response: ApiResponse | null; isLoading: boolean; error: string | null } | null>(null);

	// Subscribe to stores
	$effect(() => {
		const unsubInfo = specInfo.subscribe(value => { specInfoState = value; });
		const unsubSpec = specStore.subscribe(value => { specState = value; });
		const unsubResponse = responseStore.subscribe(value => { responseState = value; });
		return () => {
			unsubInfo();
			unsubSpec();
			unsubResponse();
		};
	});

	// Determine status
	const status = $derived(() => {
		if (responseState?.isLoading) return 'Sending request...';
		if (responseState?.error) return 'Request failed';
		if (responseState?.response) return 'Ready';
		if (specState?.isLoading) return 'Loading spec...';
		return 'Ready';
	});
</script>

<footer class="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400">
	{#if specInfoState}
		<div class="flex items-center gap-4">
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-green-500"></span>
				{specInfoState.title}
			</span>
			{#if specInfoState.baseUrl}
				<span class="text-gray-500">|</span>
				<span class="text-gray-500 truncate max-w-xs" title={specInfoState.baseUrl}>{specInfoState.baseUrl}</span>
			{/if}
			{#if specInfoState.version}
				<span class="text-gray-500">|</span>
				<span>v{specInfoState.version}</span>
			{/if}
		</div>
	{:else}
		<span class="flex items-center gap-1.5">
			<span class="w-2 h-2 rounded-full" class:bg-gray-500={!specState?.isLoading} class:bg-yellow-500={specState?.isLoading} class:animate-pulse={specState?.isLoading}></span>
			{specState?.isLoading ? 'Loading spec...' : 'No API loaded'}
		</span>
	{/if}

	<!-- Right side - status -->
	<div class="ml-auto flex items-center gap-2">
		{#if specState?.endpoints && specState.endpoints.length > 0}
			<span class="text-gray-500">{specState.endpoints.length} endpoints</span>
			<span class="text-gray-600">|</span>
		{/if}
		<span class="text-gray-500" class:text-yellow-400={responseState?.isLoading} class:text-red-400={responseState?.error}>
			{status()}
		</span>
	</div>
</footer>
