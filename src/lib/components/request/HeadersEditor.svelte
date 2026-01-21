<script lang="ts">
	// Headers editor component - key-value pairs for custom headers
	import VariableAutocomplete from '$lib/components/shared/VariableAutocomplete.svelte';

	interface Props {
		headers: Record<string, string>;
		onChange: (headers: Record<string, string>) => void;
	}

	let { headers, onChange }: Props = $props();

	const inputClass = 'flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500';

	// Convert to array for easier manipulation
	let headerPairs = $state(Object.entries(headers).map(([key, value]) => ({ key, value })));

	// Sync back to parent
	$effect(() => {
		const newHeaders: Record<string, string> = {};
		for (const pair of headerPairs) {
			if (pair.key.trim()) {
				newHeaders[pair.key] = pair.value;
			}
		}
		onChange(newHeaders);
	});

	function addHeader() {
		headerPairs = [...headerPairs, { key: '', value: '' }];
	}

	function removeHeader(index: number) {
		headerPairs = headerPairs.filter((_, i) => i !== index);
	}

	function updateHeader(index: number, field: 'key' | 'value', value: string) {
		headerPairs = headerPairs.map((pair, i) =>
			i === index ? { ...pair, [field]: value } : pair
		);
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-300">Headers</h3>
		<button
			class="text-xs text-blue-400 hover:text-blue-300"
			onclick={addHeader}
		>
			+ Add Header
		</button>
	</div>

	{#if headerPairs.length > 0}
		<div class="space-y-2">
			{#each headerPairs as pair, index}
				<div class="flex items-center gap-2">
					<input
						type="text"
						placeholder="Header name"
						class={inputClass}
						value={pair.key}
						oninput={(e) => updateHeader(index, 'key', (e.target as HTMLInputElement).value)}
					/>
					<VariableAutocomplete
						value={pair.value}
						onChange={(val) => updateHeader(index, 'value', val)}
						placeholder={'Value (type {{ for variables)'}
						{inputClass}
					/>
					<button
						class="text-gray-500 hover:text-red-400 px-2"
						onclick={() => removeHeader(index)}
						title="Remove header"
					>
						&times;
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-xs text-gray-500">No custom headers. Click "Add Header" to add one.</p>
	{/if}
</div>
