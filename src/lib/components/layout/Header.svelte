<script lang="ts">
	import { specStore } from '$lib/stores/spec';
	import { envStore } from '$lib/stores/env';
	import { authStore } from '$lib/stores/auth';
	import { baseUrlStore, activeBaseUrl } from '$lib/stores/baseUrl';
	import { parseSpecFromUrl, parseSpecFromJson } from '$lib/utils/parser';
	import { storage, type SavedSpec, type BaseUrlConfig } from '$lib/utils/storage';
	import EnvManager from '$lib/components/modals/EnvManager.svelte';
	import AuthConfig from '$lib/components/modals/AuthConfig.svelte';
	import BaseUrlManager from '$lib/components/modals/BaseUrlManager.svelte';
	import type { EnvVariable, AuthConfig as AuthConfigType, SpecState, BaseUrlConfig as BaseUrlConfigType } from '$lib/types';

	let specUrl = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let showRecentSpecs = $state(false);
	let showEnvModal = $state(false);
	let showAuthModal = $state(false);
	let showPasteModal = $state(false);
	let pasteJson = $state('');
	let pasteError = $state('');
	let showSaveModal = $state(false);
	let showSavedSpecsModal = $state(false);
	let saveLabel = $state('');
	let savedSpecs = $state<SavedSpec[]>([]);
	let showBaseUrlModal = $state(false);
	let showBaseUrlDropdown = $state(false);

	// Store state
	let specState = $state<SpecState | null>(null);
	let envState = $state<{ variables: EnvVariable[]; activeEnvironment: string } | null>(null);
	let authState = $state<AuthConfigType | null>(null);
	let baseUrlState = $state<{ configs: BaseUrlConfigType[]; activeId: string | null }>({ configs: [], activeId: null });
	let activeBaseUrlConfig = $state<BaseUrlConfigType | null>(null);

	// Subscribe to stores
	$effect(() => {
		const unsubSpec = specStore.subscribe(value => { specState = value; });
		const unsubEnv = envStore.subscribe(value => { envState = value; });
		const unsubAuth = authStore.subscribe(value => { authState = value; });
		const unsubBaseUrl = baseUrlStore.subscribe(value => { baseUrlState = value; });
		const unsubActiveBaseUrl = activeBaseUrl.subscribe(value => { activeBaseUrlConfig = value; });
		return () => {
			unsubSpec();
			unsubEnv();
			unsubAuth();
			unsubBaseUrl();
			unsubActiveBaseUrl();
		};
	});

	// Load settings and last spec from storage on mount
	$effect(() => {
		const recentSpecs = storage.getRecentSpecs();
		if (recentSpecs && recentSpecs.length > 0) {
			recentSpecs.forEach(url => {
				if (url) specStore.addRecentSpec(url);
			});
		}

		// Load env variables from storage
		const savedEnv = storage.getEnv();
		if (savedEnv?.variables) {
			envStore.setVariables(savedEnv.variables);
		}

		// Load auth config from storage
		const savedAuth = storage.getAuth();
		if (savedAuth) {
			authStore.setType(savedAuth.type as AuthConfigType['type']);
			if (savedAuth.bearer?.token) {
				authStore.setBearerToken(savedAuth.bearer.token);
			}
			if (savedAuth.apiKey) {
				authStore.setApiKey(
					savedAuth.apiKey.name,
					savedAuth.apiKey.value,
					savedAuth.apiKey.in as 'header' | 'query'
				);
			}
		}

		// Load base URL configurations
		baseUrlStore.init();

		// Load last spec from storage
		const lastSpec = storage.getLastSpec();
		if (lastSpec?.spec) {
			loadLastSpec(lastSpec);
		}
	});

	async function loadLastSpec(lastSpec: { spec: object; baseUrl: string }) {
		try {
			const { spec, endpoints, baseUrl } = await parseSpecFromJson(lastSpec.spec);
			specStore.setSpec(spec, endpoints, lastSpec.baseUrl || baseUrl);
		} catch (error) {
			console.error('Failed to restore last spec:', error);
			storage.clearLastSpec();
		}
	}

	function persistCurrentSpec(spec: object, baseUrl: string) {
		storage.setLastSpec({ spec, baseUrl });
	}

	async function loadSpec() {
		if (!specUrl.trim()) {
			errorMessage = 'Please enter a URL';
			return;
		}

		// Basic URL validation
		try {
			new URL(specUrl);
		} catch {
			errorMessage = 'Invalid URL format';
			return;
		}

		isLoading = true;
		errorMessage = '';
		specStore.setLoading(true);

		try {
			const { spec, endpoints, baseUrl } = await parseSpecFromUrl(specUrl);
			specStore.setSpec(spec, endpoints, baseUrl);
			specStore.addRecentSpec(specUrl);

			// Save to localStorage
			const currentRecentSpecs = specState?.recentSpecs || [];
			const recentSpecs = [specUrl, ...currentRecentSpecs.filter(u => u !== specUrl)].slice(0, 10);
			storage.setRecentSpecs(recentSpecs);

			// Persist as last loaded spec
			persistCurrentSpec(spec, baseUrl);
		} catch (error) {
			let message = 'Failed to load spec';

			if (error instanceof Error) {
				if (error.message.includes('fetch')) {
					message = 'Could not fetch spec. Check the URL or CORS settings.';
				} else if (error.message.includes('JSON')) {
					message = 'Not valid JSON. Expected OpenAPI/Swagger format.';
				} else if (error.message.includes('valid') || error.message.includes('OpenAPI') || error.message.includes('Swagger')) {
					message = 'Could not parse spec. Ensure it\'s OpenAPI 2.0 or 3.x.';
				} else {
					message = error.message;
				}
			}

			errorMessage = message;
			specStore.setError(message);
		} finally {
			isLoading = false;
		}
	}

	function selectRecentSpec(url: string) {
		specUrl = url;
		showRecentSpecs = false;
		loadSpec();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			loadSpec();
		}
	}

	async function loadFromPastedJson() {
		if (!pasteJson.trim()) {
			pasteError = 'Please paste JSON content';
			return;
		}

		isLoading = true;
		pasteError = '';
		specStore.setLoading(true);

		try {
			const json = JSON.parse(pasteJson);
			const { spec, endpoints, baseUrl } = await parseSpecFromJson(json);
			specStore.setSpec(spec, endpoints, baseUrl);
			showPasteModal = false;
			pasteJson = '';

			// Persist as last loaded spec
			persistCurrentSpec(spec, baseUrl);
		} catch (error) {
			if (error instanceof SyntaxError) {
				pasteError = 'Invalid JSON format. Please check your input.';
			} else if (error instanceof Error) {
				pasteError = error.message;
			} else {
				pasteError = 'Failed to parse spec';
			}
			specStore.setError(pasteError);
		} finally {
			isLoading = false;
		}
	}

	function handleEnvSave(variables: EnvVariable[]) {
		envStore.setVariables(variables);
		storage.setEnv({ variables });
	}

	function handleAuthSave(config: AuthConfigType) {
		authStore.setType(config.type);
		if (config.bearer) {
			authStore.setBearerToken(config.bearer.token);
		}
		if (config.apiKey) {
			authStore.setApiKey(config.apiKey.name, config.apiKey.value, config.apiKey.in);
		}
		if (config.basic) {
			authStore.setBasicAuth(config.basic.username, config.basic.password);
		}
		storage.setAuth(config);
	}

	function loadSavedSpecs() {
		savedSpecs = storage.getSavedSpecs();
	}

	function openSaveModal() {
		if (specState?.spec) {
			saveLabel = specState.spec.info?.title || 'My API';
			showSaveModal = true;
		}
	}

	function saveCurrentSpec() {
		if (!specState?.spec || !saveLabel.trim()) return;

		const newSpec: SavedSpec = {
			id: crypto.randomUUID(),
			label: saveLabel.trim(),
			spec: specState.spec,
			baseUrl: specState.baseUrl,
			savedAt: Date.now()
		};

		storage.addSavedSpec(newSpec);
		showSaveModal = false;
		saveLabel = '';
		loadSavedSpecs();
	}

	async function loadSavedSpec(saved: SavedSpec) {
		isLoading = true;
		try {
			const { spec, endpoints, baseUrl } = await parseSpecFromJson(saved.spec);
			const finalBaseUrl = saved.baseUrl || baseUrl;
			specStore.setSpec(spec, endpoints, finalBaseUrl);
			showSavedSpecsModal = false;

			// Persist as last loaded spec
			persistCurrentSpec(spec, finalBaseUrl);
		} catch (error) {
			console.error('Failed to load saved spec:', error);
		} finally {
			isLoading = false;
		}
	}

	function deleteSavedSpec(id: string) {
		storage.removeSavedSpec(id);
		loadSavedSpecs();
	}

	function openSavedSpecsModal() {
		loadSavedSpecs();
		showSavedSpecsModal = true;
	}

	// Get auth indicator
	const authIndicator = $derived(() => {
		if (!authState) return null;
		switch (authState.type) {
			case 'bearer': return authState.bearer?.token ? 'Bearer' : null;
			case 'apiKey': return authState.apiKey?.value ? 'API Key' : null;
			case 'basic': return authState.basic?.username ? 'Basic' : null;
			default: return null;
		}
	});

	// Get enabled env vars count
	const enabledEnvVarsCount = $derived(() => {
		return envState?.variables.filter(v => v.enabled).length || 0;
	});

	// Get recent specs
	const recentSpecsList = $derived(() => {
		return specState?.recentSpecs.filter(u => u) || [];
	});

	// Handle base URL selection
	function selectBaseUrl(config: BaseUrlConfigType) {
		baseUrlStore.setActive(config.id);
		specStore.setBaseUrl(config.url);
		showBaseUrlDropdown = false;
		// Persist the change
		if (specState?.spec) {
			persistCurrentSpec(specState.spec, config.url);
		}
	}

	// Clear base URL selection (use custom/spec default)
	function clearBaseUrlSelection() {
		baseUrlStore.setActive(null);
		showBaseUrlDropdown = false;
	}

	// Handle base URL configs save
	function handleBaseUrlSave(configs: BaseUrlConfigType[]) {
		baseUrlStore.setConfigs(configs);
		// If the active config was deleted, clear the selection
		if (baseUrlState.activeId && !configs.find(c => c.id === baseUrlState.activeId)) {
			baseUrlStore.setActive(null);
		}
	}

	// Get header color based on active base URL
	const headerColor = $derived(() => {
		if (activeBaseUrlConfig?.color) {
			return activeBaseUrlConfig.color;
		}
		return null;
	});

	// Get text color based on background brightness
	function getContrastColor(hexColor: string): string {
		// Remove # if present
		const hex = hexColor.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		// Calculate relative luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}
</script>

<header
	class="h-14 border-b border-gray-700 flex items-center px-4 gap-4 transition-colors"
	style={headerColor() ? `background-color: ${headerColor()}` : 'background-color: rgb(31, 41, 55)'}
>
	<!-- Logo/Title -->
	<div class="flex items-center gap-2 shrink-0">
		<span
			class="text-lg font-semibold transition-colors"
			style={headerColor() ? `color: ${getContrastColor(headerColor()!)}` : 'color: white'}
		>
			Swagger on Steroids
		</span>
		{#if activeBaseUrlConfig}
			<span
				class="text-xs px-2 py-0.5 rounded font-medium"
				style="background-color: rgba(0,0,0,0.2); color: {headerColor() ? getContrastColor(headerColor()!) : 'white'}"
			>
				{activeBaseUrlConfig.label}
			</span>
		{/if}
	</div>

	<!-- Spec URL Input -->
	<div class="flex-1 flex items-center gap-2 max-w-2xl relative">
		<div class="flex-1 relative">
			<input
				type="url"
				placeholder="Enter OpenAPI spec URL (e.g., https://petstore.swagger.io/v2/swagger.json)"
				class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
				class:border-red-500={errorMessage}
				bind:value={specUrl}
				onkeydown={handleKeydown}
				onfocus={() => showRecentSpecs = true}
				onblur={() => setTimeout(() => showRecentSpecs = false, 200)}
			/>

			<!-- Recent Specs Dropdown -->
			{#if showRecentSpecs && recentSpecsList().length > 0}
				<div class="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
					<div class="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700">Recent</div>
					{#each recentSpecsList() as url}
						<button
							class="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 truncate"
							onmousedown={() => selectRecentSpec(url)}
						>
							{url}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<button
			class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
			onclick={loadSpec}
			disabled={isLoading}
		>
			{#if isLoading}
				<span class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
				Loading...
			{:else}
				Load
			{/if}
		</button>

		<button
			class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
			onclick={() => showPasteModal = true}
			title="Paste OpenAPI JSON directly"
		>
			Paste JSON
		</button>
	</div>

	<!-- Base URL Selector (shown when spec is loaded) -->
	{#if specState?.spec}
		<div class="flex items-center gap-2 shrink-0 relative">
			<label
				class="text-xs whitespace-nowrap transition-colors"
				style={headerColor() ? `color: ${getContrastColor(headerColor()!)}; opacity: 0.8` : 'color: rgb(156, 163, 175)'}
			>
				Base URL:
			</label>

			{#if baseUrlState.configs.length > 0}
				<!-- Dropdown selector when configs exist -->
				<div class="relative">
					<button
						class="flex items-center gap-2 px-2 py-1 text-xs rounded border transition-colors min-w-[200px]"
						style={headerColor()
							? `background-color: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.3); color: ${getContrastColor(headerColor()!)}`
							: 'background-color: rgb(17, 24, 39); border-color: rgb(75, 85, 99); color: white'}
						onclick={() => showBaseUrlDropdown = !showBaseUrlDropdown}
						onblur={() => setTimeout(() => showBaseUrlDropdown = false, 200)}
					>
						{#if activeBaseUrlConfig}
							<span
								class="w-2 h-2 rounded-full shrink-0"
								style="background-color: {activeBaseUrlConfig.color}"
							></span>
							<span class="truncate flex-1 text-left">{activeBaseUrlConfig.label}</span>
						{:else}
							<span class="truncate flex-1 text-left opacity-70">Select environment...</span>
						{/if}
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if showBaseUrlDropdown}
						<div class="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg z-50 min-w-[250px] max-h-64 overflow-y-auto">
							{#each baseUrlState.configs as config}
								<button
									class="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 transition-colors"
									class:bg-gray-800={config.id === baseUrlState.activeId}
									onmousedown={() => selectBaseUrl(config)}
								>
									<span
										class="w-3 h-3 rounded-full shrink-0"
										style="background-color: {config.color}"
									></span>
									<div class="flex-1 min-w-0">
										<div class="text-white truncate">{config.label}</div>
										<div class="text-xs text-gray-400 truncate">{config.url}</div>
									</div>
									{#if config.id === baseUrlState.activeId}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>
							{/each}
							<div class="border-t border-gray-700">
								<button
									class="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
									onmousedown={clearBaseUrlSelection}
								>
									Use custom URL
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Custom URL input (shown when no config selected or no configs exist) -->
			{#if !activeBaseUrlConfig}
				<input
					type="url"
					class="w-48 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
					value={specState.baseUrl}
					oninput={(e) => {
						const newBaseUrl = (e.target as HTMLInputElement).value;
						specStore.setBaseUrl(newBaseUrl);
						if (specState?.spec) {
							persistCurrentSpec(specState.spec, newBaseUrl);
						}
					}}
					placeholder="https://api.example.com"
				/>
			{/if}

			<!-- Manage button -->
			<button
				class="p-1 rounded transition-colors"
				style={headerColor()
					? `color: ${getContrastColor(headerColor()!)}; opacity: 0.7`
					: 'color: rgb(156, 163, 175)'}
				onclick={() => showBaseUrlModal = true}
				title="Manage base URLs"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
		</div>
	{/if}

	<!-- Error Message -->
	{#if errorMessage}
		<div class="text-red-400 text-xs max-w-xs truncate" title={errorMessage}>
			{errorMessage}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex items-center gap-2">
		<!-- Saved Specs Button -->
		<button
			class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
			onclick={openSavedSpecsModal}
		>
			Saved
		</button>

		<!-- Save Current Spec Button (only shown when spec is loaded) -->
		{#if specState?.spec}
			<button
				class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
				onclick={openSaveModal}
			>
				Save
			</button>
		{/if}

		<button
			class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors flex items-center gap-1.5"
			onclick={() => showEnvModal = true}
		>
			Env Vars
			{#if enabledEnvVarsCount() > 0}
				<span class="bg-blue-500 text-white text-xs px-1.5 rounded-full">
					{enabledEnvVarsCount()}
				</span>
			{/if}
		</button>
		<button
			class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors flex items-center gap-1.5"
			onclick={() => showAuthModal = true}
		>
			Auth
			{#if authIndicator()}
				<span class="bg-green-500 text-white text-xs px-1.5 rounded">
					{authIndicator()}
				</span>
			{/if}
		</button>
	</div>
</header>

<!-- Modals -->
{#if showEnvModal && envState}
	<EnvManager
		variables={envState.variables}
		onSave={handleEnvSave}
		onClose={() => showEnvModal = false}
	/>
{/if}

{#if showAuthModal && authState}
	<AuthConfig
		config={authState}
		onSave={handleAuthSave}
		onClose={() => showAuthModal = false}
	/>
{/if}

{#if showPasteModal}
	<!-- Paste JSON Modal -->
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		onclick={() => { showPasteModal = false; pasteError = ''; }}
		onkeydown={(e) => e.key === 'Escape' && (showPasteModal = false)}
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
				<h2 class="text-lg font-medium text-white">Paste OpenAPI JSON</h2>
				<button
					class="text-gray-400 hover:text-white text-xl"
					onclick={() => { showPasteModal = false; pasteError = ''; }}
				>
					&times;
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-4">
				<p class="text-sm text-gray-400 mb-3">
					Paste your OpenAPI/Swagger JSON specification below:
				</p>
				<textarea
					class="w-full h-64 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 resize-y"
					class:border-red-500={pasteError}
					placeholder={'{"openapi": "3.0.0", "info": {...}, "paths": {...}}'}
					bind:value={pasteJson}
				></textarea>
				{#if pasteError}
					<p class="text-red-400 text-sm mt-2">{pasteError}</p>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-2 px-4 py-3 border-t border-gray-700 shrink-0">
				<button
					class="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
					onclick={() => { showPasteModal = false; pasteError = ''; }}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
					onclick={loadFromPastedJson}
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
						Parsing...
					{:else}
						Load Spec
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showSaveModal}
	<!-- Save Spec Modal -->
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		onclick={() => showSaveModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showSaveModal = false)}
		role="presentation"
	>
		<div
			class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveCurrentSpec(); }}
			role="dialog"
			aria-modal="true"
		>
			<div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
				<h2 class="text-lg font-medium text-white">Save Spec</h2>
				<button
					class="text-gray-400 hover:text-white text-xl"
					onclick={() => showSaveModal = false}
				>
					&times;
				</button>
			</div>

			<div class="p-4">
				<label class="block text-sm text-gray-400 mb-2">Label</label>
				<input
					type="text"
					class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
					placeholder="My API"
					bind:value={saveLabel}
				/>
			</div>

			<div class="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
				<button
					class="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
					onclick={() => showSaveModal = false}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
					onclick={saveCurrentSpec}
					disabled={!saveLabel.trim()}
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showSavedSpecsModal}
	<!-- Saved Specs Modal -->
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		onclick={() => showSavedSpecsModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showSavedSpecsModal = false)}
		role="presentation"
	>
		<div
			class="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
				<h2 class="text-lg font-medium text-white">Saved Specs</h2>
				<button
					class="text-gray-400 hover:text-white text-xl"
					onclick={() => showSavedSpecsModal = false}
				>
					&times;
				</button>
			</div>

			<div class="flex-1 overflow-y-auto p-4">
				{#if savedSpecs.length > 0}
					<div class="space-y-2">
						{#each savedSpecs as saved}
							<div class="flex items-center justify-between bg-gray-900 rounded p-3 hover:bg-gray-700 transition-colors">
								<button
									class="flex-1 text-left"
									onclick={() => loadSavedSpec(saved)}
								>
									<div class="text-white font-medium">{saved.label}</div>
									<div class="text-xs text-gray-400 mt-1">
										{saved.baseUrl || 'No base URL'}
										<span class="mx-2">•</span>
										{new Date(saved.savedAt).toLocaleDateString()}
									</div>
								</button>
								<button
									class="text-gray-500 hover:text-red-400 px-2 text-lg ml-2"
									onclick={() => deleteSavedSpec(saved.id)}
									title="Delete"
								>
									&times;
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8 text-gray-500">
						<p>No saved specs yet</p>
						<p class="text-sm mt-1">Load a spec and click "Save" to save it here</p>
					</div>
				{/if}
			</div>

			<div class="flex justify-end px-4 py-3 border-t border-gray-700 shrink-0">
				<button
					class="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
					onclick={() => showSavedSpecsModal = false}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showBaseUrlModal}
	<BaseUrlManager
		configs={baseUrlState.configs}
		onSave={handleBaseUrlSave}
		onClose={() => showBaseUrlModal = false}
	/>
{/if}
