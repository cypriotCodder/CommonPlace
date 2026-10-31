# Commonplace handoff for Claude

Prepared 29 October 2026 from the current local files.

## Start here

Work in `/Users/nedim/REPO/CommonPlace`. Read `AGENTS.md`, `DESIGN.md`, and `README.md` before making changes. This handoff request did not assign a new implementation task or choose an AI provider.

Commonplace is a local, single-user study app for new CS graduates. Database indexing is the only complete curated concept. Five views connect the study desk, reading and notes, practice, review, and the learner's own PDF/EPUB books. SQLite holds private user state; the app runs on loopback without accounts or sync.

The manual study app, book workflow, optional n8n integration, and migration of original study interactions into typed React are implemented. The principal documented follow-up is connecting a real AI provider in n8n and evaluating actual generated drafts. Do not repeat the completed React migration.

## Workspace and verification

- This directory has no usable Git repository: `git status` returned “not a git repository.” Branch, commit, and uncommitted-change status could not be established. Preserve existing files and do not initialize Git as part of this handoff.
- `node_modules` is present. Observed runtime: Node `v24.11.1`, npm `11.6.2`; the project requires Node `>=22.13.0`.
- The default `data/` directory contains an existing database and imported original. Treat it as user data; it was not inspected or modified for this handoff.
- **Fresh checks for this handoff:** `npm run lint` and `npm run typecheck` both passed on 29 October 2026.
- **Historical evidence:** `docs/verification.md` records passing lint, type checking, six extraction/workflow/API tests, sixteen Chromium/WebKit browser tests, and a production build on 28 October 2026. It also records a user-confirmed real-book passage surviving restart.
- Full tests, browser tests, build, dependency audit, running app behavior, live n8n health, and live provider execution were **not rechecked for this handoff**. The documented zero-vulnerability audit is historical evidence, not a fresh audit result.
- This handoff added only `HANDOFF.md`; type checking also generated Next.js route types in the build directory. No application implementation was changed.

## Code map

| Area | Entry points and ownership |
| --- | --- |
| App and navigation | `app/page.tsx` mounts all views inside `StudyProvider` and `Shell`. Views remain mounted while hidden to retain local edits and choices. Navigation is React state rather than separate page routes. |
| Shared study state | `app/components/StudyProvider.tsx` owns the snapshot, navigation, serialized writes/refreshes, progress, due cards, and prototype import. Types: `lib/study-types.ts`. |
| Notes | `app/components/useNotes.ts` owns controlled edits, 350 ms debounce, save/retry status, version tracking, and unsaved-edit unload protection. |
| Curated learning | `Reading.tsx`, `Practice.tsx`, `Review.tsx`, and `StudyDesk.tsx` under `app/components/`; stable IDs/cards in `lib/content.ts`; persistence in `app/api/study/route.ts`. |
| Books and passages | `Books.tsx`, `SavedPassages.tsx`, and `book-api.ts` under `app/components/`; `lib/books.ts`, `lib/book-types.ts`, `app/api/books/**`, and `app/api/passages/**`. |
| Extraction | `scripts/book-extraction.mjs` extracts plain text in a bounded child process launched by `lib/books.ts`. PDF.js handles PDFs; yauzl/htmlparser2 handle EPUBs. |
| AI learning | `app/components/BookAi.tsx`, `BookPractice.tsx`, `app/api/ai/**`, and `app/api/materials/**`. |
| AI contracts/jobs | `lib/ai/config.ts`, `contracts.ts`, `sources.ts`, `jobs.ts`, and `types.ts`: configuration, validation, chunking/quotation lookup, resumable jobs, and shared types. |
| n8n export | `workflows/n8n/commonplace-book-study.json`; rebuild with `npm run workflow:n8n` from `scripts/build-n8n-workflow.mjs` and `workflows/n8n/contract.mjs`. |
| Database | `prisma/schema.prisma`, four migrations under `prisma/migrations/`, and `lib/db.ts`. `scripts/prepare-db.cjs` safely creates an absent database and runs `prisma migrate deploy`. |
| API boundaries | `lib/local-api.ts` supplies local-host/origin checks, bounded body parsing, error responses, and private JSON responses. |
| Design | `app/globals.css` and `DESIGN.md`; local visual references are `reference/prototype.html` and `public/index.html`. |

## Behavior to preserve

