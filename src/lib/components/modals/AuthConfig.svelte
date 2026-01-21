<script lang="ts">
	// Auth configuration modal
	import type { AuthConfig, AuthType } from '$lib/types';

	interface Props {
		config: AuthConfig;
		onSave: (config: AuthConfig) => void;
		onClose: () => void;
	}

	let { config, onSave, onClose }: Props = $props();

	// Local state for editing
	let authType = $state<AuthType>(config.type);
	let bearerToken = $state(config.bearer?.token || '');
	let apiKeyName = $state(config.apiKey?.name || 'X-API-Key');
	let apiKeyValue = $state(config.apiKey?.value || '');
	let apiKeyIn = $state<'header' | 'query'>(config.apiKey?.in || 'header');
	let basicUsername = $state(config.basic?.username || '');
	let basicPassword = $state(config.basic?.password || '');

	function handleSave() {
		onSave({
			type: authType,
			bearer: { token: bearerToken },
			apiKey: { name: apiKeyName, value: apiKeyValue, in: apiKeyIn },
			basic: { username: basicUsername, password: basicPassword }
		});
		onClose();
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
		class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-modal-title"
		tabindex="0"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
			<h2 id="auth-modal-title" class="text-lg font-medium text-white">Authentication Settings</h2>
			<button
				class="text-gray-400 hover:text-white"
				onclick={onClose}
			>
				&times;
			</button>
		</div>

		<!-- Body -->
		<div class="p-4 space-y-4">
			<!-- Auth Type Selector -->
			<div>
				<label class="block text-sm font-medium text-gray-300 mb-2">Auth Type</label>
				<select
					class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
					bind:value={authType}
				>
					<option value="none">No Authentication</option>
					<option value="bearer">Bearer Token</option>
					<option value="apiKey">API Key</option>
					<option value="basic">Basic Auth</option>
				</select>
			</div>

			<!-- Bearer Token -->
			{#if authType === 'bearer'}
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-2">Token</label>
					<input
						type="password"
						class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
						placeholder="Enter your bearer token"
						bind:value={bearerToken}
					/>
					<p class="text-xs text-gray-500 mt-1">Supports environment variables: {"{{accessToken}}"}</p>
				</div>
			{/if}

			<!-- API Key -->
			{#if authType === 'apiKey'}
				<div class="space-y-3">
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Key Name</label>
						<input
							type="text"
							class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
							placeholder="X-API-Key"
							bind:value={apiKeyName}
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Key Value</label>
						<input
							type="password"
							class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
							placeholder="Enter your API key"
							bind:value={apiKeyValue}
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Add To</label>
						<div class="flex gap-4">
							<label class="flex items-center gap-2 text-sm text-gray-300">
								<input type="radio" value="header" bind:group={apiKeyIn} class="text-blue-500" />
								Header
							</label>
							<label class="flex items-center gap-2 text-sm text-gray-300">
								<input type="radio" value="query" bind:group={apiKeyIn} class="text-blue-500" />
								Query Parameter
							</label>
						</div>
					</div>
				</div>
			{/if}

			<!-- Basic Auth -->
			{#if authType === 'basic'}
				<div class="space-y-3">
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
						<input
							type="text"
							class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
							placeholder="Enter username"
							bind:value={basicUsername}
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
						<input
							type="password"
							class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
							placeholder="Enter password"
							bind:value={basicPassword}
						/>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
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
