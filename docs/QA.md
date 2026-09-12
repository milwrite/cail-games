# Local preview verification — September 12, 2026

The final text specification is the design baseline. The user rejected both generated concepts and explicitly requested a black grid, white type, a multicolour gradient, the actual CAIL logo, and no generated images. Comparing this build against either discarded image would contradict that revision.

| Criterion | Result and evidence |
| --- | --- |
| Composition | Three equal game entries at desktop width; a single column at phone width; no horizontal page overflow at 1440, 1280, 768, 390, or 320px |
| Brand and title | Authentic unchanged Drive logo with Games beside it; lowercase inference arcade title; exactly two introductory sentences |
| Colour and imagery | Black/white grid composition with a shared arcade gradient; the logo is the only image element; no generated artwork |
| Interaction | All entries begin neutral; actual hover or keyboard focus reveals the gradient; buttons respond to hover and press |
| Typography and language | No periods in headings, teasers, labels, buttons, or navigation; body punctuation retained; local IBM Plex fonts |
| Game access | Three direct Worker links, three game detail dialogs, and a separate Solo link for Exquisite Corpse |
| Contribution draft | Name, title, HTTP(S) URL, and summary validated; 251 words rejected; save, reload, and text download verified |
| Keyboard and phone | Dialog focuses Close on opening; Escape closes it and returns focus; inputs at least 16px; targets at least 44px |
| Motion and runtime | Reduced motion removes transitions; no continuous flashing or audio; no script errors during the exercised flow |

Browser checks used Playwright with installed Chrome. This is desktop Chromium and phone viewport simulation, not physical iPhone/Safari evidence. The hub has no live submission or authentication service; its form clearly saves a local draft.

The executable checks, JSON results, and genuine browser screenshots are retained in `/Users/milwright/Documents/Codex/2026-09-12/games-preview/`. Files include `browser-qa.cjs`, `browser-qa.json`, `arcade-desktop.png`, `arcade-hover.png`, `arcade-mobile.png`, and `arcade-mobile-form.png`. The screenshot assets are QA evidence and are not included in the application.

`npm run check` and `npm run build` pass. The hub is a local preview at http://127.0.0.1:4173 and has not been deployed.
