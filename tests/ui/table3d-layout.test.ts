/**
 * The pure half of the experimental 3D table (doc/BRAINSTORM-3D.md): where every
 * card sits for a given moment of a 1v1 game. No three.js here — the layout is
 * plain numbers, so it is checked the way the rest of the UI helpers are, by
 * driving it with real game states.
 */
import { describe, it, expect } from 'vitest';
import { cardId, type Card } from '$lib/domain/cards.js';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import {
	currentSeat,
	declineRob,
	playCard,
	startGame,
	type GameState
} from '$lib/domain/game-state.js';
import { analyzePlays } from '$lib/domain/rules-engine.js';
import { chooseCard } from '$lib/ai/heuristic.js';
import {
	CARD_H,
	CARD_W,
	deckSpot,
	tableExtents,
	layoutTable,
	tableViewFromGame,
	type CardPlacement
} from '$lib/ui/table3d/layout.js';

const scheme = STANDARD_SCHEME;
const HUMAN = 0;
const AI = 1;

/** A dealt game with any rob decision declined, ready for the first lead. */
function dealt(seed: number): GameState {
	let g = startGame(scheme, createRng(seed), 0);
	while (g.phase.kind === 'robbing') g = declineRob(g);
	return g;
}

/** Play `n` cards with the heuristic AI in both seats. */
function playCards(g: GameState, n: number): GameState {
	for (let i = 0; i < n && g.phase.kind === 'playing'; i++) {
		const seat = currentSeat(g)!;
		g = playCard(g, scheme, seat, chooseCard(g, scheme, seat));
	}
	return g;
}

function byId(placements: CardPlacement[]): Map<string, CardPlacement> {
	return new Map(placements.map((p) => [p.id, p]));
}

function view(g: GameState, extra: Partial<Parameters<typeof tableViewFromGame>[1]> = {}) {
	return tableViewFromGame(g, { humanSeat: HUMAN, ...extra });
}

