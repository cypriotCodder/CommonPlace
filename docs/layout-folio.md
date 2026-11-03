# Layout B: Folio

An alternative clickable preview at [B / Folio](http://127.0.0.1:3000/design/folio), requested 1 November 2026. Compare with [A / Desk](http://127.0.0.1:3000/design) using the visible links in both layouts. Both use the same authored sample content, validation, and in-memory interaction model. This is a layout exploration, not a replacement of the live app or the established design system. Follow the [preview startup and walkthrough](layout-preview.md) to try either direction.

## Direction contract

**THESIS:** Give the library a visual shelf, AI review a broad work surface, and study a centered reading page. Top navigation frees the full width for these different activities.

**OWN-WORLD:** Inherit the established paper, ink, green, serif headings, sans-serif controls, flat surfaces, and fine rules. Book tiles are clearly labeled sample publications with authored typographic jackets, not third-party cover images. No raster assets.

**STORY:** Browse a shelf, select a book, inspect its next action below; browse discoveries across a horizontal strip and inspect the evidence below; enter a centered study page with secondary source information and notes after the activity.

**FIRST VIEWPORT:** A dark horizontal masthead carries the brand and three destinations. The Library uses four equally sized book columns and a full-width selected-book detail band below. AI Workspace lays discoveries across the page above a full-width evidence panel, with rationale and source/material in two columns. Study limits the content to a centered 780px reading column and moves source/notes below it. The shelf becomes two columns at 1000px and one at 360px. At 650px the discovery strip, evidence panel, selected-book details, and source/notes stack.

**FORM:** Code-first alternative requested by the learner after trying the Desk layout. The core tasks and content are settled. This single candidate explores top navigation and broad-to-focused page composition; the first option remains available. Impeccable launcher was unavailable earlier in this session, so the existing context and skill guidance are read directly.

**INHERITANCE:** DESIGN.md remains authoritative. Folio changes composition through the shared preview's `folio` variant; it does not introduce global tokens or a replacement identity. Jackets use authored CSS and typography, and icons use inline SVG. There are no shipping raster assets requiring provenance.

## Scope and tradeoffs

The shared preview component keeps search, filters, sample import, duplicate protection, reviewed acceptance, applied challenges, recall, focus handling, and temporary per-idea notes equivalent between layouts. The visual shelf emphasizes recognition over density and uses more vertical space than Desk's compact rows. The broad AI panel gives evidence more width; the centered Study view reduces competing content, while notes below the activity require more scrolling.

All changes remain in browser memory and reset on reload. Book upload only checks the selected file; it does not import or extract a real book. Sample JSON validation and confirmation operate on authored preview data. There is no provider connection, production API request, or live library write. See the [shared interaction scope and import boundaries](layout-preview.md#walkthrough-and-interaction-scope) for the complete limits.

## Implementation and verification

`app/design/folio/page.tsx` renders `LayoutPreview` with `variant="folio"`. Both routes share `app/design/preview.tsx`, `preview.module.css`, and `sample.ts`; the top bar provides a comparison link in each direction.

The production build, lint, and type checking passed. Final Chromium checks covered Library, AI Workspace, and Study at 1440px and 390px: all six axe scans reported zero violations and no horizontal overflow. Reflow checks also found no overflow across all three destinations at 768px, 1024px, and 1280px, or Study at 320px. The exercised flow produced no page errors or production API requests.

Interaction checks passed for import validation and duplicate preservation, review before acceptance, accepted material through applied challenge and recall, source-book navigation, per-idea notes, and focus handling. These results cover the tested preview states, not a production whole-book workflow or a complete manual accessibility audit.

The independent Impeccable finish review inspected the source and eight desktop/mobile captures, including challenge and recall, and returned **ship the clickable preview** with no material UI blockers. The Impeccable runtime/detector was unavailable because of an engine/cache issue; the review used the skill guidance, source, and captures directly. Local captures and browser results are under `.impeccable/review/folio/` and are ignored by Git.
