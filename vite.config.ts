import { execSync } from 'node:child_process';
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

// Build-time metadata baked into the prerendered /about page (TODO-006). Captured
// at config-eval time and injected via `define` (textual replacement), so the values
// end up as literals in the static HTML — no runtime/network lookup. Bump the version
// here manually for now. The commit hash is HEAD at build time, so a later
// "bump version" commit won't be reflected — that's acceptable per the spec.
const appVersion = '0.0.9';
const buildTime = new Date().toISOString();
let gitCommit = 'unknown';
try {
	gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
	// Not a git checkout (or git unavailable): leave the fallback.
}

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
	define: {
		__APP_VERSION__: JSON.stringify(appVersion),
		__BUILD_TIME__: JSON.stringify(buildTime),
		__GIT_COMMIT__: JSON.stringify(gitCommit)
	},
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
