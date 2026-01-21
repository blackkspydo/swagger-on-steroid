/**
 * localStorage helper utilities with type safety
 */

const STORAGE_KEYS = {
	ENV: 'swagger-steroids-env',
	AUTH: 'swagger-steroids-auth',
	HISTORY: 'swagger-steroids-history',
	RECENT_SPECS: 'swagger-steroids-recent-specs',
	SAVED_SPECS: 'swagger-steroids-saved-specs',
	LAST_SPEC: 'swagger-steroids-last-spec',
	REQUEST_BODIES: 'swagger-steroids-request-bodies',
	UI_STATE: 'swagger-steroids-ui-state',
	BASE_URLS: 'swagger-steroids-base-urls',
	ACTIVE_BASE_URL: 'swagger-steroids-active-base-url'
} as const;

export interface SavedSpec {
	id: string;
	label: string;
	spec: object;
	baseUrl: string;
	savedAt: number;
}

export interface BaseUrlConfig {
	id: string;
	label: string;
	url: string;
	color: string; // hex color code
}

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
	try {
		const test = '__storage_test__';
		localStorage.setItem(test, test);
		localStorage.removeItem(test);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get an item from localStorage with JSON parsing
 */
export function getStorageItem<T>(key: StorageKey): T | null {
	if (!isStorageAvailable()) return null;

	try {
		const item = localStorage.getItem(key);
		if (item === null) return null;
		return JSON.parse(item) as T;
	} catch (error) {
		console.error(`Error reading from localStorage key "${key}":`, error);
		return null;
	}
}

/**
 * Set an item in localStorage with JSON stringification
 */
export function setStorageItem<T>(key: StorageKey, value: T): boolean {
	if (!isStorageAvailable()) return false;

	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		console.error(`Error writing to localStorage key "${key}":`, error);
		return false;
	}
}

/**
 * Remove an item from localStorage
 */
export function removeStorageItem(key: StorageKey): boolean {
	if (!isStorageAvailable()) return false;

	try {
		localStorage.removeItem(key);
		return true;
	} catch (error) {
		console.error(`Error removing localStorage key "${key}":`, error);
		return false;
	}
}

/**
 * Clear all app-related items from localStorage
 */
export function clearAllStorage(): boolean {
	if (!isStorageAvailable()) return false;

	try {
		for (const key of Object.values(STORAGE_KEYS)) {
			localStorage.removeItem(key);
		}
		return true;
	} catch (error) {
		console.error('Error clearing localStorage:', error);
		return false;
	}
}

