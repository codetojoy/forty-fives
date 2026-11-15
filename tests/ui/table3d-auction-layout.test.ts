/**
 * Card placement for the 3D table in Auction Forty-Fives: four seats, a kitty,
 * and partnership trick piles. Driven with real auction game states, the AI in
 * every seat.
 */
import { describe, it, expect } from 'vitest';
import { cardId } from '$lib/domain/cards.js';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { BUILTIN_PROFILES } from '$lib/domain/auction-config.js';
import {
	currentSeat,
	discardKitty,
	drawCards,
	nameTrump,
	passBid,
	placeBid,
	playCard,
	startAuction,
	type AuctionGameState
} from '$lib/domain/auction-game-state.js';
import {
	chooseBid,
	chooseCardAuction,
	chooseDraw,
	chooseKittyDiscards,
	chooseTrump
} from '$lib/ai/auction-ai.js';
import {
	auctionArrangement,
	auctionTableView,
	layoutAuctionTable,
	sideOf
} from '$lib/ui/table3d/auction-layout.js';
import type { CardPlacement } from '$lib/ui/table3d/layout.js';

const scheme = STANDARD_SCHEME;
const HUMAN = 0;

/** One AI decision, whatever the phase. */
function step(g: AuctionGameState): AuctionGameState {
	switch (g.phase.kind) {
		case 'bidding': {
			const seat = currentSeat(g)!;
			const d = chooseBid(g, scheme, seat);
			return d.bid === null ? passBid(g, seat) : placeBid(g, seat, d.bid);
		}
		case 'naming-trump':
			return nameTrump(g, g.biddingSeat!, chooseTrump(g, scheme, g.biddingSeat!));
		case 'discarding':
			return discardKitty(g, g.biddingSeat!, chooseKittyDiscards(g, scheme, g.biddingSeat!));
		case 'drawing': {
			const seat = currentSeat(g)!;
			return drawCards(g, seat, chooseDraw(g, scheme, seat));
		}
		case 'playing': {
			const seat = currentSeat(g)!;
			return playCard(g, scheme, seat, chooseCardAuction(g, scheme, seat));
		}
		default:
			return g;
	}
}

/** Every state of one full hand, for each bundled rules profile. */
function handStates(): AuctionGameState[] {
	const states: AuctionGameState[] = [];
	for (const config of Object.values(BUILTIN_PROFILES)) {
		for (const seed of [1, 2, 3]) {
			let g = startAuction(scheme, createRng(seed), 0, config);
			states.push(g);
			for (let i = 0; i < 80 && g.phase.kind !== 'hand-over'; i++) {
				g = step(g);
				states.push(g);
			}
			expect(g.phase.kind).toBe('hand-over');
		}
	}
	return states;
}

const states = handStates();
const view = (g: AuctionGameState) => auctionTableView(g, { humanSeat: HUMAN });
const byId = (ps: CardPlacement[]) => new Map(ps.map((p) => [p.id, p]));

describe('sideOf', () => {
	it('seats run south, east, north, west from the human', () => {
		expect([0, 1, 2, 3].map((s) => sideOf(s, 0))).toEqual(['south', 'east', 'north', 'west']);
		expect(sideOf(0, 2)).toBe('north');
	});
});

