# CAIL Games: Inference Arcade

Working plan, revised September 12, 2026. The local prototype is in `cail-games/`. Its visual direction follows the user's latest revision: black, white, a multicoloured arcade gradient, a grid, and restrained interaction. Earlier illustrated concepts have been discarded.

## The publication

CAIL Games can be a small publication of playable experiments made in and around the CUNY AI Lab. A contribution pairs a web game with a short account of its design: what the player does, why AI belongs in that experience, and what the player should notice or question. Publication gives contributors a concrete outcome and gives the lab an occasion for review, playtesting, and discussion.

The first edition should begin with the three games already on Cloudflare. Add one or two student prototypes only when there is time to work with their makers. This is a manageable first collection; an open-ended promise to incubate and maintain every submission would require a different level of funding and staffing.

The landing page's description is deliberately short:

> CAIL Games is a CUNY AI Lab publication of web games that explore AI through thoughtful, speculative game design. Play the collection and consider how each game uses AI to support learning.

The wording treats educational purpose as something a designer must explain and a player can examine. It does not presume that including a model makes a game educational.

## What the reflection contributes

Exquisite Corpse's origin in a Sandbox model card suggests an accessible starting point: a system prompt can establish a role, a constraint, and a turn-taking rule. Students do not need to begin by building a substantial application. A workshop can move from a playable prompt, to a test with other people, to a small web interface when the design warrants one.

Knowledge collections, tools, and skills can extend a game when the design needs them. They are possible materials, not requirements for every contribution. The technical origin belongs in a workshop or designer's account, rather than in the arcade's opening paragraph.

The lab's existing [Sandbox workshops](https://ailab.gc.cuny.edu/events/) provide a natural place to try this. The public materials on [system prompting](https://cuny-ai-lab.github.io/system-prompting/), [knowledge collections](https://cuny-ai-lab.github.io/knowledge-collections/), and [skills and tools](https://cuny-ai-lab.github.io/skills-tools/) offer related starting points. The current fall series and the earlier published materials should not be represented as a newly commissioned games curriculum.

The original Inference Arcade and GVGAI experiment, including the Oculus installation described by the user, are precedents for bringing people together around model-mediated play. They do not commit this collection to hosting Java games, reproducing the installation, or maintaining the GVGAI runtime. The original arcade's visual vocabulary can inform the publication without bringing its entire infrastructure with it.

## A first collection

| Game | What the player does | A question the design can raise |
| --- | --- | --- |
| Exquisite Corpse | Writes a poem by alternating short contributions with a model, alone or by passing a folded sheet between people | How do constraints and limited context distribute authorship? |
| Jeopardy | Generates, edits, and plays a quiz board around chosen topics | What counts as a good question, and when does a plausible answer need checking? |
| Cloze Reader | Infers missing words from a passage and asks for hints | Which inferences come from grammar, context, or a model's framing of the text? |

