/**
 * Hand and game scoring. All point values come from scheme.scoring — there are
 * no hardcoded 45s in here.
 *
 * Standard rules: each trick is worth trickValue (5); the highest trump in
 * play earns highestTrumpBonus (5) extra. The highest trump in play always
 * wins the trick it appears in (nothing on the table can beat it), so the
 * bonus goes to that trick's winner.
 *
 * House-rule note (flagged for real-player validation, SPEC §6): when no trump
 * at all is played in a hand, no bonus is awarded and the hand totals
 * 5 × trickValue instead of 30.
 */

import { sameCard, type Card, type Suit } from './cards.js';
import { trumpStrength, type TrumpScheme } from './trump-scheme.js';
import type { CompletedTrick } from './game-state.js';

export interface HandScore {
	/** Points earned this hand, per seat. */
	points: number[];
	/** Tricks won this hand, per seat. */
	trickCounts: number[];
	/** The highest trump played this hand, or null when no trump was played. */
	bonusCard: Card | null;
	/** Who won the trick containing the bonus card, or null. */
	bonusSeat: number | null;
}

export function scoreHand(
	tricks: readonly CompletedTrick[],
	trumpSuit: Suit,
	scheme: TrumpScheme,
	seats: number
): HandScore {
	const points = Array.from({ length: seats }, () => 0);
	const trickCounts = Array.from({ length: seats }, () => 0);

	let bonusCard: Card | null = null;
	let bonusSeat: number | null = null;
	let bestStrength = -1;

	for (const trick of tricks) {
		trickCounts[trick.winner]++;
		points[trick.winner] += scheme.scoring.trickValue;
		for (const play of trick.plays) {
			const s = trumpStrength(play.card, trumpSuit, scheme);
			if (s !== null && s > bestStrength) {
				bestStrength = s;
				bonusCard = play.card;
				bonusSeat = trick.winner;
			}
		}
	}

	if (bonusSeat !== null) {
		points[bonusSeat] += scheme.scoring.highestTrumpBonus;
	}
	return { points, trickCounts, bonusCard, bonusSeat };
}

/**
 * The game winner given running totals, or null when the game continues.
 * First to reach the target wins; if several seats cross in the same hand the
 * higher total wins, and an exact tie at the top plays another hand.
 */
export function gameWinner(totals: readonly number[], target: number): number | null {
	const best = Math.max(...totals);
	if (best < target) return null;
	const leaders = totals.flatMap((t, seat) => (t === best ? [seat] : []));
	return leaders.length === 1 ? leaders[0] : null;
}

/** Did this card out-rank every card in `others` as a trump? (UI/AI helper.) */
export function isHighestTrumpAmong(
	c: Card,
	others: readonly Card[],
	trumpSuit: Suit,
	scheme: TrumpScheme
): boolean {
	const s = trumpStrength(c, trumpSuit, scheme);
	if (s === null) return false;
	return others.every(
		(o) => sameCard(o, c) || (trumpStrength(o, trumpSuit, scheme) ?? -1) < s
	);
}
