/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Offline support via SvelteKit's built-in service worker
 * (https://svelte.dev/docs/kit/service-workers). Strategy:
 *   - precache the app shell (built JS/CSS) and everything in static/
 *   - serve content-hashed build assets cache-first (their URLs are immutable, so
 *     this is fast and always correct)
 *   - serve HTML navigations (and anything else) network-first, falling back to
 *     the cache when offline. Network-first on HTML means a new deploy shows up
 *     on the next normal reload — no hard refresh needed — while the app still
 *     works with no connection.
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

// Content-hashed app assets (a new build gives them new URLs), so a cached copy
// is never stale — serve those cache-first.
const immutable = new Set(build);

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);

	// Immutable build assets: cache-first.
	if (url.origin === location.origin && immutable.has(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			})
		);
		return;
	}

	// Everything else (HTML navigations, static files): network-first so new
	// deploys show immediately when online; fall back to the cache when offline.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(event.request);
				if (response.ok && url.origin === location.origin) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch (err) {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				if (event.request.mode === 'navigate') {
					const shell = await cache.match(`${base}/`);
					if (shell) return shell;
				}
				throw err;
			}
		})()
	);
});
