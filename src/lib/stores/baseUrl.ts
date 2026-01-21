import { writable, derived } from 'svelte/store';
import type { BaseUrlConfig } from '$lib/types';
import { storage } from '$lib/utils/storage';

interface BaseUrlState {
	configs: BaseUrlConfig[];
	activeId: string | null;
}

function createBaseUrlStore() {
	const { subscribe, set, update } = writable<BaseUrlState>({
		configs: [],
		activeId: null
	});

	return {
		subscribe,

		// Initialize from storage
		init: () => {
			const configs = storage.getBaseUrls();
			const activeId = storage.getActiveBaseUrlId();
			set({ configs, activeId });
		},

		// Add a new base URL config
		addConfig: (config: Omit<BaseUrlConfig, 'id'>) => {
			const newConfig: BaseUrlConfig = {
				...config,
				id: crypto.randomUUID()
			};
			update(state => {
				const newConfigs = [...state.configs, newConfig];
				storage.setBaseUrls(newConfigs);
				return { ...state, configs: newConfigs };
			});
			return newConfig;
		},

		// Update an existing config
		updateConfig: (id: string, updates: Partial<Omit<BaseUrlConfig, 'id'>>) => {
			update(state => {
				const newConfigs = state.configs.map(c =>
					c.id === id ? { ...c, ...updates } : c
				);
				storage.setBaseUrls(newConfigs);
				return { ...state, configs: newConfigs };
			});
		},

		// Remove a config
		removeConfig: (id: string) => {
			update(state => {
				const newConfigs = state.configs.filter(c => c.id !== id);
				storage.setBaseUrls(newConfigs);
				// If removing the active config, clear active
				const newActiveId = state.activeId === id ? null : state.activeId;
				if (state.activeId === id) {
					storage.setActiveBaseUrlId(null);
				}
				return { configs: newConfigs, activeId: newActiveId };
			});
		},

		// Set active base URL
		setActive: (id: string | null) => {
			update(state => {
				storage.setActiveBaseUrlId(id);
				return { ...state, activeId: id };
			});
		},

		// Set configs directly (useful for reordering)
		setConfigs: (configs: BaseUrlConfig[]) => {
			update(state => {
				storage.setBaseUrls(configs);
				return { ...state, configs };
			});
		}
	};
}

export const baseUrlStore = createBaseUrlStore();

// Derived store for the active base URL config
export const activeBaseUrl = derived(baseUrlStore, $state => {
	if (!$state.activeId) return null;
	return $state.configs.find(c => c.id === $state.activeId) || null;
});
