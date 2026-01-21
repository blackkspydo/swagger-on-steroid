<script lang="ts">
	import Header from '$lib/components/layout/Header.svelte';
	import ThreePanel from '$lib/components/layout/ThreePanel.svelte';
	import StatusBar from '$lib/components/layout/StatusBar.svelte';
	import EndpointList from '$lib/components/endpoints/EndpointList.svelte';
	import RequestBuilder from '$lib/components/request/RequestBuilder.svelte';
	import ResponsePanel from '$lib/components/response/ResponsePanel.svelte';
	import { uiStore } from '$lib/stores/ui';
	import type { UIState } from '$lib/types';

	let uiState = $state<UIState | null>(null);

	// Subscribe to UI store for panel widths
	$effect(() => {
		const unsub = uiStore.subscribe(value => { uiState = value; });
		return () => unsub();
	});
</script>

<div class="h-screen flex flex-col bg-gray-900 text-gray-100">
	<!-- Header Bar -->
	<Header />

	<!-- Three Panel Layout -->
	<ThreePanel
		leftWidth={uiState?.leftPanelWidth ?? 280}
		rightWidth={uiState?.rightPanelWidth ?? 400}
	>
		{#snippet leftPanel()}
			<EndpointList />
		{/snippet}

		{#snippet middlePanel()}
			<RequestBuilder />
		{/snippet}

		{#snippet rightPanel()}
			<ResponsePanel />
		{/snippet}
	</ThreePanel>

	<!-- Status Bar -->
	<StatusBar />
</div>
