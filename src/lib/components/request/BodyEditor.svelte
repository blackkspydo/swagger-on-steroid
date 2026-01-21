<script lang="ts">
	// Body editor component with JSON syntax highlighting
	import { activeEnvVariables, builtInVariables } from '$lib/stores/env';

	interface Props {
		value: string;
		onChange: (value: string) => void;
		contentType?: string;
		placeholder?: string;
	}

	let {
		value,
		onChange,
		contentType = 'application/json',
		placeholder = '{\n  "key": "value"\n}'
	}: Props = $props();

	let textareaEl: HTMLTextAreaElement | null = $state(null);
	let preEl: HTMLPreElement | null = $state(null);

	// Variable autocomplete state
	let showDropdown = $state(false);
	let dropdownPosition = $state({ top: 0, left: 0 });
	let selectedIndex = $state(0);
	let searchText = $state('');
	let triggerPosition = $state<number | null>(null);

	// Get environment variables
	let envVars = $state<Record<string, string>>({});
	$effect(() => {
		const unsub = activeEnvVariables.subscribe(vars => {
			envVars = vars;
		});
		return unsub;
	});

	// Combined list of variables (user + built-in)
	interface VariableEntry {
		key: string;
		value: string;
		isBuiltIn: boolean;
		description?: string;
	}

	const allVariables = $derived((): VariableEntry[] => {
		const userVars: VariableEntry[] = Object.entries(envVars).map(([key, value]) => ({
			key,
			value,
			isBuiltIn: false
		}));

		const builtIns: VariableEntry[] = builtInVariables.map(v => ({
			key: v.key,
			value: v.generate(),
			isBuiltIn: true,
			description: v.description
		}));

		return [...userVars, ...builtIns];
	});

	// Filter variables based on search text
	const filteredVars = $derived(() => {
		const vars = allVariables();
		if (!searchText) return vars;
		const search = searchText.toLowerCase();
		return vars.filter(v => v.key.toLowerCase().includes(search));
	});

	// Split filtered vars into user and built-in for the dropdown
	const userVarsFiltered = $derived(() => filteredVars().filter(v => !v.isBuiltIn));
	const builtInsFiltered = $derived(() => filteredVars().filter(v => v.isBuiltIn));

	// Sync scroll between textarea and pre
	function handleScroll() {
		if (textareaEl && preEl) {
			preEl.scrollTop = textareaEl.scrollTop;
			preEl.scrollLeft = textareaEl.scrollLeft;
		}
	}

	// Try to format JSON on blur
	function handleBlur() {
		if (contentType.includes('json') && value.trim()) {
			try {
				const parsed = JSON.parse(value);
				onChange(JSON.stringify(parsed, null, 2));
			} catch {
				// Invalid JSON, leave as-is
			}
		}
		// Delay to allow click on dropdown
		setTimeout(() => {
			closeDropdown();
		}, 200);
	}

	// Handle input for variable autocomplete
	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const newValue = target.value;
		const cursorPos = target.selectionStart || 0;

		// Check if user just typed {{
		const textBeforeCursor = newValue.substring(0, cursorPos);
		const lastTwoChars = textBeforeCursor.slice(-2);

		if (lastTwoChars === '{{') {
			// Find position of the opening {{
			triggerPosition = cursorPos - 2;
			searchText = '';
			selectedIndex = 0;
			showDropdown = true;
			updateDropdownPosition(target, cursorPos);
		} else if (showDropdown && triggerPosition !== null) {
			// User is typing the variable name
			const textAfterTrigger = newValue.substring(triggerPosition + 2, cursorPos);

			// Check if user typed }} or moved cursor outside
			if (textAfterTrigger.includes('}}') || cursorPos <= triggerPosition) {
				closeDropdown();
			} else {
				searchText = textAfterTrigger;
				selectedIndex = 0;
			}
		}

		onChange(newValue);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showDropdown) return;

		const vars = filteredVars();

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, vars.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				if (vars.length > 0) {
					e.preventDefault();
					selectVariable(vars[selectedIndex].key);
				}
				break;
			case 'Tab':
				if (vars.length > 0) {
					e.preventDefault();
					selectVariable(vars[selectedIndex].key);
				}
				break;
			case 'Escape':
				e.preventDefault();
				closeDropdown();
				break;
		}
	}

	function selectVariable(varName: string) {
		if (triggerPosition === null || !textareaEl) return;

		const cursorPos = textareaEl.selectionStart || 0;
		const beforeTrigger = value.substring(0, triggerPosition);
		const afterCursor = value.substring(cursorPos);

		// Insert {{varName}}
		const newValue = beforeTrigger + '{{' + varName + '}}' + afterCursor;
		onChange(newValue);

		// Set cursor position after the inserted variable
		const newCursorPos = triggerPosition + varName.length + 4; // +4 for {{ and }}

		closeDropdown();

		// Focus and set cursor position
		requestAnimationFrame(() => {
			if (textareaEl) {
				textareaEl.focus();
				textareaEl.setSelectionRange(newCursorPos, newCursorPos);
			}
		});
	}

	function closeDropdown() {
		showDropdown = false;
		triggerPosition = null;
		searchText = '';
		selectedIndex = 0;
	}

	function updateDropdownPosition(target: HTMLTextAreaElement, cursorPos: number) {
		const rect = target.getBoundingClientRect();
		const textBeforeCursor = value.substring(0, cursorPos);
		const lines = textBeforeCursor.split('\n');
		const currentLine = lines.length - 1;
		const lineHeight = 20; // approximate

		dropdownPosition = {
			top: rect.top + Math.min((currentLine + 1) * lineHeight, rect.height - 50) + window.scrollY,
			left: rect.left + 10
		};
	}

	function handleDropdownMouseDown(e: MouseEvent) {
		e.preventDefault(); // Prevent blur
	}

	// Highlight variables in text
	function highlightVariables(code: string): string {
		return code.replace(/\{\{([^}]+)\}\}/g, '<span class="variable-highlight">$&</span>');
	}

	// Simple JSON syntax highlighter
	function highlightJson(code: string): string {
		if (!code) return '';

		// Escape HTML
		let escaped = code
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Highlight JSON tokens first
		escaped = escaped
			// Strings (keys and values)
			.replace(/"([^"\\]|\\.)*"/g, (match) => {
				return `<span class="json-string">${match}</span>`;
			})
			// Numbers
			.replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="json-number">$1</span>')
			// Booleans
			.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
			// Null
			.replace(/\bnull\b/g, '<span class="json-null">null</span>')
			// Braces and brackets
			.replace(/([{}\[\]])/g, '<span class="json-brace">$1</span>')
			// Colons and commas
			.replace(/([,:])/g, '<span class="json-punctuation">$1</span>');

		// Highlight variables last (so they work inside strings too)
		escaped = highlightVariables(escaped);

		return escaped;
	}

	// Get highlighted HTML
	const highlightedCode = $derived(() => {
		if (contentType.includes('json')) {
			return highlightJson(value || '');
		}
		// For non-JSON, escape HTML and highlight variables
		let escaped = (value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		return highlightVariables(escaped);
	});

</script>

<style>
	.editor-container {
		position: relative;
	}

	.editor-textarea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		color: transparent;
		caret-color: white;
		resize: none;
		z-index: 1;
	}

	.editor-textarea::selection {
		background: rgba(59, 130, 246, 0.5);
	}

	.editor-pre {
		margin: 0;
		overflow: auto;
		white-space: pre-wrap;
		word-wrap: break-word;
		pointer-events: none;
	}

	/* JSON syntax colors */
	:global(.json-string) {
		color: #a5d6ff;
	}
	:global(.json-number) {
		color: #79c0ff;
	}
	:global(.json-boolean) {
		color: #ff7b72;
	}
	:global(.json-null) {
		color: #ff7b72;
	}
	:global(.json-brace) {
		color: #ffa657;
	}
	:global(.json-punctuation) {
		color: #8b949e;
	}

	/* Variable highlighting */
	:global(.variable-highlight) {
		color: #c9a0ff;
		background: rgba(139, 92, 246, 0.15);
		border-radius: 2px;
		padding: 0 2px;
	}
