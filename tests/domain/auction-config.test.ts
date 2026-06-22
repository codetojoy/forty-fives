import { describe, it, expect } from 'vitest';
import {
	SETTINGS,
	PROFILE_IDS,
	BUILTIN_PROFILES,
	DEFAULT_PROFILE,
	isCustom,
	defaultCustomValues,
	defaultAuctionConfig,
	defaultSettingValues,
	resolveConfig,
	normalizeAuctionConfig,
	type AuctionConfig
} from '$lib/domain/auction-config.js';

describe('auction config — settings registry', () => {
	it('defines the two boolean settings plus the Finish Game Rule choice', () => {
		expect(SETTINGS.map((s) => s.code)).toEqual(['USE_KITTY', 'ALLOW_DISCARD', 'FINISH_RULE']);
		expect(SETTINGS.find((s) => s.code === 'USE_KITTY')?.type).toBe('boolean');
		expect(SETTINGS.find((s) => s.code === 'ALLOW_DISCARD')?.type).toBe('boolean');
		expect(SETTINGS.find((s) => s.code === 'USE_KITTY')?.desc).toBe('Use kitty');
		expect(SETTINGS.find((s) => s.code === 'ALLOW_DISCARD')?.desc).toBe(
			'Allow discard when not bid-winner'
		);
	});

	it('models the Finish Game Rule as a two-option choice (TODO-016)', () => {
		const s = SETTINGS.find((s) => s.code === 'FINISH_RULE');
		expect(s?.type).toBe('choice');
		expect(s?.desc).toBe('Finish Game Rule');
		expect(s?.type === 'choice' ? s.options : []).toEqual([
			{ value: 'POINTS_120', label: '120 points reached' },
			{ value: 'FOUR_TURNS', label: '4 turns of the table completed' }
		]);
	});

	it('lists the three profiles in display order', () => {
		expect(PROFILE_IDS).toEqual(['Wikipedia', 'Rec Hall', 'Custom']);
	});
});

describe('auction config — built-in profiles', () => {
	it('Wikipedia uses the kitty, forbids extra discard, finishes at 120 points', () => {
		expect(BUILTIN_PROFILES.Wikipedia).toEqual({
			USE_KITTY: true,
			ALLOW_DISCARD: false,
			FINISH_RULE: 'POINTS_120'
		});
	});

	it('Rec Hall drops the kitty, allows extra discard, finishes after four turns', () => {
		expect(BUILTIN_PROFILES['Rec Hall']).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: true,
			FINISH_RULE: 'FOUR_TURNS'
		});
	});

	it('isCustom recognises only Custom', () => {
		expect(isCustom('Custom')).toBe(true);
		expect(isCustom('Wikipedia')).toBe(false);
		expect(isCustom('Rec Hall')).toBe(false);
	});
});

describe('auction config — defaults', () => {
	it('defaults to Wikipedia (matches current game behaviour)', () => {
		expect(DEFAULT_PROFILE).toBe('Wikipedia');
		const d = defaultAuctionConfig();
		expect(d.profile).toBe('Wikipedia');
		expect(d.custom).toEqual(BUILTIN_PROFILES.Wikipedia);
	});

	it('Custom seeds from Wikipedia values', () => {
		expect(defaultCustomValues()).toEqual(BUILTIN_PROFILES.Wikipedia);
	});

	it('defaultSettingValues resolves to current play (kitty on)', () => {
		expect(defaultSettingValues()).toEqual({
			USE_KITTY: true,
			ALLOW_DISCARD: false,
			FINISH_RULE: 'POINTS_120'
		});
	});

	it('returns fresh objects (no shared mutable state)', () => {
		const a = defaultAuctionConfig();
		a.custom.USE_KITTY = false;
		expect(defaultAuctionConfig().custom.USE_KITTY).toBe(true);
	});
});

describe('auction config — resolveConfig', () => {
	it('resolves built-in profiles to their presets, ignoring stored custom', () => {
		const config: AuctionConfig = {
			profile: 'Rec Hall',
			custom: { USE_KITTY: true, ALLOW_DISCARD: false, FINISH_RULE: 'POINTS_120' }
		};
		expect(resolveConfig(config)).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: true,
			FINISH_RULE: 'FOUR_TURNS'
		});
	});

	it('resolves Custom to its stored values', () => {
		const config: AuctionConfig = {
			profile: 'Custom',
			custom: { USE_KITTY: false, ALLOW_DISCARD: false, FINISH_RULE: 'FOUR_TURNS' }
		};
		expect(resolveConfig(config)).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: false,
			FINISH_RULE: 'FOUR_TURNS'
		});
	});

	it('returns a copy, not the stored custom object', () => {
		const config = defaultAuctionConfig();
		config.profile = 'Custom';
		const resolved = resolveConfig(config);
		resolved.USE_KITTY = false;
		expect(config.custom.USE_KITTY).toBe(true);
	});
});

describe('auction config — normalizeAuctionConfig', () => {
	it('passes through a valid config', () => {
		const config: AuctionConfig = {
			profile: 'Custom',
			custom: { USE_KITTY: false, ALLOW_DISCARD: true, FINISH_RULE: 'FOUR_TURNS' }
		};
		expect(normalizeAuctionConfig(config)).toEqual(config);
	});

	it('falls back to defaults for non-objects', () => {
		const d = defaultAuctionConfig();
		expect(normalizeAuctionConfig(null)).toEqual(d);
		expect(normalizeAuctionConfig('nope')).toEqual(d);
		expect(normalizeAuctionConfig(undefined)).toEqual(d);
	});

	it('defaults an unknown profile to Wikipedia', () => {
		const out = normalizeAuctionConfig({ profile: 'Bogus', custom: BUILTIN_PROFILES.Wikipedia });
		expect(out.profile).toBe('Wikipedia');
	});

	it('fills missing custom settings from defaults', () => {
		const out = normalizeAuctionConfig({ profile: 'Custom', custom: { USE_KITTY: false } });
		expect(out.custom).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: false,
			FINISH_RULE: 'POINTS_120'
		});
	});

	it('ignores non-boolean and unknown setting values', () => {
		const out = normalizeAuctionConfig({
			profile: 'Custom',
			custom: { USE_KITTY: 'yes', ALLOW_DISCARD: true, BOGUS: 1 }
		});
		expect(out.custom).toEqual({ USE_KITTY: true, ALLOW_DISCARD: true, FINISH_RULE: 'POINTS_120' });
		expect('BOGUS' in out.custom).toBe(false);
	});

	it('keeps a valid finish-rule choice and rejects a bogus one', () => {
		const kept = normalizeAuctionConfig({
			profile: 'Custom',
			custom: { USE_KITTY: true, ALLOW_DISCARD: false, FINISH_RULE: 'FOUR_TURNS' }
		});
		expect(kept.custom.FINISH_RULE).toBe('FOUR_TURNS');

		const rejected = normalizeAuctionConfig({
			profile: 'Custom',
			custom: { USE_KITTY: true, ALLOW_DISCARD: false, FINISH_RULE: 'SOMEDAY' }
		});
		expect(rejected.custom.FINISH_RULE).toBe('POINTS_120');
	});

	it('defaults custom entirely when it is missing', () => {
		const out = normalizeAuctionConfig({ profile: 'Wikipedia' });
		expect(out.custom).toEqual(defaultCustomValues());
	});
});
