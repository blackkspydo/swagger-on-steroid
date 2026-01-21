<script lang="ts">
	// Three-panel layout component with resizable panels
	import type { Snippet } from 'svelte';

	interface Props {
		leftPanel: Snippet;
		middlePanel: Snippet;
		rightPanel: Snippet;
		leftWidth?: number;
		rightWidth?: number;
	}

	let {
		leftPanel,
		middlePanel,
		rightPanel,
		leftWidth = 280,
		rightWidth = 400
	}: Props = $props();

	// Panel widths
	let leftPanelWidth = $state(leftWidth);
	let rightPanelWidth = $state(rightWidth);

	// Drag state
	let isDraggingLeft = $state(false);
	let isDraggingRight = $state(false);
	let containerEl: HTMLDivElement | null = $state(null);

	// Min/max constraints
	const MIN_LEFT = 200;
	const MAX_LEFT = 500;
	const MIN_RIGHT = 300;
	const MAX_RIGHT = 700;
	const MIN_MIDDLE = 300;

	function startDragLeft(e: MouseEvent) {
		e.preventDefault();
		isDraggingLeft = true;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function startDragRight(e: MouseEvent) {
		e.preventDefault();
		isDraggingRight = true;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function handleMouseMove(e: MouseEvent) {
		if (!containerEl) return;

		const containerRect = containerEl.getBoundingClientRect();
		const containerWidth = containerRect.width;

		if (isDraggingLeft) {
			const newLeftWidth = e.clientX - containerRect.left;
			const maxAllowed = Math.min(MAX_LEFT, containerWidth - rightPanelWidth - MIN_MIDDLE - 8);
			leftPanelWidth = Math.max(MIN_LEFT, Math.min(newLeftWidth, maxAllowed));
		}

		if (isDraggingRight) {
			const newRightWidth = containerRect.right - e.clientX;
			const maxAllowed = Math.min(MAX_RIGHT, containerWidth - leftPanelWidth - MIN_MIDDLE - 8);
			rightPanelWidth = Math.max(MIN_RIGHT, Math.min(newRightWidth, maxAllowed));
		}
	}

	function handleMouseUp() {
		if (isDraggingLeft || isDraggingRight) {
			isDraggingLeft = false;
			isDraggingRight = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
	}

	// Global mouse events for drag
	$effect(() => {
		if (isDraggingLeft || isDraggingRight) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			};
		}
	});
</script>

<div class="flex-1 flex overflow-hidden" bind:this={containerEl}>
	<!-- Left Panel: Endpoints List -->
	<aside
		class="bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden shrink-0"
		style="width: {leftPanelWidth}px"
	>
		{@render leftPanel()}
	</aside>

	<!-- Left Resize Handle -->
	<div
		class="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize shrink-0 transition-colors"
		class:bg-blue-500={isDraggingLeft}
		onmousedown={startDragLeft}
		role="separator"
		aria-orientation="vertical"
		tabindex="0"
	></div>

	<!-- Middle Panel: Request Builder -->
	<main class="flex-1 bg-gray-900 flex flex-col overflow-hidden min-w-0">
		{@render middlePanel()}
	</main>

	<!-- Right Resize Handle -->
	<div
		class="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize shrink-0 transition-colors"
		class:bg-blue-500={isDraggingRight}
		onmousedown={startDragRight}
		role="separator"
		aria-orientation="vertical"
		tabindex="0"
	></div>

	<!-- Right Panel: Response Viewer -->
	<aside
		class="bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden shrink-0"
		style="width: {rightPanelWidth}px"
	>
		{@render rightPanel()}
	</aside>
</div>

<!-- Overlay to capture mouse events during drag -->
{#if isDraggingLeft || isDraggingRight}
	<div class="fixed inset-0 z-50 cursor-col-resize"></div>
{/if}
