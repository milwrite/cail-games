# Arcade design specification

The arcade uses the following design:

- Charcoal background with a fine 12px path grid, a 24px grid, larger 120px cross grid, and small cross marks
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

A shared pixel snake runs on the homepage and every project page. It moves only along the visible 12px document-grid paths, keeping clear of entire cards, project copy, gallery images, links, and controls. Grid edges are collision-checked as well as nodes, and occupied body cells prevent self-crossing. A pointer creates a 72px avoidance area: the head changes direction through legal adjacent cells, or waits if the pointer temporarily closes every exit. It never transfers to the tail or reverses through its own body.

The simulation owns both movement timing and the rendered path. A continuous 6px body retains every right-angle corner; only its ends move between grid nodes. The painter merges each straight run into one rectangle instead of drawing separated cells. Pellets are consumed when the moving head actually reaches them. Five steady amber pellets replenish after each round; the body grows gradually from 24 toward a 64-cell limit and keeps its length when a round completes. Food does not spawn in dead-end branches. Before moving, the planner checks a continuation to the moving tail, retaining the proved path as a fallback when a bounded search cannot rediscover it. Growth can wait one move when the tail needs to vacate a cell.

The viewport-sized canvas ignores pointer events, caps device pixel ratio at 1.5, and paints at most 30 frames per second. Routes and typed search buffers are reused. A stationary pointer that blocks every exit puts the loop to sleep until input, scrolling, or a layout change wakes it. Layout and font changes refresh obstacle geometry; normal animation frames never measure page layout. Hidden pages, reduced motion, forced colors, and the shared Pause lights control suspend animation. The pause preference also applies across project navigation.

Regression coverage includes head continuity under pointer input, tail retention across food rounds, corner-preserving intermediate frames, consumption timing, painted-body connectivity, small cumulative pointer movements, and prolonged narrow-lane scenarios. These tests check actual movement and paint output as well as grid occupancy.
