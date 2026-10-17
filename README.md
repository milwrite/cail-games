# CAIL Games — inference arcade

Shared entry point for Cadavre Exquis, JeopardyLM, Cloze Reader, Haggle, and LanGames:
https://games.ailab-452.workers.dev/

The charcoal grid holds five minimal cards. Discrete neon accents appear on hover, focus, or press. Fonts and the CUNY AI Lab logo are served locally. The home page has no browser scripts.

Each card opens an individual project page with its author, GitHub link, description, Play link, and three-view screenshot gallery. Previews rotate every six seconds while visible, stop on hover or keyboard focus, and provide previous, next, and pause controls. Reduced-motion preferences disable automatic rotation. The common Worker resolves `/play/:game/` to the verified application origin. It preserves deep paths and saved-work query strings. The three integrated games have Games links back to this arcade; navigating away waits for pending account saves. CUNY Login opens the existing Lab workspace.

The applications retain their current identity, inference secrets, and persistent records. No game bundle or data is copied into this hub. Service bindings connect all three games for `/health`, which reports each serving release and returns 503 if a game is unavailable.

```sh
npm install
npm run check
npm test
npm run build
npx wrangler deploy --dry-run
npx wrangler deploy --var RELEASE:$(git rev-parse --short HEAD)
```

`npm run dev` builds and previews the static design at http://127.0.0.1:4173. Use Wrangler for the Worker launch and health routes. The earlier contribution draft modules remain in source for reference; the published build includes only the active HTML, CSS, and assets.

See `DESIGN.md` for the design and asset provenance. The earlier Games plan in `docs/` is historical planning, not a statement of current deployment status.

The previous cail-games Worker redirects paths and queries to games.ailab-452.workers.dev. Deploy its alias with `npx wrangler deploy --config wrangler.legacy.jsonc --var RELEASE:<commit>`.

## Refreshing previews

The fifteen JPEGs in `public/previews/` are unchanged screenshots of the live games. `captures.json` records their captions, source URLs, capture times, and any sample-content attribution. LanGames uses the author's public German lesson, linked in that manifest. Account credentials and saved-work query strings are excluded from capture metadata.

Use the connected browser to prepare each real view, then run the capture helper in that browser session:

```js
const { capturePreview } = await import('/Users/milwright/Projects/dev/cail-games/scripts/capture-previews.mjs');
await capturePreview(tab, {
  game: 'cloze', view: 1, caption: 'Read the passage',
  alt: 'Cloze Reader passage with one missing word and reading context.',
  source: 'https://cloze.ailab-452.workers.dev/'
});
```

Repeat for views 1–3 of each game. The helper captures the viewport and updates the manifest automatically. Use the default desktop viewport, wait for visible loading indicators to finish, and review every captured image before rebuilding. `npm run build` requires three captures for every game and checks that their files exist. No model calls run when someone views a gallery.
