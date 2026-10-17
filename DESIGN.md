# Arcade design specification

The October 17 revision sets the production design:

- Charcoal background with a fine 24px grid, larger 120px cross grid, and small cross marks
- Three equal minimal cards, each with a single full-card link
- Cyan, violet, and pink light hues appear only on interaction, with visible keyboard focus
- White CAIL logo and restrained Games wordmark
- Lowercase inference arcade title, short introductory copy, and direct game descriptions
- A quiet CUNY Login in the top right
- Responsive single-column cards on phones; touch targets at least 44px
- No browser scripts, animated backgrounds, model calls, or contribution form

The site links the current deployed games through a common Worker. Each application includes a Games link back, with its existing save guard.

## Assets and provenance

`public/assets/cail-logo-white.png` is the unchanged CUNY AI Lab logo downloaded from Google Drive: https://drive.google.com/file/d/1MJSOzGUjVFxjn3J3VnTfSBZDbPCN-cOl/view

Size: 10,337 bytes. SHA-256: `4d868d8174b9ef63d1e436f8e1f6f02a63bab56539c2de5f9bbdc6e785c9580f`.

IBM Plex Mono and IBM Plex Sans are reused from the existing Inference Arcade's local web assets. They are SIL Open Font License fonts from https://github.com/IBM/plex. Font licenses are in `public/assets/fonts/OFL.txt`.

The grid and control effects are native CSS, as the user requested. They are not generated imagery or simulated gameplay.
