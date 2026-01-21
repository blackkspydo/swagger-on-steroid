<script lang="ts">
	import { requestStore, isRequestValid, builtUrl } from '$lib/stores/request';
	import { specStore } from '$lib/stores/spec';
	import { responseStore, historyStore } from '$lib/stores/response';
	import { authStore, authHeaders, authQueryParams } from '$lib/stores/auth';
	import { envStore, activeEnvVariables } from '$lib/stores/env';
	import { interpolateRequest } from '$lib/utils/interpolate';
	import { storage } from '$lib/utils/storage';
	import ParamInput from './ParamInput.svelte';
	import BodyEditor from './BodyEditor.svelte';
	import HeadersEditor from './HeadersEditor.svelte';
	import type { RequestConfig, SpecState, ApiResponse, HistoryEntry, ParsedParameter } from '$lib/types';

	let requestState = $state<RequestConfig | null>(null);
	let specState = $state<SpecState | null>(null);
	let isValid = $state(false);
	let urlPath = $state('');
	let authHeadersState = $state<Record<string, string>>({});
	let authQueryState = $state<Record<string, string>>({});
	let envVars = $state<Record<string, string>>({});

	let isSending = $state(false);
	let lastEndpointId = $state<string | null>(null);

	// Subscribe to stores
	$effect(() => {
		const unsubRequest = requestStore.subscribe(value => { requestState = value; });
		const unsubSpec = specStore.subscribe(value => { specState = value; });
		const unsubValid = isRequestValid.subscribe(value => { isValid = value; });
		const unsubUrl = builtUrl.subscribe(value => { urlPath = value; });
		const unsubAuthHeaders = authHeaders.subscribe(value => { authHeadersState = value; });
		const unsubAuthQuery = authQueryParams.subscribe(value => { authQueryState = value; });
		const unsubEnv = activeEnvVariables.subscribe(value => { envVars = value; });
		return () => {
			unsubRequest();
			unsubSpec();
			unsubValid();
			unsubUrl();
			unsubAuthHeaders();
			unsubAuthQuery();
			unsubEnv();
		};
	});

	// Load saved request body when endpoint changes
	$effect(() => {
		const currentEndpointId = requestState?.endpoint?.id;
		if (currentEndpointId && currentEndpointId !== lastEndpointId) {
			lastEndpointId = currentEndpointId;
			// Load saved body for this endpoint
			const savedBody = storage.getRequestBody(currentEndpointId);
			if (savedBody !== null) {
				requestStore.setBody(savedBody);
			}
		}
	});

	// Save request body when it changes (debounced)
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const endpointId = requestState?.endpoint?.id;
		const body = requestState?.body;

		if (endpointId && body !== undefined) {
			// Debounce saving to avoid excessive writes
			if (saveTimeout) clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => {
				storage.setRequestBody(endpointId, body);
			}, 500);
		}

		return () => {
			if (saveTimeout) clearTimeout(saveTimeout);
		};
	});

	// Get parameters by type
	const pathParams = $derived(() => {
		return requestState?.endpoint?.parameters.filter(p => p.in === 'path') || [];
	});

	const queryParams = $derived(() => {
		return requestState?.endpoint?.parameters.filter(p => p.in === 'query') || [];
	});

	const headerParams = $derived(() => {
		return requestState?.endpoint?.parameters.filter(p => p.in === 'header') || [];
	});

	// Check if method supports body
	const supportsBody = $derived(() => {
		const method = requestState?.endpoint?.method;
		return method === 'POST' || method === 'PUT' || method === 'PATCH';
	});

	// Generate example body from schema
	function generateExampleBody() {
		if (!requestState?.endpoint?.requestBody?.schema) return;

		const example = generateExampleFromSchema(requestState.endpoint.requestBody.schema);
		requestStore.setBody(JSON.stringify(example, null, 2));
	}

	function generateExampleFromSchema(schema: { type?: string; properties?: Record<string, unknown>; items?: unknown; example?: unknown; default?: unknown; format?: string }): unknown {
		if (schema.example !== undefined) return schema.example;
		if (schema.default !== undefined) return schema.default;

		switch (schema.type) {
			case 'object': {
				const obj: Record<string, unknown> = {};
				if (schema.properties) {
					for (const [key, propSchema] of Object.entries(schema.properties)) {
						obj[key] = generateExampleFromSchema(propSchema as typeof schema);
					}
				}
				return obj;
			}
			case 'array':
				return schema.items ? [generateExampleFromSchema(schema.items as typeof schema)] : [];
			case 'string':
				if (schema.format === 'date') return '2024-01-01';
				if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
				if (schema.format === 'email') return 'user@example.com';
				if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
				return 'string';
			case 'integer':
			case 'number':
				return 0;
			case 'boolean':
				return true;
			default:
				return null;
		}
	}

	async function sendRequest() {
		if (!requestState?.endpoint || !specState) return;

		isSending = true;
		responseStore.setLoading(true);

		const startTime = performance.now();

		try {
			// Build full URL
			let url = specState.baseUrl + urlPath;

			// Add auth query params if needed
			if (Object.keys(authQueryState).length > 0) {
				const separator = url.includes('?') ? '&' : '?';
				const authParams = new URLSearchParams(authQueryState).toString();
				url += separator + authParams;
			}

			// Build headers
			const headers: Record<string, string> = {
				...authHeadersState,
				...requestState.headers
			};

			// Add header params from spec
			for (const param of headerParams()) {
				const value = requestState.headers[param.name];
				if (value) {
					headers[param.name] = value;
				}
			}

			// Add content type for body requests
			if (supportsBody() && requestState.body.trim()) {
				headers['Content-Type'] = requestState.contentType;
			}

			// Interpolate environment variables
			const interpolated = interpolateRequest(url, headers, requestState.body, envVars);

			// Build fetch options
			const fetchOptions: RequestInit = {
				method: requestState.endpoint.method,
				headers: interpolated.headers
			};

			// Add body for POST/PUT/PATCH
			if (supportsBody() && interpolated.body.trim()) {
				fetchOptions.body = interpolated.body;
			}

			// Execute request with timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);
			fetchOptions.signal = controller.signal;

			const fetchResponse = await fetch(interpolated.url, fetchOptions);
			clearTimeout(timeoutId);

			const endTime = performance.now();
			const responseTime = Math.round(endTime - startTime);

			// Parse response
			const responseHeaders: Record<string, string> = {};
			fetchResponse.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			const rawBody = await fetchResponse.text();
			let body: unknown = rawBody;

			// Try to parse as JSON
			try {
				body = JSON.parse(rawBody);
			} catch {
				// Keep as text
			}

			const apiResponse: ApiResponse = {
				status: fetchResponse.status,
				statusText: fetchResponse.statusText,
				headers: responseHeaders,
				body,
				rawBody,
				time: responseTime,
				size: new Blob([rawBody]).size,
				timestamp: new Date()
			};

			responseStore.setResponse(apiResponse);

			// Add to history
			const historyEntry: HistoryEntry = {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				timestamp: new Date(),
				method: requestState.endpoint.method,
				url: interpolated.url,
				path: requestState.endpoint.path,
				status: fetchResponse.status,
				time: responseTime,
				request: {
					headers: interpolated.headers,
					body: interpolated.body || undefined
				},
				response: apiResponse
			};

			historyStore.addEntry(historyEntry);

		} catch (error) {
			let message = 'Request failed';

			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					message = 'Request timed out after 30 seconds';
				} else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
					message = 'Network error - could not reach server. Check CORS settings.';
				} else {
					message = error.message;
				}
			}

			responseStore.setError(message);
		} finally {
			isSending = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			if (isValid && !isSending) {
				sendRequest();
			}
		}
	}

	// Method color classes
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

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col h-full">
	<!-- Request Header -->
	<div class="p-4 border-b border-gray-700">
		{#if requestState?.endpoint}
			<div class="flex items-center gap-3">
				<!-- Method Badge -->
				<span class="px-3 py-1.5 text-sm font-medium rounded shrink-0 {methodColors[requestState.endpoint.method]}">
					{requestState.endpoint.method}
				</span>
				<!-- Path -->
				<span class="text-gray-200 text-sm font-mono truncate" title={specState?.baseUrl + urlPath}>
					{specState?.baseUrl}{urlPath}
				</span>
			</div>
			{#if requestState.endpoint.summary}
				<p class="text-gray-400 text-xs mt-2">{requestState.endpoint.summary}</p>
			{/if}
			{#if requestState.endpoint.deprecated}
				<span class="inline-block mt-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
					Deprecated
				</span>
			{/if}
		{:else}
			<div class="flex items-center gap-3">
				<span class="px-3 py-1.5 text-sm font-medium rounded bg-gray-700 text-gray-400">
					---
				</span>
				<span class="text-gray-400 text-sm">Select an endpoint</span>
			</div>
		{/if}
	</div>

	<!-- Parameters Section -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if !requestState?.endpoint}
			<div class="text-gray-400 text-sm text-center py-8">
				<p>No endpoint selected</p>
				<p class="text-xs mt-1">Choose an endpoint from the list</p>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Path Parameters -->
				{#if pathParams().length > 0}
					<div>
						<h3 class="text-sm font-medium text-gray-300 mb-3">Path Parameters</h3>
						<div class="space-y-3">
							{#each pathParams() as param (param.name)}
								<ParamInput
									{param}
									value={requestState.pathParams[param.name] || ''}
									onChange={(value) => requestStore.setPathParam(param.name, value)}
								/>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Query Parameters -->
				{#if queryParams().length > 0}
					<div>
						<h3 class="text-sm font-medium text-gray-300 mb-3">Query Parameters</h3>
						<div class="space-y-3">
							{#each queryParams() as param (param.name)}
								<ParamInput
									{param}
									value={requestState.queryParams[param.name] || ''}
									onChange={(value) => requestStore.setQueryParam(param.name, value)}
								/>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Header Parameters (from spec) -->
				{#if headerParams().length > 0}
					<div>
						<h3 class="text-sm font-medium text-gray-300 mb-3">Header Parameters</h3>
						<div class="space-y-3">
							{#each headerParams() as param (param.name)}
								<ParamInput
									{param}
									value={requestState.headers[param.name] || ''}
									onChange={(value) => requestStore.setHeader(param.name, value)}
								/>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Custom Headers -->
				<HeadersEditor
					headers={requestState.headers}
					onChange={(headers) => {
						// Clear existing and set new
						if (requestState) {
							for (const key of Object.keys(requestState.headers)) {
								requestStore.removeHeader(key);
							}
						}
						for (const [key, value] of Object.entries(headers)) {
							requestStore.setHeader(key, value);
						}
					}}
				/>

				<!-- Request Body -->
				{#if supportsBody()}
					<div>
						{#if requestState.endpoint.requestBody?.schema}
							<div class="flex items-center justify-between mb-2">
								<h3 class="text-sm font-medium text-gray-300">Request Body</h3>
								<button
									class="text-xs text-blue-400 hover:text-blue-300"
									onclick={generateExampleBody}
								>
									Generate Example
								</button>
							</div>
						{/if}
						<BodyEditor
							value={requestState.body}
							onChange={(value) => requestStore.setBody(value)}
							contentType={requestState.contentType}
						/>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Send Button -->
	<div class="p-4 border-t border-gray-700">
		<button
			disabled={!isValid || isSending}
			class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
			onclick={sendRequest}
		>
			{#if isSending}
				<span class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
				Sending...
			{:else}
				Send Request
				<span class="text-xs text-white/60">(Ctrl+Enter)</span>
			{/if}
		</button>
	</div>
</div>
