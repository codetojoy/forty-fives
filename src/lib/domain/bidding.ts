/**
 * Bidding for Auction Forty-Fives (Milestone 3). Pure model + helpers; the
 * bidding state machine itself lives in auction-game-state.ts.
 *
 * Bids are 15, 20, 25, or 30 points. Each bid must beat the standing high bid,
 * so the auction is strictly ascending. If every player passes, the dealer is
 * "stuck" with a 15 bid (dealAuction's dealer must play). The optional
 * "30 for 60" raise is deferred to a later milestone (see doc/TODO-008.md).
 */

/** The discrete bid values, lowest first. */
export const BID_VALUES = [15, 20, 25, 30] as const;
export type BidValue = (typeof BID_VALUES)[number];

/** The lowest bid; also the value the dealer is stuck with if all players pass. */
export const MIN_BID: BidValue = 15;
/** The highest ordinary bid. */
export const MAX_BID: BidValue = 30;

/** Is `n` one of the legal bid amounts? */
export function isBidValue(n: number): n is BidValue {
	return (BID_VALUES as readonly number[]).includes(n);
}

/**
 * The bids a player may make given the standing high bid (null when no one has
 * bid yet): every bid value strictly greater than it, and no lower than `minBid`
 * (the configurable minimum bid — TODO-062; defaults to MIN_BID). A player may
 * always pass instead, so an empty result means "pass only".
 */
export function legalBids(currentHigh: BidValue | null, minBid: BidValue = MIN_BID): BidValue[] {
	return BID_VALUES.filter((b) => b >= minBid && (currentHigh === null || b > currentHigh));
}

/** Can a player still raise over the standing high bid? */
export function canRaise(currentHigh: BidValue | null): boolean {
	return legalBids(currentHigh).length > 0;
}
