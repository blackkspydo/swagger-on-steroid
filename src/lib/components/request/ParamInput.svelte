<script lang="ts">
	// Parameter input component for path/query params
	import type { ParsedParameter } from '$lib/types';
	import VariableAutocomplete from '$lib/components/shared/VariableAutocomplete.svelte';

	interface Props {
		param: ParsedParameter;
		value: string;
		onChange: (value: string) => void;
	}

	let { param, value, onChange }: Props = $props();

	const hasError = $derived(param.required && !value);

	const inputClass = $derived(() => {
		const base = 'w-full bg-gray-800 border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500';
		return hasError ? `${base} border-red-500` : `${base} border-gray-600`;
	});
</script>

<div class="flex items-start gap-2">
	<label class="text-sm text-gray-400 w-28 shrink-0 pt-1.5">
		{param.name}
		{#if param.required}
			<span class="text-red-400">*</span>
		{/if}
	</label>

	<div class="flex-1">
		{#if param.enum && param.enum.length > 0}
			<!-- Select for enum values -->
			<select
				class="w-full bg-gray-800 border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
				class:border-gray-600={!hasError}
				class:border-red-500={hasError}
				{value}
				onchange={(e) => onChange((e.target as HTMLSelectElement).value)}
			>
				<option value="">Select...</option>
				{#each param.enum as option}
					<option value={String(option)}>{String(option)}</option>
				{/each}
			</select>
		{:else}
			<!-- Text input with variable autocomplete -->
			<VariableAutocomplete
				{value}
				{onChange}
				placeholder={param.example ? String(param.example) : param.type}
				inputClass={inputClass()}
			/>
		{/if}

		{#if param.description}
			<p class="text-xs text-gray-500 mt-1">{param.description}</p>
		{/if}
	</div>
</div>