describe('layoutTable', () => {
	it('places every card in play exactly once', () => {
		for (const seed of [1, 2, 3, 4, 5]) {
			for (const played of [0, 1, 2, 5, 9, 10]) {
				const g = playCards(dealt(seed), played);
				const placements = layoutTable(view(g));
				const ids = placements.map((p) => p.id);
				expect(new Set(ids).size, `seed ${seed}, ${played} played`).toBe(ids.length);

				const expected = [
					...g.hands[HUMAN],
					...g.hands[AI],
					...g.currentTrick.map((p) => p.card),
					...g.completedTricks.flatMap((t) => t.plays.map((p) => p.card)),
					...(g.turnUpTaken ? [] : [g.turnUp])
				].map(cardId);
				expect([...ids].sort()).toEqual([...new Set(expected)].sort());
			}
		}
	});

	it('shows your hand face up and the opponent’s face down', () => {
		const g = dealt(7);
		const placed = byId(layoutTable(view(g)));
		for (const c of g.hands[HUMAN]) {
			expect(placed.get(cardId(c))).toMatchObject({ zone: 'hand', faceUp: true });
		}
		for (const c of g.hands[AI]) {
			expect(placed.get(cardId(c))).toMatchObject({ zone: 'opponent', faceUp: false });
		}
		expect(placed.get(cardId(g.turnUp))).toMatchObject({ zone: 'turn-up', faceUp: true });
	});

	it('puts your hand nearest the camera and the opponent across the table', () => {
		const g = dealt(7);
		const placements = layoutTable(view(g));
		const hand = placements.filter((p) => p.zone === 'hand');
		const opp = placements.filter((p) => p.zone === 'opponent');
		expect(Math.min(...hand.map((p) => p.z))).toBeGreaterThan(Math.max(...opp.map((p) => p.z)));
		// Left-to-right order on screen matches the order of the hand in state.
		const xs = g.hands[HUMAN].map((c) => byId(placements).get(cardId(c))!.x);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
	});

	it('only makes hand cards pickable, and only when the view says so', () => {
		const g = dealt(7);
		const off = layoutTable(view(g, { pickable: false }));
		expect(off.some((p) => p.pickable)).toBe(false);
		const on = layoutTable(view(g, { pickable: true }));
		expect(on.filter((p) => p.pickable).map((p) => p.zone)).toEqual(
			g.hands[HUMAN].map(() => 'hand')
		);
	});

	it('dims the illegal cards it is told about and raises the selected one', () => {
		const g = playCards(dealt(3), 1);
		const analysis = analyzePlays(
			g.hands[currentSeat(g)!],
			g.currentTrick[0]?.card ?? null,
			g.trumpSuit,
			scheme
		);
		const hand = g.hands[HUMAN];
		const dimmed: Card[] = [hand[0]];
		const placed = byId(layoutTable(view(g, { dimmed, selected: hand[1] })));
		expect(placed.get(cardId(hand[0]))!.dimmed).toBe(true);
		expect(placed.get(cardId(hand[1]))!.dimmed).toBe(false);
		expect(placed.get(cardId(hand[1]))!.raised).toBe(true);
		expect(placed.get(cardId(hand[1]))!.y).toBeGreaterThan(placed.get(cardId(hand[2]))!.y);
		expect(analysis.legal.length).toBeGreaterThan(0);
	});

	it('lays the trick face up in the middle, each card on its player’s side', () => {
		const g = playCards(dealt(4), 1);
		const play = g.currentTrick[0];
		const p = byId(layoutTable(view(g))).get(cardId(play.card))!;
		expect(p).toMatchObject({ zone: 'trick', faceUp: true });
		expect(Math.abs(p.z)).toBeLessThan(1.5);
	});

	it('keeps a finished trick on the table, winner marked, until it is swept', () => {
		const g = playCards(dealt(4), 2);
		const trick = g.completedTricks[0];
		const shown = byId(layoutTable(view(g, { shownTrick: trick })));
		for (const play of trick.plays) {
			const p = shown.get(cardId(play.card))!;
			expect(p.zone).toBe('trick');
			expect(p.winner).toBe(play.seat === trick.winner);
		}
		// Swept: the same cards are now face down in the winner's pile.
		const swept = byId(layoutTable(view(g)));
		for (const play of trick.plays) {
			expect(swept.get(cardId(play.card))).toMatchObject({
				zone: 'pile',
				faceUp: false,
				seat: trick.winner
			});
		}
	});

	it('keeps the two players’ trick piles apart', () => {
		const g = playCards(dealt(6), 10);
		const piles = layoutTable(view(g)).filter((p) => p.zone === 'pile');
		expect(piles).toHaveLength(10);
		const mine = piles.filter((p) => p.seat === HUMAN);
		const theirs = piles.filter((p) => p.seat === AI);
		if (mine.length && theirs.length) {
			expect(Math.min(...mine.map((p) => p.z))).toBeGreaterThan(
				Math.max(...theirs.map((p) => p.z))
			);
		}
	});

	it('never puts two cards in the same spot', () => {
		for (const played of [0, 3, 6, 10]) for (const compact of [false, true]) {
			const placements = layoutTable(view(playCards(dealt(8), played)), { compact });
			const spots = placements.map(
				(p) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
			);
			expect(new Set(spots).size).toBe(spots.length);
		}
	});

	it('keeps everything on the table, clear of the stock (wide and compact)', () => {
		for (const played of [0, 3, 6, 10]) for (const compact of [false, true]) {
			const deck = deckSpot(compact);
			const { sideHalfWidth } = tableExtents(compact);
			for (const p of layoutTable(view(playCards(dealt(8), played)), { compact })) {
				expect(Math.abs(p.x) + CARD_W / 2).toBeLessThanOrEqual(sideHalfWidth + 0.05);
				expect(Math.abs(p.z)).toBeLessThanOrEqual(4);
				const overDeck =
					Math.abs(p.x - deck.x) < CARD_W * 0.9 && Math.abs(p.z - deck.z) < CARD_H * 0.9;
				expect(overDeck, `${p.id} in ${p.zone}`).toBe(false);
			}
		}
	});

	it('compact draws the hand tighter and the far side nearer', () => {
		const g = dealt(7);
		const wide = layoutTable(view(g));
		const tight = layoutTable(view(g), { compact: true });
		const span = (ps: CardPlacement[], zone: string) => {
			const xs = ps.filter((p) => p.zone === zone).map((p) => p.x);
			return Math.max(...xs) - Math.min(...xs);
		};
		expect(span(tight, 'hand')).toBeLessThan(span(wide, 'hand'));
		const oppZ = (ps: CardPlacement[]) => ps.find((p) => p.zone === 'opponent')!.z;
		expect(oppZ(tight)).toBeGreaterThan(oppZ(wide));
	});

	it('deals in turn: the stagger order alternates between the two hands', () => {
		const placements = layoutTable(view(dealt(9)));
		const order = placements
			.filter((p) => p.zone === 'hand' || p.zone === 'opponent')
			.sort((a, b) => a.order - b.order)
			.map((p) => p.zone);
		expect(order.slice(0, 4)).toEqual(['hand', 'opponent', 'hand', 'opponent']);
	});
});
