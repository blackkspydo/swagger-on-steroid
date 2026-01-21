<script lang="ts">
	// JSON Viewer component - collapsible tree view for JSON data

	interface Props {
		data: unknown;
		expanded?: boolean;
		depth?: number;
	}

	let { data, expanded = true, depth = 0 }: Props = $props();

	let isExpanded = $state(expanded && depth < 2);

	function getType(value: unknown): string {
		if (value === null) return 'null';
		if (Array.isArray(value)) return 'array';
		return typeof value;
	}

	function getPreview(value: unknown): string {
		const type = getType(value);
		if (type === 'array') return `Array(${(value as unknown[]).length})`;
		if (type === 'object') return `Object(${Object.keys(value as object).length})`;
		return '';
	}

	function formatValue(value: unknown): string {
		const type = getType(value);
		if (type === 'string') return `"${value}"`;
		if (type === 'null') return 'null';
		if (type === 'undefined') return 'undefined';
		return String(value);
	}

	function getValueClass(value: unknown): string {
		const type = getType(value);
		switch (type) {
			case 'string': return 'text-green-400';
			case 'number': return 'text-blue-400';
			case 'boolean': return 'text-yellow-400';
			case 'null': return 'text-gray-500';
			default: return 'text-gray-300';
		}
	}

	const isObject = $derived(data !== null && typeof data === 'object');
	const entries = $derived(isObject ? Object.entries(data as object) : []);
</script>

{#if isObject && entries.length > 0}
	<div class="font-mono text-sm">
		<button
			class="text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"
			onclick={() => isExpanded = !isExpanded}
		>
			<span class="text-xs" class:rotate-90={isExpanded}>&#9654;</span>
			<span class="text-gray-500">{getPreview(data)}</span>
		</button>

		{#if isExpanded}
			<div class="ml-4 border-l border-gray-700 pl-2">
				{#each entries as [key, value]}
					<div class="py-0.5">
						<span class="text-purple-400">"{key}"</span>
						<span class="text-gray-500">: </span>
						{#if value !== null && typeof value === 'object'}
							<svelte:self data={value} depth={depth + 1} />
						{:else}
							<span class={getValueClass(value)}>{formatValue(value)}</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<span class={getValueClass(data)}>{formatValue(data)}</span>
{/if}
