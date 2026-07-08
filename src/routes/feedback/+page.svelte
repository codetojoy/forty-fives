<script lang="ts">
	import { base } from '$app/paths';

	// Placeholder Feedback page (TODO-054). Privacy-first (SPEC §3): no in-app
	// form (that would be a network call / data collection). Feedback leaves the
	// app via mailto: or GitHub issues. Final copy comes in a follow-up.
	const email = 'codetojoy@gmail.com';
	const issuesUrl = 'https://github.com/codetojoy/forty-fives/issues';
</script>

<svelte:head>
	<title>Feedback — Forty-Fives</title>
	<meta name="description" content="Send feedback about the Forty-Fives app." />
</svelte:head>

<main>
	<header>
		<h1>Feedback</h1>
		<p class="subtitle">Tell us what you think</p>
	</header>

	<p class="placeholder-note">
		Found a bug, or have a suggestion? We'd love to hear from you. This page is a
		placeholder — the wording will be filled in soon — but these links already
		work:
	</p>

	<div class="channels">
		<a class="channel-link" href="mailto:{email}?subject=Forty-Fives%20feedback">
			Email us →
		</a>
		<a
			class="channel-link"
			href={issuesUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			Open an issue on GitHub →
		</a>
	</div>

	<p class="note"><a href="{base}/">← Home</a></p>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 2rem 1rem 3rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1.25rem;
		border-bottom: 2px solid var(--accent);
	}

	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 2.6rem;
		margin: 0;
		color: var(--accent);
	}

	.subtitle {
		margin: 0.4rem 0 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 1.15rem;
		color: var(--muted);
	}

	.placeholder-note {
		font-size: 1.05rem;
		line-height: 1.5;
		color: var(--muted);
	}

	.channels {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1.5rem;
		align-items: center;
	}

	.channel-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
		padding: 0 1rem;
		color: var(--accent);
		font-weight: 700;
		text-decoration: none;
	}

	.channel-link:hover,
	.channel-link:focus-visible {
		text-decoration: underline;
	}

	.channel-link:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
		border-radius: 8px;
	}

	.note {
		margin-top: 2.5rem;
		text-align: center;
	}

	.note a {
		color: var(--accent);
		font-weight: 600;
	}
</style>
