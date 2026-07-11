import { describe, it, expect } from 'vitest';
import { BID_VALUES, MIN_BID, MAX_BID, isBidValue, legalBids, canRaise } from '$lib/domain/bidding.js';

describe('bid values', () => {
	it('are exactly 15/20/25/30 ascending', () => {
		expect([...BID_VALUES]).toEqual([15, 20, 25, 30]);
		expect(MIN_BID).toBe(15);
		expect(MAX_BID).toBe(30);
	});

	it('isBidValue accepts only the four amounts', () => {
		expect(isBidValue(15)).toBe(true);
		expect(isBidValue(30)).toBe(true);
		expect(isBidValue(10)).toBe(false);
		expect(isBidValue(35)).toBe(false);
		expect(isBidValue(22)).toBe(false);
	});
});

describe('legalBids', () => {
	it('offers everything when no one has bid', () => {
		expect(legalBids(null)).toEqual([15, 20, 25, 30]);
	});

	it('offers only strictly higher bids', () => {
		expect(legalBids(15)).toEqual([20, 25, 30]);
		expect(legalBids(25)).toEqual([30]);
		expect(legalBids(30)).toEqual([]);
	});

	it('respects a raised minimum bid (TODO-062)', () => {
		// With a floor of 20, the opening 15 is off the table.
		expect(legalBids(null, 20)).toEqual([20, 25, 30]);
		expect(legalBids(null, 25)).toEqual([25, 30]);
		// The floor and the strictly-higher rule combine (both must hold).
		expect(legalBids(20, 20)).toEqual([25, 30]);
		expect(legalBids(15, 20)).toEqual([20, 25, 30]);
	});
});

describe('canRaise', () => {
	it('is true until the high bid is the maximum', () => {
		expect(canRaise(null)).toBe(true);
		expect(canRaise(25)).toBe(true);
		expect(canRaise(30)).toBe(false);
	});
});
