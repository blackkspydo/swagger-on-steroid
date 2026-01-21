<script lang="ts">
	import type { ParsedEndpoint } from '$lib/types';
	import EndpointItem from './EndpointItem.svelte';

	interface Props {
		tag: string;
		endpoints: ParsedEndpoint[];
		expanded?: boolean;
		selectedEndpointId?: string | null;
		onToggle?: () => void;
		onSelectEndpoint?: (endpoint: ParsedEndpoint) => void;
	}

	let {
		tag,
		endpoints,
		expanded = true,
		selectedEndpointId = null,
		onToggle,
		onSelectEndpoint
	}: Props = $props();
</script>

<div class="mb-1">
	<!-- Group Header -->
	<button
		class="w-full text-left px-2 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
		onclick={onToggle}
	>
		<span class="text-gray-500 text-xs transition-transform duration-150" class:rotate-90={expanded}>
			&#9654;
		</span>
		<span class="truncate">{tag}</span>
		<span class="text-gray-500 text-xs ml-auto shrink-0">{endpoints.length}</span>
	</button>

	<!-- Endpoints in Group -->
	{#if expanded}
		<div class="ml-4 space-y-0.5">
			{#each endpoints as endpoint (endpoint.id)}
				<EndpointItem
					{endpoint}
					selected={selectedEndpointId === endpoint.id}
					onClick={() => onSelectEndpoint?.(endpoint)}
				/>
			{/each}
		</div>
	{/if}
</div>