[Haggle, by Steve Zweibel](https://github.com/szweibel/haggle), is a candidate for the initial collection after a playthrough and confirmation of the appropriate launch link and maintenance arrangement. Stefano Morello's language game remains a candidate pending its title and playable link. Neither should be presented as already hosted by this new hub.

Games retain their own interfaces. The hub makes the collection easier to enter and supplies a common editorial context; it does not impose one gameplay layout on poetry, reading, and quiz games.

## Language and design principles

1. Let the games carry the page. Use a short introduction, direct Play buttons, and details that open when requested. Avoid promotional sections, invented usage figures, and infrastructure language in the player flow.
2. Use the real CAIL logo with “Games” beside it. Set the title to lowercase “inference arcade”. Use exactly two complete sentences for the opening description. Keep periods out of headings, controls, labels, and game teasers; normal punctuation belongs in body prose.
3. Use black and white as the base, with one shared multicoloured arcade gradient as the accent. A fine grid and a restrained perspective grid provide the retrowave cue. There are no generated illustrations or arcade cabinet images.
4. Give the games equal space. No game is highlighted before interaction. Hover, keyboard focus, and a button press should produce the visual response. Keep motion brief, respect reduced motion, and avoid flashing or automatic sound.
5. Make the page usable on a phone. Use readable type, touch targets of at least 44px, and inputs of at least 16px. Opening a contribution form must not force the keyboard open. Keep the action near the relevant text and allow normal browser zoom.
6. Explain AI through the game. The designer's statement and “While you play” text should point to a concrete mechanism or question, rather than claim that AI is inherently engaging or innovative.

The local prototype implements these principles with HTML, CSS, and small JavaScript modules. It needs no framework service, remote fonts, or inference calls of its own. It links directly to the existing Workers.

## Contributions and the 250-word project summary

When submissions open, a contributor signs in through CUNY Login and provides their name, the game title, a project link, and a project summary of about 250 words. The summary should explain:

- What the application asks the player to do
- How AI changes the game, and how that use serves an educational purpose
- What players should notice, question, or watch out for while playing

The summary can become the published designer's statement after review. Keep technical review questions separate: source and hosting arrangements, permitted materials, accessibility, model costs, and who can maintain the game. Contributors should not have to turn the statement into a deployment checklist.

The local form currently supports a draft on this device and a text download. It does not authenticate or submit to an editor. Its brief note makes that state explicit. The production path would use the existing CUNY identity service, an application-scoped submission record, and an editor-only review view. Confirmation should name the received project and its status, without implying acceptance.

A small editorial cycle is enough to begin: receive a proposal, try the game, give a short revision request, playtest the revision, and publish an agreed version. Assign an editor and a technical maintainer before opening a call. Review may lead to publication as an external link, hosting on the lab's Workers account, or a decision that the project needs more work.

## Labor, funding, and outreach

Start through existing workshops, lab sessions, and the lab's events channels. A short invitation to workshop participants and a public play session can test interest before anyone budgets a promotional campaign. Do not assume a new student development team or unpaid ongoing support.

There are at least three kinds of work to account for: working with the designer on the game and statement, checking and deploying the application, and keeping the published game working as models and services change. Agree on who does each part, how much time the first edition can use, and when a game will be revisited or retired.

Serving static assets and paying for inference are separate costs. Estimate model use from actual game sessions, including failed attempts and fallbacks, before setting a per-game allowance. Low-cost hosting does not remove editorial and maintenance labor. A published game should have a known maintainer and a practical way to pause model use if a service fails or its budget is exhausted.

## Model and deployment reliability

The deployment reconciliation accompanies this plan. Git commits, uploaded versions, and the version receiving Cloudflare traffic are distinct states; the release receipt records each. Keeping an application branch in a draft PR does not mean that its code is absent from production.

Cloze's responsive production source has been recovered and committed. Its maintained TypeScript builds byte for byte to the original serving Worker, and the responsive assets are reconciled with Git. A subsequent, separately committed CSS fix keeps phone inputs at least 16px; that release is now serving. Its direct Workers AI binding does not require a shared CAIL API key. CUNY Login remains the route for saved work.

Exquisite Corpse's older fallback experiment has been adapted, committed, and deployed to the current Worker and authenticated route, with bounded attempts, actual served-model attribution, and conservative accounting. A failed model call can try another model within the same eligible menu. Authentication, admission, validation, and quota failures must not be worked around by switching models.

Keep game menus tied to the [CAIL model registry](https://ailab.gc.cuny.edu/models/) and the active gateway catalog, with explicit additions approved for the task, including MiniMax M3. Exquisite Corpse's compact writers and Jeopardy's current shortlist serve different purposes. A single shared menu would obscure those differences. The latest Jeopardy revision uses DeepSeek V4 Flash by default and retains its newly approved eight-model shortlist; this plan does not restore the superseded Mistral default or removed Gemma/Qwen choices.

A menu entry or short probe establishes neither complete gameplay nor provider exclusivity. The shared gateway can have its own provider fallback. Verify the provider that actually answers and retain its model attribution. Full signed-in generation, saving, and reopening remain separate acceptance checks from builds and guest UI tests. Personal API keys stay out of the frontend and Git; a shared runtime key would require an appropriate application credential and an explicit decision about billing and access.

## Exquisite Corpse: reconcile Solo and shared play through a prototype

The current modes have different rules, not just different screens:

| Dimension | Solo | Shared |
| --- | --- | --- |
| Participants | A person and a model alternate | People pass one device between seats, including a model seat |
| Visible poem | The growing poem stays open | Earlier contributions fold away |
| Model context | The conversation and poem context | The latest visible fold |
| Turn length | One or two words in the base prompt | Configurable from one to five words |
| Controls | A Table drawer | Inline setup and play/reveal controls |

Shared play is local pass-the-device play. Network rooms and simultaneous remote participants would be new work.

| Option | Benefit | Tradeoff |
| --- | --- | --- |
| Keep two pages, add the same Table to both | Smallest intervention; preserves each composition | Two destinations and two renderers remain |
| One play surface with Solo and Shared presets | Consistent writing controls and Table; preserves both games | Requires careful treatment of hidden folds, seating, context, and saved work |
| Solo only | Simplest navigation and maintenance | Removes hidden folds, seat rotation, and the social constraint of passing the device |

Prototype the second option, but do not remove shared play on the strength of a screen preference alone. Try a two-person folded session to judge its value. A common Table can be an incremental improvement before consolidating routes.

Keep the writing context immediately above the input, with Send beside it. Dismiss the keyboard while the model answers and let the player tap to reopen it. Place the Table control consistently. Put full prompt editing under a disclosure; show only actions that make sense in the current stage.

Solo should initially retain its existing open-sheet context and word rule. Shared should retain hidden folds and its turn-length control. Participant count and visibility can be separate internal settings without exposing extra choices at launch. Changing either after writing begins starts a new poem. Reveal ends a folded game. The Table, saved-work preview, and mode switch must never leak hidden lines mid-game.

Check the prototype at phone width with the keyboard open and closed, a model turn in progress, the Table open, an error and retry, restored work, and a revealed poem. A real iPhone/Safari session is needed to verify keyboard behavior; Chromium viewport simulation is useful but cannot establish that result.

## Small next steps

1. Review the local arcade as an entry to the three existing games. The three application releases are reconciled; signed-in production save/reopen and physical iPhone testing remain separate follow-ups.
2. Confirm Haggle's launch arrangement and identify Stefano's game.
3. Choose a bounded first editorial cycle and assign its editor and maintainer before opening submissions.
4. Run a prompt-to-game exercise in an existing workshop, then playtest one or two contributions.
5. Add real CUNY submission and editorial review only when there is someone ready to receive the work.
6. Prototype the common Exquisite Corpse Table and test Solo and folded Shared play before deciding whether to merge their entry pages.
