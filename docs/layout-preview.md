# Three-destination layout preview

Targets: A / Desk at `/design` and B / Folio at `/design/folio`. Both are interactive design previews using clearly labeled, authored sample data; no persistence or production API calls. The existing application remains at `/`.

## Open the preview

Follow the normal [local startup instructions](../README.md#run-locally): run `npm install` if needed, then `npm run dev`, and open [A / Desk](http://127.0.0.1:3000/design) or [B / Folio](http://127.0.0.1:3000/design/folio). Both are also available after `npm run build` and `npm start`. Each top bar links to the other layout. Use the preview navigation to switch between Library, AI Workspace, and Study. Reloading returns to the initial sample Library and clears imported discoveries, accepted material, notes, and session activity.

The routes use `app/design/page.tsx` and `app/design/folio/page.tsx`, sharing `preview.tsx`, `preview.module.css`, and `sample.ts`. All quotations and book records are authored demonstration material credited to Commonplace; they are not quotations from third-party books or records from your library. The walkthrough and limits below apply to both layouts. Folio's masthead, shelf, broad evidence panel, centered study composition, tradeoffs, and verification are documented in the [Folio guide](layout-folio.md).

## A / Desk direction contract

**THESIS:** Each stage has a dedicated workspace: manage sources, judge AI results, then study an idea. Library and AI Workspace use Operate mode; the passage uses Read mode and the challenge/recall steps use Operate.

**OWN-WORLD:** Inherit DESIGN.md's paper, ink, muted green, DM Serif/DM Sans, fine rules, flat surfaces, and visible focus. Use authored line icons and typography; no decorative imagery or invented book covers.

**STORY:** Choose a source, follow the next action, inspect a discovery beside its evidence, accept a draft, and move from reading into an applied problem and recall.

**FIRST VIEWPORT:** A persistent 225px navigation rail holds three destinations. Library has a title/action row, search and filters, then book rows beside a source-detail panel. AI Workspace has a fixed Database field notes summary with a View in library action, an expandable import entry, and a discovery list beside its source/material detail. Study has a quiet session header, passage/challenge/practice navigation, and a readable main column with a source/notes aside. The rail becomes top navigation at 900px; the main/detail columns stack at 650px.

**FORM:** User-specified three-screen composition, confirmed through the preceding layout discussion; no concept lottery needed. Code-first preview selected by the user. Impeccable context launcher unavailable; existing project context read directly.

**INHERITANCE:** The preview consumes the existing global color and typography foundations and keeps fine rules, flat surfaces, the 225px desktop rail, restrained green actions, visible warm focus outlines, and reduced-motion support. Its icons are authored inline SVG and the book identifiers are CSS/typography. No raster assets or new visual identity are introduced. DESIGN.md remains authoritative.

## Walkthrough and interaction scope

1. **Library:** Search sample titles, authors, and subjects; filter All books, Ready to study, or Needs attention. Selecting a book updates its detail panel. Four records illustrate ready, incomplete, ready-to-export, and unreadable states. The upload simulation checks the filename extension and 25 MB size limit without extracting or storing the file. Database field notes provides the working sample export and study flow; other books illustrate workflow states.
2. **AI Workspace:** Inspect each discovery's exact quotation, surrounding source, proposed recall question, applied challenge, and answers. The workspace always uses Database field notes; selecting another Library record does not change its source. Check the review confirmation before accepting an unaccepted idea. Acceptance adds it to the preview study queue; one idea starts accepted.
3. **Sample import:** Open Import AI response, download the sample JSON, then choose that file or paste its contents. Check response validates locally before Confirm preview import adds new items. The sample download contains the initial discoveries, so importing it unchanged demonstrates duplicate preservation rather than adding more copies.
4. **Study:** Read the source, choose an answer to an applied problem, inspect feedback, and retry or continue to recall. Reveal the recall answer, practice again, or express confidence to complete the sample session. Notes belong to the selected idea and survive navigation within the open preview. No notes, confidence choices, or review dates are saved after reload.

## Import boundaries

The preview accepts at most 100,000 bytes of JSON per check, with `version: 1`, `bookId: "database-notes"`, and up to 12 discoveries. It validates the preview schema and study material, rejects duplicate IDs within a response, and requires each quotation to match exactly one passage in the authored sample source. An empty discoveries array is valid. Confirmation preserves existing records when their ID or quotation already exists. Validation and error feedback are client-side demonstrations, not a complete production import contract.

The source pack and sample JSON downloads contain only authored sample material. The preview does not call the production API, alter SQLite data, extract real books, contact an AI provider, or schedule reviews. The planned whole-book subscription-chat export/import backend and Apple Books integration are not implemented here. The current app's separate optional n8n workflow remains described in the [README](../README.md#optional-n8n-book-learning).

## A / Desk verification

The final production build, lint, and type checking passed. Production-browser checks covered all three destinations at 1440px and 390px: all six axe scans reported zero violations, with no horizontal overflow. A 320px check also found no horizontal overflow. The interaction flow produced no production API requests or page errors.

The flow check covered source-book navigation, import validation and duplicate preservation, accepted sample material through Study, per-idea notes, and focus after answer reveal, practice again, and session completion. These checks validate the preview's tested states; they do not establish a production whole-book workflow or replace a full manual accessibility review.

The independent Impeccable finish review returned **ship the clickable preview** after scoring all four requested fixes resolved: brand naming, source-book navigation, recall focus, and completion wording. Its verdict pass checked the updated source/report and spot-checked final production captures. The Impeccable launcher/detector was unavailable; review used the skill guidance, source, and screenshots directly.
