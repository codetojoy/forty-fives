import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// Base path for subpath hosting (e.g. GitHub Pages project site). Defaults to ''
// so `npm run dev` and root deploys serve from '/'; set BASE_PATH=/forty-fives
// for a gh-pages build (see doc/DEPLOY.md / doc/TODO-005.md). SvelteKit requires
// '' or a string starting with '/', so normalize a missing leading slash.
const rawBase = process.env.BASE_PATH ?? '';
const base = (rawBase && !rawBase.startsWith('/') ? `/${rawBase}` : rawBase) as
	| ''
	| `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			paths: { base }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
