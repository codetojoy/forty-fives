/**
 * Configuration model for Auction Forty-Fives (TODO-010). Pure, UI-free data and
 * helpers, so it stays unit-testable and portable to the planned Flutter client
 * (SPEC §10).
 *
 * This layer is inert: it only stores a *preference*. None of these settings
 * affect gameplay yet — wiring the resolved config into the game transitions is
 * a deferred follow-up (see doc/TODO-010.md), and these two settings remain
 * rule calls awaiting real-player validation (SPEC §6).
 *
 * A *setting* is one atomic, named value (currently all boolean). A *profile*
 * is a named group of setting values: two built-in presets that are read-only,
 * plus "Custom", whose values the user chooses.
 */

export type AuctionSettingCode = 'USE_KITTY' | 'ALLOW_DISCARD';

export interface AuctionSetting {
	readonly code: AuctionSettingCode;
	readonly desc: string;
	readonly type: 'boolean';
}

/** The settings, in display order. Currently all boolean (see TODO-010). */
export const SETTINGS: readonly AuctionSetting[] = [
	{ code: 'USE_KITTY', desc: 'Use kitty', type: 'boolean' },
	{ code: 'ALLOW_DISCARD', desc: 'Allow discard when not bid-winner', type: 'boolean' }
];

/** Effective value for every setting. */
export type AuctionSettingValues = Record<AuctionSettingCode, boolean>;

export type AuctionProfileId = 'Wikipedia' | 'Rec Hall' | 'Custom';

/** The selectable profiles, in display order. */
export const PROFILE_IDS: readonly AuctionProfileId[] = ['Wikipedia', 'Rec Hall', 'Custom'];

/** Read-only preset values for the built-in profiles. */
export const BUILTIN_PROFILES: Record<'Wikipedia' | 'Rec Hall', AuctionSettingValues> = {
	Wikipedia: { USE_KITTY: true, ALLOW_DISCARD: false },
	'Rec Hall': { USE_KITTY: false, ALLOW_DISCARD: true }
};

/** Whether a profile's values are user-editable (only "Custom"). */
export function isCustom(profile: AuctionProfileId): profile is 'Custom' {
	return profile === 'Custom';
}

/**
 * Default to "Wikipedia": its values (kitty on, no extra discard) match the
 * behaviour the auction game currently implements, so the inert config never
 * misrepresents how the game actually plays today.
 */
export const DEFAULT_PROFILE: AuctionProfileId = 'Wikipedia';

/** The values "Custom" starts from before the user edits anything. */
export function defaultCustomValues(): AuctionSettingValues {
	return { ...BUILTIN_PROFILES.Wikipedia };
}

/** The persisted shape: the selected profile plus the user's Custom values. */
export interface AuctionConfig {
	profile: AuctionProfileId;
	custom: AuctionSettingValues;
}

export function defaultAuctionConfig(): AuctionConfig {
	return { profile: DEFAULT_PROFILE, custom: defaultCustomValues() };
}

/**
 * The effective setting values for a config: a built-in profile resolves to its
 * preset; "Custom" resolves to the stored custom values. Returns a fresh copy.
 */
export function resolveConfig(config: AuctionConfig): AuctionSettingValues {
	if (isCustom(config.profile)) return { ...config.custom };
	return { ...BUILTIN_PROFILES[config.profile] };
}

/**
 * Coerce arbitrary (e.g. parsed-from-storage) data into a valid AuctionConfig,
 * filling missing or invalid fields from defaults. Unknown settings are dropped
 * and missing ones default, so adding a setting later won't break old saves.
 */
export function normalizeAuctionConfig(value: unknown): AuctionConfig {
	const d = defaultAuctionConfig();
	if (!value || typeof value !== 'object') return d;
	const v = value as Partial<AuctionConfig>;
	const profile = PROFILE_IDS.includes(v.profile as AuctionProfileId)
		? (v.profile as AuctionProfileId)
		: d.profile;
	return { profile, custom: normalizeValues(v.custom, d.custom) };
}

function normalizeValues(value: unknown, fallback: AuctionSettingValues): AuctionSettingValues {
	const result = { ...fallback };
	if (value && typeof value === 'object') {
		for (const s of SETTINGS) {
			const raw = (value as Record<string, unknown>)[s.code];
			if (typeof raw === 'boolean') result[s.code] = raw;
		}
	}
	return result;
}
