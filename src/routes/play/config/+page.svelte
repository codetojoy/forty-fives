<script lang="ts">
	import { base } from '$app/paths';
	import { loadGame, saveGame, type GameSettings } from '$lib/ui/persistence.js';

	// Forty-Fives (1v1) has no rules profiles — only the display & interaction
	// preferences, which live in the game save alongside any in-progress game
	// (TODO-027). This mirrors the same section on /auction/config.
	const savedGame = loadGame();
	let prefs = $state<GameSettings>({ ...savedGame.settings });
	// A snapshot of what's in storage, to detect unsaved changes.
	let saved = $state<GameSettings>({ ...savedGame.settings });

	const dirty = $derived(
		prefs.highlightLegal !== saved.highlightLegal || prefs.confirmPlay !== saved.confirmPlay
	);

	function save() {
		// Persist the prefs back into the game save, preserving any in-progress game.
		saveGame({ ...savedGame, settings: { ...prefs } });
		saved = { ...prefs };
	}
</script>

<svelte:head>
	<title>Play Settings — Forty-Fives</title>
	<meta name="description" content="Display and interaction preferences for Forty-Fives." />
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="{base}/play">← Back to Play</a>
	</nav>

	<header>
		<h1>Play Settings</h1>
		<p class="subtitle">
			Display &amp; interaction preferences for Forty-Fives. Always editable. Save to apply.
		</p>
	</header>

	<form onsubmit={(e) => { e.preventDefault(); save(); }}>
		<fieldset class="settings prefs">
			<legend>Display &amp; interaction — always editable</legend>
			<p class="prefs-note">
				Personal preferences for how the game looks and plays. Always editable; saved with
				the button below.
			</p>
			<div class="setting">
				<span class="setting-desc">Highlight legal cards</span>
				<label class="toggle">
					<input
						type="checkbox"
						aria-label="Highlight legal cards"
						bind:checked={prefs.highlightLegal}
					/>
					<span class="toggle-value">{prefs.highlightLegal ? 'On' : 'Off'}</span>
				</label>
			</div>
			<div class="setting">
				<span class="setting-desc">Confirm before playing</span>
				<label class="toggle">
					<input
						type="checkbox"
						aria-label="Confirm before playing"
						bind:checked={prefs.confirmPlay}
					/>
					<span class="toggle-value">{prefs.confirmPlay ? 'On' : 'Off'}</span>
				</label>
			</div>
		</fieldset>

		<div class="actions">
			<button type="submit" class="big-button" disabled={!dirty}>Save</button>
			<span class="save-state" class:dirty aria-live="polite">
				{dirty ? 'Unsaved changes' : 'Saved'}
			</span>
		</div>
	</form>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem 1rem 3rem;
	}

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

	header {
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--accent);
	}

	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.8rem;
		margin: 0;
		color: var(--accent);
	}

	.subtitle {
		margin: 0.25rem 0 0;
		font-family: var(--serif);
		font-style: italic;
		color: var(--muted);
	}

	fieldset {
		border: 1px solid var(--rule);
		border-radius: 6px;
		margin: 0 0 1.25rem;
		padding: 0.75rem 1rem 1rem;
		background: var(--panel);
	}

	legend {
		padding: 0 0.5rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.9rem;
		color: var(--accent-deep);
	}

	.prefs-note {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
		color: var(--muted);
	}

	.setting {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 56px;
		padding: 0.5rem 0;
	}

	.setting + .setting {
		border-top: 1px solid var(--rule);
	}

	.setting-desc {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
	}

	.toggle input {
		width: 28px;
		height: 28px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.toggle input:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	.big-button {
		min-height: 56px;
		padding: 0.75rem 2rem;
		font-size: 1.2rem;
		font-weight: 700;
		border: 1px solid var(--rule);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(61, 58, 53, 0.08);
	}

	.big-button:hover {
		border-color: var(--accent);
	}

	.big-button:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	.big-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.save-state {
		font-size: 1rem;
		font-style: italic;
		color: var(--muted);
	}

	.save-state.dirty {
		color: var(--accent-deep);
		font-style: normal;
		font-weight: 700;
	}
</style>
