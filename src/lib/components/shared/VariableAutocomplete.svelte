<script lang="ts">
	import { activeEnvVariables, builtInVariables } from '$lib/stores/env';

	interface Props {
		value: string;
		onChange: (value: string) => void;
		placeholder?: string;
		inputClass?: string;
		type?: 'input' | 'textarea';
		rows?: number;
	}

	let {
		value,
		onChange,
		placeholder = '',
		inputClass = '',
		type = 'input',
		rows = 4
	}: Props = $props();

	let inputEl: HTMLInputElement | HTMLTextAreaElement | null = $state(null);
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

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
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
		if (triggerPosition === null || !inputEl) return;

		const cursorPos = inputEl.selectionStart || 0;
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
			if (inputEl) {
				inputEl.focus();
				inputEl.setSelectionRange(newCursorPos, newCursorPos);
			}
		});
	}

	function closeDropdown() {
		showDropdown = false;
		triggerPosition = null;
		searchText = '';
		selectedIndex = 0;
	}

	function updateDropdownPosition(target: HTMLInputElement | HTMLTextAreaElement, cursorPos: number) {
		// Get cursor position in the input
		const rect = target.getBoundingClientRect();

		if (type === 'textarea') {
			// For textarea, approximate position based on text
			const textBeforeCursor = value.substring(0, cursorPos);
			const lines = textBeforeCursor.split('\n');
			const currentLine = lines.length - 1;
			const lineHeight = 20; // approximate

			dropdownPosition = {
				top: rect.top + (currentLine + 1) * lineHeight + window.scrollY,
				left: rect.left + 10
			};
		} else {
			// For input, position below the input
			dropdownPosition = {
				top: rect.bottom + window.scrollY + 4,
				left: rect.left
			};
		}
	}

	function handleBlur() {
		// Delay to allow click on dropdown
		setTimeout(() => {
			closeDropdown();
		}, 200);
	}

	// Handle click outside
	function handleDropdownMouseDown(e: MouseEvent) {
		e.preventDefault(); // Prevent blur
	}
</script>

<div class="relative w-full">
	{#if type === 'textarea'}
		<textarea
			bind:this={inputEl}
			class={inputClass}
			{placeholder}
			{rows}
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
		></textarea>
	{:else}
		<input
			bind:this={inputEl}
			type="text"
			class={inputClass}
			{placeholder}
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
		/>
	{/if}

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
</div>
