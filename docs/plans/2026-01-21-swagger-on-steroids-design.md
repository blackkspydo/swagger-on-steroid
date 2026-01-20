# Swagger on Steroids - Design Document

A modern, three-panel API client that loads from OpenAPI specs.

## Overview

**Problem:** Swagger UI is functional but has poor UX - vertical stacking, no environment variables, weak response visualization, can't save requests.

**Solution:** A clean three-panel interface (like Postman) that auto-generates from OpenAPI specs.

**Target Users:** Developers, QA testers, frontend devs - anyone working with APIs.

## Tech Stack

- **Framework:** SvelteKit (SPA mode, adapter-static)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Storage:** Browser localStorage
- **Deployment:** Static hosting (Vercel, Netlify, or local)

## MVP Features

### Must-Have (v1)
- Three-panel layout (endpoints list / request builder / response viewer)
- Load OpenAPI 2.0/3.x spec from URL
- Auth support (Bearer token, API key)
- Environment variables with `{{var}}` interpolation
- Response tabs: Result (pretty JSON), Headers, Raw
- Syntax-highlighted JSON responses
- Request history (last 50)

### Nice-to-Have (v2+)
- Save/organize requests into collections
- Multiple auth types (OAuth2, Basic Auth)
- Export to cURL/code snippets
- Dark/light theme toggle
- Import/export environments

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header: [OpenAPI URL input] [Load] [Env Vars] [Auth Settings]      │
├──────────────┬────────────────────────┬─────────────────────────────┤
│              │                        │  [Result] [Headers] [Raw]   │
│  Endpoints   │   Request Builder      ├─────────────────────────────┤
│  List        │                        │                             │
│              │   - Method + Path      │   Response Panel            │
│  - Grouped   │   - Path params        │                             │
│    by tag    │   - Query params       │   - Status code             │
│              │   - Headers            │   - Response time           │
│  - Search    │   - Body (if POST/PUT) │   - Syntax-highlighted JSON │
│    filter    │                        │                             │
│              │   [Send Request]       │                             │
│              │                        │                             │
├──────────────┴────────────────────────┴─────────────────────────────┤
│  Status bar: Connected to {api-name} | {base-url} | {version}       │
└─────────────────────────────────────────────────────────────────────┘
```

**Panel Behavior:**
- Panels are resizable via drag handles
- Endpoint list collapses to icons on narrow screens
- Middle and right panels scroll independently

## State Management

**Svelte Stores:**

| Store | Purpose |
|-------|---------|
| `specStore` | Parsed OpenAPI spec (endpoints, schemas, info) |
| `envStore` | Environment variables `{ name: value }` |
| `authStore` | Auth config (type, token, header name) |
| `requestStore` | Current request being built |
| `responseStore` | Latest response (body, headers, status, time) |
| `historyStore` | Recent requests (last 50) |

**Data Flow:**

1. **Load spec:** User enters URL → fetch JSON → parse with swagger-parser → populate `specStore`
2. **Select endpoint:** Click endpoint → populate `requestStore` with method, path, default params
3. **Build request:** User fills params/body → env vars interpolated (e.g., `{{baseUrl}}`)
4. **Send request:** Execute fetch → populate `responseStore` → add to `historyStore`

**localStorage Keys:**
- `swagger-steroids-env` - Environment variables
- `swagger-steroids-auth` - Auth configuration
- `swagger-steroids-history` - Request history
- `swagger-steroids-recent-specs` - Recently loaded spec URLs

## Components

### Left Panel - Endpoint List
- `EndpointList.svelte` - Container with search input
- `EndpointGroup.svelte` - Collapsible group by OpenAPI tag
- `EndpointItem.svelte` - Single endpoint (method badge + path)

### Middle Panel - Request Builder
- `RequestBuilder.svelte` - Main container
- `ParamInput.svelte` - Input for path/query params (shows type, required)
- `BodyEditor.svelte` - JSON editor with syntax highlighting
- `HeadersEditor.svelte` - Key-value pairs for custom headers

### Right Panel - Response Viewer
- `ResponsePanel.svelte` - Container with tabs
- Tab 1 "Result": Collapsible JSON tree
- Tab 2 "Headers": Request + response headers
- Tab 3 "Raw": Plain text view
- Status bar: `200 OK` | `245ms` | `1.2 KB`

### Header Bar
- `SpecLoader.svelte` - URL input + Load + recent specs dropdown
- `EnvManager.svelte` - Modal to manage environment variables
- `AuthConfig.svelte` - Modal for auth settings

## Authentication

**Supported Types (MVP):**

1. **Bearer Token**
   - Adds `Authorization: Bearer {token}` header
   - Token can use env vars: `{{accessToken}}`

2. **API Key**
   - Configurable: key name, value, location (header or query)
   - Example: `X-API-Key` header or `?api_key=` query

## Environment Variables

**Features:**
- Syntax: `{{variableName}}`
- Applied to: URL, headers, body
- Autocomplete when typing `{{`
- Highlight unresolved variables in red
- Import/Export as JSON

**Reserved Variables:**
- `{{$timestamp}}` - Current Unix timestamp
- `{{$randomId}}` - Random UUID

## Error Handling

**Spec Loading:**
- Invalid URL → "Could not fetch spec. Check the URL."
- Invalid JSON → "Not valid JSON. Expected OpenAPI/Swagger format."
- Invalid OpenAPI → "Could not parse spec. Ensure it's OpenAPI 2.0 or 3.x."
- CORS blocked → "Request blocked by CORS. Run on whitelisted port."

**Requests:**
- Network failure → "Network error - could not reach server"
- Timeout (>30s) → "Request timed out after 30 seconds"
- Non-JSON response → Auto-select "Raw" tab

**UI Resilience:**
- Missing required param → Red highlight, disable Send
- Undefined env var → Show in red with tooltip
- Large response → Virtualized JSON tree

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.svelte
│   │   │   ├── ThreePanel.svelte
│   │   │   └── StatusBar.svelte
│   │   ├── endpoints/
│   │   │   ├── EndpointList.svelte
│   │   │   ├── EndpointGroup.svelte
│   │   │   └── EndpointItem.svelte
│   │   ├── request/
│   │   │   ├── RequestBuilder.svelte
│   │   │   ├── ParamInput.svelte
│   │   │   ├── BodyEditor.svelte
│   │   │   └── HeadersEditor.svelte
│   │   ├── response/
│   │   │   ├── ResponsePanel.svelte
│   │   │   ├── JsonViewer.svelte
│   │   │   └── HeadersView.svelte
│   │   └── modals/
│   │       ├── AuthConfig.svelte
│   │       └── EnvManager.svelte
│   ├── stores/
│   │   ├── spec.ts
│   │   ├── env.ts
│   │   ├── auth.ts
│   │   ├── request.ts
│   │   └── response.ts
│   ├── utils/
│   │   ├── parser.ts        # OpenAPI parsing
│   │   ├── interpolate.ts   # env var replacement
│   │   └── storage.ts       # localStorage helpers
│   └── types/
│       └── index.ts         # TypeScript interfaces
├── routes/
│   └── +page.svelte         # single page app
├── app.html
└── app.css                  # Tailwind imports
```

## Dependencies

- `@apidevtools/swagger-parser` - Parse and validate OpenAPI specs
- `tailwindcss` - Styling
- JSON viewer component (svelte-json-tree or custom)

## Out of Scope (MVP)

- Collections/saved requests
- OAuth2 authentication flows
- Backend/proxy server
- Team sync/collaboration
- Desktop app (Electron/Tauri)
- Browser extension
