<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Swagger on Steroids</title>
	<meta name="description" content="A modern, three-panel API client that loads from OpenAPI specs" />
</svelte:head>

{@render children()}
