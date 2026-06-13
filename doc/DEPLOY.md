# Deploying Forty-Fives

## Short answer

**Yes — the app is a fully static site and can be hosted on GitHub Pages**, with one
caveat: the build currently assumes it is served from the **root of a domain** (`/`).
`npm run build` (adapter-static) prerenders every route into `build/` — plain HTML, JS,
CSS, fonts, and a service worker, with no server code and no runtime network calls — so
any static host works. But a *default* GitHub Pages project site serves from a subpath
(`https://<user>.github.io/forty-fives/`), and several things in the app are written as
root-absolute paths:

- `static/manifest.webmanifest` — `start_url: "/"`, `scope: "/"`, icon `src` values
- `src/routes/+layout.svelte` — `@font-face` URLs (`/fonts/*.woff2`)
- `src/service-worker.ts` — the `'/'` precache entry and offline shell fallback
- Internal links (`/`, `/trainer`, `/play`) in the route components

Served from a subpath without changes, fonts, the PWA manifest, and offline support
would break. Pick one of the options below.

## Option A (recommended): GitHub Pages at a root URL — zero code changes

Serve from a domain root so the build works exactly as-is. Either:

- **Custom domain**: in the repo, *Settings → Pages → Custom domain* (e.g.
  `fortyfives.example.com`). GitHub provisions HTTPS, which the service worker requires.
- **User/organization site**: host from a repo named `<user>.github.io` (serves at that
  root). Usually not worth it just for this app — prefer the custom domain.

Then deploy with GitHub Actions (*Settings → Pages → Source: “GitHub Actions”*). The
CI Node version must satisfy the `engines` range in `package.json`
(`^20.19 || ^22.12 || >=24`) — the repo sets `engine-strict`, so a mismatch fails the build.

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(Deploying via the Actions artifact skips Jekyll, so SvelteKit's `_app/` directory is
served correctly. If you instead publish from a branch, add an empty `.nojekyll` file to
`static/` — Jekyll would otherwise drop underscore-prefixed directories.)

## Option B: GitHub Pages at the default project URL (subpath)

To serve from `https://<user>.github.io/forty-fives/`, the root-absolute paths above
must become base-aware first:

1. Set `paths: { base: '/forty-fives' }` in the SvelteKit options (the `sveltekit({...})`
   call in `vite.config.ts`) — ideally from an env var so local dev stays at `/`.
2. Build internal links with `base` from `$app/paths` instead of hard-coded `/trainer` etc.
3. Make the manifest subpath-relative (`start_url: "./"`, `scope: "./"`, `"icon.svg"`, …)
   or generate it with the base prefixed.
4. Prefix the `@font-face` URLs and the service worker's `'/'` entries with `base`.

This is a small but real change set touching the PWA/offline plumbing — test
`npm run build && npm run preview` plus an offline reload afterwards. Only worth it if a
custom domain is off the table.

## Other static hosts (also zero code changes)

The same `build/` directory deploys unchanged to any host that serves a site at the root
of its own (sub)domain: **Cloudflare Pages**, **Netlify**, **Vercel**, or
`npx serve build` on anything self-hosted. For the privacy goals in SPEC §3, prefer a
host that doesn't inject analytics scripts (GitHub Pages and Cloudflare Pages don't).

## Things that already just work

- All three routes are prerendered (`index.html`, `trainer.html`, `play.html`), so no
  SPA-fallback configuration is needed.
- The service worker precaches the app shell + `static/` (including the self-hosted
  fonts), so the deployed app works offline after the first visit. It requires HTTPS,
  which all hosts above provide.
- No environment variables, API keys, or server runtime are involved anywhere.
