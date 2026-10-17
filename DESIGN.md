# Arcade design specification

The October 17 revision sets the production design:

- Charcoal background with a fine 24px grid, larger 120px cross grid, and small cross marks
- Five equal minimal cards, each with a single full-card link
- Cyan, violet, pink, amber, and lime light hues appear only on interaction, with visible keyboard focus
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

Project pages use a two-column identity and description layout, stacked on phones. Barlow and Barlow Condensed match the hosted games. CUNY Login uses a compact version of the card border and corner details. The footer reads “Critical play with, through, and against AI”.

Each project page includes three unchanged screenshots captured from the live game. Sources, capture times, and sample-lesson attribution are recorded in `public/previews/captures.json`. The gallery rotates every six seconds while visible, provides pause and manual navigation, and starts paused for reduced-motion preferences. Keyboard focus, hovering, and page visibility also suspend rotation. Full-size images are available by following each preview.
