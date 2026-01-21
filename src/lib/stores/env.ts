import { writable, derived } from 'svelte/store';
import type { EnvVariable } from '$lib/types';

interface EnvState {
	variables: EnvVariable[];
	activeEnvironment: string;
}

// Built-in variable definitions
export interface BuiltInVariable {
	key: string;
	description: string;
	generate: () => string;
}

export const builtInVariables: BuiltInVariable[] = [
	{
		key: '$timestamp',
		description: 'Current Unix timestamp in milliseconds',
		generate: () => Date.now().toString()
	},
	{
		key: '$isoTimestamp',
		description: 'Current ISO 8601 timestamp',
		generate: () => new Date().toISOString()
	},
	{
		key: '$date',
		description: "Today's date (YYYY-MM-DD)",
		generate: () => new Date().toISOString().split('T')[0]
	},
	{
		key: '$randomInt',
		description: 'Random integer between 0-1000',
		generate: () => Math.floor(Math.random() * 1001).toString()
	},
	{
		key: '$randomUUID',
		description: 'Random UUID v4',
		generate: () => crypto.randomUUID()
	},
	{
		key: '$randomString',
		description: 'Random alphanumeric string (8 chars)',
		generate: () => Math.random().toString(36).substring(2, 10)
	},
	{
		key: '$randomEmail',
		description: 'Random email address',
		generate: () => `user${Math.floor(Math.random() * 10000)}@example.com`
	},
	{
		key: '$randomBoolean',
		description: 'Random true/false',
		generate: () => (Math.random() > 0.5).toString()
	}
];

const initialState: EnvState = {
	variables: [],
	activeEnvironment: 'default'
};

function createEnvStore() {
	const { subscribe, set, update } = writable<EnvState>(initialState);

	return {
		subscribe,

		addVariable: (key: string, value: string) => {
			update(state => ({
				...state,
				variables: [...state.variables, { key, value, enabled: true }]
			}));
		},

		updateVariable: (index: number, key: string, value: string) => {
			update(state => {
				const variables = [...state.variables];
				variables[index] = { ...variables[index], key, value };
				return { ...state, variables };
			});
		},

		toggleVariable: (index: number) => {
			update(state => {
				const variables = [...state.variables];
				variables[index] = { ...variables[index], enabled: !variables[index].enabled };
				return { ...state, variables };
			});
		},

		removeVariable: (index: number) => {
			update(state => ({
				...state,
				variables: state.variables.filter((_, i) => i !== index)
			}));
		},

		setVariables: (variables: EnvVariable[]) => {
			update(state => ({ ...state, variables }));
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const envStore = createEnvStore();

// Derived store: active variables as a map for easy lookup
export const activeEnvVariables = derived(envStore, ($env) => {
	const map: Record<string, string> = {};
	for (const variable of $env.variables) {
		if (variable.enabled) {
			map[variable.key] = variable.value;
		}
	}
	return map;
});

// Get the value of a variable (user-defined or built-in)
export function getVariableValue(key: string, userVars: Record<string, string>): string | null {
	// Check user-defined variables first
	if (key in userVars) {
		return userVars[key];
	}

	// Check built-in variables
	const builtIn = builtInVariables.find(v => v.key === key);
	if (builtIn) {
		return builtIn.generate();
	}

	return null;
}

// Check if a variable is built-in
export function isBuiltInVariable(key: string): boolean {
	return builtInVariables.some(v => v.key === key);
}

// Get variable info (for popover)
export function getVariableInfo(key: string, userVars: Record<string, string>): {
	value: string;
	isBuiltIn: boolean;
	description?: string;
} | null {
	// Check user-defined variables first
	if (key in userVars) {
		return {
			value: userVars[key],
			isBuiltIn: false
		};
	}

	// Check built-in variables
	const builtIn = builtInVariables.find(v => v.key === key);
	if (builtIn) {
		return {
			value: builtIn.generate(),
			isBuiltIn: true,
			description: builtIn.description
		};
	}

	return null;
}
