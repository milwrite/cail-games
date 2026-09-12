# CAIL Games — inference arcade

Local prototype for a small CUNY AI Lab games publication. Three direct links open the existing Exquisite Corpse, Jeopardy, and Cloze Reader Workers. The hub itself makes no model calls.

```
npm run dev
```

Open http://127.0.0.1:4173. No package installation is needed. `npm run build` creates a static `dist/` directory; `npm run preview` serves that build locally. The included Wrangler configuration describes a possible static Worker, but this prototype has not been published to Cloudflare.

The contribution form validates a name, title, HTTP(S) link, and summary of up to 250 words. Save draft stores the draft in this browser; Download draft creates a text file. The form does not submit to anyone or pretend to authenticate. Production CUNY Login, editorial submission, and review require the service integration described in the Games plan.

See `DESIGN.md` for the user's final visual specification and asset provenance. `docs/GAMES-PLAN.md` is the accompanying publication and development plan.

The implementation uses HTML, CSS, native dialogs, and small JavaScript modules. Local preview data stays in this browser, and there are no remote fonts, analytics, generated images, or runtime dependencies.
