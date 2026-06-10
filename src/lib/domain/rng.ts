/**
 * Small seedable PRNG (mulberry32) so question generation is deterministic
 * under test and unbiased enough for gameplay.
 */

export interface Rng {
	/** Float in [0, 1). */
	next(): number;
	/** Integer in [0, n). */
	int(n: number): number;
	/** Uniformly random element. */
	pick<T>(items: readonly T[]): T;
	/** True with probability p. */
	chance(p: number): boolean;
}

export function createRng(seed: number = Date.now() >>> 0): Rng {
	let state = seed >>> 0;
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (n) => Math.floor(next() * n),
		pick: (items) => {
			if (items.length === 0) throw new Error('Cannot pick from an empty list');
			return items[Math.floor(next() * items.length)];
		},
		chance: (p) => next() < p
	};
}
