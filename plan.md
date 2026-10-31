# Commonplace v1 implementation plan

## Goal

Build a fast-to-ship, local, single-user study app that connects concepts to reading, practice, review, and passages from the learner's own books. The first complete concept is database indexing. Preserve the existing prototype's visual direction and interaction patterns, as documented in [DESIGN.md](DESIGN.md).

## Scope and assumptions

- Run on the learner's computer, accessible through a browser at localhost. No public deployment, accounts, hosted database, or cross-device sync in v1.
- Import text-based PDF and EPUB files, search their extracted text, and save direct passages with source details. Scanned PDFs and OCR are deferred.
- Start with manual search and selection. Automatic passage suggestions and AI-generated content are deferred; no external AI service is required.
- Treat uploaded books, notes, excerpts, and progress as private local data. The learner supplies their own files.
- The indexing lesson is the only complete curated concept initially. Other concepts can be listed as forthcoming.
- Existing prototype data is browser-local. Before replacing it, check whether there is data worth preserving; implement a one-time import if needed and feasible.

## Technology

| Area | Choice | Reason |
| --- | --- | --- |
| Application | Next.js with React and TypeScript, running locally | One project for the browser interface and local server endpoints; typed, familiar component model. |
| Styling | CSS with shared custom properties and components | Closely preserves the prototype without adding a UI framework. |
| Database | SQLite, accessed through Prisma | A single local database file with typed queries and explicit migrations. |
| Book extraction | `pdfjs-dist` 6.4.299; `yauzl` 3.4.0 + `htmlparser2` 12.0.0 for EPUB containers and text | Local PDF pages and EPUB spine sections; bounded ZIP reads and plain-text extraction without browser rendering. Node 22.13+ is required. |
| Content | Version-controlled TypeScript or JSON files with stable IDs | Quick to author and review; user-specific state remains in SQLite. |
| Validation | Zod at server boundaries | Validate imported metadata and user input before persistence. |
| Tests | Node test runner for extraction/API integration; Playwright with Chromium/WebKit and axe for browser checks | Isolated fixture databases cover persistence; browser tests cover keyboard flows, reflow, and accessibility. |
| Tooling | npm, ESLint, and TypeScript | `npm run check` runs the release checks; the lockfile pins the verified tree. |

Pin compatible versions during setup and document the required Node.js version. These choices can be adjusted if a package proves incompatible with local execution or the project requirements; record the reason before substituting it.

## Architecture and storage

- **UI:** application shell and routes for the study desk, concept reading, practice, review, and books. Shared controls and tokens follow the design reference.
- **Local server:** validates requests, reads and writes SQLite, imports books, and serves local files. Bind to localhost and document how to start and stop the app.
- **Curated content:** indexing explanation, attributed sources, challenge and review cards live in version-controlled files. IDs stay stable across copy edits.
- **Local data:** SQLite stores books and extraction status, text units with source locations, saved excerpts, concept notes, activity completions, challenge attempts, and review events/state. Imported originals and the database live in a documented local data directory excluded from version control.
- **Book text:** store extracted text by page for PDF and by chapter or section for EPUB when possible. Search these units locally; retain location information and allow the learner to inspect surrounding text before saving a passage. Clearly label a location as unavailable if the source does not provide a reliable one.
- **Backups:** document how to stop the app and copy the data directory, including the database and imported files. Deleting a book should remove its local original and extracted text, with a clear choice about associated saved excerpts.

Localhost is a convenience boundary, not authentication. Keep the server bound to loopback, avoid unnecessary network access, validate file types and sizes, and do not expose local file paths or APIs beyond what the app needs.

## Product rules for v1

