<script lang="ts">
	// Single endpoint item component
	import type { ParsedEndpoint } from '$lib/types';

	interface Props {
		endpoint: ParsedEndpoint;
		selected?: boolean;
		onClick?: () => void;
	}

	let { endpoint, selected = false, onClick }: Props = $props();

	const methodColors: Record<string, string> = {
		GET: 'method-get',
		POST: 'method-post',
		PUT: 'method-put',
		PATCH: 'method-patch',
		DELETE: 'method-delete',
		OPTIONS: 'bg-gray-600 text-white',
		HEAD: 'bg-gray-600 text-white',
		TRACE: 'bg-gray-600 text-white'
	};
</script>

<button
	class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-700 rounded flex items-center gap-2 transition-colors"
	class:bg-gray-700={selected}
	class:ring-1={selected}
	class:ring-blue-500={selected}
	onclick={onClick}
>
	<span class="px-1.5 py-0.5 text-xs font-medium rounded shrink-0 {methodColors[endpoint.method]}">
		{endpoint.method}
	</span>
	<span
		class="text-gray-300 truncate"
		class:line-through={endpoint.deprecated}
		class:text-gray-500={endpoint.deprecated}
		title={endpoint.path}
	>
		{endpoint.path}
	</span>
</button>
