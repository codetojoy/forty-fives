/**
 * localStorage persistence for trainer settings and score (SPEC §4: state is
 * in-memory, persisted to localStorage). Safe to call during SSR/prerender —
 * it just returns defaults.
 */

import { browser } from '$app/environment';
import type { Suit } from '$lib/domain/cards.js';

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
