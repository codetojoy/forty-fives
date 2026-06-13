/**
 * Scoring for Auction Forty-Fives (Milestone 3). Score is by partnership to
 * 120. Four seats form two teams of partners sitting opposite each other:
 * seats {0, 2} are team 0 and seats {1, 3} are team 1 (teamOf = seat % 2).
 *
 * Each hand still distributes the standard 30 points — five tricks at five
 * points each plus the five-point highest-trump bonus — so the per-seat tally
 * comes straight from the shared scoreHand(). The auction layer adds:
 *
 *   - Team aggregation: a team's gross is the sum of its two seats' points.
 *   - The bid (make/set) rule: the bidding team banks its gross only if it
 *     meets or beats the bid; otherwise it is "set" and SUBTRACTS the bid
 *     (its running total can go negative). The defending team always banks the
 *     points it took.
 *   - "Counts out first": when the running totals are checked, the bidding
 *     team is considered first, so if it reaches 120 on the hand it wins even
 *     if the defenders would also be at or past 120.
 */

import type { Suit } from './cards.js';
import type { Card } from './cards.js';
import { scoreHand } from './scoring.js';
import type { CompletedTrick } from './game-state.js';
import type { TrumpScheme } from './trump-scheme.js';

/** Number of partnerships at the auction table. */
export const NUM_TEAMS = 2;

/**
 * The game is played to 120. This is a property of Auction Forty-Fives itself,
 * not of the card scheme — the scheme's scoring.gameTarget (45) is the 1v1
 * Forty-Fives target and is not used here.
 */
export const AUCTION_TARGET = 120;

/** Which team a seat belongs to: partners sit opposite (0&2 vs 1&3). */
export function teamOf(seat: number): number {
	return seat % NUM_TEAMS;
}

/** The seats making up a team, in seat order. */
export function seatsOfTeam(team: number, seats = 4): number[] {
	return Array.from({ length: seats }, (_, s) => s).filter((s) => teamOf(s) === team);
}

export interface AuctionHandScore {
	/** Raw points each team took this hand (tricks + highest-trump bonus). */
	teamGross: number[];
	/** Net change applied to each team's running total (set teams go negative). */
	teamDelta: number[];
	/** True when the bidding team met or beat its bid. */
	bidMade: boolean;
	/** The highest trump played this hand, or null when no trump was played. */
	bonusCard: Card | null;
	/** Who won the trick containing the bonus card, or null. */
	bonusSeat: number | null;
	/** Tricks won per seat. */
	trickCounts: number[];
}

/**
 * Score one completed hand. `bid` is the winning bid and `biddingTeam` the team
 * that must make it.
 */
export function scoreAuctionHand(
	tricks: readonly CompletedTrick[],
	trumpSuit: Suit,
	scheme: TrumpScheme,
	bid: number,
	biddingTeam: number,
	seats = 4
): AuctionHandScore {
	const perSeat = scoreHand(tricks, trumpSuit, scheme, seats);

	const teamGross = Array.from({ length: NUM_TEAMS }, () => 0);
	for (let seat = 0; seat < seats; seat++) teamGross[teamOf(seat)] += perSeat.points[seat];

	const bidMade = teamGross[biddingTeam] >= bid;
	const teamDelta = teamGross.map((gross, team) => {
		if (team !== biddingTeam) return gross; // defenders always bank what they took
		return bidMade ? gross : -bid; // bidding team: bank it, or be set
	});

	return {
		teamGross,
		teamDelta,
		bidMade,
		bonusCard: perSeat.bonusCard,
		bonusSeat: perSeat.bonusSeat,
		trickCounts: perSeat.trickCounts
	};
}

/**
 * The winning team given running totals after a hand, or null if the game
 * continues. The bidding team counts out first: if it has reached the target it
 * wins, even when the defenders also crossed in the same hand.
 */
export function auctionGameWinner(
	totals: readonly number[],
	biddingTeam: number,
	target = AUCTION_TARGET
): number | null {
	if (totals[biddingTeam] >= target) return biddingTeam;
	const other = totals.findIndex((t, team) => team !== biddingTeam && t >= target);
	return other === -1 ? null : other;
}
