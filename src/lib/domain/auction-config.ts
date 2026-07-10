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
	| 'NUM_KITTY'
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

interface IntegerSetting {
	readonly code: 'NUM_KITTY';
	readonly desc: string;
	readonly type: 'integer';
	/** Inclusive bounds; values outside are rejected by normalizeAuctionConfig. */
	readonly min: number;
	readonly max: number;
}

interface ChoiceSetting<C extends AuctionSettingCode, V extends string> {
	readonly code: C;
	readonly desc: string;
	readonly type: 'choice';
	readonly options: readonly { readonly value: V; readonly label: string }[];
}

export type AuctionSetting =
	| BooleanSetting
	| IntegerSetting
	| ChoiceSetting<'FINISH_RULE', FinishGameRule>
	| ChoiceSetting<'FIRST_LEAD', FirstLeadRule>;

/** The settings, in display order. */
export const SETTINGS: readonly AuctionSetting[] = [
	{ code: 'USE_KITTY', desc: 'Use kitty', type: 'boolean' },
	{ code: 'NUM_KITTY', desc: 'Num cards in kitty', type: 'integer', min: 1, max: 5 },
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
	NUM_KITTY: number;
	ALLOW_DISCARD: boolean;
	ALLOW_HOLD: boolean;
	FINISH_RULE: FinishGameRule;
	FIRST_LEAD: FirstLeadRule;
}

export type AuctionProfileId =
	| 'Common PEI'
	| 'Wikipedia'
	| 'Rec Hall PEI'
	| 'Tignish PEI'
	| 'Custom';

/** The selectable profiles, in display order (default first). */
export const PROFILE_IDS: readonly AuctionProfileId[] = [
	'Common PEI',
	'Wikipedia',
	'Rec Hall PEI',
	'Tignish PEI',
	'Custom'
];

/** Read-only preset values for the built-in profiles. */
export const BUILTIN_PROFILES: Record<
	'Common PEI' | 'Wikipedia' | 'Rec Hall PEI' | 'Tignish PEI',
	AuctionSettingValues
> = {
	'Common PEI': {
		USE_KITTY: true,
		NUM_KITTY: 3,
		ALLOW_DISCARD: true,
		ALLOW_HOLD: false,
		FINISH_RULE: 'POINTS_120',
		FIRST_LEAD: 'LEFT_OF_BIDDER'
	},
	Wikipedia: {
		USE_KITTY: true,
		NUM_KITTY: 3,
		ALLOW_DISCARD: false,
		ALLOW_HOLD: true,
		FINISH_RULE: 'POINTS_120',
		FIRST_LEAD: 'ELDEST'
	},
	'Rec Hall PEI': {
		USE_KITTY: false,
		NUM_KITTY: 3,
		ALLOW_DISCARD: true,
		ALLOW_HOLD: true,
		FINISH_RULE: 'FOUR_TURNS',
		FIRST_LEAD: 'LEFT_OF_BIDDER'
	},
	'Tignish PEI': {
		USE_KITTY: true,
		NUM_KITTY: 5,
		ALLOW_DISCARD: true,
		ALLOW_HOLD: false,
		FINISH_RULE: 'POINTS_120',
		FIRST_LEAD: 'LEFT_OF_BIDDER'
	}
};

/** Whether a profile's values are user-editable (only "Custom"). */
export function isCustom(profile: AuctionProfileId): profile is 'Custom' {
	return profile === 'Custom';
}

/**
 * Default to "Common PEI" (TODO-058): the profile that matches how the game is
 * most commonly played on PEI — kitty on, with the non-bid-winner discard — so
 * new players start on the intended house rules rather than the Wikipedia baseline.
 */
export const DEFAULT_PROFILE: AuctionProfileId = 'Common PEI';

/** The values "Custom" starts from before the user edits anything. */
export function defaultCustomValues(): AuctionSettingValues {
	return { ...BUILTIN_PROFILES['Common PEI'] };
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
 * The resolved setting values used when none are supplied — the default profile's
 * values ("Common PEI": kitty on, non-bid-winner discard on). Used as the fallback
 * for games started or saved before the config was wired in (TODO-011).
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
			} else if (s.type === 'integer') {
				if (typeof raw === 'number' && Number.isInteger(raw) && raw >= s.min && raw <= s.max) {
					result[s.code] = raw;
				}
			} else if (s.options.some((o) => o.value === raw)) {
				// raw matched one of this choice setting's declared option values.
				(result as Record<string, unknown>)[s.code] = raw;
			}
		}
	}
	return result;
}
