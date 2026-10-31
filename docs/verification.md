# Commonplace local v1 verification

Stage 4 verification record, 28 October 2026. This is a local, single-user release; there is no deployment or account setup.

## Acceptance review

| Acceptance criterion | Evidence |
| --- | --- |
| A documented command starts the app locally | `npm run dev` prepares SQLite and binds to `127.0.0.1`; production uses `npm run build` and `npm start`. The test servers also bind to loopback. |
| Reading, practice, notes, and review survive restart | API integration tests restart the server; browser tests save and reload notes, complete practice, rotate review cards, schedule confidence, and reload an empty queue. |
| PDF and EPUB can be imported, searched, and quoted | Authored fixtures cover both formats through extraction and the API. Browser tests import an EPUB and use Shift and arrow keys to select and save an exact passage with attribution. The learner also confirmed the workflow with a real EPUB. |
| The desk reflects stored activity and due cards; errors are visible | Browser tests verify the zero-due count and review empty state. A simulated note-save failure preserves the text and recovers through Retry save. Extraction failures and unchanged existing data are checked in integration tests. |
| Data stays local; backups and deletion work | Host/origin checks reject cross-origin changes. Browser requests are checked for unexpected external destinations. Integration tests restore a complete copied data directory and verify both deletion policies and removal of original files/text. Optional Google Fonts requests remain the only expected external page requests. |
| Keyboard and narrow layouts work; checks pass or limits are documented | Chromium and WebKit cover keyboard navigation, focus, radio arrows, selection, skip link, reduced motion, and reflow at 900, 650, 375, and 320 CSS pixels. Axe scans the five views and saved-passage states. A 320px screenshot was visually inspected. |

The learner confirmed that a saved real-book passage and its attribution survive an app restart. Direct inspection of the shared VS Code browser also confirmed search, source context, selection preview, attribution fields, and the no-selection error. The repeatable browser suite now supplies the keyboard and narrow-layout evidence that the shared-browser connection could not reliably provide.

## Commands

```sh
npm ci
npx playwright install chromium webkit
npm run check
npm audit
```

`npm run check` runs lint, type generation/type checking, extraction/API tests, browser tests, and the production build. Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.

Tests create disposable SQLite databases and originals directories under the system temporary directory. API and browser test servers use separate `.next-api-tests` and `.next-browser-tests` compilation directories, so they do not reuse the user's database or development compilation. Browser test traces and screenshots are stored under ignored `test-results/` after failures; the narrow Books screenshot is also written there on success. These artifacts contain only authored fixtures and test notes.

## Release fixes

- Scoped npm overrides select PostCSS **8.5.32** for Next.js and deepmerge-ts **8.0.2** for Prisma configuration. The registry audit reports **zero vulnerabilities** after these changes. Prisma generation, migrations, data regressions, and the Next build are verified with the overrides. Review these overrides when updating the owning packages; do not remove them without rechecking the audit.
- Navigation updates the page title and current destination and focuses the new heading. A skip link leads to the main content. Practice radios use one Tab stop with arrow-key selection, and choices are locked while an attempt saves. Review and saved-passage actions retain useful focus.
- Muted labels were darkened to pass text contrast checks. Mobile grid sizing was corrected so the navigation can scroll independently without making the whole page wider than the viewport. Existing reduced-motion styling is verified.
- Study JSON requests now use the same bounded stream reader and local-origin checks as the book APIs. Review progress is grouped in SQLite rather than loading an unbounded history into application memory. Once a prototype import is recorded, stale browser data is no longer reparsed on each reload.

## Limits and follow-ups

Automated axe checks are evidence for the tested states, not a complete WCAG conformance audit. A dedicated screen-reader/VoiceOver review and physical touch-device testing have not been performed. The 320 CSS-pixel reflow test represents the available width at 400% zoom on a 1280px display; it does not exercise every browser's zoom-specific rendering behavior.

On macOS, WebKit follows the operating system's keyboard-navigation setting. The suite uses Option-Tab for WebKit on Mac to include buttons without changing the user's preferences. Safari users can enable full keyboard navigation in their own settings. See the [Playwright WebKit issue](https://github.com/microsoft/playwright/issues/41808) for the platform behavior.

The original study interactions have now been converted to typed React. The app no longer loads `public/prototype-interactions.js`; the standalone prototype HTML remains a reference. Navigation and progress use shared state, notes keep local edits through queued saves, and practice/review render their controls and feedback through React. The database schema and persistence API behavior are unchanged.

Parser limits, unsupported scans/DRM, local-only operation, and backup instructions are documented in the README. Manual restore remains the supported recovery method. Cross-device sync, OCR, AI suggestions, and additional concepts remain deferred.


## React migration verification — 28 October 2026

After replacing the prototype interaction script, lint, TypeScript checks, all six extraction/workflow/API tests, all sixteen Chromium/WebKit browser tests, and the production build passed. The browser suite still covers axe scans, reduced motion, exact passage persistence, generated-material integration, and reflow down to 320 CSS pixels; the narrow Chromium screenshot was visually inspected.

Added regressions verify one-time prototype import without deleting browser data, safe initialization failure, overlapping note saves without replacing newer edits, unsaved-edit protection across navigation, and recovery after practice/review save failures. Practice retry focuses the re-enabled first option after React commits; the skip link remains in the initial page while study data loads. Tests wait for the rendered shell and use distinct note values per browser, so the save-error check always exercises an actual edit. All API/browser persistence checks use disposable databases.
