# Commonplace

Commonplace is a local, single-user study app. Database indexing is the first complete concept.

## Run locally

Use Node.js **22.13 or newer** and npm. Run `npm install`, then `npm run dev`, and open http://127.0.0.1:3000. Stop the server with Ctrl+C. Startup creates the local database when absent and applies pending SQLite migrations. For production mode, run `npm run build`, then `npm start`. Both servers bind to loopback.

`npm run check` runs lint, type generation/type checking, extraction and API tests, Chromium/WebKit browser tests, and the production build. Before the first browser test, run `npx playwright install chromium webkit`. Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.

Tests use authored small PDF/EPUB fixtures, temporary databases, and separate local servers and compilation directories. They do not write to your study database. Browser coverage includes keyboard actions, save-error recovery, exact passage persistence, automated accessibility scans, reduced motion, and layouts down to 320 CSS pixels. See [the verification record](docs/verification.md) for evidence and testing limits.

## Books and passages

Open **Books** to import a text-based PDF or EPUB of up to **25 MB**. You may enter a title and author or use available embedded metadata, then correct the details after extraction. Import progress and failures appear in the library. Keep the local server running until extraction finishes; interrupted imports are marked failed on the next library load, and can be deleted and re-imported. Identical files are detected rather than stored twice.

Choose a ready book, search for a word or phrase (2–200 characters), and inspect a matching section. Select text in the source field using a mouse, touch selection, or Shift and the arrow keys; choose **Use selected passage**. Review the exact quotation and source details, then save it to **Understanding indexes**. Saved passages appear under **From your books** in Reading, where you can also edit their attribution. Changing a book's metadata does not rewrite attribution already saved with a passage.

A saved quotation is an exact slice of the displayed extracted text, including whitespace. PDF text order can differ from the printed layout, and “PDF page” means the file's page number, not a printed page label. EPUB sections follow the book's reading order, with a heading when available. Check the context and correct the source location before saving. Passage length is limited to 20,000 characters; the app never silently shortens a selection.

Extraction runs in a separate process with a two-minute limit. A book is limited to 1,500 text units and 8 million extracted characters. Large sections are split into labeled parts. EPUBs are also limited to 5,000 ZIP entries, 100 MB expanded size, and 10 MB per content file. One book imports at a time, the library supports up to 200 books, and search shows up to 20 matching sections per query. Text search uses SQLite's ASCII case folding; non-ASCII case variants may need an exact-case search.

Scans/OCR, DRM-protected or password-protected books, image-only books, and non-HTML EPUB content are unsupported. Extraction does not execute imported scripts, render imported HTML, or fetch external resources. Import, search, notes, and manual study stay local; app fonts may load from Google Fonts. Optional AI analysis explicitly sends selected-book text and attribution to your configured n8n instance and its AI provider. It is disabled until a provider is selected and starts only after your confirmation for that analysis step.

In **Book details and deletion**, deleting a book removes its original file and extracted text. Choose whether to retain its saved quotations and attribution or remove those too. Retained passages remain readable without the original book context. Failed imports retain the original locally until you delete the entry.

## Storage and backup

The default database is `data/commonplace.db`, with imported originals under `data/books`. The data directory is excluded from version control. Keep it and its backups private. A local SQLite URL can be set through `DATABASE_URL`; relative URLs resolve against `prisma/`, and originals live in a `books` directory alongside that database. The checked-in `.env` contains only the default local URL.

To back up, **stop the app** and copy the **entire data directory**, including the database and imported originals. To restore, stop the app and replace the data directory with that backup, then start the app again. If using a custom database URL, copy the database's containing directory and its `books` directory together. The integration test verifies copying and restoring this complete directory. This is local persistence, not cross-device sync.

## Notes and progress

Notes, reading completion, practice attempts, and review events persist in SQLite. Cards start due. “Review again” keeps a card due; “I feel confident” brings it back after 24 hours. Progress reflects actions and self-reported confidence, not mastery. Notes show saving, saved, and failure states; unsaved edits remain in the text field, with a retry action and a warning before leaving the page.

On first use in the same browser and origin, prototype data under `commonplace-study-v1` is imported once. Existing database notes are never overwritten by the import; completion flags are combined, and previously confident cards are scheduled for 24 hours later. The browser copy is retained. If import fails, the app shows an error and leaves that copy untouched. If both stores contain different notes, the browser copy remains available under that key for manual recovery.

The original visual reference is `reference/prototype.html`; `public/index.html` is the original working copy. All application views now use typed React state and event handlers. A shared study provider owns navigation, serialized persistence, progress, and the review queue; notes retain their local edits while saves are pending or fail. The prototype HTML files remain reference artifacts. See `plan.md` for the implementation assessment and future maintenance, and [the stage 4 verification record](docs/verification.md) for release checks and known limitations. The current npm audit reports zero vulnerabilities; targeted PostCSS and deepmerge-ts overrides are documented there.


## Keyboard use

Use the skip link to reach study content. The main navigation and action buttons support keyboard activation, practice choices support arrow keys, and the notes and source-text fields are labeled. In the source field, Shift and the arrow keys extend a selection; Tab moves to **Use selected passage**. On macOS WebKit/Safari, Option-Tab may be needed to include buttons when full keyboard navigation is not enabled in your system/browser settings.


## Optional n8n book learning

Books now includes a whole-book learning workflow: find valuable passages, inspect/edit AI drafts, and accept practice questions and review cards. Accepted material appears in **Practice → Practice from your books** and in the shared Review queue with its quotation and attribution.

The local n8n URL is `http://localhost:5678`. The importable workflow is `workflows/n8n/commonplace-book-study.json`. No provider is preselected; generation remains disabled until a model is connected in n8n and the server's provider label is configured. Freshness/up-to-date checks are off. See [the n8n setup guide](docs/n8n-ai.md) for activation, bounded text sharing, credentials, progress, and recovery. Keep `.env.local` private and out of version control.
