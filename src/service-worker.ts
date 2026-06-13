/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Offline support via SvelteKit's built-in service worker
 * (https://svelte.dev/docs/kit/service-workers). Strategy:
 *   - precache the app shell (built JS/CSS) and everything in static/
 *   - serve precached assets cache-first
 *   - for anything else, try the network and fall back to the cache,
 *     so the trainer keeps working with no connection.
 */

import { base, build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `forty-fives-${version}`;
// `base` is '' at the root and e.g. '/forty-fives' for subpath hosting, so the
// app-shell entry and offline fallback below resolve correctly either way.
// `.nojekyll` ships in static/ only to disable Jekyll on GitHub Pages — it is not
// an app asset and a host may not serve a request for it, so exclude it from the
// precache (cache.addAll rejects on any failed fetch, which fails the install).
const ASSETS = [
	...build,
	...files.filter((f) => !f.endsWith('/.nojekyll')),
	...new Set([...prerendered, `${base}/`])
];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			const cached = await cache.match(event.request);
			if (cached) return cached;

			try {
				const response = await fetch(event.request);
				if (response.ok && new URL(event.request.url).origin === location.origin) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch (err) {
				// Offline navigation falls back to the cached app shell.
				if (event.request.mode === 'navigate') {
					const shell = await cache.match(`${base}/`);
					if (shell) return shell;
				}
				throw err;
			}
		})()
	);
});
