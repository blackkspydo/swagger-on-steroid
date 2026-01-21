import { writable, derived } from 'svelte/store';
import type { RequestConfig, ParsedEndpoint } from '$lib/types';

const initialState: RequestConfig = {
	endpoint: null,
	pathParams: {},
	queryParams: {},
	headers: {},
	body: '',
	contentType: 'application/json'
};

function createRequestStore() {
	const { subscribe, set, update } = writable<RequestConfig>(initialState);

	return {
		subscribe,

		setEndpoint: (endpoint: ParsedEndpoint) => {
			// Initialize params from endpoint definition
			const pathParams: Record<string, string> = {};
			const queryParams: Record<string, string> = {};

			for (const param of endpoint.parameters) {
				const defaultValue = param.default !== undefined
					? String(param.default)
					: param.example !== undefined
						? String(param.example)
						: '';

				if (param.in === 'path') {
					pathParams[param.name] = defaultValue;
				} else if (param.in === 'query') {
					queryParams[param.name] = defaultValue;
				}
			}

			// Initialize body from request body example
			let body = '';
			if (endpoint.requestBody?.example) {
				body = JSON.stringify(endpoint.requestBody.example, null, 2);
			}

			update(state => ({
				...state,
				endpoint,
				pathParams,
				queryParams,
				headers: {},
				body,
				contentType: endpoint.requestBody?.contentType || 'application/json'
			}));
		},

		setPathParam: (name: string, value: string) => {
			update(state => ({
				...state,
				pathParams: { ...state.pathParams, [name]: value }
			}));
		},

		setQueryParam: (name: string, value: string) => {
			update(state => ({
				...state,
				queryParams: { ...state.queryParams, [name]: value }
			}));
		},

		setHeader: (name: string, value: string) => {
			update(state => ({
				...state,
				headers: { ...state.headers, [name]: value }
			}));
		},

		removeHeader: (name: string) => {
			update(state => {
				const headers = { ...state.headers };
				delete headers[name];
				return { ...state, headers };
			});
		},

		setBody: (body: string) => {
			update(state => ({ ...state, body }));
		},

		setContentType: (contentType: string) => {
			update(state => ({ ...state, contentType }));
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const requestStore = createRequestStore();

// Derived store: check if all required params are filled
export const isRequestValid = derived(requestStore, ($request) => {
	if (!$request.endpoint) return false;

	for (const param of $request.endpoint.parameters) {
		if (param.required) {
			if (param.in === 'path' && !$request.pathParams[param.name]) {
				return false;
			}
			if (param.in === 'query' && !$request.queryParams[param.name]) {
				return false;
			}
		}
	}

	if ($request.endpoint.requestBody?.required && !$request.body.trim()) {
		return false;
	}

	return true;
});

// Derived store: build the full URL with path params and query params
export const builtUrl = derived(requestStore, ($request) => {
	if (!$request.endpoint) return '';

	let path = $request.endpoint.path;

	// Replace path params
	for (const [name, value] of Object.entries($request.pathParams)) {
		path = path.replace(`{${name}}`, encodeURIComponent(value));
	}

	// Add query params
	const queryParts: string[] = [];
	for (const [name, value] of Object.entries($request.queryParams)) {
		if (value) {
			queryParts.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
		}
	}

	if (queryParts.length > 0) {
		path += '?' + queryParts.join('&');
	}

	return path;
});
