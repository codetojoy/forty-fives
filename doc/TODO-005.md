
### TODO-005 [COMPLETE]

This is a deployment/hosting task. No new milestones or change in game functionality.

The goal is to publish the app on the web. `doc/DEPLOY.md` already surveys the landscape;
this item is to actually pick an option and make the code changes (if any) it requires.
The repo is `codetojoy/forty-fives`, so a GitHub Pages **project** site serves from the
subpath `https://codetojoy.github.io/forty-fives/`, while a custom domain or a
`codetojoy.github.io` user-site repo serves from the root. That root-vs-subpath choice is
what determines whether code changes are needed — see the options below.

Reminder: the app is fully static (adapter-static, all routes prerendered) and makes no
runtime network calls; the fonts are self-hosted and a service worker precaches the shell
for offline use. Whatever option is chosen must preserve those properties (privacy +
offline, SPEC §3/§7). HTTPS is required for the service worker; all hosts below provide it.

---

#### Option 1 — GitHub Pages via a `gh-pages` branch (subpath)

Classic branch-based publish to `https://codetojoy.github.io/forty-fives/`. Requires the
base-path code changes in the "Subpath prerequisites" section below, because the site is
served from `/forty-fives/`, not the domain root.

Deploy loop once the code changes are in:

```sh
BASE_PATH=/forty-fives npm run build     # base-aware static build into build/
npx gh-pages -d build --dotfiles         # publish build/ to the gh-pages branch
```

Then once, in the repo: **Settings → Pages → Source: "Deploy from a branch" →
`gh-pages` / `(root)`**. Re-running the two commands redeploys.

#### Option 2 — GitHub Pages via GitHub Actions (subpath)

Same subpath URL and the **same base-path prerequisites as Option 1**, but CI builds and
publishes instead of a local push — no `gh-pages` branch to maintain, and the artifact
path skips Jekyll automatically. Use the workflow sketched in `doc/DEPLOY.md` (Node from
the `engines` range; build with `BASE_PATH=/forty-fives`; `upload-pages-artifact` →
`deploy-pages`). Set **Settings → Pages → Source: "GitHub Actions"**.

#### Option 3 — GitHub Pages at the root (no code changes)

Serve from a domain root so today's build works unmodified:

- a **custom domain** (Settings → Pages → Custom domain), or
- a **`codetojoy.github.io`** user-site repo.

No base-path changes; deploy via either a branch or the Actions workflow. This is the
lowest-effort path if owning/pointing a domain is acceptable.

#### Option 4 — another static host at the root (no code changes)

The `build/` directory deploys as-is to **Cloudflare Pages**, **Netlify**, or **Vercel**
(each serves at the root of its own subdomain). Prefer a host that injects no analytics,
to keep the SPEC §3 privacy promise.

---

#### Subpath prerequisites (needed only for Options 1 & 2)

Without a base path the prerendered HTML loads but its `/_app/*.js` references 404, so the
page is blank. The hard-coded domain-root paths that must become base-aware:

1. **Base path config** — in `vite.config.ts`, drive it from an env var so `npm run dev`
   and root deploys stay at `/`: `const base = process.env.BASE_PATH ?? ''` and pass
   `paths: { base }` to `sveltekit({ … })` alongside `adapter`.
2. **Internal links** — `src/routes/+page.svelte` (`/play`, `/trainer`),
   `src/routes/play/+page.svelte` and `src/routes/trainer/+page.svelte` (`/`): import
   `base` from `$app/paths` and prefix each `href`.
3. **Font `@font-face` URLs** — the five `url('/fonts/…')` in `src/routes/+layout.svelte`.
   CSS `url()` in a component style is not base-rewritten; move the `@font-face` blocks
   into a `<style>` in `src/app.html` and use `url('%sveltekit.assets%/fonts/…')`. Keep the
   `:root` tokens and body styles in the layout.
4. **Manifest** — make `static/manifest.webmanifest` paths relative (`start_url: "."`,
   `scope: "./"`, icons `"./icon-192.png"` …) so they resolve against the manifest's own
   subpath URL. These still work at root, so the change is safe for every option.
5. **Service worker** — `src/service-worker.ts` hard-codes `'/'` (the precache entry and
   the offline-shell fallback). Import `base` from `$service-worker` and use `` `${base}/` ``
   in both places. (`build`/`files`/`prerendered` already carry the base.)
6. **Jekyll opt-out** — add an empty `static/.nojekyll` (adapter-static copies it into
   `build/`) so GitHub Pages does not strip the `_app/` directory. Needed for Option 1;
   harmless for the others. The Actions artifact path (Option 2) already skips Jekyll.

Out of scope / do not change: `package.json` `engines`, `.npmrc` `engine-strict`, and the
game/domain logic. Keep the base path env-driven so the default (`dev`, root deploys)
stays at `/`.

Acceptance: `BASE_PATH=/forty-fives npm run build && npm run preview` serves a working
app under the subpath (routes navigate, fonts load, manifest + icons resolve, service
worker registers and offline reload works), and a plain `npm run build` / `npm run dev`
still works at the root.
