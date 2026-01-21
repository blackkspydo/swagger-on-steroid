import { writable, derived } from 'svelte/store';
import type { OpenAPISpec, ParsedEndpoint, SpecState } from '$lib/types';

const initialState: SpecState = {
	spec: null,
	endpoints: [],
	baseUrl: '',
	isLoading: false,
	error: null,
	recentSpecs: []
};

function createSpecStore() {
	const { subscribe, set, update } = writable<SpecState>(initialState);

	return {
		subscribe,

		setSpec: (spec: OpenAPISpec, endpoints: ParsedEndpoint[], baseUrl: string) => {
			update(state => ({
				...state,
				spec,
				endpoints,
				baseUrl,
				isLoading: false,
				error: null
			}));
		},

		setLoading: (isLoading: boolean) => {
			update(state => ({ ...state, isLoading }));
		},

		setError: (error: string | null) => {
			update(state => ({ ...state, error, isLoading: false }));
		},

		addRecentSpec: (url: string) => {
			update(state => {
				const recentSpecs = [url, ...state.recentSpecs.filter(u => u !== url)].slice(0, 10);
				return { ...state, recentSpecs };
			});
		},

		setBaseUrl: (baseUrl: string) => {
			update(state => ({ ...state, baseUrl }));
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const specStore = createSpecStore();

// Derived store: endpoints grouped by tag
export const endpointsByTag = derived(specStore, ($spec) => {
	const groups: Record<string, ParsedEndpoint[]> = {};

	for (const endpoint of $spec.endpoints) {
		const tags = endpoint.tags.length > 0 ? endpoint.tags : ['Untagged'];
		for (const tag of tags) {
			if (!groups[tag]) {
				groups[tag] = [];
			}
			groups[tag].push(endpoint);
		}
	}

	return groups;
});

// Derived store: spec info
export const specInfo = derived(specStore, ($spec) => {
	if (!$spec.spec) return null;
	return {
		title: $spec.spec.info.title,
		version: $spec.spec.info.version,
		description: $spec.spec.info.description,
		baseUrl: $spec.baseUrl
	};
});
