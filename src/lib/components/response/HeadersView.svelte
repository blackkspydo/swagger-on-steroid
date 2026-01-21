<script lang="ts">
	// Headers view component - displays request and response headers

	interface Props {
		requestHeaders?: Record<string, string>;
		responseHeaders?: Record<string, string>;
	}

	let { requestHeaders = {}, responseHeaders = {} }: Props = $props();
</script>

<div class="space-y-6">
	{#if Object.keys(responseHeaders).length > 0}
		<div>
			<h4 class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
				Response Headers
			</h4>
			<div class="space-y-1.5">
				{#each Object.entries(responseHeaders) as [key, value]}
					<div class="text-sm font-mono">
						<span class="text-blue-400">{key}</span>
						<span class="text-gray-500">:</span>
						<span class="text-gray-300 ml-2 break-all">{value}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if Object.keys(requestHeaders).length > 0}
		<div>
			<h4 class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
				Request Headers
			</h4>
			<div class="space-y-1.5">
				{#each Object.entries(requestHeaders) as [key, value]}
					<div class="text-sm font-mono">
						<span class="text-purple-400">{key}</span>
						<span class="text-gray-500">:</span>
						<span class="text-gray-300 ml-2 break-all">{value}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if Object.keys(requestHeaders).length === 0 && Object.keys(responseHeaders).length === 0}
		<div class="text-gray-500 text-sm text-center py-4">
			No headers to display
		</div>
	{/if}
</div>
