import { writable, derived } from 'svelte/store';
import type { AuthConfig, AuthType } from '$lib/types';

const initialState: AuthConfig = {
	type: 'none',
	bearer: {
		token: ''
	},
	apiKey: {
		name: 'X-API-Key',
		value: '',
		in: 'header'
	},
	basic: {
		username: '',
		password: ''
	}
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthConfig>(initialState);

	return {
		subscribe,

		setType: (type: AuthType) => {
			update(state => ({ ...state, type }));
		},

		setBearerToken: (token: string) => {
			update(state => ({
				...state,
				bearer: { token }
			}));
		},

		setApiKey: (name: string, value: string, inLocation: 'header' | 'query') => {
			update(state => ({
				...state,
				apiKey: { name, value, in: inLocation }
			}));
		},

		setBasicAuth: (username: string, password: string) => {
			update(state => ({
				...state,
				basic: { username, password }
			}));
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const authStore = createAuthStore();

// Derived store: get auth headers based on current config
export const authHeaders = derived(authStore, ($auth): Record<string, string> => {
	const headers: Record<string, string> = {};

	switch ($auth.type) {
		case 'bearer':
			if ($auth.bearer?.token) {
				headers['Authorization'] = `Bearer ${$auth.bearer.token}`;
			}
			break;
		case 'apiKey':
			if ($auth.apiKey?.in === 'header' && $auth.apiKey.name && $auth.apiKey.value) {
				headers[$auth.apiKey.name] = $auth.apiKey.value;
			}
			break;
		case 'basic':
			if ($auth.basic?.username) {
				const credentials = btoa(`${$auth.basic.username}:${$auth.basic.password || ''}`);
				headers['Authorization'] = `Basic ${credentials}`;
			}
			break;
	}

	return headers;
});

// Derived store: get auth query params for API key in query
export const authQueryParams = derived(authStore, ($auth): Record<string, string> => {
	const params: Record<string, string> = {};

	if ($auth.type === 'apiKey' && $auth.apiKey?.in === 'query' && $auth.apiKey.name && $auth.apiKey.value) {
		params[$auth.apiKey.name] = $auth.apiKey.value;
	}

	return params;
});
