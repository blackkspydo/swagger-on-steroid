<script lang="ts">
	// Environment variables manager modal
	import type { EnvVariable } from '$lib/types';

	interface Props {
		variables: EnvVariable[];
		onSave: (variables: EnvVariable[]) => void;
		onClose: () => void;
	}

	let { variables, onSave, onClose }: Props = $props();

	// Local state for editing - initialize from prop
	let localVars = $state<EnvVariable[]>(variables.map(v => ({ ...v })));

	function addVariable() {
		localVars = [...localVars, { key: '', value: '', enabled: true }];
	}

	function removeVariable(index: number) {
		localVars = localVars.filter((_, i) => i !== index);
	}

	function updateVariable(index: number, field: keyof EnvVariable, value: string | boolean) {
		localVars = localVars.map((v, i) =>
			i === index ? { ...v, [field]: value } : v
		);
	}

	function handleSave() {
		// Filter out empty keys
		const validVars = localVars.filter(v => v.key.trim());
		onSave(validVars);
		onClose();
	}

	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const text = await file.text();
				try {
					const imported = JSON.parse(text);
					if (Array.isArray(imported)) {
						localVars = [...localVars, ...imported.map((v: { key?: string; value?: string }) => ({
							key: v.key || '',
							value: v.value || '',
							enabled: true
						}))];
					} else if (typeof imported === 'object') {
						// Support simple {key: value} format
						const newVars = Object.entries(imported).map(([key, value]) => ({
							key,
							value: String(value),
							enabled: true
						}));
						localVars = [...localVars, ...newVars];
					}
				} catch {
					alert('Invalid JSON file');
				}
			}
		};
		input.click();
	}

	function handleExport() {
		const data = localVars.filter(v => v.key.trim()).map(v => ({
			key: v.key,
			value: v.value
		}));
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'environment-variables.json';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<!-- Modal Backdrop -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="presentation"
>
	<!-- Modal Content -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="env-modal-title"
		tabindex="0"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
			<h2 id="env-modal-title" class="text-lg font-medium text-white">Environment Variables</h2>
			<button
				class="text-gray-400 hover:text-white text-xl"
				onclick={onClose}
			>
				&times;
			</button>
		</div>

		<!-- Body -->
		<div class="flex-1 overflow-y-auto p-4">
			<!-- Info -->
			<p class="text-sm text-gray-400 mb-4">
				Use <code class="bg-gray-900 px-1 rounded">{"{{variableName}}"}</code> in URLs, headers, and request bodies.
				Built-in: <code class="bg-gray-900 px-1 rounded">{"{{$timestamp}}"}</code>,
				<code class="bg-gray-900 px-1 rounded">{"{{$randomId}}"}</code>
			</p>

			<!-- Variables List -->
			{#if localVars.length > 0}
				<div class="space-y-2">
					{#each localVars as variable, index}
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								checked={variable.enabled}
								onchange={(e) => updateVariable(index, 'enabled', (e.target as HTMLInputElement).checked)}
								class="rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
							/>
							<input
								type="text"
								placeholder="Variable name"
								value={variable.key}
								oninput={(e) => updateVariable(index, 'key', (e.target as HTMLInputElement).value)}
								class="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
								class:opacity-50={!variable.enabled}
							/>
							<input
								type="text"
								placeholder="Value"
								value={variable.value}
								oninput={(e) => updateVariable(index, 'value', (e.target as HTMLInputElement).value)}
								class="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
								class:opacity-50={!variable.enabled}
							/>
							<button
								class="text-gray-500 hover:text-red-400 px-2 text-lg"
								onclick={() => removeVariable(index)}
								title="Remove variable"
							>
								&times;
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8 text-gray-500">
					<p>No environment variables defined</p>
					<p class="text-sm mt-1">Click "Add Variable" to create one</p>
				</div>
			{/if}

			<!-- Add Button -->
			<button
				class="mt-4 text-sm text-blue-400 hover:text-blue-300"
				onclick={addVariable}
			>
				+ Add Variable
			</button>
		</div>

		<!-- Footer -->
		<div class="flex justify-between px-4 py-3 border-t border-gray-700 shrink-0">
			<div class="flex gap-2">
				<button
					class="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-600 rounded transition-colors"
					onclick={handleImport}
				>
					Import
				</button>
				<button
					class="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-600 rounded transition-colors"
					onclick={handleExport}
				>
					Export
				</button>
			</div>
			<div class="flex gap-2">
				<button
					class="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
					onclick={onClose}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
					onclick={handleSave}
				>
					Save
				</button>
			</div>
		</div>
	</div>
</div>
