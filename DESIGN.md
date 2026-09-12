# Local design specification

The user's September 12 revision supersedes both generated concepts. Neither concept nor any generated illustration is used in the application.

- Black background with a fine white grid and a restrained perspective grid near the bottom
- White text and controls; one shared orange–pink–violet–cyan gradient is the third colour
- The real white CAIL logo, with “Games” beside it
- Lowercase title: “inference arcade”
- Exactly two full sentences in the introductory description
- No periods in headings, game teasers, navigation, labels, buttons, or status text
- Three equally sized game entries; no default selection or pre-highlighted entry
- Gradient edges appear on actual hover or keyboard focus
- Square buttons with a small physical offset on hover and press
- Short game descriptions, direct Play links, and details on demand
- Mobile controls at least 44px and form inputs at least 16px; opening the form does not focus an input
- Reduced motion supported; no continuous flashing, audio, canvas, or background model calls

## Copy

CAIL Games is a CUNY AI Lab publication of web games that explore AI through thoughtful, speculative game design. Play the collection and consider how each game uses AI to support learning.

## Assets and provenance

`public/assets/cail-logo-white.png` is the unchanged CUNY AI Lab logo downloaded from Google Drive: https://drive.google.com/file/d/1MJSOzGUjVFxjn3J3VnTfSBZDbPCN-cOl/view

Size: 10,337 bytes. SHA-256: `4d868d8174b9ef63d1e436f8e1f6f02a63bab56539c2de5f9bbdc6e785c9580f`.

IBM Plex Mono and IBM Plex Sans are reused from the existing Inference Arcade's local web assets. They are SIL Open Font License fonts from https://github.com/IBM/plex. Font licenses are in `public/assets/fonts/OFL.txt`.

The grid and control effects are native CSS, as the user requested. They are not generated imagery or simulated gameplay.
