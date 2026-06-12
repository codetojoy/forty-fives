/**
 * localStorage persistence for trainer settings and score (SPEC §4: state is
 * in-memory, persisted to localStorage). Safe to call during SSR/prerender —
 * it just returns defaults.
 */

import { browser } from '$app/environment';
import type { Suit } from '$lib/domain/cards.js';
import { isPlausibleGameState, type GameState } from '$lib/domain/game-state.js';

export type TrumpChoice = Suit | 'random';

export interface TrainerStats {
	asked: number;
	correct: number;
	streak: number;
	bestStreak: number;
}

export interface SavedState {
	stats: TrainerStats;
	trumpChoice: TrumpChoice;
}

const STORAGE_KEY = 'forty-fives.trainer.v1';

export function emptyStats(): TrainerStats {
	return { asked: 0, correct: 0, streak: 0, bestStreak: 0 };
}

function defaults(): SavedState {
	return { stats: emptyStats(), trumpChoice: 'random' };
}

function isCount(n: unknown): n is number {
	return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function loadSaved(): SavedState {
	if (!browser) return defaults();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults();
		const parsed = JSON.parse(raw) as SavedState;
		const s = parsed.stats;
		if (!s || !isCount(s.asked) || !isCount(s.correct) || !isCount(s.streak) || !isCount(s.bestStreak)) {
			return defaults();
		}
		return { stats: s, trumpChoice: parsed.trumpChoice ?? 'random' };
	} catch {
		return defaults();
	}
}

export function saveState(state: SavedState): void {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage may be unavailable (private browsing); the trainer still works.
	}
}

// --- Game persistence (Milestone 1) ------------------------------------------

export interface GameSettings {
	/** Highlight which cards are legal to play (SPEC §7, toggleable). */
	highlightLegal: boolean;
	/** Tap once to raise, tap again to play (SPEC §7, default on). */
	confirmPlay: boolean;
}

export interface SavedGame {
	game: GameState | null;
	settings: GameSettings;
	opponentName: string;
}

const GAME_KEY = 'forty-fives.game.v1';

function gameDefaults(): SavedGame {
	return {
		game: null,
		settings: { highlightLegal: true, confirmPlay: true },
		opponentName: 'Margaret'
	};
}

export function loadGame(): SavedGame {
	if (!browser) return gameDefaults();
	try {
		const raw = localStorage.getItem(GAME_KEY);
		if (!raw) return gameDefaults();
		const parsed = JSON.parse(raw) as SavedGame;
		const d = gameDefaults();
		return {
			game: isPlausibleGameState(parsed.game) ? parsed.game : null,
			settings: {
				highlightLegal: parsed.settings?.highlightLegal ?? d.settings.highlightLegal,
				confirmPlay: parsed.settings?.confirmPlay ?? d.settings.confirmPlay
			},
			opponentName:
				typeof parsed.opponentName === 'string' && parsed.opponentName
					? parsed.opponentName
					: d.opponentName
		};
	} catch {
		return gameDefaults();
	}
}

export function saveGame(saved: SavedGame): void {
	if (!browser) return;
	try {
		localStorage.setItem(GAME_KEY, JSON.stringify(saved));
	} catch {
		// Storage may be unavailable; the game still works, it just won't resume.
	}
}
