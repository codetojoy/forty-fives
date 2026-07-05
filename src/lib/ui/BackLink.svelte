<!-- The top-of-page "← Back to …" / "← Home" nav link every subpage carries,
     shared per TODO-045 so the call sites don't each copy the tap-target and
     focus-ring CSS. -->
<script lang="ts">
	interface Props {
		/** Destination, already prefixed with `base`. */
		href: string;
		/** Link text without the arrow (e.g. "Home", "Back to Play"). */
		label: string;
	}

	let { href, label }: Props = $props();
</script>

<nav class="top-nav">
	<a class="home-link" {href}>← {label}</a>
</nav>

<style>
	.top-nav {
		margin-bottom: 0.5rem;
	}

	.home-link {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 0.5rem;
		color: var(--accent-deep);
		font-size: 1.05rem;
		font-weight: 700;
		text-decoration: none;
	}

	.home-link:hover,
	.home-link:focus-visible {
		text-decoration: underline;
	}

	.home-link:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
		border-radius: 8px;
	}
</style>
