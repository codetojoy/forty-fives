/**
 * Configuration model for Auction Forty-Fives (TODO-010). Pure, UI-free data and
 * helpers, so it stays unit-testable and portable to the planned Flutter client
 * (SPEC §10).
 *
 * The resolved values are snapshotted into a game at startAuction and read by
 * the pure transitions, so every setting now shapes play: USE_KITTY (TODO-011),
 * ALLOW_DISCARD (TODO-012), ALLOW_HOLD (TODO-042), FIRST_LEAD (TODO-017), and
 * FINISH_RULE (TODO-016 setting, wired into game-end in TODO-018). All remain
 * rule calls awaiting real-player validation (SPEC §6).
 *
 * A *setting* is one atomic, named value — either a boolean or a choice from a
 * fixed set (the "Finish Game Rule" added in TODO-016). A *profile* is a named
 * group of setting values: two built-in presets that are read-only, plus
 * "Custom", whose values the user chooses.
 */

export type AuctionSettingCode =
	| 'USE_KITTY'
	| 'ALLOW_DISCARD'
	| 'ALLOW_HOLD'
	| 'FINISH_RULE'
	| 'FIRST_LEAD';

/**
 * When the game ends (TODO-016, wired into play in TODO-018). `POINTS_120` ends
 * when a team reaches 120; `FOUR_TURNS` plays a fixed 4 turns of the table (4
 * hands, a fast rec-hall game — TODO-019) and the higher total wins.
 */
export type FinishGameRule = 'POINTS_120' | 'FOUR_TURNS';

/**
 * Who leads the first trick (TODO-017). `ELDEST` is the eldest hand (dealer's
 * left), the standard rule; `LEFT_OF_BIDDER` (the Rec Hall rule) seats the bid
 * winner's left-hand player as leader, so the bid winner plays last.
 */
export type FirstLeadRule = 'ELDEST' | 'LEFT_OF_BIDDER';

interface BooleanSetting {
	readonly code: 'USE_KITTY' | 'ALLOW_DISCARD' | 'ALLOW_HOLD';
	readonly desc: string;
	readonly type: 'boolean';
}

interface ChoiceSetting<C extends AuctionSettingCode, V extends string> {
	readonly code: C;
	readonly desc: string;
	readonly type: 'choice';
	readonly options: readonly { readonly value: V; readonly label: string }[];
}

export type AuctionSetting =
	| BooleanSetting
	| ChoiceSetting<'FINISH_RULE', FinishGameRule>
	| ChoiceSetting<'FIRST_LEAD', FirstLeadRule>;

/** The settings, in display order. */
export const SETTINGS: readonly AuctionSetting[] = [
	{ code: 'USE_KITTY', desc: 'Use kitty', type: 'boolean' },
	{ code: 'ALLOW_DISCARD', desc: 'Allow discard when not bid-winner', type: 'boolean' },
	{ code: 'ALLOW_HOLD', desc: 'Allow dealer to hold the bid', type: 'boolean' },
	{
		code: 'FINISH_RULE',
		desc: 'Finish Game Rule',
		type: 'choice',
		options: [
			{ value: 'POINTS_120', label: '120 points reached' },
			{ value: 'FOUR_TURNS', label: '4 turns of the table completed' }
		]
	},
	{
		code: 'FIRST_LEAD',
		desc: 'First-trick leader',
		type: 'choice',
		options: [
			{ value: 'ELDEST', label: 'Eldest hand (left of dealer)' },
			{ value: 'LEFT_OF_BIDDER', label: 'Left of the bid winner' }
		]
	}
];

/** Effective value for every setting (heterogeneous: booleans plus the choices). */
export interface AuctionSettingValues {
	USE_KITTY: boolean;
	ALLOW_DISCARD: boolean;
	ALLOW_HOLD: boolean;
	FINISH_RULE: FinishGameRule;
	FIRST_LEAD: FirstLeadRule;
}

export type AuctionProfileId = 'Wikipedia' | 'Rec Hall' | 'Custom';

/** The selectable profiles, in display order. */
export const PROFILE_IDS: readonly AuctionProfileId[] = ['Wikipedia', 'Rec Hall', 'Custom'];

/** Read-only preset values for the built-in profiles. */
export const BUILTIN_PROFILES: Record<'Wikipedia' | 'Rec Hall', AuctionSettingValues> = {
	Wikipedia: {
		USE_KITTY: true,
		ALLOW_DISCARD: false,
		ALLOW_HOLD: true,
		FINISH_RULE: 'POINTS_120',
		FIRST_LEAD: 'ELDEST'
	},
	'Rec Hall': {
		USE_KITTY: false,
		ALLOW_DISCARD: true,
		ALLOW_HOLD: true,
		FINISH_RULE: 'FOUR_TURNS',
		FIRST_LEAD: 'LEFT_OF_BIDDER'
	}
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
 * The resolved setting values used when none are supplied — matches the game's
 * current play (kitty on, no extra discard). Used as the fallback for games
 * started or saved before the config was wired in (TODO-011).
 */
export function defaultSettingValues(): AuctionSettingValues {
	return resolveConfig(defaultAuctionConfig());
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
		const obj = value as Record<string, unknown>;
		for (const s of SETTINGS) {
			const raw = obj[s.code];
			if (s.type === 'boolean') {
				if (typeof raw === 'boolean') result[s.code] = raw;
			} else if (s.options.some((o) => o.value === raw)) {
				// raw matched one of this choice setting's declared option values.
				(result as Record<string, unknown>)[s.code] = raw;
			}
		}
	}
	return result;
}