- **Reading:** the learner explicitly marks the article complete. Notes save locally, with visible saving, saved, and error states.
- **Practice:** submitting any answer records an attempt and completes the activity; feedback explains the answer and tradeoffs. The learner can retry.
- **Review:** cards begin due. After revealing an answer, “Review again” keeps the card available in the current session; “I feel confident” schedules it for the next day. Persist review events and due times. Confidence is self-reported, not proof of mastery.
- **Desk:** show activity-based completion and the number of cards currently due. Use saved data rather than hardcoded counts.
- **Books and excerpts:** importing is explicit; the learner searches extracted text, selects a passage, reviews its context and attribution, and saves it to a concept. Do not silently shorten or modify a selected quotation.

These are initial rules, not permanent commitments. Keep them easy to change after use.

## Delivery stages

### 1. Project foundation and prototype migration

- Copy the supplied prototype into the repository as a reference, set up the application and development tooling, and reproduce the shell and existing four views.
- Extract shared styling and components without changing the established appearance or learning flow.
- Confirm the app starts locally and works at desktop and narrow widths.

**Checkpoint:** You can run the app and navigate the original indexing experience locally. Review the visual match before deeper feature work.

### 2. Content and local persistence

- Define stable content IDs and model the indexing lesson, challenge, cards, and attributed sources.
- Set up SQLite, migrations, and local data storage. Persist notes, reading completion, and challenge attempts.
- Implement save feedback and the review schedule; derive the desk's progress and due count from stored data.
- Decide whether prototype `localStorage` data needs migration before removing its use.

**Checkpoint:** Restart the app and confirm notes and progress remain, and review scheduling behaves as described.

### 3. Book import and passages

- Add local PDF and EPUB import, metadata entry or correction, extraction progress, and clear failure states. Reject unsupported or unreadable files without losing existing data.
- Store searchable extracted text with page or chapter references where available. Provide local search and surrounding context.
- Allow selection and saving of an exact passage to the indexing concept, with editable metadata and source location. Display saved passages in the concept view.
- Add book deletion and document backup and restore.

**Checkpoint:** Import one representative book, find a useful indexing passage, save it, restart the app, and find the passage and its attribution again.

### 4. Verification and usable release

- Test the core learning journey, review timing, exact passage persistence, extraction failures, deletion behavior, and relevant migrations. Use representative small PDF and EPUB fixtures that may be included in the repository.
- Check keyboard navigation, focus, contrast, narrow layouts, and reduced motion. Verify the app stays bound to localhost and does not send book content to an external service.
- Write a short README covering prerequisites, setup, start/stop, data location, backup, supported formats, and known limitations.

**Checkpoint:** Walk through the acceptance criteria together and record any follow-up changes before calling v1 complete.

## Acceptance criteria

- One documented command starts Commonplace locally, and the existing indexing experience is usable in a browser.
- A learner can complete reading and practice, write a note, and review cards; progress and due times survive an app restart.
- A learner can import a text-based PDF and an EPUB, search extracted text, inspect context, and save an exact passage to indexing with available attribution and location.
- The desk accurately reflects persisted activity and cards due; save and extraction failures are visible.
- Private data stays local, the server listens on localhost, and backup and deletion behavior are documented and verified.
- The core flow works with keyboard and at narrow widths. Relevant automated checks pass, or remaining limitations are documented.

## Development loop

Work in the stages above and keep the learner informed at each checkpoint: explain what is working, what changed, how to run or try it, and any limitations or decision that affects the next stage. Share material tradeoffs as they arise. Favor small, reviewable changes and continue through routine implementation decisions without waiting for approval. Pause for a decision only when it materially changes scope, data handling, or the product experience and cannot reasonably be inferred.

## Later, after v1

Consider AI-assisted passage suggestions, local-model integration, OCR, additional concepts and challenges, richer review scheduling, and cross-device sync only after the basic local workflow has been used and evaluated.


## Implementation review after stage 3 — 28 October 2026

### Status and evidence

