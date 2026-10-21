# Arcade design specification

The arcade uses the following design:

- Charcoal background with a fine 24px grid, larger 120px cross grid, and small cross marks
- Six equal minimal cards, each with a single full-card link
- Cyan, violet, pink, amber, lime, and blue accents appear on interaction and glow for six seconds when the snake visits, with visible keyboard focus
- White CAIL logo and restrained Games wordmark
- Lowercase inference arcade title and direct game descriptions
- A quiet CUNY Login in the top right
- Responsive single-column cards on phones; touch targets at least 44px
- A static home page and lightweight screenshot galleries on the project pages; no model calls run in the hub

The site links the current deployed games through a common Worker. Cadavre, Jeopardy, and Cloze include a Games link back, with their existing save guards. Haggle and LanGames launch the authors' existing installations.

## Assets and provenance

`public/assets/cail-logo-white.png` is the unchanged CUNY AI Lab logo downloaded from Google Drive: https://drive.google.com/file/d/1MJSOzGUjVFxjn3J3VnTfSBZDbPCN-cOl/view

Size: 10,337 bytes. SHA-256: `4d868d8174b9ef63d1e436f8e1f6f02a63bab56539c2de5f9bbdc6e785c9580f`.

IBM Plex Mono and IBM Plex Sans are reused from the existing Inference Arcade's local web assets. They are SIL Open Font License fonts from https://github.com/IBM/plex. Font licenses are in `public/assets/fonts/OFL.txt`.

The grid and control effects are native CSS, as the user requested. They are not generated imagery or simulated gameplay.

Project pages use a two-column identity and description layout, stacked on phones. Barlow and Barlow Condensed match the hosted games. CUNY Login shares the hosted games’ transparent wine-red outline, Barlow text, 2px corners, and 46px desktop / 44px phone touch targets. The footer reads “Critical play with, through, and against AI”.

The shared control rules in `public/assets/suite-navigation.css` also style Play and Pause/Continue through `.suite-control`. One set of size, padding, radius, and focus tokens keeps these controls aligned; only navigation uses wine red. Gallery controls have transparent backgrounds and a fixed minimum width to prevent movement when their label changes. A shared page gutter aligns the header, content, and footer; tablet cards use two columns and project text stacks before its columns become cramped.

Each project page includes three unchanged screenshots captured from the live game. Sources, capture times, and sample-lesson attribution are recorded in `public/previews/captures.json`. The gallery rotates every six seconds while visible, provides only a Pause/Continue control and no visible slide counts or captions, and starts paused for reduced-motion preferences. Keyboard focus, hovering, and page visibility also suspend rotation. Full-size images are available by following each preview.

The running gallery prepares only its next image, and waits for decoding before revealing it. Slow or unavailable images leave the current screenshot in place; pausing or leaving the gallery cancels a pending transition. This avoids empty frames without loading every hidden image on page entry.

The title letters stay in their card accent colors. A broad, gentle highlight sweeps left to right and back over twelve seconds without changing glyph size or leaving the letters uncolored. Each arrival at a card waypoint triggers a six-second border and arrow glow: 600ms fading in, three seconds at full accent, and 2.4 seconds fading out. A visit during an active glow leaves its fade intact. Pause lights stops the title and card effects and remembers the choice for the tab session. Reduced motion retains static title colors, forced colors use the system text color, and hidden or offscreen elements suspend their animation. Card gaps are 48px on desktop and 40px on tablets and phones.

A pixel snake travels from the header through the card grid to the footer and back. Paired waypoints carry it down and up the internal column gaps and across the gaps between rows. On phones it alternates left and right across each gap between successive cards. Entry sides vary between passes. A bounded grid search routes around measured text and controls; a final paint mask keeps text clear. The fixed canvas has no pointer events, uses document coordinates for scrolling, caps its pixel ratio at 1.5 and paints at most 30 times per second. Layout and font changes rebuild the paths. Hidden pages suspend the loop; operating-system reduced motion and forced colors hide the decoration. There is no visible snake pause control. Pause lights affects only the title and card lights.

Each full header–footer–header circuit places five small, steady amber pellets on distinct safe route waypoints. The snake eats a pellet only when its head reaches it. Its tail starts at 36 segments spaced 8px apart and gains 12 segments per pellet, up to 96. Returning to the header resets the tail and replenishes the five pellets. A resize that changes the layout restarts the route safely; a viewport-only resize preserves its progress. Pellets and tail growth are decorative and add no controls or saved state.
