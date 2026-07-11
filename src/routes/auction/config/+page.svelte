<script lang="ts">
	import { base } from '$app/paths';
	import {
		SETTINGS,
		PROFILE_IDS,
		BUILTIN_PROFILES,
		isCustom,
		type AuctionProfileId,
		type AuctionSettingValues
	} from '$lib/domain/auction-config.js';
	import BackLink from '$lib/ui/BackLink.svelte';
	import {
		loadAuctionConfig,
		saveAuctionConfig,
		loadAuctionGame,
		saveAuctionGame,
		normalizeAuctionNames,
		AUCTION_NAME_MAX_LEN,
		type AuctionGameSettings
	} from '$lib/ui/persistence.js';

	const initial = loadAuctionConfig();
	// Display & interaction preferences (TODO-026) live in the auction game save
	// alongside any in-progress game and are independent of the rules profile, but
	// they share this page's single Save button so the dirty state is unambiguous.
	const savedGame = loadAuctionGame();

	let profile = $state<AuctionProfileId>(initial.profile);
	let custom = $state<AuctionSettingValues>({ ...initial.custom });
	let prefs = $state<AuctionGameSettings>({ ...savedGame.settings });
	// AI player names (TODO-060), edited alongside the other prefs. Seat 0 is the
	// human ("You") and is never editable; the AI seats are the partner (2) and the
	// two opponents (1, 3). A rename applies live the next time the table loads.
	let names = $state<string[]>([...savedGame.names]);
	// A snapshot of what's in storage, to detect unsaved changes.
	let saved = $state({
		profile: initial.profile,
		custom: { ...initial.custom },
		prefs: { ...savedGame.settings },
		names: [...savedGame.names]
	});

	// The AI seats to expose, in reading order: partner first, then the opponents.
	const NAME_SEATS: { seat: number; label: string }[] = [
		{ seat: 2, label: 'Partner' },
		{ seat: 1, label: 'Opponent' },
		{ seat: 3, label: 'Opponent' }
	];

	/** The values to show: a built-in preset, or the editable Custom values. */
	const displayed = $derived<AuctionSettingValues>(
		isCustom(profile) ? custom : BUILTIN_PROFILES[profile]
	);

	const dirty = $derived(
		profile !== saved.profile ||
			SETTINGS.some((s) => custom[s.code] !== saved.custom[s.code]) ||
			prefs.highlightLegal !== saved.prefs.highlightLegal ||
			prefs.confirmPlay !== saved.prefs.confirmPlay ||
			prefs.alwaysExchangeNonTrump !== saved.prefs.alwaysExchangeNonTrump ||
			prefs.hidePlayers !== saved.prefs.hidePlayers ||
			prefs.handOrder !== saved.prefs.handOrder ||
			names.some((n, seat) => n !== saved.names[seat])
	);

	function selectProfile(next: AuctionProfileId) {
		// Seed Custom from whichever profile is currently shown, so the user tweaks
		// from a sensible base rather than starting blank.
		if (isCustom(next) && !isCustom(profile)) {
			custom = { ...displayed };
		}
		profile = next;
	}

	function toggle(code: 'USE_KITTY' | 'ALLOW_DISCARD' | 'ALLOW_HOLD') {
		if (!isCustom(profile)) return;
		custom = { ...custom, [code]: !custom[code] };
	}

	function setChoice<C extends 'MIN_BID' | 'FINISH_RULE' | 'FIRST_LEAD'>(
		code: C,
		value: AuctionSettingValues[C]
	) {
		if (!isCustom(profile)) return;
		custom = { ...custom, [code]: value };
	}

	function setInteger(code: 'NUM_KITTY', value: number, min: number, max: number) {
		if (!isCustom(profile)) return;
		const clamped = Math.max(min, Math.min(max, value));
		custom = { ...custom, [code]: clamped };
	}

	function save() {
		const next = { profile, custom: { ...custom } };
		saveAuctionConfig(next);
		// Normalize the names on save (trim, cap, per-seat default fallback) so a
		// blank field commits the default rather than an empty label (TODO-060).
		const cleanNames = normalizeAuctionNames(names);
		names = cleanNames;
		// Persist prefs + names back into the game save, preserving any in-progress game.
		saveAuctionGame({ ...savedGame, settings: { ...prefs }, names: cleanNames });
		saved = {
			profile: next.profile,
			custom: { ...next.custom },
			prefs: { ...prefs },
			names: [...cleanNames]
		};
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
	<BackLink href="{base}/auction" label="Back to Auction" />

	<header>
		<h1>Auction Settings</h1>
		<p class="subtitle">
			Rules settings come from a profile and take effect the next time you start a New game.
			Display &amp; interaction preferences are always editable. Save to apply.
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
			<legend>Rules settings — set by profile {isCustom(profile) ? '(editable)' : '(read-only)'}</legend>
			{#each SETTINGS as s (s.code)}
				<div class="setting" class:stacked={s.type === 'choice'}>
					<span class="setting-desc">{s.desc}</span>
					{#if s.type === 'boolean'}
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
					{:else if s.type === 'integer'}
						{#if isCustom(profile)}
							<div class="stepper" role="group" aria-label={s.desc}>
								<button
									type="button"
									class="stepper-btn"
									aria-label={`Decrease ${s.desc}`}
									disabled={custom[s.code] <= s.min}
									onclick={() => setInteger(s.code, custom[s.code] - 1, s.min, s.max)}
								>
									−
								</button>
								<span class="stepper-value" aria-live="polite">{custom[s.code]}</span>
								<button
									type="button"
									class="stepper-btn"
									aria-label={`Increase ${s.desc}`}
									disabled={custom[s.code] >= s.max}
									onclick={() => setInteger(s.code, custom[s.code] + 1, s.min, s.max)}
								>
									+
								</button>
							</div>
						{:else}
							<span class="value-readonly on">{displayed[s.code]}</span>
						{/if}
					{:else if s.type === 'choice'}
						{#if isCustom(profile)}
							<div class="choice" role="radiogroup" aria-label={s.desc}>
								{#each s.options as opt (opt.value)}
									<label class="choice-option" class:selected={custom[s.code] === opt.value}>
										<input
											type="radio"
											name={s.code}
											value={opt.value}
											checked={custom[s.code] === opt.value}
											onchange={() => setChoice(s.code, opt.value)}
										/>
										<span>{opt.label}</span>
									</label>
								{/each}
							</div>
						{:else}
							<span class="value-readonly on">
								{s.options.find((o) => o.value === displayed[s.code])?.label}
							</span>
						{/if}
					{/if}
				</div>
			{/each}
		</fieldset>

		<fieldset class="settings prefs">
			<legend>Players — always editable</legend>
			<p class="prefs-note">
				Rename the AI players. You are always &ldquo;You&rdquo;. A blank name resets to the
				default. New names appear the next time you open the table.
			</p>
			{#each NAME_SEATS as { seat, label } (seat)}
				<div class="setting">
					<label class="setting-desc" for={`name-${seat}`}>{label}</label>
					<input
						id={`name-${seat}`}
						class="name-input"
						type="text"
						maxlength={AUCTION_NAME_MAX_LEN}
						placeholder={savedGame.names[seat]}
						bind:value={names[seat]}
					/>
				</div>
			{/each}
		</fieldset>

		<fieldset class="settings prefs">
			<legend>Display &amp; interaction — always editable</legend>
			<p class="prefs-note">
				Personal preferences, independent of the rules profile. Always editable; saved with
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
			<div class="setting">
				<span class="setting-desc">Always exchange non-trump</span>
				<label class="toggle">
					<input
						type="checkbox"
						aria-label="Always exchange non-trump"
						bind:checked={prefs.alwaysExchangeNonTrump}
					/>
					<span class="toggle-value">{prefs.alwaysExchangeNonTrump ? 'On' : 'Off'}</span>
				</label>
			</div>
			<div class="setting">
				<span class="setting-desc">Hide other players</span>
				<label class="toggle">
					<input
						type="checkbox"
						aria-label="Hide other players"
						bind:checked={prefs.hidePlayers}
					/>
					<span class="toggle-value">{prefs.hidePlayers ? 'On' : 'Off'}</span>
				</label>
			</div>
			<div class="setting">
				<span class="setting-desc">Sort hand strongest first</span>
				<label class="toggle">
					<input
						type="checkbox"
						aria-label="Sort hand strongest first"
						bind:checked={
							() => prefs.handOrder === 'strongest-first',
							(v) => (prefs.handOrder = v ? 'strongest-first' : 'none')
						}
					/>
					<span class="toggle-value">{prefs.handOrder === 'strongest-first' ? 'On' : 'Off'}</span>
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

	/* A choice setting (e.g. Finish Game Rule) stacks its label above the options,
	   since the option labels are too long to sit beside the description. */
	.setting.stacked {
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
	}

	.setting-desc {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.choice {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.choice-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 48px;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		font-size: 1.05rem;
		cursor: pointer;
	}

	.choice-option.selected {
		background: rgba(176, 80, 58, 0.08);
		font-weight: 700;
	}

	.choice-option input {
		width: 24px;
		height: 24px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.choice-option input:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
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

	.stepper {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stepper-btn {
		width: 48px;
		height: 48px;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
		border: 1px solid var(--rule);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		cursor: pointer;
	}

	.stepper-btn:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.stepper-btn:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	.stepper-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.stepper-value {
		min-width: 2ch;
		text-align: center;
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--ink);
	}

	.name-input {
		min-height: 48px;
		min-width: 0;
		flex: 1 1 12rem;
		max-width: 16rem;
		padding: 0.5rem 0.75rem;
		font-size: 1.1rem;
		font-family: inherit;
		border: 1px solid var(--rule);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
	}

	.name-input:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
		border-color: var(--accent);
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
