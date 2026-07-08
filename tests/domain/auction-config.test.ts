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
	it('defines the three boolean settings plus the two choice settings', () => {
		expect(SETTINGS.map((s) => s.code)).toEqual([
			'USE_KITTY',
			'ALLOW_DISCARD',
			'ALLOW_HOLD',
			'FINISH_RULE',
			'FIRST_LEAD'
		]);
		expect(SETTINGS.find((s) => s.code === 'USE_KITTY')?.type).toBe('boolean');
		expect(SETTINGS.find((s) => s.code === 'ALLOW_DISCARD')?.type).toBe('boolean');
		expect(SETTINGS.find((s) => s.code === 'ALLOW_HOLD')?.type).toBe('boolean');
		expect(SETTINGS.find((s) => s.code === 'USE_KITTY')?.desc).toBe('Use kitty');
		expect(SETTINGS.find((s) => s.code === 'ALLOW_DISCARD')?.desc).toBe(
			'Allow discard when not bid-winner'
		);
		expect(SETTINGS.find((s) => s.code === 'ALLOW_HOLD')?.desc).toBe(
			'Allow dealer to hold the bid'
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

	it('models the first-trick leader as a two-option choice (TODO-017)', () => {
		const s = SETTINGS.find((s) => s.code === 'FIRST_LEAD');
		expect(s?.type).toBe('choice');
		expect(s?.desc).toBe('First-trick leader');
		expect(s?.type === 'choice' ? s.options : []).toEqual([
			{ value: 'ELDEST', label: 'Eldest hand (left of dealer)' },
			{ value: 'LEFT_OF_BIDDER', label: 'Left of the bid winner' }
		]);
	});

	it('lists the four profiles in display order (default first)', () => {
		expect(PROFILE_IDS).toEqual(['Common PEI', 'Wikipedia', 'Rec Hall PEI', 'Custom']);
	});
});

describe('auction config — built-in profiles', () => {
	it('Common PEI uses the kitty and the discard, no hold, 120, left-of-bidder leads', () => {
		expect(BUILTIN_PROFILES['Common PEI']).toEqual({
			USE_KITTY: true,
			ALLOW_DISCARD: true,
			ALLOW_HOLD: false,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		});
	});

	it('Wikipedia uses the kitty, forbids extra discard, allows hold, 120, eldest leads', () => {
		expect(BUILTIN_PROFILES.Wikipedia).toEqual({
			USE_KITTY: true,
			ALLOW_DISCARD: false,
			ALLOW_HOLD: true,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'ELDEST'
		});
	});

	it('Rec Hall PEI drops the kitty, allows discard and hold, four turns, left-of-bidder leads', () => {
		expect(BUILTIN_PROFILES['Rec Hall PEI']).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: true,
			ALLOW_HOLD: true,
			FINISH_RULE: 'FOUR_TURNS',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		});
	});

	it('isCustom recognises only Custom', () => {
		expect(isCustom('Custom')).toBe(true);
		expect(isCustom('Common PEI')).toBe(false);
		expect(isCustom('Wikipedia')).toBe(false);
		expect(isCustom('Rec Hall PEI')).toBe(false);
	});
});

