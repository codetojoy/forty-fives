<!-- Two-tap confirm for destructive actions (TODO-040, shared per TODO-044): the
     first tap arms the button ("Tap again"), the second fires onconfirm. While
     armed, the full warning sentence becomes the accessible name. Pages that
     should cancel a pending confirmation when an unrelated action intervenes
     call disarm() via bind:this. -->
<script lang="ts">
	interface Props {
		/** Idle button text (e.g. "Abandon game"). */
		label: string;
		/** The full warning sentence; the accessible name while armed. */
		armedLabel: string;
		/** Visual weight: 'small' matches the game footers, 'big' the stats pages. */
		variant?: 'small' | 'big';
		/** Called on the confirming second tap. */
		onconfirm: () => void;
	}

	let { label, armedLabel, variant = 'small', onconfirm }: Props = $props();

	let armed = $state(false);

	/** Cancel a pending confirmation. */
	export function disarm() {
		armed = false;
	}

	function tap() {
		if (!armed) {
			armed = true;
			return;
		}
		armed = false;
		onconfirm();
	}
</script>

<button type="button" class={variant} onclick={tap} aria-label={armed ? armedLabel : undefined}>
	{armed ? 'Tap again' : label}
</button>

<style>
	button {
		border-radius: 6px;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	/* The game footers' quiet .small-button recipe. */
	.small {
		min-height: 48px;
		padding: 0.5rem 1rem;
		font-size: 1rem;
		border: 1px solid var(--muted);
		background: transparent;
		color: var(--ink);
	}

	.small:hover {
		border-color: var(--accent);
		color: var(--accent-deep);
	}

	/* The stats pages' .big-button recipe. */
	.big {
		min-height: 56px;
		padding: 0.75rem 2rem;
		font-size: 1.2rem;
		font-weight: 700;
		border: 1px solid var(--rule);
		background: var(--panel);
		color: var(--ink);
		box-shadow: 0 1px 3px rgba(61, 58, 53, 0.08);
	}

	.big:hover {
		border-color: var(--accent);
	}
</style>
