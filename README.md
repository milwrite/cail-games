# CAIL Games — inference arcade

Shared entry point for Exquisite Corpse, Jeopardy, and Cloze Reader:
https://cail-games.ailab-452.workers.dev/

The charcoal grid holds three minimal cards. Cyan, violet, and pink accents appear on hover, focus, or press. Fonts and the CUNY AI Lab logo are served locally. The page has no browser scripts.

The common Worker serves the arcade and resolves `/cadavre/`, `/jeopardy/`, and `/cloze/` to the current application origins. It preserves deep paths and saved-work query strings. Each game has a Games link back to this arcade; navigating away waits for pending account saves. CUNY Login opens the existing Lab workspace.

The applications retain their current identity, inference secrets, and persistent records. No game bundle or data is copied into this hub. Service bindings connect all three games for `/health`, which reports each serving release and returns 503 if a game is unavailable.

```sh
npm install
npm run check
npm test
npm run build
npx wrangler deploy --dry-run
npx wrangler deploy --var RELEASE:$(git rev-parse --short HEAD)
```

`npm run dev` previews the static design at http://127.0.0.1:4173. Use Wrangler for the Worker launch and health routes. The earlier contribution draft modules remain in source for reference; the published build includes only the active HTML, CSS, and assets.

See `DESIGN.md` for the design and asset provenance. The earlier Games plan in `docs/` is historical planning, not a statement of current deployment status.
