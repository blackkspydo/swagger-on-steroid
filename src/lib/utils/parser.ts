import type {
	OpenAPISpec,
	ParsedEndpoint,
	ParsedParameter,
	ParsedRequestBody,
	ParsedResponse,
	HttpMethod,
	OpenAPIOperation,
	OpenAPIParameter,
	OpenAPIPathItem
} from '$lib/types';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE'];

/**
 * Parse and validate an OpenAPI/Swagger spec from a URL
 */
export async function parseSpecFromUrl(url: string): Promise<{
	spec: OpenAPISpec;
	endpoints: ParsedEndpoint[];
	baseUrl: string;
}> {
	// Fetch the spec
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`);
	}

	const text = await response.text();
	let spec: OpenAPISpec;

	try {
		spec = JSON.parse(text);
	} catch {
		throw new Error('Invalid JSON: Could not parse the spec file');
	}

	// Basic validation
	validateSpec(spec);

	// Resolve $ref references inline
	spec = resolveRefs(spec);

	// Determine base URL
	const baseUrl = getBaseUrl(spec, url);

	// Parse endpoints
	const endpoints = parseEndpoints(spec);

	return { spec, endpoints, baseUrl };
}

/**
 * Parse spec from a JSON object (for local testing)
 */
export async function parseSpecFromJson(json: object): Promise<{
	spec: OpenAPISpec;
	endpoints: ParsedEndpoint[];
	baseUrl: string;
}> {
	let spec = json as OpenAPISpec;
	validateSpec(spec);
	spec = resolveRefs(spec);
	const baseUrl = getBaseUrl(spec, '');
	const endpoints = parseEndpoints(spec);

	return { spec, endpoints, baseUrl };
}

/**
 * Basic spec validation
 */
function validateSpec(spec: OpenAPISpec): void {
	// Check for OpenAPI 3.x
	if (spec.openapi) {
		if (!spec.openapi.startsWith('3.')) {
			console.warn(`OpenAPI version ${spec.openapi} may not be fully supported`);
		}
		if (!spec.paths) {
			throw new Error('Invalid OpenAPI spec: missing "paths" property');
		}
		return;
	}

	// Check for Swagger 2.0
	if (spec.swagger) {
		if (!spec.swagger.startsWith('2.')) {
			console.warn(`Swagger version ${spec.swagger} may not be fully supported`);
		}
		if (!spec.paths) {
			throw new Error('Invalid Swagger spec: missing "paths" property');
		}
		return;
	}

	throw new Error('Invalid spec: Not a valid OpenAPI 3.x or Swagger 2.0 document');
}

/**
 * Resolve $ref references in the spec
 */
function resolveRefs(spec: OpenAPISpec): OpenAPISpec {
	const refCache = new Map<string, unknown>();

	function resolveRef(ref: string): unknown {
		if (refCache.has(ref)) {
			return refCache.get(ref);
		}

		// Parse the $ref path (e.g., "#/components/schemas/Pet")
		if (!ref.startsWith('#/')) {
			console.warn(`External $ref not supported: ${ref}`);
			return {};
		}

		const path = ref.slice(2).split('/');
		let current: unknown = spec;

		for (const segment of path) {
			if (current && typeof current === 'object' && segment in current) {
				current = (current as Record<string, unknown>)[segment];
			} else {
				console.warn(`Could not resolve $ref: ${ref}`);
				return {};
			}
		}

		refCache.set(ref, current);
		return current;
	}

	function deepResolve(obj: unknown, seen = new WeakSet()): unknown {
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}

		// Prevent circular reference infinite loops
		if (seen.has(obj as object)) {
			return obj;
		}
		seen.add(obj as object);

		if (Array.isArray(obj)) {
			return obj.map(item => deepResolve(item, seen));
		}

		const record = obj as Record<string, unknown>;

		// If this object has a $ref, resolve it
		if ('$ref' in record && typeof record['$ref'] === 'string') {
			const resolved = resolveRef(record['$ref']);
			// Merge any additional properties with the resolved reference
			const { $ref: _, ...rest } = record;
			if (Object.keys(rest).length > 0) {
				return { ...deepResolve(resolved, seen) as object, ...rest };
			}
			return deepResolve(resolved, seen);
		}

		// Recursively resolve all properties
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(record)) {
			result[key] = deepResolve(value, seen);
		}
		return result;
	}

	return deepResolve(spec) as OpenAPISpec;
}

/**
 * Get base URL from spec
 */
function getBaseUrl(spec: OpenAPISpec, specUrl: string): string {
	// OpenAPI 3.x
	if (spec.servers && spec.servers.length > 0) {
		let url = spec.servers[0].url;

		// Handle relative URLs
		if (url.startsWith('/')) {
			try {
				const specUrlObj = new URL(specUrl);
				url = `${specUrlObj.protocol}//${specUrlObj.host}${url}`;
			} catch {
				// If specUrl is invalid, just return the relative path
			}
		}

		// Replace server variables with defaults
		if (spec.servers[0].variables) {
			for (const [key, variable] of Object.entries(spec.servers[0].variables)) {
				url = url.replace(`{${key}}`, variable.default);
			}
		}

		return url;
	}

	// Swagger 2.0
	if (spec.host) {
		const scheme = spec.schemes?.[0] || 'https';
		const basePath = spec.basePath || '';
		return `${scheme}://${spec.host}${basePath}`;
	}

	// Fallback: try to derive from spec URL
	try {
		const urlObj = new URL(specUrl);
		return `${urlObj.protocol}//${urlObj.host}`;
	} catch {
		return '';
	}
}

