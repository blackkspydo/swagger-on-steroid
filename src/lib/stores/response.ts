import { writable } from 'svelte/store';
import type { ApiResponse, HistoryEntry } from '$lib/types';

interface ResponseState {
	response: ApiResponse | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: ResponseState = {
	response: null,
	isLoading: false,
	error: null
};

function createResponseStore() {
	const { subscribe, set, update } = writable<ResponseState>(initialState);

	return {
		subscribe,

		setLoading: (isLoading: boolean) => {
			update(state => ({ ...state, isLoading, error: null }));
		},

		setResponse: (response: ApiResponse) => {
			update(state => ({
				...state,
				response,
				isLoading: false,
				error: null
			}));
		},

		setError: (error: string) => {
			update(state => ({
				...state,
				error,
				isLoading: false
			}));
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const responseStore = createResponseStore();

// History Store
const MAX_HISTORY_SIZE = 50;

interface HistoryState {
	entries: HistoryEntry[];
}

function createHistoryStore() {
	const { subscribe, set, update } = writable<HistoryState>({ entries: [] });

	return {
		subscribe,

		addEntry: (entry: HistoryEntry) => {
			update(state => ({
				entries: [entry, ...state.entries].slice(0, MAX_HISTORY_SIZE)
			}));
		},

		removeEntry: (id: string) => {
			update(state => ({
				entries: state.entries.filter(e => e.id !== id)
			}));
		},

		setEntries: (entries: HistoryEntry[]) => {
			set({ entries: entries.slice(0, MAX_HISTORY_SIZE) });
		},

		clear: () => {
			set({ entries: [] });
		}
	};
}

export const historyStore = createHistoryStore();