</style>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-300">Request Body</h3>
		<span class="text-xs text-gray-500">{contentType}</span>
	</div>

	<div class="editor-container h-48 bg-gray-800 border border-gray-600 rounded overflow-hidden focus-within:border-blue-500">
		<!-- Highlighted code layer -->
		<pre
			bind:this={preEl}
			class="editor-pre w-full h-full px-3 py-2 text-sm font-mono text-gray-100"
		>{#if value}{@html highlightedCode()}{:else}<span class="text-gray-500">{placeholder}</span>{/if}</pre>

		<!-- Editable textarea layer -->
		<textarea
			bind:this={textareaEl}
			class="editor-textarea px-3 py-2 text-sm font-mono focus:outline-none"
			{value}
			oninput={handleInput}
			onscroll={handleScroll}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			spellcheck="false"
		></textarea>
	</div>

	<!-- Variable autocomplete dropdown -->
	{#if showDropdown && filteredVars().length > 0}
		<div
			class="fixed bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto min-w-[280px]"
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
			onmousedown={handleDropdownMouseDown}
		>
			<!-- User variables section -->
			{#if userVarsFiltered().length > 0}
				<div class="px-2 py-1.5 text-xs text-gray-400 border-b border-gray-700 bg-gray-800 sticky top-0">
					Environment Variables
				</div>
				{#each userVarsFiltered() as varEntry, i}
					{@const globalIndex = filteredVars().indexOf(varEntry)}
					<button
						class="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 flex items-center justify-between gap-4 transition-colors"
						class:bg-blue-600={globalIndex === selectedIndex}
						class:hover:bg-blue-600={globalIndex === selectedIndex}
						onclick={() => selectVariable(varEntry.key)}
					>
						<span class="font-mono text-blue-300">{`{{${varEntry.key}}}`}</span>
						<span class="text-xs text-gray-400 truncate max-w-[120px]" title={varEntry.value}>
							{varEntry.value || '(empty)'}
						</span>
					</button>
				{/each}
			{/if}

			{#if builtInsFiltered().length > 0}
				<div class="px-2 py-1.5 text-xs text-gray-400 border-b border-gray-700 bg-gray-800 sticky top-0" class:border-t={userVarsFiltered().length > 0}>
					Built-in Variables
				</div>
				{#each builtInsFiltered() as varEntry, i}
					{@const globalIndex = filteredVars().indexOf(varEntry)}
					<button
						class="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 flex items-start gap-3 transition-colors"
						class:bg-blue-600={globalIndex === selectedIndex}
						class:hover:bg-blue-600={globalIndex === selectedIndex}
						onclick={() => selectVariable(varEntry.key)}
					>
						<div class="flex-1 min-w-0">
							<div class="font-mono text-purple-300">{`{{${varEntry.key}}}`}</div>
							<div class="text-xs text-gray-500 truncate">{varEntry.description}</div>
						</div>
						<span class="text-xs text-gray-400 font-mono shrink-0">
							{varEntry.value.length > 15 ? varEntry.value.substring(0, 15) + '...' : varEntry.value}
						</span>
					</button>
				{/each}
			{/if}
		</div>
	{/if}

	{#if showDropdown && filteredVars().length === 0}
		<div
			class="fixed bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-[100] min-w-[200px]"
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
		>
			<div class="px-3 py-3 text-sm text-gray-400 text-center">
				No matching variables
			</div>
		</div>
	{/if}

	<!-- JSON validation indicator -->
	{#if contentType.includes('json') && value.trim()}
		{@const isValidJson = (() => {
			try {
				JSON.parse(value);
				return true;
			} catch {
				return false;
			}
		})()}
		<div class="text-xs" class:text-green-400={isValidJson} class:text-red-400={!isValidJson}>
			{isValidJson ? 'Valid JSON' : 'Invalid JSON'}
		</div>
	{/if}
</div>
