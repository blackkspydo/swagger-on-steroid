<script lang="ts">
	import { specStore, endpointsByTag } from '$lib/stores/spec';
	import { requestStore } from '$lib/stores/request';
	import { uiStore } from '$lib/stores/ui';
	import EndpointGroup from './EndpointGroup.svelte';
	import EndpointItem from './EndpointItem.svelte';
	import type { ParsedEndpoint, SpecState, UIState } from '$lib/types';

	let searchQuery = $state('');
	let specState = $state<SpecState | null>(null);
	let endpointGroups = $state<Record<string, ParsedEndpoint[]>>({});
	let uiState = $state<UIState | null>(null);

	// Subscribe to stores
	$effect(() => {
		const unsubSpec = specStore.subscribe(value => { specState = value; });
		const unsubEndpoints = endpointsByTag.subscribe(value => { endpointGroups = value; });
		const unsubUI = uiStore.subscribe(value => { uiState = value; });
		return () => {
			unsubSpec();
			unsubEndpoints();
			unsubUI();
		};
	});

	// Filter endpoints based on search query
	const filteredEndpointsByTag = $derived(() => {
		if (!searchQuery.trim()) return endpointGroups;

		const query = searchQuery.toLowerCase();
		const filtered: Record<string, ParsedEndpoint[]> = {};

		for (const [tag, endpoints] of Object.entries(endpointGroups)) {
			const matchingEndpoints = endpoints.filter(endpoint =>
				endpoint.path.toLowerCase().includes(query) ||
				endpoint.method.toLowerCase().includes(query) ||
				endpoint.summary?.toLowerCase().includes(query) ||
				endpoint.operationId?.toLowerCase().includes(query)
			);

			if (matchingEndpoints.length > 0) {
				filtered[tag] = matchingEndpoints;
			}
		}

		return filtered;
	});

	// Count total endpoints
	const totalEndpoints = $derived(() => {
		return Object.values(endpointGroups).reduce((sum, endpoints) => sum + endpoints.length, 0);
	});

	const filteredCount = $derived(() => {
		return Object.values(filteredEndpointsByTag()).reduce((sum, endpoints) => sum + endpoints.length, 0);
	});

	function handleSelectEndpoint(endpoint: ParsedEndpoint) {
		requestStore.setEndpoint(endpoint);
		uiStore.selectEndpoint(endpoint.id);
	}

	function handleToggleTag(tag: string) {
		uiStore.toggleTag(tag);
	}

	// Track if we've initialized expansion state for current spec
	let lastSpecId = $state<string | null>(null);

	function isTagExpanded(tag: string): boolean {
		if (!uiState) return true;
		return uiState.expandedTags.has(tag);
	}

	function expandAll() {
		const tags = Object.keys(filteredEndpointsByTag());
		uiStore.expandAllTags(tags);
	}

	function collapseAll() {
		uiStore.collapseAllTags();
	}

	// Initialize tags when a NEW spec loads (preserves user preferences for same spec)
	$effect(() => {
		// Use spec title + endpoint count as a simple spec identifier
		const specId = specState?.spec ? `${specState.spec.info?.title || 'unknown'}-${specState.endpoints?.length || 0}` : null;

		if (specId && specId !== lastSpecId) {
			lastSpecId = specId;
			const tags = Object.keys(endpointGroups);
			if (tags.length > 0) {
				// Only auto-expand if user has no saved preferences
				uiStore.initializeTagsForSpec(tags);
			}
		}
	});
</script>

<div class="flex flex-col h-full">
	<!-- Search Input -->
	<div class="p-3 border-b border-gray-700">
		<input
			type="text"
			placeholder="Search endpoints..."
			class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
			bind:value={searchQuery}
		/>
		{#if searchQuery && totalEndpoints() > 0}
			<div class="text-xs text-gray-400 mt-1">
				{filteredCount()} of {totalEndpoints()} endpoints
			</div>
		{/if}
	</div>

	<!-- Endpoints -->
	<div class="flex-1 overflow-y-auto">
		{#if specState?.isLoading}
			<div class="flex items-center justify-center py-8">
				<div class="text-gray-400 text-sm">
					<div class="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-2"></div>
					Loading endpoints...
				</div>
			</div>
		{:else if specState?.error}
			<div class="text-red-400 text-sm p-4 text-center">
				<p class="font-medium">Error loading spec</p>
				<p class="text-xs mt-1">{specState.error}</p>
			</div>
		{:else if totalEndpoints() === 0}
			<div class="text-gray-400 text-sm text-center py-8">
				<p>No API loaded</p>
				<p class="text-xs mt-1">Enter an OpenAPI spec URL above</p>
			</div>
		{:else if filteredCount() === 0}
			<div class="text-gray-400 text-sm text-center py-8">
				<p>No matching endpoints</p>
				<p class="text-xs mt-1">Try a different search term</p>
			</div>
		{:else}
			<!-- Expand/Collapse All -->
			<div class="flex justify-end gap-2 px-3 py-2 border-b border-gray-700">
				<button
					class="text-xs text-gray-400 hover:text-gray-200"
					onclick={expandAll}
				>
					Expand All
				</button>
				<span class="text-gray-600">|</span>
				<button
					class="text-xs text-gray-400 hover:text-gray-200"
					onclick={collapseAll}
				>
					Collapse All
				</button>
			</div>

			<!-- Endpoint Groups -->
			<div class="p-2">
				{#each Object.entries(filteredEndpointsByTag()) as [tag, endpoints]}
					<EndpointGroup
						{tag}
						{endpoints}
						expanded={isTagExpanded(tag)}
						onToggle={() => handleToggleTag(tag)}
						selectedEndpointId={uiState?.selectedEndpointId}
						onSelectEndpoint={handleSelectEndpoint}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
