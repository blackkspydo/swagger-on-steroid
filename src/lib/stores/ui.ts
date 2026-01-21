import { writable } from 'svelte/store';
import type { UIState } from '$lib/types';
import { storage } from '$lib/utils/storage';

// Load initial expanded tags from storage
const savedExpandedTags = storage.getExpandedTags();

const initialState: UIState = {
	selectedEndpointId: null,
	leftPanelWidth: 280,
	rightPanelWidth: 400,
	responseTab: 'result',
	searchQuery: '',
	expandedTags: new Set<string>(savedExpandedTags)
};

function createUIStore() {
	const { subscribe, set, update } = writable<UIState>(initialState);

	// Helper to persist expanded tags
	function persistExpandedTags(tags: Set<string>) {
		storage.setExpandedTags(Array.from(tags));
	}

	return {
		subscribe,

		selectEndpoint: (id: string | null) => {
			update(state => ({ ...state, selectedEndpointId: id }));
		},

		setLeftPanelWidth: (width: number) => {
			update(state => ({ ...state, leftPanelWidth: width }));
		},

		setRightPanelWidth: (width: number) => {
			update(state => ({ ...state, rightPanelWidth: width }));
		},

		setResponseTab: (tab: 'result' | 'headers' | 'raw') => {
			update(state => ({ ...state, responseTab: tab }));
		},

		setSearchQuery: (query: string) => {
			update(state => ({ ...state, searchQuery: query }));
		},

		toggleTag: (tag: string) => {
			update(state => {
				const expandedTags = new Set(state.expandedTags);
				if (expandedTags.has(tag)) {
					expandedTags.delete(tag);
				} else {
					expandedTags.add(tag);
				}
				persistExpandedTags(expandedTags);
				return { ...state, expandedTags };
			});
		},

		expandAllTags: (tags: string[]) => {
			update(state => {
				const expandedTags = new Set(tags);
				persistExpandedTags(expandedTags);
				return { ...state, expandedTags };
			});
		},

		collapseAllTags: () => {
			update(state => {
				const expandedTags = new Set<string>();
				persistExpandedTags(expandedTags);
				return { ...state, expandedTags };
			});
		},

		// Initialize tags for a new spec (only expands tags that aren't already tracked)
		initializeTagsForSpec: (tags: string[]) => {
			update(state => {
				// If we have no expanded tags saved, expand all by default
				// Otherwise, keep the user's preferences
				if (state.expandedTags.size === 0) {
					const expandedTags = new Set(tags);
					persistExpandedTags(expandedTags);
					return { ...state, expandedTags };
				}
				return state;
			});
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const uiStore = createUIStore();
