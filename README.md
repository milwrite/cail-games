# CAIL Games — inference arcade

Shared entry point for Cadavre Exquis, JeopardyLM, Cloze Reader, Haggle, LanGames, and CLI Adventures:
https://games.ailab-452.workers.dev/

The charcoal grid holds six minimal cards, separated by 48px on desktop and 40px on tablets and phones. Neon accents appear on hover, focus, press, and snake visits. Fonts and the CUNY AI Lab logo are served locally. The home page uses lightweight scripts for its title lights and decorative snake.

Each card opens an individual project page with its author, GitHub link, description, Play link, and three-view screenshot gallery. Previews rotate every six seconds while visible, stop on hover or keyboard focus, and provide a single Pause/Continue control. Reduced-motion preferences disable automatic rotation. The common Worker resolves `/play/:game/` to the verified application origin. It preserves deep paths and saved-work query strings. The three integrated games have Games links back to this arcade; navigating away waits for pending account saves. CUNY Login opens the existing Lab workspace.

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

CLI Adventures is hosted on the Lab’s cli-adventures Worker. Its card has a source-checked description and three live screenshots. Title letters stay colored, with a soft highlight sweeping left to right and back over twelve seconds. When the snake reaches a card waypoint, that card’s border and arrow fade in for 600ms, hold their accent for three seconds, and fade out over 2.4 seconds. Repeated visits preserve a glow already in progress. Pause lights controls the title and card lights only; reduced motion, a hidden tab, or scrolling the relevant element offscreen also stops those effects.

The decorative snake weaves through the gaps between cards, crosses the gaps between successive rows, and travels from header to footer and back while avoiding text. On phones it alternates left and right across the single-column card gaps. It eats five steady amber pellets along each full circuit, growing from 36 to at most 96 segments; returning to the header resets the tail and replenishes the pellets. It has no visible pause control; operating-system reduced motion and forced colors disable it, and hidden tabs suspend it. Its native canvas does not intercept clicks and adds no dependencies; gallery content and Worker routes are unchanged.