- **Stage 1:** Next.js shell, four original views, shared styles, and reference prototype are present. The user confirmed the browser checkpoint. Study interactions remain in an imperative JavaScript file rather than typed React state.
- **Stage 2:** SQLite migrations, stable concept/challenge/card IDs, notes, reading completion, practice attempts, review events, one-day scheduling, and one-time prototype import are implemented. Automated restart and migration tests pass. The lesson and its sources still live mostly in the reading component, rather than a fully separated content model.
- **Stage 3:** Books view, asynchronous local PDF/EPUB extraction, editable book metadata, bounded search, complete text context, exact selection validation, saved attribution, and both deletion policies are implemented. Tests exercise both formats, failed extraction, unsafe ZIP paths, literal search, rejected quotation changes, persistence after restart, complete-directory backup/restore, and deletion with and without retained passages. Small authored fixtures are included. A real-book browser checkpoint remains necessary before calling the experience verified.
- **Stage 4:** Open. Passing type checks, builds, and API tests are useful evidence, but they do not complete the keyboard, layout, contrast, reduced-motion, or real-document browser checks.

### Decisions made during stage 3

EPUB parsing uses maintained ZIP and HTML/XML parsers rather than a browser reader or an older high-level EPUB package. It follows container/package metadata and the spine, imports plain text, ignores executable content, and never expands archive paths onto the filesystem. The package licenses are Apache-2.0 for PDF.js and MIT for yauzl/htmlparser2. References: [PDF.js](https://github.com/mozilla/pdf.js), [yauzl](https://github.com/thejoshwolfe/yauzl), [htmlparser2](https://github.com/fb55/htmlparser2).

Extraction runs in one isolated child process at a time with an input-size, expanded-size, text-size, heap, and elapsed-time limit. This fits a long-running localhost Node server. Imports interrupted by a server restart become visible failures; the user can delete and re-import them. Original files are retained for failed imports until deletion. These choices avoid adding a persistent job service to v1.

Passages keep an immutable quotation and a snapshot of title, author, and location. Metadata can be corrected independently later. Keeping passages after book deletion detaches their source records while preserving quotation and attribution. Backups therefore need both the SQLite file and the originals directory, with the app stopped.

### Assessment and recommended order

The product scope remains appropriate: one curated concept plus a complete manual workflow is enough to evaluate whether connecting personal reading to study is useful. Keep AI suggestions, OCR, accounts, sync, and more lessons deferred until that workflow has been used with real books.

The implementation has reached the point where verification and maintainability are more valuable than another feature. The main technical debt is mixed ownership of UI state: the original views use DOM mutation while the new book views use React. Move the original interactions into typed React incrementally, with behavior checks, before expanding the curriculum. A wholesale redesign or a new state-management dependency is unnecessary.

Finish v1 in this order:

1. Run the browser checkpoint with a representative PDF and EPUB: search, select with keyboard/touch, correct attribution, save, restart, and revisit the passage. Check desktop, narrow widths, increased zoom, and failure recovery.
2. Add a repeatable browser regression path and audit focus, labels, contrast, and reduced motion across the original and new views. Complete the content separation and missing lint setup where they support those fixes.
3. Resolve or explicitly document dependency advisories before release. The registry audit during stage 3 reports five existing findings: the Prisma configuration path through `deepmerge-ts`, and Next.js through `postcss`. Uploaded books never enter those configuration/CSS-processing paths, but this is not a claim that the dependency tree is free of risk. The audit suggests major framework/tool upgrades; handle those as focused compatibility work with the migration and build tests, rather than applying a forced upgrade during feature implementation.
4. Review all acceptance criteria with the learner, record known parser limits and remaining issues, and call v1 complete only after that review.


## Stage 4 completion review — 28 October 2026

Stage 4's implementation and automated verification are complete. The learner confirmed real-book import/search and exact passage/attribution persistence after restart. The shared browser was inspected for search, context, preview, attribution, and no-selection feedback. A repeatable Chromium/WebKit suite now covers keyboard study actions, note-save failure/retry, review scheduling and the empty queue, exact passage selection/save/reload, skip navigation, reduced motion, and reflow through 320 CSS pixels. Automated axe scans cover the five views and saved-passage states. See [the acceptance review and testing limits](docs/verification.md).

The five dependency advisories noted in the stage 3 review have been resolved using scoped overrides for PostCSS 8.5.32 and deepmerge-ts 8.0.2. The current npm audit reports zero vulnerabilities. Prisma migrations, persistence tests, and the production build are checked against that tree. Review the overrides during future framework/tool upgrades.

Release fixes preserve the established design while improving muted-text contrast, mobile grid sizing, radio keyboard behavior, focus after transitions, and input locking during saves. The study API now shares bounded request parsing and origin validation with the book APIs. Tests and startup continue to preserve existing user data; no database schema reset is part of stage 4.

My assessment remains that the local v1 scope is sufficient and ready for use with the documented limits. Use it for real study before expanding it. Prioritize any observed data or usability defects, then incrementally move the original study interactions into typed React. A full screen-reader audit, physical touch-device testing, and wider parser compatibility testing remain follow-ups; automated checks do not replace those activities. OCR, AI suggestions, sync, and additional concepts stay deferred until actual use justifies them.


## Follow-on scope: n8n book learning — 28 October 2026

The learner requested AI discovery of educationally valuable passages across a selected book, followed by practice and review material. The chosen orchestration host is local n8n at `http://localhost:5678`; the AI provider will be chosen later. The learner explicitly deferred freshness/up-to-date verification.

The app now supports resumable analysis in reading order, bounded per-step model calls, exact-source quotation validation, an editable draft inbox, acceptance into generated practice and the review queue, and attribution snapshots. Human acceptance gates generated learning material. Existing indexing content/progress and private notes remain separate. Freshness checks are off and no current-source verification is claimed.

A provider-neutral, inactive n8n workflow export is checked in, with header authentication, a Basic LLM Chain, a structured output parser, and a JSON response. A local server token and production webhook URL have been prepared in ignored configuration without choosing a provider. Local n8n health is confirmed; authenticated workflow import/execution and real-model quality are still to verify after the provider is selected. The setup guide is [docs/n8n-ai.md](docs/n8n-ai.md).

Tests use a fake webhook and authored fixture books, never a live AI account. They cover invalid quotation rejection, approval and idempotency, generated practice/review state, bounded full-book continuation, restart/backup persistence, and browser flows in Chromium and WebKit. Follow-on work is to choose/connect a model, import and activate the workflow, and evaluate the first real-book drafts. Add freshness research only if the learner later asks to restore that scope.


## Typed React study interaction migration — 28 October 2026

The maintenance follow-up above is implemented. The application no longer loads the imperative prototype script. A shared typed study provider owns the persisted snapshot, serialized study requests, navigation, due-card counts, and refreshes after book material changes. Reading owns its controlled notes and save/retry state; Practice and Review own their selected answers, reveal state, pending actions, and keyboard focus. Existing Books, saved-passage, and book-practice links use the same React navigation. Views remain mounted when hidden so in-progress notes and study choices survive navigation.

The migration preserves the existing API and database, one-time browser-prototype import without deleting its recovery copy, 350 ms note-save debounce, unsaved-edit warning, practice retry, review-again rotation, one-day confidence scheduling, source attribution, skip link, and current-navigation announcements. No state-management dependency or data migration is needed.

Focused browser regressions cover one-time prototype import, initialization failure, overlapping note saves and unsaved-edit protection, and failed practice/review save recovery. The existing Chromium/WebKit journey, accessibility, narrow-layout, passage, and generated-material checks continue to cover the full workflow.

Verification passed: lint, type checking, six extraction/workflow/API tests, sixteen Chromium/WebKit browser tests, and the production build. See `docs/verification.md` for the migration evidence and remaining manual accessibility limits.
