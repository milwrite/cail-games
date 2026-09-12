# Game release reconciliation — September 12, 2026

All three application changes are committed, pushed, and serving at 100% on their existing Cloudflare Workers. The arcade hub remains local.

| Application | Source and review | Serving version |
| --- | --- | --- |
| Exquisite Corpse | `dec0b58`, [draft PR 7](https://github.com/milwrite/cadavre-exquis/pull/7), branch `codex/cadavre-route-fallback` | `0d570317-b6f2-4258-88ed-ac6ce8de27fb` |
| Jeopardy | `5b541ea`, [draft PR 8](https://github.com/milwrite/jeopardy-generator/pull/8), branch `codex/jeopardy-visual-balance` | `1176ebb4-52fe-4e83-b098-100265a1482c` |
| Cloze Reader | `c4825f9`, [draft PR 1](https://github.com/milwrite/cloze-reader/pull/1), branch `codex/cloze-production-reconcile` | `10af33de-eecb-49b9-8e55-ba039d4d6c36` |

These are review branches stacked on the existing release branches. They have not been merged into repository default branches. The older dirty checkouts remain intact; their original fallback/recovery differences are accounted for by the release branches above.

## Exquisite Corpse

The old fallback experiment now runs in the current Worker and authenticated route. Readiness has three attempts within 25 seconds; turns have two within 50 seconds. Failed models cool down briefly, the UI adopts the model that answers, and each public attempt respects the existing daily completion-token budget. Signed retries retain the verified identity and record one completed turn.

TypeScript and 34 Worker tests pass. An actual Worker/account/D1/Durable Object boundary test checks fallback, budget reservations, successful usage settlement, refusal above the daily ceiling, authentication and origin controls, and a single completed model record. Signing and models in that test are local doubles.

On the serving release, phone-sized Chromium completed real guest turns in both interfaces. Solo returned “carves obsidian” after “silver river”; Shared returned “of warm mercury” and advanced to the next human turn. Both used `gemma-4-26b-a4b-it`, returned HTTP 200, and displayed the result. Both writing inputs computed to 18px. No production failure was deliberately induced.

## Jeopardy

The title and menu occupy equal outer thirds. Categories are larger, with wider columns on phones. Player labels share the scoreboard background; the current player has a thin underline instead of the mismatched glow. The eight-model menu and DeepSeek V4 Flash default from `106e70d` are preserved.

The build and 32 tests pass. Local browser checks cover desktop and phone widths, category editing, menus, and contained board scrolling. Production readback confirms the visual release, equal outer header widths, and absence of the player glow. This visual release does not change the shared gateway's provider fallback policy.

## Cloze Reader

Commit `b7aa762` recovers the responsive production source, including the six divergent frontend files. The maintained TypeScript compiles byte for byte to the downloaded original serving module, SHA-256 `616b068eaa795e9defdb6a7a2a21470cf13c910eda877f3b7f04d7da26208398`.

Commit `c4825f9` separately sets a 16px minimum for phone text controls. The served CSS matches the built file exactly. TypeScript, build, Wrangler dry run, and 18 tests pass, including differential requests against the original serving module. A restored local exercise verifies input size, hint disclosure, and narrow layout.

## Acceptance boundaries and credentials

The available Firefox session redirects to CUNY Login. Signed-in production generation, saving, and reopening have not been reverified in this release pass. Physical iPhone/Safari keyboard behavior also remains unverified. Guest gameplay, local identity doubles, and serving-version readback are recorded separately.

No new API key was configured. Public Cadavre and Cloze use the lab's native Workers AI binding. Signed gateway models use existing CUNY identity and server-side routing. A personal key is not needed to repair these public routes or style changes.

Detailed evidence is retained in `/Users/milwright/Documents/Codex/2026-09-12/games-preview/release-readback.json`, `production-qa.json`, the deployment logs, browser screenshots, and test logs. The original source recovery evidence is in `/Users/milwright/Documents/Codex/2026-09-12/cloze-reconciliation/`.
