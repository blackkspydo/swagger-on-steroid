<script lang="ts">
	import type { BaseUrlConfig } from '$lib/types';

	interface Props {
		configs: BaseUrlConfig[];
		onSave: (configs: BaseUrlConfig[]) => void;
		onClose: () => void;
	}

	let { configs, onSave, onClose }: Props = $props();

	// Local state for editing
	let localConfigs = $state<BaseUrlConfig[]>(configs.map(c => ({ ...c })));
	let editingId = $state<string | null>(null);
	let isAdding = $state(false);

	// New config form
	let newLabel = $state('');
	let newUrl = $state('');
	let newColor = $state('#ef4444'); // default red

	// Preset colors with labels
	const presetColors = [
		{ color: '#ef4444', label: 'Red (Production)' },
		{ color: '#f59e0b', label: 'Orange (Staging)' },
		{ color: '#eab308', label: 'Yellow (UAT)' },
		{ color: '#22c55e', label: 'Green (Development)' },
		{ color: '#3b82f6', label: 'Blue (Testing)' },
		{ color: '#8b5cf6', label: 'Purple (Local)' },
		{ color: '#6b7280', label: 'Gray (Other)' }
	];

	function handleAddConfig() {
		if (!newLabel.trim() || !newUrl.trim()) return;

		const newConfig: BaseUrlConfig = {
			id: crypto.randomUUID(),
			label: newLabel.trim(),
			url: newUrl.trim(),
			color: newColor
		};

		localConfigs = [...localConfigs, newConfig];
		resetForm();
	}

	function handleUpdateConfig(id: string, updates: Partial<BaseUrlConfig>) {
		localConfigs = localConfigs.map(c =>
			c.id === id ? { ...c, ...updates } : c
		);
	}

	function handleDeleteConfig(id: string) {
		localConfigs = localConfigs.filter(c => c.id !== id);
		if (editingId === id) {
			editingId = null;
		}
	}

	function resetForm() {
		newLabel = '';
		newUrl = '';
		newColor = '#ef4444';
		isAdding = false;
	}

	function handleSave() {
		onSave(localConfigs);
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
	onclick={onClose}
	onkeydown={handleKeydown}
	role="presentation"
>
	<div
		class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
			<h2 class="text-lg font-medium text-white">Manage Base URLs</h2>
			<button
				class="text-gray-400 hover:text-white text-xl"
				onclick={onClose}
			>
				&times;
			</button>
		</div>

		<!-- Body -->
		<div class="flex-1 overflow-y-auto p-4">
			<p class="text-sm text-gray-400 mb-4">
				Add multiple base URLs with color coding to easily identify environments like Production, Staging, and Development.
			</p>

			<!-- Existing Configs -->
			{#if localConfigs.length > 0}
				<div class="space-y-3 mb-4">
					{#each localConfigs as config (config.id)}
						<div
							class="bg-gray-900 rounded-lg p-3 border-l-4"
							style="border-left-color: {config.color}"
						>
							{#if editingId === config.id}
								<!-- Edit Mode -->
								<div class="space-y-3">
									<div class="flex gap-2">
										<input
											type="text"
											class="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
											value={config.label}
											oninput={(e) => handleUpdateConfig(config.id, { label: (e.target as HTMLInputElement).value })}
											placeholder="Label (e.g., Production)"
										/>
									</div>
									<input
										type="url"
										class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
										value={config.url}
										oninput={(e) => handleUpdateConfig(config.id, { url: (e.target as HTMLInputElement).value })}
										placeholder="https://api.example.com"
									/>
									<div class="flex items-center gap-2">
										<span class="text-xs text-gray-400">Color:</span>
										<div class="flex gap-1">
											{#each presetColors as preset}
												<button
													class="w-6 h-6 rounded border-2 transition-all"
													class:border-white={config.color === preset.color}
													class:border-transparent={config.color !== preset.color}
													style="background-color: {preset.color}"
													onclick={() => handleUpdateConfig(config.id, { color: preset.color })}
													title={preset.label}
												></button>
											{/each}
										</div>
									</div>
									<div class="flex justify-end gap-2">
										<button
											class="px-3 py-1 text-sm text-gray-400 hover:text-white"
											onclick={() => editingId = null}
										>
											Done
										</button>
									</div>
								</div>
							{:else}
								<!-- View Mode -->
								<div class="flex items-center justify-between">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span
												class="w-3 h-3 rounded-full shrink-0"
												style="background-color: {config.color}"
											></span>
											<span class="text-white font-medium truncate">{config.label}</span>
										</div>
										<div class="text-sm text-gray-400 truncate mt-1 ml-5">{config.url}</div>
									</div>
									<div class="flex items-center gap-1 shrink-0 ml-2">
										<button
											class="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700"
											onclick={() => editingId = config.id}
											title="Edit"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											class="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700"
											onclick={() => handleDeleteConfig(config.id)}
											title="Delete"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Add New Config Form -->
			{#if isAdding}
				<div class="bg-gray-900 rounded-lg p-4 border border-gray-600 border-dashed">
					<h3 class="text-sm font-medium text-white mb-3">Add New Base URL</h3>
					<div class="space-y-3">
						<div>
							<label class="block text-xs text-gray-400 mb-1">Label</label>
							<input
								type="text"
								class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
								placeholder="e.g., Production, Staging, Development"
								bind:value={newLabel}
							/>
						</div>
						<div>
							<label class="block text-xs text-gray-400 mb-1">URL</label>
							<input
								type="url"
								class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
								placeholder="https://api.example.com"
								bind:value={newUrl}
							/>
						</div>
						<div>
							<label class="block text-xs text-gray-400 mb-1">Color</label>
							<div class="flex items-center gap-2">
								<div class="flex gap-1">
									{#each presetColors as preset}
										<button
											class="w-6 h-6 rounded border-2 transition-all"
											class:border-white={newColor === preset.color}
											class:border-transparent={newColor !== preset.color}
											style="background-color: {preset.color}"
											onclick={() => newColor = preset.color}
											title={preset.label}
										></button>
									{/each}
								</div>
								<input
									type="color"
									class="w-8 h-6 rounded cursor-pointer"
									bind:value={newColor}
									title="Custom color"
								/>
							</div>
						</div>
						<div class="flex justify-end gap-2 pt-2">
							<button
								class="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
								onclick={resetForm}
							>
								Cancel
							</button>
							<button
								class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-700 disabled:cursor-not-allowed"
								onclick={handleAddConfig}
								disabled={!newLabel.trim() || !newUrl.trim()}
							>
								Add
							</button>
						</div>
					</div>
				</div>
			{:else}
				<button
					class="w-full py-3 border border-gray-600 border-dashed rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
					onclick={() => isAdding = true}
				>
					+ Add Base URL
				</button>
			{/if}

			{#if localConfigs.length === 0 && !isAdding}
				<div class="text-center py-6 text-gray-500">
					<p>No base URLs configured</p>
					<p class="text-xs mt-1">Add your first base URL to get started</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex justify-end gap-2 px-4 py-3 border-t border-gray-700 shrink-0">
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
				Save Changes
			</button>
		</div>
	</div>
</div>
