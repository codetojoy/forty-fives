<script lang="ts">
	import { base } from '$app/paths';
	import {
		SETTINGS,
		PROFILE_IDS,
		BUILTIN_PROFILES,
		isCustom,
		type AuctionProfileId,
		type AuctionSettingCode,
		type AuctionSettingValues
	} from '$lib/domain/auction-config.js';
	import { loadAuctionConfig, saveAuctionConfig } from '$lib/ui/persistence.js';

	const initial = loadAuctionConfig();
	let profile = $state<AuctionProfileId>(initial.profile);
	let custom = $state<AuctionSettingValues>({ ...initial.custom });
	// A snapshot of what's in storage, to detect unsaved changes.
	let saved = $state({ profile: initial.profile, custom: { ...initial.custom } });

	/** The values to show: a built-in preset, or the editable Custom values. */
	const displayed = $derived<AuctionSettingValues>(
		isCustom(profile) ? custom : BUILTIN_PROFILES[profile]
	);

	const dirty = $derived(
		profile !== saved.profile || SETTINGS.some((s) => custom[s.code] !== saved.custom[s.code])
	);

	function selectProfile(next: AuctionProfileId) {
		// Seed Custom from whichever profile is currently shown, so the user tweaks
		// from a sensible base rather than starting blank.
		if (isCustom(next) && !isCustom(profile)) {
			custom = { ...displayed };
		}
		profile = next;
	}

	function toggle(code: AuctionSettingCode) {
		if (!isCustom(profile)) return;
		custom = { ...custom, [code]: !custom[code] };
	}

	function save() {
		const next = { profile, custom: { ...custom } };
		saveAuctionConfig(next);
		saved = { profile: next.profile, custom: { ...next.custom } };
	}

	// Only Custom carries a blurb; the built-in presets are self-explanatory and
	// their values show in the settings section below.
	function profileBlurb(id: AuctionProfileId): string {
		return isCustom(id) ? 'Choose your own settings.' : '';
	}
</script>

<svelte:head>
	<title>Auction Settings — Forty-Fives</title>
	<meta name="description" content="Choose the rules profile for Auction Forty-Fives." />
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="{base}/auction">← Back to Auction</a>
	</nav>

	<header>
		<h1>Auction Settings</h1>
		<p class="subtitle">
			Pick a rules profile to specify settings below. These don't change play yet — they're
			saved for later.
		</p>
	</header>

	<form onsubmit={(e) => { e.preventDefault(); save(); }}>
		<fieldset class="profiles">
			<legend>Rules profile</legend>
			{#each PROFILE_IDS as id (id)}
				<label class="profile" class:selected={profile === id}>
					<input
						type="radio"
						name="profile"
						value={id}
						checked={profile === id}
						onchange={() => selectProfile(id)}
					/>
					<span class="profile-text">
						<span class="profile-name">{id}</span>
						{#if profileBlurb(id)}<span class="profile-blurb">{profileBlurb(id)}</span>{/if}
					</span>
				</label>
			{/each}
		</fieldset>

		<fieldset class="settings">
			<legend>Settings {isCustom(profile) ? '(editable)' : '(read-only)'}</legend>
			{#each SETTINGS as s (s.code)}
				<div class="setting">
					<span class="setting-desc">{s.desc}</span>
					{#if isCustom(profile)}
						<label class="toggle">
							<input
								type="checkbox"
								aria-label={s.desc}
								checked={custom[s.code]}
								onchange={() => toggle(s.code)}
							/>
							<span class="toggle-value">{custom[s.code] ? 'On' : 'Off'}</span>
						</label>
					{:else}
						<span
							class="value-readonly"
							class:on={displayed[s.code]}
							aria-label={`${s.desc} is ${displayed[s.code] ? 'on' : 'off'}`}
						>
							{displayed[s.code] ? 'On' : 'Off'}
						</span>
					{/if}
				</div>
			{/each}
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

	.profile {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		min-height: 56px;
		padding: 0.6rem 0.5rem;
		border-radius: 6px;
		cursor: pointer;
	}

	.profile + .profile {
		border-top: 1px solid var(--rule);
	}

	.profile.selected {
		background: rgba(176, 80, 58, 0.08);
	}

	.profile input {
		width: 24px;
		height: 24px;
		margin-top: 0.15rem;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.profile input:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	.profile-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.profile-name {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--ink);
	}

	.profile-blurb {
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

	.value-readonly {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--muted);
		padding: 0 0.5rem;
	}

	.value-readonly.on {
		color: var(--good);
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