/**
 * Parse all endpoints from spec
 */
function parseEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
	const endpoints: ParsedEndpoint[] = [];

	for (const [path, pathItem] of Object.entries(spec.paths)) {
		// Get path-level parameters
		const pathParams = (pathItem as OpenAPIPathItem).parameters || [];

		for (const method of HTTP_METHODS) {
			const operation = (pathItem as OpenAPIPathItem)[method.toLowerCase() as keyof OpenAPIPathItem] as OpenAPIOperation | undefined;

			if (operation) {
				const endpoint = parseOperation(path, method, operation, pathParams, spec);
				endpoints.push(endpoint);
			}
		}
	}

	return endpoints;
}

/**
 * Parse a single operation into a ParsedEndpoint
 */
function parseOperation(
	path: string,
	method: HttpMethod,
	operation: OpenAPIOperation,
	pathParams: OpenAPIParameter[],
	spec: OpenAPISpec
): ParsedEndpoint {
	const id = `${method}-${path}`;

	// Merge path-level and operation-level parameters
	const allParams = [...pathParams, ...(operation.parameters || [])];

	// Parse parameters
	const parameters: ParsedParameter[] = allParams.map(param => parseParameter(param, spec));

	// Parse request body (OpenAPI 3.x)
	let requestBody: ParsedRequestBody | undefined;
	if (operation.requestBody) {
		requestBody = parseRequestBody(operation.requestBody, spec);
	}

	// Handle Swagger 2.0 body parameter
	const bodyParam = allParams.find(p => p.in === 'body');
	if (bodyParam && !requestBody) {
		requestBody = {
			description: bodyParam.description,
			required: bodyParam.required || false,
			contentType: 'application/json',
			schema: bodyParam.schema,
			example: bodyParam.schema?.example
		};
	}

	// Parse responses
	const responses: ParsedResponse[] = [];
	if (operation.responses) {
		for (const [statusCode, response] of Object.entries(operation.responses)) {
			responses.push(parseResponse(statusCode, response, spec));
		}
	}

	return {
		id,
		method,
		path,
		operationId: operation.operationId,
		summary: operation.summary,
		description: operation.description,
		tags: operation.tags || [],
		parameters,
		requestBody,
		responses,
		deprecated: operation.deprecated || false
	};
}

/**
 * Parse a parameter
 */
function parseParameter(param: OpenAPIParameter, _spec: OpenAPISpec): ParsedParameter {
	// Handle schema (OpenAPI 3.x) vs direct type (Swagger 2.0)
	const type = param.schema?.type || param.type || 'string';
	const format = param.schema?.format || param.format;
	const defaultValue = param.schema?.default ?? param.default;
	const example = param.schema?.example ?? param.example;
	const enumValues = param.schema?.enum ?? param.enum;

	return {
		name: param.name,
		in: param.in,
		description: param.description,
		required: param.required || param.in === 'path',
		type,
		format,
		default: defaultValue,
		example,
		enum: enumValues
	};
}

/**
 * Parse request body
 */
function parseRequestBody(
	requestBody: NonNullable<OpenAPIOperation['requestBody']>,
	_spec: OpenAPISpec
): ParsedRequestBody {
	// Find preferred content type
	const contentTypes = Object.keys(requestBody.content || {});
	const preferredType = contentTypes.find(t => t.includes('json')) || contentTypes[0] || 'application/json';

	const mediaType = requestBody.content?.[preferredType];

	return {
		description: requestBody.description,
		required: requestBody.required || false,
		contentType: preferredType,
		schema: mediaType?.schema,
		example: mediaType?.example || mediaType?.examples?.default?.value
	};
}

/**
 * Parse response
 */
function parseResponse(
	statusCode: string,
	response: NonNullable<OpenAPIOperation['responses']>[string],
	_spec: OpenAPISpec
): ParsedResponse {
	let contentType: string | undefined;
	let schema = undefined;

	if (response.content) {
		const contentTypes = Object.keys(response.content);
		contentType = contentTypes.find(t => t.includes('json')) || contentTypes[0];
		schema = response.content[contentType]?.schema;
	}

	// Swagger 2.0 schema
	if (!schema && response.schema) {
		schema = response.schema;
		contentType = 'application/json';
	}

	return {
		statusCode,
		description: response.description,
		contentType,
		schema
	};
}

/**
 * Generate example value from schema
 */
export function generateExampleFromSchema(schema: Record<string, unknown> | undefined): unknown {
	if (!schema) return {};

	// If there's an example, use it
	if ('example' in schema) {
		return schema.example;
	}

	const type = schema.type as string | undefined;

	switch (type) {
		case 'object': {
			const result: Record<string, unknown> = {};
			const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
			if (properties) {
				for (const [key, propSchema] of Object.entries(properties)) {
					result[key] = generateExampleFromSchema(propSchema);
				}
			}
			return result;
		}
		case 'array': {
			const items = schema.items as Record<string, unknown> | undefined;
			return [generateExampleFromSchema(items)];
		}
		case 'string': {
			if (schema.enum && Array.isArray(schema.enum)) {
				return schema.enum[0];
			}
			if (schema.format === 'date') return '2024-01-01';
			if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
			if (schema.format === 'email') return 'user@example.com';
			if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
			if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
			return 'string';
		}
		case 'integer':
		case 'number':
			return schema.default ?? 0;
		case 'boolean':
			return schema.default ?? false;
		default:
			return null;
	}
}