- Keep stable content IDs and existing notes, progress, attempts, review events, books, and materials. Use additive, safe migrations; never reset the user's database to fix development issues.
- Notes retain newer edits when older saves resolve, retain text on failure, and offer retry. Serialized snapshot requests prevent older reads from replacing newer writes.
- Prototype data under `commonplace-study-v1` imports once without overwriting existing database notes. The browser copy stays available for recovery.
- Reading completion and practice submissions record actions. “Review again” stays due; “I feel confident” schedules 24 hours later. Activity and confidence do not imply mastery. Generated material does not inflate the original indexing activity progress.
- Manual passages are exact slices of extracted text, including whitespace, with attribution snapshots. Book metadata edits do not rewrite saved attribution. Deletion explicitly chooses whether to retain passages and their associated accepted learning material.
- Imports remain bounded: 25 MB, one extraction at a time, 1,500 text units, 8 million text characters, two-minute extraction limit, and 200 books. EPUB ZIP limits and unsupported formats are documented in `README.md`. Interrupted imports become visible failures.
- Keep imported text as data: no execution of book scripts, rendering imported HTML, or fetching imported external resources.
- Preserve loopback binding, server-side validation, bounded requests, and local mutation-origin checks. Do not expose secrets through client configuration or logs.
- Follow the established flat editorial design: green-tinted paper, fine rules, DM Serif Display headings, DM Sans controls, Georgia reading text, IBM Plex Mono code. Preserve keyboard navigation, focus, honest saving feedback, reduced motion, and reflow down to 320 CSS pixels.

## n8n: implemented versus pending

The integration walks a selected book in reading order. Chunks are up to 5,000 characters with 250-character overlap; each request sends at most two chunks. Each explicitly started/continued step handles up to twelve chunks (six calls), then pauses. One analysis step runs at a time. Runs resume from the last committed batch after failure or restart.

Responses require matching batch identity and valid structured material. Altered, missing, or ambiguous quotations are rejected. Draft acceptance requires explicit source review; only accepted drafts create practice/review material. Limits include 200 drafts per run, 100 runs per book, and 200 accepted materials globally. Freshness/current-source verification is deliberately disabled.

`docs/n8n-ai.md` is the detailed setup/recovery guide. It records that a local webhook URL and token were prepared in ignored `.env.local`, while the provider was left unselected. Those current settings were not opened or verified for this handoff. Never copy credential values into handoff text or chat.

When the user chooses to proceed with the integration:

1. Inspect current readiness without disclosing credentials. The app requires `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`, and `N8N_AI_PROVIDER` before enabling generation.
2. Import the inactive workflow into n8n and configure Header Auth with `X-Commonplace-Token`. The documented local n8n origin is `http://localhost:5678`; its availability needs rechecking.
3. Connect the user's chosen Chat Model to the Basic LLM Chain and keep the structured output parser connected. Provider choice remains an outstanding user decision.
4. Test with authored fixture text. Verify authenticated import/execution, node compatibility, structured output, batch identity, exact quotations, and execution-payload retention settings.
5. Activate/publish the workflow, use its production webhook, set the accurate provider/model label, and restart Commonplace.
6. Evaluate a real book through the app's text-sharing confirmation: inspect draft quality, accept selected drafts, and verify attributed practice/review plus pause/continue behavior. Existing fake-webhook tests do not establish live model quality.

Keep the source-sharing confirmation and explicit draft acceptance. Do not introduce freshness research, OCR, accounts, sync, or new curriculum without a new request.

## Commands and test coverage

```sh
npm ci
npm run dev                  # http://127.0.0.1:3000; prepares DB first
npm run lint
npm run typecheck
npm test                     # extraction, workflow contract, API/persistence
npx playwright install chromium webkit  # first browser setup only
npm run test:e2e             # both browser projects
npm run build
npm start                    # production; prepares DB first
npm run check                # lint + types + tests + browser tests + build
npm run workflow:n8n         # regenerate the workflow after contract/builder edits
```

`tests/extraction.test.cjs` covers parser success and failure cases. `tests/n8n-contract.test.cjs` checks workflow safety and identity. `tests/study.test.cjs` exercises persistence, migrations, exact passages, backup/restore, deletion, and AI workflows against a fake webhook. Browser journeys live in `tests/browser/journey.spec.ts`; React state regressions live in `tests/browser/study-state.spec.ts`.

API/browser suites create disposable databases and use `.next-api-tests` / `.next-browser-tests`, separate from the user's running development server. They use authored fixtures and a fake n8n service, without live model calls. Keep that isolation when extending tests. Browser tests use one worker; avoid simultaneous runs of the same suite against its shared compilation directory/server port.

Default storage is `data/commonplace.db` plus `data/books/`. Relative `DATABASE_URL` paths resolve against `prisma/`. Stop the app before backing up/restoring the entire database-containing directory and originals together. Back up `.env.local` and n8n credentials separately and privately.

## Documentation caveats and remaining work

Read the latest sections of `plan.md`: earlier sections still describe AI as deferred and the React migration as pending, but both were subsequently implemented. `docs/verification.md` also retains an older “AI suggestions deferred” statement. Use the source, current README, n8n guide, and final plan entries to resolve those stale statements.

Known manual verification gaps remain screen-reader/VoiceOver review, physical touch devices, browser-specific zoom behavior, wider PDF/EPUB compatibility, authenticated n8n execution, and live provider quality. Scoped PostCSS and deepmerge-ts overrides are intentional; reassess them with future dependency upgrades.

For any next task, preserve unrelated work, make the focused change, run relevant checks, and report fresh evidence separately from this historical record.
