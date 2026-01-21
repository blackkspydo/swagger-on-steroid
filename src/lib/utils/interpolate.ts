/**
 * Environment variable interpolation utilities
 */

import { builtInVariables } from '$lib/stores/env';

// Regex to match {{variableName}} patterns
const ENV_VAR_REGEX = /\{\{(\$?[\w]+)\}\}/g;

/**
 * Interpolate environment variables in a string
 * Supports:
 * - {{variableName}} - regular variables
 * - {{$timestamp}} - current Unix timestamp
 * - {{$isoTimestamp}} - ISO 8601 timestamp
 * - {{$date}} - today's date (YYYY-MM-DD)
 * - {{$randomInt}} - random integer 0-1000
 * - {{$randomUUID}} - random UUID v4
 * - {{$randomString}} - random alphanumeric string
 * - {{$randomEmail}} - random email address
 * - {{$randomBoolean}} - random true/false
 * - {{$randomId}} - random UUID (legacy alias for $randomUUID)
 */
export function interpolate(text: string, variables: Record<string, string>): string {
	return text.replace(ENV_VAR_REGEX, (match, varName) => {
		// Handle built-in variables from the store
		const builtIn = builtInVariables.find(v => v.key === varName);
		if (builtIn) {
			return builtIn.generate();
		}

		// Legacy support for $randomId (alias for $randomUUID)
		if (varName === '$randomId') {
			return crypto.randomUUID();
		}

		// Look up in provided variables
		if (varName in variables) {
			return variables[varName];
		}

		// Return original if not found (will be highlighted as unresolved)
		return match;
	});
}

/**
 * Check if a variable name is a built-in variable
 */
function isBuiltIn(varName: string): boolean {
	// Check against the builtInVariables array
	if (builtInVariables.some(v => v.key === varName)) {
		return true;
	}
	// Also check legacy $randomId
	if (varName === '$randomId') {
		return true;
	}
	return false;
}

/**
 * Find all unresolved variables in a string
 * Returns array of variable names that don't have values
 */
export function findUnresolvedVariables(text: string, variables: Record<string, string>): string[] {
	const unresolved: string[] = [];
	const matches = text.matchAll(ENV_VAR_REGEX);

	for (const match of matches) {
		const varName = match[1];

		// Skip built-in variables
		if (isBuiltIn(varName)) {
			continue;
		}

		if (!(varName in variables)) {
			unresolved.push(varName);
		}
	}

	return [...new Set(unresolved)];
}

/**
 * Extract all variable names from a string
 */
export function extractVariableNames(text: string): string[] {
	const names: string[] = [];
	const matches = text.matchAll(ENV_VAR_REGEX);

	for (const match of matches) {
		names.push(match[1]);
	}

	return [...new Set(names)];
}

/**
 * Check if a string contains any environment variables
 */
export function hasVariables(text: string): boolean {
	return ENV_VAR_REGEX.test(text);
}

/**
 * Interpolate all fields in a request
 */
export function interpolateRequest(
	url: string,
	headers: Record<string, string>,
	body: string,
	variables: Record<string, string>
): {
	url: string;
	headers: Record<string, string>;
	body: string;
} {
	const interpolatedUrl = interpolate(url, variables);

	const interpolatedHeaders: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		interpolatedHeaders[interpolate(key, variables)] = interpolate(value, variables);
	}

	const interpolatedBody = interpolate(body, variables);

	return {
		url: interpolatedUrl,
		headers: interpolatedHeaders,
		body: interpolatedBody
	};
}
