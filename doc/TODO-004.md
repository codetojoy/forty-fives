
### TODO-004

This is a tooling/docs task. No new milestones or change in functionality.

Context: the development machine previously defaulted to Node v23, which the Svelte
tooling rejects (`@sveltejs/vite-plugin-svelte` engines: `^20.19 || ^22.12 || >=24`,
enforced by `engine-strict=true`). The workaround was a keg-only Homebrew `node@22`
plus a PATH prefix (`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`) on every
npm/node command. The machine's default Node has since been upgraded to v26.3.0,
which satisfies the engines range, so the workaround is obsolete.

The goal is to remove the PATH prefix workaround and the lock to node@22:

- Update `CLAUDE.md`: delete the "Node version (required)" section's node@22/PATH-prefix
  instructions and replace them with the actual requirement (Node matching the
  `engines` range in `package.json`, currently `^20.19 || ^22.12 || >=24`).
- Remove the PATH prefix from any other project docs or scripts that reference it.
- Do **not** change `package.json` `engines` or `.npmrc` `engine-strict=true` — the
  range tracks what the Svelte tooling supports and the strictness is what catches a
  bad Node early. Loosening either is out of scope.
- Verify under the default Node (no prefix): `npm ci` or `npm install`, `npm test`,
  `npm run check`, `npm run build`, and a quick `npm run preview` smoke check.

Out of scope (machine housekeeping, not repo work): uninstalling the Homebrew
`node@22` keg and cleaning up any personal shell init or scratch scripts that set
the PATH prefix.