describe('layoutAuctionTable', () => {
	it('places every card in play exactly once, in every phase of a hand', () => {
		for (const g of states) {
			const ids = layoutAuctionTable(view(g)).map((p) => p.id);
			expect(new Set(ids).size).toBe(ids.length);
			const expected = [
				...g.hands.flat(),
				...g.kitty,
				...g.currentTrick.map((p) => p.card),
				...g.completedTricks.flatMap((t) => t.plays.map((p) => p.card))
			].map(cardId);
			expect([...ids].sort()).toEqual(expected.sort());
		}
	});

	it('never puts two cards in the same spot (wide and compact)', () => {
		for (const g of states) for (const compact of [false, true]) {
			const spots = layoutAuctionTable(view(g), { compact }).map(
				(p) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
			);
			expect(new Set(spots).size).toBe(spots.length);
		}
	});

	it('shows only your own hand face up; the kitty and other hands stay hidden', () => {
		for (const g of states) {
			const placed = byId(layoutAuctionTable(view(g)));
			for (const c of g.hands[HUMAN]) expect(placed.get(cardId(c))!.faceUp).toBe(true);
			for (const seat of [1, 2, 3]) {
				for (const c of g.hands[seat]) {
					expect(placed.get(cardId(c))).toMatchObject({ zone: 'opponent', faceUp: false, seat });
				}
			}
			for (const c of g.kitty) {
				expect(placed.get(cardId(c))).toMatchObject({ zone: 'kitty', faceUp: false });
			}
		}
	});

	it('seats your partner across, seat 1 on your right and seat 3 on your left', () => {
		const placed = layoutAuctionTable(view(states[0]));
		const xs = (seat: number) => placed.filter((p) => p.seat === seat).map((p) => p.x);
		const zs = (seat: number) => placed.filter((p) => p.seat === seat).map((p) => p.z);
		expect(Math.min(...xs(1))).toBeGreaterThan(Math.max(...xs(2)));
		expect(Math.max(...xs(3))).toBeLessThan(Math.min(...xs(2)));
		expect(Math.max(...zs(2))).toBeLessThan(Math.min(...zs(0)));
	});

	it('keeps a hand swollen by the kitty inside the width five cards take', () => {
		for (const compact of [false, true]) {
			const five = layoutAuctionTable(view(states[0]), { compact }).filter((p) => p.zone === 'hand');
			const span = (ps: CardPlacement[]) =>
				Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
			for (const g of states) {
				const hand = layoutAuctionTable(view(g), { compact }).filter((p) => p.zone === 'hand');
				if (hand.length > 5) expect(span(hand)).toBeLessThanOrEqual(span(five) + 1e-9);
			}
		}
		// The fixture really does include a human hand holding the kitty.
		expect(states.some((g) => g.hands.some((h) => h.length > 5))).toBe(true);
	});

	it('lays each trick card in front of the seat that played it', () => {
		const g = states.find((s) => s.currentTrick.length === 4 || s.currentTrick.length === 3)!;
		const placed = byId(layoutAuctionTable(view(g)));
		const spot = (seat: number) =>
			placed.get(cardId(g.currentTrick.find((p) => p.seat === seat)!.card))!;
		const seats = g.currentTrick.map((p) => p.seat);
		if (seats.includes(1) && seats.includes(3)) expect(spot(1).x).toBeGreaterThan(spot(3).x);
		if (seats.includes(0) && seats.includes(2)) expect(spot(0).z).toBeGreaterThan(spot(2).z);
		for (const p of g.currentTrick) expect(spot(p.seat)).toMatchObject({ zone: 'trick', faceUp: true });
	});

	it('marks the winner of a finished trick, then sweeps it to that team’s pile', () => {
		const g = states.find((s) => s.completedTricks.length === 2 && s.currentTrick.length === 0)!;
		const trick = g.completedTricks[1];
		const shown = byId(
			layoutAuctionTable(auctionTableView(g, { humanSeat: HUMAN, shownTrick: trick }))
		);
		for (const play of trick.plays) {
			expect(shown.get(cardId(play.card))).toMatchObject({
				zone: 'trick',
				winner: play.seat === trick.winner
			});
		}
		const swept = layoutAuctionTable(view(g)).filter((p) => p.zone === 'pile');
		expect(swept).toHaveLength(8);
		const mine = swept.filter((p) => p.seat! % 2 === HUMAN % 2);
		const theirs = swept.filter((p) => p.seat! % 2 !== HUMAN % 2);
		if (mine.length && theirs.length) {
			expect(Math.min(...mine.map((p) => p.z))).toBeGreaterThan(Math.max(...theirs.map((p) => p.z)));
		}
	});

	it('raises and dims the cards it is told to, and honours the display order', () => {
		const g = states[0];
		const hand = [...g.hands[HUMAN]].reverse();
		const placed = byId(
			layoutAuctionTable(
				auctionTableView(g, {
					humanSeat: HUMAN,
					displayHand: hand,
					pickable: true,
					raised: [hand[0], hand[2]],
					dimmed: [hand[1]]
				})
			)
		);
		expect(placed.get(cardId(hand[0]))!.raised).toBe(true);
		expect(placed.get(cardId(hand[2]))!.raised).toBe(true);
		expect(placed.get(cardId(hand[1]))).toMatchObject({ raised: false, dimmed: true, pickable: true });
		const xs = hand.map((c) => placed.get(cardId(c))!.x);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
	});

	it('keeps every card within the area the camera is fitted to', () => {
		for (const compact of [false, true]) {
			const pts = auctionArrangement(compact).fitPoints;
			const maxX = Math.max(...pts.map((p) => Math.abs(p[0])));
			const minZ = Math.min(...pts.map((p) => p[2]));
			for (const g of states) {
				for (const p of layoutAuctionTable(view(g), { compact })) {
					expect(Math.abs(p.x), `${p.zone} ${p.id}`).toBeLessThanOrEqual(maxX);
					expect(p.z).toBeGreaterThanOrEqual(minZ);
				}
			}
		}
	});

	it('stands every portrait at the table edge, outward of that player’s cards', () => {
		for (const compact of [false, true]) {
			const [north, east, west] = auctionArrangement(compact).portraitSpots;
			const placed = layoutAuctionTable(view(states[0]), { compact });
			const cards = (seat: number) => placed.filter((p) => p.seat === seat);
			const mid = (v: number[]) => (Math.min(...v) + Math.max(...v)) / 2;

			// North: beyond the partner's row, centred on it.
			expect(north.z).toBeLessThan(Math.min(...cards(2).map((p) => p.z)) - 0.7);
			expect(north.x).toBeCloseTo(mid(cards(2).map((p) => p.x)), 5);

			// East and west: beyond their rows in x (not behind them in z), level
			// with the middle of the row — the same relationship north has.
			expect(east.x).toBeGreaterThan(Math.max(...cards(1).map((p) => p.x)) + 0.7);
			expect(west.x).toBeLessThan(Math.min(...cards(3).map((p) => p.x)) - 0.7);
			expect(east.z).toBeCloseTo(mid(cards(1).map((p) => p.z)), 5);
			expect(west.z).toBeCloseTo(mid(cards(3).map((p) => p.z)), 5);
			expect(west.x).toBeCloseTo(-east.x, 5);
		}
	});

	it('has a portrait spot for each of the three other players', () => {
		expect(auctionArrangement(false).portraitSpots).toHaveLength(3);
		expect(auctionArrangement(true).portraitSpots).toHaveLength(3);
	});
});
