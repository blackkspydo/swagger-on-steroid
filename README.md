# Swagger on Steroids

A modern, feature-rich API client for testing OpenAPI/Swagger APIs. Built with SvelteKit and designed for developers who want a fast, keyboard-friendly alternative to Postman.

## Features

### OpenAPI Integration
- Load OpenAPI 3.x specs from URL or paste JSON directly
- Automatic endpoint parsing with path/query parameters
- Request body schema detection
- Tag-based endpoint grouping with collapsible sections

### Request Builder
- Auto-populated parameters from spec with type hints
- Required field indicators
- JSON body editor with syntax highlighting
- Custom headers editor
- Request body persistence per endpoint

### Environment Variables
- Create and manage environment variables
- Variable autocomplete with `{{` trigger
- **Built-in dynamic variables:**
  - `{{$timestamp}}` - Unix timestamp in milliseconds
  - `{{$isoTimestamp}}` - ISO 8601 timestamp
  - `{{$date}}` - Today's date (YYYY-MM-DD)
  - `{{$randomInt}}` - Random integer (0-1000)
  - `{{$randomUUID}}` - Random UUID v4
  - `{{$randomString}}` - Random 8-char alphanumeric
  - `{{$randomEmail}}` - Random email address
  - `{{$randomBoolean}}` - Random true/false

### Authentication
- Bearer token authentication
- API Key authentication (header or query parameter)
- Persistent auth configuration

### Response Viewer
- Formatted JSON with collapsible tree view
- Response headers display
- Raw response view
- Status code and timing display
- HTML response detection and rendering

### Multiple Base URLs
- Configure multiple environments (dev, staging, prod)
- Color-coded URL labels for visual distinction
- Quick switching between environments

### UI/UX
- Three-panel resizable layout
- Keyboard-friendly navigation
- Persistent accordion states
- Save and load API specs
- Dark theme optimized for developers

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/swagger-on-steroid.git
cd swagger-on-steroid

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview
```

## Usage

1. **Load an API spec** - Enter an OpenAPI spec URL in the header or use the dropdown to paste JSON
2. **Select an endpoint** - Browse endpoints in the left panel, grouped by tags
3. **Configure request** - Fill in parameters, headers, and body as needed
4. **Use variables** - Type `{{` to autocomplete environment or built-in variables
5. **Send request** - Click Send or use keyboard shortcut
6. **View response** - Inspect the response in the right panel

## Tech Stack

- **Framework:** SvelteKit
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Build:** Vite
- **Deployment:** Static adapter (works with any static host)

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── endpoints/    # Endpoint navigation
│   │   ├── layout/       # Header, panels, status bar
│   │   ├── modals/       # Auth, env, base URL config
│   │   ├── request/      # Request builder components
│   │   ├── response/     # Response viewer components
│   │   └── shared/       # Reusable components
│   ├── stores/           # Svelte stores for state
│   ├── types/            # TypeScript definitions
│   └── utils/            # Parsers, interpolation, storage
└── routes/               # SvelteKit routes
```

## License

MIT