describe('auction config — defaults', () => {
	it('defaults to Common PEI (the intended house rules)', () => {
		expect(DEFAULT_PROFILE).toBe('Common PEI');
		const d = defaultAuctionConfig();
		expect(d.profile).toBe('Common PEI');
		expect(d.custom).toEqual(BUILTIN_PROFILES['Common PEI']);
	});

	it('Custom seeds from Common PEI values', () => {
		expect(defaultCustomValues()).toEqual(BUILTIN_PROFILES['Common PEI']);
	});

	it('defaultSettingValues resolves to the default profile (kitty on, discard on)', () => {
		expect(defaultSettingValues()).toEqual({
			USE_KITTY: true,
			ALLOW_DISCARD: true,
			ALLOW_HOLD: false,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
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
			profile: 'Rec Hall PEI',
			custom: {
				USE_KITTY: true,
				ALLOW_DISCARD: false,
				ALLOW_HOLD: false,
				FINISH_RULE: 'POINTS_120',
				FIRST_LEAD: 'ELDEST'
			}
		};
		expect(resolveConfig(config)).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: true,
			ALLOW_HOLD: true,
			FINISH_RULE: 'FOUR_TURNS',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		});
	});

	it('resolves Custom to its stored values', () => {
		const config: AuctionConfig = {
			profile: 'Custom',
			custom: {
				USE_KITTY: false,
				ALLOW_DISCARD: false,
				ALLOW_HOLD: false,
				FINISH_RULE: 'FOUR_TURNS',
				FIRST_LEAD: 'LEFT_OF_BIDDER'
			}
		};
		expect(resolveConfig(config)).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: false,
			ALLOW_HOLD: false,
			FINISH_RULE: 'FOUR_TURNS',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
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
			custom: {
				USE_KITTY: false,
				ALLOW_DISCARD: true,
				ALLOW_HOLD: false,
				FINISH_RULE: 'FOUR_TURNS',
				FIRST_LEAD: 'LEFT_OF_BIDDER'
			}
		};
		expect(normalizeAuctionConfig(config)).toEqual(config);
	});

	it('falls back to defaults for non-objects', () => {
		const d = defaultAuctionConfig();
		expect(normalizeAuctionConfig(null)).toEqual(d);
		expect(normalizeAuctionConfig('nope')).toEqual(d);
		expect(normalizeAuctionConfig(undefined)).toEqual(d);
	});

	it('defaults an unknown profile to Common PEI', () => {
		const out = normalizeAuctionConfig({
			profile: 'Bogus',
			custom: BUILTIN_PROFILES['Common PEI']
		});
		expect(out.profile).toBe('Common PEI');
	});

	it('fills missing custom settings from defaults', () => {
		const out = normalizeAuctionConfig({ profile: 'Custom', custom: { USE_KITTY: false } });
		expect(out.custom).toEqual({
			USE_KITTY: false,
			ALLOW_DISCARD: true,
			ALLOW_HOLD: false,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		});
	});

	it('fills ALLOW_HOLD from the default for configs stored before TODO-042', () => {
		const out = normalizeAuctionConfig({
			profile: 'Custom',
			custom: {
				USE_KITTY: false,
				ALLOW_DISCARD: true,
				FINISH_RULE: 'FOUR_TURNS',
				FIRST_LEAD: 'LEFT_OF_BIDDER'
			}
		});
		expect(out.custom.ALLOW_HOLD).toBe(false);
	});

	it('ignores non-boolean and unknown setting values', () => {
		const out = normalizeAuctionConfig({
			profile: 'Custom',
			custom: { USE_KITTY: 'yes', ALLOW_DISCARD: true, ALLOW_HOLD: 'sure', BOGUS: 1 }
		});
		expect(out.custom).toEqual({
			USE_KITTY: true,
			ALLOW_DISCARD: true,
			ALLOW_HOLD: false,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		});
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

	it('keeps a valid first-lead choice and rejects a bogus one (TODO-017)', () => {
		const kept = normalizeAuctionConfig({
			profile: 'Custom',
			custom: { USE_KITTY: true, ALLOW_DISCARD: false, FIRST_LEAD: 'LEFT_OF_BIDDER' }
		});
		expect(kept.custom.FIRST_LEAD).toBe('LEFT_OF_BIDDER');

		const rejected = normalizeAuctionConfig({
			profile: 'Custom',
			custom: { USE_KITTY: true, ALLOW_DISCARD: false, FIRST_LEAD: 'SOMEONE' }
		});
		expect(rejected.custom.FIRST_LEAD).toBe('LEFT_OF_BIDDER');
	});

	it('defaults custom entirely when it is missing', () => {
		const out = normalizeAuctionConfig({ profile: 'Wikipedia' });
		expect(out.custom).toEqual(defaultCustomValues());
	});
});
