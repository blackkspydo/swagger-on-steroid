// OpenAPI Spec Types
export interface OpenAPISpec {
	openapi?: string;
	swagger?: string;
	info: OpenAPIInfo;
	servers?: OpenAPIServer[];
	host?: string; // Swagger 2.0
	basePath?: string; // Swagger 2.0
	schemes?: string[]; // Swagger 2.0
	paths: Record<string, OpenAPIPathItem>;
	components?: OpenAPIComponents;
	definitions?: Record<string, OpenAPISchema>; // Swagger 2.0
	tags?: OpenAPITag[];
}

export interface OpenAPIInfo {
	title: string;
	version: string;
	description?: string;
	termsOfService?: string;
	contact?: {
		name?: string;
		url?: string;
		email?: string;
	};
	license?: {
		name: string;
		url?: string;
	};
}

export interface OpenAPIServer {
	url: string;
	description?: string;
	variables?: Record<string, {
		default: string;
		enum?: string[];
		description?: string;
	}>;
}

export interface OpenAPIPathItem {
	get?: OpenAPIOperation;
	post?: OpenAPIOperation;
	put?: OpenAPIOperation;
	patch?: OpenAPIOperation;
	delete?: OpenAPIOperation;
	options?: OpenAPIOperation;
	head?: OpenAPIOperation;
	trace?: OpenAPIOperation;
	parameters?: OpenAPIParameter[];
}

export interface OpenAPIOperation {
	operationId?: string;
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: OpenAPIParameter[];
	requestBody?: OpenAPIRequestBody;
	responses?: Record<string, OpenAPIResponse>;
	security?: Record<string, string[]>[];
	deprecated?: boolean;
}

export interface OpenAPIParameter {
	name: string;
	in: 'path' | 'query' | 'header' | 'cookie';
	description?: string;
	required?: boolean;
	deprecated?: boolean;
	schema?: OpenAPISchema;
	type?: string; // Swagger 2.0
	format?: string; // Swagger 2.0
	default?: unknown;
	example?: unknown;
	enum?: unknown[];
}

export interface OpenAPIRequestBody {
	description?: string;
	required?: boolean;
	content: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
	schema?: OpenAPISchema;
	example?: unknown;
	examples?: Record<string, { value: unknown }>;
}

export interface OpenAPIResponse {
	description: string;
	content?: Record<string, OpenAPIMediaType>;
	headers?: Record<string, OpenAPIParameter>;
}

export interface OpenAPISchema {
	type?: string;
	format?: string;
	properties?: Record<string, OpenAPISchema>;
	items?: OpenAPISchema;
	required?: string[];
	enum?: unknown[];
	default?: unknown;
	example?: unknown;
	description?: string;
	$ref?: string;
	allOf?: OpenAPISchema[];
	oneOf?: OpenAPISchema[];
	anyOf?: OpenAPISchema[];
	nullable?: boolean;
}

export interface OpenAPIComponents {
	schemas?: Record<string, OpenAPISchema>;
	securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
	type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
	description?: string;
	name?: string;
	in?: 'query' | 'header' | 'cookie';
	scheme?: string;
	bearerFormat?: string;
}

export interface OpenAPITag {
	name: string;
	description?: string;
}

// Parsed/Normalized Endpoint
export interface ParsedEndpoint {
	id: string;
	method: HttpMethod;
	path: string;
	operationId?: string;
	summary?: string;
	description?: string;
	tags: string[];
	parameters: ParsedParameter[];
	requestBody?: ParsedRequestBody;
	responses: ParsedResponse[];
	deprecated: boolean;
}

export interface ParsedParameter {
	name: string;
	in: 'path' | 'query' | 'header' | 'cookie';
	description?: string;
	required: boolean;
	type: string;
	format?: string;
	default?: unknown;
	example?: unknown;
	enum?: unknown[];
}

export interface ParsedRequestBody {
	description?: string;
	required: boolean;
	contentType: string;
	schema?: OpenAPISchema;
	example?: unknown;
}

export interface ParsedResponse {
	statusCode: string;
	description: string;
	contentType?: string;
	schema?: OpenAPISchema;
}

// HTTP Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE';

// Base URL Configuration
export interface BaseUrlConfig {
	id: string;
	label: string;
	url: string;
	color: string; // hex color code
}

// Environment Variables
export interface Environment {
	name: string;
	variables: Record<string, string>;
}

export interface EnvVariable {
	key: string;
	value: string;
	enabled: boolean;
}

// Authentication
export type AuthType = 'none' | 'bearer' | 'apiKey' | 'basic';

export interface AuthConfig {
	type: AuthType;
	bearer?: {
		token: string;
	};
	apiKey?: {
		name: string;
		value: string;
		in: 'header' | 'query';
	};
	basic?: {
		username: string;
		password: string;
	};
}

// Request Types
export interface RequestConfig {
	endpoint: ParsedEndpoint | null;
	pathParams: Record<string, string>;
	queryParams: Record<string, string>;
	headers: Record<string, string>;
	body: string;
	contentType: string;
}

export interface RequestHeader {
	key: string;
	value: string;
	enabled: boolean;
}

// Response Types
export interface ApiResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: unknown;
	rawBody: string;
	time: number;
	size: number;
	timestamp: Date;
}

// History Types
export interface HistoryEntry {
	id: string;
	timestamp: Date;
	method: HttpMethod;
	url: string;
	path: string;
	status: number;
	time: number;
	request: {
		headers: Record<string, string>;
		body?: string;
	};
	response: ApiResponse;
}

// Spec Store State
export interface SpecState {
	spec: OpenAPISpec | null;
	endpoints: ParsedEndpoint[];
	baseUrl: string;
	isLoading: boolean;
	error: string | null;
	recentSpecs: string[];
}

// UI State
export interface UIState {
	selectedEndpointId: string | null;
	leftPanelWidth: number;
	rightPanelWidth: number;
	responseTab: 'result' | 'headers' | 'raw';
	searchQuery: string;
	expandedTags: Set<string>;
}
