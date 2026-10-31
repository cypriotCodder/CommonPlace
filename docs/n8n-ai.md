# Book learning with local n8n

Commonplace can send selected-book text to an n8n workflow, collect source-grounded learning drafts, and place accepted drafts into Practice and Review. The integration is optional. The local n8n instance at `http://localhost:5678` was reachable during setup; no real book text or model request was sent to it during development.

The provider is deliberately unselected. **Freshness/up-to-date checks are disabled**, as requested. Generated material teaches the book's content and does not claim current-source verification.

## Connect the workflow when ready

1. In n8n, import [the workflow JSON](../workflows/n8n/commonplace-book-study.json). It is exported inactive, with no model or provider credentials embedded.
2. On **Commonplace book batch**, create/select a **Header Auth** credential. Set the header name to `X-Commonplace-Token` and the value to `N8N_WEBHOOK_TOKEN` from this project's ignored `.env.local`. Copy the value directly between the local file and n8n's credential UI; do not paste it into chat or commit it. A random token has been prepared locally.
3. When you choose the provider, add its Chat Model node in n8n and connect its **Chat Model** output to **Generate source-grounded drafts**. Configure provider credentials in n8n. Keep **Study draft structure** connected to the chain's Output Parser input. No agent tools or web-search stage are needed for this version.
4. Test the workflow with authored fixture text before using a real book. `npm run n8n:check -- --test` sends [the authored sample batch](../workflows/n8n/fixtures/sample-batch.json) to n8n's test listener with the token from `.env.local`, prints the drafts, and checks batch identity, exact unique quotations, valid choices, and that the instruction planted in the sample text was ignored. Omit `--test` after activation to check the production URL. This export uses Basic LLM Chain 1.7 and Structured Output Parser 1.2. Import and execution against the authenticated n8n editor have not been performed here; n8n must support those node versions.
5. Activate/publish the workflow and confirm the production URL is `http://localhost:5678/webhook/commonplace-book-study`. The temporary `/webhook-test/` URL is only for n8n's test listener.
6. In `.env.local`, set `N8N_AI_PROVIDER` to the actual provider/model selected in the workflow. `N8N_WEBHOOK_URL` and the token are already prepared if those settings were absent. `.env.ai.example` documents the settings without a secret. Restart Commonplace with `npm run dev`.

The app requires all three settings before enabling analysis. The public configuration endpoint exposes only readiness, the n8n origin, and the provider label; it never returns the token or webhook path. Use HTTPS for a remote n8n instance. HTTP is supported on localhost.

The workflow's execution settings disable saving successful, failed, and manual execution payloads. Review those settings after import. Your n8n host and selected provider have their own access and retention policies. The app's text-sharing confirmation names the configured destination and provider before sending; notes, unrelated books, and study progress are not part of the payload.

The workflow uses standard n8n nodes. References: [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Basic LLM Chain](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/), [Structured Output Parser](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured/), and [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/).

## Use it

Open **Books**, choose a ready book, and find **Find the ideas worth keeping**. The preview shows the whole-book chunk count and approximate model-call count. Confirm sharing for the next step, then start an analysis.

The app walks the complete extracted book in reading order, rather than sampling only its beginning. Text is split into chunks of up to 5,000 characters with a small overlap. A request contains at most two chunks; one step processes at most twelve chunks, or six model calls, then pauses. Continue explicitly to cover the next segment. This controls the work and possible provider cost on large books. The app does not claim full coverage until all chunks are complete.

Each draft contains an exact quotation, its source location, an explanation of why the idea is useful, one recall question/answer, and one applied practice question with choices and an explanation. The app rejects invented, altered, or ambiguous quotations and invalid choices. It does not silently repair quoted text.

Open a draft to inspect its original context and edit the learning material. Confirm that you reviewed it against the source, then accept or discard it. **Only accepted drafts** enter **Practice → Practice from your books** and the shared **Review** queue. Recall cards start due and use the existing Review again / one-day confidence schedule. The original indexing lesson and its five-activity progress remain separate and intact.

Accepted material stores its own quotation and attribution snapshot. Book deletion keeps or removes those materials with the associated saved passages, according to the same retention choice as manual passages. Pause an active analysis before deleting its book.

## Limits, recovery, and storage

Only one AI analysis step runs at a time. Each webhook call has a two-minute timeout, redirects are rejected, and the JSON response is bounded. The workflow's own timeout is shorter. Invalid batch identities are rejected; unusable suggestions are counted and shown. No automatic retry incurs another model call without a user action.

A stopped server turns an interrupted run into a paused run at the last committed batch. Continue it after restarting. A pause stops future batches and aborts the app's current HTTP request; it does not guarantee cancellation of a model call already running inside n8n. A failed step can also continue from its saved position. Review drafts already returned remain available.

Limits are 200 drafts per analysis, 100 analyses per book, and 200 accepted materials across the study library. History shows the latest twenty analyses; draft lists paginate twenty at a time. The interface reports skipped suggestions when a quotation/format check or the draft cap prevents retaining them. A model can still produce weak or incorrect teaching material despite valid quotation provenance; reviewing its reasoning remains part of acceptance.

Runs, drafts, accepted materials, and attempts live in the existing SQLite database. The new migration adds tables without resetting notes, progress, or book data. The normal stopped-app data-directory backup also covers AI study data. Back up ignored `.env.local` separately and securely to preserve the n8n connection; n8n's own workflow and credential backup is managed separately.

## Development checks

`npm run workflow:n8n` rebuilds the importable JSON from the checked-in builder and prompt/schema contract. `npm test` exercises the workflow contract and application against a fake local webhook. `npm run test:e2e` uses that same fixture inside temporary test servers. No AI credits or live book uploads are used by the test suites.

The tests verify exact-quote rejection, review-before-acceptance, idempotent approval, generated practice attempts/review cards, restart and backup persistence, and bounded continuation across a longer synthetic book. Chromium and WebKit cover the draft editor, approval, generated practice feedback, source attribution in Review, accessibility scans, and narrow layout. Live provider quality, model-specific structured output support, and authenticated n8n import/execution remain to verify after a provider is selected.
