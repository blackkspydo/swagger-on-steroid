<script lang="ts">
	import { responseStore } from '$lib/stores/response';
	import { requestStore } from '$lib/stores/request';
	import JsonViewer from './JsonViewer.svelte';
	import HeadersView from './HeadersView.svelte';
	import type { ApiResponse, RequestConfig } from '$lib/types';

	interface ResponseState {
		response: ApiResponse | null;
		isLoading: boolean;
		error: string | null;
	}

	let responseState = $state<ResponseState | null>(null);
	let requestState = $state<RequestConfig | null>(null);
	let activeTab = $state<'result' | 'headers' | 'raw'>('result');

	// Track request headers that were sent
	let lastRequestHeaders = $state<Record<string, string>>({});

	// Subscribe to stores
	$effect(() => {
		const unsubResponse = responseStore.subscribe(value => {
			responseState = value;
			// When we get a new response, capture the request headers
			if (value.response && requestState) {
				lastRequestHeaders = { ...requestState.headers };
			}
		});
		const unsubRequest = requestStore.subscribe(value => { requestState = value; });
		return () => {
			unsubResponse();
			unsubRequest();
		};
	});

	// Format bytes to human readable
	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Get status color class
	function getStatusClass(status: number): string {
		if (status >= 200 && status < 300) return 'text-green-400';
		if (status >= 300 && status < 400) return 'text-blue-400';
		if (status >= 400 && status < 500) return 'text-yellow-400';
		return 'text-red-400';
	}

	// Format raw request/response for Raw tab
	function formatRawView(): string {
		if (!responseState?.response) return '';

		const response = responseState.response;
		let raw = '';

		// Request section
		if (requestState?.endpoint) {
			raw += `=== REQUEST ===\n`;
			raw += `${requestState.endpoint.method} ${requestState.endpoint.path}\n\n`;

			if (Object.keys(lastRequestHeaders).length > 0) {
				raw += `Headers:\n`;
				for (const [key, value] of Object.entries(lastRequestHeaders)) {
					raw += `  ${key}: ${value}\n`;
				}
				raw += `\n`;
			}

			if (requestState.body) {
				raw += `Body:\n${requestState.body}\n\n`;
			}
		}

		// Response section
		raw += `=== RESPONSE ===\n`;
		raw += `Status: ${response.status} ${response.statusText}\n\n`;

		if (Object.keys(response.headers).length > 0) {
			raw += `Headers:\n`;
			for (const [key, value] of Object.entries(response.headers)) {
				raw += `  ${key}: ${value}\n`;
			}
			raw += `\n`;
		}

		raw += `Body:\n${response.rawBody}`;

		return raw;
	}

	// Copy response to clipboard
	async function copyToClipboard() {
		if (!responseState?.response) return;

		try {
			const text = typeof responseState.response.body === 'object'
				? JSON.stringify(responseState.response.body, null, 2)
				: String(responseState.response.body);
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Detect if response is HTML
	function isHtmlResponse(): boolean {
		if (!responseState?.response) return false;

		// Check content-type header
		const contentType = responseState.response.headers['content-type'] ||
			responseState.response.headers['Content-Type'] || '';
		if (contentType.toLowerCase().includes('text/html')) {
			return true;
		}

		// Check if body starts with HTML-like content
		const rawBody = responseState.response.rawBody?.trim() || '';
		if (rawBody.startsWith('<!DOCTYPE') ||
			rawBody.startsWith('<html') ||
			rawBody.startsWith('<HTML') ||
			rawBody.startsWith('<!doctype')) {
			return true;
		}

		return false;
	}

	// State for HTML preview toggle
	let showHtmlPreview = $state(true);
</script>

<div class="flex flex-col h-full">
	<!-- Tabs -->
	<div class="flex border-b border-gray-700 shrink-0">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors"
			class:text-blue-400={activeTab === 'result'}
			class:border-b-2={activeTab === 'result'}
			class:border-blue-400={activeTab === 'result'}
			class:text-gray-400={activeTab !== 'result'}
			class:hover:text-gray-300={activeTab !== 'result'}
			onclick={() => activeTab = 'result'}
		>
			Result
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors"
			class:text-blue-400={activeTab === 'headers'}
			class:border-b-2={activeTab === 'headers'}
			class:border-blue-400={activeTab === 'headers'}
			class:text-gray-400={activeTab !== 'headers'}
			class:hover:text-gray-300={activeTab !== 'headers'}
			onclick={() => activeTab = 'headers'}
		>
			Headers
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors"
			class:text-blue-400={activeTab === 'raw'}
			class:border-b-2={activeTab === 'raw'}
			class:border-blue-400={activeTab === 'raw'}
			class:text-gray-400={activeTab !== 'raw'}
			class:hover:text-gray-300={activeTab !== 'raw'}
			onclick={() => activeTab = 'raw'}
		>
			Raw
		</button>

		<!-- Response Stats -->
		{#if responseState?.response}
			<div class="ml-auto flex items-center gap-3 px-4 text-xs">
				<span class={getStatusClass(responseState.response.status)}>
					{responseState.response.status} {responseState.response.statusText}
				</span>
				<span class="text-gray-500">|</span>
				<span class="text-gray-400">{responseState.response.time}ms</span>
				<span class="text-gray-500">|</span>
				<span class="text-gray-400">{formatBytes(responseState.response.size)}</span>
				<button
					class="text-gray-400 hover:text-white transition-colors"
					onclick={copyToClipboard}
					title="Copy response"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
				</button>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-auto p-4">
		{#if responseState?.isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-gray-400 text-center">
					<div class="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-3"></div>
					<p class="text-sm">Sending request...</p>
				</div>
			</div>
		{:else if responseState?.error}
			<div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div>
						<p class="text-red-400 font-medium">Request Failed</p>
						<p class="text-red-300 text-sm mt-1">{responseState.error}</p>
					</div>
				</div>
			</div>
		{:else if responseState?.response}
			{#if activeTab === 'result'}
				<!-- Check for HTML response -->
				{#if isHtmlResponse()}
					<div class="flex flex-col h-full">
						<!-- Toggle between preview and source -->
						<div class="flex items-center gap-2 mb-3">
							<button
								class="px-3 py-1 text-xs rounded transition-colors"
								class:bg-blue-600={showHtmlPreview}
								class:text-white={showHtmlPreview}
								class:bg-gray-700={!showHtmlPreview}
								class:text-gray-300={!showHtmlPreview}
								onclick={() => showHtmlPreview = true}
							>
								Preview
							</button>
							<button
								class="px-3 py-1 text-xs rounded transition-colors"
								class:bg-blue-600={!showHtmlPreview}
								class:text-white={!showHtmlPreview}
								class:bg-gray-700={showHtmlPreview}
								class:text-gray-300={showHtmlPreview}
								onclick={() => showHtmlPreview = false}
							>
								Source
							</button>
							<span class="text-xs text-gray-500 ml-2">HTML Response Detected</span>
						</div>

						{#if showHtmlPreview}
							<!-- Render HTML in iframe -->
							<div class="flex-1 bg-white rounded overflow-hidden">
								<iframe
									srcdoc={responseState.response.rawBody}
									class="w-full h-full border-0"
									sandbox="allow-same-origin"
									title="HTML Response Preview"
								></iframe>
							</div>
						{:else}
							<!-- Show HTML source -->
							<pre class="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">{responseState.response.rawBody}</pre>
						{/if}
					</div>
				<!-- Pretty JSON view -->
				{:else if typeof responseState.response.body === 'object' && responseState.response.body !== null}
					<JsonViewer data={responseState.response.body} expanded={true} />
				{:else}
					<pre class="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">{responseState.response.rawBody}</pre>
				{/if}
			{:else if activeTab === 'headers'}
				<!-- Headers view -->
				<HeadersView
					requestHeaders={lastRequestHeaders}
					responseHeaders={responseState.response.headers}
				/>
			{:else if activeTab === 'raw'}
				<!-- Raw text view -->
				<pre class="text-sm text-gray-300 font-mono whitespace-pre-wrap break-all">{formatRawView()}</pre>
			{/if}
		{:else}
			<div class="flex items-center justify-center h-full text-gray-400 text-sm">
				<div class="text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<p>No response yet</p>
					<p class="text-xs mt-1">Send a request to see the response</p>
				</div>
			</div>
		{/if}
	</div>
</div>