// Specific storage helpers for each data type
export const storage = {
	// Environment variables
	getEnv: () => getStorageItem<{ variables: Array<{ key: string; value: string; enabled: boolean }> }>(STORAGE_KEYS.ENV),
	setEnv: (data: { variables: Array<{ key: string; value: string; enabled: boolean }> }) => setStorageItem(STORAGE_KEYS.ENV, data),

	// Auth config
	getAuth: () => getStorageItem<{ type: string; bearer?: { token: string }; apiKey?: { name: string; value: string; in: string } }>(STORAGE_KEYS.AUTH),
	setAuth: (data: object) => setStorageItem(STORAGE_KEYS.AUTH, data),

	// Request history
	getHistory: () => getStorageItem<Array<object>>(STORAGE_KEYS.HISTORY),
	setHistory: (data: Array<object>) => setStorageItem(STORAGE_KEYS.HISTORY, data),

	// Recent specs
	getRecentSpecs: () => getStorageItem<string[]>(STORAGE_KEYS.RECENT_SPECS),
	setRecentSpecs: (urls: string[]) => setStorageItem(STORAGE_KEYS.RECENT_SPECS, urls),

	// Saved specs
	getSavedSpecs: () => getStorageItem<SavedSpec[]>(STORAGE_KEYS.SAVED_SPECS) || [],
	setSavedSpecs: (specs: SavedSpec[]) => setStorageItem(STORAGE_KEYS.SAVED_SPECS, specs),
	addSavedSpec: (spec: SavedSpec) => {
		const existing = getStorageItem<SavedSpec[]>(STORAGE_KEYS.SAVED_SPECS) || [];
		setStorageItem(STORAGE_KEYS.SAVED_SPECS, [...existing, spec]);
	},
	removeSavedSpec: (id: string) => {
		const existing = getStorageItem<SavedSpec[]>(STORAGE_KEYS.SAVED_SPECS) || [];
		setStorageItem(STORAGE_KEYS.SAVED_SPECS, existing.filter(s => s.id !== id));
	},
	updateSavedSpec: (id: string, updates: Partial<SavedSpec>) => {
		const existing = getStorageItem<SavedSpec[]>(STORAGE_KEYS.SAVED_SPECS) || [];
		setStorageItem(STORAGE_KEYS.SAVED_SPECS, existing.map(s => s.id === id ? { ...s, ...updates } : s));
	},

	// Last loaded spec (for auto-restore)
	getLastSpec: () => getStorageItem<{ spec: object; baseUrl: string }>(STORAGE_KEYS.LAST_SPEC),
	setLastSpec: (data: { spec: object; baseUrl: string }) => setStorageItem(STORAGE_KEYS.LAST_SPEC, data),
	clearLastSpec: () => removeStorageItem(STORAGE_KEYS.LAST_SPEC),

	// Request bodies per endpoint
	getRequestBodies: () => getStorageItem<Record<string, string>>(STORAGE_KEYS.REQUEST_BODIES) || {},
	setRequestBody: (endpointId: string, body: string) => {
		const bodies = getStorageItem<Record<string, string>>(STORAGE_KEYS.REQUEST_BODIES) || {};
		bodies[endpointId] = body;
		setStorageItem(STORAGE_KEYS.REQUEST_BODIES, bodies);
	},
	getRequestBody: (endpointId: string): string | null => {
		const bodies = getStorageItem<Record<string, string>>(STORAGE_KEYS.REQUEST_BODIES) || {};
		return bodies[endpointId] || null;
	},
	clearRequestBody: (endpointId: string) => {
		const bodies = getStorageItem<Record<string, string>>(STORAGE_KEYS.REQUEST_BODIES) || {};
		delete bodies[endpointId];
		setStorageItem(STORAGE_KEYS.REQUEST_BODIES, bodies);
	},

	// UI state
	getUIState: () => getStorageItem<{ leftPanelWidth?: number; rightPanelWidth?: number; expandedTags?: string[] }>(STORAGE_KEYS.UI_STATE),
	setUIState: (data: { leftPanelWidth?: number; rightPanelWidth?: number; expandedTags?: string[] }) => setStorageItem(STORAGE_KEYS.UI_STATE, data),

	// Expanded tags (convenience methods)
	getExpandedTags: (): string[] => {
		const state = getStorageItem<{ expandedTags?: string[] }>(STORAGE_KEYS.UI_STATE);
		return state?.expandedTags || [];
	},
	setExpandedTags: (tags: string[]) => {
		const existing = getStorageItem<{ leftPanelWidth?: number; rightPanelWidth?: number; expandedTags?: string[] }>(STORAGE_KEYS.UI_STATE) || {};
		setStorageItem(STORAGE_KEYS.UI_STATE, { ...existing, expandedTags: tags });
	},

	// Base URL configurations
	getBaseUrls: () => getStorageItem<BaseUrlConfig[]>(STORAGE_KEYS.BASE_URLS) || [],
	setBaseUrls: (configs: BaseUrlConfig[]) => setStorageItem(STORAGE_KEYS.BASE_URLS, configs),
	addBaseUrl: (config: BaseUrlConfig) => {
		const existing = getStorageItem<BaseUrlConfig[]>(STORAGE_KEYS.BASE_URLS) || [];
		setStorageItem(STORAGE_KEYS.BASE_URLS, [...existing, config]);
	},
	updateBaseUrl: (id: string, updates: Partial<BaseUrlConfig>) => {
		const existing = getStorageItem<BaseUrlConfig[]>(STORAGE_KEYS.BASE_URLS) || [];
		setStorageItem(STORAGE_KEYS.BASE_URLS, existing.map(c => c.id === id ? { ...c, ...updates } : c));
	},
	removeBaseUrl: (id: string) => {
		const existing = getStorageItem<BaseUrlConfig[]>(STORAGE_KEYS.BASE_URLS) || [];
		setStorageItem(STORAGE_KEYS.BASE_URLS, existing.filter(c => c.id !== id));
	},
	getActiveBaseUrlId: () => getStorageItem<string>(STORAGE_KEYS.ACTIVE_BASE_URL),
	setActiveBaseUrlId: (id: string | null) => {
		if (id) {
			setStorageItem(STORAGE_KEYS.ACTIVE_BASE_URL, id);
		} else {
			removeStorageItem(STORAGE_KEYS.ACTIVE_BASE_URL);
		}
	}
};
