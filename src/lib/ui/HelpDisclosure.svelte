<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Accessible name for the trigger button (e.g. "Show the trump ranking"). */
		label: string;
		/** Visible trigger text. Defaults to a "?" help affordance. */
		triggerText?: string;
		/** Which edge of the trigger the popover aligns to (avoids viewport clipping). */
		align?: 'start' | 'end';
		/** The popover body. */
		children: Snippet;
	}

	let { label, triggerText = '?', align = 'start', children }: Props = $props();

	const uid = $props.id();
	let open = $state(false);
	let root: HTMLElement;
	let trigger: HTMLButtonElement;

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	/** Esc closes and restores focus to the trigger (keyboard users don't get stranded). */
	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			trigger?.focus();
		}
	}

	/** A tap/click outside the disclosure closes it. Attached only while open. */
	function onWindowPointerDown(e: Event) {
		if (root && !root.contains(e.target as Node)) open = false;
	}

	$effect(() => {
		if (!open) return;
		window.addEventListener('pointerdown', onWindowPointerDown, true);
		window.addEventListener('keydown', onWindowKeydown);
		return () => {
			window.removeEventListener('pointerdown', onWindowPointerDown, true);
			window.removeEventListener('keydown', onWindowKeydown);
		};
	});
</script>

<span class="disclosure" class:align-end={align === 'end'} bind:this={root}>
	<button
		type="button"
		class="trigger"
		bind:this={trigger}
		onclick={toggle}
		aria-expanded={open}
		aria-controls="help-{uid}"
		aria-label={label}
	>
		{triggerText}
	</button>
	{#if open}
		<div class="popover" id="help-{uid}" role="group" aria-label={label}>
			<button type="button" class="close" onclick={close} aria-label="Close">×</button>
			<div class="popover-body">
				{@render children()}
			</div>
		</div>
	{/if}
</span>

<style>
	.disclosure {
		position: relative;
		display: inline-flex;
	}

	/* A quiet help affordance modelled on the app's .small-button (transparent
	   fill, hairline rule) but in accent-deep ink so it reads as "help/link". */
	.trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 48px;
		min-height: 48px;
		padding: 0 0.7rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--accent-deep);
		background: transparent;
		border: 1px solid var(--muted);
		border-radius: 6px;
		cursor: pointer;
	}

	.trigger:hover {
		border-color: var(--accent);
		color: var(--accent-deep);
	}

	.trigger[aria-expanded='true'] {
		border-color: var(--accent);
		background: var(--panel);
	}

	.trigger:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	/* Echoes the app's .panel: cream paper, hairline rule, and the signature
	   terracotta accent edge — so the popover reads as part of the same surface
	   family rather than a stray box. Floats, so the shadow is a touch deeper. */
	.popover {
		position: absolute;
		top: calc(100% + 0.55rem);
		left: 0;
		z-index: 20;
		width: min(22rem, 85vw);
		padding: 0.9rem 1rem 1rem;
		text-align: left;
		background: var(--panel);
		color: var(--ink);
		border: 1px solid var(--rule);
		border-left: 4px solid var(--accent);
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(61, 58, 53, 0.18);
	}

	/* A small caret bridges the gap to the trigger so the popover feels anchored
	   to it. Built from a rotated square showing two hairline edges. */
	.popover::before {
		content: '';
		position: absolute;
		top: -7px;
		left: 16px;
		width: 12px;
		height: 12px;
		background: var(--panel);
		border-top: 1px solid var(--rule);
		border-left: 1px solid var(--rule);
		transform: rotate(45deg);
	}

	/* Right-anchor so a trigger near the viewport's right edge doesn't clip. */
	.align-end .popover {
		left: auto;
		right: 0;
	}

	.align-end .popover::before {
		left: auto;
		right: 16px;
	}

	.close {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		min-width: 40px;
		min-height: 40px;
		font-size: 1.4rem;
		line-height: 1;
		color: var(--muted);
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.close:hover {
		color: var(--ink);
	}

	.close:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	.popover-body {
		font-size: 1rem;
		font-weight: 400;
		line-height: 1.5;
	}
</style>
